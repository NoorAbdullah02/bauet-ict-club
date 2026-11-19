// Display order of posts on the Team page (lower number = earlier/higher ranking).
// Multi-person support: Every post can have multiple members per session (e.g. multiple Joint Secretaries,
// Organizing Secretaries, Financial Secretaries, Executive Members, Ambassadors, etc.) as designated by the admin.
const ORDER = [
  /^President$/i,
  /^Vice President[- ]Administrative/i,
  /^Vice President[- ]Technical/i,
  /^(Vice President|VP)\b/i,
  /^General Secretary$/i,
  /^General Secretary\s*(II|2)?$/i,
  /^Joint Secretary/i,
  /^Organizing Secretary/i,
  /^Assistant General Secretary|^Asst\. General Secretary/i,
  /^Assistant Joint Secretary/i,
  /^Office Secretary[- ]Resource Management/i,
  /^Office Secretary[- ]Event Management/i,
  /^Office Secretary/i,
  /^IT Secretary[- ]Design & Creativity/i,
  /^Publicity Secretary[- ]Outreach Activation/i,
  /^Publicity Secretary[- ]Social Media Management/i,
  /^Publicity Secretary/i,
  /^Financial Secretary|^Treasurer/i,
  /^IT Secretary[- ]Webmaster/i,
  /^IT Secretary/i,
  /Secretary/i,
  /^Department Ambassador/i,
  /^Executive Member[- ]Logistics/i,
  /^Executive Member[- ]Event Management/i,
  /^Executive Member[- ]\s*Social Media Management/i,
  /^Executive Member[- ]\s*Outreach Activation/i,
  /^Executive Member[- ]Documentation/i,
  /^Executive Member[- ]\s*Media & Communication/i,
  /^Executive Member[- ]\s*Skill Development/i,
  /^Executive Member[- ]IT & Gaming/i,
  /^Executive Member[- ]\s*Gaming/i,
  /^Executive Member[- ]Cultural Activities/i,
  /^Executive Member[- ]Design & Creativity/i,
  /^Executive Member[- ]Human Resources/i,
  /^Executive Member/i,
  /^Chief Executive/i,
  /^Executive/i,
];

function positionRank(position = '') {
  const pos = String(position || '').trim();
  const i = ORDER.findIndex((re) => re.test(pos));
  return (i === -1 ? ORDER.length : i) + 1;
}

const isPresident = (position = '') => /^President$/i.test(String(position || '').trim());
const isVP = (position = '') => /^(Vice President|VP)\b/i.test(String(position || '').trim());

/** Resolves true when the session already has a (non-deleted) President other than `exceptId`. */
async function sessionHasPresident(pool, session, exceptId = null) {
  const { rows } = await pool.query(
    "SELECT id FROM members WHERE committee_session = $1 AND deleted_at IS NULL AND position = 'President'",
    [session]
  );
  return rows.some((r) => String(r.id) !== String(exceptId));
}

/**
 * Returns an error message when adding `position` to `session` conflicts, else null.
 * Updated to allow multiple persons per post across all executive & ambassador posts
 * as requested (admin has full authority to select multiple persons for the same position).
 */
async function leadershipConflict(pool, session, position, exceptId = null) {
  // Allows multiple persons per post across all ranks (President, VP, Secretaries, Ambassadors, Executives)
  return null;
}

module.exports = { positionRank, isPresident, isVP, sessionHasPresident, leadershipConflict };
