import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Crown, Users, Megaphone, Check, X, Trash2, Download, Loader2, UserCheck, Search } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import useStore from '../context/store';
import { cn } from '../lib/cn';

export const POSTS = [
  'President', 'Vice President', 'Vice President (Technical)', 'General Secretary', 'Assistant General Secretary',
  'Joint Secretary', 'Assistant Joint Secretary', 'Treasurer', 'Financial Secretary', 'Organizing Secretary',
  'Publicity Secretary (Outreach & Activation)', 'Publicity Secretary (Social Media Management)',
  'Office Secretary (Resource Management)', 'Office Secretary (Event Management)',
  'IT Secretary (Webmaster)', 'IT Secretary (Design & Creativity)',
  'Executive Member', 'Executive Member (Logistics)', 'Executive Member (Cultural Activities)',
  'Executive Member (Social Media Management)', 'Executive Member (Documentation)',
  'Executive Member (Event Management)', 'Executive Member (IT & Gaming)',
];

const STATUS_STYLE = {
  pending: 'bg-amber-500/15 text-amber-600',
  approved: 'bg-emerald-500/15 text-emerald-600',
  rejected: 'bg-red-500/15 text-red-600',
};

const csvCell = (v) => `"${String(Array.isArray(v) ? v.join('; ') : v ?? '').replace(/"/g, '""')}"`;

function exportCsv(rows, type) {
  const cols = ['full_name', 'student_id', 'batch', 'department', 'phone', 'email', 'gender', type === 'committee' ? 'post' : 'interests', 'experience', 'status', 'created_at'];
  const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = `${type}-applications.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function defaultSession() {
  const d = new Date();
  return `${d.getMonth() < 6 ? 'Summer' : 'Winter'} ${d.getFullYear()}`;
}

function Card({ r }) {
  const { setRegistrationStatus, deleteRegistration, selectRegistration } = useStore(useShallow((s) => ({ setRegistrationStatus: s.setRegistrationStatus, deleteRegistration: s.deleteRegistration, selectRegistration: s.selectRegistration })));
  const [picking, setPicking] = useState(false);
  const [session, setSession] = useState(defaultSession());
  const [position, setPosition] = useState(r.post || POSTS[0]);
  const [busy, setBusy] = useState(false);
  const sessionNames = [...new Set(useStore((st) => st.members).map((m) => m.committee_session).filter(Boolean))];

  const run = async (fn, ok) => {
    setBusy(true);
    try { await fn(); toast.success(ok); } catch (e) { toast.error(e.response?.data?.error || e.message); }
    setBusy(false);
  };

  const confirmSelect = () => run(async () => {
    await selectRegistration(r.id, { session: session.trim(), position, display_order: Math.max(1, POSTS.indexOf(position) + 1) });
    setPicking(false);
  }, `${r.full_name} selected as ${position}`);

  const inputCls = 'w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-tech';

  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex gap-4">
        <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-alt ring-1 ring-line">
          {r.photo_url ? <img loading="lazy" decoding="async" src={r.photo_url} alt={r.full_name} className="size-full object-cover" />
            : <div className="grid size-full place-items-center font-display text-lg text-muted">{r.full_name[0]}</div>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-display text-lg text-fg">{r.full_name}</h4>
            <span className={cn('rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider', STATUS_STYLE[r.status])}>{r.status}</span>
          </div>
          <p className="mt-0.5 text-xs text-muted">{r.department} · {r.batch}th batch · ID {r.student_id}</p>
          <p className="mt-0.5 break-all text-xs text-fg2">{r.email} · {r.phone}</p>
        </div>
      </div>

      {r.type !== 'general' ? (
        <p className="mt-3 text-sm text-fg2">Applied for <b className="text-fg">{r.post}</b></p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(r.interests || []).map((i) => <span key={i} className="rounded-full bg-tech/10 px-2.5 py-1 text-[11px] text-tech">{i}</span>)}
          {r.experience && <span className="rounded-full bg-alt px-2.5 py-1 text-[11px] text-fg2">{r.experience}</span>}
        </div>
      )}
      {r.note && <p className="mt-3 rounded-lg bg-alt p-3 text-xs leading-6 text-fg2">{r.note}</p>}

      {picking && (
        <div className="mt-4 grid gap-3 rounded-xl border border-accent/30 bg-accent/5 p-4 sm:grid-cols-2">
          <label className="text-xs text-fg2">Session
            <input list="session-list" className={cn(inputCls, 'mt-1')} value={session} onChange={(e) => setSession(e.target.value)} placeholder="e.g. Summer 2026" />
            <datalist id="session-list">{sessionNames.map((n) => <option key={n} value={n} />)}</datalist>
          </label>
          {r.type === 'committee' ? <label className="text-xs text-fg2">Post (President, VP, …)
            <select className={cn(inputCls, 'mt-1')} value={position} onChange={(e) => setPosition(e.target.value)}>
              {[...new Set([r.post, ...POSTS].filter(Boolean))].map((p) => <option key={p}>{p}</option>)}
            </select>
          </label> : <p className="self-end text-xs text-fg2">Listed as <b className="text-fg">{r.department} Ambassador</b> on the Ambassadors page.</p>}
          <div className="flex gap-2 sm:col-span-2">
            <button disabled={busy || !session.trim()} onClick={confirmSelect}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">
              {busy ? <Loader2 size={13} className="animate-spin" /> : <UserCheck size={13} />} Confirm & publish to Team
            </button>
            <button onClick={() => setPicking(false)} className="rounded-lg border border-line px-4 py-2 text-xs text-fg2">Cancel</button>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
        {r.type !== 'general' ? (
          <button disabled={busy} onClick={() => setPicking((p) => !p)}
            className="flex items-center gap-1.5 rounded-lg bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/20">
            {r.type === 'ambassador' ? <Megaphone size={13} /> : <Crown size={13} />} Select for session
          </button>
        ) : (
          <button disabled={busy || r.status === 'approved'} onClick={() => run(() => setRegistrationStatus(r.id, 'approved'), 'Approved')}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600 disabled:opacity-40">
            <Check size={13} /> Approve
          </button>
        )}
        <button disabled={busy || r.status === 'rejected'} onClick={() => run(() => setRegistrationStatus(r.id, 'rejected'), 'Rejected')}
          className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-600 disabled:opacity-40">
          <X size={13} /> Reject
        </button>
        <button disabled={busy} onClick={() => confirm(`Delete ${r.full_name}'s application?`) && run(() => deleteRegistration(r.id), 'Deleted')}
          className="ml-auto flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-600">
          <Trash2 size={13} /> Delete
        </button>
      </div>
    </div>
  );
}

