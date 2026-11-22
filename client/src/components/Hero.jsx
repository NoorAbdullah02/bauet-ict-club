import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { TypeAnimation } from 'react-type-animation';
import CountUp from 'react-countup';
import { useInView } from 'react-intersection-observer';
import { ArrowDown, ArrowUpRight, GraduationCap } from 'lucide-react';
import Backdrop3D from './Backdrop3D';
import { useShallow } from 'zustand/react/shallow';
import Logo from './Logo';
import { useT } from '../lib/i18n';
import useStore from '../context/store';


const TAGLINES = [
  'Where Technology Meets Innovation', 1800,
  "Building Tomorrow's Tech Leaders", 1800,
  'Dream. Create. Inspire.', 1800,
  'Empowering Future Engineers', 1800,
];

const rise = (delay) => ({
  initial: { opacity: 0, y: 30 }, animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] },
});

function Stat({ value, label }) {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.4 });
  return (
    <div ref={ref} className="px-5 py-4 text-center sm:px-8">
      <div className="font-mono text-3xl font-medium text-fg sm:text-4xl">
        {inView ? <CountUp end={value} duration={2.4} suffix="+" /> : '0+'}
      </div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted">{label}</div>
    </div>
  );
}

export default function Hero() {
  const t = useT();
  const { events, members } = useStore(useShallow((s) => ({ events: s.events, members: s.members })));
  const root = useRef(null);

  const { scrollYProgress } = useScroll({ target: root, offset: ['start start', 'end start'] });
  const contentY = useTransform(scrollYProgress, [0, 1], ['0%', '14%']);
  const contentOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.2]);
  const orbY = useTransform(scrollYProgress, [0, 1], ['0%', '-30%']);

  const stats = [
    { value: new Set(members.map((m) => m.name)).size || 120, label: 'Members' },
    { value: events.length || 50, label: 'Events' },
    { value: 30, label: 'Projects' },
    { value: 5, label: 'Years' },
  ];

  return (
    <section id="home" ref={root} className="relative flex min-h-screen items-center overflow-hidden">
      <Backdrop3D variant="hero" className="hero-3d absolute inset-0 opacity-90" />

      <motion.div className="hero-orb pointer-events-none absolute -right-32 top-1/4 size-[34rem] rounded-full opacity-40"
        style={{ y: orbY, background: 'radial-gradient(circle, rgba(var(--accent-rgb),0.5), transparent 65%)' }} />
      <div className="hero-orb pointer-events-none absolute -left-40 bottom-10 size-[28rem] rounded-full opacity-30"
        style={{ background: 'radial-gradient(circle, rgba(var(--tech-rgb),0.45), transparent 65%)', animationDelay: '-6s' }} />
      <div className="hero-grid pointer-events-none absolute inset-0" />
      <div className="hero-scrim pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-bg to-transparent" />

      <motion.div style={{ y: contentY, opacity: contentOpacity }} className="container relative z-10 pb-24 pt-36 text-center">
        <motion.div {...rise(0.05)} className="mx-auto mb-7 flex items-center justify-center gap-5">
          <Logo kind="crest" height={64} priority />
          <span className="h-10 w-px bg-line" />
          <Logo kind="club" height={68} priority />
        </motion.div>

        <motion.div {...rise(0.1)}
          className="chip-live mx-auto mb-8 inline-flex items-center gap-2 rounded-full border border-line bg-surface/60 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-tech backdrop-blur">
          <GraduationCap size={14} />
          <span className="max-sm:hidden">Bangladesh Army University of Engineering &amp; Technology</span>
          <span className="sm:hidden">BAUET</span>
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 26, filter: 'blur(14px)', scale: 0.96 }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)', scale: 1 }}
          transition={{ duration: 1.1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="hero-title text-[clamp(3.4rem,11vw,9rem)] font-bold leading-[0.92] text-fg">
          <span className="hero-bauet grad-anim bg-clip-text text-transparent" style={{ backgroundImage: 'var(--grad-text)' }}>BAUET</span>
          <br />
          <span className="hero-ict italic">ICT Club</span>
        </motion.h1>

        <motion.div {...rise(0.5)}
          className="mx-auto mt-8 min-h-[3.25rem] sm:min-h-[2.25rem] h-auto text-lg text-fg2 sm:text-xl">
          <TypeAnimation sequence={TAGLINES} wrapper="span" speed={55} deletionSpeed={70} repeat={Infinity} cursor />
        </motion.div>

        <motion.p {...rise(0.65)} className="mt-3 font-mono text-xs tracking-wider text-muted">
          Bangladesh · Est. 2019
        </motion.p>

        <motion.div {...rise(0.8)} className="mt-10 flex flex-wrap justify-center gap-3">
          <Link className="btn-primary" to="/events">{t('Explore Events')} <ArrowUpRight size={16} /></Link>
          <Link className="btn-outline" to="/join">{t('Join the Club')}</Link>
        </motion.div>

        <motion.div {...rise(1)}
          className="glass-edge mx-auto mt-16 grid max-w-3xl grid-cols-2 divide-line rounded-3xl bg-surface/60 backdrop-blur-md sm:grid-cols-4 sm:divide-x">
          {stats.map((s) => <Stat key={s.label} {...s} />)}
        </motion.div>
      </motion.div>

      <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-muted">
        <Link to="/about" aria-label="Explore"><ArrowDown size={22} /></Link>
      </motion.div>
    </section>
  );
}
