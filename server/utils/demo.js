const pool = require('../config/db');

const DEMO_TABLES = ['events', 'notices', 'members', 'achievements', 'registrations', 'gallery', 'posts', 'messages', 'projects', 'subscribers', 'page_views', 'point_awards'];
const SESSION = 'Winter 2026';

const day = (offset) => new Date(Date.now() + offset * 864e5).toISOString().slice(0, 10);

const { avatar, scene } = require('./demoArt');

const EVENTS = [
  ['Hackathon 2026: Code for Change', 30, '09:00 AM', 'BAUET Main Auditorium', 'Competition', '24-hour hackathon for teams of 3–4 solving real campus problems. Prizes for the top three teams.', true],
  ['Web Development Workshop', 10, '03:00 PM', 'CSE Lab 2', 'Workshop', 'Hands-on React + Node.js + PostgreSQL session for beginners. Bring your laptop.', false],
  ['AI & Machine Learning Seminar', 20, '10:00 AM', 'Conference Hall', 'Seminar', 'Industry speakers on LLMs, computer vision and careers in AI.', false],
  ['Intra-University Programming Contest', 45, '02:00 PM', 'CSE Lab 1', 'Competition', 'Individual ICPC-style contest. Top performers join the regional team.', true],
  ['Cyber Security & Ethical Hacking Bootcamp', 15, '03:30 PM', 'CSE Lab 3', 'Workshop', 'Hands-on network analysis, web application security scanning, and CTF challenges.', false],
  ['Tech Carnival & Project Exhibition 2025', -45, '10:00 AM', 'Campus Ground', 'Festival', 'Annual technology festival celebrating student innovations, robotics, and software projects.', false],
];
const EVENT_ART = {
  'Hackathon 2026: Code for Change': 'code',
  'Web Development Workshop': 'workshop',
  'AI & Machine Learning Seminar': 'stage',
  'Intra-University Programming Contest': 'trophy',
  'Cyber Security & Ethical Hacking Bootcamp': 'circuit',
  'Tech Carnival & Project Exhibition 2025': 'stage',
};
const GALLERY_ART = ['workshop', 'code', 'team', 'stage', 'trophy', 'circuit'];
const POST_ART = ['code', 'workshop', 'stage'];
const PROJECT_ART = ['code', 'app', 'circuit', 'app', 'circuit'];
const NOTICES = [
  ['Hackathon 2026 registration is open', 0, 'Form your team and register before the end of the month. Exciting prizes await the top teams.', 'urgent', true],
  ['New committee announced', -3, 'Congratulations to the Winter 2026 executive committee! See the Team page for details.', 'normal', false],
  ['Annual General Meeting (AGM) 2026', 12, 'All executive and general members are invited to attend the Annual General Meeting at the Central Auditorium.', 'urgent', true],
  ['Call for Project Showcase & Tech Carnival', 8, 'Submit your software or hardware projects for the upcoming campus technology showcase.', 'normal', false],
  ['Workshop slides and code available', -8, 'Slides and source code from the full-stack web workshop are now available on the club drive.', 'low', false],
  ['Weekly Competitive Programming & Mentorship Session', 4, 'Join us every Wednesday at 04:00 PM in CSE Lab 2 for algorithmic problem solving and interview prep.', 'normal', false],
];
const AWARDS = [
  ['National Hackathon — 1st place', -90, 'Our university team won first place at an inter-university hackathon.'],
  ['ICPC Regional qualifiers', -50, 'Three club teams qualified for the prestigious regional round.'],
  ['Best University Tech Club', -120, 'Recognised for high community impact, tech workshops and student events.'],
  ['Inter-University Project Showcase Champion', -160, 'Won the champion crest for IoT and embedded systems innovation.'],
];

