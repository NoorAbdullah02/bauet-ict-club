// Draft and scheduled posts. Times are Bangladesh time (UTC+6), whatever the computer's own time zone is.
const DHAKA_MS = 6 * 3600e3;
export const toDhakaInput = (iso) => { if (!iso) return ''; const t = new Date(iso).getTime(); return Number.isNaN(t) ? '' : new Date(t + DHAKA_MS).toISOString().slice(0, 16); };
export const fromDhakaInput = (local) => { if (!local) return ''; const t = new Date(`${local}:00+06:00`).getTime(); return Number.isNaN(t) ? '' : new Date(t).toISOString(); };
export const postState = (item) => (item?.is_draft ? 'draft' : item?.publish_at && new Date(item.publish_at).getTime() > Date.now() ? 'scheduled' : 'live');
export const whenLabel = (iso) => { const d = new Date(new Date(iso).getTime() + DHAKA_MS); return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)}`; };
