import { useEffect, useMemo, useState } from 'react';
import { formalDate, formalTime } from '../lib/format';
import { useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Search, Loader2, Save, Rocket, ArrowRightLeft, Link2, Users, ClipboardList, ScanLine } from 'lucide-react';
import useStore from '../context/store';
import { TYPES } from './config';
import LaunchCommittee from './LaunchCommittee';
import TransferPeople from './TransferPeople';
import CommitteeOverview from './CommitteeOverview';
import EventRegistrations from './EventRegistrations';
import { copyText, shortLink } from '../lib/share';
import { sessionRank } from '../lib/sessions';
import { postState, whenLabel } from '../lib/schedule';
import ContestTeams from './ContestTeams';
import { Panel, PageTitle, Drawer, FormField, inputCls, askConfirm, toastTrashed } from './ui';

/** Which Cloudinary folder a picture goes to: a committee's own folder for people, otherwise the section and year. */
const AREA = { members: 'committees', events: 'events', gallery: 'gallery', posts: 'posts', projects: 'projects', notices: 'notices', achievements: 'achievements', sponsors: 'branding' };
const uploadWhere = (type, form) => ({
  area: AREA[type] || 'misc',
  scope: type === 'members' ? (form.committee_session || '') : String(form.date || new Date().toISOString()).slice(0, 4),
});

