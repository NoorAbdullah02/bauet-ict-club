// Display order of posts on the Team page (lower = earlier). Only the President is limited to one person.
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

module.exports = { positionRank, isPresident, sessionHasPresident };
