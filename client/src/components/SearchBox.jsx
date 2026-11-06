import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, X, Calendar, Megaphone, User, Code2, HelpCircle, Library, Loader2 } from 'lucide-react';
import { api } from '../context/store';

const KINDS = { event: ['Events', Calendar], notice: ['Notices', Megaphone], member: ['People', User], project: ['Projects', Code2], faq: ['Questions', HelpCircle], resource: ['Resources', Library] };

/** One search box for the whole site: events, notices, people, projects and FAQ. Opens with the search button, or with "/" or Ctrl+K. */
export default function SearchBox({ onClose }) {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState(null); // null = nothing searched yet
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(0);
  const nav = useNavigate();
  const input = useRef(null);
  const seq = useRef(0);

  useEffect(() => { input.current?.focus(); }, []);
  useEffect(() => {
    const t = q.trim();
    if (t.length < 2) { setRows(null); return undefined; }
    const mine = ++seq.current;
    setBusy(true);
    const timer = setTimeout(() => {
      api.get('/search', { params: { q: t } }).then((r) => { if (mine === seq.current) { setRows(r.data); setActive(0); } }).catch(() => { if (mine === seq.current) setRows([]); }).finally(() => { if (mine === seq.current) setBusy(false); });
    }, 220);
    return () => clearTimeout(timer);
  }, [q]);

  const go = (r) => { onClose(); nav(r.path); };
  const onKey = (e) => {
    if (e.key === 'Escape') onClose();
    else if (e.key === 'ArrowDown' && rows?.length) { e.preventDefault(); setActive((a) => Math.min(rows.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp' && rows?.length) { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Enter' && rows?.[active]) go(rows[active]);
  };

  return createPortal(
    <div className="fixed inset-0 z-[400] grid items-start justify-items-center p-4 pt-[12vh]" onKeyDown={onKey}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} className="absolute inset-0 bg-black/55 backdrop-blur-sm" />
      <motion.div role="dialog" aria-label="Search the site" initial={{ opacity: 0, y: -12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-line bg-bg shadow-[var(--shadow-xl)]">
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          {busy ? <Loader2 size={18} className="animate-spin text-muted" /> : <Search size={18} className="text-muted" />}
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search events, notices, people, projects…" aria-label="Search"
            className="min-w-0 flex-1 bg-transparent text-base text-fg outline-none placeholder:text-muted" />
          <button onClick={onClose} aria-label="Close search" className="grid size-8 place-items-center rounded-full text-fg2 hover:bg-accent/10 hover:text-accent"><X size={16} /></button>
        </div>
        <div className="max-h-[56vh] overflow-y-auto p-2">
          {rows === null && <p className="px-4 py-8 text-center text-sm text-muted">Type at least two letters. Try a workshop name, a person or a question.</p>}
          {rows?.length === 0 && !busy && <p className="px-4 py-8 text-center text-sm text-muted">Nothing found for “{q.trim()}”.</p>}
          {rows?.map((r, i) => {
            const [label, Icon] = KINDS[r.type] || ['Result', Search];
            return (
              <button key={`${r.type}-${r.id}`} onMouseEnter={() => setActive(i)} onClick={() => go(r)}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition ${i === active ? 'bg-accent/10' : ''}`}>
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-alt text-accent"><Icon size={16} /></span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-fg">{r.title}</span>{r.sub && <span className="block truncate text-xs text-muted">{r.sub}</span>}</span>
                <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted">{label}</span>
              </button>
            );
          })}
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