export default function DataView({ type }) {
  const cfg = TYPES[type];
  const store = useStore.getState();
  const items = useStore((s) => s[type]) || [];
  const [q, setQ] = useState('');
  const [drawer, setDrawer] = useState(null);
  const [params, setParams] = useSearchParams();
  const [launching, setLaunching] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [transferFrom, setTransferFrom] = useState('');
  const [regEvent, setRegEvent] = useState(null);
  const [contestTeams, setContestTeams] = useState(null);
  const navigate = useNavigate();
  const sessions = useStore((s) => s.sessions);
  const fields = useMemo(() => cfg.fields.map((f) => (f.dynamic === 'sessions' ? { ...f, options: sessions.map((x) => x.label).sort((a, b) => sessionRank(b) - sessionRank(a)) } : f)), [cfg, sessions]);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { useStore.getState().fetchList(type).catch(() => {}); if (type === 'members') useStore.getState().fetchSessions().catch(() => {}); setQ(''); }, [type]);

  const rows = useMemo(() => items.filter((i) => !q || JSON.stringify(i).toLowerCase().includes(q.toLowerCase())), [items, q]);

  const today = new Date().toISOString().slice(0, 10);
  const openAdd = () => {
    if (type === 'events') { navigate('/admin/events/new'); return; } // events get their own full page: details and registration form together
    setForm({ ...(cfg.fields.some((f) => f.key === 'date') ? { date: today } : {}), ...(type === 'events' ? { reg_open: true } : {}) }); setDrawer({ mode: 'add' }); };

  // dashboard shortcuts (…/notices?new=1) open the form straight away
  useEffect(() => {
    if (params.get('new') === '1') { openAdd(); setParams({}, { replace: true }); }
  }, [params, type]);
  const openEdit = (item) => { setForm({ ...item }); setDrawer({ mode: 'edit', id: item.id }); };

  const save = async () => {
    const missing = fields.find((f) => f.required && !form[f.key]);
    if (missing) return toast.error(`${missing.label} is required`);
    setSaving(true);
    try {
      const body = Object.fromEntries(fields.map((f) => [f.key, form[f.key] ?? (f.type === 'checkbox' || f.type === 'hidden' ? false : '')]));
      if (drawer.mode === 'add') await store.addItem(type, body); else await store.updateItem(type, drawer.id, body);
      toast.success(drawer.mode === 'add' ? 'Added' : 'Saved');
      setDrawer(null);
    } catch (e) { toast.error(e.response?.data?.error || e.message); }
    setSaving(false);
  };

  const remove = async (item) => {
    const name = item.title || item.name || cfg.name.toLowerCase();
    const ok = await askConfirm({ title: `Delete this ${cfg.name.toLowerCase()}?`, message: `“${String(name).slice(0, 60)}” will be moved to the Trash. You can restore it for 30 days.`, confirmText: 'Move to Trash', danger: true });
    if (!ok) return;
    try {
      await useStore.getState().deleteItem(type, item.id);
      toastTrashed(cfg.name, async () => { await useStore.getState().restoreTrash(type, item.id); });
    } catch (e) { toast.error(e.response?.data?.error || 'Could not delete'); }
  };

  /** edit, delete and the shortcuts of each row: the same buttons in the table and in the phone list */
  const actions = (item) => (
    <div className="flex flex-wrap justify-end gap-1.5">
      {type === 'events' && <button onClick={async () => toast[(await copyText(await shortLink(`/events/${item.id}`))) ? 'success' : 'error']('Short registration link copied')} aria-label="Copy registration link" title="Copy registration link" className="grid size-8 place-items-center rounded-lg text-fg2 hover:bg-tech/15 hover:text-tech"><Link2 size={14} /></button>}
      {type === 'events' && <button onClick={() => navigate(`/admin/events/${item.id}/checkin`)} aria-label="Check-in desk" title="Check-in desk: scan tickets, certificates" className="grid size-8 place-items-center rounded-lg text-fg2 hover:bg-tech/15 hover:text-tech"><ScanLine size={14} /></button>}
      {type === 'events' && !item.reg_url && <button onClick={() => navigate(`/admin/events/${item.id}/form`)} aria-label="Edit registration form" title="Build the registration form" className="grid size-8 place-items-center rounded-lg text-fg2 hover:bg-tech/15 hover:text-tech"><ClipboardList size={14} /></button>}
      {type === 'contests' && <button onClick={() => setContestTeams(item)} aria-label="Teams and results" title="Teams and results" className="grid size-8 place-items-center rounded-lg text-fg2 hover:bg-tech/15 hover:text-tech"><Users size={14} /></button>}
      {type === 'events' && <button onClick={() => setRegEvent(item)} aria-label="See registrations" title="See who registered" className="grid size-8 place-items-center rounded-lg text-fg2 hover:bg-tech/15 hover:text-tech"><Users size={14} /></button>}
      <button onClick={() => openEdit(item)} aria-label="Edit" className="grid size-8 place-items-center rounded-lg text-fg2 hover:bg-tech/15 hover:text-tech"><Pencil size={14} /></button>
      <button onClick={() => remove(item)} aria-label="Delete" className="grid size-8 place-items-center rounded-lg text-fg2 hover:bg-red-500/15 hover:text-red-500"><Trash2 size={14} /></button>
                    
    </div>
  );

  /** short text under the title in the phone list: the other columns */
  const summary = (item) => cfg.cols.slice(1).map((c) => {
    const v = item[c];
    if (typeof v === 'boolean') return v ? c.replace('_', ' ') : null;
    if (v === null || v === undefined || v === '') return null;
    return /^\d{4}-\d{2}-\d{2}/.test(String(v)) ? formalDate(v, { short: true }) : c === 'time' ? formalTime(v) : String(v).slice(0, 40);
  }).filter(Boolean).join(' · ');

  return (
    <div>
      <PageTitle title={`${cfg.name}s`} sub={`${items.length} total`}>
        <div className="relative"><Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className={`${inputCls} !w-56 !rounded-full !py-2 pl-9`} /></div>
        {type === 'members' && <button onClick={() => setTransferring(true)} className="flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-xs font-semibold text-fg2 transition hover:border-tech hover:text-tech"><ArrowRightLeft size={14} /> Transfer people</button>}
        {type === 'members' && <button onClick={() => setLaunching(true)} className="flex items-center gap-2 rounded-full border border-accent px-5 py-2.5 text-xs font-semibold text-accent transition hover:bg-accent hover:text-white"><Rocket size={14} /> Launch new committee</button>}
        <button onClick={openAdd} className="btn-primary !px-5 !py-2.5 text-xs"><Plus size={15} /> Add {cfg.name}</button>
      </PageTitle>

      {type === 'members' && <CommitteeOverview onLaunch={() => setLaunching(true)} onTransfer={(label) => { setTransferFrom(label); setTransferring(true); }} onOpen={(label) => setQ(label)} />}

      <Panel className="overflow-hidden">
        {rows.length === 0 ? <p className="p-12 text-center text-sm text-muted">Nothing here yet.</p> : (
          <>
          <ul className="divide-y divide-line/60 md:hidden">
            {rows.map((item) => (
              <li key={item.id} className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  {postState(item) !== 'live' && <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${postState(item) === 'draft' ? 'bg-amber-500/15 text-amber-600' : 'bg-sky-500/15 text-sky-600'}`}>{postState(item) === 'draft' ? 'Draft' : `Goes live ${whenLabel(item.publish_at)}`}</span>}
                  <span className="font-medium text-fg">{String(item[cfg.cols[0]] ?? '')}</span>
                </div>
                {summary(item) && <div className="mt-1 text-xs text-fg2">{summary(item)}</div>}
                <div className="mt-3">{actions(item)}</div>
              </li>
            ))}
          </ul>
          <div className="overflow-x-auto max-md:hidden">
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b border-line bg-alt/60">
                {cfg.cols.map((c) => <th key={c} className="px-5 py-3.5 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted">{c.replace('_', ' ')}</th>)}
                <th className="px-5 py-3.5" />
              </tr></thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.id} className="border-b border-line/60 transition last:border-0 hover:bg-accent/5">
                    {cfg.cols.map((c, ci) => (
                      <td key={c} className={`max-w-xs truncate px-5 py-3.5 ${ci === 0 && type === 'events' ? 'min-w-64 ' : ''}${ci === 0 ? 'font-medium text-fg' : 'text-fg2'}`}>
                        {ci === 0 && postState(item) !== 'live' && <span className={`mr-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${postState(item) === 'draft' ? 'bg-amber-500/15 text-amber-600' : 'bg-sky-500/15 text-sky-600'}`}>{postState(item) === 'draft' ? 'Draft' : `Goes live ${whenLabel(item.publish_at)}`}</span>}
                        {ci === 0 && type === 'events' && (
                          <span className="mb-1 block whitespace-normal">{String(item[c] ?? '')}</span>
                        )}
                        {ci === 0 && type === 'events' && (
                          <span className="flex flex-wrap gap-1.5 whitespace-normal">
                            {!item.reg_url && <button onClick={() => navigate(`/admin/events/${item.id}/form`)} className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-[11px] font-semibold text-tech hover:bg-tech/10"><ClipboardList size={12} /> Registration form</button>}
                            <button onClick={() => setRegEvent(item)} className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-[11px] font-semibold text-tech hover:bg-tech/10"><Users size={12} /> Registrations</button>
                            <button onClick={() => navigate(`/admin/events/${item.id}/checkin`)} className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-[11px] font-semibold text-tech hover:bg-tech/10"><ScanLine size={12} /> Check-in</button>
                          </span>
                        )}
                        {!(ci === 0 && type === 'events') && (typeof item[c] === 'boolean' ? (item[c] ? <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs text-emerald-500">Yes</span> : '—') : (/^\d{4}-\d{2}-\d{2}/.test(String(item[c])) ? formalDate(item[c], { short: true }) : c === 'time' ? formalTime(item[c]) : String(item[c] ?? '—').slice(0, 80)))}
                      </td>
                    ))}
                    <td className="px-5 py-3.5">{actions(item)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </Panel>

      {type === 'events' && <EventRegistrations event={regEvent} onClose={() => setRegEvent(null)} />}
      {type === 'contests' && <ContestTeams contest={contestTeams} onClose={() => setContestTeams(null)} />}
      {type === 'members' && <LaunchCommittee open={launching} onClose={() => setLaunching(false)} />}
      {type === 'members' && <TransferPeople open={transferring} initialFrom={transferFrom} onClose={() => { setTransferring(false); setTransferFrom(''); }} />}
      <Drawer open={!!drawer} title={`${drawer?.mode === 'add' ? 'Add' : 'Edit'} ${cfg.name}`} onClose={() => setDrawer(null)}
        footer={<><button onClick={() => setDrawer(null)} className="btn-outline !px-5 !py-2.5 text-xs">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary !px-5 !py-2.5 text-xs disabled:opacity-60">{saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save</button></>}>
        {fields.map((f) => <FormField key={f.key} field={f} all={form} value={form[f.key]} upload={uploadWhere(type, form)} onChange={(k, v) => setForm((p) => ({ ...p, [k]: v }))} />)}
      </Drawer>
    </div>
  );
}