const COMMITTEE = [
  ['Dr. Anwar Hossain', 'President', 'ICE', null, 1],
  ['Nusrat Jahan', 'Vice President (Administration)', 'ICE', '8th', 2],
  ['Tanvir Ahmed', 'Vice President (Technical)', 'ICE', '8th', 3],
  ['Rafiq Islam', 'General Secretary', 'ICE', '9th', 4],
  ['Sadia Akter', 'Asst. General Secretary', 'ICE', '9th', 5],
  ['Arif Rahman', 'Joint Secretary', 'ICE', '10th', 6],
  ['Mim Chowdhury', 'Joint Secretary', 'CSE', '10th', 7],
  ['Kamal Uddin', 'Organizing Secretary', 'ICE', '9th', 8],
  ['Farhana Yeasmin', 'Treasurer', 'EEE', '9th', 9],
  ['Zubair Alam', 'Chief Executive (HR)', 'ICE', '10th', 10],
  ['Lamia Sultana', 'Chief Executive (Logistics)', 'ICE', '10th', 11],
  ['Shafin Karim', 'Chief Executive (Development)', 'CSE', '11th', 12],
  ['Priya Das', 'Chief Executive (Media)', 'ICE', '11th', 13],
  ['Rony Mia', 'Executive (Photography)', 'CE', '12th', 14],
  ['Tasnim Haque', 'Executive (Event Planning)', 'ICE', '12th', 15],
  ['Hasib Khan', 'Executive (Public Relations)', 'ME', '12th', 16],
];
const AMBASSADORS = [['Sumaiya Tabassum', 'ICE', '11th'], ['Rakib Hasan', 'CSE', '11th'], ['Jannat Ara', 'EEE', '10th'], ['Mehedi Hasan', 'CE', '12th'], ['Tuhin Ahmed', 'ME', '11th'], ['Anika Rahman', 'ICE', '12th']];
const APPLICANTS = [
  ['committee', 'Nafis Iqbal', 'ICE', 'Treasurer', 'approved'],
  ['committee', 'Raisa Karim', 'CSE', 'Publicity Secretary (Social Media Management)', 'pending'],
  ['committee', 'Sazzad Hossain', 'ICE', 'IT Secretary (Webmaster)', 'pending'],
  ['committee', 'Mahira Tanzim', 'EEE', 'Executive Member (Documentation)', 'approved'],
  ['ambassador', 'Imran Hossain', 'EEE', 'Department Ambassador', 'approved'],
  ['ambassador', 'Shirin Akter', 'CE', 'Department Ambassador', 'pending'],
  ['ambassador', 'Fahim Shahriar', 'CSE', 'Department Ambassador', 'pending'],
  ['general', 'Rafi Ahmed', 'ICE', '', 'approved'],
  ['general', 'Maliha Noor', 'CSE', '', 'approved'],
  ['general', 'Nabil Khan', 'ICE', '', 'pending'],
  ['general', 'Tasfia Islam', 'EEE', '', 'pending'],
  ['general', 'Shuvo Das', 'ME', '', 'pending'],
];

const GALLERY = [
  ['Python Workshop', 'Workshop', -12, 'Beginners writing their first programs.'],
  ['Hackathon Day', 'Hackathon', -40, 'Teams building through the night.'],
  ['Team Meetup', 'Team', -25, 'The committee after the planning session.'],
  ['Tech Talk', 'Seminar', -33, 'Guest speaker on cloud careers.'],
  ['Programming Contest', 'Competition', -60, 'ICPC-style practice round.'],
  ['Robotics Demo', 'Workshop', -75, 'Line follower robots on the track.'],
  ['Cyber Security Workshop', 'Workshop', -18, 'Hands-on packet analysis and security tools demonstration.'],
  ['Executive Committee Inauguration', 'Team', -95, 'Formal crest handover and oath-taking ceremony.'],
];
const POSTS = [
  ['How to prepare for your first hackathon', 'Pick a small idea, split the work early and ship something that runs. Judges prefer a simple working demo over a big unfinished plan.\n\nBring chargers, agree on one repo, and sleep for at least a few hours.', 'Tanvir Ahmed', 0],
  ['Learning web development in 90 days', 'Start with HTML and CSS, then JavaScript, then React and a small Node.js API. Build one project every two weeks and show it to the club.', 'Rafiq Islam', 1],
  ['What we learned from the AI seminar', 'Large language models are tools, not magic. The speakers stressed data quality, evaluation and honest limits.', 'Sadia Akter', 2],
];
const PROJECTS = [
  ['Club Portal', 'This website: events, team, applications and an admin console.', 'React, Node.js, PostgreSQL', 'Active', 'Web team', true],
  ['Campus Navigator', 'Find classrooms and labs on the BAUET campus map.', 'Flutter, Firebase', 'In progress', 'App team', true],
  ['Attendance Scanner', 'QR-based attendance for workshops and events.', 'Python, OpenCV', 'Completed', 'Dev team', false],
  ['Smart Notice Bot', 'Sends new university notices to students automatically.', 'Node.js, Telegram API', 'Active', 'Open for members', false],
  ['Autonomous Rover', 'IoT-enabled obstacle-avoiding surveillance rover built with ESP32.', 'C++, ESP32, FreeRTOS', 'In progress', 'Robotics wing', true],
];
const SUBSCRIBERS = ['demo.reader1@example.com', 'demo.reader2@example.com', 'demo.reader3@example.com', 'demo.reader4@example.com'];
const MESSAGES = [
  ['Samiul Islam', 'demo.samiul@example.com', 'How can I join?', 'Hello, I am in 1st year ICE. How can I become a member and when is the next workshop?'],
  ['Farzana Rahim', 'demo.farzana@example.com', 'Sponsorship', 'Our company would like to sponsor your next hackathon. Who should we talk to?'],
  ['Tahmid Hasan', 'demo.tahmid@example.com', 'Certificate', 'I attended the Python workshop. Will participants get a certificate?'],
];

