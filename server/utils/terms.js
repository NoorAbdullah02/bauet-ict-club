// A committee serves one six-month term. The semester in its name sets the first day
// (Summer → 1 April, Winter → 1 October); dates an admin has moved win over that and are kept in the site settings.
const MONTHS = 6;
const DAY = 86400000;
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const parse = (v) => {
  const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))) : null;
};
const addDays = (d, n) => new Date(d.getTime() + n * DAY);
/** Moves a date by whole months, keeping the day where the month is long enough (31 Jan + 1 = 28 Feb). */
const addMonths = (d, n) => {
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n + 1, 0)).getUTCDate();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, Math.min(d.getUTCDate(), last)));
};
const today = () => { const n = new Date(); return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())); };

/** The month each semester starts in (0 = January). */
const STARTS = { spring: 0, summer: 3, fall: 6, autumn: 6, winter: 9 };
/** True for "Winter 2027", "Summer 2026", "Session 2023-24": names the semester calendar can place. */
const named = (label) => /^(spring|summer|fall|autumn|winter|session|semester)\b/i.test(String(label || ''));
const firstDay = (label) => {
  const year = Number((String(label).match(/(20\d{2})/) || [])[1]) || new Date().getFullYear();
  const word = (String(label).match(/^[A-Za-z]+/) || [''])[0].toLowerCase();
  return new Date(Date.UTC(year, STARTS[word] ?? 0, 1));
};

/** Whole months a start/end pair covers (182 days → 6), so an extended or hand-set term reports its real length. */
const monthsOf = (start, end) => Math.max(1, Math.min(24, Math.round(((end - start) / DAY + 1) / 30.44)));

/** One committee's dates: stored start/end when there are any, else six months from the semester's first day. */
function termFor(label, stored = {}) {
  const start = parse(stored.start) || firstDay(label);
  let end = parse(stored.end) || addDays(addMonths(start, Math.min(24, Math.max(1, Number(stored.months) || MONTHS))), -1);
  if (end < start) end = addDays(addMonths(start, MONTHS), -1);
  const now = today();
  return {
    start: ymd(start),
    end: ymd(end),
    months: monthsOf(start, end),
    days_total: Math.round((end - start) / DAY) + 1,
    days_left: Math.ceil((end - now) / DAY),
    expired: end < now,
    started: start <= now,
  };
}

/** Six more months of the same committee, counted from the day after its current end. */
function extend(term, months = MONTHS) {
  const end = parse(term.end) || today();
  return ymd(addDays(addMonths(addDays(end, 1), Math.max(1, Number(months) || MONTHS)), -1));
}

/** Which committee is newer: "Winter 2027" > "Summer 2026". */
const rank = (label = '') => (Number((String(label).match(/(20\d{2})/) || [])[1]) || 0) * 2 + (/winter/i.test(label) ? 1 : 0);

module.exports = { MONTHS, termFor, extend, rank, named, today: () => ymd(today()) };
