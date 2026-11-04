// Display order of posts on the Team page (lower = earlier).
// Per session: one President and two Vice Presidents (one Technical, one Administration). Every other post can have several people.
const ORDER = [
  /^President$/i,
  /^(Vice President|VP) \(Technical\)$/i,
  /^(Vice President|VP) \(Administration\)$/i,
  /^(Vice President|VP)\b/i,
  /^General Secretary$/i,
  /^Assistant General Secretary|^Asst\. General Secretary/i,
  /^Joint Secretary/i,
  /^Assistant Joint Secretary/i,
  /^Organizing Secretary/i,
  /^Treasurer|^Financial Secretary/i,
  /Secretary/i,
  /^Chief Executive/i,
  /^Executive/i,
];

function positionRank(position = '') {
  const i = ORDER.findIndex((re) => re.test(position));
  return (i === -1 ? ORDER.length : i) + 1;
}

const isPresident = (position = '') => /^President$/i.test(position.trim());

/** Resolves true when the session already has a (non-deleted) President other than `exceptId`. */
async function sessionHasPresident(pool, session, exceptId = null) {
  const { rows } = await pool.query(
    "SELECT id FROM members WHERE committee_session = $1 AND deleted_at IS NULL AND position = 'President'",
    [session]
  );
  return rows.some((r) => String(r.id) !== String(exceptId));
}

const isVP = (position = '') => /^(Vice President|VP)\b/i.test(position.trim());

/** Returns an error message when adding `position` to `session` would break the President / Vice President limits, else null. */
async function leadershipConflict(pool, session, position, exceptId = null) {
  if (!session || !position) return null;
  const pos = position.trim();
  if (!isPresident(pos) && !isVP(pos)) return null;
  const { rows } = await pool.query(
    'SELECT id, position FROM members WHERE committee_session = $1 AND deleted_at IS NULL', [session]
  );
  const others = rows.filter((r) => String(r.id) !== String(exceptId)).map((r) => r.position || '');
  if (isPresident(pos)) {
    return others.some(isPresident) ? `${session} already has a President. Only one President is allowed per session.` : null;
  }
  const vps = others.filter(isVP);
  if (vps.length >= 2) return `${session} already has 2 Vice Presidents (Technical and Administration).`;
  for (const kind of ['Technical', 'Administration']) {
    const re = new RegExp(kind, 'i');
    if (re.test(pos) && vps.some((v) => re.test(v))) return `${session} already has a Vice President (${kind}).`;
  }
  return null;
}

module.exports = { positionRank, isPresident, isVP, sessionHasPresident, leadershipConflict };
