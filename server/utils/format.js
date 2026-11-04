// Dates and times as people write them: "19 December 2026", "2:00 PM". Used in emails and the AI assistant.
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function formalDate(v) {
  const value = v instanceof Date ? v.toISOString() : String(v ?? '');
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m || !MONTHS[Number(m[2]) - 1]) return value;
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

function formalTime(v) {
  const s = String(v ?? '').trim();
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*([ap]\.?m\.?)?$/i);
  if (!m) return s;
  let h = Number(m[1]); const min = m[2] || '00';
  let ap = (m[3] || '').replace(/\./g, '').toUpperCase();
  if (!ap) { ap = h >= 12 ? 'PM' : 'AM'; if (h > 12) h -= 12; if (h === 0) h = 12; } else if (h === 0) h = 12;
  if (h > 12 || Number(min) > 59) return s;
  return `${h}:${min} ${ap}`;
}

module.exports = { formalDate, formalTime };
