import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Terminal, Globe, Cpu, ShieldCheck, Bot, Palette, ArrowUpRight } from 'lucide-react';
import { useT } from '../lib/i18n';
import Tilt from './Tilt';

const WINGS = [
  {
    id: 'cp',
    title: 'Competitive Programming',
    subtitle: 'Algorithms & Problem Solving',
    desc: 'Regular practice sessions, algorithm camps, national contest preparation and mock contests on Codeforces & VJudge.',
    icon: Terminal,
    tags: ['C++', 'Algorithms', 'ICPC', 'Codeforces'],
    color: 'from-amber-500/20 to-orange-500/5',
    border: 'hover:border-amber-500/40',
  },
  {
    id: 'dev',
    title: 'Software & Web Engineering',
    subtitle: 'Modern Web, App & Cloud',
    desc: 'Hands-on projects with React, Node.js, Flutter, cloud infrastructure, API architectures and open-source contributions.',
    icon: Globe,
    tags: ['React', 'Node.js', 'Flutter', 'PostgreSQL'],
    color: 'from-blue-500/20 to-cyan-500/5',
    border: 'hover:border-blue-500/40',
  },
  {
    id: 'ai',
    title: 'AI & Data Science',
    subtitle: 'Machine Learning & Neural Nets',
    desc: 'Exploring machine learning pipelines, deep neural architectures, natural language processing and computer vision.',
    icon: Cpu,
    tags: ['Python', 'PyTorch', 'Computer Vision', 'LLMs'],
    color: 'from-purple-500/20 to-indigo-500/5',
    border: 'hover:border-purple-500/40',
  },
  {
    id: 'security',
    title: 'Cyber Security & CTF',
    subtitle: 'Ethical Hacking & Defense',
    desc: 'Capture the flag (CTF) training, network penetration fundamentals, vulnerability analysis and system hardening.',
    icon: ShieldCheck,
    tags: ['CTF', 'Web Security', 'Cryptography', 'Linux'],
    color: 'from-emerald-500/20 to-teal-500/5',
    border: 'hover:border-emerald-500/40',
  },
  {
    id: 'robotics',
    title: 'Robotics & Embedded IoT',
    subtitle: 'Hardware Meets Code',
    desc: 'Building intelligent hardware, microcontrollers, Arduino, Raspberry Pi and smart automated campus projects.',
    icon: Bot,
    tags: ['Arduino', 'ESP32', 'Raspberry Pi', 'Sensors'],
    color: 'from-red-500/20 to-rose-500/5',
    border: 'hover:border-red-500/40',
  },
  {
    id: 'media',
    title: 'Creative Media & UI/UX',
    subtitle: 'Design, Branding & Visuals',
    desc: 'UI/UX design systems in Figma, motion graphics, club event branding, videography and digital publication.',
    icon: Palette,
    tags: ['Figma', 'UI/UX', 'After Effects', 'Branding'],
    color: 'from-pink-500/20 to-fuchsia-500/5',
    border: 'hover:border-pink-500/40',
  },
];

export default function ClubWings() {
  const t = useT();

  return (
    <section className="section !py-12">
      <div className="container">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="section-tag !mb-3">{t('Core Focus')}</div>
            <h2 className="text-[clamp(2rem,4vw,3rem)] text-fg">{t('Club Wings & Specialized Domains')}</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-fg2">
              {t('Specialized wings catering to different tech domains, from algorithmic competitive programming to intelligent hardware and UI/UX engineering.')}
            </p>
          </div>
          <Link to="/about" className="group flex items-center gap-1.5 py-2 text-sm font-semibold text-accent">
            {t('Learn about wings')} <ArrowUpRight size={16} className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {WINGS.map((w) => {
            const Icon = w.icon;
            return (
              <Tilt key={w.id} max={4} className={`group relative flex flex-col justify-between overflow-hidden rounded-[24px] border border-line bg-surface/80 p-6 backdrop-blur-md transition-all duration-300 ${w.border}`}>
                <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${w.color} opacity-40 transition-opacity group-hover:opacity-75`} />
                <div className="relative z-10">
                  <div className="flex items-center justify-between">
                    <span className="grid size-12 place-items-center rounded-2xl bg-bg/80 text-fg shadow-sm">
                      <Icon size={22} className="text-accent" />
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted">BAUET ICT</span>
                  </div>
                  <h3 className="mt-5 font-display text-xl font-bold text-fg">{t(w.title)}</h3>
                  <div className="font-mono text-xs text-tech">{w.subtitle}</div>
                  <p className="mt-2.5 text-xs leading-5 text-fg2">{w.desc}</p>
                </div>
                <div className="relative z-10 mt-6 flex flex-wrap gap-1.5 pt-2 border-t border-line/60">
                  {w.tags.map((tag) => (
                    <span key={tag} className="rounded-md bg-bg/60 px-2 py-0.5 font-mono text-[10px] text-muted">
                      {tag}
                    </span>
                  ))}
                </div>
              </Tilt>
            );
          })}
        </div>
      </div>
    </section>
  );
}
