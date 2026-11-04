import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from 'recharts';
import { Eye, Users, CalendarDays, TrendingUp, TrendingDown, Download, Search, Smartphone, Monitor, Tablet, Loader2, Globe } from 'lucide-react';
import { api } from '../context/store';
import { Panel, PageTitle, inputCls } from './ui';
import { Donut, HBars } from './charts';
import { cn } from '../lib/cn';

const tip = { contentStyle: { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 14, fontSize: 12, color: 'var(--fg)' }, cursor: { stroke: 'var(--border)' } };
const short = (d) => new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
const when = (t) => new Date(t).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const ICON = { Mobile: Smartphone, Tablet, Desktop: Monitor };

function Stat({ icon: Icon, label, value, sub, color, i }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, duration: 0.5 }}>
      <Panel className="relative overflow-hidden p-5">
        <div className="absolute -right-6 -top-6 size-24 rounded-full opacity-30 blur-2xl" style={{ background: color }} />
        <span className="relative grid size-10 place-items-center rounded-xl text-white" style={{ background: color }}><Icon size={18} /></span>
        <div className="relative mt-4 font-display text-3xl text-fg"><CountUp end={value} duration={1.2} /></div>
        <div className="relative text-sm text-fg2">{label}</div>
        {sub && <div className="relative mt-1 text-xs text-muted">{sub}</div>}
      </Panel>
    </motion.div>
  );
}

const trend = (now, before) => {
  if (!before) return now ? 'new' : '';
  const p = Math.round(((now - before) / before) * 100);
  return `${p >= 0 ? '+' : ''}${p}% vs last week`;
};

