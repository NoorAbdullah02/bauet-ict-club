/** Log the real error on the server, send the client a generic message (never DB/driver details). */
function fail(res, e, status = 500) {
  console.error(`${res.req?.method || ''} ${res.req?.originalUrl || ''} failed:`, e?.message || e);
  res.status(status).json({ error: 'Something went wrong. Please try again.' });
}
module.exports = { fail };
