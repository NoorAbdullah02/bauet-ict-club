import Select from './Select';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Users, Megaphone, Check, X, Trash2, Download, Loader2, UserCheck, Search, FileText, FileType2, Mail, Phone, Hash, GraduationCap, Building2, User, CalendarDays, Sparkles, Briefcase, ExternalLink, Eye } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import useStore, { api } from '../context/store';
import { askConfirm, toastTrashed } from '../admin/ui';
import { cn } from '../lib/cn';

export const POSTS = [
  'President', 'Vice President (Administration)', 'Vice President (Technical)', 'General Secretary', 'Assistant General Secretary',
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

function Tile({ icon: Icon, label, children, wide }) {
  return (
    <div className={cn('flex gap-3 rounded-2xl border border-line bg-surface p-3.5', wide && 'sm:col-span-2')}>
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent"><Icon size={16} /></span>
      <div className="min-w-0"><div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">{label}</div><div className="mt-0.5 break-words text-sm font-medium text-fg">{children}</div></div>
    </div>
  );
}

/** Everything about one applicant in a pop-up, with the same actions as the card. */
function ApplicantModal({ r, onClose, onApprove, onReject, onTrash, onPick, busy }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  const typeName = { committee: 'Committee applicant', ambassador: 'Department ambassador', general: 'General member' }[r.type] || r.type;
  return createPortal(
    <div className="fixed inset-0 z-[350] grid place-items-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} className="absolute inset-0 bg-black/55 backdrop-blur-sm" />
      <motion.div role="dialog" aria-label={`${r.full_name} application`} initial={{ opacity: 0, y: 18, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-line bg-bg shadow-[var(--shadow-xl)]">
        <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 z-10 grid size-9 place-items-center rounded-full bg-black/30 text-white backdrop-blur hover:bg-black/50"><X size={18} /></button>
        <div className="overflow-y-auto">
          <div className="relative px-6 pb-6 pt-8 text-white" style={{ background: 'linear-gradient(120deg,#0A1A4A,#1F4FD8 70%,#17A2D8)' }}>
            <div className="flex flex-wrap items-center gap-5">
              <div className="size-28 shrink-0 overflow-hidden rounded-3xl bg-white/15 ring-4 ring-white/25">
                {r.photo_url ? <img src={r.photo_url} alt={r.full_name} className="size-full object-cover" />
                  : <div className="grid size-full place-items-center font-display text-4xl">{r.full_name[0]}</div>}
              </div>
              <div className="min-w-0 flex-1">
                <span className="inline-block rounded-full bg-white/15 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em]">{typeName}</span>
                <h3 className="mt-2 font-display text-3xl leading-tight">{r.full_name}</h3>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/80">
                  <span className={cn('rounded-full px-2.5 py-0.5 font-mono uppercase tracking-wider', r.status === 'approved' ? 'bg-emerald-400/90 text-emerald-950' : r.status === 'rejected' ? 'bg-red-400/90 text-red-950' : 'bg-amber-300 text-amber-950')}>{r.status}</span>
                  <span>{r.department} · {r.batch}th batch</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 p-6 sm:grid-cols-2">
            {r.post && <Tile icon={Briefcase} label="Post applied for" wide>{r.post}</Tile>}
            <Tile icon={Hash} label="Student ID">{r.student_id}</Tile>
            <Tile icon={Building2} label="Department">{r.department}</Tile>
            <Tile icon={GraduationCap} label="Batch">{r.batch}</Tile>
            {r.gender && <Tile icon={User} label="Gender">{r.gender}</Tile>}
            <Tile icon={Phone} label="Phone"><a href={`tel:${r.phone}`} className="hover:text-tech">{r.phone}</a></Tile>
            <Tile icon={Mail} label="Email"><a href={`mailto:${r.email}`} className="hover:text-tech">{r.email}</a></Tile>
            {(r.interests || []).length > 0 && (
              <Tile icon={Sparkles} label="Interests" wide>
                <span className="flex flex-wrap gap-1.5">{r.interests.map((i) => <span key={i} className="rounded-full bg-tech/10 px-2.5 py-1 text-xs text-tech">{i}</span>)}</span>
              </Tile>
            )}
            {r.experience && <Tile icon={Briefcase} label="Experience">{r.experience}</Tile>}
            <Tile icon={CalendarDays} label="Applied on">{r.created_at && new Date(r.created_at).toLocaleString()}</Tile>
            {r.note && <Tile icon={Mail} label="Note from the applicant" wide><span className="whitespace-pre-line font-normal leading-6 text-fg2">{r.note}</span></Tile>}
            {r.photo_url && <a href={r.photo_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs font-semibold text-tech sm:col-span-2"><ExternalLink size={13} /> Open full-size photo</a>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-line bg-surface px-6 py-4">
          {r.type !== 'general'
            ? <button disabled={busy} onClick={onPick} className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"><UserCheck size={14} /> Select for session</button>
            : <button disabled={busy || r.status === 'approved'} onClick={onApprove} className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"><Check size={14} /> Approve</button>}
          <button disabled={busy || r.status === 'rejected'} onClick={onReject} className="flex items-center gap-1.5 rounded-lg bg-amber-500/15 px-4 py-2 text-xs font-semibold text-amber-600 disabled:opacity-40"><X size={14} /> Reject</button>
          <button disabled={busy} onClick={onTrash} className="ml-auto flex items-center gap-1.5 rounded-lg bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-600"><Trash2 size={14} /> Trash</button>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}

function Card({ r, selected, onToggle }) {
  const { setRegistrationStatus, deleteRegistration, selectRegistration } = useStore(useShallow((s) => ({ setRegistrationStatus: s.setRegistrationStatus, deleteRegistration: s.deleteRegistration, selectRegistration: s.selectRegistration })));
  const [picking, setPicking] = useState(false);
  const [session, setSession] = useState(defaultSession());
  const [position, setPosition] = useState(r.post || POSTS[0]);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState(false);
  const sessionNames = useStore((st) => st.sessions).map((x) => x.label);

  const run = async (fn, ok) => {
    setBusy(true);
    try { await fn(); toast.success(ok); } catch (e) { toast.error(e.response?.data?.error || e.message); }
    setBusy(false);
  };

  const confirmSelect = async () => {
    const label = r.type === 'committee' ? position : 'Department Ambassador';
    if (!(await askConfirm({ title: `Select ${r.full_name}?`, message: `${r.full_name} will be published on the Team page as ${label} for ${session.trim()}, and gets a congratulations email.`, confirmText: 'Yes, select' }))) return;
    run(async () => {
      await selectRegistration(r.id, { session: session.trim(), position });
      setPicking(false); setView(false);
    }, `${r.full_name} selected as ${label}`);
  };
  const approve = async () => {
    if (!(await askConfirm({ title: `Approve ${r.full_name}?`, message: 'Their application will be marked as approved.', confirmText: 'Yes, approve' }))) return;
    run(() => setRegistrationStatus(r.id, 'approved'), 'Approved');
  };
  const reject = async () => {
    if (!(await askConfirm({ title: `Reject ${r.full_name}?`, message: 'They will receive a polite email saying the application was not accepted.', confirmText: 'Yes, reject', danger: true }))) return;
    run(() => setRegistrationStatus(r.id, 'rejected'), 'Rejected');
  };
  const trash = async () => {
    if (!(await askConfirm({ title: `Delete ${r.full_name}'s application?`, message: 'It will be moved to the Trash. You can restore it for 30 days.', confirmText: 'Move to Trash', danger: true }))) return;
    setBusy(true);
    try { await deleteRegistration(r.id); setView(false); toastTrashed('Application', () => useStore.getState().restoreTrash('registrations', r.id)); } catch (e) { toast.error(e.response?.data?.error || 'Could not delete'); }
    setBusy(false);
  };

  const inputCls = 'w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-tech';

  return (
    <div className={cn('relative rounded-2xl border bg-surface p-5 transition', selected ? 'border-accent ring-2 ring-accent/30' : 'border-line')}>
      <label className="absolute right-4 top-4 cursor-pointer" title="Select for bulk actions">
        <input type="checkbox" checked={selected} onChange={onToggle} aria-label={`Select ${r.full_name}`} className="size-4 cursor-pointer accent-[#1F4FD8]" />
      </label>
      <div className="flex gap-4 pr-6">
        <button type="button" onClick={() => setView(true)} aria-label={`View ${r.full_name}`} className="group relative size-16 shrink-0 overflow-hidden rounded-xl bg-alt ring-1 ring-line transition hover:ring-2 hover:ring-accent">
          {r.photo_url ? <img loading="lazy" decoding="async" src={r.photo_url} alt={r.full_name} className="size-full object-cover" />
            : <div className="grid size-full place-items-center font-display text-lg text-muted">{r.full_name[0]}</div>}
          <span className="absolute inset-0 grid place-items-center bg-[#0A1A4A]/55 text-white opacity-0 transition group-hover:opacity-100"><Eye size={18} /></span>
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-display text-lg text-fg"><button type="button" onClick={() => setView(true)} className="text-left hover:text-tech">{r.full_name}</button></h4>
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

      <button onClick={() => setView(true)} className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-tech"><Eye size={14} /> View all details</button>
      <AnimatePresence>{view && <ApplicantModal r={r} busy={busy} onClose={() => setView(false)} onApprove={approve} onReject={reject} onTrash={trash} onPick={() => { setView(false); setPicking(true); }} />}</AnimatePresence>

      {picking && (
        <div className="mt-4 grid gap-3 rounded-xl border border-accent/30 bg-accent/5 p-4 sm:grid-cols-2">
          <label className="text-xs text-fg2">Session
            <input list="session-list" className={cn(inputCls, 'mt-1')} value={session} onChange={(e) => setSession(e.target.value)} placeholder="e.g. Summer 2026" />
            <datalist id="session-list">{sessionNames.map((n) => <option key={n} value={n} />)}</datalist>
          </label>
          {r.type === 'committee' ? <label className="text-xs text-fg2">Post (President, VP, …)
            <Select className={cn(inputCls, 'mt-1')} value={position} onChange={(e) => setPosition(e.target.value)}>
              {[...new Set([r.post, ...POSTS].filter(Boolean))].map((p) => <option key={p}>{p}</option>)}
            </Select>
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
          <button disabled={busy || r.status === 'approved'} onClick={approve}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600 disabled:opacity-40">
            <Check size={13} /> Approve
          </button>
        )}
        <button disabled={busy || r.status === 'rejected'} onClick={reject}
          className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-600 disabled:opacity-40">
          <X size={13} /> Reject
        </button>
        <button disabled={busy} onClick={trash}
          className="ml-auto flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-600">
          <Trash2 size={13} /> Trash
        </button>
      </div>
    </div>
  );
}

/** Download the applications that match the current filters as a PDF or Word file. */
async function exportDoc(format, { type, status, q, ids }) {
  try {
    const { data } = await api.get('/registrations/export', { params: { format, type, status, q, ids: ids?.join(',') || undefined }, responseType: 'blob' });
    const url = URL.createObjectURL(data);
    const a = Object.assign(document.createElement('a'), { href: url, download: `applications-${type}-${new Date().toISOString().slice(0, 10)}.${format}` });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  } catch { toast.error('Could not export. Please try again.'); }
}

async function emailDoc(format, filters, to) {
  try {
    const { data } = await api.post('/registrations/export/email', { format, ...filters, to: to || undefined });
    toast.success(`Sent ${data.count} application${data.count === 1 ? '' : 's'} to ${data.to}`);
  } catch (e) { toast.error(e.response?.data?.error || 'Could not send the email'); }
}

export default function AdminApplications() {
  const { registrations, fetchRegistrations } = useStore(useShallow((s) => ({ registrations: s.registrations, fetchRegistrations: s.fetchRegistrations })));
  const [type, setType] = useState('committee');
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const [allTypes, setAllTypes] = useState(false);
  const [mailTo, setMailTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  useEffect(() => {
    fetchRegistrations().catch(() => toast.error('Could not load applications')).finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => registrations
    .filter((r) => r.type === type && (status === 'all' || r.status === status))
    .filter((r) => !q || `${r.full_name} ${r.email} ${r.student_id}`.toLowerCase().includes(q.toLowerCase())),
  [registrations, type, status, q]);

  const picked = useMemo(() => rows.filter((r) => sel.has(r.id)), [rows, sel]);
  const allPicked = rows.length > 0 && picked.length === rows.length;
  const toggle = (id) => setSel((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSel(allPicked ? new Set() : new Set(rows.map((r) => r.id)));
  useEffect(() => { setSel(new Set()); }, [type]);

  /** Run one action over every selected application, after a yes/no popup, and say how many worked. */
  const bulk = async (kind) => {
    const targets = kind === 'approve' ? picked.filter((r) => r.type === 'general' && r.status !== 'approved')
      : kind === 'reject' ? picked.filter((r) => r.status !== 'rejected') : picked;
    if (!targets.length) return toast('Nothing to change in the selected applications');
    const n = targets.length;
    const copy = {
      approve: { title: `Approve ${n} application${n === 1 ? '' : 's'}?`, message: 'They will be marked as approved.', confirmText: `Yes, approve ${n}` },
      reject: { title: `Reject ${n} application${n === 1 ? '' : 's'}?`, message: 'Each applicant gets a polite rejection email.', confirmText: `Yes, reject ${n}`, danger: true },
      trash: { title: `Move ${n} application${n === 1 ? '' : 's'} to Trash?`, message: 'You can restore them from the Trash for 30 days.', confirmText: `Move ${n} to Trash`, danger: true },
    }[kind];
    if (!(await askConfirm(copy))) return;
    setBulkBusy(true);
    const { setRegistrationStatus, deleteRegistration } = useStore.getState();
    let ok = 0;
    for (const r of targets) {
      try { await (kind === 'trash' ? deleteRegistration(r.id) : setRegistrationStatus(r.id, kind === 'approve' ? 'approved' : 'rejected')); ok += 1; } catch { /* counted below */ }
    }
    setBulkBusy(false);
    setSel(new Set());
    (ok === n ? toast.success : toast.error)(`${ok} of ${n} ${kind === 'trash' ? 'moved to Trash' : kind === 'approve' ? 'approved' : 'rejected'}`);
  };

  const count = (t) => registrations.filter((r) => r.type === t).length;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-bold">Applications</h2>
        <div className="flex flex-wrap items-center gap-2">
          <label className="mr-1 flex cursor-pointer items-center gap-2 text-xs text-fg2"><input type="checkbox" checked={allTypes} onChange={(e) => setAllTypes(e.target.checked)} className="accent-[#1F4FD8]" /> All types in PDF/Word</label>
          {[['PDF', FileText, () => exportDoc('pdf', { type: allTypes ? 'all' : type, status, q })], ['Word', FileType2, () => exportDoc('docx', { type: allTypes ? 'all' : type, status, q })], ['CSV', Download, () => exportCsv(rows, type)]].map(([label, Icon, fn]) => (
            <button key={label} onClick={fn} disabled={!rows.length}
              className="flex items-center gap-2 rounded-lg border border-line px-4 py-2 text-xs font-semibold text-fg2 hover:border-tech hover:text-tech disabled:opacity-40">
              <Icon size={14} /> Export {label}
            </button>
          ))}
        </div>
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
          <input type="email" value={mailTo} onChange={(e) => setMailTo(e.target.value)} placeholder="Email to (blank = admin email)" autoComplete="email"
            className="w-56 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-fg outline-none focus:border-tech" />
          {[['pdf', 'PDF'], ['docx', 'Word']].map(([f, label]) => (
            <button key={f} onClick={() => emailDoc(f, { type: allTypes ? 'all' : type, status, q }, mailTo.trim())} disabled={!rows.length}
              className="flex items-center gap-2 rounded-lg border border-line px-4 py-2 text-xs font-semibold text-fg2 hover:border-tech hover:text-tech disabled:opacity-40">
              <Mail size={14} /> Email {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        {[['committee', Crown, 'Committee'], ['ambassador', Megaphone, 'Ambassador'], ['general', Users, 'General']].map(([k, Icon, label]) => (
          <button key={k} onClick={() => setType(k)}
            className={cn('flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition',
              type === k ? 'border-accent bg-accent text-white' : 'border-line text-fg2 hover:border-accent')}>
            <Icon size={15} /> {label} <span className="rounded-full bg-black/10 px-2 text-xs">{count(k)}</span>
          </button>
        ))}
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-full border border-line bg-surface px-4 py-2 text-sm text-fg2">
          <option value="all">All status</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option>
        </Select>
        <div className="relative min-w-48 flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, ID"
            className="w-full rounded-full border border-line bg-surface py-2 pl-9 pr-4 text-sm text-fg outline-none focus:border-tech" />
        </div>
      </div>

      {rows.length > 0 && (
        <div className="sticky top-2 z-20 mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface/95 px-4 py-3 shadow-[var(--shadow-md)] backdrop-blur">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-fg2">
            <input type="checkbox" checked={allPicked} onChange={toggleAll} className="size-4 cursor-pointer accent-[#1F4FD8]" />
            {picked.length ? <b className="text-fg">{picked.length} selected</b> : `Select all (${rows.length})`}
          </label>
          {picked.length > 0 && (
            <>
              <span className="hidden h-5 w-px bg-line sm:block" />
              {type === 'general' && <button disabled={bulkBusy} onClick={() => bulk('approve')} className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600 disabled:opacity-40"><Check size={13} /> Approve</button>}
              <button disabled={bulkBusy} onClick={() => bulk('reject')} className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-600 disabled:opacity-40"><X size={13} /> Reject</button>
              <button disabled={bulkBusy} onClick={() => bulk('trash')} className="flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-600 disabled:opacity-40"><Trash2 size={13} /> Trash</button>
              <button onClick={() => exportDoc('pdf', { type, status, q, ids: picked.map((r) => r.id) })} className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-fg2 hover:border-tech hover:text-tech"><FileText size={13} /> PDF</button>
              <button onClick={() => exportDoc('docx', { type, status, q, ids: picked.map((r) => r.id) })} className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-fg2 hover:border-tech hover:text-tech"><FileType2 size={13} /> Word</button>
              <button onClick={() => emailDoc('pdf', { type, status, q, ids: picked.map((r) => r.id) }, mailTo.trim())} className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-fg2 hover:border-tech hover:text-tech"><Mail size={13} /> Email PDF</button>
              {bulkBusy && <Loader2 size={15} className="animate-spin text-muted" />}
              <button onClick={() => setSel(new Set())} className="ml-auto text-xs text-muted hover:text-fg">Clear</button>
            </>
          )}
        </div>
      )}

      {loading ? <Loader2 className="animate-spin text-muted" /> : rows.length === 0 ? (
        <p className="text-sm text-muted">No applications found.</p>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">{rows.map((r) => <Card key={r.id} r={r} selected={sel.has(r.id)} onToggle={() => toggle(r.id)} />)}</div>
      )}
    </div>
  );
}
