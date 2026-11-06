import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CalendarPlus, MapPin, Clock } from 'lucide-react';
import { cn } from '../lib/cn';
import { formalTime } from '../lib/format';
import { eventStart } from '../lib/ics';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const pad = (n) => String(n).padStart(2, '0');
const dayOf = (d) => String(d || '').slice(0, 10);

/** Google Calendar "add event" link (a Bangladesh-time start, two hours long). */
export function googleCalendarUrl(ev) {
  const s = eventStart(ev);
  const fmt = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
  const start = s || new Date(`${dayOf(ev.date)}T10:00:00`);
  const end = new Date(start.getTime() + 2 * 3600e3);
  const p = new URLSearchParams({ action: 'TEMPLATE', text: ev.title, dates: `${fmt(start)}/${fmt(end)}`, ctz: 'Asia/Dhaka', details: `${ev.description || ''}\n${window.location.origin}/events/${ev.id}`.trim(), location: ev.location || 'BAUET' });
  return `https://calendar.google.com/calendar/render?${p}`;
}

/** Month view of the events: dots on days that have something, tap a day to see its events. */
export default function EventCalendar({ events }) {
  const first = useMemo(() => { const e = events.map((x) => dayOf(x.date)).filter(Boolean).sort(); const up = e.find((d) => d >= new Date().toISOString().slice(0, 10)); return (up || e[e.length - 1] || new Date().toISOString().slice(0, 10)); }, [events]);
  const [cursor, setCursor] = useState(() => { const [y, m] = first.split('-').map(Number); return { y, m: m - 1 }; });
  const [picked, setPicked] = useState(null);
  const todayStr = new Date().toISOString().slice(0, 10);
  const byDay = useMemo(() => { const m = new Map(); events.forEach((e) => { const d = dayOf(e.date); if (d) m.set(d, [...(m.get(d) || []), e]); }); return m; }, [events]);

  const startWeekday = new Date(cursor.y, cursor.m, 1).getDay();
  const daysIn = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const cells = [...Array(startWeekday).fill(null), ...Array.from({ length: daysIn }, (_, i) => i + 1)];
  const key = (d) => `${cursor.y}-${pad(cursor.m + 1)}-${pad(d)}`;
  const move = (n) => setCursor((c) => { const t = new Date(c.y, c.m + n, 1); return { y: t.getFullYear(), m: t.getMonth() }; });
  const monthEvents = [...byDay.entries()].filter(([d]) => d.startsWith(`${cursor.y}-${pad(cursor.m + 1)}`)).sort((a, b) => a[0].localeCompare(b[0]));
  const shown = picked ? (byDay.get(picked) || []) : monthEvents.flatMap(([, l]) => l);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="rounded-3xl border border-line bg-surface p-4 shadow-[var(--shadow-md)] sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <button onClick={() => { move(-1); setPicked(null); }} aria-label="Previous month" className="grid size-10 place-items-center rounded-full border border-line text-fg2 hover:border-accent hover:text-accent"><ChevronLeft size={18} /></button>
          <h3 className="font-display text-xl text-fg">{MONTHS[cursor.m]} {cursor.y}</h3>
          <button onClick={() => { move(1); setPicked(null); }} aria-label="Next month" className="grid size-10 place-items-center rounded-full border border-line text-fg2 hover:border-accent hover:text-accent"><ChevronRight size={18} /></button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center font-mono text-[10px] uppercase tracking-wider text-muted">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d} className="py-1">{d}</div>)}</div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (!d) return <div key={`x${i}`} />;
            const list = byDay.get(key(d)) || [];
            const sel = picked === key(d);
            return (
              <button key={d} type="button" disabled={!list.length} onClick={() => setPicked(sel ? null : key(d))} aria-label={`${d} ${MONTHS[cursor.m]}${list.length ? `, ${list.length} event${list.length > 1 ? 's' : ''}` : ''}`} aria-pressed={sel}
                className={cn('relative grid aspect-square place-items-center rounded-2xl text-sm transition', list.length ? 'cursor-pointer font-semibold text-fg hover:bg-accent/10' : 'cursor-default text-muted/70', sel && 'bg-accent text-white hover:bg-accent', key(d) === todayStr && !sel && 'ring-1 ring-tech')}>
                {d}
                {list.length > 0 && <span className="absolute bottom-1.5 flex gap-0.5">{list.slice(0, 3).map((e) => <i key={e.id} className={cn('size-1.5 rounded-full', sel ? 'bg-white' : 'bg-tech')} />)}</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {shown.length === 0 && <p className="rounded-2xl bg-alt px-5 py-6 text-center text-sm text-muted">No events in {MONTHS[cursor.m]}. Use the arrows to look at other months.</p>}
        {picked && <p className="font-mono text-[11px] uppercase tracking-wider text-muted">{picked} <button onClick={() => setPicked(null)} className="ml-2 text-tech underline">Show the whole month</button></p>}
        {shown.map((e) => (
          <div key={e.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface p-4">
            <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-accent/10 text-center leading-tight text-accent"><span className="font-display text-xl">{Number(dayOf(e.date).slice(8))}</span><span className="font-mono text-[9px] uppercase">{MONTHS[Number(dayOf(e.date).slice(5, 7)) - 1].slice(0, 3)}</span></div>
            <div className="min-w-0 flex-1">
              <Link to={`/events/${e.id}`} className="block truncate font-display text-lg text-fg hover:text-accent">{e.title}</Link>
              <p className="mt-0.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg2">{e.time && <span className="inline-flex items-center gap-1"><Clock size={12} /> {formalTime(e.time)}</span>}{e.location && <span className="inline-flex items-center gap-1"><MapPin size={12} /> {e.location}</span>}</p>
            </div>
            <a href={googleCalendarUrl(e)} target="_blank" rel="noopener noreferrer" className="btn-outline !px-4 !py-2 text-xs"><CalendarPlus size={14} /> Google Calendar</a>
          </div>
        ))}
      </div>
    </div>
  );
}
