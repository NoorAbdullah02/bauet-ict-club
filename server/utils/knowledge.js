const pool = require('../config/db');
const { positionRank } = require('./positions');

const CACHE_MS = 60 * 1000;
let cache = { at: 0, data: null };

const d10 = (v) => require('./format').formalDate(v);
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
  const sponsors = await safe('SELECT name, tier FROM sponsors WHERE deleted_at IS NULL ORDER BY sort_order ASC LIMIT 12');
  const members = await safe("SELECT name, position, department, committee_session FROM members WHERE deleted_at IS NULL AND committee_session IS NOT NULL AND position NOT ILIKE '%ambassador%'");

  // current committee = the newest session that has a President
  const sessions = [...new Set(members.map((m) => m.committee_session))];
  const rank = (s) => { const m = /(\d{4})/.exec(s); return m ? Number(m[1]) * 2 + (/summer/i.test(s) ? 1 : 0) : 0; };
  const current = sessions.sort((a, b) => rank(b) - rank(a))[0];
  const leaders = members.filter((m) => m.committee_session === current && positionRank(m.position) <= 10)
    .sort((a, b) => positionRank(a.position) - positionRank(b.position)).slice(0, 12);

  cache = { at: Date.now(), data: { site: site || {}, events, notices, faqs, projects, sponsors, current, leaders } };
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
  const contact = `You can reach the club at **${k.site?.socialLinks?.email || 'ictclubbauet@gmail.com'}** or **${k.site?.socialLinks?.phone || '01707-533471'}**.`;
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

module.exports = { load, asPrompt, localAnswer };
