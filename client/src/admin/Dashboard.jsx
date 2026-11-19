import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Megaphone, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, CartesianGrid } from 'recharts';
import { ClipboardList, Users, Calendar, MessageSquare, Crown, ArrowUpRight, Clock } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import useStore from '../context/store';
import { Panel, PageTitle } from './ui';
import { Donut, VBars, tally } from './charts';
import DeanReportModal from './DeanReportModal';

const C = { a: 'var(--accent)', b: 'var(--tech)', c: '#EF6B8A', d: '#F5A524' };
const day = (d) => new Date(d).toISOString().slice(0, 10);

function Stat({ icon: Icon, label, value, hint, color, i }) {
  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
      <Panel className="spot group relative overflow-hidden p-6 transition hover:-translate-y-1 hover:border-accent/50">
        <div className="absolute -right-8 -top-8 size-28 rounded-full opacity-40 blur-2xl transition group-hover:opacity-80" style={{ background: color }} />
        <div className="relative flex items-start justify-between">
          <span className="grid size-11 place-items-center rounded-2xl text-white" style={{ background: color }}><Icon size={20} /></span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">{hint}</span>
        </div>
        <div className="relative mt-6 font-display text-4xl text-fg"><CountUp end={value} duration={1.6} /></div>
        <div className="relative mt-1 text-sm text-fg2">{label}</div>
      </Panel>
    </motion.div>
  );
}

const tip = { contentStyle: { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 14, fontSize: 12, color: 'var(--fg)' }, cursor: { stroke: 'var(--border)' } };

