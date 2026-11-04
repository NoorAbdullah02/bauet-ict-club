import { useMemo, useState } from 'react';
import { thumb } from '../lib/img';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Megaphone, ArrowUpRight } from 'lucide-react';
import useStore from '../context/store';
import PageShell from '../components/PageShell';
import { sessionRank, slug, isAmbassador } from '../lib/sessions';
import { cn } from '../lib/cn';

const initials = (n) => n.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

export default function Ambassadors() {
  const members = useStore((s) => s.members);
  const [dept, setDept] = useState('all');
  const [sess, setSess] = useState(null);

  const all = useMemo(() => members.filter((m) => isAmbassador(m.position) && m.active !== false), [members]);
  const sessions = useMemo(() => [...new Set(all.map((m) => m.committee_session).filter(Boolean))].sort((a, b) => sessionRank(b) - sessionRank(a)), [all]);
  const active = sess && sessions.includes(sess) ? sess : sessions[0];
  const inSession = all.filter((m) => m.committee_session === active);
  const depts = [...new Set(inSession.map((m) => m.department))];
  const list = inSession.filter((m) => dept === 'all' || m.department === dept);

  return (
    <PageShell>
      <section className="section">
        <div className="container">
          <div className="section-header">
            <div className="section-tag">Our voices on campus</div>
            <h1 className="section-title">Department Ambassadors</h1>
            <p className="section-desc">Students who represent the ICT Club in their departments.</p>
            <div className="divider" />
          </div>

          {all.length === 0 ? (
            <div className="mx-auto max-w-lg rounded-[28px] border border-line bg-surface p-10 text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-2xl text-white" style={{ background: 'var(--grad-btn)' }}><Megaphone size={24} /></span>
              <h3 className="mt-5 text-2xl text-fg">Ambassadors will appear here</h3>
              <p className="mt-2 text-sm leading-7 text-fg2">Be the first to represent your department.</p>
              <Link to="/join/ambassador" className="btn-primary mt-6">Become an ambassador <ArrowUpRight size={16} /></Link>
            </div>
          ) : (<>
            <div className="mb-4 flex flex-wrap justify-center gap-2.5">
              {sessions.map((s) => <button key={slug(s)} onClick={() => { setSess(s); setDept('all'); }} className={cn('rounded-full border px-5 py-2.5 text-sm font-semibold transition', s === active ? 'border-accent bg-accent text-white shadow-lg' : 'border-line bg-surface text-fg2 hover:border-accent hover:text-accent')}>{s}</button>)}
            </div>
            <div className="mb-10 flex flex-wrap justify-center gap-2">
              {depts.length > 1 && ['all', ...depts].map((d) => <button key={d} onClick={() => setDept(d)} className={cn('rounded-full border px-4 py-1.5 text-xs font-medium transition', dept === d ? 'border-fg bg-fg text-bg' : 'border-line text-fg2 hover:border-accent')}>{d === 'all' ? 'All departments' : d}</button>)}
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {list.map((m, i) => (
                <motion.div key={m.id} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: Math.min(i, 8) * 0.05 }}
                  className="spot overflow-hidden rounded-3xl border border-line bg-surface text-center transition hover:-translate-y-1.5 hover:shadow-[var(--shadow-lg)]">
                  <div className="aspect-[4/4.2] w-full bg-alt">
                    {m.image_url ? <img src={thumb(m.image_url, 480)} alt={m.name} loading="lazy" decoding="async" className="size-full object-cover" />
                      : <div className="grid size-full place-items-center font-display text-5xl text-accent" style={{ background: 'var(--accent-light)' }}>{initials(m.name)}</div>}
                  </div>
                  <div className="p-4">
                    <h3 className="font-display text-lg leading-tight text-fg">{m.name}</h3>
                    <span className="mt-2 inline-block rounded-full bg-tech/12 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-tech">{m.department} Ambassador</span>
                    {m.batch && <div className="mt-1.5 text-xs text-muted">{m.batch} batch</div>}
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="mt-12 text-center"><Link to="/join/ambassador" className="btn-outline">Become an ambassador <ArrowUpRight size={15} /></Link></div>
          </>)}
        </div>
      </section>
    </PageShell>
  );
}
