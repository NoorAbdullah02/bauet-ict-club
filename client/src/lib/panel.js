import { sessionRank, isAmbassador } from './sessions';

const isLeader = (p = '') => /^(Vice )?President/i.test(p);
const isCore = (p = '') => /Secretary|Treasurer/.test(p) && !/^Executive/.test(p);

/** The newest committee session (by label) with its leaders, core team and department ambassadors. */
export function latestPanel(members) {
  const withSession = members.filter((m) => m.committee_session && m.active !== false);
  const committee = withSession.filter((m) => !isAmbassador(m.position));
  const label = [...new Set(committee.map((m) => m.committee_session))].sort((a, b) => sessionRank(b) - sessionRank(a))[0];
  const inSession = committee.filter((m) => m.committee_session === label);
  const byOrder = (a, b) => (a.display_order ?? 99) - (b.display_order ?? 99);
  const leaders = inSession.filter((m) => isLeader(m.position)).sort(byOrder);
  const core = inSession.filter((m) => !isLeader(m.position) && isCore(m.position)).sort(byOrder);
  const chiefs = inSession.filter((m) => !isLeader(m.position) && !isCore(m.position) && /^Chief/.test(m.position)).sort(byOrder);

  const amb = withSession.filter((m) => isAmbassador(m.position));
  const ambLabel = [...new Set(amb.map((m) => m.committee_session))].sort((a, b) => sessionRank(b) - sessionRank(a))[0];
  return { label, leaders, core, chiefs, total: inSession.length, ambassadors: amb.filter((m) => m.committee_session === ambLabel), ambLabel };
}
