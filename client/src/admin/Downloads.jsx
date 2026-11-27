import { useEffect, useMemo, useState } from 'react';
import { Download, FileJson, FileSpreadsheet, Loader2, ShieldAlert, HardDriveDownload, Search } from 'lucide-react';
import useStore, { api } from '../context/store';
import { Panel, PageTitle, inputCls } from './ui';
import { saveFile } from '../lib/download';
import { cn } from '../lib/cn';

const today = () => new Date().toISOString().slice(0, 10);
const GROUPS = ['People', 'Events', 'Forms', 'Content', 'System'];

/**
 * Admin → Downloads: every list the club keeps, as CSV (Excel / Google Sheets) or JSON.
 * The server only sends what the logged-in role may see (an editor cannot download personal data).
 */
export default function Downloads() {
  const user = useStore((s) => s.user);
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [eventId, setEventId] = useState('');
  const [formId, setFormId] = useState('');
  const [events, setEvents] = useState([]);
  const [forms, setForms] = useState([]);
  const [busy, setBusy] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    api.get('/downloads').then((r) => setRows(r.data)).catch((e) => {
      setRows([]);
      setError(e?.response?.data?.error || 'Could not load the list of downloads.');
    });
    api.get('/events', { params: { _: Date.now() } }).then((r) => setEvents(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    api.get('/forms', { params: { _: Date.now() } }).then((r) => setForms(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);

  const range = useMemo(() => ({ ...(from ? { from } : {}), ...(to ? { to } : {}) }), [from, to]);
  const total = useMemo(() => (rows || []).reduce((n, r) => n + (Number(r.count) || 0), 0), [rows]);
  const filteredRows = useMemo(() => {
    const list = rows || [];
    const s = q.trim().toLowerCase();
    if (!s) return list;
    return list.filter((r) => [r.label, r.group, r.key, r.note].filter(Boolean).some((v) => String(v).toLowerCase().includes(s)));
  }, [rows, q]);

  const get = async (section, format) => {
    setBusy(`${section.key}:${format}`);
    const params = {
      format,
      ...range,
      ...(section.event && eventId ? { event: eventId } : {}),
      ...(section.form && formId ? { form: formId } : {}),
    };
    await saveFile(`/downloads/${section.key}`, params, `bauet-ict-${section.key}-${today()}.${format}`);
    setBusy('');
  };

  return (
    <div>
      <PageTitle title="Downloads" sub={`Every list the club keeps — as a spreadsheet (Excel or CSV) or JSON. ${total} rows in total.`}>
        {rows?.length > 0 && (
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search exports…" className={`${inputCls} !w-48 !rounded-full !py-2 pl-9 text-xs`} />
          </div>
        )}
        {user?.role === 'superadmin' && (
          <button onClick={() => saveFile('/backup', {}, `bauet-ict-backup-${today()}.zip`)} className="btn-outline !px-4 !py-2.5 text-xs">
            <HardDriveDownload size={14} /> Full backup (ZIP)
          </button>
        )}
      </PageTitle>

      <Panel className="mb-5 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-fg2">From (optional)</span>
            <input type="date" className={inputCls} value={from} max={to || today()} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-fg2">To (optional)</span>
            <input type="date" className={inputCls} value={to} min={from} onChange={(e) => setTo(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-fg2">One event (sign-ups)</span>
            <select className={inputCls} value={eventId} onChange={(e) => setEventId(e.target.value)}>
              <option value="">All events</option>
              {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-fg2">One form (responses)</span>
            <select className={inputCls} value={formId} onChange={(e) => setFormId(e.target.value)}>
              <option value="">All forms</option>
              {forms.map((f) => <option key={f.id} value={f.id}>{f.title || f.slug}</option>)}
            </select>
          </label>
        </div>
        <p className="mt-3 text-xs leading-5 text-muted">
          The date filter uses the day each row was created, and only applies to lists that have a date.
          Excel is a ready-to-filter .xlsx workbook, CSV opens anywhere else, and JSON keeps the full shape (answers, payment details) for another program.
        </p>
      </Panel>

      {error && (
        <Panel className="mb-5 flex items-start gap-3 border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-700">
          <ShieldAlert size={18} className="mt-0.5 shrink-0" /> {error}
        </Panel>
      )}

      {rows === null ? (
        <div className="grid place-items-center py-16"><Loader2 className="animate-spin text-muted" /></div>
      ) : !filteredRows.length ? (
        <Panel className="mb-6 p-10 text-center text-sm text-muted">{rows.length ? 'No matching exports.' : 'No exports available.'}</Panel>
      ) : (
        GROUPS.filter((g) => filteredRows.some((r) => r.group === g)).map((group) => (
          <section key={group} className="mb-6">
            <h2 className="mb-2 px-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">{group}</h2>
            <Panel className="overflow-hidden">
              <ul className="divide-y divide-line">
                {filteredRows.filter((r) => r.group === group).map((r) => (
                  <li key={r.key} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm font-semibold text-fg">
                        {r.label}
                        {typeof r.count === 'number' && (
                          <span className={cn('rounded-full px-2 py-0.5 font-mono text-[10px]', r.count ? 'bg-accent/10 text-accent' : 'bg-alt text-muted')}>{r.count}</span>
                        )}
                      </div>
                      {r.note && <p className="mt-0.5 text-xs text-amber-600">{r.note}</p>}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button onClick={() => get(r, 'csv')} disabled={busy === `${r.key}:csv` || !r.count}
                        className="btn-outline !px-3 !py-2 text-xs disabled:opacity-40" title="Download as a spreadsheet">
                        {busy === `${r.key}:csv` ? <Loader2 size={13} className="animate-spin" /> : <FileSpreadsheet size={13} />} CSV
                      </button>
                      <button onClick={() => get(r, 'xlsx')} disabled={busy === `${r.key}:xlsx` || !r.count}
                        className="btn-outline !px-3 !py-2 text-xs disabled:opacity-40" title="Download as an Excel workbook">
                        {busy === `${r.key}:xlsx` ? <Loader2 size={13} className="animate-spin" /> : <FileSpreadsheet size={13} />} Excel
                      </button>
                      <button onClick={() => get(r, 'json')} disabled={busy === `${r.key}:json` || !r.count}
                        className="btn-outline !px-3 !py-2 text-xs disabled:opacity-40" title="Download as JSON">
                        {busy === `${r.key}:json` ? <Loader2 size={13} className="animate-spin" /> : <FileJson size={13} />} JSON
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          </section>
        ))
      )}

      <Panel className="flex items-start gap-3 p-4 text-xs leading-5 text-fg2">
        <Download size={16} className="mt-0.5 shrink-0 text-accent" />
        <p>
          These files hold personal data (names, e-mails, phone numbers, payment details). Keep them on the club's own computer,
          do not forward them to a group chat, and delete them when the work is done. A <b>full backup</b> keeps one JSON file per
          table and leaves out passwords, 2FA secrets and phone tokens.
        </p>
      </Panel>
    </div>
  );
}
