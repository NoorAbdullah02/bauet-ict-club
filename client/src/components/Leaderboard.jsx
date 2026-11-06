import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Medal, Trophy } from 'lucide-react';
import { api } from '../context/store';
import { useT } from '../lib/i18n';
import { cn } from '../lib/cn';

const TONE = ['from-amber-400 to-yellow-300 text-amber-950', 'from-slate-300 to-slate-100 text-slate-800', 'from-orange-400 to-amber-300 text-orange-950'];

/** Badges and points earned by coming to events. Names are masked (Rahim K.). */
export default function Leaderboard() {
  const t = useT();
  const [d, setD] = useState(null);
  useEffect(() => { api.get('/points/leaderboard').then((r) => setD(r.data)).catch(() => setD(false)); }, []);
  return (
    <section className="section">
      <div className="container max-w-3xl">
        <div className="section-header">
          <div className="section-tag">{t('Points')}</div>
          <h2 className="section-title">{t('Leaderboard')}</h2>
          <p className="section-desc">Every event you come to gives {d?.per_event || 10} points and unlocks badges. Your points show on your ticket page.</p>
          <div className="divider" />
        </div>
        {d === null && <div className="h-64 animate-pulse rounded-3xl bg-alt" />}
        {d === false && <p className="py-10 text-center text-fg2">The leaderboard could not load. Please try again.</p>}
        {d && (
          <>
            <div className="mb-8 flex flex-wrap justify-center gap-2" aria-label={t('Badges')}>
              {d.badges.map((b) => <span key={b.id} title={b.hint} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-fg2"><span aria-hidden>{b.icon}</span>{b.name}<span className="text-muted">· {b.hint}</span></span>)}
            </div>
            {d.top.length === 0 ? (
              <div className="py-12 text-center text-fg2"><Trophy size={44} className="mx-auto mb-3 text-muted" /><p>Nobody has points yet. Come to the next event and be the first!</p></div>
            ) : (
              <ol className="space-y-3">
                {d.top.map((p, i) => (
                  <motion.li key={`${p.rank}-${p.name}-${i}`} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: Math.min(i, 8) * 0.04 }}
                    className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 shadow-sm">
                    <span className={cn('grid size-10 shrink-0 place-items-center rounded-full font-display text-base font-bold', p.rank <= 3 ? `bg-gradient-to-br ${TONE[p.rank - 1]}` : 'bg-alt text-fg2')}>{p.rank <= 3 ? <Medal size={18} /> : p.rank}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-fg">{p.name}</div>
                      <div className="mt-0.5 flex flex-wrap gap-1 text-base" aria-label={t('Badges')}>{p.badges.length ? p.badges.map((b) => <span key={b.id} title={b.name}>{b.icon}</span>) : <span className="text-xs text-muted">{p.events} {p.events === 1 ? 'event' : 'events'}</span>}</div>
                    </div>
                    <div className="text-right"><div className="font-display text-2xl text-accent">{p.points}</div><div className="font-mono text-[10px] uppercase tracking-widest text-muted">{t('Points')}</div></div>
                  </motion.li>
                ))}
              </ol>
            )}
          </>
        )}
      </div>
    </section>
  );
}
