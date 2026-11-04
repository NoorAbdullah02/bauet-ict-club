/** Start time of an event from its date (YYYY-MM-DD) and a free-text time such as "09:00 AM", "3 PM" or "15:30". */
export function eventStart(e) {
  const m = String(e?.date || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  let h = 9, min = 0;
  const t = String(e?.time || '').match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (t) {
    h = Number(t[1]); min = Number(t[2] || 0);
    const ap = (t[3] || '').toLowerCase();
    if (ap === 'pm' && h < 12) h += 12;
    if (ap === 'am' && h === 12) h = 0;
  }
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), h, min);
}

const stamp = (d) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}00`;
const esc = (s = '') => String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, (c) => `\\${c}`);

/** Downloads an .ics file that opens in Google/Apple/Outlook calendar. */
export function downloadIcs(e) {
  const start = eventStart(e);
  if (!start) return;
  const end = new Date(start.getTime() + 2 * 3600 * 1000);
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//BAUET ICT Club//Events//EN', 'BEGIN:VEVENT',
    `UID:event-${e.id || start.getTime()}@bauet-ict-club`, `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`, `SUMMARY:${esc(e.title)}`,
    `LOCATION:${esc(e.location || 'BAUET, Rajshahi')}`, `DESCRIPTION:${esc(e.description || '')}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = `${String(e.title || 'event').replace(/[^\w]+/g, '-').toLowerCase()}.ics`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
