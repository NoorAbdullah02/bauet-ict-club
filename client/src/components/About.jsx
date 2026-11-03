import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Target, Eye, Rocket, Code, Users, Trophy, BookOpen, Lightbulb, Cpu, Globe, ArrowUpRight } from 'lucide-react';
import useStore from '../context/store';

const fadeUp = {
  hidden: { opacity: 0, y: 35 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { duration: 0.55, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] } }),
};

const cards = [
  { icon: Target, title: 'Our Mission', key: 'mission', color: '#C9A84C', bg: 'rgba(201,168,76,0.08)' },
  { icon: Eye, title: 'Our Vision', key: 'vision', color: '#0096C7', bg: 'rgba(0,150,199,0.08)' },
  { icon: Rocket, title: 'Our Goal', key: 'goal', color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)' },
];

const features = [
  { icon: Code, label: 'Workshops', desc: 'Hands-on coding sessions' },
  { icon: Trophy, label: 'Hackathons', desc: 'Competitive innovation' },
  { icon: BookOpen, label: 'Tech Talks', desc: 'Expert knowledge sharing' },
  { icon: Lightbulb, label: 'Projects', desc: 'Real-world development' },
  { icon: Users, label: 'Competitions', desc: 'National & international' },
  { icon: Globe, label: 'Community', desc: 'Network of innovators' },
  { icon: Cpu, label: 'Mentorship', desc: 'Guidance from seniors' },
  { icon: Rocket, label: 'Networking', desc: 'Industry connections' },
];

export default function About() {
  const { settings } = useStore();
  const [ref, inView] = useInView({ threshold: 0.08, triggerOnce: true });

  return (
    <section id="about" className="section" ref={ref}>
      <div className="container">
        <motion.div className="section-header" initial="hidden" animate={inView ? 'visible' : 'hidden'} variants={fadeUp} custom={0}>
          <div className="section-tag">Who We Are</div>
          <h2 className="section-title">About Our Club</h2>
          <p className="section-desc">{settings?.aboutText}</p>
          <div className="divider" />
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20, marginBottom: 64 }}>
          {cards.map((card, i) => (
            <motion.div
              key={card.key} custom={i + 1} initial="hidden" animate={inView ? 'visible' : 'hidden'} variants={fadeUp}
              whileHover={{ y: -6, transition: { duration: 0.25 } }}
              style={{
                background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16,
                padding: '32px 28px', textAlign: 'center',
                transition: 'box-shadow 0.35s ease, border-color 0.35s ease',
                cursor: 'default', position: 'relative', overflow: 'hidden',
              }}
              className="about-card"
            >
              <div style={{
                position: 'absolute', top: -40, right: -40, width: 120, height: 120, borderRadius: '50%',
                background: card.bg, filter: 'blur(30px)', pointerEvents: 'none',
              }} />
              <div style={{
                width: 56, height: 56, borderRadius: 14,
                background: card.bg, color: card.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 18px', position: 'relative',
              }}>
                <card.icon size={24} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, fontFamily: 'var(--font-display)', color: 'var(--fg)' }}>{card.title}</h3>
              <p style={{ fontSize: 14, color: 'var(--fg-secondary)', lineHeight: 1.75 }}>{settings?.[card.key]}</p>
            </motion.div>
          ))}
        </div>

        <motion.div initial="hidden" animate={inView ? 'visible' : 'hidden'} variants={fadeUp} custom={4}
          style={{ textAlign: 'center', marginBottom: 24 }}>
          <h3 style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 6 }}>What We Do</h3>
          <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Activities that shape future tech leaders</p>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {features.map((f, i) => (
            <motion.div
              key={f.label} custom={i + 5} initial="hidden" animate={inView ? 'visible' : 'hidden'} variants={fadeUp}
              whileHover={{ borderColor: 'var(--accent)', y: -3, transition: { duration: 0.2 } }}
              style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12,
                transition: 'all 0.25s ease', cursor: 'default',
              }}
            >
              <div style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: 'var(--accent-light)', color: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <f.icon size={17} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{f.label}</div>
                <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 1 }}>{f.desc}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <style>{`
        .about-card:hover { box-shadow: 0 12px 40px rgba(0,0,0,0.08) !important; border-color: var(--accent) !important; }
      `}</style>
    </section>
  );
}
