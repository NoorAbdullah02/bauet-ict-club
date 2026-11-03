import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Image, X } from 'lucide-react';
import useStore from '../context/store';

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { duration: 0.6, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] } }),
};

export default function Gallery() {
  const { gallery } = useStore();
  const [lightbox, setLightbox] = useState(null);
  const [filter, setFilter] = useState('all');
  const [ref, inView] = useInView({ threshold: 0.05, triggerOnce: true });

  const categories = useMemo(() => ['all', ...new Set(gallery.map((g) => g.category).filter(Boolean))], [gallery]);
  const filtered = useMemo(() => {
    let items = [...gallery].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    if (filter !== 'all') items = items.filter((g) => g.category === filter);
    return items;
  }, [gallery, filter]);

  return (
    <section id="gallery" className="section section-alt" ref={ref}>
      <div className="container">
        <motion.div className="section-header" initial="hidden" animate={inView ? 'visible' : 'hidden'} variants={fadeUp} custom={0}>
          <div className="section-tag">Visual Stories</div>
          <h2 className="section-title">Gallery</h2>
          <p className="section-desc">Moments captured from our events and activities</p>
          <div className="divider" />
        </motion.div>

        {categories.length > 1 && (
          <motion.div initial="hidden" animate={inView ? 'visible' : 'hidden'} variants={fadeUp} custom={1}
            style={{ display: 'flex', gap: 8, marginBottom: 40, flexWrap: 'wrap', justifyContent: 'center' }}>
            {categories.map((cat) => (
              <button key={cat} onClick={() => setFilter(cat)}
                style={{
                  padding: '10px 24px', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 600,
                  background: filter === cat ? 'var(--accent)' : 'var(--bg-surface)',
                  border: `1px solid ${filter === cat ? 'var(--accent)' : 'var(--border)'}`,
                  color: filter === cat ? '#fff' : 'var(--fg-secondary)', transition: 'all 0.2s',
                }}>
                {cat === 'all' ? 'All' : cat}
              </button>
            ))}
          </motion.div>
        )}

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--fg-muted)' }}>
            <Image size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
            <p>Gallery coming soon!</p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {filtered.map((g, i) => (
            <motion.div
              key={g.id}
              custom={i + 2}
              initial="hidden"
              animate={inView ? 'visible' : 'hidden'}
              variants={fadeUp}
              onClick={() => setLightbox(g)}
              style={{
                position: 'relative', borderRadius: 'var(--radius)', overflow: 'hidden',
                aspectRatio: '4/3', cursor: 'pointer', background: 'var(--bg-hover)',
              }}
              whileHover={{ scale: 1.02 }}
            >
              {g.image_url && <img src={g.image_url} alt={g.title || ''} loading="lazy"
                style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s' }} />}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to top, rgba(11,22,40,0.8), transparent 60%)',
                display: 'flex', alignItems: 'flex-end', padding: 18,
                opacity: 0, transition: 'opacity 0.3s',
              }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                onMouseLeave={(e) => e.currentTarget.style.opacity = 0}
              >
                <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>{g.title || ''}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 500,
              background: 'rgba(0,0,0,0.92)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 24,
            }}
          >
            <button onClick={() => setLightbox(null)}
              style={{
                position: 'absolute', top: 24, right: 24,
                width: 44, height: 44, borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
              <X size={22} />
            </button>
            <motion.img
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              src={lightbox.image_url}
              alt={lightbox.title || ''}
              style={{ maxWidth: '90%', maxHeight: '85vh', objectFit: 'contain', borderRadius: 12 }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
