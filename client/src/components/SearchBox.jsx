import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, X, Calendar, Megaphone, User, Code2, HelpCircle, Library, Loader2, IdCard, Award, UserPlus, Smartphone, Shield, ArrowRight, CornerDownLeft } from 'lucide-react';
import { api } from '../context/store';
import { useT } from '../lib/i18n';

const KINDS = {
  event: ['Events', Calendar],
  notice: ['Notices', Megaphone],
  member: ['People', User],
  project: ['Projects', Code2],
  faq: ['Questions', HelpCircle],
  resource: ['Resources', Library],
  action: ['Action', ArrowRight],
};

const DEFAULT_ACTIONS = [
  { type: 'action', id: 'my-card', title: 'Find My Member Card', sub: 'Lookup card by student ID', path: '/my-card', icon: IdCard },
  { type: 'action', id: 'join', title: 'Join BAUET ICT Club', sub: 'Apply for committee, general or ambassador', path: '/join', icon: UserPlus },
  { type: 'action', id: 'cert', title: 'Verify Certificate', sub: 'Check certificate authenticity', path: '/certificate', icon: Award },
  { type: 'action', id: 'events', title: 'Upcoming Events & Workshops', sub: 'Browse and register for events', path: '/events', icon: Calendar },
  { type: 'action', id: 'notices', title: 'Club Notices & News', sub: 'Important announcements', path: '/notices', icon: Megaphone },
  { type: 'action', id: 'app', title: 'Download Android App', sub: 'Get latest APK for phone', path: '/app', icon: Smartphone },
  { type: 'action', id: 'admin', title: 'Admin Console', sub: 'Sign in to club dashboard', path: '/admin', icon: Shield },
];

export default function SearchBox({ onClose }) {
  const t = useT();
  const [q, setQ] = useState('');
  const [rows, setRows] = useState(null);
  const [filter, setFilter] = useState('all');
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(0);
  const nav = useNavigate();
  const input = useRef(null);
  const seq = useRef(0);

  useEffect(() => {
    input.current?.focus();
  }, []);

  const isNumericId = /^\d{4,12}$/.test(q.trim());

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setRows(null);
      return undefined;
    }

    const mine = ++seq.current;
    setBusy(true);

    const timer = setTimeout(() => {
      api.get('/search', { params: { q: term } })
        .then((r) => {
          if (mine !== seq.current) return;
          let results = Array.isArray(r.data) ? r.data : [];

          if (isNumericId) {
            results = [
              {
                type: 'action',
                id: `card-id-${term}`,
                title: `Open Member Card for ID: ${term}`,
                sub: 'Click to view verified card directly',
                path: `/my-card?id=${encodeURIComponent(term)}`,
                icon: IdCard,
              },
              ...results,
            ];
          }

          setRows(results);
          setActive(0);
        })
        .catch(() => {
          if (mine === seq.current) setRows([]);
        })
        .finally(() => {
          if (mine === seq.current) setBusy(false);
        });
    }, 200);

    return () => clearTimeout(timer);
  }, [q, isNumericId]);

  const displayedRows = (rows || DEFAULT_ACTIONS).filter((r) => {
    if (filter === 'all') return true;
    if (filter === 'actions') return r.type === 'action';
    return r.type === filter;
  });

  const go = (r) => {
    onClose();
    nav(r.path);
  };

  const onKey = (e) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown' && displayedRows.length > 0) {
      e.preventDefault();
      setActive((a) => Math.min(displayedRows.length - 1, a + 1));
    } else if (e.key === 'ArrowUp' && displayedRows.length > 0) {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter' && displayedRows[active]) {
      e.preventDefault();
      go(displayedRows[active]);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[400] flex items-end sm:items-start justify-center p-0 sm:p-4 sm:pt-[10vh]" onKeyDown={onKey}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      <motion.div
        role="dialog"
        aria-label="Search the site"
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20 }}
        className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[28px] border border-line bg-surface/95 shadow-[var(--shadow-xl)] backdrop-blur-xl sm:rounded-[28px]"
      >
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          {busy ? <Loader2 size={18} className="animate-spin text-muted" /> : <Search size={18} className="text-muted" />}
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('Search events, notices, people, projects, student ID…')}
            aria-label="Search"
            className="min-w-0 flex-1 bg-transparent text-base text-fg outline-none placeholder:text-muted"
          />
          <div className="hidden items-center gap-1.5 sm:flex">
            <kbd className="rounded border border-line bg-bg px-1.5 py-0.5 font-mono text-[10px] text-muted">ESC</kbd>
          </div>
          <button onClick={onClose} aria-label="Close search" className="grid size-8 place-items-center rounded-full text-fg2 hover:bg-accent/10 hover:text-accent">
            <X size={16} />
          </button>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-line px-4 py-2 text-xs">
          {[
            ['all', 'All'],
            ['action', 'Shortcuts'],
            ['event', 'Events'],
            ['member', 'People'],
            ['notice', 'Notices'],
            ['project', 'Projects'],
          ].map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => { setFilter(k); setActive(0); }}
              className={`shrink-0 rounded-full px-3 py-1 font-mono text-[11px] transition ${filter === k ? 'bg-accent text-white font-medium' : 'bg-surface text-muted hover:text-fg'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div data-lenis-prevent className="max-h-[58vh] overflow-y-auto overscroll-contain p-2">
          {rows === null && (
            <div className="px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-muted">
              {t('Quick Actions & Shortcuts')}
            </div>
          )}

          {rows?.length === 0 && !busy && (
            <div className="px-4 py-10 text-center">
              <p className="text-sm text-fg font-medium">{t('No results found for')} &ldquo;{q.trim()}&rdquo;</p>
              <p className="mt-1 text-xs text-muted">{t('Try searching with a student ID, event title, or member name.')}</p>
            </div>
          )}

          {displayedRows.map((r, i) => {
            const [label, FallbackIcon] = KINDS[r.type] || ['Result', Search];
            const Icon = r.icon || FallbackIcon;
            const isSelected = i === active;
            return (
              <button
                key={`${r.type}-${r.id}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(r)}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition ${isSelected ? 'bg-accent/15' : 'hover:bg-surface'}`}
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-alt text-accent">
                  <Icon size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-fg">{r.title}</span>
                  {r.sub && <span className="block truncate text-xs text-muted">{r.sub}</span>}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted">{label}</span>
                  {isSelected && <CornerDownLeft size={14} className="text-accent" />}
                </span>
              </button>
            );
          })}
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
