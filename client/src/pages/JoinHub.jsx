import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Crown, Users, Megaphone, ArrowUpRight, Check } from 'lucide-react';
import Backdrop3D from '../components/Backdrop3D';
import useStore from '../context/store';

const DOORS = [
  { to: '/join/committee', icon: Crown, tag: 'Lead the club', title: 'Committee Member', text: 'Apply for an executive post. If you’re selected for the session, your photo and role go live on the Team page.',
    perks: ['23 posts to apply for', 'Interview with the committee', 'Featured on the Team page'], variant: 'committee' },
  { to: '/join/general', icon: Users, tag: 'Learn & belong', title: 'General Member', text: 'Join the community: workshops, project teams, contests and a network of builders — no election needed.',
    perks: ['Two-minute sign-up', 'Pick the topics you love', 'Workshops & member perks'], variant: 'general' },
  { to: '/join/ambassador', icon: Megaphone, tag: 'Your department', title: 'Department Ambassador', text: 'Represent the club in your department and get listed on the Ambassadors page with your photo.',
    perks: ['One ambassador per department focus', 'Photo listed publicly', 'Direct line to the committee'], variant: 'orbs' },
];

export default function JoinHub() {
  const settings = useStore((s) => s.settings);
  return (
    <div className="relative min-h-screen overflow-hidden pb-24 pt-36">
      <Backdrop3D variant="orbs" className="absolute inset-x-0 top-0 h-[36rem] opacity-80 [mask-image:linear-gradient(to_bottom,black_30%,transparent)]" />
      <div className="container relative">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <div className="section-tag">{settings?.joinTag || 'Applications open'}</div>
          <h1 className="text-[clamp(2.8rem,7vw,5.5rem)] leading-[0.98] text-fg">
            {settings?.joinTitle || <>Join <span className="bg-clip-text text-transparent grad-anim" style={{ backgroundImage: 'var(--grad-text)' }}>our club.</span></>}
          </h1>
          <p className="mt-6 text-base leading-8 text-fg2">{settings?.joinDesc || 'Two ways in. Pick the one that fits — each has its own page and its own application.'}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {DOORS.map((d, i) => (
            <motion.div key={d.to} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.12, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
              <Link to={d.to} className="spot group relative block h-full overflow-hidden rounded-[36px] border border-line bg-surface/80 p-8 backdrop-blur-xl transition-all duration-500 hover:-translate-y-2 hover:border-accent/60 hover:shadow-[var(--shadow-xl)] sm:p-9">
                <div className="absolute -right-24 -top-24 size-80 rounded-full opacity-50 blur-[90px] transition group-hover:opacity-90" style={{ background: i ? 'rgba(var(--tech-rgb),0.5)' : 'rgba(var(--accent-rgb),0.55)' }} />
                <div className="relative">
                  <span className="grid size-16 place-items-center rounded-3xl" style={{ background: 'var(--grad-btn)', color: 'var(--btn-fg)', boxShadow: 'var(--btn-shadow)' }}><d.icon size={28} /></span>
                  <div className="mt-10 font-mono text-[11px] uppercase tracking-[0.22em] text-tech">{d.tag}</div>
                  <h2 className="mt-2 text-3xl text-fg sm:text-4xl">{d.title}</h2>
                  <p className="mt-4 max-w-md text-sm leading-7 text-fg2">{d.text}</p>
                  <ul className="mt-6 space-y-2.5">
                    {d.perks.map((p) => <li key={p} className="flex items-center gap-2.5 text-sm text-fg2"><span className="grid size-5 place-items-center rounded-full bg-tech/15 text-tech"><Check size={12} /></span>{p}</li>)}
                  </ul>
                  <span className="mt-9 inline-flex items-center gap-2 rounded-full border border-line px-6 py-3 text-sm font-semibold text-fg transition group-hover:border-accent group-hover:bg-accent group-hover:text-white">
                    Apply now <ArrowUpRight size={16} />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
