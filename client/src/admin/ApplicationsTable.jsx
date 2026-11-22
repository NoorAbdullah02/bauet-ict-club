import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Download, FileSpreadsheet } from 'lucide-react';
import { cn } from '../lib/cn';
import { saveTableExcel } from '../lib/download';

const COLS = [
  ['full_name', 'Name'],
  ['student_id', 'Student ID'],
  ['batch', 'Batch'],
  ['department', 'Department'],
  ['phone', 'Phone'],
  ['email', 'Email'],
  ['gender', 'Gender'],
  ['what', 'Post / interests'],
  ['experience', 'Experience'],
  ['note', 'Note'],
  ['status', 'Status'],
  ['created_at', 'Applied'],
];

/** The value shown in one cell (posts for committee applicants, interests for general members). */
const value = (r, key) => {
  if (key === 'what') return r.type === 'committee' ? r.post || '' : r.type === 'ambassador' ? 'Department Ambassador' : (r.interests || []).join(', ');
  if (key === 'created_at') return r.created_at ? new Date(r.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '';
  return r[key] ?? '';
};

// short columns stay on one line, long ones get room to breathe, like a spreadsheet
const WIDTH = {
  full_name: 'min-w-44', what: 'min-w-40', experience: 'min-w-32', note: 'min-w-40',
  student_id: 'whitespace-nowrap', batch: 'whitespace-nowrap', department: 'whitespace-nowrap', phone: 'whitespace-nowrap',
  email: 'whitespace-nowrap', gender: 'whitespace-nowrap', status: 'whitespace-nowrap capitalize', created_at: 'whitespace-nowrap',
};

const cell = (v) => { let s = String(v ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; return `"${s.replace(/"/g, '""')}"`; };

/** Every application in one spreadsheet-like table: sort any column, open a row, download what you see. */
export default function ApplicationsTable({ rows, onOpen, q }) {
  const [sort, setSort] = useState({ key: 'created_at', dir: -1 });

  const data = useMemo(() => [...rows].sort((a, b) => {
    const x = value(a, sort.key); const y = value(b, sort.key);
    const asDate = sort.key === 'created_at';
    return (asDate ? (new Date(x).getTime() || 0) - (new Date(y).getTime() || 0)
      : String(x).localeCompare(String(y), undefined, { numeric: true, sensitivity: 'base' })) * sort.dir;
  }), [rows, sort]);
  const toggle = (key) => setSort((s) => (s.key === key ? { key, dir: -s.dir } : { key, dir: 1 }));

  const download = (kind) => {
    const columns = COLS.map(([, label]) => label);
    const rows = data.map((r) => COLS.map(([key]) => value(r, key)));
    const name = `applications-${rows.length}-rows`;
    if (kind === 'xlsx') return saveTableExcel({ title: 'Applications', subtitle: `${rows.length} ${rows.length === 1 ? 'row' : 'rows'} · ${columns.length} columns`, columns, rows, filename: `${name}.xlsx` });
    const csv = `\ufeff${[columns.map(cell).join(','), ...rows.map((line) => line.map(cell).join(','))].join('\r\n')}\r\n`;
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })), download: `${name}.csv` });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  if (!rows.length) return <p className="py-6 text-center text-sm text-muted">No applications to show.</p>;

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted">
        <span>Click a row to open that applicant. Click a column name to sort.{q ? ' Search filters the rows.' : ''}</span>
        <span className="flex items-center gap-2">
          <span className="font-mono">{data.length} row{data.length === 1 ? '' : 's'} · {COLS.length} columns</span>
          <button onClick={() => download('xlsx')} title="Download exactly these rows as an Excel workbook" className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 font-semibold text-fg2 hover:border-tech hover:text-tech"><FileSpreadsheet size={13} /> Excel</button>
          <button onClick={() => download('csv')} title="Download exactly these rows as a CSV" className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 font-semibold text-fg2 hover:border-tech hover:text-tech"><Download size={13} /> CSV</button>
        </span>
      </div>
      <div className="overflow-auto rounded-2xl border border-line bg-surface" style={{ maxHeight: '70vh' }}>
        <table className="w-full border-separate border-spacing-0 text-xs">
          <thead><tr>
            <th scope="col" className="sticky left-0 top-0 z-20 border-b border-r border-line bg-alt px-3 py-2.5 text-left font-mono text-[10px] text-fg2">#</th>
            {COLS.map(([key, label]) => (
              <th key={key} scope="col" className="sticky top-0 z-10 border-b border-line bg-alt px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.12em] text-fg2">
                <button onClick={() => toggle(key)} className="flex items-center gap-1 whitespace-nowrap hover:text-tech">{label}{sort.key === key && (sort.dir === 1 ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}</button>
              </th>
            ))}
          </tr></thead>
          <tbody>
            {data.map((r, i) => (
              <tr key={r.id} onClick={() => onOpen?.(r)} className="group cursor-pointer">
                <td className="sticky left-0 z-[5] border-b border-r border-line bg-surface px-3 py-2 font-mono text-[11px] text-muted group-hover:bg-alt">{i + 1}</td>
                {COLS.map(([key]) => (
                  <td key={key} className={cn('max-w-64 border-b border-line px-3 py-2 align-top text-fg2 group-hover:bg-alt', WIDTH[key])}>
                    <span className="line-clamp-3 break-words">{value(r, key) || <span className="text-muted/60">—</span>}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
