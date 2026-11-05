/** Postgres says "that is not a valid number / too long" (22P02, 22003, 22001): the caller sent a bad id or value, which is not a server fault. */
const isBadInput = (e) => ['22P02', '22003', '22001', '22007', '22008'].includes(e?.code) || /invalid input syntax|out of range|value too long/i.test(e?.message || '');

/** Log the real error on the server, send the client a generic message (never DB/driver details). */
function fail(res, e, status = 500) {
  if (isBadInput(e)) return res.status(404).json({ error: 'Not found' });
  console.error(`${res.req?.method || ''} ${res.req?.originalUrl || ''} failed:`, e?.message || e);
  res.status(status).json({ error: 'Something went wrong. Please try again.' });
}
module.exports = { fail, isBadInput };
