import { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Sun, Moon, Shield, ArrowRight, Download, Search } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import Logo from './Logo';
import SearchBox from './SearchBox';
import useStore from '../context/store';
import { cn } from '../lib/cn';

export const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/events', label: 'Events' },
  { to: '/notices', label: 'Notices' },
  { to: '/projects', label: 'Projects' },
  { to: '/team', label: 'Team' },
  { to: '/ambassadors', label: 'Ambassadors' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/achievements', label: 'Awards' },
  { to: '/contact', label: 'Contact' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const { theme, setTheme } = useStore(useShallow((s) => ({ theme: s.theme, setTheme: s.setTheme })));
  const { pathname } = useLocation();
  const isDark = theme === 'dark';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => setMobileOpen(false), [pathname]);
  useEffect(() => { // "/" or Ctrl+K opens the search (not while typing in a field)
    const k = (e) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
      if ((e.key === '/' && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) { e.preventDefault(); setSearching(true); }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);

  const iconBtn = 'grid size-10 place-items-center rounded-full border border-line bg-surface/60 text-fg2 backdrop-blur transition hover:border-tech hover:text-tech';

  return (
    <>
      <div className="scroll-progress" />
      <motion.header initial={{ y: -90 }} animate={{ y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-x-0 top-0 z-[100] flex justify-center px-3 pt-3">
        <nav className={cn('flex w-full max-w-6xl items-center justify-between rounded-full border px-3 py-2 pl-4 transition-all duration-500',
          scrolled ? 'border-line bg-[var(--glass)] shadow-[var(--shadow-lg)] backdrop-blur-xl backdrop-saturate-150' : 'border-transparent bg-transparent')}>
          <Link to="/" className="nav-logo flex shrink-0 items-center" aria-label="BAUET ICT Club home"><Logo kind="club" height={42} priority /></Link>

          <ul className="hidden items-center gap-0.5 lg:flex">
            {LINKS.map((l) => (
              <li key={l.to}>
                <NavLink to={l.to} end={l.to === '/'}
                  className={({ isActive }) => cn('relative block rounded-full px-3 py-2 text-[13px] font-medium transition-colors', isActive ? 'text-fg' : 'text-fg2 hover:text-fg')}>
                  {({ isActive }) => (<>
                    {isActive && <motion.span layoutId="nav-pill" transition={{ type: 'spring', stiffness: 380, damping: 32 }} className="absolute inset-0 -z-10 rounded-full bg-accent/10 ring-1 ring-accent/30" />}
                    {l.label}
                  </>)}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="nav-actions flex shrink-0 items-center gap-2">
            <button onClick={() => setSearching(true)} className={iconBtn} aria-label="Search the site" title="Search ( / )"><Search size={16} /></button>
            <button onClick={() => setTheme(isDark ? 'light' : 'dark')} className={iconBtn} aria-label="Toggle theme">
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <Link to="/app" className={cn(iconBtn, 'max-sm:hidden')} aria-label="Download the app" title="Download the app"><Download size={16} /></Link>
            <Link to="/admin" onMouseEnter={() => import("../admin/AdminApp")} className={cn(iconBtn, 'max-sm:hidden')} aria-label="Admin"><Shield size={16} /></Link>
            <Link to="/join" className="btn-join"><span>Join us</span><i><ArrowRight size={14} /></i></Link>
            <button onClick={() => setMobileOpen((o) => !o)} className={cn(iconBtn, 'lg:hidden')} aria-label="Menu">
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </nav>
      </motion.header>

      {searching && <SearchBox onClose={() => setSearching(false)} />}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0, clipPath: 'circle(0% at 90% 5%)' }} animate={{ opacity: 1, clipPath: 'circle(150% at 90% 5%)' }} exit={{ opacity: 0, clipPath: 'circle(0% at 90% 5%)' }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="fixed inset-0 z-[99] flex flex-col justify-center gap-1 overflow-y-auto bg-bg px-8 py-24">
            {[...LINKS, { to: '/join', label: 'Join the Club' }, { to: '/app', label: 'Download the App' }, { to: '/admin', label: 'Admin' }].map((l, i) => (
              <motion.div key={l.to} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 + i * 0.045 }}>
                <Link to={l.to} className="flex items-baseline gap-4 border-b border-line py-3 font-display text-3xl font-semibold text-fg">
                  <span className="font-mono text-xs text-tech">{String(i + 1).padStart(2, '0')}</span>{l.label}
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
