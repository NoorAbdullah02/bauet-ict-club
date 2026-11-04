import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight, CalendarDays, MapPin, Pin, Crown, Users, Megaphone, Code, Trophy, Lightbulb, Cpu } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import useStore from '../context/store';
import Tilt from './Tilt';
import CodeWindow from './CodeWindow';
import { latestPanel } from '../lib/panel';

const fmt = (d) => { try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }); } catch { return ''; } };

const FEATURES = [
  { icon: Code, t: 'Workshops', d: 'Hands-on coding sessions led by seniors and industry mentors.', span: 'md:col-span-2' },
  { icon: Trophy, t: 'Hackathons', d: 'Build under pressure, win real prizes.', span: '' },
  { icon: Lightbulb, t: 'Projects', d: 'Ship real products with a team.', span: '' },
  { icon: Cpu, t: 'Tech talks & mentorship', d: 'Learn from people who’ve been where you want to go.', span: 'md:col-span-2' },
];

function Head({ tag, title, to, cta }) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="section-tag !mb-3">{tag}</div>
        <h2 className="text-[clamp(2rem,4vw,3rem)] text-fg">{title}</h2>
      </div>
      {to && <Link to={to} className="group flex items-center gap-1.5 text-sm font-semibold text-accent">{cta} <ArrowUpRight size={16} className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></Link>}
    </div>
  );
}

