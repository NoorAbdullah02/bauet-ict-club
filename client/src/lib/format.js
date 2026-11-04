const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** "2026-12-19" or "2026-12-19T00:00:00.000Z" -> "19 December 2026" ({ weekday: true } adds "Saturday, "). Anything else is returned as it was. */
export function formalDate(v, { weekday = false, short = false } = {}) {
  const m = String(v ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return v ? String(v) : '';
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const month = MONTHS[mo - 1];
  if (!month) return String(v);
  const text = `${d} ${short ? month.slice(0, 3) : month} ${y}`;
  return weekday ? `${DAYS[new Date(Date.UTC(y, mo - 1, d)).getUTCDay()]}, ${text}` : text;
}

/** "02:00 PM", "2 pm", "14:30" or "9" -> "2:00 PM" style. Free text that is not a time is returned as it was. */
export function formalTime(v) {
  const s = String(v ?? '').trim();
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*([ap]\.?m\.?)?$/i);
  if (!m) return s;
  let h = Number(m[1]); const min = m[2] || '00';
  let ap = (m[3] || '').replace(/\./g, '').toUpperCase();
  if (!ap) { ap = h >= 12 ? 'PM' : 'AM'; if (h > 12) h -= 12; if (h === 0) h = 12; }
  else if (h === 0) h = 12;
  if (h > 12 || Number(min) > 59) return s;
  return `${h}:${min} ${ap}`;
}
