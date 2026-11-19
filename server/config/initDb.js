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

    // sign-up requests waiting for the e-mail code (the password is stored only as a bcrypt hash, the code only as a keyed hash)
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_signups (
        email VARCHAR(255) PRIMARY KEY,
        username VARCHAR(100) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        code_hash TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // phone notifications: one row per phone that has the app and allowed notifications
    await client.query(`
      CREATE TABLE IF NOT EXISTS push_tokens (
        id SERIAL PRIMARY KEY,
        token TEXT UNIQUE NOT NULL,
        platform VARCHAR(12) DEFAULT 'android',
        lang VARCHAR(5) DEFAULT 'en',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_seen TIMESTAMPTZ DEFAULT NOW()
      );
      ALTER TABLE push_tokens ADD COLUMN IF NOT EXISTS topics TEXT;
      CREATE TABLE IF NOT EXISTS push_log (
        key TEXT PRIMARY KEY,
        at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // sign-in security: session version (changing the password or "sign out everywhere" ends old sessions), two-step sign-in, account lock
    await client.query(`
      ALTER TABLE admins ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE admins ADD COLUMN IF NOT EXISTS totp_secret TEXT;
      ALTER TABLE admins ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE admins ADD COLUMN IF NOT EXISTS backup_codes TEXT;
      ALTER TABLE admins ADD COLUMN IF NOT EXISTS failed_logins INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE admins ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;
      ALTER TABLE admins ADD COLUMN IF NOT EXISTS email VARCHAR(255);
      ALTER TABLE admins ADD COLUMN IF NOT EXISTS reset_hash TEXT;
      ALTER TABLE admins ADD COLUMN IF NOT EXISTS reset_expires TIMESTAMPTZ;
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
      if (f.seed?.length && (!f.seedOnlyWith || process.env[f.seedOnlyWith] === 'true') && !(await client.query(`SELECT 1 FROM ${f.table} LIMIT 1`)).rows.length) {
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
    await client.query(`CREATE TABLE IF NOT EXISTS remote_jobs (
      id SERIAL PRIMARY KEY, source VARCHAR(20) NOT NULL, ext_id VARCHAR(80) NOT NULL, title VARCHAR(255) NOT NULL, company VARCHAR(160), kind VARCHAR(30),
      location VARCHAR(160), salary VARCHAR(120), url TEXT NOT NULL, logo TEXT, tags JSONB DEFAULT '[]', summary TEXT, published_at TIMESTAMPTZ,
      seen_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE (source, ext_id)
    )`);
    await client.query(`CREATE TABLE IF NOT EXISTS point_awards (
      id SERIAL PRIMARY KEY, email TEXT NOT NULL, name TEXT, points INTEGER NOT NULL, reason TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(), deleted_at TIMESTAMPTZ
    )`);
    await client.query('ALTER TABLE point_awards ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false');
    await client.query('CREATE INDEX IF NOT EXISTS idx_point_awards_email ON point_awards (LOWER(email))');
    // drafts and scheduled posts
    for (const t of ['events', 'notices', ...features.filter((f) => f.scheduled).map((f) => f.table)]) {
      await client.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS publish_at TIMESTAMPTZ`);
      await client.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS is_draft BOOLEAN NOT NULL DEFAULT FALSE`);
      await client.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS pending_notify BOOLEAN NOT NULL DEFAULT FALSE`);
    }
    // notices and achievements can carry a picture too
    for (const t of ['notices', 'achievements']) await client.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS image_url TEXT`);
    for (const t of ['events', 'notices', 'members', 'achievements', 'registrations', 'gallery', 'posts', 'messages', ...features.map((f) => f.table)]) {
      await client.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false`);
    }
    // applications in the trash must not block the same person from applying again
    await client.query('ALTER TABLE registrations DROP CONSTRAINT IF EXISTS registrations_type_email_key');
    await client.query('ALTER TABLE registrations DROP CONSTRAINT IF EXISTS registrations_type_student_id_key');
    await client.query('CREATE UNIQUE INDEX IF NOT EXISTS uq_reg_type_email ON registrations (type, email) WHERE deleted_at IS NULL');
    await client.query('CREATE UNIQUE INDEX IF NOT EXISTS uq_reg_type_student ON registrations (type, student_id) WHERE deleted_at IS NULL');
    // member profiles & automated birthday wishes support
    await client.query(`
      ALTER TABLE registrations ADD COLUMN IF NOT EXISTS birth_date DATE;
      ALTER TABLE members ADD COLUMN IF NOT EXISTS birth_date DATE;
      ALTER TABLE members ADD COLUMN IF NOT EXISTS student_id VARCHAR(30);
      ALTER TABLE members ADD COLUMN IF NOT EXISTS bio TEXT;
    `);
    // event sign-ups: every event can have its own registration link and list
    await client.query(`
      ALTER TABLE events ADD COLUMN IF NOT EXISTS reg_url TEXT;
      ALTER TABLE events ADD COLUMN IF NOT EXISTS capacity INTEGER;
      ALTER TABLE events ADD COLUMN IF NOT EXISTS reg_open BOOLEAN DEFAULT true;
      ALTER TABLE events ADD COLUMN IF NOT EXISTS reg_form JSONB;
      CREATE TABLE IF NOT EXISTS event_registrations (
        id SERIAL PRIMARY KEY,
        event_id INTEGER NOT NULL,
        full_name VARCHAR(100),
        student_id VARCHAR(30),
        email VARCHAR(100),
        phone VARCHAR(20),
        department VARCHAR(30),
        batch VARCHAR(10),
        note VARCHAR(300),
        answers JSONB,
        is_demo BOOLEAN DEFAULT false,
        deleted_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      -- a database made by an earlier version required these; custom forms may not have them
      ALTER TABLE event_registrations ALTER COLUMN full_name DROP NOT NULL;
      ALTER TABLE event_registrations ALTER COLUMN student_id DROP NOT NULL;
      ALTER TABLE event_registrations ALTER COLUMN email DROP NOT NULL;
      ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS answers JSONB;
      ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS payment JSONB;
      ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS pay_status VARCHAR(12) DEFAULT 'none';
      ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS admin_note VARCHAR(300);
      ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS ticket VARCHAR(16);
      ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;
      ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS waitlisted BOOLEAN DEFAULT FALSE;
      ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS certificate_sent_at TIMESTAMPTZ;
      ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS cert_name TEXT;
      ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS cert_pick BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS cert_status TEXT;
      ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS cert_error TEXT;
      ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS cert_tries INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE events ADD COLUMN IF NOT EXISTS cert_stage TEXT;
      ALTER TABLE events ADD COLUMN IF NOT EXISTS reminded_at TIMESTAMPTZ;
      ALTER TABLE events ADD COLUMN IF NOT EXISTS feedback_sent_at TIMESTAMPTZ;
      ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS pay_tran TEXT;
      CREATE INDEX IF NOT EXISTS idx_event_regs_event ON event_registrations (event_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_event_regs_ticket ON event_registrations (ticket);
    `);
    // stand-alone forms (surveys, feedback, recruitment...) built in Admin -> Forms, each with its own public link /f/<slug>
    await client.query(`
      CREATE TABLE IF NOT EXISTS forms (
        id SERIAL PRIMARY KEY,
        slug VARCHAR(80) UNIQUE NOT NULL,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        reg_form JSONB,
        capacity INTEGER,
        is_open BOOLEAN DEFAULT true,
        is_demo BOOLEAN DEFAULT false,
        deleted_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS form_slug_history (
        slug VARCHAR(80) PRIMARY KEY,
        form_id INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS audit_log (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER,
        username VARCHAR(100),
        method VARCHAR(8),
        path VARCHAR(200),
        status INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log (created_at);
      CREATE TABLE IF NOT EXISTS short_links (
        code VARCHAR(40) PRIMARY KEY,
        target VARCHAR(120) NOT NULL,
        clicks INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_short_links_target ON short_links (target);
      CREATE TABLE IF NOT EXISTS form_responses (
        id SERIAL PRIMARY KEY,
        form_id INTEGER NOT NULL,
        full_name VARCHAR(100),
        email VARCHAR(100),
        answers JSONB,
        payment JSONB,
        pay_status VARCHAR(12) DEFAULT 'none',
        admin_note VARCHAR(300),
        deleted_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_form_responses_form ON form_responses (form_id, created_at);
      ALTER TABLE form_responses ADD COLUMN IF NOT EXISTS pay_tran TEXT;
      CREATE INDEX IF NOT EXISTS idx_event_regs_tran ON event_registrations (pay_tran);
      CREATE INDEX IF NOT EXISTS idx_form_responses_tran ON form_responses (pay_tran);
    `);
    // sign-ups made before tickets existed get a code now
    {
      const { newCode } = require('../utils/tickets');
      const missing = (await client.query('SELECT id FROM event_registrations WHERE ticket IS NULL')).rows;
      for (const r of missing) await client.query('UPDATE event_registrations SET ticket = $1 WHERE id = $2', [newCode(), r.id]);
    }
    // website visits (IP, page, device) for the admin Visitors page
    await client.query(`
      CREATE TABLE IF NOT EXISTS page_views (
        id SERIAL PRIMARY KEY,
        ip VARCHAR(64) NOT NULL,
        path VARCHAR(200) NOT NULL,
        referrer VARCHAR(200),
        user_agent VARCHAR(300),
        device VARCHAR(20),
        is_bot BOOLEAN DEFAULT false,
        is_demo BOOLEAN DEFAULT false,
        day DATE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_page_views_day ON page_views (day, ip);
    `);
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
      socialLinks: { fb: 'https://www.facebook.com/bauetictclub', email: 'ictclubbauet@gmail.com', phone: '01748-269350', website: 'bauet.ac.bd' },
    })]);

    // the club's contact number changed: update the saved site settings once, only when they still hold the old default number
    try {
      await client.query(`UPDATE settings SET value = jsonb_set(value, '{socialLinks,phone}', '"01748-269350"') WHERE key = 'site' AND value->'socialLinks'->>'phone' = '01707-533471'`);
    } catch (e) { console.warn('Contact number update skipped:', e.message); }

    // The sample committee (config/committeeSeed.json) is only loaded when SEED_COMMITTEE=true (tests, a fresh practice site). A real site starts with no members.
    const seeded = await client.query('SELECT 1 FROM members WHERE committee_session IS NOT NULL LIMIT 1');
    if (process.env.SEED_COMMITTEE === 'true' && !seeded.rows.length) {
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

    // One-time clean-up: sample committee members that were loaded before go to the Trash (nothing is erased: Admin -> Trash brings them back).
    // Only rows that still match the sample exactly are moved, so members the club added or changed stay.
    try {
      const done = await client.query("SELECT 1 FROM settings WHERE key = 'committee_seed_cleanup_v1'");
      if (!done.rows.length && process.env.SEED_COMMITTEE !== 'true') {
        let moved = 0;
        for (const m of require('./committeeSeed.json')) {
          moved += (await client.query('UPDATE members SET deleted_at = NOW() WHERE deleted_at IS NULL AND name = $1 AND position = $2 AND committee_session = $3 AND image_url IS NULL', [m.name, m.position, m.session])).rowCount || 0;
        }
        await client.query("INSERT INTO settings (key, value) VALUES ('committee_seed_cleanup_v1', $1::jsonb) ON CONFLICT (key) DO NOTHING", [JSON.stringify({ at: new Date().toISOString(), moved })]);
        console.log(`Sample committee clean-up: ${moved} members moved to the Trash`);
      }
    } catch (e) { console.warn('Sample committee clean-up skipped:', e.message); }

    // One-time clean-up: the sample FAQs that were loaded before go to the Trash (restore them from Admin -> Trash). Only untouched ones (same question and answer).
    try {
      const done = await client.query("SELECT 1 FROM settings WHERE key = 'faq_seed_cleanup_v1'");
      if (!done.rows.length && process.env.SEED_FAQS !== 'true') {
        let moved = 0;
        for (const q of require('../features/faqs').seed || []) {
          moved += (await client.query('UPDATE faqs SET deleted_at = NOW() WHERE deleted_at IS NULL AND question = $1 AND answer = $2', [q.question, q.answer])).rowCount || 0;
        }
        await client.query("INSERT INTO settings (key, value) VALUES ('faq_seed_cleanup_v1', $1::jsonb) ON CONFLICT (key) DO NOTHING", [JSON.stringify({ at: new Date().toISOString(), moved })]);
        console.log(`Sample FAQ clean-up: ${moved} moved to the Trash`);
      }
    } catch (e) { console.warn('Sample FAQ clean-up skipped:', e.message); }

    // The sample "How can I contact the club?" FAQ still held the old phone number, so the exact-match clean-up above missed it. Same treatment (Trash, once).
    try {
      const done = await client.query("SELECT 1 FROM settings WHERE key = 'faq_seed_cleanup_v2'");
      if (!done.rows.length && process.env.SEED_FAQS !== 'true') {
        const r = await client.query("UPDATE faqs SET deleted_at = NOW() WHERE deleted_at IS NULL AND question = 'How can I contact the club?' AND answer LIKE '%01707-533471%'");
        await client.query("INSERT INTO settings (key, value) VALUES ('faq_seed_cleanup_v2', $1::jsonb) ON CONFLICT (key) DO NOTHING", [JSON.stringify({ at: new Date().toISOString(), moved: r.rowCount || 0 })]);
      }
    } catch (e) { console.warn('Sample FAQ clean-up (2) skipped:', e.message); }

    // Committee sessions are ready until 2030: Winter 2026, then Summer and Winter of every year (two per year). Added once, never removes or reorders yours.
    try {
      const planned = [];
      for (let y = 2026; y <= 2030; y++) { if (y > 2026) planned.push(`Summer ${y}`); planned.push(`Winter ${y}`); }
      const cur = (await client.query("SELECT value FROM settings WHERE key = 'site'")).rows[0]?.value || {};
      const have = Array.isArray(cur.sessions) ? cur.sessions : [];
      const merged = [...new Set([...have, ...planned])];
      if (merged.length !== have.length) {
        await client.query("INSERT INTO settings (key, value) VALUES ('site', $1::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value", [JSON.stringify({ ...cur, sessions: merged })]);
      }
    } catch (e) { console.warn('Committee sessions setup skipped:', e.message); }

    // One-time clean-up: remove any sample ("demo") rows left in the database. Only rows marked is_demo are touched, and only once.
    try {
      const done = await client.query("SELECT 1 FROM settings WHERE key = 'demo_cleanup_v1'");
      if (!done.rows.length && process.env.SEED_SAMPLES !== 'true') {
        let removed = 0;
        for (const t of ['events', 'notices', 'members', 'achievements', 'registrations', 'gallery', 'posts', 'messages', 'projects', 'subscribers', 'page_views']) {
          try { removed += (await client.query(`DELETE FROM ${t} WHERE is_demo = true`)).rowCount || 0; } catch { /* table or column not there: nothing to remove */ }
        }
        await client.query("INSERT INTO settings (key, value) VALUES ('demo_cleanup_v1', $1::jsonb) ON CONFLICT (key) DO NOTHING", [JSON.stringify({ at: new Date().toISOString(), removed })]);
        console.log(`Demo clean-up done: ${removed} sample rows removed`);
      }
    } catch (e) { console.warn('Demo clean-up skipped:', e.message); }

    // Demo content is opt-in (SEED_SAMPLES=true) — or load/remove it any time from Admin → Settings
    if (process.env.SEED_SAMPLES === 'true') await require('../utils/demo').loadDemo();

    // Start again from nothing: RESET_ALL_ADMINS=true removes EVERY admin account (and unfinished sign-ups) once, so the first people can sign up again.
    // Remove the variable afterwards, or the accounts are removed at every restart.
    if (String(process.env.RESET_ALL_ADMINS).toLowerCase() === 'true') {
      const gone = await client.query('DELETE FROM admins');
      await client.query('DELETE FROM admin_signups');
      console.log(`RESET_ALL_ADMINS: ${gone.rowCount} admin account(s) removed. Sign-up is open for 3 new accounts. Now remove RESET_ALL_ADMINS from the environment.${process.env.ADMIN_PASSWORD ? ' WARNING: ADMIN_PASSWORD is still set, so an account is created from it; remove ADMIN_PASSWORD too.' : ''}`);
    }
    const bcrypt = require('bcryptjs');
    // Never ship a well-known password: use ADMIN_PASSWORD, or generate one and print it once.
    // a pasted value can carry spaces or quote marks around it (for example "Ice-2016"): remove them so it matches what is typed at sign-in
    if (process.env.ADMIN_PASSWORD) process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD.trim().replace(/^(["'])(.*)\1$/, '$2');
    // a copied password can carry a look-alike dash (– — −) or an invisible character instead of the keyboard hyphen: turn the dashes into "-" and drop the invisible ones
    if (process.env.ADMIN_PASSWORD) {
      const clean = process.env.ADMIN_PASSWORD.replace(/[\u2010-\u2015\u2212]/g, '-').replace(/[\u200B-\u200D\u2060\uFEFF\u00A0]/g, '');
      if (clean !== process.env.ADMIN_PASSWORD) console.warn('ADMIN_PASSWORD had look-alike or invisible characters; they were replaced with plain keyboard characters.');
      process.env.ADMIN_PASSWORD = clean;
    }
    const adminPassword = process.env.ADMIN_PASSWORD || require('crypto').randomBytes(9).toString('base64url');
    const hash = await bcrypt.hash(adminPassword, 10);
    // the first admin is called ICT-Club (ADMIN_USERNAME changes it). An older install called it "admin": rename that account once, nothing else changes.
    const adminName = (process.env.ADMIN_USERNAME || 'ICT-Club').trim().slice(0, 60) || 'ICT-Club';
    await client.query("UPDATE admins SET username = $1 WHERE username = 'admin' AND NOT EXISTS (SELECT 1 FROM admins WHERE LOWER(username) = LOWER($1))", [adminName]);
    // no ADMIN_PASSWORD means no ready-made account at all: the first people sign up themselves (see /api/auth/signup, at most 3 accounts)
    const created = process.env.ADMIN_PASSWORD ? await client.query(`
      INSERT INTO admins (username, password_hash, role) SELECT $1::text, $2::text, 'superadmin'
      WHERE NOT EXISTS (SELECT 1 FROM admins WHERE LOWER(username) = LOWER($1))
      RETURNING id
    `, [adminName, hash]) : { rows: [] };
    // the main admin made before sign-up existed has no e-mail: give it ADMIN_NOTIFY_EMAIL, so its reset link also goes to its own address
    if (process.env.ADMIN_NOTIFY_EMAIL) await client.query("UPDATE admins SET email = $1 WHERE role = 'superadmin' AND email IS NULL AND NOT EXISTS (SELECT 1 FROM admins WHERE LOWER(email) = LOWER($1))", [process.env.ADMIN_NOTIFY_EMAIL.trim().toLowerCase()]);
    // The admin account is created ONCE. Changing ADMIN_PASSWORD later does not change an existing account. To set a new password
    // (forgotten, or changed in Render after the first start), set RESET_ADMIN_PASSWORD=true together with a strong ADMIN_PASSWORD,
    // let the service restart, sign in, then REMOVE the RESET_ADMIN_PASSWORD line.
    if (String(process.env.RESET_ADMIN_PASSWORD).toLowerCase() === 'true') {
      const problem = process.env.ADMIN_PASSWORD ? require('../utils/passwordPolicy').passwordProblem(process.env.ADMIN_PASSWORD, adminName) : 'ADMIN_PASSWORD is not set';
      if (problem) console.warn(`RESET_ADMIN_PASSWORD is on but the password was not changed: ${problem}`);
      else {
        const r = await client.query("UPDATE admins SET password_hash = $1, failed_logins = 0, locked_until = NULL, token_version = COALESCE(token_version, 0) + 1 WHERE LOWER(username) = LOWER($2)", [hash, adminName]);
        const names = (await client.query('SELECT username FROM admins ORDER BY id')).rows.map((x) => x.username).join(', ');
        console.log(`The admin password was reset from ADMIN_PASSWORD (${adminPassword.length} characters). Username: ${adminName}. Accounts changed: ${r.rowCount}. All admin accounts: ${names}. Now remove RESET_ADMIN_PASSWORD from the environment.`);
      }
    }
    if (created.rows.length && !process.env.ADMIN_PASSWORD) console.log(`\nAdmin account created. Username: ${adminName}  Password: ${adminPassword}\n(Save it now — it is not shown again. Set ADMIN_PASSWORD in .env to choose your own.)`);

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
