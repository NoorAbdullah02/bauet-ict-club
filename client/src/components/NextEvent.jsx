import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarPlus, MapPin, Timer } from 'lucide-react';
import { downloadIcs, eventStart } from '../lib/ics';

const parts = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return [['Days', Math.floor(s / 86400)], ['Hours', Math.floor(s / 3600) % 24], ['Min', Math.floor(s / 60) % 60], ['Sec', s % 60]];
};

/** Live countdown to the next upcoming event, with an add-to-calendar button. Hidden when nothing is scheduled. */
export default function NextEvent({ events }) {
  const next = useMemo(() => events
    .map((e) => ({ e, at: eventStart(e) }))
    .filter((x) => x.at && x.at > new Date())
    .sort((a, b) => a.at - b.at)[0], [events]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!next) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [next]);

  if (!next) return null;
  const { e, at } = next;
  return (
    <section className="section !py-10">
      <div className="container">
        <div className="relative overflow-hidden rounded-[28px] border border-line bg-surface p-6 shadow-[var(--shadow-lg)] sm:p-9">
          <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-accent/15 blur-[80px]" />
          <div className="relative grid items-center gap-8 lg:grid-cols-[1.1fr_1fr] [&>*]:min-w-0">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-tech"><Timer size={14} /> Next event</div>
              <h3 className="text-[clamp(1.6rem,3.4vw,2.4rem)] leading-tight text-fg">{e.title}</h3>
              <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-fg2">
                <span>{at.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}{e.time ? `, ${e.time}` : ''}</span>
                {e.location && <span className="inline-flex items-center gap-1"><MapPin size={14} /> {e.location}</span>}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button onClick={() => downloadIcs(e)} className="btn-primary !px-5 !py-2.5 text-xs"><CalendarPlus size={15} /> Add to calendar</button>
                <Link to="/events" className="btn-outline !px-5 !py-2.5 text-xs">All events</Link>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 sm:gap-3" role="timer" aria-label="Time until the next event">
              {parts(at - now).map(([l, v]) => (
                <div key={l} className="rounded-2xl border border-line bg-bg/60 px-1 py-4 text-center">
                  <div className="font-mono text-2xl font-medium tabular-nums text-fg sm:text-4xl">{String(v).padStart(2, '0')}</div>
                  <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-muted sm:text-[10px]">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