export default function Dashboard() {
  const { registrations, events, members, messages, user } = useStore(useShallow((s) => ({ registrations: s.registrations, events: s.events, members: s.members, messages: s.messages, user: s.user })));
  const [reportOpen, setReportOpen] = useState(false);

  const pending = registrations.filter((r) => r.status === 'pending').length;
  const unread = messages.filter((m) => !m.is_read).length;
  const upcoming = events.filter((e) => new Date(e.date) >= new Date(new Date().toDateString()));

  const series = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (13 - i)); return day(d); });
    return days.map((d) => ({
      d: d.slice(5),
      Committee: registrations.filter((r) => r.type === 'committee' && day(r.created_at) === d).length,
      General: registrations.filter((r) => r.type === 'general' && day(r.created_at) === d).length,
    }));
  }, [registrations]);

  const status = ['pending', 'approved', 'rejected'].map((s) => ({ name: s, value: registrations.filter((r) => r.status === s).length }));
  const dept = useMemo(() => {
    const m = {};
    registrations.forEach((r) => { m[r.department] = (m[r.department] || 0) + 1; });
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  }, [registrations]);

  const recent = registrations.slice(0, 6);

  return (
    <div>
      <DeanReportModal open={reportOpen} onClose={() => setReportOpen(false)} />
      <div className="relative mb-6 overflow-hidden rounded-3xl p-7 text-white sm:p-9" style={{ background: 'linear-gradient(120deg, #0A1A4A 0%, #1F4FD8 60%, #17A2D8 120%)' }}>
        <div className="pointer-events-none absolute -right-10 -top-16 size-64 rounded-full bg-[#35D989]/30 blur-[70px]" />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/70">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
            <h1 className="mt-2 text-3xl text-white sm:text-4xl">Welcome back, {user?.username || 'admin'} 👋</h1>
            <p className="mt-2 max-w-md text-sm text-white/75">{pending > 0 ? `${pending} application${pending > 1 ? 's are' : ' is'} waiting for your review.` : 'You’re all caught up — no applications waiting.'}</p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button type="button" onClick={() => setReportOpen(true)} className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"><FileText size={15} /> Official Dean/VC Report</button>
            <Link to="/admin/applications" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#0A1A4A] shadow-lg transition hover:-translate-y-0.5"><ClipboardList size={15} /> Select committee & ambassadors</Link>
            <Link to="/admin/events?new=1" className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"><Plus size={15} /> Add event</Link>
            <Link to="/admin/notices?new=1" className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"><Megaphone size={15} /> Post notice</Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 [&>*]:min-w-0">
        <Stat i={0} icon={ClipboardList} label="Pending applications" value={pending} hint="needs review" color="linear-gradient(135deg,#1F4FD8,#2E7BFF)" />
        <Stat i={1} icon={Users} label="Total applicants" value={registrations.length} hint="all time" color="linear-gradient(135deg,#12A8D8,#1F4FD8)" />
        <Stat i={2} icon={Calendar} label="Upcoming events" value={upcoming.length} hint="scheduled" color="linear-gradient(135deg,#0E9F6E,#12A8D8)" />
        <Stat i={3} icon={MessageSquare} label="Unread messages" value={unread} hint="inbox" color="linear-gradient(135deg,#F5A524,#EF6B8A)" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr] [&>*]:min-w-0">
        <Panel className="p-6">
          <div className="mb-4 flex items-center justify-between"><h3 className="text-xl text-fg">Applications · last 14 days</h3>
            <div className="flex gap-4 text-xs text-fg2"><span className="flex items-center gap-1.5"><i className="size-2 rounded-full" style={{ background: C.a }} />Committee</span><span className="flex items-center gap-1.5"><i className="size-2 rounded-full" style={{ background: C.b }} />General</span></div></div>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={series} margin={{ left: -24, right: 4, top: 6 }}>
                <defs>
                  {[['g1', C.a], ['g2', C.b]].map(([id, col]) => (
                    <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" style={{ stopColor: col, stopOpacity: 0.55 }} /><stop offset="100%" style={{ stopColor: col, stopOpacity: 0 }} /></linearGradient>
                  ))}
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 6" vertical={false} />
                <XAxis dataKey="d" tick={{ fill: 'var(--fg-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: 'var(--fg-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip {...tip} />
                <Area type="monotone" dataKey="Committee" stroke={C.a} strokeWidth={2.5} fill="url(#g1)" />
                <Area type="monotone" dataKey="General" stroke={C.b} strokeWidth={2.5} fill="url(#g2)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel className="p-6">
          <h3 className="mb-2 text-xl text-fg">Application status</h3>
          <div className="relative h-48">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={status} dataKey="value" innerRadius={56} outerRadius={78} paddingAngle={4} stroke="none">
                  {status.map((_, i) => <Cell key={i} fill={[C.d, C.b, C.c][i]} />)}
                </Pie>
                <Tooltip {...tip} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center"><div><div className="font-display text-3xl text-fg">{registrations.length}</div><div className="text-[10px] uppercase tracking-widest text-muted">total</div></div></div>
          </div>
          <div className="mt-2 flex justify-center gap-4 text-xs text-fg2">{status.map((s, i) => <span key={s.name} className="flex items-center gap-1.5 capitalize"><i className="size-2 rounded-full" style={{ background: [C.d, C.b, C.c][i] }} />{s.name} · {s.value}</span>)}</div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <Panel className="p-6">
          <h3 className="mb-2 text-xl text-fg">Who is applying</h3>
          <Donut data={['committee', 'ambassador', 'general'].map((t) => ({ name: t, value: registrations.filter((r) => r.type === t).length }))} />
        </Panel>
        <Panel className="p-6">
          <h3 className="mb-2 text-xl text-fg">People per committee</h3>
          <VBars data={tally(members.filter((m) => m.committee_session), (m) => m.committee_session).slice(0, 8).reverse().map((d) => ({ name: d.name.replace(/^(Summer|Winter)\s+/, (x) => x[0] + ' '), value: d.value }))} />
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <Panel className="p-6">
          <div className="mb-4 flex items-center justify-between"><h3 className="text-xl text-fg">Recent applications</h3><Link to="/admin/applications" className="flex items-center gap-1 text-xs font-semibold text-accent">View all <ArrowUpRight size={13} /></Link></div>
          {recent.length === 0 ? <p className="text-sm text-muted">No applications yet.</p> : (
            <ul className="divide-y divide-line">
              {recent.map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-3">
                  <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-alt font-display text-fg2">{r.photo_url ? <img loading="lazy" decoding="async" src={r.photo_url} alt="" className="size-full object-cover" /> : r.full_name[0]}</span>
                  <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-fg">{r.full_name}</div><div className="truncate text-xs text-muted">{r.type === 'committee' ? r.post : 'General member'} · {r.department}</div></div>
                  <span className={`rounded-full px-2.5 py-1 font-mono text-[10px] uppercase ${r.type === 'committee' ? 'bg-accent/15 text-accent' : 'bg-tech/15 text-tech'}`}>{r.type === 'committee' ? <Crown size={11} className="inline" /> : <Users size={11} className="inline" />}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel className="p-6">
          <h3 className="mb-4 text-xl text-fg">Applicants by department</h3>
          <div className="h-56">
            {dept.length === 0 ? <p className="text-sm text-muted">No data yet.</p> : (
              <ResponsiveContainer>
                <BarChart data={dept} margin={{ left: -24 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 6" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: 'var(--fg-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: 'var(--fg-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip {...tip} />
                  <Bar dataKey="value" radius={[10, 10, 4, 4]} fill={C.a} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-muted"><Clock size={13} /> {members.length} committee entries across {new Set(members.map((m) => m.committee_session).filter(Boolean)).size} sessions</div>
        </Panel>
      </div>
    </div>
  );
}
