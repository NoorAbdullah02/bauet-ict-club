import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Rocket, ArrowRightLeft, Trash2, Users, CalendarPlus, UserPlus, ClipboardList, Star, CalendarClock, CalendarCheck, AlertTriangle, PlusCircle, CalendarRange, FileSpreadsheet, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import useStore from '../context/store';
import { sessionRank, termLeft } from '../lib/sessions';
import { Panel, Drawer, askConfirm, inputCls } from './ui';
import { cn } from '../lib/cn';
import { saveFile } from '../lib/download';
import { formalDate } from '../lib/format';

const STEPS = [
  [CalendarPlus, 'Launch', 'A committee serves six months. Launch the next one when the term ends.'],
  [ArrowRightLeft, 'Bring people', 'Copy the leaders, copy everyone, or use “Transfer people” to pick who continues.'],
  [ClipboardList, 'Select applicants', 'Applications → “Select for session” (they get an email, and you can change their post).'],
  [UserPlus, 'Add anyone', 'Someone who never applied? “Add Member” puts them straight into the committee.'],
];

const day = (iso) => (iso ? formalDate(iso, { short: true }) : '—');
/** Days covered by two ISO dates, last day included (0 when they are unusable). */
const spanDays = (a, b) => (a && b && b > a ? Math.round((new Date(`${b}T00:00:00Z`) - new Date(`${a}T00:00:00Z`)) / 864e5) + 1 : 0);

