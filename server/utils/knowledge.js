const pool = require('../config/db');
const { positionRank } = require('./positions');

const CACHE_MS = 60 * 1000;
let cache = { at: 0, data: null };

const d10 = (v) => require('./format').formalDate(v);
// same public display rule as the leaderboard: first name plus the last initial ("Rafi A.")
const shortName = (full) => {
  const parts = String(full || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'Member';
  const first = parts[0].slice(0, 14);
  return parts.length > 1 ? `${first} ${parts[parts.length - 1][0].toUpperCase()}.` : first;
};
const safe = async (sql, params = []) => { try { return (await pool.query(sql, params)).rows; } catch { return []; } };

/** Public facts the assistant may talk about, read from the database (cached for a minute). Nothing private is included. */
async function load() {
  if (cache.data && Date.now() - cache.at < CACHE_MS) return cache.data;
  const today = new Date().toISOString().slice(0, 10);
  const [site] = (await safe("SELECT value FROM settings WHERE key = 'site'")).map((r) => r.value || {});
  const events = await safe('SELECT title, date, time, location, category, description FROM events WHERE deleted_at IS NULL AND (publish_at IS NULL OR publish_at <= NOW()) AND NOT COALESCE(is_draft, FALSE) AND date >= $1 ORDER BY date ASC LIMIT 6', [today]);
  const notices = await safe('SELECT title, date, content FROM notices WHERE deleted_at IS NULL AND (publish_at IS NULL OR publish_at <= NOW()) AND NOT COALESCE(is_draft, FALSE) AND (expiry_date IS NULL OR expiry_date >= $1) ORDER BY pinned DESC, created_at DESC LIMIT 5', [today]);
  const faqs = await safe('SELECT question, answer FROM faqs WHERE deleted_at IS NULL ORDER BY sort_order ASC LIMIT 20');
  const projects = await safe('SELECT title, summary, status, tech FROM projects WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 8');
  // more public lists the club keeps: advisors, open contests, open jobs, learning resources (private data such as applications and form answers is never read here)
  const advisors = await safe("SELECT name, designation, rank_title, department FROM advisors WHERE deleted_at IS NULL AND COALESCE(active, true) ORDER BY sort_order ASC LIMIT 6");
  const contests = await safe("SELECT title, prize, start_date, deadline, status FROM contests WHERE deleted_at IS NULL AND status = 'open' ORDER BY created_at DESC LIMIT 6");
  const jobs = await safe("SELECT title, company, kind, work_mode, deadline FROM jobs WHERE deleted_at IS NULL AND (publish_at IS NULL OR publish_at <= NOW()) AND NOT COALESCE(is_draft, false) AND (deadline IS NULL OR deadline >= CURRENT_DATE) ORDER BY created_at DESC LIMIT 6");
  const resources = await safe("SELECT title, category, kind FROM resources WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 8");
  const sponsors = await safe('SELECT name, tier FROM sponsors WHERE deleted_at IS NULL ORDER BY sort_order ASC LIMIT 12');
  const members = await safe("SELECT name, position, department, committee_session FROM members WHERE deleted_at IS NULL AND committee_session IS NOT NULL AND position NOT ILIKE '%ambassador%'");
  // the rest of the public site: weekly sessions, what members achieved, the photo gallery, what people say, points and sizes
  const weeklySessions = await safe('SELECT title, topic, day, time, place, note FROM weekly_sessions WHERE COALESCE(active, true) ORDER BY sort_order ASC LIMIT 8');
  const achievements = await safe('SELECT title, date, description FROM achievements ORDER BY date DESC NULLS LAST, created_at DESC LIMIT 6');
  const gallery = await safe('SELECT title, category, date FROM gallery ORDER BY date DESC NULLS LAST, created_at DESC LIMIT 8');
  const testimonials = await safe('SELECT name, role, batch, quote FROM testimonials WHERE COALESCE(active, true) ORDER BY sort_order ASC LIMIT 4');
  // same arithmetic as the public leaderboard (10 points per checked-in event + bonus points), and the same shortened names
  const attendance = await safe("SELECT LOWER(email) AS e, MAX(full_name) AS n, COUNT(DISTINCT event_id)::int AS c FROM event_registrations WHERE deleted_at IS NULL AND checked_in_at IS NOT NULL AND email IS NOT NULL AND email <> '' GROUP BY LOWER(email)");
  const bonuses = await safe('SELECT LOWER(email) AS e, MAX(name) AS n, SUM(points)::int AS p FROM point_awards WHERE deleted_at IS NULL GROUP BY LOWER(email)');
  const scoreboard = new Map();
  for (const r of attendance) scoreboard.set(r.e, { name: r.n, points: (Number(r.c) || 0) * 10 });
  for (const r of bonuses) {
    const cur = scoreboard.get(r.e) || { name: r.n, points: 0 };
    cur.points += Number(r.p) || 0;
    if (!cur.name) cur.name = r.n;
    scoreboard.set(r.e, cur);
  }
  const leadersByPoints = [...scoreboard.values()].filter((x) => x.points > 0)
    .sort((a, b) => b.points - a.points).slice(0, 5).map((x) => ({ name: shortName(x.name), points: x.points }));
  const [people] = await safe('SELECT COUNT(*)::int AS members FROM members WHERE deleted_at IS NULL');
  const [eventCount] = await safe('SELECT COUNT(*)::int AS events FROM events WHERE deleted_at IS NULL');
  const pastEvents = await safe('SELECT title, date, location FROM events WHERE deleted_at IS NULL AND date < $1 AND NOT COALESCE(is_draft, FALSE) ORDER BY date DESC LIMIT 4', [today]);

  // current committee = the newest session that has a President
  const sessions = [...new Set(members.map((m) => m.committee_session))];
  const rank = (s) => { const m = /(\d{4})/.exec(s); return m ? Number(m[1]) * 2 + (/summer/i.test(s) ? 1 : 0) : 0; };
  const current = sessions.sort((a, b) => rank(b) - rank(a))[0];
  const leaders = members.filter((m) => m.committee_session === current && positionRank(m.position) <= 10)
    .sort((a, b) => positionRank(a.position) - positionRank(b.position)).slice(0, 12);

  cache = { at: Date.now(), data: { site: site || {}, events, notices, faqs, projects, sponsors, advisors, contests, jobs, resources, current, leaders, weeklySessions, achievements, gallery, testimonials, leadersByPoints, stats: { members: people?.members || 0, events: eventCount?.events || 0 }, pastEvents } };
  return cache.data;
}

/** Plain-text block put in front of the model. */
function asPrompt(k) {
  const s = k.site || {};
  const lines = [];
  if (s.aboutText) lines.push(`About: ${s.aboutText}`);
  if (s.mission) lines.push(`Mission: ${s.mission}`);
  if (s.vision) lines.push(`Vision: ${s.vision}`);
  if (k.current && k.leaders.length) lines.push(`Current committee (${k.current}): ${k.leaders.map((m) => `${m.name} (${m.position})`).join('; ')}`);
  if (k.events.length) lines.push(`Upcoming events:\n${k.events.map((e) => `- ${e.title}, ${d10(e.date)}${e.time ? ` at ${require('./format').formalTime(e.time)}` : ''}${e.location ? `, ${e.location}` : ''}${e.description ? `. ${String(e.description).slice(0, 160)}` : ''}`).join('\n')}`);
  else lines.push('Upcoming events: none announced right now.');
  if (k.notices.length) lines.push(`Latest notices:\n${k.notices.map((n) => `- ${n.title} (${d10(n.date)})${n.content ? `: ${String(n.content).slice(0, 160)}` : ''}`).join('\n')}`);
  if (k.projects.length) lines.push(`Projects:\n${k.projects.map((p) => `- ${p.title} [${p.status || 'Active'}]${p.summary ? `: ${String(p.summary).slice(0, 120)}` : ''}`).join('\n')}`);
  if (k.advisors?.length) lines.push(`Club advisors (teachers who guide the club): ${k.advisors.map((a) => `${a.name} (${[a.designation, a.rank_title, a.department].filter(Boolean).join(', ')})`).join('; ')}`);
  if (k.contests?.length) lines.push(`Open contests:\n${k.contests.map((c) => `- ${c.title}${c.prize ? `, prize: ${c.prize}` : ''}${c.deadline ? `, deadline ${d10(c.deadline)}` : ''}`).join('\n')} (see the /contests page)`);
  if (k.jobs?.length) lines.push(`Open jobs and internships:\n${k.jobs.map((j) => `- ${j.title}${j.company ? ` at ${j.company}` : ''} [${[j.kind, j.work_mode].filter(Boolean).join(', ')}]${j.deadline ? `, apply by ${d10(j.deadline)}` : ''}`).join('\n')} (see the /jobs page)`);
  if (k.resources?.length) lines.push(`Learning resources (on the /resources page): ${k.resources.map((r) => r.title).join('; ')}`);
  if (k.weeklySessions?.length) lines.push(`Weekly club sessions:\n${k.weeklySessions.map((s) => `- ${s.title}${s.topic ? ` (${s.topic})` : ''}${s.day ? `, ${s.day}` : ''}${s.time ? ` ${s.time}` : ''}${s.place ? `, ${s.place}` : ''}${s.note ? `. ${s.note}` : ''}`).join('\n')}`);
  if (k.pastEvents?.length) lines.push(`Recent past events: ${k.pastEvents.map((e) => `${e.title} (${d10(e.date)}${e.location ? `, ${e.location}` : ''})`).join('; ')}`);
  if (k.achievements?.length) lines.push(`What the club has achieved (on the /achievements page):\n${k.achievements.map((a) => `- ${a.title}${a.date ? ` (${d10(a.date)})` : ''}${a.description ? `: ${String(a.description).slice(0, 140)}` : ''}`).join('\n')}`);
  if (k.gallery?.length) lines.push(`Photo gallery (on the /gallery page): ${k.gallery.map((g) => `${g.title || 'Photo'}${g.category ? ` [${g.category}]` : ''}${g.date ? ` ${d10(g.date)}` : ''}`).join('; ')}`);
  if (k.testimonials?.length) lines.push(`What members say: ${k.testimonials.map((t) => `“${String(t.quote).slice(0, 140)}” — ${t.name}${t.role ? `, ${t.role}` : ''}`).join(' | ')}`);
  if (k.leadersByPoints?.length) lines.push(`Top members by points (see /leaderboard): ${k.leadersByPoints.map((p) => `${p.name} (${p.points})`).join('; ')}`);
  if (k.stats) lines.push(`Club size: ${k.stats.members} members on record and ${k.stats.events} events so far.`);
  if (k.sponsors.length) lines.push(`Collaborations and partners: ${k.sponsors.map((x) => x.name).join(', ')}`);
  if (k.faqs.length) lines.push(`FAQ:\n${k.faqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join('\n')}`);
  return lines.join('\n\n');
}

const STOP = new Set('the a an is are to of in on for and or how what when where who can i do you me my we our your it this that with about from be have has tell please'.split(' '));
const words = (t) => String(t || '').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 2 && !STOP.has(w));

