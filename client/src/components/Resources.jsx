import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, BookOpen, Code2, FileText, Library, Link2, PlayCircle, Presentation, Search } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import useStore from '../context/store';
import { cn } from '../lib/cn';

const KIND = { Slides: [Presentation, 'text-accent bg-accent/10'], Notes: [FileText, 'text-amber-600 bg-amber-500/10'], Tutorial: [BookOpen, 'text-tech bg-tech/10'], Video: [PlayCircle, 'text-rose-500 bg-rose-500/10'], Code: [Code2, 'text-violet-500 bg-violet-500/10'], Link: [Link2, 'text-sky-600 bg-sky-500/10'] };

/** The resource library: slides, notes, tutorials and links, with search and categories. */
export default function Resources() {
  const items = useStore(useShallow((s) => s.resources)) || [];
  const [cat, setCat] = useState('All');
  const [q, setQ] = useState('');
  useEffect(() => { useStore.getState().fetchList('resources').catch(() => {}); }, []);
  const cats = useMemo(() => ['All', ...new Set(items.map((r) => r.category).filter(Boolean))], [items]);
  const list = items.filter((r) => (cat === 'All' || r.category === cat) && (!q || `${r.title} ${r.description} ${r.category} ${r.kind}`.toLowerCase().includes(q.toLowerCase())));

  return (
    <section className="section">
      <div className="container">
        <div className="section-header">
          <div className="section-tag">Learn</div>
          <h2 className="section-title">Resource library</h2>
          <p className="section-desc">Slides, notes and tutorials from our workshops, all in one place.</p>
          <div className="divider" />
        </div>

        <div className="mb-8 flex flex-wrap items-center justify-center gap-3">
          <label className="relative"><Search size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search resources" aria-label="Search resources" className="w-64 rounded-full border border-line bg-surface py-2.5 pl-10 pr-4 text-sm text-fg outline-none transition focus:border-tech" /></label>
          {cats.length > 2 && cats.map((c) => (
            <button key={c} onClick={() => setCat(c)} aria-pressed={cat === c} className={cn('rounded-full border px-4 py-1.5 text-xs font-medium transition', cat === c ? 'border-fg bg-fg text-bg' : 'border-line text-fg2 hover:border-muted')}>{c}</button>
          ))}
        </div>

        {list.length === 0 ? (
          <div className="py-16 text-center text-fg2"><Library size={44} className="mx-auto mb-3 text-muted" /><p>{items.length ? 'Nothing matches. Try another word.' : 'No resources yet. Check back soon.'}</p></div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((r, i) => {
              const [Icon, tone] = KIND[r.kind] || KIND.Link;
              return (
                <motion.a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer" initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: Math.min(i, 6) * 0.05 }}
                  className="group flex flex-col rounded-3xl border border-line bg-surface p-5 shadow-[var(--shadow-sm)] transition hover:-translate-y-1 hover:border-tech/50 hover:shadow-[var(--shadow-lg)]">
                  <div className="flex items-center justify-between"><span className={cn('grid size-11 place-items-center rounded-2xl', tone)}><Icon size={20} /></span><span className="font-mono text-[10px] uppercase tracking-wider text-muted">{r.kind || 'Link'}</span></div>
                  <h3 className="mt-4 text-lg leading-snug text-fg">{r.title}</h3>
                  {r.description && <p className="mt-1.5 line-clamp-3 text-sm text-fg2">{r.description}</p>}
                  <div className="mt-auto flex items-center justify-between pt-4 text-xs">
                    {r.category ? <span className="rounded-full bg-alt px-2.5 py-1 text-fg2">{r.category}</span> : <span />}
                    <span className="inline-flex items-center gap-1 font-semibold text-tech">Open <ArrowUpRight size={14} className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></span>
                  </div>
                </motion.a>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
