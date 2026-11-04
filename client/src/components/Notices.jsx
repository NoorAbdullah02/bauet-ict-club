import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Pin, ChevronDown, Bell, Share2 } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import useStore from '../context/store';

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] } }),
};

const prioStyle = {
  urgent: { bg: 'rgba(239,68,68,0.08)', color: '#EF4444', border: 'rgba(239,68,68,0.2)' },
  normal: { bg: 'var(--accent-light)', color: 'var(--accent)', border: 'rgba(var(--accent-rgb),0.2)' },
  low: { bg: 'var(--tech-light)', color: 'var(--tech)', border: 'rgba(var(--tech-rgb),0.2)' },
};

export default function Notices() {
  const { notices } = useStore(useShallow((s) => ({ notices: s.notices })));
  const [expanded, setExpanded] = useState(null);
  const [ref, inView] = useInView({ threshold: 0.05, triggerOnce: true });

  const sorted = useMemo(() =>
    [...notices].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.date || 0) - new Date(a.date || 0);
    }), [notices]);

  return (
    <section id="notices" className="section section-alt" ref={ref}>
      <div className="container">
        <motion.div className="section-header" initial="hidden" animate={inView ? 'visible' : 'hidden'} variants={fadeUp} custom={0}>
          <div className="section-tag">Announcements</div>
          <h2 className="section-title">Notice Board</h2>
          <p className="section-desc">Important updates and announcements</p>
          <div className="divider" />
        </motion.div>

        {sorted.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--fg-muted)' }}>
            <Bell size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
            <p>No notices yet.</p>
          </div>
        )}

        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sorted.map((n, i) => {
            const prio = prioStyle[n.priority] || prioStyle.normal;
            const isExpanded = expanded === n.id;
            return (
              <motion.div
                key={n.id}
                custom={i + 1}
                initial="hidden"
                animate={inView ? 'visible' : 'hidden'}
                variants={fadeUp}
                onClick={() => setExpanded(isExpanded ? null : n.id)}
                style={{
                  background: 'var(--bg-surface)',
                  border: `1px solid ${isExpanded ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius)',
                  padding: '20px 24px',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                }}
                whileHover={{ boxShadow: 'var(--shadow-md)' }}
              >
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  {n.pinned && <Pin size={18} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 3 }} />}
                  {n.image_url && <img src={n.image_url} alt="" loading="lazy" decoding="async" style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, fontFamily: 'var(--font-display)' }}>{n.title}</h3>
                      {n.priority && (
                        <span style={{
                          padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                          textTransform: 'uppercase', letterSpacing: 0.5,
                          background: prio.bg, color: prio.color,
                        }}>
                          {n.priority}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>{n.date}</div>
                    <AnimatePresence>
                      {isExpanded && n.content && (
                        <motion.p
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          style={{ marginTop: 14, fontSize: 14, color: 'var(--fg-secondary)', lineHeight: 1.7, overflow: 'hidden' }}
                        >
                          {n.content}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                  <ChevronDown
                    size={18}
                    style={{
                      color: 'var(--fg-muted)', flexShrink: 0, marginTop: 3,
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
                      transition: 'transform 0.3s',
                    }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
