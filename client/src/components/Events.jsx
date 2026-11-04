import { useState, useMemo } from 'react';
import { thumb } from '../lib/img';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Calendar, MapPin, Clock, Share2, CalendarPlus, Facebook, MessageCircle, Link, X as XIcon } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import useStore from '../context/store';
import { downloadIcs, eventStart } from '../lib/ics';

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] } }),
};

function ShareMenu({ title, text, onClose }) {
  const shareText = `${title} - ${text} | BAUET ICT Club`;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      style={{
        position: 'absolute', right: 0, top: '100%', marginTop: 4, zIndex: 20,
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-lg)',
        padding: 8, minWidth: 180,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <a href={`https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer"
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, color: 'var(--fg-secondary)', transition: 'all 0.15s' }}>
        <Facebook size={16} /> Facebook
      </a>
      <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer"
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, color: 'var(--fg-secondary)', transition: 'all 0.15s' }}>
        <MessageCircle size={16} /> WhatsApp
      </a>
      <button onClick={() => { navigator.clipboard?.writeText(shareText); onClose(); }}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, color: 'var(--fg-secondary)', width: '100%', textAlign: 'left', transition: 'all 0.15s' }}>
        <Link size={16} /> Copy Link
      </button>
    </motion.div>
  );
}

export default function Events() {
  const { events } = useStore(useShallow((s) => ({ events: s.events })));
  const [filter, setFilter] = useState('all');
  const [shareOpen, setShareOpen] = useState(null);
  const [ref, inView] = useInView({ threshold: 0.05, triggerOnce: true });

  const categories = ['all', 'Workshop', 'Competition', 'Seminar', 'Hackathon', 'Social'];
  const sorted = useMemo(() => {
    let items = [...events].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    if (filter !== 'all') items = items.filter((e) => e.category === filter);
    return items;
  }, [events, filter]);

  return (
    <section id="events" className="section" ref={ref}>
      <div className="container">
        <motion.div className="section-header" initial="hidden" animate={inView ? 'visible' : 'hidden'} variants={fadeUp} custom={0}>
          <div className="section-tag">Stay Updated</div>
          <h2 className="section-title">Events</h2>
          <p className="section-desc">Workshops, hackathons, seminars, and competitions</p>
          <div className="divider" />
        </motion.div>

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
            <p>No events yet. Check back soon!</p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24 }}>
          {sorted.map((ev, i) => (
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
                    {ev.date}
                  </span>
                  {ev.time && <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
                    <Clock size={12} style={{ display: 'inline', verticalAlign: -1, marginRight: 4 }} />{ev.time}
                  </span>}
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 8, fontFamily: 'var(--font-display)' }}>{ev.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--fg-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
                  {(ev.description || '').slice(0, 130)}{(ev.description || '').length > 130 ? '...' : ''}
                </p>
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
                    <button onClick={() => setShareOpen(shareOpen === ev.id ? null : ev.id)}
                      style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Share2 size={14} />
                    </button>
                    {shareOpen === ev.id && <ShareMenu title={ev.title} text={ev.description || ''} onClose={() => setShareOpen(null)} />}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
