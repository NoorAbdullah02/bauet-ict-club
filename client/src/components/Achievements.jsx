import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Trophy, Award } from 'lucide-react';
import useStore from '../context/store';

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] } }),
};

export default function Achievements() {
  const { achievements } = useStore();
  const [ref, inView] = useInView({ threshold: 0.05, triggerOnce: true });
  const sorted = useMemo(() => [...achievements].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)), [achievements]);

  return (
    <section id="achievements" className="section" ref={ref}>
      <div className="container">
        <motion.div className="section-header" initial="hidden" animate={inView ? 'visible' : 'hidden'} variants={fadeUp} custom={0}>
          <div className="section-tag">Our Pride</div>
          <h2 className="section-title">Achievements</h2>
          <p className="section-desc">Milestones and accomplishments we are proud of</p>
          <div className="divider" />
        </motion.div>

        {sorted.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--fg-muted)' }}>
            <Trophy size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
            <p>Achievements coming soon!</p>
          </div>
        )}

        <div style={{ maxWidth: 700, margin: '0 auto', position: 'relative', paddingLeft: 36 }}>
          <div style={{
            position: 'absolute', left: 13, top: 0, bottom: 0, width: 2,
            background: 'linear-gradient(to bottom, var(--accent), var(--tech), transparent)',
          }} />

          {sorted.map((a, i) => (
            <motion.div
              key={a.id}
              custom={i + 1}
              initial="hidden"
              animate={inView ? 'visible' : 'hidden'}
              variants={fadeUp}
              style={{ position: 'relative', marginBottom: 32 }}
            >
              <div style={{
                position: 'absolute', left: -36, top: 4,
                width: 28, height: 28, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
                border: '3px solid var(--bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 0 4px var(--accent-light)',
              }}>
                <Award size={12} color="#fff" />
              </div>

              <motion.div
                whileHover={{ y: -4, boxShadow: 'var(--shadow-lg)', borderColor: 'var(--accent)' }}
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: 24,
                  transition: 'all 0.3s',
                }}
              >
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)', fontWeight: 600, marginBottom: 8 }}>
                  {a.date}
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 8, fontFamily: 'var(--font-display)' }}>{a.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--fg-secondary)', lineHeight: 1.7 }}>{a.description}</p>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
