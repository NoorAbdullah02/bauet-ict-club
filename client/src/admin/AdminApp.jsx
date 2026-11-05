import { useEffect, useState } from 'react';
import { NavLink, Link, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Eye, ClipboardList, Users, Calendar, Bell, Image, Trophy, FileText, MessageSquare, Mail, Settings, Trash2, LogOut, Sun, Moon, Menu, ExternalLink, Loader2, ChevronRight } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import useStore from '../context/store';
import Login from './Login';
import Dashboard from './Dashboard';
import DataView from './DataView';
import Inbox from './Inbox';
import Trash from './Trash';
import { ConfirmHost } from './ui';
import SettingsView from './SettingsView';
import AdminApplications from '../components/AdminApplications';
import { FEATURES } from './config';
import Newsletter from './Newsletter';
import Visitors from './Visitors';
import FormsAdmin from './FormsAdmin';
import FormEditor from './FormEditor';
import CheckIn from './CheckIn';
import Logo from '../components/Logo';
import { cn } from '../lib/cn';

const NAV = [
  ['Overview', [['/admin', LayoutDashboard, 'Dashboard', true], ['/admin/visitors', Eye, 'Visitors']]],
  ['People', [['/admin/applications', ClipboardList, 'Applications', false, 'pending'], ['/admin/members', Users, 'Committee']]],
  ['Content', [['/admin/events', Calendar, 'Events'], ['/admin/notices', Bell, 'Notices'], ['/admin/gallery', Image, 'Gallery'], ['/admin/achievements', Trophy, 'Achievements'], ['/admin/posts', FileText, 'Posts']]],
  ['System', [['/admin/forms', ClipboardList, 'Forms'], ['/admin/messages', MessageSquare, 'Messages', false, 'unread'], ['/admin/newsletter', Mail, 'Newsletter'], ['/admin/trash', Trash2, 'Trash', false, 'trash'], ['/admin/settings', Settings, 'Settings']]],
];
FEATURES.forEach((f) => {
  const group = NAV.find(([g]) => g === (f.nav || 'Content')) || NAV[2];
  group[1].push([`/admin/${f.type}`, f.icon, `${f.name}s`]);
});
const TITLES = Object.fromEntries(NAV.flatMap(([, items]) => items.map(([to, , label]) => [to, label])));

