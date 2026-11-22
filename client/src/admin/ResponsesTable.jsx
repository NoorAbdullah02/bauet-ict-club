import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowDown, ArrowUp, Check, Download, FileSpreadsheet, Loader2, Maximize2, Minimize2, Trash2, X } from 'lucide-react';
import { api } from '../context/store';
import { show, isOther } from '../lib/forms';
import { cn } from '../lib/cn';
import { saveTableExcel } from '../lib/download';

const ans = (r) => r.answers || { name: r.full_name, student_id: r.student_id, email: r.email, phone: r.phone, department: r.department, batch: r.batch };
const when = (v) => { const d = new Date(v); return Number.isNaN(+d) ? '' : d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }); };
const INPUT = { short: 'text', email: 'email', phone: 'tel', number: 'number', date: 'date', time: 'time' };

/** One editor for one cell: Enter or leaving the cell saves, Esc cancels. */
function CellEditor({ field, value, onSave, onCancel }) {
  const [v, setV] = useState(field.type === 'checkbox' ? (Array.isArray(value) ? value.join(', ') : '') : isOther(value) ? value : value ?? '');
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); ref.current?.select?.(); }, []);
  const done = () => onSave(field.type === 'checkbox' ? v.split(',').map((x) => x.trim()).filter(Boolean) : field.type === 'number' && v !== '' ? Number(v) : v);
  const key = (e) => { if (e.key === 'Escape') onCancel(); else if (e.key === 'Enter' && field.type !== 'long') { e.preventDefault(); done(); } };
  const cls = 'w-full min-w-40 rounded-md border-2 border-tech bg-surface px-2 py-1.5 text-xs text-fg outline-none';
  if (['dropdown', 'radio', 'yesno', 'scale'].includes(field.type) && !isOther(value)) {
    const opts = field.type === 'yesno' ? ['Yes', 'No'] : field.type === 'scale' ? Array.from({ length: field.scale?.max || 5 }, (_, i) => String(i + 1)) : (field.options || []);
    return (
      <select ref={ref} className={cls} value={String(v)} onChange={(e) => setV(e.target.value)} onBlur={done} onKeyDown={key}>
        <option value="">(empty)</option>{opts.map((o) => <option key={o} value={o}>{o}</option>)}
        {String(v) && !opts.includes(String(v)) && <option value={String(v)}>{String(v)}</option>}
      </select>
    );
  }
  if (field.type === 'long') return <textarea ref={ref} rows={3} className={cls} value={v} onChange={(e) => setV(e.target.value)} onBlur={done} onKeyDown={key} />;
  return <input ref={ref} type={INPUT[field.type] || 'text'} className={cls} value={v} onChange={(e) => setV(e.target.value)} onBlur={done} onKeyDown={key} aria-label={field.label} placeholder={field.type === 'checkbox' ? 'a, b, c' : ''} />;
}

