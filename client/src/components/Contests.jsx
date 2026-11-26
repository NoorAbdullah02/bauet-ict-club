import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Swords, Users } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import useStore from '../context/store';
import { useT } from '../lib/i18n';
import { formalDate } from '../lib/format';
import { cn } from '../lib/cn';

const TONE = { open: 'bg-emerald-500/15 text-emerald-600', closed: 'bg-amber-500/15 text-amber-600', finished: 'bg-slate-500/15 text-slate-600' };
export const statusLabel = (c) => (c.status === 'open' && c.deadline && String(c.deadline).slice(0, 10) < new Date(Date.now() + 6 * 3600e3).toISOString().slice(0, 10) ? 'closed' : c.status || 'open');

/** Hackathons and contests: pick one, sign your team up, see the results. */
export default function Contests() {
  const t = useT();
  const list = useStore(useShallow((s) => s.contests)) || [];
  useEffect(() => { useStore.getState().fetchList('contests').catch(() => {}); }, []);
  return (
    <section className="section">
      <div className="container">
        <div className="section-header">
          <div className="section-tag">{t('Compete')}</div>
          <h2 className="section-title">{t('Contests')}</h2>
          <p className="section-desc">Hackathons and coding contests. Make a team, sign up, and win prizes and points.</p>
          <div className="divider" />
        </div>
        {list.length === 0 ? (
          <div className="py-16 text-center text-fg2"><Swords size={44} className="mx-auto mb-3 text-muted" /><p>No contest right now. Check back soon.</p></div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((c, i) => {
              const st = statusLabel(c);
              return (
                <motion.div key={c.id} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: Math.min(i, 6) * 0.05 }}>
                  <Link to={`/contests/${c.id}`} className="group block h-full overflow-hidden rounded-3xl border border-line bg-surface shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                    {c.image_url && <img src={c.image_url} alt="" loading="lazy" decoding="async" className="h-40 w-full object-cover" />}
                    <div className="p-5">
                      <span className={cn('inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide', TONE[st] || TONE.open)}>{st}</span>
                      <h3 className="mt-2 text-xl text-fg">{c.title}</h3>
                      {c.description && <p className="mt-1.5 line-clamp-3 text-sm text-fg2">{c.description}</p>}
                      <div className="mt-3 space-y-1 text-xs text-fg2">
                        {c.start_date && <div className="flex items-center gap-2"><Calendar size={13} className="text-accent" /> {formalDate(c.start_date)}</div>}
                        {c.location && <div className="flex items-center gap-2"><MapPin size={13} className="text-accent" /> {c.location}</div>}
                        <div className="flex items-center gap-2"><Users size={13} className="text-accent" /> Teams of {c.team_min === c.team_max ? c.team_max : `${c.team_min} to ${c.team_max}`}</div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
