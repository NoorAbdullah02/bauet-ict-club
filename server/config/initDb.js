const pool = require('./db');

async function initDb() {
  const client = await pool.connect();
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

      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'admin',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
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

    // Seed sample events
    await client.query(`
      INSERT INTO events (title, date, time, location, category, description, featured) VALUES
        ('Hackathon 2026: Code for Change', '2026-12-15', '09:00 AM', 'BAUET Main Auditorium', 'Competition', 'Join the biggest coding competition of the year! Teams of 3-4 will tackle real-world problems in a 24-hour hackathon. Prizes worth 50,000 BDT.', true),
        ('Web Development Workshop', '2026-11-20', '03:00 PM', 'CSE Lab 2', 'Workshop', 'Learn modern web development with React, Node.js, and PostgreSQL. Hands-on session covering frontend, backend, and database fundamentals.', false),
        ('AI & Machine Learning Seminar', '2026-11-25', '10:00 AM', 'Conference Hall', 'Seminar', 'Guest lecture by industry experts on the latest trends in AI and ML. Topics include Large Language Models, Computer Vision, and career opportunities.', false),
        ('Competitive Programming Contest', '2026-12-05', '02:00 PM', 'CSE Lab 1', 'Competition', 'Test your algorithmic skills in this intra-university programming contest. Top performers qualify for ICPC regional.', true),
        ('ICT Club Annual Meetup', '2026-12-20', '05:00 PM', 'University Ground', 'Social', 'End-of-year celebration with fun activities, games, food, and networking.', false)
      ON CONFLICT DO NOTHING
    `);

    // Seed sample members
    await client.query(`
      INSERT INTO members (name, position, department, batch, display_order, social_fb) VALUES
        ('Md. Rafiq Hasan', 'President', 'CSE', '2022', 1, 'https://facebook.com'),
        ('Fatima Akter', 'Vice President', 'EEE', '2022', 2, 'https://facebook.com'),
        ('Tanvir Ahmed', 'General Secretary', 'CSE', '2023', 3, 'https://facebook.com'),
        ('Nusrat Jahan', 'Joint Secretary', 'CSE', '2023', 4, 'https://facebook.com'),
        ('Arif Rahman', 'Treasurer', 'ME', '2022', 5, 'https://facebook.com'),
        ('Sadia Islam', 'Tech Lead', 'CSE', '2023', 6, 'https://facebook.com'),
        ('Kamal Uddin', 'Event Coordinator', 'EEE', '2023', 7, 'https://facebook.com'),
        ('Rumi Akter', 'Media Secretary', 'CE', '2024', 8, 'https://facebook.com')
      ON CONFLICT DO NOTHING
    `);

    // Seed sample notices
    await client.query(`
      INSERT INTO notices (title, date, content, priority, pinned) VALUES
        ('Hackathon 2026 Registration Open', '2026-11-03', 'Registration for Hackathon 2026: Code for Change is now open! Form your teams and register before December 1st.', 'urgent', true),
        ('New Executive Committee Elected', '2026-10-28', 'Congratulations to the newly elected executive committee for 2026-2027!', 'normal', false),
        ('Workshop Materials Available', '2026-10-20', 'All presentation slides and code samples from the recent Python workshop are now available.', 'low', false)
      ON CONFLICT DO NOTHING
    `);

    // Seed achievements
    await client.query(`
      INSERT INTO achievements (title, date, description) VALUES
        ('National Hackathon Champions 2025', '2025-09-15', 'BAUET ICT Club team won first place at the National Inter-University Hackathon, competing against 50+ teams.'),
        ('ICPC Dhaka Regional Qualifiers', '2025-11-20', 'Three teams from BAUET qualified for the ICPC Asia Dhaka Regional contest.'),
        ('Best University Tech Club Award', '2025-06-10', 'Recognized as the Best University Tech Club at the Bangladesh Digital Innovation Summit 2025.'),
        ('Open Source Contribution Milestone', '2025-03-01', 'Club members collectively contributed to 100+ open source projects on GitHub.')
      ON CONFLICT DO NOTHING
    `);

    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('bauet@ict2026', 10);
    await client.query(`
      INSERT INTO admins (username, password_hash, role) VALUES ('admin', $1, 'superadmin')
      ON CONFLICT (username) DO NOTHING
    `, [hash]);

    console.log('Database initialized successfully!');
  } catch (e) {
    console.error('Database initialization failed:', e.message);
  } finally {
    client.release();
    process.exit(0);
  }
}

initDb();
