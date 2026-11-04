// "Summer 2026" > "Winter 2025" > "Session 2023-24": newest first
export function sessionRank(label = '') {
  const year = Number((label.match(/(20\d{2})/) || [])[1] || 0);
  return year * 2 + (/winter/i.test(label) ? 1 : 0);
}

export const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const isAmbassador = (position = '') => /^Department Ambassador/i.test(position);

// Vice Presidents: Administration first, then Technical, then any other VP
export const vpRank = (position = '') => (/Administration/i.test(position) ? 0 : /Technical/i.test(position) ? 1 : 2);
export const leaderRank = (position = '') => (/^President/i.test(position) ? -1 : vpRank(position));
