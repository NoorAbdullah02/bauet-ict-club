import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Rocket, ArrowRightLeft, Trash2, Users, CalendarPlus, UserPlus, ClipboardList, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import useStore from '../context/store';
import { sessionRank } from '../lib/sessions';
import { Panel, askConfirm } from './ui';
import { cn } from '../lib/cn';

const STEPS = [
  [CalendarPlus, 'Launch', 'Press “Launch new committee”, pick Summer or Winter and the year.'],
  [ArrowRightLeft, 'Bring people', 'Copy the leaders, copy everyone, or use “Transfer people” to pick who continues.'],
  [ClipboardList, 'Select applicants', 'Applications → “Select for session” (they get an email, and you can change their post).'],
  [UserPlus, 'Add anyone', 'Someone who never applied? “Add Member” puts them straight into the committee.'],
];

/** Every committee at a glance (newest first) with the safe actions, plus the four steps to start a new semester. */
export default function CommitteeOverview({ onLaunch, onTransfer, onOpen }) {
  const sessions = useStore((s) => s.sessions);
  const remove = useStore((s) => s.deleteCommittee);
  const [busy, setBusy] = useState('');
  const list = useMemo(() => [...sessions].sort((a, b) => sessionRank(b.label) - sessionRank(a.label)), [sessions]);
  const current = list.find((s) => s.members > 0)?.label;

  const del = async (s) => {
    if (!(await askConfirm({ title: `Delete the ${s.label} committee?`, message: `${s.members} ${s.members === 1 ? 'person goes' : 'people go'} to the Trash and can be restored for 30 days. Other committees and their pictures are not touched.`, confirmText: 'Move to Trash', danger: true }))) return;
    setBusy(s.label);
    try { const r = await remove(s.label); toast.success(`${s.label} moved to the Trash (${r.trashed} people)`); } catch (e) { toast.error(e.response?.data?.error || 'Could not delete'); }
    setBusy('');
  };

  return (
    <div className="mb-6 space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        {STEPS.map(([Icon, t, d], i) => (
          <Panel key={t} className="relative p-4">
            <span className="absolute right-3 top-3 font-display text-3xl text-line">{i + 1}</span>
            <span className="grid size-9 place-items-center rounded-xl bg-accent/10 text-accent"><Icon size={17} /></span>
            <div className="mt-3 text-sm font-semibold text-fg">{t}</div>
            <p className="mt-1 text-xs leading-5 text-fg2">{d}</p>
          </Panel>
        ))}
      </div>

      <Panel className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><h3 className="text-lg text-fg">Committees</h3><p className="text-xs text-muted">Two a year: Summer and Winter. The newest one with people is shown as the current committee on the website.</p></div>
          <button onClick={onLaunch} className="btn-primary !px-5 !py-2.5 text-xs"><Rocket size={14} /> Launch new committee</button>
        </div>
        {list.length === 0 ? <p className="text-sm text-muted">No committee yet. Launch the first one.</p> : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((s) => (
              <div key={s.label} className={cn('rounded-2xl border p-4 transition', s.label === current ? 'border-accent bg-accent/5' : 'border-line')}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-display text-xl text-fg">{s.label}</div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-fg2"><Users size={13} /> {s.members} {s.members === 1 ? 'person' : 'people'}</div>
                  </div>
                  {s.label === current && <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-white"><Star size={10} /> Current</span>}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={() => onOpen(s.label)} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-fg2 transition hover:border-tech hover:text-tech">View people</button>
                  <button onClick={() => onTransfer(s.label)} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-fg2 transition hover:border-tech hover:text-tech">Copy people to…</button>
                  <button disabled={busy === s.label} onClick={() => del(s)} aria-label={`Delete ${s.label}`} className="ml-auto grid size-8 place-items-center rounded-lg text-fg2 transition hover:bg-red-500/10 hover:text-red-500 disabled:opacity-50"><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="mt-4 text-xs text-muted">Not sure who to select yet? <Link to="/admin/applications" className="font-semibold text-tech">Open Applications</Link></p>
      </Panel>
    </div>
  );
}
