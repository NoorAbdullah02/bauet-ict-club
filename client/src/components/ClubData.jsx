import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { api } from '../context/store';

const LABELS = [['members', 'Members'], ['events', 'Events'], ['registrations', 'Event sign-ups'], ['projects', 'Projects'], ['notices', 'Notices'], ['contests', 'Contests'], ['jobs', 'Jobs'], ['gallery', 'Photos'], ['achievements', 'Awards'], ['advisors', 'Advisors']];

function Bars({ title, rows }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  if (!rows.length) return null;
  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <h3 className="font-display text-lg text-fg">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {rows.map((r) => (
          <li key={r.name} className="grid grid-cols-[minmax(0,7rem)_1fr_auto] items-center gap-3 text-sm">
            <span className="truncate text-fg2" title={r.name}>{r.name}</span>
            <span className="h-2.5 overflow-hidden rounded-full bg-line" aria-hidden="true"><span className="block h-full rounded-full bg-tech" style={{ width: `${Math.max(4, (r.count / max) * 100)}%` }} /></span>
            <span className="font-mono text-fg">{r.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Public numbers about the club (counts only, nothing personal). */
export default function ClubData() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(false);
  useEffect(() => { api.get('/dataset').then((r) => setD(r.data)).catch(() => setErr(true)); }, []);
  const download = () => {
    const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'bauet-ict-club-data.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  return (
    <section className="section">
      <div className="container max-w-4xl">
        <div className="section-header">
          <div className="section-tag">Club data</div>
          <h2 className="section-title">The club in numbers</h2>
          <p className="section-desc">Open numbers about BAUET ICT Club. Counts only: no names, phone numbers or emails.</p>
          <div className="divider" />
        </div>
        {err && <p role="alert" className="text-center text-sm text-muted">Could not load the numbers. Please try again in a moment.</p>}
        {!d && !err && <p className="text-center text-sm text-muted" aria-live="polite">Loading…</p>}
        {d && (
          <>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {LABELS.map(([k, l]) => (
                <div key={k} className="rounded-2xl border border-line bg-surface p-4 text-center">
                  <dd className="font-display text-3xl text-fg">{d.totals[k] ?? 0}</dd>
                  <dt className="mt-1 text-xs uppercase tracking-wider text-muted">{l}</dt>
                </div>
              ))}
            </dl>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Bars title="Events per year" rows={d.eventsByYear} />
              <Bars title="Members by department" rows={d.membersByDepartment} />
              <Bars title="Members by committee session" rows={d.membersBySession} />
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
              <span>Updated {new Date(d.updated).toLocaleString()}</span>
              <button type="button" onClick={download} className="btn-outline !px-4 !py-2 text-xs"><Download size={14} /> Download JSON</button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
