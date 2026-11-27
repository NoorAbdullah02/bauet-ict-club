import { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Sun, Moon, Monitor, Shield, ArrowRight, Download, Search, ChevronDown, Briefcase, Globe2, Swords, Trophy, Library, HelpCircle, IdCard, Languages, Users, Calendar, Home, Info, Megaphone, Code2, Image, Award, Mail, GraduationCap, Facebook } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import Logo from './Logo';
import SearchBox from './SearchBox';
import useStore from '../context/store';
import { cn } from '../lib/cn';
import { useT } from '../lib/i18n';

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

/** The groups in the side menu and in the "More" menu. Every page of the site is reachable from here. */
export const MENU_GROUPS = [
  ['Opportunities', [['/jobs', 'Jobs', Briefcase], ['/jobs/remote', 'Remote jobs', Globe2], ['/contests', 'Contests', Swords], ['/leaderboard', 'Leaderboard', Trophy]]],
  ['The club', [['/notices', 'Notices', Megaphone], ['/projects', 'Projects', Code2], ['/ambassadors', 'Ambassadors', GraduationCap], ['/gallery', 'Gallery', Image], ['/achievements', 'Awards', Award], ['/resources', 'Resources', Library]]],
  ['Help', [['/faq', 'FAQ', HelpCircle], ['/data', 'Club data', Library], ['/ticket', 'Find my ticket', IdCard], ['/contact', 'Contact', Mail], ['/my-card', 'My member card', IdCard]]],
];
const MAIN = [['/', 'Home', Home], ['/about', 'About', Info], ['/events', 'Events', Calendar], ['/team', 'Team', Users]];
const DESKTOP = ['/', '/about', '/events', '/projects', '/team', '/gallery', '/contact'];

