import { Link } from 'react-router-dom';
import { thumb } from '../lib/img';
import { motion } from 'framer-motion';
import { ArrowUpRight, Users } from 'lucide-react';
import { latestPanel } from '../lib/panel';

const initials = (n = '') => n.replace(/^(Dr|Prof)\.?\s+/i, '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const GRADS = ['linear-gradient(135deg,#1F4FD8,#17A2D8)', 'linear-gradient(135deg,#0E9F6E,#17A2D8)', 'linear-gradient(135deg,#0A1A4A,#1F4FD8)', 'linear-gradient(135deg,#17A2D8,#18A957)'];

function Photo({ m, i = 0, className = '', textSize = 'text-5xl' }) {
  return m.image_url
    ? <img src={thumb(m.image_url, 800)} alt={m.name} loading="lazy" decoding="async" className={`size-full object-cover transition duration-700 group-hover:scale-[1.06] ${className}`} />
    : <div className={`grid size-full place-items-center font-display text-white ${textSize}`} style={{ background: GRADS[i % GRADS.length] }}>{initials(m.name)}</div>;
}

const fade = (i = 0) => ({ initial: { opacity: 0, y: 28 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-60px' }, transition: { delay: Math.min(i, 8) * 0.07, duration: 0.7, ease: [0.16, 1, 0.3, 1] } });

export default function PanelShowcase({ members }) {
  const { label, leaders, core, chiefs, total, ambassadors, ambLabel } = latestPanel(members);
  if (!label) return null;

  const president = leaders.find((m) => /^President/i.test(m.position)) || leaders[0];
  const vps = leaders.filter((m) => m !== president);
  const team = core.slice(0, 6);

  return (
    <section className="section relative overflow-hidden">
      <div className="pointer-events-none absolute -left-40 top-10 size-[30rem] rounded-full bg-accent/15 blur-[110px]" />
      <div className="pointer-events-none absolute -right-32 bottom-0 size-[28rem] rounded-full bg-tech/15 blur-[110px]" />

      <div className="container relative">
        <motion.div {...fade()} className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-tech">
              <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-tech/60" /><span className="relative inline-flex size-2 rounded-full bg-tech" /></span>
              Current committee
            </div>
            <h2 className="text-[clamp(2.2rem,5vw,3.8rem)] leading-[1.02] text-fg">Meet the <span className="bg-clip-text text-transparent grad-anim" style={{ backgroundImage: 'var(--grad-text)' }}>{label}</span> committee</h2>
            <p className="mt-3 flex items-center gap-2 text-sm text-fg2"><Users size={15} className="text-accent" /> {total} members leading the club this semester</p>
          </div>
          <Link to="/team" className="btn-outline">See the full team <ArrowUpRight size={15} /></Link>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-12">
          {/* President spotlight */}
          {president && (
            <motion.div {...fade(1)} className="group relative overflow-hidden rounded-[28px] border border-line bg-surface shadow-[var(--shadow-lg)] lg:col-span-4 lg:self-start">
              <div className="aspect-[4/3] max-h-64 w-full overflow-hidden bg-alt sm:aspect-[4/3.2] sm:max-h-none lg:aspect-[4/3.6]"><Photo m={president} textSize="text-6xl" /></div>
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0A1A4A]/90 via-[#0A1A4A]/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5">
                <span className="inline-block rounded-full bg-white/15 px-3.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-white backdrop-blur">{president.position}</span>
                <h3 className="mt-3 font-display text-2xl leading-tight text-white sm:text-3xl">{president.name}</h3>
              </div>
            </motion.div>
          )}

          {/* right column: vice presidents straight after the President, then the core team */}
          <div className={`flex flex-col gap-6 ${president ? 'lg:col-span-8' : 'lg:col-span-12'}`}>
            {vps.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                {vps.map((v, i) => (
                  <motion.article key={v.id} {...fade(i + 2)}
                    className="group relative overflow-hidden rounded-3xl border border-line bg-surface transition duration-500 hover:-translate-y-1.5 hover:border-tech/50 hover:shadow-[var(--shadow-lg)]">
                    <div className="aspect-[4/3] w-full overflow-hidden bg-alt"><Photo m={v} i={i + 1} textSize="text-5xl" /></div>
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0A1A4A]/90 via-[#0A1A4A]/10 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-5">
                      <span className="inline-block rounded-full bg-gradient-to-r from-accent to-tech px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-white">{v.position}</span>
                      <h3 className="mt-2 font-display text-2xl leading-tight text-white">{v.name}</h3>
                    </div>
                  </motion.article>
                ))}
              </div>
            )}
            <div className={`grid grid-cols-2 gap-4 ${president ? 'sm:grid-cols-3' : 'sm:grid-cols-3 lg:grid-cols-4'}`}>
            {team.map((m, i) => (
              <motion.article key={m.id} {...fade(i + 2)} className="group relative overflow-hidden rounded-3xl border border-line bg-surface transition duration-500 hover:-translate-y-1.5 hover:border-accent/50 hover:shadow-[var(--shadow-lg)]">
                <div className="aspect-[4/4.4] w-full overflow-hidden bg-alt"><Photo m={m} i={i} textSize="text-4xl" /></div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#0A1A4A]/85 to-transparent opacity-80 transition group-hover:opacity-100" />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <h3 className="truncate font-display text-lg leading-tight text-white">{m.name}</h3>
                  <p className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-wider text-white/75">{m.position}</p>
                </div>
              </motion.article>
            ))}
          </div>
          </div>
        </div>

        {/* chief executives */}
        {chiefs.length > 0 && (
          <motion.div {...fade(3)} className="mt-6 rounded-3xl border border-line bg-surface p-5 sm:p-6">
            <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Chief executives</div>
            <div className="flex flex-wrap gap-3">
              {chiefs.slice(0, 8).map((m, i) => (
                <div key={m.id} className="flex items-center gap-3 rounded-full border border-line bg-alt/60 py-1.5 pl-1.5 pr-5 transition hover:border-accent/50">
                  <span className="group size-10 overflow-hidden rounded-full"><Photo m={m} i={i} textSize="text-sm" /></span>
                  <span className="leading-tight"><b className="block text-sm font-semibold text-fg">{m.name}</b><span className="text-[11px] text-muted">{m.position.replace(/^Chief Executive \(?/, '').replace(/\)$/, '')}</span></span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ambassadors */}
        {ambassadors.length > 0 && (
          <motion.div {...fade(4)} className="mt-6 flex flex-wrap items-center justify-between gap-6 overflow-hidden rounded-3xl p-6 text-white sm:p-8" style={{ background: 'linear-gradient(120deg,#0A1A4A,#1F4FD8 70%,#17A2D8)' }}>
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/65">Department ambassadors · {ambLabel}</div>
              <div className="mt-1.5 font-display text-2xl sm:text-3xl">{ambassadors.length} voices across our departments</div>
            </div>
            <div className="flex items-center">
              {ambassadors.slice(0, 7).map((m, i) => (
                <span key={m.id} title={`${m.name} · ${m.department}`} className="group -ml-3 size-12 overflow-hidden rounded-full border-2 border-[#1F4FD8] first:ml-0" style={{ zIndex: 10 - i }}><Photo m={m} i={i} textSize="text-sm" /></span>
              ))}
              <Link to="/ambassadors" className="ml-5 inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#0A1A4A] transition hover:-translate-y-0.5">Meet them <ArrowUpRight size={15} /></Link>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}
