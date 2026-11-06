import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, Briefcase, Building2, ChevronDown, Clock, MapPin, Search, Wallet } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import useStore from '../context/store';
import { useT } from '../lib/i18n';
import { formalDate } from '../lib/format';
import { cn } from '../lib/cn';

const KIND_TONE = { Job: 'bg-accent/10 text-accent', Internship: 'bg-emerald-500/12 text-emerald-600', 'Part-time': 'bg-amber-500/12 text-amber-600', Freelance: 'bg-violet-500/12 text-violet-600', Training: 'bg-sky-500/12 text-sky-600' };
const todayDhaka = () => new Date(Date.now() + 6 * 3600e3).toISOString().slice(0, 10);
/** days left to apply: null = no deadline, negative = closed */
export const daysLeft = (d) => (d ? Math.round((new Date(`${String(d).slice(0, 10)}T00:00:00Z`) - new Date(`${todayDhaka()}T00:00:00Z`)) / 864e5) : null);
const applyHref = (j) => (j.apply_url || (j.apply_email ? `mailto:${j.apply_email}?subject=${encodeURIComponent(`Application: ${j.title}`)}` : '#'));

/** The job and internship board: open positions first, closed ones last. */
export default function Jobs() {
  const t = useT();
  const items = useStore(useShallow((s) => s.jobs)) || [];
  const [kind, setKind] = useState('All');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null);
  useEffect(() => { useStore.getState().fetchList('jobs'); }, []);
  const kinds = useMemo(() => ['All', ...new Set(items.map((j) => j.kind).filter(Boolean))], [items]);
  const list = useMemo(() => items
    .filter((j) => (kind === 'All' || j.kind === kind) && (!q || `${j.title} ${j.company} ${j.location} ${j.description} ${j.kind}`.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => {
      const ca = (daysLeft(a.deadline) ?? 999) < 0, cb = (daysLeft(b.deadline) ?? 999) < 0;
      return ca - cb || (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || new Date(b.created_at) - new Date(a.created_at);
    }), [items, kind, q]);

  return (
    <section className="section">
      <div className="container max-w-4xl">
        <div className="section-header">
          <div className="section-tag">{t('Careers')}</div>
          <h2 className="section-title">{t('Jobs and internships')}</h2>
          <p className="section-desc">Openings shared by the club for BAUET students and alumni. Apply directly with the company.</p>
          <div className="divider" />
        </div>
        <div className="mb-8 flex flex-wrap items-center justify-center gap-3">
          <label className="relative"><Search size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search jobs" aria-label="Search jobs" className="w-64 rounded-full border border-line bg-surface py-2.5 pl-10 pr-4 text-sm text-fg outline-none transition focus:border-tech" /></label>
          {kinds.length > 2 && kinds.map((k) => (
            <button key={k} onClick={() => setKind(k)} aria-pressed={kind === k} className={cn('rounded-full border px-4 py-1.5 text-xs font-medium transition', kind === k ? 'border-fg bg-fg text-bg' : 'border-line text-fg2 hover:border-muted')}>{k}</button>
          ))}
        </div>
        {list.length === 0 ? (
          <div className="py-16 text-center text-fg2"><Briefcase size={44} className="mx-auto mb-3 text-muted" /><p>{items.length ? 'Nothing matches. Try another word.' : 'No openings right now. Check back soon.'}</p></div>
        ) : (
          <ul className="space-y-4">
            {list.map((j, i) => {
              const left = daysLeft(j.deadline);
              const closed = left !== null && left < 0;
              const isOpen = open === j.id;
              return (
                <motion.li key={j.id} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: Math.min(i, 6) * 0.04 }}
                  className={cn('overflow-hidden rounded-3xl border bg-surface shadow-sm', j.featured && !closed ? 'border-accent/50' : 'border-line', closed && 'opacity-70')}>
                  <button type="button" onClick={() => setOpen(isOpen ? null : j.id)} aria-expanded={isOpen} className="flex w-full items-start gap-4 p-5 text-left">
                    {j.image_url ? <img src={j.image_url} alt="" loading="lazy" decoding="async" className="size-14 shrink-0 rounded-2xl border border-line bg-white object-contain p-1" /> : <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-alt text-muted"><Building2 size={22} /></span>}
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide', KIND_TONE[j.kind] || KIND_TONE.Job)}>{j.kind || 'Job'}</span>
                        {j.featured && !closed && <span className="rounded-full bg-amber-400/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-600">Featured</span>}
                        {closed && <span className="rounded-full bg-slate-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">Closed</span>}
                      </span>
                      <span className="mt-1.5 block text-lg font-semibold text-fg">{j.title}</span>
                      <span className="mt-0.5 block text-sm text-fg2">{[j.company, j.work_mode].filter(Boolean).join(' · ')}</span>
                      <span className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg2">
                        {j.location && <span className="flex items-center gap-1.5"><MapPin size={13} className="text-accent" /> {j.location}</span>}
                        {j.salary && <span className="flex items-center gap-1.5"><Wallet size={13} className="text-accent" /> {j.salary}</span>}
                        {j.deadline && <span className="flex items-center gap-1.5"><Clock size={13} className="text-accent" /> {closed ? `Closed ${formalDate(j.deadline)}` : left === 0 ? 'Last day today' : left <= 7 ? `${left} day${left === 1 ? '' : 's'} left` : `Apply before ${formalDate(j.deadline)}`}</span>}
                      </span>
                    </span>
                    <ChevronDown size={18} className={cn('mt-1 shrink-0 text-muted transition', isOpen && 'rotate-180')} />
                  </button>
                  {isOpen && (
                    <div className="border-t border-line px-5 pb-5 pt-4">
                      {j.description ? <p className="whitespace-pre-line text-sm leading-6 text-fg2">{j.description}</p> : <p className="text-sm text-muted">No more details. Use the apply button to ask the company.</p>}
                      {!closed && (j.apply_url || j.apply_email) && (
                        <a href={applyHref(j)} target={j.apply_url ? '_blank' : undefined} rel="noopener noreferrer" className="btn-primary mt-4 inline-flex !px-5 !py-2.5 text-sm">{j.apply_url ? 'Apply now' : 'Apply by e-mail'} <ArrowUpRight size={15} /></a>
                      )}
                    </div>
                  )}
                </motion.li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