/** Admin → Visitors: how many people opened the site, per day and per week, and the IP of every visitor. */
export default function Visitors() {
  const [data, setData] = useState(null);
  const [list, setList] = useState(null);
  const [days, setDays] = useState(7);
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => { api.get('/analytics/summary', { params: { weeks: 8 } }).then((r) => setData(r.data)).catch(() => setErr('Could not load visitor numbers')); }, []);
  useEffect(() => {
    setList(null);
    api.get('/analytics/visitors', { params: { days, q } }).then((r) => setList(r.data)).catch(() => setList({ visitors: [], count: 0 }));
  }, [days, q]);

  const download = async () => {
    const { data: csv } = await api.get('/analytics/export.csv', { params: { days: Math.max(days, 30) }, responseType: 'blob' });
    const url = URL.createObjectURL(csv);
    const a = Object.assign(document.createElement('a'), { href: url, download: `visitors-${new Date().toISOString().slice(0, 10)}.csv` });
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const weekly = useMemo(() => (data?.weekly || []).map((w) => ({ ...w, label: short(w.weekStart) })), [data]);
  const daily = useMemo(() => (data?.days || []).map((d) => ({ ...d, label: short(d.day) })), [data]);

  if (err) return <p className="text-sm text-red-500">{err}</p>;
  if (!data) return <Loader2 className="animate-spin text-muted" />;
  const empty = !data.allTimeViews;

  return (
    <div>
      <PageTitle title="Visitors" sub="Who opened the website, per day and per week. Bots are not counted.">
        <button onClick={download} className="flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-xs font-semibold text-fg2 transition hover:border-tech hover:text-tech"><Download size={14} /> Export CSV</button>
      </PageTitle>

      {empty && <Panel className="mb-5 p-5 text-sm text-fg2">No visits yet. Open the public website once, or load the demo data from Settings, and the numbers appear here. Visits are recorded from the moment this version is running.</Panel>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat i={0} icon={Users} label="Visitors today" value={data.today.visitors} sub={`${data.today.views} page views · yesterday ${data.yesterday?.visitors ?? 0}`} color="linear-gradient(135deg,#12A8D8,#1F4FD8)" />
        <Stat i={1} icon={Eye} label="Page views today" value={data.today.views} sub={`all time ${data.allTimeViews}`} color="linear-gradient(135deg,#1F4FD8,#6C4DF6)" />
        <Stat i={2} icon={CalendarDays} label="Visitors this week" value={data.thisWeek.visitors} sub={trend(data.thisWeek.visitors, data.lastWeek.visitors)} color="linear-gradient(135deg,#18A957,#12A8D8)" />
        <Stat i={3} icon={data.thisWeek.views >= data.lastWeek.views ? TrendingUp : TrendingDown} label="Views this week" value={data.thisWeek.views} sub={trend(data.thisWeek.views, data.lastWeek.views)} color="linear-gradient(135deg,#F5A524,#EF6B8A)" />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-5">
        <Panel className="p-6 xl:col-span-3">
          <h3 className="mb-4 text-lg text-fg">Last 14 days</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={daily} margin={{ left: -18, right: 8, top: 6 }}>
                <defs><linearGradient id="vg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--accent)" stopOpacity={0.5} /><stop offset="100%" stopColor="var(--accent)" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--fg-muted)' }} tickLine={false} axisLine={false} interval={1} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--fg-muted)' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip {...tip} />
                <Area type="monotone" dataKey="visitors" name="Visitors" stroke="var(--accent)" strokeWidth={2.5} fill="url(#vg)" />
                <Area type="monotone" dataKey="views" name="Page views" stroke="var(--tech)" strokeWidth={2} fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel className="p-6 xl:col-span-2">
          <h3 className="mb-4 text-lg text-fg">Week by week</h3>
          <div className="h-44">
            <ResponsiveContainer>
              <BarChart data={weekly} margin={{ left: -18, right: 4, top: 6 }}>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--fg-muted)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--fg-muted)' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip {...tip} cursor={{ fill: 'var(--border)', opacity: 0.4 }} />
                <Bar dataKey="visitors" name="Visitors" fill="var(--accent)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 max-h-40 overflow-y-auto text-sm">
            <table className="w-full">
              <thead><tr className="text-left font-mono text-[10px] uppercase tracking-wider text-muted"><th className="py-1">Week of</th><th className="text-right">Visitors</th><th className="text-right">Views</th></tr></thead>
              <tbody>{[...weekly].reverse().map((w) => <tr key={w.weekStart} className="border-t border-line"><td className="py-1.5 text-fg2">{short(w.weekStart)}</td><td className="text-right font-semibold text-fg">{w.visitors}</td><td className="text-right text-fg2">{w.views}</td></tr>)}</tbody>
            </table>
          </div>
        </Panel>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Panel className="p-6">
          <h3 className="mb-3 text-lg text-fg">Top pages</h3>
          {data.topPages.length === 0 ? <p className="text-sm text-muted">Nothing yet.</p> : <HBars data={data.topPages.map((p) => ({ name: p.name, value: p.views }))} />}
        </Panel>
        <Panel className="p-6">
          <h3 className="mb-1 text-lg text-fg">Devices</h3>
          <Donut data={data.devices.map((d) => ({ name: d.name, value: d.views }))} center={data.devices.reduce((n, d) => n + d.views, 0)} />
        </Panel>
        <Panel className="p-6">
          <h3 className="mb-1 text-lg text-fg">Where they came from</h3>
          <Donut data={data.referrers.slice(0, 5).map((d) => ({ name: d.name, value: d.views }))} colors={['#17A2D8', '#1F4FD8', '#18A957', '#F5A524', '#EF6B8A']} />
        </Panel>
      </div>

      <Panel className="mt-5 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5">
          <div><h3 className="text-lg text-fg">Visitor IP addresses</h3><p className="text-xs text-muted">{list ? `${list.count} visitors in the last ${days} days` : 'Loading…'} · stored for {180} days, then deleted</p></div>
          <div className="flex flex-wrap items-center gap-2">
            {[1, 7, 30, 90].map((d) => <button key={d} onClick={() => setDays(d)} className={cn('rounded-full border px-3.5 py-1.5 text-xs transition', days === d ? 'border-accent bg-accent text-white' : 'border-line text-fg2 hover:border-accent')}>{d === 1 ? 'Today' : `${d} days`}</button>)}
            <div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="IP or page" className={`${inputCls} !w-40 !rounded-full !py-1.5 pl-8 text-xs`} /></div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr className="bg-alt/60 text-left font-mono text-[10px] uppercase tracking-wider text-muted"><th className="px-5 py-3">IP address</th><th>Views</th><th>Device</th><th>Main page</th><th>From</th><th>Last seen</th></tr></thead>
            <tbody>
              {!list ? <tr><td className="p-6 text-muted" colSpan={6}><Loader2 className="animate-spin" /></td></tr>
                : list.visitors.length === 0 ? <tr><td className="p-6 text-muted" colSpan={6}>No visitors in this period.</td></tr>
                : list.visitors.map((v) => { const Icon = ICON[v.device] || Monitor; return (
                  <tr key={v.ip} className="border-t border-line hover:bg-alt/40">
                    <td className="px-5 py-2.5 font-mono text-xs text-fg">{v.ip}</td>
                    <td className="font-semibold text-fg">{v.views}</td>
                    <td><span className="flex items-center gap-1.5 text-fg2"><Icon size={14} /> {v.device}</span></td>
                    <td className="max-w-[10rem] truncate text-fg2">{v.topPage}</td>
                    <td className="text-fg2">{v.referrer || 'Direct'}</td>
                    <td className="whitespace-nowrap text-muted">{when(v.lastSeen)}</td>
                  </tr>
                ); })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
