import { useState, useMemo, useEffect } from 'react';
import { formalDate, formalTime } from '../lib/format';
import { thumb } from '../lib/img';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Calendar, MapPin, Clock, Share2, CalendarPlus, Facebook, MessageCircle, Link, X as XIcon } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import useStore from '../context/store';
import { downloadIcs, eventStart } from '../lib/ics';
import { eventLink, shareLinks, copyText, nativeShare } from '../lib/share';
import { Link as RouterLink } from 'react-router-dom';
import toast from 'react-hot-toast';

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] } }),
};

function ShareMenu({ ev, onClose }) {
  const url = eventLink(ev.id);
  const text = `${ev.title}: ${formalDate(ev.date, { weekday: true })}${ev.time ? `, ${formalTime(ev.time)}` : ''}`;
  const links = shareLinks(url, text);
  const item = { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, color: 'var(--fg-secondary)', width: '100%', textAlign: 'left' };
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
      style={{ position: 'absolute', right: 0, bottom: '100%', marginBottom: 6, zIndex: 20, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-lg)', padding: 8, minWidth: 190 }}
      onClick={(e) => e.stopPropagation()}
    >
      <a href={links.facebook} target="_blank" rel="noopener noreferrer" onClick={onClose} style={item}><Facebook size={16} /> Facebook</a>
      <a href={links.whatsapp} target="_blank" rel="noopener noreferrer" onClick={onClose} style={item}><MessageCircle size={16} /> WhatsApp</a>
      <button onClick={async () => { const ok = await copyText(url); toast[ok ? 'success' : 'error'](ok ? 'Link copied' : 'Could not copy the link'); onClose(); }} style={item}><Link size={16} /> Copy link</button>
    </motion.div>
  );
}

