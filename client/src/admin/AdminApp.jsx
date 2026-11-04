import { useEffect, useState } from 'react';
import { NavLink, Link, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, ClipboardList, Users, Calendar, Bell, Image, Trophy, FileText, MessageSquare, Settings, LogOut, Sun, Moon, Menu, X, ExternalLink, Loader2 } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import useStore from '../context/store';
import Login from './Login';
import Dashboard from './Dashboard';
import DataView from './DataView';
import Inbox from './Inbox';
import SettingsView from './SettingsView';
import AdminApplications from '../components/AdminApplications';
import Logo from '../components/Logo';
import { cn } from '../lib/cn';

const NAV = [
  ['Overview', [['/admin', LayoutDashboard, 'Dashboard', true]]],
  ['People', [['/admin/applications', ClipboardList, 'Applications'], ['/admin/members', Users, 'Committee']]],
  ['Content', [['/admin/events', Calendar, 'Events'], ['/admin/notices', Bell, 'Notices'], ['/admin/gallery', Image, 'Gallery'], ['/admin/achievements', Trophy, 'Achievements'], ['/admin/posts', FileText, 'Posts']]],
  ['System', [['/admin/messages', MessageSquare, 'Messages'], ['/admin/settings', Settings, 'Settings']]],
];

function Sidebar({ onNavigate }) {
  return (
    <div className="flex h-full flex-col">
      <Link to="/" className="mb-8 block px-2"><Logo kind="club" height={46} /><div className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Admin console</div></Link>
      <nav className="flex-1 space-y-6 overflow-y-auto">
        {NAV.map(([group, items]) => (
          <div key={group}>
            <div className="mb-2 px-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted">{group}</div>
            <ul className="space-y-1">
              {items.map(([to, Icon, label, end]) => (
                <li key={to}>
                  <NavLink to={to} end={end} onClick={onNavigate}
                    className={({ isActive }) => cn('group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition', isActive ? 'text-fg' : 'text-fg2 hover:bg-accent/5 hover:text-fg')}>
                    {({ isActive }) => (<>
                      {isActive && <motion.span layoutId="admin-nav" transition={{ type: 'spring', stiffness: 400, damping: 34 }} className="absolute inset-0 rounded-xl bg-accent/12 ring-1 ring-accent/30" />}
                      <Icon size={17} className={cn('relative transition', isActive ? 'text-accent' : 'group-hover:text-accent')} /><span className="relative">{label}</span>
                    </>)}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
}

export default function AdminApp() {
  const { user, logout, checkAuth, theme, setTheme } = useStore(useShallow((s) => ({ user: s.user, logout: s.logout, checkAuth: s.checkAuth, theme: s.theme, setTheme: s.setTheme })));
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => { Promise.resolve(checkAuth()).finally(() => setReady(true)); }, []);
  useEffect(() => setOpen(false), [pathname]);

  if (!ready) return <div className="grid min-h-screen place-items-center"><Loader2 className="animate-spin text-accent" /></div>;
  if (!user) return <Login />;

  const isDark = theme === 'dark';
  const btn = 'grid size-10 place-items-center rounded-full border border-line bg-surface/70 text-fg2 transition hover:border-tech hover:text-tech';

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-line bg-[var(--glass)] p-5 backdrop-blur-2xl lg:block"><Sidebar /></aside>

      <AnimatePresence>
        {open && (<>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-sm lg:hidden" />
          <motion.aside initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', stiffness: 320, damping: 34 }} className="fixed inset-y-0 left-0 z-[160] w-72 border-r border-line bg-bg p-5 lg:hidden"><Sidebar onNavigate={() => setOpen(false)} /></motion.aside>
        </>)}
      </AnimatePresence>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-line bg-[var(--glass)] px-5 py-3.5 backdrop-blur-2xl sm:px-8">
          <button onClick={() => setOpen(true)} className={cn(btn, 'lg:hidden')} aria-label="Menu"><Menu size={18} /></button>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/" className="mr-1 hidden items-center gap-1.5 text-xs font-medium text-fg2 hover:text-accent sm:flex">View site <ExternalLink size={13} /></Link>
            <button onClick={() => setTheme(isDark ? 'light' : 'dark')} className={btn} aria-label="Toggle theme">{isDark ? <Sun size={16} /> : <Moon size={16} />}</button>
            <div className="flex items-center gap-2.5 rounded-full border border-line bg-surface/70 py-1 pl-1 pr-4">
              <span className="grid size-8 place-items-center rounded-full text-xs font-bold uppercase" style={{ background: 'var(--grad-btn)', color: 'var(--btn-fg)' }}>{user.username?.[0]}</span>
              <span className="text-sm text-fg max-sm:hidden">{user.username}</span>
            </div>
            <button onClick={logout} className={btn} aria-label="Log out"><LogOut size={16} /></button>
          </div>
        </header>

        <main className="relative p-5 sm:p-8">
          <div className="pointer-events-none absolute -top-10 right-0 size-[28rem] rounded-full bg-accent/15 blur-[120px]" />
          <div className="relative">
            <Routes>
              <Route index element={<Dashboard />} />
              <Route path="applications" element={<AdminApplications />} />
              {['members', 'events', 'notices', 'gallery', 'achievements', 'posts'].map((t) => <Route key={t} path={t} element={<DataView type={t} />} />)}
              <Route path="messages" element={<Inbox />} />
              <Route path="settings" element={<SettingsView />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}
