import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Target, Eye, Rocket, Code, Users, Trophy, BookOpen, Lightbulb, Cpu, Globe } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import useStore from '../context/store';
import Tilt from './Tilt';
import { cn } from '../lib/cn';

const fadeUp = {
  hidden: { opacity: 0, y: 36 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { duration: 0.7, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] } }),
};

const cards = [
  { icon: Target, title: 'Our Mission', key: 'mission', n: '01' },
  { icon: Eye, title: 'Our Vision', key: 'vision', n: '02' },
  { icon: Rocket, title: 'Our Goal', key: 'goal', n: '03' },
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
  const { settings } = useStore(useShallow((s) => ({ settings: s.settings })));
  const [ref, inView] = useInView({ threshold: 0.08, triggerOnce: true });
  const state = inView ? 'visible' : 'hidden';

  return (
    <section id="about" className="section" ref={ref}>
      <div className="container">
        <motion.div className="section-header" initial="hidden" animate={state} variants={fadeUp} custom={0}>
          <div className="section-tag">Who We Are</div>
          <h2 className="section-title">About Our Club</h2>
          <p className="section-desc">{settings?.aboutText}</p>
          <div className="divider" />
        </motion.div>

        <div className="mb-20 grid gap-5 md:grid-cols-3">
          {cards.map((c, i) => (
            <motion.div key={c.key} custom={i + 1} initial="hidden" animate={state} variants={fadeUp}>
              <Tilt className={cn(
                'group h-full rounded-[var(--radius)] border border-line bg-surface p-8 transition-all duration-500',
                'hover:-translate-y-1 hover:border-accent/50 hover:shadow-[var(--shadow-lg)]',
                i === 1 && 'md:mt-8'
              )}>
                <div className="mb-10 flex items-start justify-between">
                  <span className="grid size-12 place-items-center rounded-2xl bg-accent/10 text-accent ring-1 ring-accent/20 transition group-hover:scale-110">
                    <c.icon size={22} />
                  </span>
                  <span className="font-mono text-xs text-muted">{c.n}</span>
                </div>
                <h3 className="mb-3 text-2xl text-fg">{c.title}</h3>
                <p className="text-sm leading-7 text-fg2">{settings?.[c.key]}</p>
              </Tilt>
            </motion.div>
          ))}
        </div>

        <motion.div initial="hidden" animate={state} variants={fadeUp} custom={4} className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h3 className="text-3xl text-fg">What We Do</h3>
            <p className="mt-1 text-sm text-muted">Activities that shape future tech leaders</p>
          </div>
          <span className="hidden h-px flex-1 bg-line sm:block" />
        </motion.div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <motion.div key={f.label} custom={i + 5} initial="hidden" animate={state} variants={fadeUp}
              className="spot group flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 transition duration-300 hover:-translate-y-1 hover:border-accent/50">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-tech/10 text-tech transition group-hover:bg-tech group-hover:text-bg">
                <f.icon size={18} />
              </span>
              <div>
                <div className="text-sm font-semibold text-fg">{f.label}</div>
                <div className="text-xs text-muted">{f.desc}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