export default function AdminApplications() {
  const { registrations, fetchRegistrations } = useStore(useShallow((s) => ({ registrations: s.registrations, fetchRegistrations: s.fetchRegistrations })));
  const [type, setType] = useState('committee');
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRegistrations().catch(() => toast.error('Could not load applications')).finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => registrations
    .filter((r) => r.type === type && (status === 'all' || r.status === status))
    .filter((r) => !q || `${r.full_name} ${r.email} ${r.student_id}`.toLowerCase().includes(q.toLowerCase())),
  [registrations, type, status, q]);

  const count = (t) => registrations.filter((r) => r.type === t).length;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-bold">Applications</h2>
        <button onClick={() => exportCsv(rows, type)} disabled={!rows.length}
          className="flex items-center gap-2 rounded-lg border border-line px-4 py-2 text-xs font-semibold text-fg2 hover:border-tech hover:text-tech disabled:opacity-40">
          <Download size={14} /> Export CSV
        </button>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        {[['committee', Crown, 'Committee'], ['ambassador', Megaphone, 'Ambassador'], ['general', Users, 'General']].map(([k, Icon, label]) => (
          <button key={k} onClick={() => setType(k)}
            className={cn('flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition',
              type === k ? 'border-accent bg-accent text-white' : 'border-line text-fg2 hover:border-accent')}>
            <Icon size={15} /> {label} <span className="rounded-full bg-black/10 px-2 text-xs">{count(k)}</span>
          </button>
        ))}
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-full border border-line bg-surface px-4 py-2 text-sm text-fg2">
          <option value="all">All status</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option>
        </select>
        <div className="relative min-w-48 flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, ID"
            className="w-full rounded-full border border-line bg-surface py-2 pl-9 pr-4 text-sm text-fg outline-none focus:border-tech" />
        </div>
      </div>

      {loading ? <Loader2 className="animate-spin text-muted" /> : rows.length === 0 ? (
        <p className="text-sm text-muted">No applications found.</p>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">{rows.map((r) => <Card key={r.id} r={r} />)}</div>
      )}
    </div>
  );
}
