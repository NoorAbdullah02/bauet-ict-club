import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { BadgeCheck, BarChart3, Download, FileSpreadsheet, FileText, FileType2, Link2, List, Loader2, Search, Trash2, Users, XCircle } from 'lucide-react';
import { api } from '../context/store';
import { Drawer, inputCls, askConfirm } from './ui';
import { Donut, HBars } from './charts';
import { formalDate } from '../lib/format';
import { eventLink, copyText } from '../lib/share';
import { fieldsOf, show, isOther } from '../lib/forms';
import { cn } from '../lib/cn';
import Select from '../components/Select';
import { saveFile, IMAGE_FORMATS } from '../lib/download';
import { Archive, Table2 } from 'lucide-react';
import ResponsesTable from './ResponsesTable';
import ResponsesSummary from './ResponsesSummary';

const ans = (r) => r.answers || { name: r.full_name, student_id: r.student_id, email: r.email, phone: r.phone, department: r.department, batch: r.batch };
const PAY = { pending: ['Waiting for check', 'bg-amber-500/15 text-amber-600'], verified: ['Payment verified', 'bg-emerald-500/15 text-emerald-600'], rejected: ['Payment rejected', 'bg-red-500/15 text-red-500'] };

/** Count how often each choice was picked (typed "Other" answers are grouped as Other). */
function tallyChoices(f, rows) {
  const m = {};
  rows.forEach((r) => {
    const v = ans(r)[f.id];
    (Array.isArray(v) ? v : v === undefined || v === '' ? [] : [v]).forEach((x) => { const k = isOther(x) ? 'Other' : String(x); m[k] = (m[k] || 0) + 1; });
  });
  return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

/** Everyone who signed up for one event: responses, payment checks, a summary with charts, and downloads. */
/** Numbers about one event: sign-ups, who came, where they study, when they signed up, the money. */
function EventInsights({ id }) {
  const [d, setD] = useState(null);
  useEffect(() => { let on = true; api.get(`/event-registrations/analytics/${id}`).then((r) => on && setD(r.data)).catch(() => on && setD(false)); return () => { on = false; }; }, [id]);
  if (d === null) return <div className="mt-5 h-28 animate-pulse rounded-2xl bg-alt" />;
  if (!d || !d.total) return null;
  const max = (list) => Math.max(1, ...list.map((x) => x.count));
  const dayMax = max(d.by_day);
  const Card = ({ label, value, sub, tone }) => (
    <div className="rounded-2xl border border-line bg-surface p-4"><div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">{label}</div><div className={cn('mt-1 font-display text-3xl', tone || 'text-fg')}>{value}</div>{sub && <div className="text-[11px] text-muted">{sub}</div>}</div>
  );
  const Bars = ({ title, list }) => (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">{title}</div>
      <div className="space-y-2">{list.slice(0, 6).map((x) => (
        <div key={x.label} className="flex items-center gap-3 text-xs"><span className="w-24 shrink-0 truncate text-fg2" title={x.label}>{x.label}</span>
          <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-alt"><i className="block h-full rounded-full bg-accent" style={{ width: `${(x.count / max(list)) * 100}%` }} /></span><span className="w-6 text-right font-mono text-fg">{x.count}</span></div>
      ))}</div>
    </div>
  );
  return (
    <div className="mt-5">
      <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted"><BarChart3 size={13} className="text-accent" /> Insights</div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card label="Signed up" value={d.total} sub={d.event.capacity ? `${d.seats_left} seats left of ${d.event.capacity}` : 'no limit'} />
        <Card label="Came" value={`${d.check_in_rate}%`} sub={`${d.checked_in} checked in`} tone="text-emerald-600" />
        <Card label="Waiting list" value={d.waiting} sub={`${d.pending_payment} waiting for payment`} />
        {d.money ? <Card label="Money" value={`${d.money.amount} BDT`} sub={`${d.money.online} online · ${d.money.by_hand} by hand${d.money.to_check ? ` · ${d.money.to_check} to check` : ''}`} tone="text-accent" /> : <Card label="Cancelled" value={d.cancelled} />}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Bars title="By department" list={d.by_department} />
        <Bars title="By batch" list={d.by_batch} />
      </div>
      {d.by_day.length > 1 && (
        <div className="mt-3 rounded-2xl border border-line bg-surface p-4">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Sign-ups by day</div>
          <div className="flex h-24 items-end gap-1">{d.by_day.map((x) => <span key={x.day} title={`${x.day}: ${x.count}`} className="flex-1 rounded-t bg-tech/70" style={{ height: `${Math.max(6, (x.count / dayMax) * 100)}%` }} />)}</div>
          <div className="mt-1 flex justify-between font-mono text-[10px] text-muted"><span>{d.by_day[0].day}</span><span>{d.by_day[d.by_day.length - 1].day}</span></div>
        </div>
      )}
    </div>
  );
}

export function ResponsesPanel({ event, kind = 'event' }) {
  const isForm = kind === 'form';
  const P = isForm ? {
    list: (id) => `/forms/${id}/responses`, file: (id) => `/forms/${id}/export`, zip: (id) => `/forms/${id}/zip`, edit: (rid) => `/forms/responses/${rid}/answers`, pay: (rid) => `/forms/responses/${rid}/payment`, del: (rid) => `/forms/responses/${rid}`,
    link: (e) => `${window.location.origin}/f/${e.slug}`,
  } : {
    list: (id) => `/event-registrations/by-event/${id}`, file: () => '/event-registrations/export', zip: () => '/event-registrations/zip', edit: (rid) => `/event-registrations/${rid}/answers`, pay: (rid) => `/event-registrations/${rid}/payment`, del: (rid) => `/event-registrations/${rid}`,
    link: (e) => eventLink(e.id),
  };
  const idParam = isForm ? {} : { event: event?.id };
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('list');
  const [payFilter, setPayFilter] = useState('all');
  const [imgFormat, setImgFormat] = useState('original');

  const load = () => api.get(P.list(event.id)).then((r) => setRows(r.data)).catch(() => { setRows([]); toast.error('Could not load the list'); });
  useEffect(() => { setRows(null); setQ(''); setTab('list'); setPayFilter('all'); if (event) load(); }, [event?.id]);

  const fields = event ? fieldsOf(event).filter((f) => f.type !== 'section') : [];
  const paid = !!event?.reg_form?.payment?.enabled;
  // the columns that are not questions, so the table and the CSV hold everything at once
  const system = [
    ...(isForm ? [] : [{ label: 'Ticket', value: (r) => r.ticket || '' }, { label: 'Seat', value: (r) => (r.waitlisted ? 'Waiting list' : 'Confirmed') }]),
    ...(paid ? [{ label: 'Payment status', value: (r) => r.pay_status || '' }, { label: 'Transaction ID', value: (r) => r.payment?.trx_id || '' }, { label: 'Amount (BDT)', value: (r) => r.payment?.amount || '' }] : []),
    { label: 'Checked in', value: (r) => (r.checked_in_at ? formalDate(r.checked_in_at) : '') },
  ];
  const fileBase = `${isForm ? 'form' : 'event'}-${event?.id || ''}-responses`;
  const shown = useMemo(() => (rows || []).filter((r) => (payFilter === 'all' || r.pay_status === payFilter) && (!q || `${JSON.stringify(ans(r))} ${r.payment?.trx_id || ''}`.toLowerCase().includes(q.toLowerCase()))), [rows, q, payFilter]);
  const verifiedSum = (rows || []).filter((r) => r.pay_status === 'verified').reduce((n, r) => n + Number(r.payment?.amount || 0), 0);

  const download = async (format) => {
    try {
      const { data } = await api.get(P.file(event.id), { params: { ...idParam, format }, responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const a = Object.assign(document.createElement('a'), { href: url, download: `event-${event.id}-registrations.${format}` });
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch { toast.error('Could not download the list'); }
  };
  const promote = async (r) => {
    try { await api.patch(`/event-registrations/${r.id}/promote`); toast.success('Seat given. The person gets an email.'); load(); } catch (ex) { toast.error(ex.response?.data?.error || 'Could not give a seat'); }
  };
  const remove = async (r) => {
    if (!(await askConfirm({ title: `Remove this sign-up?`, message: 'It goes to the Trash and the person can register again.', confirmText: 'Remove', danger: true }))) return;
    try { await api.delete(P.del(r.id)); setRows((p) => p.filter((x) => x.id !== r.id)); toast.success('Removed'); if (!isForm) setTimeout(load, 700); } catch { toast.error('Could not remove'); }
  };
  const setPay = async (r, status) => {
    const word = status === 'verified' ? 'Verify' : 'Reject';
    if (status !== 'pending' && !(await askConfirm({ title: `${word} this payment?`, message: `${r.payment?.method} · TrxID ${r.payment?.trx_id} · ${r.payment?.amount} BDT. The person gets an email.`, confirmText: word, danger: status === 'rejected' }))) return;
    try { const { data } = await api.patch(P.pay(r.id), { status }); setRows((p) => p.map((x) => (x.id === r.id ? data : x))); toast.success(status === 'verified' ? 'Payment verified' : status === 'rejected' ? 'Payment rejected' : 'Back to waiting'); } catch (e) { toast.error(e.response?.data?.error || 'Could not update'); }
  };

  if (!event) return null;
  return (
        <>
          <div className="rounded-2xl border border-line bg-alt/50 p-4">
            <div className="font-display text-lg text-fg">{event.title}</div>
            {!isForm && <div className="mt-0.5 text-xs text-fg2">{formalDate(event.date)}{event.location ? ` · ${event.location}` : ''}</div>}
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-xs">
              <Link2 size={14} className="shrink-0 text-accent" />
              <span className="min-w-0 flex-1 truncate font-mono text-fg2">{P.link(event)}</span>
              <button onClick={async () => toast[(await copyText(P.link(event))) ? 'success' : 'error']('Link copied')} className="font-semibold text-tech">Copy</button>
            </div>
            {event.reg_url && <p className="mt-2 text-xs text-muted">This event sends people to your own form, so sign-ups from the website form are not collected here.</p>}
          </div>

          {!isForm && !event.reg_url && <EventInsights id={event.id} />}

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted"><Users size={13} className="text-accent" /> Registered</div>
              <div className="mt-1.5 font-display text-3xl leading-none text-fg">{rows ? rows.filter((x) => !x.waitlisted).length : '…'}{event.capacity ? <span className="text-base text-muted"> / {event.capacity}</span> : null}</div>
              {event.capacity ? (
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-alt" role="progressbar" aria-valuemin={0} aria-valuemax={event.capacity} aria-valuenow={rows?.filter((x) => !x.waitlisted).length || 0}>
                  <div className="h-full rounded-full bg-gradient-to-r from-tech to-accent transition-all duration-700" style={{ width: `${Math.min(100, ((rows?.length || 0) / event.capacity) * 100)}%` }} />
                </div>
              ) : <div className="mt-3 text-[11px] text-muted">No seat limit</div>}
            </div>
            {paid && (
              <div className="rounded-2xl border border-line bg-surface p-4">
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted"><BadgeCheck size={13} className="text-emerald-500" /> Verified</div>
                <div className="mt-1.5 font-display text-3xl leading-none text-fg">{verifiedSum}<span className="text-base text-muted"> BDT</span></div>
                <div className="mt-3 text-[11px] text-muted">{(rows || []).filter((r) => r.pay_status === 'pending').length} waiting for check</div>
              </div>
            )}
          </div>

          <div className="mt-5">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Download the list</div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {[['csv', Download, 'CSV', 'Any tool', 'text-emerald-500 bg-emerald-500/12'], ['xlsx', FileSpreadsheet, 'Excel', 'Styled, sortable', 'text-emerald-600 bg-emerald-500/12'], ['pdf', FileText, 'PDF', 'Print ready', 'text-red-500 bg-red-500/12'], ['docx', FileType2, 'Word', 'Editable', 'text-tech bg-tech/12']].map(([f, I, l, sub, tone]) => (
                <button key={f} disabled={!rows?.length} onClick={() => download(f)} className="group flex flex-col items-center gap-1.5 rounded-2xl border border-line bg-surface px-3 py-4 text-center transition hover:-translate-y-0.5 hover:border-tech hover:shadow-lg disabled:pointer-events-none disabled:opacity-40">
                  <span className={`grid size-10 place-items-center rounded-xl transition group-hover:scale-110 ${tone}`}><I size={18} /></span>
                  <span className="text-sm font-semibold text-fg">{l}</span>
                  <span className="text-[11px] text-muted">{sub}</span>
                </button>
              ))}
            </div>
            <div className="mt-2.5 flex items-center justify-between rounded-xl border border-line bg-alt/40 px-3.5 py-2 text-xs">
              <span className="text-fg2">Share or collaborate in Google Sheets?</span>
              <a href="https://sheets.new" target="_blank" rel="noopener noreferrer" className="font-semibold text-tech hover:underline">Open Google Sheets (sheets.new) →</a>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-tech/30 bg-gradient-to-br from-tech/10 via-surface to-accent/10 p-4">
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-tech to-accent text-white shadow-lg"><Archive size={20} /></span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-fg">Everything in one download</div>
                <p className="mt-0.5 text-xs leading-5 text-fg2">The list (CSV, Excel, PDF, Word), the event picture and every uploaded picture in full quality, as one ZIP file.</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Select className={`${inputCls} !w-auto min-w-0 flex-1 !py-2 text-xs`} value={imgFormat} onChange={(e) => setImgFormat(e.target.value)} aria-label="Picture format">{IMAGE_FORMATS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
              <button onClick={() => saveFile(P.zip(event.id), { ...idParam, format: imgFormat }, `${isForm ? 'form' : 'event'}-${event.id}.zip`)} className="btn-primary !px-5 !py-2.5 text-xs"><Download size={14} /> Download ZIP</button>
            </div>
          </div>

          <div className="mt-4 flex gap-1 rounded-xl bg-alt p-1">
            {[['list', List, 'Responses'], ['table', Table2, 'Table'], ['summary', BarChart3, 'Summary']].map(([k, I, l]) => (
              <button key={k} onClick={() => setTab(k)} className={cn('flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition', tab === k ? 'bg-surface text-fg shadow-sm' : 'text-fg2')}><I size={14} /> {l}</button>
            ))}
          </div>

          {tab === 'table' ? (
            <div className="mt-3">
              <div className="relative mb-3"><Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search answers" className={`${inputCls} !pl-9 !py-2 text-xs`} /></div>
              {rows === null ? <Loader2 className="animate-spin text-muted" /> : <ResponsesTable fields={fields} rows={shown} q={q} system={system} title={event.title} fileBase={fileBase} onDelete={remove} editUrl={P.edit} onChange={(row) => setRows((p) => p.map((x) => (x.id === row.id ? { ...x, ...row } : x)))} />}
            </div>
          ) : tab === 'summary' ? (
            <ResponsesSummary fields={fields} rows={rows || []} paid={paid} />
          ) : (
            <>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <div className="relative min-w-40 flex-1"><Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search answers or transaction ID" className={`${inputCls} !rounded-full !py-2 pl-9`} /></div>
                {paid && ['all', 'pending', 'verified', 'rejected'].map((s) => <button key={s} onClick={() => setPayFilter(s)} className={cn('rounded-full border px-3 py-1.5 text-xs capitalize transition', payFilter === s ? 'border-accent bg-accent text-white' : 'border-line text-fg2 hover:border-accent')}>{s}</button>)}
              </div>
              <div className="mt-3 space-y-2">
                {rows === null ? <Loader2 className="animate-spin text-muted" /> : shown.length === 0 ? <p className="py-6 text-center text-sm text-muted">{rows.length ? 'No match.' : 'Nobody has registered yet. Share the link above.'}</p> : shown.map((r) => (
                  <div key={r.id} className="rounded-2xl border border-line p-3.5">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1 text-sm">
                        <div className="truncate font-semibold text-fg">{r.full_name || show(ans(r)[fields[0]?.id]) || 'Response'}</div>
                        <dl className="mt-1 space-y-0.5">
                          {fields.filter((f) => show(ans(r)[f.id]) !== '').map((f) => (
                            <div key={f.id} className="flex gap-2 text-xs"><dt className="w-28 shrink-0 truncate text-muted">{f.label}</dt><dd className="min-w-0 break-words text-fg2">{f.type === 'email' ? <a href={`mailto:${show(ans(r)[f.id])}`} className="text-tech">{show(ans(r)[f.id])}</a> : f.type === 'photo' ? <a href={show(ans(r)[f.id])} target="_blank" rel="noreferrer" className="text-tech underline">Open picture</a> : show(ans(r)[f.id])}</dd></div>
                          ))}
                        </dl>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 font-mono text-[10px] uppercase tracking-wider text-muted"><span>{formalDate(r.created_at)}</span>{r.ticket && <span>ticket {r.ticket}</span>}{r.checked_in_at && <span className="text-emerald-600">checked in</span>}{r.waitlisted && <span className="rounded-full bg-sky-500/15 px-2 py-0.5 font-semibold text-sky-600">waiting list</span>}</div>
                      </div>
                      {r.waitlisted && <button onClick={() => promote(r)} className="rounded-lg bg-sky-500/10 px-2.5 py-1.5 text-xs font-semibold text-sky-600 transition hover:bg-sky-500/20">Give a seat</button>}
                      <button onClick={() => remove(r)} aria-label="Remove this sign-up" className="grid size-8 place-items-center rounded-lg text-fg2 transition hover:bg-red-500/10 hover:text-red-500"><Trash2 size={14} /></button>
                    </div>
                    {r.payment && (
                      <div className="mt-3 rounded-xl bg-alt p-3 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className={cn('rounded-full px-2.5 py-1 font-semibold', PAY[r.pay_status]?.[1])}>{PAY[r.pay_status]?.[0] || r.pay_status}</span>
                          <span className="font-mono text-fg">{r.payment.amount} BDT · {r.payment.method}</span>
                        </div>
                        <div className="mt-2 grid gap-1 text-fg2"><span>Transaction ID: <b className="font-mono text-fg">{r.payment.trx_id}</b></span><span>Paid from: {r.payment.sender}</span></div>
                        <div className="mt-2.5 flex gap-2">
                          {r.pay_status !== 'verified' && <button onClick={() => setPay(r, 'verified')} className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 font-semibold text-white"><BadgeCheck size={13} /> Verify</button>}
                          {r.pay_status !== 'rejected' && <button onClick={() => setPay(r, 'rejected')} className="flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5 font-semibold text-red-500"><XCircle size={13} /> Reject</button>}
                          {r.pay_status !== 'pending' && <button onClick={() => setPay(r, 'pending')} className="rounded-lg border border-line px-3 py-1.5 font-semibold text-fg2">Undo</button>}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </>
  );
}

/** The same panel inside a side drawer (used for events in the admin list). */
export default function EventRegistrations({ event, onClose, kind = 'event' }) {
  return (
    <Drawer open={!!event} title={kind === 'form' ? 'Responses' : 'Event registrations'} onClose={onClose}>
      <ResponsesPanel event={event} kind={kind} />
    </Drawer>
  );
}