export default function Events() {
  const { events } = useStore(useShallow((s) => ({ events: s.events })));
  const [filter, setFilter] = useState('all');
  const [when, setWhen] = useState('upcoming'); // upcoming | past | all
  const [sem, setSem] = useState('all');
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState(false);
  const [shareOpen, setShareOpen] = useState(null);
  const [ref, inView] = useInView({ threshold: 0.05, triggerOnce: true });

  const today = new Date().toISOString().slice(0, 10);
  const dayOf = (d) => String(d || '').slice(0, 10);
  // events belong to the semester of their date, so every committee's events stay easy to find
  const semOf = (d) => { const m = dayOf(d).match(/^(\d{4})-(\d{2})/); return m ? `${Number(m[2]) <= 6 ? 'Summer' : 'Winter'} ${m[1]}` : 'No date'; };
  const semRank = (l) => { const m = l.match(/(\d{4})/); return m ? Number(m[1]) * 2 + (/Winter/.test(l) ? 1 : 0) : -1; };

  const categories = useMemo(() => ['all', ...new Set(['Workshop', 'Competition', 'Seminar', 'Hackathon', 'Social', ...events.map((e) => e.category).filter(Boolean)])], [events]);
  const upcomingN = useMemo(() => events.filter((e) => dayOf(e.date) >= today).length, [events, today]);
  const pastN = events.length - upcomingN;
  // if nothing is coming up, open on the past events instead of an empty page
  useEffect(() => { if (!picked && events.length && upcomingN === 0) setWhen('past'); }, [events.length, upcomingN, picked]);

  // semester chips only list semesters that have events in the chosen tab
  const semesters = useMemo(() => [...new Set(events.filter((e) => when === 'all' || (when === 'upcoming' ? dayOf(e.date) >= today : dayOf(e.date) < today)).map((e) => semOf(e.date)))].sort((x, y) => semRank(y) - semRank(x)), [events, when, today]);
  const groups = useMemo(() => {
    let items = events.filter((e) => (when === 'all' || (when === 'upcoming' ? dayOf(e.date) >= today : dayOf(e.date) < today))
      && (filter === 'all' || e.category === filter) && (sem === 'all' || semOf(e.date) === sem)
      && (!query || `${e.title} ${e.location} ${e.description} ${e.category}`.toLowerCase().includes(query.toLowerCase())));
    // upcoming: soonest first; everything else: newest first
    items = items.sort((a, b) => (when === 'upcoming' ? dayOf(a.date).localeCompare(dayOf(b.date)) : dayOf(b.date).localeCompare(dayOf(a.date))));
    if (when === 'upcoming') return items.length ? [{ label: '', items }] : [];
    const by = new Map();
    items.forEach((e) => { const k = semOf(e.date); by.set(k, [...(by.get(k) || []), e]); });
    return [...by.entries()].sort((a, b) => semRank(b[0]) - semRank(a[0])).map(([label, list]) => ({ label, items: list }));
  }, [events, when, filter, sem, query, today]);
  const sorted = groups.flatMap((g) => g.items);

  return (
    <section id="events" className="section" ref={ref}>
      <div className="container">
        <motion.div className="section-header" initial="hidden" animate={inView ? 'visible' : 'hidden'} variants={fadeUp} custom={0}>
          <div className="section-tag">Stay Updated</div>
          <h2 className="section-title">Events</h2>
          <p className="section-desc">Workshops, hackathons, seminars, and competitions</p>
          <div className="divider" />
        </motion.div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
          <div role="tablist" aria-label="Which events" style={{ display: 'inline-flex', padding: 4, borderRadius: 999, background: 'var(--bg-alt)', border: '1px solid var(--border)' }}>
            {[['upcoming', `Upcoming (${upcomingN})`], ['past', `Past events (${pastN})`], ['all', 'All']].map(([k, l]) => (
              <button key={k} role="tab" aria-selected={when === k} onClick={() => { setWhen(k); setPicked(true); setSem('all'); }}
                style={{ padding: '9px 20px', borderRadius: 999, fontSize: 13, fontWeight: 600, background: when === k ? 'var(--accent)' : 'transparent', color: when === k ? '#fff' : 'var(--fg-secondary)', transition: 'all .2s' }}>{l}</button>
            ))}
          </div>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search events" aria-label="Search events"
            style={{ padding: '10px 18px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--fg)', fontSize: 14, minWidth: 200, outline: 'none' }} />
        </div>
        {when !== 'upcoming' && semesters.length > 1 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
            {['all', ...semesters].map((l) => (
              <button key={l} onClick={() => setSem(l)} style={{ padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600, border: `1px solid ${sem === l ? 'var(--tech)' : 'var(--border)'}`, background: sem === l ? 'var(--tech)' : 'transparent', color: sem === l ? '#fff' : 'var(--fg-secondary)' }}>{l === 'all' ? 'Every semester' : l}</button>
            ))}
          </div>
        )}

        <motion.div initial="hidden" animate={inView ? 'visible' : 'hidden'} variants={fadeUp} custom={1}
          style={{ display: 'flex', gap: 8, marginBottom: 40, flexWrap: 'wrap', justifyContent: 'center' }}>
          {categories.map((cat) => (
            <button key={cat} onClick={() => setFilter(cat)}
              style={{
                padding: '10px 24px', borderRadius: 'var(--radius-sm)',
                fontSize: 13, fontWeight: 600,
                background: filter === cat ? 'var(--accent)' : 'var(--bg-surface)',
                border: `1px solid ${filter === cat ? 'var(--accent)' : 'var(--border)'}`,
                color: filter === cat ? '#fff' : 'var(--fg-secondary)',
                transition: 'all 0.2s',
              }}>
              {cat === 'all' ? 'All Events' : cat}
            </button>
          ))}
        </motion.div>

        {sorted.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--fg-muted)' }}>
            <Calendar size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
            <p>{events.length ? 'No events match. Try another filter.' : 'No events yet. Check back soon!'}</p>
          </div>
        )}

        {groups.map((g) => (
        <div key={g.label || 'upcoming'} style={{ marginBottom: 40 }}>
          {g.label && <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 12 }}>{g.label}<span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)', fontWeight: 500 }}>{g.items.length} {g.items.length === 1 ? 'event' : 'events'}</span><span style={{ flex: 1, height: 1, background: 'var(--border)' }} /></h3>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(340px, 100%), 1fr))', gap: 24 }}>
          {g.items.map((ev, i) => (
            <motion.div
              key={ev.id}
              custom={i + 2}
              initial="hidden"
              animate={inView ? 'visible' : 'hidden'}
              variants={fadeUp}
              whileHover={{ y: -8, boxShadow: 'var(--shadow-xl)' }}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                overflow: 'hidden',
                transition: 'all 0.35s cubic-bezier(0.16,1,0.3,1)',
              }}
            >
              <div style={{
                height: 200, background: ev.image_url
                  ? `url(${thumb(ev.image_url, 900)}) center/cover`
                  : 'linear-gradient(135deg, var(--navy), var(--tech))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'rgba(255,255,255,0.3)', fontSize: 48,
              }}>
                {!ev.image_url && <Calendar size={48} />}
              </div>
              <div style={{ padding: 24 }}>
                <div style={{ display: 'flex', gap: 12, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>
                    <Calendar size={12} style={{ display: 'inline', verticalAlign: -1, marginRight: 4 }} />
                    {formalDate(ev.date, { weekday: true })}
                  </span>
                  {ev.time && <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
                    <Clock size={12} style={{ display: 'inline', verticalAlign: -1, marginRight: 4 }} />{formalTime(ev.time)}
                  </span>}
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 8, fontFamily: 'var(--font-display)' }}><RouterLink to={`/events/${ev.id}`} style={{ color: 'inherit' }}>{ev.title}</RouterLink></h3>
                <p style={{ fontSize: 14, color: 'var(--fg-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
                  {(ev.description || '').slice(0, 130)}{(ev.description || '').length > 130 ? '...' : ''}
                </p>
                <RouterLink to={`/events/${ev.id}`} className={eventStart(ev) && eventStart(ev) < new Date(new Date().toDateString()) ? 'btn-outline' : 'btn-primary'} style={{ width: '100%', justifyContent: 'center', marginBottom: 14, padding: '10px 18px', fontSize: 13 }}>
                  {eventStart(ev) && eventStart(ev) < new Date(new Date().toDateString()) ? 'See details' : 'Register now'}
                </RouterLink>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={14} /> {ev.location || 'TBA'}
                  </span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', position: 'relative' }}>
                    {ev.category && <span className="badge badge-tech">{ev.category}</span>}
                    {eventStart(ev) && eventStart(ev) > new Date() && (
                      <button onClick={() => downloadIcs(ev)} title="Add to calendar" aria-label="Add to calendar"
                        style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CalendarPlus size={14} />
                      </button>
                    )}
                    <button aria-label="Share this event" onClick={async () => { if (!(await nativeShare({ title: ev.title, text: ev.title, url: eventLink(ev.id) }))) setShareOpen(shareOpen === ev.id ? null : ev.id); }}
                      style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Share2 size={14} />
                    </button>
                    {shareOpen === ev.id && <ShareMenu ev={ev} onClose={() => setShareOpen(null)} />}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        </div>
        ))}
      </div>
    </section>
  );
}
