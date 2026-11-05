import { useMemo, useState } from 'react';
import { Donut, HBars, VBars } from './charts';
import { isOther, show } from '../lib/forms';

const ans = (r) => r.answers || { name: r.full_name, student_id: r.student_id, email: r.email, phone: r.phone, department: r.department, batch: r.batch };
const day = (v) => { const d = new Date(v); return Number.isNaN(+d) ? '' : d.toISOString().slice(0, 10); };

function tally(f, rows) {
  const m = {};
  rows.forEach((r) => {
    const v = ans(r)[f.id];
    (Array.isArray(v) ? v : v === undefined || v === '' ? [] : [v]).forEach((x) => { const k = isOther(x) ? 'Other' : String(x); m[k] = (m[k] || 0) + 1; });
  });
  return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function Card({ title, sub, children }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <h4 className="text-sm font-semibold text-fg">{title}</h4>
      <p className="mb-3 text-xs text-muted">{sub}</p>
      {children}
    </div>
  );
}

function TextList({ list }) {
  const [all, setAll] = useState(false);
  const items = all ? list : list.slice(0, 6);
  return (
    <>
      <ul className="max-h-64 space-y-1.5 overflow-auto">{items.map((t, i) => <li key={i} className="rounded-lg bg-alt/70 px-3 py-2 text-xs text-fg2 break-words">{t}</li>)}</ul>
      {list.length > 6 && <button onClick={() => setAll((a) => !a)} className="mt-2 text-xs font-semibold text-tech">{all ? 'Show fewer' : `Show all ${list.length}`}</button>}
    </>
  );
}

/** Like the Summary tab of Google Forms: one card per question in form order, with the right chart for its kind. */
export default function ResponsesSummary({ fields, rows, paid }) {
  const perDay = useMemo(() => {
    const m = {};
    rows.forEach((r) => { const d = day(r.created_at); if (d) m[d] = (m[d] || 0) + 1; });
    return Object.entries(m).sort(([a], [b]) => a.localeCompare(b)).slice(-14).map(([d, value]) => ({ name: d.slice(5), value }));
  }, [rows]);
  if (!rows.length) return <p className="py-6 text-center text-sm text-muted">The summary appears after the first response.</p>;
  const n = rows.length;
  const answered = (f) => rows.filter((r) => { const v = ans(r)[f.id]; return v !== undefined && v !== '' && !(Array.isArray(v) && !v.length); });

  return (
    <div className="mt-4 space-y-4">
      <div className="rounded-2xl border border-line bg-gradient-to-br from-tech/10 to-accent/10 p-4">
        <div className="flex items-end justify-between gap-3"><div><div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Responses</div><div className="font-display text-4xl leading-none text-fg">{n}</div></div>
          {rows.length > 1 && <span className="text-xs text-muted">first {day(rows[rows.length - 1]?.created_at) || ''}</span>}</div>
        {perDay.length > 1 && <div className="mt-3"><VBars data={perDay} height={120} /></div>}
      </div>
      {paid && (
        <Card title="Payments" sub={`${rows.filter((r) => r.payment).length} paid sign-ups`}>
          <Donut height={150} data={['pending', 'verified', 'rejected'].map((s) => ({ name: s, value: rows.filter((r) => r.pay_status === s).length }))} colors={['#F5A524', '#18A957', '#EF6B8A']} />
        </Card>
      )}
      {fields.map((f) => {
        const got = answered(f);
        const sub = `${got.length} of ${n} answered`;
        if (['dropdown', 'radio', 'checkbox', 'yesno'].includes(f.type)) {
          const data = tally(f, rows);
          return <Card key={f.id} title={f.label} sub={sub}>{f.type === 'checkbox' || data.length > 4 ? <HBars data={data} /> : <Donut height={150} data={data} />}</Card>;
        }
        if (f.type === 'scale') {
          const vals = got.map((r) => Number(ans(r)[f.id])).filter(Number.isFinite);
          const avg = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '–';
          return (
            <Card key={f.id} title={f.label} sub={`${sub} · average ${avg} of ${f.scale?.max || 5}`}>
              <HBars data={Array.from({ length: f.scale?.max || 5 }, (_, i) => ({ name: String(i + 1), value: vals.filter((v) => v === i + 1).length }))} />
            </Card>
          );
        }
        if (f.type === 'number') {
          const vals = got.map((r) => Number(ans(r)[f.id])).filter(Number.isFinite);
          const sum = vals.reduce((a, b) => a + b, 0);
          const stat = [['Average', vals.length ? +(sum / vals.length).toFixed(2) : '–'], ['Smallest', vals.length ? Math.min(...vals) : '–'], ['Biggest', vals.length ? Math.max(...vals) : '–'], ['Total', +sum.toFixed(2)]];
          return <Card key={f.id} title={f.label} sub={sub}><div className="grid grid-cols-4 gap-2 text-center">{stat.map(([k, v]) => <div key={k} className="rounded-xl bg-alt/70 py-2"><div className="font-display text-lg text-fg">{v}</div><div className="font-mono text-[9px] uppercase tracking-wider text-muted">{k}</div></div>)}</div></Card>;
        }
        if (f.type === 'photo') return <Card key={f.id} title={f.label} sub={`${got.length} of ${n} uploaded`}><div className="flex flex-wrap gap-2">{got.slice(0, 12).map((r) => <a key={r.id} href={show(ans(r)[f.id])} target="_blank" rel="noreferrer"><img src={show(ans(r)[f.id])} alt="" loading="lazy" className="size-14 rounded-lg object-cover ring-1 ring-line" /></a>)}</div></Card>;
        return <Card key={f.id} title={f.label} sub={sub}>{got.length ? <TextList list={got.map((r) => show(ans(r)[f.id]))} /> : <p className="text-xs text-muted">No answers yet.</p>}</Card>;
      })}
    </div>
  );
}
