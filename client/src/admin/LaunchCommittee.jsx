import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Rocket, Loader2, CalendarPlus, CalendarClock, AlertTriangle, Info, CheckCircle2, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Select from '../components/Select';
import useStore from '../context/store';
import { Drawer, inputCls } from './ui';
import { sessionRank, nextSessionLabel, termLeft } from '../lib/sessions';
import { formalDate } from '../lib/format';
import { cn } from '../lib/cn';

const SCOPES = [
  ['none', 'Start empty', 'Add people later from Applications → Select for session.'],
  ['leaders', 'Keep the leadership', 'Copy the President and Vice Presidents.'],
  ['all', 'Copy everyone', 'Start from the previous committee and edit.'],
];

const day = (iso) => (iso ? formalDate(iso, { short: true }) : '—');
const span = (a, b) => (a && b ? Math.round((new Date(`${b}T00:00:00Z`) - new Date(`${a}T00:00:00Z`)) / 864e5) + 1 : 0);

/**
 * The launch form. The server decides everything that matters: the dates the committee will get,
 * whether the name is taken, and whether a running committee makes this an early handover.
 */
export default function LaunchCommittee({ open, onClose }) {
  const sessions = useStore((s) => s.sessions);
  const launch = useStore((s) => s.launchCommittee);
  const askPlan = useStore((s) => s.planCommittee);
  const navigate = useNavigate();

  const current = useMemo(() => [...sessions].filter((s) => s.members > 0).sort((a, b) => sessionRank(b.label) - sessionRank(a.label))[0], [sessions]);
  const suggested = current ? nextSessionLabel(current.label) : '';
  const ordered = useMemo(() => [...sessions].filter((s) => s.members > 0).sort((a, b) => sessionRank(b.label) - sessionRank(a.label)), [sessions]);

  const [name, setName] = useState(suggested);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [scope, setScope] = useState('leaders');
  const [from, setFrom] = useState('');
  const [plan, setPlan] = useState(null);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState(false);
  const edited = useRef({ start: false, end: false }); // dates the admin typed win over the suggested ones

  const source = from || ordered[0]?.label || '';

  // a fresh form each time it opens
  useEffect(() => {
    if (!open) return;
    setName(suggested);
    setStart('');
    setEnd('');
    setFrom('');
    setScope('leaders');
    setPlan(null);
    setArmed(false);
    edited.current = { start: false, end: false };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ask the server for the dates and the rule as the name or a date changes
  useEffect(() => {
    if (!open) return undefined;
    const label = name.trim();
    if (label.length < 3) { setPlan(null); return undefined; }
    let alive = true;
    setChecking(true);
    const timer = setTimeout(() => {
      askPlan({ session: label, start: edited.current.start ? start : '', end: edited.current.end ? end : '' })
        .then((p) => {
          if (!alive) return;
          setPlan(p);
          setArmed(false);
          if (!edited.current.start && p.term?.start && p.term.start !== start) setStart(p.term.start);
          if (!edited.current.end && p.term?.end && p.term.end !== end) setEnd(p.term.end);
        })
        .catch((e) => { if (alive) setPlan({ error: e.response?.data?.error || 'Could not check this name' }); })
        .finally(() => { if (alive) setChecking(false); });
    }, 250);
    return () => { alive = false; clearTimeout(timer); setChecking(false); };
  }, [open, name, start, end, askPlan]);

  const edit = useCallback((field, value) => {
    edited.current[field] = true;
    if (field === 'start') setStart(value); else setEnd(value);
    setArmed(false);
  }, []);

  const ready = name.trim().length >= 3 && !plan?.error && !plan?.exists;
  const early = !!plan?.needs_confirm;
  const days = plan?.term ? span(plan.term.start, plan.term.end) : 0;

  const submit = async (force = false) => {
    if (early && !force) { setArmed(true); return; }
    setBusy(true);
    try {
      const r = await launch({ session: name.trim(), copyFrom: source, scope: source ? scope : 'none', start, end, force: early });
      toast.success(`${name.trim()} committee launched${r.copied ? ` · ${r.copied} copied` : ''}`);
      setArmed(false);
      onClose();
      if (!r.copied) navigate('/admin/applications');
    } catch (e) {
      const j = e.response?.data;
      if (j?.needs_confirm) setArmed(true);
      toast.error(j?.error || 'Could not launch the committee');
    }
    setBusy(false);
  };

  return (
    <Drawer open={open} title="Launch a new committee" onClose={onClose}
      footer={<>
        <button onClick={onClose} className="btn-outline !px-5 !py-2.5 text-xs">Cancel</button>
        <button onClick={() => submit(false)} disabled={busy || !ready} className={cn('!px-5 !py-2.5 text-xs disabled:opacity-50', armed ? 'btn-primary !bg-amber-500 hover:!bg-amber-600' : 'btn-primary')}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : armed ? <AlertTriangle size={14} /> : <Rocket size={14} />}
          {armed ? `Yes, hand over from ${plan?.current?.label}` : early ? 'Start the handover' : `Launch ${name.trim() || 'committee'}`}
        </button>
      </>}>

      <div className="mb-5 flex items-center gap-4 rounded-3xl p-5 text-white" style={{ background: 'linear-gradient(120deg,#0A1A4A,#1F4FD8)' }}>
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/15"><CalendarPlus size={22} /></span>
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/60">New committee · 6-month term</div>
          <div className="truncate font-display text-2xl">{name.trim() || 'Name your committee'}</div>
          <div className="mt-0.5 text-[11px] text-white/70">{plan?.term ? `${day(plan.term.start)} – ${day(plan.term.end)} · ${plan.term.months} months (${days} days)` : checking ? 'Checking the dates…' : 'Pick a name to see its dates'}</div>
        </div>
      </div>

      {current?.term && (
        <div className={cn('mb-5 rounded-2xl border p-4', early ? 'border-amber-400/60 bg-amber-500/8' : 'border-line bg-alt')}>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-fg2"><CalendarClock size={12} /> Running committee</div>
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
            <span className="text-sm font-semibold text-fg">{current.label}</span>
            <span className="text-xs text-fg2">{day(current.term.start)} – {day(current.term.end)} · {termLeft(current.term)}</span>
          </div>
          {early ? (
            <p className="mt-1.5 text-xs leading-5 text-amber-700 dark:text-amber-400">This is an early handover: its term has {termLeft(current.term)}. You can still go ahead — the old committee keeps its dates in the history and stays on the Team page.</p>
          ) : plan?.newer === false && plan?.term && plan.term.start < current.term.start ? (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs leading-5 text-fg2"><History size={12} /> Older than the running committee: it is added to the history, and {current.label} stays current.</p>
          ) : (
            <p className="mt-1.5 text-xs leading-5 text-fg2">Its term is over, or this committee runs alongside it — no confirmation needed.</p>
          )}
        </div>
      )}

      <div className="space-y-4">
        <label className="block">
          <span className="mb-1.5 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.14em] text-fg2">
            Committee name
            {suggested && suggested !== name.trim() && (
              <button type="button" onClick={() => setName(suggested)} className="font-sans text-[11px] font-semibold normal-case tracking-normal text-tech">Use {suggested}</button>
            )}
          </span>
          <input className={inputCls} value={name} onChange={(e) => { setName(e.target.value); setArmed(false); }} placeholder="Winter 2027 — or a name of your own" maxLength={50} autoComplete="off" />
          <p className="mt-1.5 text-[11px] text-muted">A semester name (Winter 2027) brings that semester's dates; any other name starts today.</p>
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block"><span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-fg2">First day</span>
            <input className={inputCls} type="date" value={start} onChange={(e) => edit('start', e.target.value)} /></label>
          <label className="block"><span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-fg2">Last day</span>
            <input className={inputCls} type="date" value={end} onChange={(e) => edit('end', e.target.value)} /></label>
        </div>
        <p className="-mt-2 flex items-center gap-1.5 text-[11px] text-muted"><Info size={12} /> Move either date and the length follows; the running committee's own dates never change.</p>

        {plan?.error && <p className="text-xs font-medium text-red-500">{plan.error}</p>}
        {plan?.exists && <p className="text-xs font-medium text-red-500">{name.trim()} already exists — open it from the list instead, or pick another name.</p>}
        {plan?.term && !plan.error && !plan.exists && (
          <p className="flex items-center gap-1.5 text-xs text-emerald-600"><CheckCircle2 size={13} /> {plan.term.months} months ({days} days){plan.term.expired ? ' · this term would already be over' : plan.term.started ? ` · ${termLeft(plan.term)}` : ` · starts ${day(plan.term.start)}`}</p>
        )}
      </div>

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
            <Select className={inputCls} value={source} onChange={(e) => setFrom(e.target.value)}>{ordered.map((s) => <option key={s.label} value={s.label}>{s.label} · {s.members} people</option>)}</Select></label>
        )}
      </div>

      {armed && (
        <div className="mt-5 rounded-2xl border border-amber-400/60 bg-amber-500/10 p-4 text-xs leading-6 text-amber-800 dark:text-amber-300">
          <b>One confirmation needed.</b> {plan?.current?.label} still has {termLeft(plan?.current?.term)}. Launching {name.trim()} now closes the handover today; both committees stay on the Team page as history.
        </div>
      )}

      <p className="mt-6 text-xs leading-6 text-muted">The newest semester becomes the “current committee” on the Home and Team pages automatically. You can change any committee's dates later from the Committee page.</p>
    </Drawer>
  );
}
