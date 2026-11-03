import { useRef, useEffect, useState, Suspense, lazy } from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, Sparkles, ChevronRight, ExternalLink } from 'lucide-react';
import useStore from '../context/store';

const HeroScene = lazy(() => import('./HeroScene'));

const TAGLINES = [
  'Where Technology Meets Innovation',
  'Building Tomorrow\'s Tech Leaders',
  'Dream. Create. Inspire.',
  'Empowering Future Engineers',
];

function useTypewriter(texts, typeSpeed = 50, deleteSpeed = 30, pauseMs = 2500) {
  const [display, setDisplay] = useState('');
  const idx = useRef(0);
  const charIdx = useRef(0);
  const deleting = useRef(false);

  useEffect(() => {
    let timer;
    const tick = () => {
      const text = texts[idx.current];
      if (!deleting.current) {
        charIdx.current++;
        setDisplay(text.slice(0, charIdx.current));
        if (charIdx.current >= text.length) {
          deleting.current = true;
          timer = setTimeout(tick, pauseMs);
          return;
        }
        timer = setTimeout(tick, typeSpeed);
      } else {
        charIdx.current--;
        setDisplay(text.slice(0, charIdx.current));
        if (charIdx.current <= 0) {
          deleting.current = false;
          idx.current = (idx.current + 1) % texts.length;
          timer = setTimeout(tick, 400);
          return;
        }
        timer = setTimeout(tick, deleteSpeed);
      }
    };
    timer = setTimeout(tick, 600);
    return () => clearTimeout(timer);
  }, []);

  return display;
}

function CountUp({ target, duration = 2200, suffix = '+' }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const start = Date.now();
        const tick = () => {
          const p = Math.min((Date.now() - start) / duration, 1);
          const ease = 1 - Math.pow(1 - p, 4);
          setCount(Math.round(target * ease));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
}

export default function Hero() {
  const { settings, events, members } = useStore();
  const tagline = useTypewriter(TAGLINES);

  const stats = [
    { value: members.length || 120, label: 'Members', color: '#C9A84C' },
    { value: events.length || 50, label: 'Events', color: '#00B4D8' },
    { value: 30, label: 'Projects', color: '#8B5CF6' },
    { value: 5, label: 'Years', color: '#10B981' },
  ];

  return (
    <section id="home" style={{
      position: 'relative', minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', background: 'var(--navy)',
    }}>
      <Suspense fallback={null}>
        <HeroScene />
      </Suspense>

      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 80% 60% at 20% 40%, rgba(0,150,199,0.1), transparent), radial-gradient(ellipse 60% 50% at 80% 60%, rgba(201,168,76,0.06), transparent)',
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'absolute', inset: 0, opacity: 0.03,
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)
        `,
        backgroundSize: '80px 80px',
        pointerEvents: 'none',
      }} />

      <div className="container" style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '120px 16px 80px' }}>
        <motion.div initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.15 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '9px 22px', borderRadius: 50,
            background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)',
            color: '#C9A84C', fontSize: 11, fontWeight: 700,
            letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 28,
          }}>
            <Sparkles size={13} />
            Bangladesh Army University of Engineering & Technology
          </div>
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 35 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }}
          style={{
            fontSize: 'clamp(2.8rem, 7vw, 5.5rem)', fontWeight: 900,
            color: '#FFFFFF', letterSpacing: '-2px', lineHeight: 1.05, marginBottom: 18,
          }}>
          <span style={{
            background: 'linear-gradient(135deg, #C9A84C, #E8D48B, #C9A84C)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>BAUET</span>{' '}ICT CLUB
        </motion.h1>

        <motion.div initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.55 }}
          style={{ fontSize: 'clamp(1rem, 2vw, 1.25rem)', color: 'rgba(255,255,255,0.55)', maxWidth: 560, margin: '0 auto 20px', lineHeight: 1.7 }}>
          {tagline}<span style={{ borderRight: '2px solid var(--accent)', marginLeft: 2, animation: 'blink 0.8s infinite' }} /><style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
        </motion.div>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7, duration: 0.6 }}
          style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', marginBottom: 44, letterSpacing: 0.5 }}>
          Rajshahi, Bangladesh · Est. 2019
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.8 }}
          style={{ display: 'flex', justifyContent: 'center', gap: 44, marginBottom: 48, flexWrap: 'wrap' }}>
          {stats.map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.9 + i * 0.1, duration: 0.5 }}
              style={{ textAlign: 'center', minWidth: 70 }}>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)',
                fontWeight: 700, color: stat.color, lineHeight: 1.2,
              }}>
                <CountUp target={stat.value} />
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 2, marginTop: 6 }}>
                {stat.label}
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 1.1 }}
          style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={() => document.getElementById('events')?.scrollIntoView({ behavior: 'smooth' })}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            Explore Events <ChevronRight size={16} />
          </button>
          <a className="btn-outline" href="https://www.facebook.com/bauetictclub" target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            Join Us <ExternalLink size={14} />
          </a>
        </motion.div>
      </div>

      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.25)' }}>
        <ArrowDown size={22} />
      </motion.div>
    </section>
  );
}