const cell = (v) => { let s = String(v ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; return `"${s.replace(/"/g, '""')}"`; };

/** All answers in one spreadsheet-like table: click a column to sort, click a cell to correct it, download what you see. */
export default function ResponsesTable({ fields, rows, editUrl, onChange, q, system = [], title = 'Responses', fileBase = 'responses', onDelete }) {
  const [sort, setSort] = useState({ key: 'created_at', dir: -1 });
  const [editing, setEditing] = useState(null); // `${rowId}:${fieldId}`
  const [busy, setBusy] = useState(null);
  const [wide, setWide] = useState(false);
  useEffect(() => { if (!wide) return undefined; const k = (e) => e.key === 'Escape' && !editing && setWide(false); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [wide, editing]);

  const data = useMemo(() => {
    const val = (r) => (sort.key === 'created_at' ? new Date(r.created_at).getTime() || 0 : show(ans(r)[sort.key]));
    return [...rows].sort((a, b) => { const x = val(a), y = val(b); return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true, sensitivity: 'base' })) * sort.dir; });
  }, [rows, sort]);
  const toggle = (key) => setSort((s) => (s.key === key ? { key, dir: -s.dir } : { key, dir: 1 }));

  const save = async (r, f, value) => {
    setEditing(null);
    const old = ans(r)[f.id];
    if (JSON.stringify(old ?? '') === JSON.stringify(value ?? '')) return;
    setBusy(`${r.id}:${f.id}`);
    try { const { data: row } = await api.patch(editUrl(r.id), { answers: { [f.id]: value } }); onChange(row); toast.success('Saved'); }
    catch (e) { toast.error(e.response?.data?.error || 'Could not save'); }
    setBusy(null);
  };

  const head = (key, label, extra) => (
    <th key={key} scope="col" className={cn('sticky top-0 z-10 border-b border-line bg-alt px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.12em] text-fg2', extra)}>
      <button onClick={() => toggle(key)} className="flex items-center gap-1 whitespace-nowrap hover:text-tech">{label}{sort.key === key && (sort.dir === 1 ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}</button>
    </th>
  );

  const body = (
    <table className="w-full border-separate border-spacing-0 text-xs">
      <thead><tr>
        <th scope="col" className="sticky left-0 top-0 z-20 border-b border-r border-line bg-alt px-3 py-2.5 text-left font-mono text-[10px] text-fg2">#</th>
        {fields.map((f) => head(f.id, f.label))}
        {system.map((s) => <th key={s.label} scope="col" className="sticky top-0 z-10 border-b border-line bg-alt px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.12em] text-fg2"><span className="whitespace-nowrap">{s.label}</span></th>)}
        {head('created_at', 'Submitted')}
        {onDelete && <th scope="col" className="sticky top-0 z-10 border-b border-line bg-alt px-2 py-2.5"><span className="sr-only">Actions</span></th>}
      </tr></thead>
      <tbody>
        {data.map((r, i) => (
          <tr key={r.id} className="group">
            <td className="sticky left-0 z-[5] border-b border-r border-line bg-surface px-3 py-2 font-mono text-[11px] text-muted group-hover:bg-alt">{i + 1}</td>
            {fields.map((f) => {
              const v = ans(r)[f.id]; const k = `${r.id}:${f.id}`; const ro = f.type === 'photo';
              return (
                <td key={f.id} onClick={() => !ro && editing !== k && setEditing(k)} title={ro ? 'Pictures cannot be edited here' : 'Click to edit'}
                  className={cn('max-w-64 border-b border-line px-3 py-2 align-top text-fg2 group-hover:bg-alt', !ro && 'cursor-cell hover:outline hover:outline-1 hover:-outline-offset-1 hover:outline-tech/60')}>
                  {editing === k ? <CellEditor field={f} value={v} onSave={(val) => save(r, f, val)} onCancel={() => setEditing(null)} />
                    : busy === k ? <Loader2 size={13} className="animate-spin text-muted" />
                    : f.type === 'photo' && show(v) ? <a href={show(v)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="font-semibold text-tech">Open picture</a>
                    : <span className="line-clamp-3 break-words">{show(v) || <span className="text-muted/60">—</span>}</span>}
                </td>
              );
            })}
            {system.map((s) => <td key={s.label} className="max-w-56 border-b border-line px-3 py-2 align-top text-fg2 group-hover:bg-alt"><span className="line-clamp-2 break-words">{s.value(r) || <span className="text-muted/60">—</span>}</span></td>)}
            <td className="whitespace-nowrap border-b border-line px-3 py-2 text-muted group-hover:bg-alt">{when(r.created_at)}</td>
            {onDelete && <td className="border-b border-line px-2 py-2 group-hover:bg-alt"><button onClick={(e) => { e.stopPropagation(); onDelete(r); }} aria-label="Delete this response" title="Delete this response" className="grid size-7 place-items-center rounded-lg text-muted hover:bg-red-500/10 hover:text-red-500"><Trash2 size={14} /></button></td>}
          </tr>
        ))}
      </tbody>
    </table>
  );

  const box = (cls) => <div className={cn('overflow-auto rounded-2xl border border-line bg-surface', cls)}>{rows.length ? body : null}</div>;
  const download = (kind) => {
    const columns = [...fields.map((f) => f.label), ...system.map((s) => s.label), 'Submitted'];
    const rows = data.map((r) => [...fields.map((f) => show(ans(r)[f.id])), ...system.map((s) => s.value(r)), when(r.created_at)]);
    const name = `${fileBase}-${rows.length}-rows`;
    if (kind === 'xlsx') return saveTableExcel({ title, subtitle: `${rows.length} ${rows.length === 1 ? 'row' : 'rows'} · ${columns.length} columns`, columns, rows, filename: `${name}.xlsx` });
    const csv = `\ufeff${[columns.map(cell).join(','), ...rows.map((line) => line.map(cell).join(','))].join('\r\n')}\r\n`;
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })), download: `${name}.csv` });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  const bar = (
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted">
      <span className="flex items-center gap-1.5"><Check size={12} className="text-emerald-500" /> Click any cell to correct it. Enter saves, Esc cancels. Click a column name to sort.{q ? ' Search filters the rows.' : ''}</span>
      <span className="flex items-center gap-2">
        <span className="font-mono">{data.length} row{data.length === 1 ? '' : 's'} · {fields.length + system.length} columns</span>
        <button onClick={() => download('xlsx')} title="Download exactly these rows as an Excel workbook" className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 font-semibold text-fg2 hover:border-tech hover:text-tech"><FileSpreadsheet size={13} /> Excel</button>
        <button onClick={() => download('csv')} title="Download exactly these rows as a CSV" className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 font-semibold text-fg2 hover:border-tech hover:text-tech"><Download size={13} /> CSV</button>
        <button onClick={() => setWide((w) => !w)} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 font-semibold text-fg2 hover:border-tech hover:text-tech">{wide ? <Minimize2 size={13} /> : <Maximize2 size={13} />}{wide ? 'Close full screen' : 'Full screen'}</button>
      </span>
    </div>
  );

  if (!rows.length) return <p className="py-6 text-center text-sm text-muted">Nothing to show.</p>;
  if (wide) {
    return (
      <>
        <div className="fixed inset-0 z-[300] flex flex-col bg-bg p-3 sm:p-5" role="dialog" aria-modal="true" aria-label="Responses table">
          <div className="mb-1 flex items-center justify-between"><h3 className="text-lg text-fg">All responses · {rows.length}</h3><button onClick={() => setWide(false)} aria-label="Close" className="grid size-9 place-items-center rounded-full hover:bg-tech/10"><X size={18} /></button></div>
          {bar}
          {box('min-h-0 flex-1')}
        </div>
      </>
    );
  }
  return <>{bar}{box('max-h-[60vh]')}</>;
}