/** "More" in the top bar: the pages that do not fit next to the main links. */
function MoreMenu({ t }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (e.key === 'Escape' || (e.type === 'mousedown' && !e.target.closest?.('[data-more]'))) setOpen(false); };
    window.addEventListener('keydown', close); window.addEventListener('mousedown', close);
    return () => { window.removeEventListener('keydown', close); window.removeEventListener('mousedown', close); };
  }, [open]);
  const here = MENU_GROUPS.some(([, items]) => items.some(([to]) => pathname === to || pathname.startsWith(`${to}/`)));
  return (
    <li className="relative" data-more>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu"
        className={cn('flex items-center gap-1 whitespace-nowrap shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors', here || open ? 'text-fg bg-accent/10' : 'text-fg2 hover:text-fg hover:bg-fg/5')}>
        {t('More')} <ChevronDown size={14} className={cn('transition', open && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div role="menu" initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.97 }} transition={{ duration: 0.18 }}
            data-lenis-prevent className="absolute right-0 top-full z-10 mt-3 max-h-[75vh] w-[min(92vw,34rem)] overflow-y-auto overscroll-contain rounded-3xl border border-line bg-surface p-4 shadow-[var(--shadow-xl)]">
            <div className="grid gap-4 sm:grid-cols-3">
              {MENU_GROUPS.map(([g, items]) => (
                <div key={g}>
                  <div className="mb-1.5 px-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">{t(g)}</div>
                  {items.map(([to, label, Icon]) => (
                    <NavLink key={to} to={to} role="menuitem" className={({ isActive }) => cn('flex items-center gap-2.5 rounded-xl px-2 py-2 text-[13px] font-medium transition', isActive ? 'bg-accent/10 text-accent' : 'text-fg2 hover:bg-alt hover:text-fg')}>
                      <Icon size={15} /> {t(label)}
                    </NavLink>
                  ))}
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
              <Link to="/app" role="menuitem" className="inline-flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent/10">
                <Download size={14} /> {t('Get the app')}
              </Link>
              <a href="https://www.facebook.com/bauetictclub" target="_blank" rel="noopener noreferrer" role="menuitem" className="inline-flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-[#1877F2] transition hover:bg-[#1877F2]/10">
                <Facebook size={14} /> Facebook Page
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const { theme, setTheme } = useStore(useShallow((s) => ({ theme: s.theme, setTheme: s.setTheme })));
  const lang = useStore((s) => s.lang);
  const setLang = useStore((s) => s.setLang);
  const t = useT();
  const { pathname } = useLocation();
  const nextTheme = { light: 'dark', dark: 'system', system: 'light' }[theme] || 'light';
  const themeLabel = { light: 'Light theme', dark: 'Dark theme', system: 'Automatic theme (follows your device)' }[theme] || 'Light theme';

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

  const iconBtn = 'grid size-10 lg:size-9 shrink-0 place-items-center rounded-full text-fg2 transition hover:bg-fg/6 hover:text-accent max-lg:border max-lg:border-line max-lg:bg-surface/80';

  return (
    <>
      <div className="scroll-progress" />
      <motion.header initial={{ y: -90 }} animate={{ y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-x-0 top-0 z-[100] flex justify-center px-3 pt-3">
        <nav className={cn('site-nav flex w-full items-center justify-between rounded-full border px-2.5 py-1.5 pl-3.5 transition-all duration-500 backdrop-blur-xl backdrop-saturate-150',
          scrolled ? 'border-line bg-[var(--glass)] shadow-[var(--shadow-lg)]' : 'border-line/65 bg-surface/65 shadow-[var(--shadow-sm)]')}>
          <Link to="/" className="nav-logo flex h-10 lg:h-9 shrink-0 items-center" aria-label="BAUET ICT Club home"><Logo kind="club" height={36} priority /></Link>

          <ul className="hidden items-center gap-0.5 lg:flex">
            {LINKS.filter((l) => DESKTOP.includes(l.to)).map((l) => (
              <li key={l.to} className="shrink-0">
                <NavLink to={l.to} end={l.to === '/'}
                  className={({ isActive }) => cn('relative block whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors', isActive ? 'text-fg font-semibold' : 'text-fg2 hover:text-fg hover:bg-fg/5')}>
                  {({ isActive }) => (<>
                    {isActive && <motion.span layoutId="nav-pill" transition={{ type: 'spring', stiffness: 380, damping: 32 }} className="absolute inset-0 -z-10 rounded-full bg-accent/12 ring-1 ring-accent/25" />}
                    {t(l.label)}
                  </>)}
                </NavLink>
              </li>
            ))}
            <MoreMenu t={t} />
          </ul>

          <div className="nav-actions flex shrink-0 items-center gap-1.5 whitespace-nowrap">
            <button
              type="button"
              onClick={() => setSearching(true)}
              className="flex h-10 w-10 lg:h-9 lg:w-9 xl:w-auto xl:px-3 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-line/80 bg-alt/65 text-fg2 transition hover:border-tech hover:text-tech cursor-pointer"
              aria-label={t('Search the site')}
              title={`${t('Search')} (Ctrl+K)`}
            >
              <Search size={15} className="shrink-0" />
              <kbd className="hidden xl:inline-block font-mono text-[10px] text-muted tracking-tight">Ctrl K</kbd>
            </button>
            <button onClick={() => setTheme(nextTheme)} className={iconBtn} aria-label={`${themeLabel}. Press to change`} title={`${themeLabel}. Press to change`}>
              {theme === 'dark' ? <Moon size={16} /> : theme === 'system' ? <Monitor size={16} /> : <Sun size={16} />}
            </button>
            <Link to="/admin" onMouseEnter={() => import("../admin/AdminApp")} className={cn(iconBtn, 'hidden xl:grid')} aria-label="Admin" title="Admin Console"><Shield size={16} /></Link>
            <Link to="/join" className="btn-join"><span>{t('Join us')}</span><i><ArrowRight size={14} /></i></Link>
            <button onClick={() => setMobileOpen((o) => !o)} className={cn(iconBtn, 'lg:hidden')} aria-label="Menu">
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </nav>
      </motion.header>

      {searching && <SearchBox onClose={() => setSearching(false)} />}
      <AnimatePresence>
        {mobileOpen && (
          <div data-lenis-prevent className="fixed inset-0 z-[120] overscroll-contain lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
            <motion.button type="button" aria-label="Close the menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} className="absolute inset-0 bg-[#06113A]/55 backdrop-blur-sm" />
            <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              className="absolute inset-y-0 right-0 flex w-[min(88vw,22rem)] flex-col overflow-hidden rounded-l-[30px] border-l border-line bg-bg shadow-[var(--shadow-xl)]">
              <div className="m-3 mb-1 flex items-center gap-3 rounded-3xl p-4 text-white shadow-lg" style={{ background: 'linear-gradient(135deg,#1F4FD8,#0B7F9E)' }}>
                <span className="rounded-2xl bg-white px-2.5 py-1.5"><Logo kind="club" height={26} /></span>
                <span className="min-w-0 flex-1"><span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-white/70">{t('Explore')}</span><span className="block truncate text-base font-bold">BAUET ICT Club</span></span>
                <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close the menu" className="grid size-9 place-items-center rounded-full bg-white/15 hover:bg-white/25"><X size={18} /></button>
              </div>
              <div data-lenis-prevent className="flex-1 overflow-y-auto overscroll-contain px-3 pb-3">
                <div className="grid grid-cols-4 gap-2 py-2">
                  {MAIN.map(([to, label, Icon]) => {
                    const on = to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`);
                    return (
                      <Link key={to} to={to} aria-current={on ? 'page' : undefined} className={cn('flex flex-col items-center gap-1 rounded-2xl border px-1 py-3 text-[11px] font-semibold transition', on ? 'border-transparent text-white shadow-md' : 'border-line bg-surface text-fg')} style={on ? { background: 'linear-gradient(135deg,#1F4FD8,#2E7BFF)' } : undefined}>
                        <Icon size={19} className={on ? 'text-white' : 'text-accent'} /> {t(label)}
                      </Link>
                    );
                  })}
                </div>
                {MENU_GROUPS.map(([g, items]) => (
                  <div key={g} className="mt-3">
                    <div className="px-3 pb-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted">{t(g)}</div>
                    {items.map(([to, label, Icon]) => {
                      const on = pathname === to;
                      return (
                        <Link key={to} to={to} aria-current={on ? 'page' : undefined} className={cn('flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[15px] font-semibold transition', on ? 'bg-accent/12 text-accent' : 'text-fg hover:bg-alt')}>
                          <span className={cn('grid size-9 place-items-center rounded-xl', on ? 'bg-accent text-white' : 'bg-alt text-fg2')}><Icon size={18} /></span>
                          <span className="flex-1">{t(label)}</span>
                          {on && <i className="size-2 rounded-full bg-accent" />}
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="border-t border-line p-3">
                <div className="grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')} className="flex flex-col items-center gap-1 rounded-2xl border border-line bg-surface py-2.5 text-[11px] font-semibold text-fg"><Languages size={18} className="text-accent" /> {lang === 'bn' ? 'English' : 'বাংলা'}</button>
                  <button type="button" onClick={() => setTheme(nextTheme)} className="flex flex-col items-center gap-1 rounded-2xl border border-line bg-surface py-2.5 text-[11px] font-semibold text-fg">{theme === 'dark' ? <Moon size={18} className="text-accent" /> : theme === 'system' ? <Monitor size={18} className="text-accent" /> : <Sun size={18} className="text-accent" />} {theme === 'dark' ? 'Dark' : theme === 'system' ? 'Auto' : 'Light'}</button>
                  <Link to="/admin" className="flex flex-col items-center gap-1 rounded-2xl border border-line bg-surface py-2.5 text-[11px] font-semibold text-fg"><Shield size={18} className="text-accent" /> Admin</Link>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Link to="/join" className="btn-primary justify-center !py-3 text-sm">{t('Join us')} <ArrowRight size={15} /></Link>
                  <Link to="/app" className="btn-outline justify-center !py-3 text-sm"><Download size={15} /> {t('Get the app')}</Link>
                </div>
                <a href="https://www.facebook.com/bauetictclub" target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center justify-center gap-2 rounded-2xl border border-line bg-surface py-2.5 text-xs font-semibold text-[#1877F2] hover:bg-alt">
                  <Facebook size={16} /> Facebook Page
                </a>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
