import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from 'recharts';

export const PALETTE = ['#1F4FD8', '#17A2D8', '#18A957', '#F5A524', '#EF6B8A', '#6C4DF6', '#0E9F6E', '#E4572E'];
const tip = { contentStyle: { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 14, fontSize: 12, color: 'var(--fg)' }, cursor: { fill: 'var(--border)', opacity: 0.35 } };

/** Donut with the total in the middle and a legend underneath. data: [{ name, value }] */
export function Donut({ data, colors = PALETTE, center, height = 190 }) {
  const rows = data.filter((d) => d.value > 0);
  const total = data.reduce((n, d) => n + d.value, 0);
  return (
    <div>
      <div className="relative" style={{ height }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={rows.length ? rows : [{ name: 'None', value: 1 }]} dataKey="value" innerRadius="62%" outerRadius="86%" paddingAngle={rows.length > 1 ? 4 : 0} cornerRadius={6} stroke="none" isAnimationActive>
              {(rows.length ? rows : [{ name: 'None' }]).map((d, i) => <Cell key={d.name} fill={rows.length ? colors[data.findIndex((x) => x.name === d.name) % colors.length] : 'var(--border)'} />)}
            </Pie>
            {rows.length > 0 && <Tooltip {...tip} />}
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div><div className="font-display text-3xl text-fg">{center ?? total}</div><div className="text-[10px] uppercase tracking-widest text-muted">total</div></div>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-fg2">
        {data.map((d, i) => <span key={d.name} className="flex items-center gap-1.5 capitalize"><i className="size-2 rounded-full" style={{ background: colors[i % colors.length] }} />{d.name} · {d.value}</span>)}
      </div>
    </div>
  );
}

/** Horizontal bars with the value at the end of each bar. data: [{ name, value }] */
export function HBars({ data, color = 'var(--accent)', height }) {
  const h = height || Math.max(120, data.length * 34 + 16);
  return (
    <div style={{ height: h }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 4, right: 28, top: 4, bottom: 4 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 6" horizontal={false} />
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis type="category" dataKey="name" width={86} tick={{ fill: 'var(--fg-2, var(--fg-muted))', fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip {...tip} />
          <Bar dataKey="value" fill={color} radius={[0, 8, 8, 0]} barSize={16} isAnimationActive>
            <LabelList dataKey="value" position="right" style={{ fill: 'var(--fg)', fontSize: 11, fontWeight: 600 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Vertical gradient bars. data: [{ name, value }] */
export function VBars({ data, height = 190 }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ left: -22, right: 4, top: 14 }}>
          <defs><linearGradient id="vb" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#17A2D8" /><stop offset="100%" stopColor="#1F4FD8" /></linearGradient></defs>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 6" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: 'var(--fg-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fill: 'var(--fg-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip {...tip} />
          <Bar dataKey="value" fill="url(#vb)" radius={[8, 8, 0, 0]} maxBarSize={36}><LabelList dataKey="value" position="top" style={{ fill: 'var(--fg)', fontSize: 11, fontWeight: 600 }} /></Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Count items by a key: [{ name, value }] sorted high to low. */
export const tally = (items, pick, fallback = 'Other') => Object.entries(items.reduce((m, it) => { const k = pick(it) || fallback; m[k] = (m[k] || 0) + 1; return m; }, {}))
  .map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
