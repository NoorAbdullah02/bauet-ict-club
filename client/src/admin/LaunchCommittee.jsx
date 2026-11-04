import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Rocket, Loader2, CalendarPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useStore from '../context/store';
import { Drawer, inputCls } from './ui';
import { sessionRank } from '../lib/sessions';
import { cn } from '../lib/cn';

const SCOPES = [
  ['none', 'Start empty', 'Add people later from Applications → Select for session.'],
  ['leaders', 'Keep the leadership', 'Copy the President and Vice Presidents.'],
  ['all', 'Copy everyone', 'Start from the previous committee and edit.'],
];

export default function LaunchCommittee({ open, onClose }) {
  const sessions = useStore((s) => s.sessions);
  const launch = useStore((s) => s.launchCommittee);
  const navigate = useNavigate();
  const now = new Date();
  const [term, setTerm] = useState(now.getMonth() < 6 ? 'Summer' : 'Winter');
  const [year, setYear] = useState(now.getFullYear());
  const [scope, setScope] = useState('leaders');
  const [from, setFrom] = useState('');
  const [busy, setBusy] = useState(false);

  const label = `${term} ${year}`;
  const ordered = useMemo(() => [...sessions].filter((s) => s.members > 0).sort((a, b) => sessionRank(b.label) - sessionRank(a.label)), [sessions]);
  const source = from || ordered[0]?.label || '';
  const exists = sessions.some((s) => s.label.toLowerCase() === label.toLowerCase());

  const submit = async () => {
    setBusy(true);
    try {
      const r = await launch({ session: label, copyFrom: source, scope: source ? scope : 'none' });
      toast.success(`${label} committee launched${r.copied ? ` · ${r.copied} copied` : ''}`);
      onClose();
      if (!r.copied) navigate('/admin/applications');
    } catch (e) { toast.error(e.response?.data?.error || 'Could not launch the committee'); }
    setBusy(false);
  };

  return (
    <Drawer open={open} title="Launch a new committee" onClose={onClose}
      footer={<><button onClick={onClose} className="btn-outline !px-5 !py-2.5 text-xs">Cancel</button>
        <button onClick={submit} disabled={busy || exists || !year} className="btn-primary !px-5 !py-2.5 text-xs disabled:opacity-60">{busy ? <Loader2 size={14} className="animate-spin" /> : <Rocket size={14} />} Launch {label}</button></>}>
      <div className="mb-6 flex items-center gap-4 rounded-3xl p-5 text-white" style={{ background: 'linear-gradient(120deg,#0A1A4A,#1F4FD8)' }}>
        <span className="grid size-12 place-items-center rounded-2xl bg-white/15"><CalendarPlus size={22} /></span>
        <div><div className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/60">New semester</div><div className="font-display text-2xl">{label}</div></div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="block"><span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-fg2">Semester</span>
          <select className={inputCls} value={term} onChange={(e) => setTerm(e.target.value)}><option>Summer</option><option>Winter</option></select></label>
        <label className="block"><span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-fg2">Year</span>
          <input className={inputCls} type="number" min="2019" max="2100" value={year} onChange={(e) => setYear(Number(e.target.value))} /></label>
      </div>
      {exists && <p className="mt-2 text-xs text-red-500">{label} already exists — pick another semester.</p>}

      <div className="mt-7">
        <span className="mb-2.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-fg2">Start from</span>
        <div className="space-y-2.5">
          {SCOPES.map(([k, t, d]) => (
            <button key={k} type="button" onClick={() => setScope(k)} aria-pressed={scope === k}
              className={cn('w-full rounded-2xl border p-4 text-left transition', scope === k ? 'border-accent bg-accent/8' : 'border-line hover:border-muted')}>
              <div className="flex items-center gap-2.5"><span className={cn('grid size-4 place-items-center rounded-full border-2', scope === k ? 'border-accent' : 'border-line')}>{scope === k && <span className="size-2 rounded-full bg-accent" />}</span><span className="font-semibold text-fg">{t}</span></div>
              <p className="mt-1 pl-[26px] text-xs text-fg2">{d}</p>
            </button>
          ))}
        </div>
        {scope !== 'none' && ordered.length > 0 && (
          <label className="mt-4 block"><span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-fg2">Copy from</span>
            <select className={inputCls} value={source} onChange={(e) => setFrom(e.target.value)}>{ordered.map((s) => <option key={s.label} value={s.label}>{s.label} · {s.members} people</option>)}</select></label>
        )}
      </div>
      <p className="mt-6 text-xs leading-6 text-muted">The newest semester becomes the “current committee” on the Home and Team pages automatically.</p>
    </Drawer>
  );
}