/** Every committee at a glance (newest first) with its six-month term, plus the four steps to start a new one. */
export default function CommitteeOverview({ onLaunch, onTransfer, onOpen }) {
  const sessions = useStore((s) => s.sessions);
  const remove = useStore((s) => s.deleteCommittee);
  const updateTerm = useStore((s) => s.updateCommitteeTerm);
  const [busy, setBusy] = useState('');
  const [dates, setDates] = useState(null); // { label, start, end } while the date editor is open
  const [saving, setSaving] = useState(false);
  const list = useMemo(() => [...sessions].sort((a, b) => sessionRank(b.label) - sessionRank(a.label)), [sessions]);
  const current = list.find((s) => s.members > 0);
  const t = current?.term;

  const extend = async (label) => {
    if (!(await askConfirm({ title: `Give ${label} six more months?`, message: 'The end date moves six months later; the committee, its people and its pictures stay exactly as they are.', confirmText: 'Extend 6 months' }))) return;
    setBusy(label);
    try { const r = await updateTerm(label, { months: 6 }); toast.success(`${label} now runs to ${day(r?.term?.end)}`); } catch (e) { toast.error(e.response?.data?.error || 'Could not extend the term'); }
    setBusy('');
  };

  const saveDates = async () => {
    if (!dates) return;
    setSaving(true);
    try {
      const r = await updateTerm(dates.label, { start: dates.start, end: dates.end });
      toast.success(`${dates.label} now runs ${day(r?.term?.start)} – ${day(r?.term?.end)}`);
      setDates(null);
    } catch (e) { toast.error(e.response?.data?.error || 'Could not save the dates'); }
    setSaving(false);
  };

  const del = async (s) => {
    if (!(await askConfirm({ title: `Delete the ${s.label} committee?`, message: `${s.members} ${s.members === 1 ? 'person goes' : 'people go'} to the Trash and can be restored for 20 days. Other committees and their pictures are not touched.`, confirmText: 'Move to Trash', danger: true }))) return;
    setBusy(s.label);
    try { const r = await remove(s.label); toast.success(`${s.label} moved to the Trash (${r.trashed} people)`); } catch (e) { toast.error(e.response?.data?.error || 'Could not delete'); }
    setBusy('');
  };

  const progress = t ? Math.min(100, Math.max(0, Math.round(((t.days_total - t.days_left) / t.days_total) * 100))) : 0;
  const editedDays = spanDays(dates?.start, dates?.end);

  return (
    <div className="mb-6 space-y-4">
      {current && t && (
        <Panel className={cn('overflow-hidden p-5 sm:p-6', t.expired && 'ring-1 ring-amber-400/50')}>
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-fg2"><CalendarClock size={12} /> Running committee</div>
              <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-display text-2xl text-fg">{current.label}</span>
                <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold', t.expired ? 'bg-amber-500/15 text-amber-600' : 'bg-emerald-500/12 text-emerald-600')}>
                  {t.expired ? <AlertTriangle size={12} /> : <CalendarCheck size={12} />} {termLeft(t)}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-fg2">Runs <b className="text-fg">{day(t.start)}</b> → <b className="text-fg">{day(t.end)}</b> · {t.months} month term</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={onLaunch} className="btn-primary !px-4 !py-2.5 text-xs"><Rocket size={14} /> {t.expired ? 'Launch the next committee' : 'Launch new committee'}</button>
              <button onClick={() => setDates({ label: current.label, start: t.start, end: t.end })} className="btn-outline !px-4 !py-2.5 text-xs"><CalendarRange size={14} /> Change dates</button>
              <button onClick={() => extend(current.label)} disabled={busy === current.label} className="btn-outline !px-4 !py-2.5 text-xs disabled:opacity-50"><PlusCircle size={14} /> Extend 6 months</button>
            </div>
          </div>
          <div className="mt-5">
            <div className="h-2 w-full overflow-hidden rounded-full bg-line"><div className={cn('h-full rounded-full transition-all', t.expired ? 'bg-amber-500' : 'bg-gradient-to-r from-emerald-500 to-tech')} style={{ width: `${t.expired ? 100 : progress}%` }} /></div>
            <div className="mt-1.5 flex justify-between font-mono text-[10px] uppercase tracking-wider text-muted"><span>{t.started ? 'In term' : `Starts ${day(t.start)}`}</span><span>{progress}% elapsed</span></div>
          </div>
          {t.expired && <p className="mt-3 rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">The {current.label} term ended on {day(t.end)}. Launch the next committee and bring the continuing people across — the old one stays on the Team page as history.</p>}
        </Panel>
      )}

      <div className="grid gap-3 md:grid-cols-4">
        {STEPS.map(([Icon, title, d], i) => (
          <Panel key={title} className="relative p-4">
            <span className="absolute right-3 top-3 font-display text-3xl text-line">{i + 1}</span>
            <span className="grid size-9 place-items-center rounded-xl bg-accent/10 text-accent"><Icon size={17} /></span>
            <div className="mt-3 text-sm font-semibold text-fg">{title}</div>
            <p className="mt-1 text-xs leading-5 text-fg2">{d}</p>
          </Panel>
        ))}
      </div>

      <Panel className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><h3 className="text-lg text-fg">Committees</h3><p className="text-xs text-muted">Two a year, six months each. The newest one with people is shown as the current committee on the website.</p></div>
          <button onClick={onLaunch} className="btn-primary !px-5 !py-2.5 text-xs"><Rocket size={14} /> Launch new committee</button>
        </div>
        {list.length === 0 ? <p className="text-sm text-muted">No committee yet. Launch the first one.</p> : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((s) => (
              <div key={s.label} className={cn('rounded-2xl border p-4 transition', s.label === current?.label ? 'border-accent bg-accent/5' : 'border-line')}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-display text-xl text-fg">{s.label}</div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-fg2"><Users size={13} /> {s.members} {s.members === 1 ? 'person' : 'people'}</div>
                    {s.term && (
                      <div className={cn('mt-1.5 flex items-center gap-1.5 text-[11px]', s.term.expired ? 'text-muted' : 'text-fg2')}>
                        <CalendarClock size={12} /> {day(s.term.start)} – {day(s.term.end)} · {termLeft(s.term)}
                      </div>
                    )}
                  </div>
                  {s.label === current?.label && <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-white"><Star size={10} /> Current</span>}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={() => onOpen(s.label)} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-fg2 transition hover:border-tech hover:text-tech">View people</button>
                  <button onClick={() => onTransfer(s.label)} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-fg2 transition hover:border-tech hover:text-tech">Copy people to…</button>
                  <button onClick={() => setDates({ label: s.label, start: s.term?.start || '', end: s.term?.end || '' })} title="Set this committee's first and last day" className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-fg2 transition hover:border-tech hover:text-tech">Dates</button>
                  <button disabled={!s.members} onClick={() => saveFile(`/committees/${encodeURIComponent(s.label)}/export`, { format: 'xlsx' }, `committee-${s.label.replace(/\s+/g, '-')}.xlsx`)} title="The people list as an Excel workbook" className="flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-fg2 transition hover:border-tech hover:text-tech disabled:opacity-40"><FileSpreadsheet size={12} /> Excel</button>
                  <button disabled={!s.members} onClick={() => saveFile(`/committees/${encodeURIComponent(s.label)}/zip`, {}, `committee-${s.label.replace(/\s+/g, '-')}.zip`)} title="List and every picture in full quality" className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-fg2 transition hover:border-tech hover:text-tech disabled:opacity-40">Download</button>
                  <button disabled={busy === s.label} onClick={() => del(s)} aria-label={`Delete ${s.label}`} className="ml-auto grid size-8 place-items-center rounded-lg text-fg2 transition hover:bg-red-500/10 hover:text-red-500 disabled:opacity-50"><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="mt-4 text-xs text-muted">Not sure who to select yet? <Link to="/admin/applications" className="font-semibold text-tech">Open Applications</Link></p>
      </Panel>

      <Drawer open={!!dates} title={`Dates of ${dates?.label || ''}`} onClose={() => setDates(null)}
        footer={<>
          <button onClick={() => setDates(null)} className="btn-outline !px-5 !py-2.5 text-xs">Cancel</button>
          <button onClick={saveDates} disabled={saving || !dates?.start || !dates?.end || dates.end <= dates.start} className="btn-primary !px-5 !py-2.5 text-xs disabled:opacity-50">{saving ? <Loader2 size={14} className="animate-spin" /> : <CalendarRange size={14} />} Save dates</button>
        </>}>
        <p className="mb-5 text-sm leading-6 text-fg2">The first and last day of <b className="text-fg">{dates?.label}</b>. Its people, pictures and place on the Team page stay the same.</p>
        <div className="grid grid-cols-2 gap-4">
          <label className="block"><span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-fg2">First day</span>
            <input className={inputCls} type="date" value={dates?.start || ''} onChange={(e) => setDates((d) => ({ ...d, start: e.target.value }))} /></label>
          <label className="block"><span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-fg2">Last day</span>
            <input className={inputCls} type="date" value={dates?.end || ''} onChange={(e) => setDates((d) => ({ ...d, end: e.target.value }))} /></label>
        </div>
        {editedDays > 0 && <p className="mt-4 text-xs text-fg2">That is {editedDays} days · about {Math.max(1, Math.round(editedDays / 30.44))} months.</p>}
        {dates?.start && dates?.end && dates.end <= dates.start && <p className="mt-4 text-xs font-medium text-red-500">The last day has to be after the first day.</p>}
      </Drawer>
    </div>
  );
}
