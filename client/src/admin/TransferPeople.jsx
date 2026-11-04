import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowRightLeft, Loader2 } from 'lucide-react';
import Select from '../components/Select';
import useStore from '../context/store';
import { Drawer, inputCls } from './ui';
import { sessionRank } from '../lib/sessions';
import { cn } from '../lib/cn';

/** Copy or move people from one committee into another (a new semester, or to fix a mistake). */
export default function TransferPeople({ open, onClose, initialFrom = '' }) {
  const sessions = useStore((s) => s.sessions);
  const members = useStore((s) => s.members);
  const transfer = useStore((s) => s.transferPeople);
  const ordered = useMemo(() => [...sessions].filter((s) => s.members > 0).sort((a, b) => sessionRank(b.label) - sessionRank(a.label)), [sessions]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [mode, setMode] = useState('copy');
  const [picked, setPicked] = useState(() => new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (open && initialFrom) setFrom(initialFrom); else if (open && !from && ordered[0]) setFrom(ordered[0].label); }, [open, ordered, from, initialFrom]);
  useEffect(() => { setPicked(new Set()); }, [from]);

  const people = useMemo(() => members.filter((m) => m.committee_session === from).sort((a, b) => (a.display_order ?? 99) - (b.display_order ?? 99)), [members, from]);
  const all = people.length > 0 && people.every((m) => picked.has(m.id));
  const toggle = (id) => setPicked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const suggestion = useMemo(() => {
    const m = /^(Summer|Winter)\s+(\d{4})/i.exec(from);
    if (!m) return '';
    return /summer/i.test(m[1]) ? `Winter ${m[2]}` : `Summer ${Number(m[2]) + 1}`;
  }, [from]);

  const submit = async () => {
    setBusy(true);
    try {
      const r = await transfer({ ids: [...picked], toSession: to.trim(), mode });
      toast.success(`${r.transferred} ${mode === 'move' ? 'moved' : 'copied'} to ${r.toSession}${r.skipped.length ? ` · ${r.skipped.length} skipped` : ''}`);
      if (r.skipped.length) toast(r.skipped.slice(0, 3).map((s) => `${s.name}: ${s.reason}`).join('\n'), { duration: 7000 });
      setPicked(new Set());
      if (r.transferred) onClose();
    } catch (e) { toast.error(e.response?.data?.error || 'Could not transfer'); }
    setBusy(false);
  };

  return (
    <Drawer open={open} title="Transfer people" onClose={onClose}
      footer={<><button onClick={onClose} className="btn-outline !px-5 !py-2.5 text-xs">Cancel</button>
        <button onClick={submit} disabled={busy || !picked.size || to.trim().length < 6} className="btn-primary !px-5 !py-2.5 text-xs disabled:opacity-60">{busy ? <Loader2 size={14} className="animate-spin" /> : <ArrowRightLeft size={14} />} {mode === 'move' ? 'Move' : 'Copy'} {picked.size || ''} to {to.trim() || '…'}</button></>}>
      <p className="mb-5 text-sm leading-6 text-fg2">Tick the people to carry over, then type the committee they should join. A new semester name such as <b>Winter 2027</b> is created automatically. The President and Vice President limits still apply.</p>

      <label className="block"><span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-fg2">From committee</span>
        <Select className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)}>{ordered.map((s) => <option key={s.label} value={s.label}>{s.label} · {s.members} people</option>)}</Select></label>

      <label className="mt-4 block"><span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-fg2">To committee</span>
        <input list="transfer-sessions" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} placeholder={suggestion || 'e.g. Winter 2027'} />
        <datalist id="transfer-sessions">{[suggestion, ...sessions.map((s) => s.label)].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i && v !== from).map((v) => <option key={v} value={v} />)}</datalist></label>
      {suggestion && !to && <button type="button" onClick={() => setTo(suggestion)} className="mt-2 text-xs font-semibold text-tech">Use {suggestion}</button>}

      <div className="mt-5 flex gap-2">
        {[['copy', 'Copy', 'Keep them in the old committee too'], ['move', 'Move', 'Take them out of the old committee']].map(([k, t, d]) => (
          <button key={k} type="button" onClick={() => setMode(k)} aria-pressed={mode === k} className={cn('flex-1 rounded-2xl border p-3 text-left transition', mode === k ? 'border-accent bg-accent/8' : 'border-line hover:border-muted')}>
            <div className="text-sm font-semibold text-fg">{t}</div><div className="text-xs text-fg2">{d}</div>
          </button>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg2">People ({picked.size} of {people.length})</span>
        <button type="button" onClick={() => setPicked(all ? new Set() : new Set(people.map((m) => m.id)))} className="text-xs font-semibold text-tech">{all ? 'Clear' : 'Select all'}</button>
      </div>
      <div className="mt-2 space-y-1.5">
        {people.map((m) => (
          <label key={m.id} className={cn('flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition', picked.has(m.id) ? 'border-accent bg-accent/8' : 'border-line hover:border-muted')}>
            <input type="checkbox" checked={picked.has(m.id)} onChange={() => toggle(m.id)} className="size-4 accent-[#1F4FD8]" />
            <span className="min-w-0 flex-1"><b className="block truncate text-fg">{m.name}</b><span className="block truncate text-xs text-fg2">{m.position}</span></span>
          </label>
        ))}
        {!people.length && <p className="text-sm text-muted">Pick a committee that has people.</p>}
      </div>
    </Drawer>
  );
}
