const pool = require('../config/db');

const DEMO_TABLES = ['events', 'notices', 'members', 'achievements', 'registrations', 'gallery', 'posts', 'messages', 'projects', 'sponsors', 'subscribers'];
const SESSION = 'Winter 2026';

const day = (offset) => new Date(Date.now() + offset * 864e5).toISOString().slice(0, 10);

// small self-contained avatar (no external image host needed)
function avatar(name, i) {
  const pairs = [['#1F4FD8', '#17A2D8'], ['#0E9F6E', '#17A2D8'], ['#6C4DF6', '#1F4FD8'], ['#E4572E', '#F5A524'], ['#0A1A4A', '#1F4FD8']];
  const [a, b] = pairs[i % pairs.length];
  const ini = name.replace(/^(Dr|Prof)\.?\s+/i, '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="400" height="400" fill="url(#g)"/><text x="200" y="222" font-family="Arial,Helvetica,sans-serif" font-size="118" font-weight="700" fill="#fff" text-anchor="middle">${ini}</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

const EVENTS = [
  ['Hackathon 2026: Code for Change', 30, '09:00 AM', 'BAUET Main Auditorium', 'Competition', '24-hour hackathon for teams of 3–4 solving real campus problems. Prizes for the top three teams.', true],
  ['Web Development Workshop', 10, '03:00 PM', 'CSE Lab 2', 'Workshop', 'Hands-on React + Node.js + PostgreSQL session for beginners. Bring your laptop.', false],
  ['AI & Machine Learning Seminar', 20, '10:00 AM', 'Conference Hall', 'Seminar', 'Industry speakers on LLMs, computer vision and careers in AI.', false],
  ['Intra-University Programming Contest', 45, '02:00 PM', 'CSE Lab 1', 'Competition', 'Individual ICPC-style contest. Top performers join the regional team.', true],
];
const NOTICES = [
  ['Hackathon 2026 registration is open', 0, 'Form your team and register before the end of the month.', 'urgent', true],
  ['New committee announced', -3, 'Congratulations to the Winter 2026 committee! See the Team page.', 'normal', false],
  ['Workshop slides available', -8, 'Slides and code from the last workshop are now on the club drive.', 'low', false],
];
const AWARDS = [
  ['National Hackathon — 1st place', -90, 'Our team won first place at an inter-university hackathon.'],
  ['ICPC Regional qualifiers', -50, 'Three teams qualified for the regional round.'],
  ['Best University Tech Club', -120, 'Recognised for community impact and events.'],
];

// [name, position, department, batch, order]
const COMMITTEE = [
  ['Dr. Anwar Hossain', 'President', 'ICE', null, 1],
  ['Tanvir Ahmed', 'Vice President (Technical)', 'ICE', '8th', 2],
  ['Nusrat Jahan', 'Vice President (Administration)', 'ICE', '8th', 3],
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
  ['committee', 'Nafis Iqbal', 'ICE', 'Treasurer'], ['committee', 'Raisa Karim', 'CSE', 'Publicity Secretary (Social Media Management)'],
  ['committee', 'Sazzad Hossain', 'ICE', 'IT Secretary (Webmaster)'], ['committee', 'Mahira Tanzim', 'EEE', 'Executive Member (Documentation)'],
  ['ambassador', 'Imran Hossain', 'EEE', 'Department Ambassador'], ['ambassador', 'Shirin Akter', 'CE', 'Department Ambassador'],
  ['ambassador', 'Fahim Shahriar', 'CSE', 'Department Ambassador'],
  ['general', 'Rafi Ahmed', 'ICE', ''], ['general', 'Maliha Noor', 'CSE', ''], ['general', 'Nabil Khan', 'ICE', ''],
  ['general', 'Tasfia Islam', 'EEE', ''], ['general', 'Shuvo Das', 'ME', ''],
];

// wide illustration used for gallery, post and project pictures (no external image host needed)
function scene(label, i) {
  const pairs = [['#0A1A4A', '#1F4FD8'], ['#0E9F6E', '#17A2D8'], ['#6C4DF6', '#1F4FD8'], ['#E4572E', '#F5A524'], ['#17A2D8', '#18A957']];
  const [a, b] = pairs[i % pairs.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="520"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="800" height="520" fill="url(#g)"/><g fill="#fff" fill-opacity=".14"><circle cx="660" cy="120" r="130"/><circle cx="120" cy="440" r="170"/></g><text x="400" y="285" font-family="Arial,Helvetica,sans-serif" font-size="46" font-weight="700" fill="#fff" text-anchor="middle">${label.replace(/&/g, '&amp;')}</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}
const logo = (name, i) => scene(name, i + 2);

const GALLERY = [
  ['Python Workshop', 'Workshop', -12, 'Beginners writing their first programs.'], ['Hackathon Day', 'Hackathon', -40, 'Teams building through the night.'],
  ['Team Meetup', 'Team', -25, 'The committee after the planning session.'], ['Tech Talk', 'Seminar', -33, 'Guest speaker on cloud careers.'],
  ['Programming Contest', 'Competition', -60, 'ICPC-style practice round.'], ['Robotics Demo', 'Workshop', -75, 'Line follower robots on the track.'],
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
  ['Smart Notice Bot', 'Sends new university notices to students automatically.', 'Node.js, Telegram API', 'Idea', 'Open for members', false],
];
const SPONSORS = [['TechBangla', 'Gold'], ['CloudNest', 'Gold'], ['DevHub BD', 'Silver'], ['CodeCraft', 'Silver'], ['Rajshahi IT Park', 'Partner']];
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
    await pool.query('INSERT INTO events (title, date, time, location, category, description, featured, is_demo) VALUES ($1,$2,$3,$4,$5,$6,$7,true)', [title, day(d), time, location, category, description, featured]);
  }
  for (const [title, d, content, priority, pinned] of NOTICES) {
    await pool.query('INSERT INTO notices (title, date, content, priority, pinned, is_demo) VALUES ($1,$2,$3,$4,$5,true)', [title, day(d), content, priority, pinned]);
  }
  for (const [title, d, description] of AWARDS) {
    await pool.query('INSERT INTO achievements (title, date, description, is_demo) VALUES ($1,$2,$3,true)', [title, day(d), description]);
  }
  for (const [i, [name, position, department, batch, order]] of COMMITTEE.entries()) {
    await pool.query('INSERT INTO members (name, position, department, batch, committee_session, image_url, display_order, is_demo) VALUES ($1,$2,$3,$4,$5,$6,$7,true)', [name, position, department, batch, SESSION, avatar(name, i), order]);
  }
  for (const [i, [name, department, batch]] of AMBASSADORS.entries()) {
    await pool.query('INSERT INTO members (name, position, department, batch, committee_session, image_url, display_order, is_demo) VALUES ($1,$2,$3,$4,$5,$6,$7,true)', [name, 'Department Ambassador', department, batch, SESSION, avatar(name, i + 3), 50 + i]);
  }
  for (const [i, [type, name, department, post]] of APPLICANTS.entries()) {
    const email = `demo.${name.toLowerCase().replace(/\W+/g, '.')}@example.com`;
    await pool.query(
      `INSERT INTO registrations (type, full_name, student_id, batch, department, phone, email, gender, post, interests, experience, note, photo_url, is_demo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'',$8,$9,$10,$11,$12,true)`,
      [type, name, `D${2200 + i}`, '14', department, `0171000${String(1000 + i)}`, email, post,
        type === 'general' ? ['Web Development', 'AI & ML'] : [], type === 'general' ? 'Beginner' : '',
        'Demo application — safe to delete.', type === 'general' ? '' : avatar(name, i)]
    );
  }
  for (const [i, [title, category, d, description]] of GALLERY.entries()) {
    await pool.query('INSERT INTO gallery (title, image_url, category, date, description, is_demo) VALUES ($1,$2,$3,$4,$5,true)', [title, scene(title, i), category, day(d), description]);
  }
  for (const [i, [title, content, author]] of POSTS.entries()) {
    await pool.query('INSERT INTO posts (title, content, image_url, author, is_demo) VALUES ($1,$2,$3,$4,true)', [title, content, scene(title, i + 1), author]);
  }
  for (const [i, [title, summary, tech, status, team, featured]] of PROJECTS.entries()) {
    await pool.query('INSERT INTO projects (title, summary, tech, status, team, image_url, featured, is_demo) VALUES ($1,$2,$3,$4,$5,$6,$7,true)', [title, summary, tech, status, team, scene(title, i), featured]);
  }
  for (const [i, [name, tier]] of SPONSORS.entries()) {
    await pool.query('INSERT INTO sponsors (name, tier, logo_url, sort_order, is_demo) VALUES ($1,$2,$3,$4,true)', [name, tier, logo(name, i), i + 1]);
  }
  for (const email of SUBSCRIBERS) await pool.query('INSERT INTO subscribers (email, is_demo) VALUES ($1,true)', [email]);
  for (const [name, email, subject, message] of MESSAGES) {
    await pool.query('INSERT INTO messages (name, email, subject, message, is_demo) VALUES ($1,$2,$3,$4,true)', [name, email, subject, message]);
  }
  // make the new semester selectable in the admin session lists
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