async function count() {
  let n = 0;
  for (const t of DEMO_TABLES) n += Number((await pool.query(`SELECT COUNT(*) AS c FROM ${t} WHERE is_demo = true`)).rows[0].c);
  return n;
}

async function loadDemo() {
  if (await count()) return { loaded: false, reason: 'Demo data is already loaded' };

  for (const [title, d, time, location, category, description, featured] of EVENTS) {
    await pool.query('INSERT INTO events (title, date, time, location, category, description, featured, image_url, is_demo) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true)', [title, day(d), time, location, category, description, featured, scene(EVENT_ART[title] || 'code', title, 0)]);
  }
  for (const [title, d, content, priority, pinned] of NOTICES) {
    await pool.query('INSERT INTO notices (title, date, content, priority, pinned, is_demo) VALUES ($1,$2,$3,$4,$5,true)', [title, day(d), content, priority, pinned]);
  }
  for (const [title, d, description] of AWARDS) {
    await pool.query('INSERT INTO achievements (title, date, description, image_url, is_demo) VALUES ($1,$2,$3,$4,true)', [title, day(d), description, scene('trophy', title, AWARDS.findIndex((x) => x[0] === title))]);
  }
  for (const [i, [name, position, department, batch, order]] of COMMITTEE.entries()) {
    await pool.query('INSERT INTO members (name, position, department, batch, committee_session, image_url, display_order, is_demo) VALUES ($1,$2,$3,$4,$5,$6,$7,true)', [name, position, department, batch, SESSION, avatar(name, i), order]);
  }
  for (const [i, [name, department, batch]] of AMBASSADORS.entries()) {
    await pool.query('INSERT INTO members (name, position, department, batch, committee_session, image_url, display_order, is_demo) VALUES ($1,$2,$3,$4,$5,$6,$7,true)', [name, 'Department Ambassador', department, batch, SESSION, avatar(name, i + 3), 50 + i]);
  }
  for (const [i, [type, name, department, post, status]] of APPLICANTS.entries()) {
    const email = `demo.${name.toLowerCase().replace(/\W+/g, '.')}@example.com`;
    await pool.query(
      `INSERT INTO registrations (type, full_name, student_id, batch, department, phone, email, gender, post, interests, experience, note, photo_url, status, is_demo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'',$8,$9,$10,$11,$12,$13,true)`,
      [type, name, `D${2200 + i}`, '14', department, `0171000${String(1000 + i)}`, email, post,
        type === 'general' ? ['Web Development', 'AI & ML'] : [], type === 'general' ? 'Beginner' : '',
        'Demo application — safe to delete.', type === 'general' ? '' : avatar(name, i), status || 'pending']
    );
  }
  for (const [i, [title, category, d, description]] of GALLERY.entries()) {
    await pool.query('INSERT INTO gallery (title, image_url, category, date, description, is_demo) VALUES ($1,$2,$3,$4,$5,true)', [title, scene(GALLERY_ART[i % GALLERY_ART.length], title, i), category, day(d), description]);
  }
  for (const [i, [title, content, author]] of POSTS.entries()) {
    await pool.query('INSERT INTO posts (title, content, image_url, author, is_demo) VALUES ($1,$2,$3,$4,true)', [title, content, scene(POST_ART[i % POST_ART.length], title, i + 1), author]);
  }
  for (const [i, [title, summary, tech, status, team, featured]] of PROJECTS.entries()) {
    await pool.query('INSERT INTO projects (title, summary, tech, status, team, image_url, featured, is_demo) VALUES ($1,$2,$3,$4,$5,$6,$7,true)', [title, summary, tech, status, team, scene(PROJECT_ART[i % PROJECT_ART.length], title, i), featured]);
  }
  for (const email of SUBSCRIBERS) await pool.query('INSERT INTO subscribers (email, is_demo) VALUES ($1,true)', [email]);
  for (const [name, email, subject, message] of MESSAGES) {
    await pool.query('INSERT INTO messages (name, email, subject, message, is_demo) VALUES ($1,$2,$3,$4,true)', [name, email, subject, message]);
  }
  if (!process.env.QA_PORT) {
    const demoAwards = [
      ['demo.rafi.ahmed@example.com', 'Rafi Ahmed', 25, 'Active Participation in React Workshop'],
      ['demo.rafi.ahmed@example.com', 'Rafi Ahmed', 15, 'Volunteer at Intra-University Contest'],
      ['demo.maliha.noor@example.com', 'Maliha Noor', 30, 'Best UI Design Submission'],
    ];
    for (const [email, name, pts, reason] of demoAwards) {
      await pool.query('INSERT INTO point_awards (email, name, points, reason, is_demo) VALUES ($1,$2,$3,$4,true)', [email, name, pts, reason]);
    }
  }
  const PAGES = ['/', '/', '/', '/events', '/team', '/join', '/notices', '/gallery', '/projects', '/faq', '/about', '/contact'];
  const REFS = [null, null, null, 'facebook.com', 'google.com', 'l.facebook.com'];
  const UAS = [['Desktop', 'Mozilla/5.0 (Windows NT 10.0) Chrome/120'], ['Mobile', 'Mozilla/5.0 (Linux; Android 13) Mobile Chrome/120'], ['Mobile', 'Mozilla/5.0 (iPhone) Mobile Safari'], ['Tablet', 'Mozilla/5.0 (iPad) Safari']];
  let seed = 7; const rnd = (n) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
  const visits = [];
  for (let back = 0; back < 56; back += 1) {
    const dayStr = day(-back);
    const weekend = [0, 6].includes(new Date(`${dayStr}T00:00:00Z`).getUTCDay());
    const people = (weekend ? 6 : 14) + rnd(22) + (back < 7 ? 6 : 0);
    for (let v = 0; v < people; v += 1) {
      const ip = `${['192.0.2', '198.51.100', '203.0.113'][rnd(3)]}.${1 + rnd(250)}`;
      const [dev, ua] = UAS[rnd(10) < 6 ? 1 : rnd(4)];
      const ref = REFS[rnd(REFS.length)];
      const pages = 1 + rnd(4);
      for (let k = 0; k < pages; k += 1) visits.push([ip, PAGES[rnd(PAGES.length)], ref, ua, dev, dayStr, `${dayStr}T${String(8 + rnd(14)).padStart(2, '0')}:${String(rnd(60)).padStart(2, '0')}:00Z`]);
    }
  }
  for (let i = 0; i < visits.length; i += 400) {
    const chunk = visits.slice(i, i + 400);
    await pool.query(`INSERT INTO page_views (ip, path, referrer, user_agent, device, is_bot, day, created_at, is_demo) VALUES ${chunk.map((_, k) => `($${k * 7 + 1},$${k * 7 + 2},$${k * 7 + 3},$${k * 7 + 4},$${k * 7 + 5},false,$${k * 7 + 6},$${k * 7 + 7},true)`).join(',')}`, chunk.flat());
  }
  const cur = (await pool.query("SELECT value FROM settings WHERE key = 'site'")).rows[0]?.value || {};
  const sessions = [...new Set([...(cur.sessions || []), SESSION])];
  await pool.query("INSERT INTO settings (key, value) VALUES ('site', $1::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value", [JSON.stringify({ ...cur, sessions })]);
  return { loaded: true, count: await count() };
}

async function removeDemo() {
  let removed = 0;
  for (const t of DEMO_TABLES) {
    const r = await pool.query(`DELETE FROM ${t} WHERE is_demo = true`);
    removed += r.rowCount || 0;
  }
  return { removed };
}

module.exports = { loadDemo, removeDemo, demoCount: count, DEMO_SESSION: SESSION };
