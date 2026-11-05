// Safe CSV cells. A value that starts with = + - @ (or a tab / carriage return) is run as a formula when the file is opened in Excel or
// Google Sheets, so a person could type "=HYPERLINK(...)" as their name and have it run on the admin's computer. A leading ' makes it plain text.
const FORMULA = /^[=+\-@\t\r]/;
function cell(v) {
  let s = Array.isArray(v) ? v.join('; ') : String(v ?? '');
  if (FORMULA.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}
/** rows of values -> CSV text with a UTF-8 BOM (so Excel shows Bangla correctly). */
const toCsv = (head, rows) => `﻿${[head.map(cell).join(','), ...rows.map((r) => r.map(cell).join(','))].join('\n')}`;
module.exports = { cell, toCsv };
