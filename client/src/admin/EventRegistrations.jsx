import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { BadgeCheck, BarChart3, Download, FileText, FileType2, Link2, List, Loader2, Search, Trash2, Users, XCircle } from 'lucide-react';
import { api } from '../context/store';
import { Drawer, inputCls, askConfirm } from './ui';
import { Donut, HBars } from './charts';
import { formalDate } from '../lib/format';
import { eventLink, copyText } from '../lib/share';
import { fieldsOf, show, isOther } from '../lib/forms';
import { cn } from '../lib/cn';
import Select from '../components/Select';
import { saveFile, IMAGE_FORMATS } from '../lib/download';
import { Archive } from 'lucide-react';

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
export function ResponsesPanel({ event, kind = 'event' }) {
  const isForm = kind === 'form';
  const P = isForm ? {
    list: (id) => `/forms/${id}/responses`, file: (id) => `/forms/${id}/export`, zip: (id) => `/forms/${id}/zip`, pay: (rid) => `/forms/responses/${rid}/payment`, del: (rid) => `/forms/responses/${rid}`,
    link: (e) => `${window.location.origin}/f/${e.slug}`,
  } : {
    list: (id) => `/event-registrations/by-event/${id}`, file: () => '/event-registrations/export', zip: () => '/event-registrations/zip', pay: (rid) => `/event-registrations/${rid}/payment`, del: (rid) => `/event-registrations/${rid}`,
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
  const remove = async (r) => {
    if (!(await askConfirm({ title: `Remove this sign-up?`, message: 'It goes to the Trash and the person can register again.', confirmText: 'Remove', danger: true }))) return;
    try { await api.delete(P.del(r.id)); setRows((p) => p.filter((x) => x.id !== r.id)); toast.success('Removed'); } catch { toast.error('Could not remove'); }
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

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm font-semibold text-fg"><Users size={16} className="text-accent" /> {rows ? rows.length : '…'} registered{event.capacity ? ` of ${event.capacity}` : ''}{paid && rows ? ` · ${verifiedSum} BDT verified` : ''}</span>
            <div className="flex gap-1.5">
              {[['csv', Download, 'CSV'], ['pdf', FileText, 'PDF'], ['docx', FileType2, 'Word']].map(([f, I, l]) => (
                <button key={f} disabled={!rows?.length} onClick={() => download(f)} className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-fg2 transition hover:border-tech hover:text-tech disabled:opacity-40"><I size={13} /> {l}</button>
              ))}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-line p-3">
            <Archive size={16} className="shrink-0 text-accent" />
            <div className="min-w-0 flex-1 text-xs text-fg2"><b className="text-fg">Everything in one download</b><br />List (CSV, PDF, Word), the event picture and every uploaded picture in full quality.</div>
            <Select className={`${inputCls} !w-auto !py-1.5 text-xs`} value={imgFormat} onChange={(e) => setImgFormat(e.target.value)} aria-label="Picture format">{IMAGE_FORMATS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
            <button onClick={() => saveFile(P.zip(event.id), { ...idParam, format: imgFormat }, `${isForm ? 'form' : 'event'}-${event.id}.zip`)} className="btn-primary !px-4 !py-2 text-xs"><Download size={14} /> Download ZIP</button>
          </div>

          <div className="mt-4 flex gap-1 rounded-xl bg-alt p-1">
            {[['list', List, 'Responses'], ['summary', BarChart3, 'Summary']].map(([k, I, l]) => (
              <button key={k} onClick={() => setTab(k)} className={cn('flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition', tab === k ? 'bg-surface text-fg shadow-sm' : 'text-fg2')}><I size={14} /> {l}</button>
            ))}
          </div>

          {tab === 'summary' ? (
            <div className="mt-4 space-y-4">
              {!rows?.length ? <p className="py-6 text-center text-sm text-muted">The summary appears after the first registration.</p> : (
                <>
                  {paid && (
                    <div className="rounded-2xl border border-line p-4">
                      <h4 className="mb-2 text-sm font-semibold text-fg">Payments</h4>
                      <Donut height={150} data={['pending', 'verified', 'rejected'].map((s) => ({ name: s, value: rows.filter((r) => r.pay_status === s).length }))} colors={['#F5A524', '#18A957', '#EF6B8A']} />
                    </div>
                  )}
                  {fields.filter((f) => ['dropdown', 'radio', 'checkbox', 'yesno'].includes(f.type)).map((f) => (
                    <div key={f.id} className="rounded-2xl border border-line p-4"><h4 className="mb-2 text-sm font-semibold text-fg">{f.label}</h4>
                      {f.type === 'checkbox' || tallyChoices(f, rows).length > 4 ? <HBars data={tallyChoices(f, rows)} /> : <Donut height={150} data={tallyChoices(f, rows)} />}</div>
                  ))}
                  {fields.filter((f) => f.type === 'scale').map((f) => {
                    const vals = rows.map((r) => Number(ans(r)[f.id])).filter(Number.isFinite);
                    const avg = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '–';
                    return <div key={f.id} className="rounded-2xl border border-line p-4"><h4 className="text-sm font-semibold text-fg">{f.label}</h4><p className="mb-2 text-xs text-muted">Average {avg} of {f.scale?.max || 5} · {vals.length} answers</p><HBars data={Array.from({ length: f.scale?.max || 5 }, (_, i) => ({ name: String(i + 1), value: vals.filter((v) => v === i + 1).length }))} /></div>;
                  })}
                  {fields.filter((f) => ['short', 'long', 'number', 'email', 'phone', 'date', 'time'].includes(f.type)).map((f) => {
                    const list = rows.map((r) => show(ans(r)[f.id])).filter(Boolean);
                    return <div key={f.id} className="rounded-2xl border border-line p-4"><h4 className="text-sm font-semibold text-fg">{f.label}</h4><p className="mb-2 text-xs text-muted">{list.length} answers</p><ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-fg2">{list.slice(0, 40).map((x, i) => <li key={i} className="rounded-lg bg-alt px-2.5 py-1.5">{x}</li>)}</ul></div>;
                  })}
                </>
              )}
            </div>
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
                          {fields.filter((f) => show(ans(r)[f.id]) !== '').slice(0, 14).map((f) => (
                            <div key={f.id} className="flex gap-2 text-xs"><dt className="w-28 shrink-0 truncate text-muted">{f.label}</dt><dd className="min-w-0 break-words text-fg2">{f.type === 'email' ? <a href={`mailto:${show(ans(r)[f.id])}`} className="text-tech">{show(ans(r)[f.id])}</a> : f.type === 'photo' ? <a href={show(ans(r)[f.id])} target="_blank" rel="noreferrer" className="text-tech underline">Open picture</a> : show(ans(r)[f.id])}</dd></div>
                          ))}
                        </dl>
                        <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted">{formalDate(r.created_at)}</div>
                      </div>
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