function Sidebar({ badges, onNavigate }) {
  return (
    <div className="flex h-full flex-col">
      <Link to="/" className="mb-8 block px-2" onClick={onNavigate}>
        <Logo kind="club" height={48} />
        <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted">Admin console</div>
      </Link>
      <nav className="flex-1 space-y-6 overflow-y-auto pr-1">
        {NAV.map(([group, items]) => (
          <div key={group}>
            <div className="mb-2 px-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted">{group}</div>
            <ul className="space-y-1">
              {items.map(([to, Icon, label, end, badge]) => (
                <li key={to}>
                  <NavLink to={to} end={end} onClick={onNavigate}
                    className={({ isActive }) => cn('group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors', isActive ? 'text-white' : 'text-fg2 hover:bg-accent/8 hover:text-fg')}>
                    {({ isActive }) => (<>
                      {isActive && <motion.span layoutId={onNavigate ? 'admin-nav-mobile' : 'admin-nav'} transition={{ type: 'spring', stiffness: 400, damping: 34 }} className="absolute inset-0 rounded-xl shadow-lg" style={{ background: 'var(--grad-btn)' }} />}
                      <Icon size={17} className={cn('relative', !isActive && 'group-hover:text-accent')} />
                      <span className="relative flex-1">{label}</span>
                      {badge && badges[badge] > 0 && <span className={cn('relative rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold', isActive ? 'bg-white/25 text-white' : 'bg-accent/12 text-accent')}>{badges[badge]}</span>}
                    </>)}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="mt-4 rounded-2xl border border-line bg-alt p-4 text-xs leading-5 text-fg2">
        <div className="mb-1 font-semibold text-fg">Need the public site?</div>
        <Link to="/" className="inline-flex items-center gap-1 font-medium text-accent">Open website <ExternalLink size={12} /></Link>
      </div>
    </div>
  );
}

export default function AdminApp() {
  const { user, logout, checkAuth, adminTheme, setAdminTheme, registrations, messages, trash, fetchTrash, fetchRegistrations, fetchMessages } = useStore(useShallow((s) => ({
    user: s.user, logout: s.logout, checkAuth: s.checkAuth, adminTheme: s.adminTheme, setAdminTheme: s.setAdminTheme,
    registrations: s.registrations, messages: s.messages, trash: s.trash, fetchTrash: s.fetchTrash, fetchRegistrations: s.fetchRegistrations, fetchMessages: s.fetchMessages,
  })));
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => { Promise.resolve(checkAuth()).finally(() => setReady(true)); }, []);
  useEffect(() => { if (user) { fetchRegistrations().catch(() => {}); fetchMessages().catch(() => {}); fetchTrash().catch(() => {}); useStore.getState().fetchSessions().catch(() => {}); } }, [user]);
  useEffect(() => setOpen(false), [pathname]);

  // exact page title, else the section the page belongs to (forms/12 -> Forms, events/3/form -> Events)
  const clean = pathname.replace(/\/$/, '');
  const title = TITLES[clean] || TITLES[Object.keys(TITLES).filter((k) => k !== '/admin' && clean.startsWith(`${k}/`)).sort((x, y) => y.length - x.length)[0]] || 'Dashboard';
  useEffect(() => { document.title = `${title} | Admin | BAUET ICT Club`; }, [title]);

  if (!ready) return <div className="grid min-h-screen place-items-center"><Loader2 className="animate-spin text-accent" /></div>;
  if (!user) return <Login />;

  const badges = { pending: registrations.filter((r) => r.status === 'pending').length, unread: messages.filter((m) => !m.is_read).length, trash: trash.items.length };
  const isDark = adminTheme === 'dark';
  const btn = 'grid size-10 place-items-center rounded-full border border-line bg-surface text-fg2 transition hover:border-accent hover:text-accent';

  return (
    <div className="admin-root flex min-h-screen">
      <ConfirmHost />
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-line bg-surface p-5 lg:block"><Sidebar badges={badges} /></aside>

      {/* mobile menu: each child is its own keyed motion element so AnimatePresence can finish the exit and remove the overlay */}
      <AnimatePresence>
        {open && <motion.div key="menu-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} className="fixed inset-0 z-[150] bg-black/40 lg:hidden" />}
      </AnimatePresence>
      <AnimatePresence>
        {open && <motion.aside key="menu-panel" initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', stiffness: 320, damping: 34 }} className="fixed inset-y-0 left-0 z-[160] w-72 border-r border-line bg-surface p-5 lg:hidden"><Sidebar badges={badges} onNavigate={() => setOpen(false)} /></motion.aside>}
      </AnimatePresence>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-line bg-surface/95 px-5 py-3.5 backdrop-blur sm:px-8">
          <div className="flex items-center gap-3">
            <button onClick={() => setOpen(true)} className={cn(btn, 'lg:hidden')} aria-label="Menu"><Menu size={18} /></button>
            <div className="hidden items-center gap-1.5 text-sm text-muted sm:flex"><span>Admin</span><ChevronRight size={14} /><span className="font-semibold text-fg">{title}</span></div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setAdminTheme(isDark ? 'light' : 'dark')} className={btn} aria-label="Toggle theme">{isDark ? <Sun size={16} /> : <Moon size={16} />}</button>
            <div className="flex items-center gap-2.5 rounded-full border border-line bg-surface py-1 pl-1.5 pr-4"><span className="grid size-8 place-items-center rounded-full bg-white ring-1 ring-line"><Logo kind="club" height={18} className="!filter-none" /></span><span className="text-sm font-medium text-fg max-sm:hidden">Admin</span></div>
            <button onClick={logout} className={btn} aria-label="Log out" title="Log out"><LogOut size={16} /></button>
          </div>
        </header>

        <main className="p-5 sm:p-8">
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="applications" element={<AdminApplications />} />
            {['members', 'events', 'notices', 'gallery', 'achievements', 'posts', ...FEATURES.map((f) => f.type)].map((t) => <Route key={t} path={t} element={<DataView type={t} />} />)}
            <Route path="messages" element={<Inbox />} />
            <Route path="newsletter" element={<Newsletter />} />
            <Route path="visitors" element={<Visitors />} />
            <Route path="forms" element={<FormsAdmin />} />
            <Route path="forms/:id" element={<FormEditor kind="form" />} />
            <Route path="events/:id/form" element={<FormEditor kind="event" />} />
            <Route path="events/:id/checkin" element={<CheckIn />} />
            <Route path="trash" element={<Trash />} />
            <Route path="settings" element={<SettingsView />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
