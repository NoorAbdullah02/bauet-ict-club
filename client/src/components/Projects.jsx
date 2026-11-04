import { useMemo, useState } from 'react';
import { thumb } from '../lib/img';
import { motion } from 'framer-motion';
import { ExternalLink, Github, Rocket, Users } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import useStore from '../context/store';
import { cn } from '../lib/cn';

const STATUS_STYLE = { Active: 'bg-tech/15 text-tech', Completed: 'bg-accent/15 text-accent', Planning: 'bg-amber-500/15 text-amber-600' };

export default function Projects() {
  const projects = useStore(useShallow((s) => s.projects)) || [];
  const [status, setStatus] = useState('All');
  const statuses = useMemo(() => ['All', ...new Set(projects.map((p) => p.status).filter(Boolean))], [projects]);
  const list = projects.filter((p) => status === 'All' || p.status === status);

  return (
    <section className="section">
      <div className="container">
        <div className="section-header">
          <div className="section-tag">What we build</div>
          <h2 className="section-title">Club projects</h2>
          <p className="section-desc">Real products built by our members. Want to contribute? Join a team.</p>
          <div className="divider" />
        </div>

        {statuses.length > 2 && (
          <div className="mb-10 flex flex-wrap justify-center gap-2">
            {statuses.map((s) => (
              <button key={s} onClick={() => setStatus(s)} className={cn('rounded-full border px-4 py-1.5 text-xs font-medium transition', status === s ? 'border-fg bg-fg text-bg' : 'border-line text-fg2 hover:border-accent')}>{s}</button>
            ))}
          </div>
        )}

        {list.length === 0 ? (
          <div className="mx-auto max-w-md rounded-3xl border border-line bg-surface p-10 text-center">
            <Rocket className="mx-auto mb-3 text-muted" />
            <p className="text-sm text-fg2">Projects will appear here once they are added from the admin panel.</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 [&>*]:min-w-0">
            {list.map((p, i) => (
              <motion.article key={p.id} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ delay: Math.min(i, 6) * 0.06, duration: 0.5 }}
                className="spot group flex flex-col overflow-hidden rounded-[var(--radius)] border border-line bg-surface">
                <div className="relative aspect-[16/9] overflow-hidden bg-alt">
                  {p.image_url
                    ? <img loading="lazy" decoding="async" src={thumb(p.image_url, 800)} alt={p.title} className="size-full object-cover transition duration-700 group-hover:scale-105" />
                    : <div className="grid size-full place-items-center" style={{ background: 'var(--grad-btn)' }}><Rocket size={34} color="#fff" /></div>}
                  {p.status && <span className={cn('absolute left-3 top-3 rounded-full px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider backdrop-blur', STATUS_STYLE[p.status] || 'bg-surface text-fg2')}>{p.status}</span>}
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="text-xl text-fg">{p.title}</h3>
                  {p.summary && <p className="mt-2 text-sm leading-7 text-fg2">{p.summary}</p>}
                  {p.tech && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {p.tech.split(',').map((t) => t.trim()).filter(Boolean).map((t) => <span key={t} className="rounded-md bg-accent/10 px-2 py-0.5 font-mono text-[11px] text-accent">{t}</span>)}
                    </div>
                  )}
                  <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                    <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted">{p.team && <><Users size={13} className="shrink-0" /><span className="truncate">{p.team}</span></>}</span>
                    <span className="flex shrink-0 gap-2">
                      {p.repo_url && <a href={p.repo_url} target="_blank" rel="noopener noreferrer" aria-label="Source code" className="grid size-9 place-items-center rounded-full border border-line text-fg2 transition hover:border-accent hover:text-accent"><Github size={15} /></a>}
                      {p.live_url && <a href={p.live_url} target="_blank" rel="noopener noreferrer" aria-label="Live demo" className="grid size-9 place-items-center rounded-full border border-line text-fg2 transition hover:border-accent hover:text-accent"><ExternalLink size={15} /></a>}
                    </span>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
