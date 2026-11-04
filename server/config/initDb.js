const pool = require('./db');

async function initDb() {
  const client = await pool.connect();
  let ok = true;
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        date DATE,
        time VARCHAR(20),
        location VARCHAR(255),
        description TEXT,
        image_url TEXT,
        featured BOOLEAN DEFAULT false,
        category VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS notices (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        date DATE,
        content TEXT,
        priority VARCHAR(20) DEFAULT 'normal',
        pinned BOOLEAN DEFAULT false,
        expiry_date DATE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS members (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        position VARCHAR(100),
        department VARCHAR(100),
        batch VARCHAR(20),
        committee_session VARCHAR(50),
        image_url TEXT,
        social_fb TEXT,
        social_gh TEXT,
        social_li TEXT,
        display_order INTEGER DEFAULT 99,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS gallery (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255),
        image_url TEXT NOT NULL,
        category VARCHAR(50),
        date DATE,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS achievements (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        date DATE,
        description TEXT,
        icon VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        image_url TEXT,
        author VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        subject VARCHAR(255),
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT false,
        reply_note TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(100) PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS registrations (
        id SERIAL PRIMARY KEY,
        type VARCHAR(20) NOT NULL CHECK (type IN ('committee', 'general', 'ambassador')),
        full_name VARCHAR(100) NOT NULL,
        student_id VARCHAR(30) NOT NULL,
        batch VARCHAR(10),
        department VARCHAR(30),
        phone VARCHAR(20),
        email VARCHAR(100) NOT NULL,
        gender VARCHAR(10),
        post VARCHAR(100),
        interests TEXT[] DEFAULT '{}',
        experience VARCHAR(20),
        note TEXT,
        photo_url TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (type, email),
        UNIQUE (type, student_id)
      );

      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'admin',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // older databases only allowed committee/general — widen the check for ambassadors
    await client.query(`
      ALTER TABLE registrations DROP CONSTRAINT IF EXISTS registrations_type_check;
      ALTER TABLE registrations ADD CONSTRAINT registrations_type_check CHECK (type IN ('committee', 'general', 'ambassador'));
    `);
    // drop-in features (server/features/*.js) bring their own tables
    const features = require('../features');
    for (const f of features) {
      await client.query(f.sql);
      if (f.seed?.length && !(await client.query(`SELECT 1 FROM ${f.table} LIMIT 1`)).rows.length) {
        for (const row of f.seed) {
          const keys = Object.keys(row);
          await client.query(`INSERT INTO ${f.table} (${keys.join(',')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(',')})`, keys.map((k) => row[k]));
        }
      }
    }
    // soft-delete support: every manageable table gets a deleted_at column
    for (const t of ['events', 'notices', 'members', 'gallery', 'achievements', 'posts', 'messages', 'registrations', ...features.map((f) => f.table)]) {
      await client.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`);
    }
    for (const t of ['events', 'notices', 'members', 'achievements', 'registrations', 'gallery', 'posts', 'messages', ...features.map((f) => f.table)]) {
      await client.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false`);
    }
    // applications in the trash must not block the same person from applying again
    await client.query('ALTER TABLE registrations DROP CONSTRAINT IF EXISTS registrations_type_email_key');
    await client.query('ALTER TABLE registrations DROP CONSTRAINT IF EXISTS registrations_type_student_id_key');
    await client.query('CREATE UNIQUE INDEX IF NOT EXISTS uq_reg_type_email ON registrations (type, email) WHERE deleted_at IS NULL');
    await client.query('CREATE UNIQUE INDEX IF NOT EXISTS uq_reg_type_student ON registrations (type, student_id) WHERE deleted_at IS NULL');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_members_session ON members (committee_session, display_order);
      CREATE INDEX IF NOT EXISTS idx_events_date ON events (date);
      CREATE INDEX IF NOT EXISTS idx_notices_pinned ON notices (pinned DESC, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_registrations_status ON registrations (type, status, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_messages_read ON messages (is_read, created_at DESC);
    `);

    // Seed default settings
    await client.query(`
      INSERT INTO settings (key, value) VALUES
        ('site', $1::jsonb)
      ON CONFLICT (key) DO NOTHING
    `, [JSON.stringify({
      heroTitle: 'BAUET ICT CLUB',
      heroSub: 'Where Technology Meets Innovation',
      aboutText: 'BAUET ICT Club is the premier technology club of Bangladesh Army University of Engineering & Technology, Rajshahi. We empower students through workshops, hackathons, tech talks, and hands-on projects.',
      mission: 'To foster a culture of innovation and technological excellence among BAUET students, preparing them for the challenges of the digital era.',
      vision: 'To become the leading university tech community in Bangladesh, producing industry-ready engineers and innovators.',
      goal: 'Bridge the gap between academic knowledge and real-world technology through practical learning, collaborative projects, and industry exposure.',
      socialLinks: { fb: 'https://www.facebook.com/bauetictclub', email: 'ictclubbauet@gmail.com', phone: '01707-533471', website: 'bauet.ac.bd' },
    })]);

    // Seed committee sessions (President, VPs and executives) once
    const seeded = await client.query('SELECT 1 FROM members WHERE committee_session IS NOT NULL LIMIT 1');
    if (!seeded.rows.length) {
      const rows = require('./committeeSeed.json');
      for (const m of rows) {
        await client.query(
          `INSERT INTO members (name, position, department, batch, committee_session, display_order)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [m.name, m.position, m.department, m.batch, m.session, m.order]
        );
      }
      console.log(`Seeded ${rows.length} committee members`);
    }

    // Demo content is opt-in (SEED_SAMPLES=true) — or load/remove it any time from Admin → Settings
    if (process.env.SEED_SAMPLES === 'true') await require('../utils/demo').loadDemo();

    const bcrypt = require('bcryptjs');
    // Never ship a well-known password: use ADMIN_PASSWORD, or generate one and print it once.
    const adminPassword = process.env.ADMIN_PASSWORD || require('crypto').randomBytes(9).toString('base64url');
    const hash = await bcrypt.hash(adminPassword, 10);
    const created = await client.query(`
      INSERT INTO admins (username, password_hash, role) VALUES ('admin', $1, 'superadmin')
      ON CONFLICT (username) DO NOTHING RETURNING id
    `, [hash]);
    if (created.rows.length && !process.env.ADMIN_PASSWORD) console.log(`\nAdmin account created. Username: admin  Password: ${adminPassword}\n(Save it now — it is not shown again. Set ADMIN_PASSWORD in .env to choose your own.)`);

    console.log('Database ready');
  } catch (e) {
    console.error('Database initialization failed:', e.message);
    ok = false;
  } finally {
    client.release();
  }
  return ok;
}

// `npm run db:init` runs it directly; the API also calls it on boot (everything is idempotent).
if (require.main === module) initDb().then((ok) => process.exit(ok ? 0 : 1));

module.exports = initDb;
