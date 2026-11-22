// "Summer 2026" > "Winter 2025" > "Session 2023-24": newest first
export function sessionRank(label = '') {
  const year = Number((label.match(/(20\d{2})/) || [])[1] || 0);
  return year * 2 + (/winter/i.test(label) ? 1 : 0);
}

/** "129 days left" (or "term finished") for a committee term that came from the server. */
export const termLeft = (t) => (t?.expired ? 'term finished' : `${t?.days_left ?? 0} day${t?.days_left === 1 ? '' : 's'} left`);

/** The committee that follows this one: Summer → Winter, Winter → next Summer. */
export function nextSessionLabel(label = '') {
  const year = Number((label.match(/(20\d{2})/) || [])[1]) || new Date().getFullYear();
  if (/winter/i.test(label)) return `Summer ${year + 1}`;
  if (/summer/i.test(label)) return `Winter ${year}`;
  return `Session ${year + 1}`;
}

export const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const isAmbassador = (position = '') => /^Department Ambassador/i.test(position);

// Vice Presidents: Administration first, then Technical, then any other VP
export const vpRank = (position = '') => (/Administration/i.test(position) ? 0 : /Technical/i.test(position) ? 1 : 2);
export const leaderRank = (position = '') => (/^President/i.test(position) ? -1 : vpRank(position));