export default function HomeSections() {
  const { events, notices, members } = useStore(useShallow((s) => ({ events: s.events, notices: s.notices, members: s.members })));
  const panel = latestPanel(members);
  const upcoming = [...events].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 3);
  const pinned = [...notices].sort((a, b) => Number(b.pinned) - Number(a.pinned)).slice(0, 3);

  return (
    <>
      <section className="section !pb-6">
        <div className="container grid items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <div className="section-tag !mb-4">the club, in code</div>
            <h2 className="text-[clamp(2.2rem,5vw,3.6rem)] leading-[1.02] text-fg">Born in the terminal. <span className="bg-clip-text text-transparent grad-anim" style={{ backgroundImage: 'var(--grad-text)' }}>Built for builders.</span></h2>
            <p className="mt-5 max-w-md text-base leading-8 text-fg2">We write code, break things, ship projects and win contests together. If you think in <code className="rounded bg-accent/10 px-1.5 py-0.5 font-mono text-[0.85em] text-accent">for</code> loops and late-night commits — you belong here.</p>
            <div className="prompt-line mt-6"><b>$</b> git log --oneline | head -3<br /><span className="text-tech">a1f9c2d</span> won national hackathon 2025<br /><span className="text-tech">7be03aa</span> 100+ open-source contributions<br /><span className="text-tech">3c8d41e</span> best university tech club award</div>
          </div>
          <CodeWindow />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <Head tag="What we do" title="A club built for builders." to="/about" cta="About the club" />
          <div className="grid gap-4 md:grid-cols-3">
            {FEATURES.map((f) => (
              <Tilt key={f.t} max={5} className={`group rounded-[var(--radius)] border border-line bg-surface p-7 ${f.span}`}>
                <span className="grid size-12 place-items-center rounded-2xl text-white" style={{ background: 'var(--grad-btn)', color: 'var(--btn-fg)' }}><f.icon size={22} /></span>
                <h3 className="mt-8 text-2xl text-fg">{f.t}</h3>
                <p className="mt-2 max-w-sm text-sm leading-7 text-fg2">{f.d}</p>
              </Tilt>
            ))}
          </div>
        </div>
      </section>

      {panel.label && (
        <section className="section section-alt">
          <div className="container">
            <Head tag="Current panel" title={`Meet the ${panel.label} committee`} to="/team" cta="Full team" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {[...panel.leaders, ...panel.core, ...panel.chiefs].slice(0, 10).map((m, i) => (
                <motion.div key={m.id} initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: Math.min(i, 8) * 0.05 }}
                  className="overflow-hidden rounded-3xl border border-line bg-surface text-center transition hover:-translate-y-1.5 hover:shadow-[var(--shadow-lg)]">
                  <div className="aspect-square w-full bg-alt">
                    {m.image_url ? <img src={m.image_url} alt={m.name} loading="lazy" decoding="async" className="size-full object-cover" />
                      : <div className="grid size-full place-items-center font-display text-4xl text-accent" style={{ background: 'var(--accent-light)' }}>{m.name.split(' ').slice(0, 2).map((w) => w[0]).join('')}</div>}
                  </div>
                  <div className="p-3.5">
                    <div className="truncate font-display text-base text-fg">{m.name}</div>
                    <div className="mt-1 truncate font-mono text-[10px] uppercase tracking-wider text-tech">{m.position}</div>
                  </div>
                </motion.div>
              ))}
            </div>
            {panel.ambassadors.length > 0 && (
              <div className="mt-14 flex flex-wrap items-center justify-between gap-6 rounded-3xl border border-line bg-surface p-6">
                <div>
                  <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-tech">Department ambassadors · {panel.ambLabel}</div>
                  <div className="mt-1 font-display text-2xl text-fg">{panel.ambassadors.length} students representing their departments</div>
                </div>
                <div className="flex items-center">
                  {panel.ambassadors.slice(0, 7).map((m, i) => (
                    <span key={m.id} title={`${m.name} · ${m.department}`} className="-ml-3 size-12 overflow-hidden rounded-full border-2 border-surface bg-alt first:ml-0" style={{ zIndex: 10 - i }}>
                      {m.image_url ? <img src={m.image_url} alt={m.name} loading="lazy" className="size-full object-cover" /> : <span className="grid size-full place-items-center text-xs font-semibold text-accent">{m.name[0]}</span>}
                    </span>
                  ))}
                  <Link to="/ambassadors" className="ml-4 flex items-center gap-1 text-sm font-semibold text-accent">See all <ArrowUpRight size={15} /></Link>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="section">
        <div className="container grid gap-12 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <Head tag="Don’t miss" title="Upcoming events" to="/events" cta="All events" />
            <div className="space-y-3">
              {upcoming.length === 0 && <p className="text-sm text-muted">Events will appear here once they’re added.</p>}
              {upcoming.map((e) => (
                <Link key={e.id} to="/events" className="spot group flex items-center gap-5 rounded-3xl border border-line bg-surface p-4 pr-6 transition hover:-translate-y-0.5 hover:border-accent/50">
                  <div className="grid size-20 shrink-0 place-items-center rounded-2xl text-center" style={{ background: 'var(--grad-btn)', color: 'var(--btn-fg)' }}>
                    <div><div className="font-mono text-[10px] uppercase tracking-widest opacity-80">{fmt(e.date).split(' ')[1]}</div><div className="font-display text-3xl leading-none">{fmt(e.date).split(' ')[0]}</div></div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-display text-xl text-fg">{e.title}</h3>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg2">
                      {e.time && <span className="flex items-center gap-1"><CalendarDays size={12} />{e.time}</span>}
                      {e.location && <span className="flex items-center gap-1"><MapPin size={12} />{e.location}</span>}
                    </div>
                  </div>
                  <ArrowUpRight className="text-muted transition group-hover:text-accent" size={20} />
                </Link>
              ))}
            </div>
          </div>

          <div>
            <Head tag="Latest" title="Notices" to="/notices" cta="All" />
            <div className="space-y-3">
              {pinned.length === 0 && <p className="text-sm text-muted">No notices right now.</p>}
              {pinned.map((n) => (
                <Link key={n.id} to="/notices" className="spot block rounded-3xl border border-line bg-surface p-5 transition hover:border-tech/50">
                  <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-tech">{n.pinned && <Pin size={11} />}{n.priority}</div>
                  <h3 className="mt-2 font-display text-lg leading-snug text-fg">{n.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-fg2">{n.content}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="relative overflow-hidden rounded-[36px] border border-line p-10 sm:p-16" style={{ background: 'linear-gradient(135deg, var(--navy), var(--navy-light))' }}>
            <div className="pointer-events-none absolute -right-20 -top-20 size-96 rounded-full bg-accent/40 blur-[110px]" />
            <div className="pointer-events-none absolute -bottom-24 left-10 size-80 rounded-full bg-tech/25 blur-[110px]" />
            <div className="relative grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
              <div>
                <div className="section-tag !mb-4 text-tech">Applications open</div>
                <h2 className="text-[clamp(2.2rem,5vw,3.8rem)] leading-[1.02] text-white">Find your place in the club.</h2>
                <p className="mt-4 max-w-md text-white/60">Lead as a committee member, or join the community as a general member — each has its own simple application.</p>
              </div>
              <div className="grid gap-3">
                {[['/join/committee', Crown, 'Committee Member', 'Apply for a post'], ['/join/general', Users, 'General Member', 'Join in two minutes'], ['/join/ambassador', Megaphone, 'Department Ambassador', 'Represent your department']].map(([to, I, t, d]) => (
                  <motion.div key={to} whileHover={{ x: 6 }}>
                    <Link to={to} className="group flex items-center gap-4 rounded-3xl border border-white/15 bg-white/[0.07] p-5 backdrop-blur-xl transition hover:border-white/40">
                      <span className="grid size-12 place-items-center rounded-2xl" style={{ background: 'var(--grad-btn)', color: 'var(--btn-fg)' }}><I size={20} /></span>
                      <span className="flex-1"><span className="block font-display text-xl text-white">{t}</span><span className="text-sm text-white/55">{d}</span></span>
                      <ArrowUpRight className="text-white/50 transition group-hover:text-white" />
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