/** Answer without an AI key: best matching FAQ, or the live events/committee, or a contact line. */
function localAnswer(question, k) {
  const q = words(question);
  const lower = String(question).toLowerCase();
  const contact = `You can reach the club at **${k.site?.socialLinks?.email || 'ictclubbauet@gmail.com'}** or **${k.site?.socialLinks?.phone || '01748-269350'}**.`;
  // plain questions about the club itself, answered without any AI key
  if (/(contact|phone|number|call|mail|e-mail|reach|যোগাযোগ|ফোন|নম্বর|ইমেইল)/.test(lower)) return contact;
  if (/(join|member|apply|registration form|become|how.*(register|sign ?up)|সদস্য|যোগ দ|আবেদন)/.test(lower) && !/event|workshop/.test(lower)) return 'To join, open the **Join** page and choose General member, Committee or Department Ambassador. Fill in the form; we e-mail you when it is reviewed. Approved members get a member card under **My member card**.';
  if (/(job|internship|career|hire|চাকরি|ইন্টার্ন)/.test(lower)) {
    return k.jobs?.length ? `Open jobs and internships:\n${k.jobs.slice(0, 5).map((j) => `- **${j.title}**${j.company ? ` at ${j.company}` : ''}${j.deadline ? `, apply by ${d10(j.deadline)}` : ''}`).join('\n')}\nSee the **Jobs** page for all of them, and **Remote jobs** for remote work from around the world.`
      : 'No job is listed right now. See the **Jobs** page for new ones, and **Remote jobs** for remote work from around the world.';
  }
  if (/(advisor|adviser|supervisor|teacher|faculty|উপদেষ্টা|শিক্ষক)/.test(lower)) {
    return k.advisors?.length ? `Club advisors:\n${k.advisors.slice(0, 6).map((a) => `- **${a.name}**${[a.designation, a.rank_title, a.department].filter(Boolean).length ? `, ${[a.designation, a.rank_title, a.department].filter(Boolean).join(', ')}` : ''}`).join('\n')}\nThe Team page shows them too.` : `No advisor is listed yet. ${contact}`;
  }
  if (/(contest|competition|প্রতিযোগিতা|কনটেস্ট)/.test(lower)) {
    return k.contests?.length ? `Open contests:\n${k.contests.slice(0, 5).map((c) => `- **${c.title}**${c.prize ? `, prize: ${c.prize}` : ''}${c.deadline ? `, deadline ${d10(c.deadline)}` : ''}`).join('\n')}\nSee the **Contests** page to join.` : 'No contest is open right now. See the **Contests** page for new ones.';
  }
  if (/(notice|announcement|নোটিশ|বিজ্ঞপ্তি)/.test(lower)) {
    return k.notices.length ? `Latest notices:\n${k.notices.slice(0, 4).map((n) => `- **${n.title}** (${d10(n.date)})`).join('\n')}\nSee the **Notices** page for details.` : 'There is no notice right now. See the **Notices** page later.';
  }
  if (/(project|প্রজেক্ট)/.test(lower)) {
    return k.projects.length ? `Club projects:\n${k.projects.slice(0, 5).map((p) => `- **${p.title}**${p.status ? ` [${p.status}]` : ''}`).join('\n')}\nSee the **Projects** page.` : 'No project is listed yet. See the **Projects** page later.';
  }
  if (/(resource|tutorial|learn|রিসোর্স)/.test(lower) && k.resources?.length) return `Learning resources: ${k.resources.slice(0, 6).map((r) => r.title).join('; ')}. See the **Resources** page.`;
  if (/(session|schedule|routine|timetable|class|সেশন|রুটিন|ক্লাস)/.test(lower) && k.weeklySessions?.length) {
    return `Weekly sessions:\n${k.weeklySessions.slice(0, 6).map((s) => `- **${s.title}**${s.day ? `, ${s.day}` : ''}${s.time ? ` ${s.time}` : ''}${s.place ? `, ${s.place}` : ''}`).join('\n')}\nThey are also listed on the **Events** page.`;
  }
  if (/(achiev|award|winner|trophy|অ্যাচিভমেন্ট|পুরস্কার|অর্জন)/.test(lower)) {
    return k.achievements?.length ? `What the club has achieved:\n${k.achievements.slice(0, 5).map((a) => `- **${a.title}**${a.date ? ` (${d10(a.date)})` : ''}`).join('\n')}\nSee the **Achievements** page.` : 'No achievement is listed yet. See the **Achievements** page later.';
  }
  if (/(gallery|photo|picture|ছবি|গ্যালারি)/.test(lower) && k.gallery?.length) {
    return `The **Gallery** page has ${k.gallery.length}+ photos, for example: ${k.gallery.slice(0, 5).map((g) => g.title || g.category).filter(Boolean).join('; ')}.`;
  }
  if (/(how many|member count|total members|কতজন|সদস্য সংখ্যা)/.test(lower) && k.stats) {
    return `The club has **${k.stats.members}** members on record and **${k.stats.events}** events so far. The **Team** page shows the current committee.`;
  }
  if (/(leaderboard|points|badge|rank|পয়েন্ট|ব্যাজ)/.test(lower)) {
    const top = k.leadersByPoints?.length ? ` Top members right now: ${k.leadersByPoints.slice(0, 3).map((p) => `**${p.name}** (${p.points})`).join(', ')}.` : '';
    return `You earn points for joining events and contests.${top} See the **Leaderboard** page for the full list and badges.`;
  }
  if (/(app|apk|download|install|অ্যাপ|ডাউনলোড)/.test(lower)) return 'Get the Android app from the **App** page (/app). The website also works on phones.';
  if (/(certificate|সার্টিফিকেট)/.test(lower)) return 'Certificates are given after events. Check one on the **Verify** page with its code.';
  if (/(what is|who are|about|tell me|club|কী|কি\b|সম্পর্কে)/.test(lower) && /(club|bauet|ict|ক্লাব|about|সম্পর্কে)/.test(lower) && !/event|workshop|committee|president/.test(lower)) return k.site?.aboutText || 'BAUET ICT Club is the technology club of Bangladesh Army University of Engineering & Technology, Rajshahi. We run workshops, hackathons, tech talks and projects.';
  if (/event|workshop|hackathon|contest|seminar|ইভেন্ট|অনুষ্ঠান/.test(lower)) {
    return k.events.length ? `Upcoming events:\n${k.events.slice(0, 4).map((e) => `- **${e.title}**, ${d10(e.date)}${e.location ? `, ${e.location}` : ''}`).join('\n')}\nSee the Events page for details.` : 'No events are announced right now. Follow our notices or subscribe to the newsletter to hear first.';
  }
  if (/committee|president|team|leader|কমিটি|সভাপতি/.test(lower) && k.leaders.length) {
    return `Current committee (${k.current}):\n${k.leaders.slice(0, 6).map((m) => `- **${m.name}**, ${m.position}`).join('\n')}\nThe Team page lists everyone.`;
  }
  let best = null; let score = 0;
  for (const f of k.faqs) {
    const fw = new Set(words(`${f.question} ${f.answer}`));
    const s = q.reduce((n, w) => n + (fw.has(w) ? 1 : 0), 0);
    if (s > score) { best = f; score = s; }
  }
  if (best && score >= 1) return best.answer;
  return `I am not sure about that. ${contact}`;
}

/** Forget the cached facts, so the next question sees what the admin just added or changed. */
function clear() { cache = { at: 0, data: null }; }

module.exports = { load, asPrompt, localAnswer, clear };
