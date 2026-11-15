import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AlertTriangle, ArrowLeft, ArrowRight, Award, Clock, RotateCw, XCircle, BadgeCheck, Camera, CameraOff, CheckCircle2, CircleAlert, Eye, Loader2, Mail, Pencil, Search, UserCheck, UserX } from 'lucide-react';
import useStore, { api } from '../context/store';
import { Panel, inputCls, askConfirm } from './ui';
import { formalDate } from '../lib/format';
import { prettyCode } from '../lib/qr';
import { fieldsOf, show } from '../lib/forms';
import PdfCanvas from '../components/PdfCanvas';
import { cn } from '../lib/cn';

const ans = (r) => r.answers || { name: r.full_name, student_id: r.student_id, email: r.email };

/** Entrance desk for one event: scan or type the ticket code, see who is in, then send certificates. */
export default function CheckIn() {
  const { id } = useParams();
  const storeEvents = useStore((s) => s.events);
  const [ev, setEv] = useState(null);
  const [rows, setRows] = useState(null);
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null); // { tone: ok|warn|bad, text, force? }
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState('');
  const [camera, setCamera] = useState(false);
  const [cameraNote, setCameraNote] = useState('');
  const [editing, setEditing] = useState(null); // { id, value }: the name printed on one person's certificate
  const [review, setReview] = useState(null); // the saved choice, the final-check data and the stage: draft | review | published
  const [sending, setSending] = useState(false);
  const [view, setView] = useState(null); // { blob, url, title }: the certificate PDF shown on this page
  const videoRef = useRef(null);
  const lastScan = useRef({ code: '', at: 0 });

  const load = useCallback(() => api.get(`/event-registrations/by-event/${id}`).then((r) => setRows(r.data)).catch(() => { setRows([]); toast.error('Could not load the list'); }), [id]);
  useEffect(() => {
    const local = storeEvents.find((e) => String(e.id) === String(id));
    if (local) setEv(local); else api.get(`/events/${id}`).then((r) => setEv(r.data)).catch(() => setEv(false));
    load();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const counted = useMemo(() => (rows || []).filter((r) => r.pay_status !== 'rejected'), [rows]);
  const inCount = counted.filter((r) => r.checked_in_at).length;
  const shown = useMemo(() => (rows || []).filter((r) => !q || `${JSON.stringify(ans(r))} ${r.ticket}`.toLowerCase().includes(q.toLowerCase())), [rows, q]);
  const nameOf = (r) => r.cert_name || r.full_name || show(ans(r)[fieldsOf(ev || {})[0]?.id]) || 'Guest';

  const submit = useCallback(async (value, force = false) => {
    const c = String(value || '').trim();
    if (!c) return;
    setBusy(true);
    try {
      const { data } = await api.post('/event-registrations/checkin', { code: c, event: id, force });
      setResult(data.already ? { tone: 'warn', text: `${data.person.name} was already checked in` } : { tone: 'ok', text: `${data.person.name} is checked in` });
      navigator.vibrate?.(data.already ? [60, 40, 60] : 80);
      setCode(''); load();
    } catch (e) {
      const d = e.response?.data || {};
      setResult({ tone: d.needs_confirm ? 'warn' : 'bad', text: d.person ? `${d.person.name}: ${d.error}` : d.error || 'Could not check in', force: d.needs_confirm ? c : null });
      navigator.vibrate?.([120, 60, 120]);
    }
    setBusy(false);
  }, [id, load]);

  // camera scanner (Chrome and Edge; other browsers can type the code)
  useEffect(() => {
    if (!camera) return undefined;
    let stop = false; let stream; let timer;
    (async () => {
      if (!('BarcodeDetector' in window)) { setCameraNote('This browser cannot scan QR codes. Type the code instead, or open this page in Chrome on an Android phone.'); setCamera(false); return; }
      try {
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (stop) return stream.getTracks().forEach((t) => t.stop());
        videoRef.current.srcObject = stream; await videoRef.current.play();
        const tick = async () => {
          if (stop) return;
          try {
            const found = await detector.detect(videoRef.current);
            const raw = found[0]?.rawValue;
            if (raw && !(lastScan.current.code === raw && Date.now() - lastScan.current.at < 4000)) { lastScan.current = { code: raw, at: Date.now() }; submit(raw); }
          } catch { /* a frame that could not be read: try the next one */ }
          timer = setTimeout(tick, 250);
        };
        tick();
      } catch { setCameraNote('The camera could not be opened. Allow camera access, or type the code.'); setCamera(false); }
    })();
    return () => { stop = true; clearTimeout(timer); stream?.getTracks().forEach((t) => t.stop()); };
  }, [camera, submit]);

  const toggle = async (r) => {
    try { const { data } = await api.patch(`/event-registrations/${r.id}/checkin`, { checked: !r.checked_in_at }); setRows((p) => p.map((x) => (x.id === r.id ? { ...x, ...data } : x))); } catch { toast.error('Could not update'); }
  };
  const canSend = (r) => !!r.checked_in_at && !!r.email && r.pay_status !== 'rejected';
  const certUrl = (x = '') => `/event-registrations/event/${id}/certificates${x}`;
  const loadReview = useCallback(() => api.get(`/event-registrations/event/${id}/certificates`).then((r) => setReview(r.data)).catch(() => setReview(null)), [id]);
  useEffect(() => { if (ev && ev.reg_form?.cert?.enabled) loadReview(); }, [ev, rows, loadReview]);
  // while certificates are being sent, look again every few seconds so the admin sees the progress
  const queuedNow = review?.counts?.queued || 0;
  useEffect(() => {
    if (!queuedNow) return undefined;
    const t = setInterval(() => { load(); loadReview(); }, 3500);
    return () => clearInterval(t);
  }, [queuedNow, loadReview, load]);
  const retryFailed = async () => {
    try { const { data } = await api.post(certUrl('/retry')); toast.success(`${data.queued} certificate${data.queued === 1 ? '' : 's'} will be tried again`); await load(); await loadReview(); }
    catch (e) { toast.error(e.response?.data?.error || 'Could not retry'); }
  };
  const pick = async (body) => {
    try { await api.patch(certUrl('/pick'), body); await load(); await loadReview(); }
    catch (e) { toast.error(e.response?.data?.error || 'Could not save the choice'); }
  };
  const togglePick = (r) => pick({ ids: [r.id], picked: !r.cert_pick });
  const setStage = async (stage) => {
    try { await api.post(certUrl('/stage'), { stage }); await loadReview(); }
    catch (e) { toast.error(e.response?.data?.error || 'Could not change the step'); }
  };
  // shows the certificate exactly as it will be attached to the email (a sample when no person is given)
  const previewCert = async (r) => {
    try {
      const { data } = await api.get(certUrl('/preview'), { params: r ? { reg: r.id } : {}, responseType: 'blob' });
      const blob = new Blob([data], { type: 'application/pdf' });
      setView((old) => { if (old?.url) URL.revokeObjectURL(old.url); return { blob, url: URL.createObjectURL(blob), title: r ? (r.name || nameOf(r)) : 'Sample certificate' }; });
    } catch (e) { toast.error('Could not open the preview. Make sure certificates are switched on and saved for this event.'); }
  };
  const closeView = () => setView((old) => { if (old?.url) URL.revokeObjectURL(old.url); return null; });
  const saveName = async () => {
    if (!editing) return;
    try { await api.patch(`/event-registrations/${editing.id}/cert-name`, { name: editing.value }); toast.success('Name on the certificate saved'); setEditing(null); await load(); await loadReview(); }
    catch { toast.error('Could not save the name'); }
  };
  // publish = email the PDF certificate; only possible after the final check
  const publish = async (ids) => {
    const n = ids ? ids.length : review.waiting;
    if (!(await askConfirm({ title: ids ? 'Send a new copy?' : `Publish and email ${n} certificate${n === 1 ? '' : 's'}?`, message: ids ? 'This person gets the certificate again, with the corrected details.' : 'Each chosen person gets an email with their certificate attached as a PDF. Everyone else gets nothing.', confirmText: ids ? 'Send again' : 'Publish' }))) return;
    setSending(true);
    try { const { data } = await api.post(certUrl('/send'), ids ? { ids } : {}); toast.success(`Sending started: ${data.queued} certificate${data.queued === 1 ? '' : 's'} are on their way`); await load(); await loadReview(); }
    catch (e) { toast.error(e.response?.data?.error || 'Could not send'); }
    setSending(false);
  };

  if (ev === false) return <p className="text-sm text-red-500">Event not found.</p>;
  if (!ev || rows === null) return <Loader2 className="animate-spin text-muted" />;
  const certOn = !!ev.reg_form?.cert?.enabled;
  const sendable = (rows || []).filter(canSend);
  const notYet = sendable.filter((r) => !r.certificate_sent_at).length;
  const chosenCount = (rows || []).filter((r) => r.cert_pick).length;
  const stage = review?.stage || 'draft';
  const tone = { ok: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700', warn: 'border-amber-500/40 bg-amber-500/10 text-amber-700', bad: 'border-red-500/40 bg-red-500/10 text-red-600' };

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/admin/events" className="mb-4 inline-flex items-center gap-2 text-sm text-fg2 hover:text-tech"><ArrowLeft size={15} /> Events</Link>
      <h2 className="font-display text-3xl text-fg">Check-in</h2>
      <p className="text-sm text-fg2">{ev.title} · {formalDate(ev.date)}</p>

      <Panel className="mt-5 p-5">
        <div className="flex items-end justify-between gap-3"><div><div className="font-display text-4xl text-fg">{inCount}<span className="text-xl text-muted"> / {counted.length}</span></div><div className="text-xs text-muted">checked in</div></div>
          <div className="h-2 w-1/2 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-gradient-to-r from-accent to-tech transition-all" style={{ width: `${counted.length ? (inCount / counted.length) * 100 : 0}%` }} /></div></div>
      </Panel>

      <Panel className="mt-4 p-5">
        <form onSubmit={(e) => { e.preventDefault(); submit(code); }} className="flex gap-2">
          <input autoFocus value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Ticket code" aria-label="Ticket code" autoComplete="off" spellCheck={false}
            className={cn(inputCls, '!py-3.5 text-center font-mono !text-xl uppercase tracking-[0.25em]')} />
          <button disabled={busy || !code.trim()} className="btn-primary !px-6 disabled:opacity-60">{busy ? <Loader2 size={16} className="animate-spin" /> : <UserCheck size={16} />} Check in</button>
        </form>
        <button onClick={() => { setCameraNote(''); setCamera((c) => !c); }} className="mt-3 flex items-center gap-2 text-xs font-semibold text-tech">{camera ? <CameraOff size={14} /> : <Camera size={14} />} {camera ? 'Stop the camera' : 'Scan QR codes with the camera'}</button>
        {cameraNote && <p className="mt-2 text-xs text-amber-600">{cameraNote}</p>}
        {camera && <video ref={videoRef} muted playsInline className="mt-3 aspect-video w-full rounded-2xl bg-black object-cover" />}
        {result && (
          <div role="status" className={cn('mt-4 flex items-center gap-3 rounded-2xl border p-4 text-sm font-semibold', tone[result.tone])}>
            {result.tone === 'ok' ? <CheckCircle2 size={20} /> : <CircleAlert size={20} />}<span className="min-w-0 flex-1">{result.text}</span>
            {result.force && <button onClick={() => submit(result.force, true)} className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-xs text-white">Check in anyway</button>}
          </div>
        )}
      </Panel>

      {certOn && stage === 'draft' && (
        <Panel className="mt-4 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <Award size={22} className="text-accent" />
            <div className="min-w-0 flex-1 text-sm"><b className="text-fg">Certificates · step 1 of 2: choose the people</b><div className="text-xs text-fg2">Tick the people on the list below. Nobody is chosen until you tick them. Everyone checked in can still download their own certificate. Then go to the final check.</div></div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => pick({ all: true, picked: true })} disabled={!notYet} className="rounded-lg border border-line px-3 py-2 text-xs font-semibold text-fg2 hover:border-tech hover:text-tech disabled:opacity-40">Tick everyone not emailed yet ({notYet})</button>
            <button type="button" onClick={() => previewCert(null)} className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-semibold text-fg2 hover:border-tech hover:text-tech"><Eye size={13} /> Preview certificate</button>
            <button type="button" onClick={() => pick({ all: true, picked: false })} disabled={!chosenCount} className="rounded-lg border border-line px-3 py-2 text-xs font-semibold text-fg2 hover:border-red-500 hover:text-red-500 disabled:opacity-40">Clear</button>
            <button type="button" onClick={() => setStage('review')} disabled={!chosenCount} className="btn-primary ml-auto !px-4 !py-2.5 text-xs disabled:opacity-50">Final check ({chosenCount}) <ArrowRight size={14} /></button>
          </div>
        </Panel>
      )}
      {certOn && stage !== 'draft' && review && (
        <Panel className="mt-4 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <Award size={22} className="text-accent" />
            <div className="min-w-0 flex-1 text-sm"><b className="text-fg">Certificates · step 2 of 2: final check{stage === 'published' ? ' (published)' : ''}</b><div className="text-xs text-fg2">{stage === 'published' ? 'The certificates were emailed. You can still open this page, fix a name and send a new copy to one person.' : 'Look at everything once more. If it is all right, publish. If not, go back and change it: nothing has been sent yet.'}</div></div>
          </div>
          <dl className="mt-4 grid gap-x-6 gap-y-1.5 rounded-xl border border-line bg-bg/50 p-4 text-sm sm:grid-cols-2">
            {[['Title', review.cert.title], ['Organised by', review.cert.organizer || 'BAUET ICT Club'], ['Kind of event', review.cert.event_kind || 'event'], ['Colours', review.cert.theme], ['Advisor (right)', `${review.cert.signer}, ${review.cert.signer_title} · signature: ${review.cert.signature_source}`], ['President (left)', review.cert.signer2 ? `${review.cert.signer2}, ${review.cert.signer2_title} · signature: ${review.cert.signature2_source}` : 'not shown'], ['People', `${review.people.length} chosen · ${review.waiting} not emailed yet`]].map(([k, v]) => (
              <div key={k} className="flex gap-2"><dt className="w-28 shrink-0 text-xs uppercase tracking-wider text-muted">{k}</dt><dd className="min-w-0 break-words text-fg">{v}</dd></div>
            ))}
          </dl>
          <div className="mt-3 space-y-1.5" role="status">
            {review.problems.length === 0
              ? <p className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-700"><CheckCircle2 size={16} /> Everything looks right.</p>
              : review.problems.map((p, i) => <p key={i} className={cn('flex items-start gap-2 rounded-lg px-3 py-2 text-sm', p.level === 'error' ? 'bg-red-500/10 text-red-600' : 'bg-amber-500/10 text-amber-700')}><AlertTriangle size={16} className="mt-0.5 shrink-0" /> {p.text}</p>)}
          </div>
          {(review.counts.queued > 0 || review.counts.failed > 0 || review.counts.sent > 0) && (
            <div className="mt-3 space-y-2" role="status" aria-live="polite">
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-bg/50 p-3 text-sm">
                <span className="font-semibold text-fg">{review.counts.sent} sent</span>
                {review.counts.queued > 0 && <span className="flex items-center gap-1 text-sky-700"><Loader2 size={13} className="animate-spin" /> {review.counts.queued} on the way</span>}
                {review.counts.failed > 0 && <span className="font-semibold text-red-600">{review.counts.failed} failed</span>}
                <span className="ml-auto h-2 w-40 overflow-hidden rounded-full bg-line" aria-hidden="true"><span className="block h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.round((review.counts.sent / Math.max(1, review.people.length)) * 100)}%` }} /></span>
              </div>
              {review.counts.queued === 0 && review.counts.failed === 0 && review.counts.sent > 0 && <p className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-700"><CheckCircle2 size={16} /> All {review.counts.sent} certificates were emailed.</p>}
              {review.counts.failed > 0 && (
                <div className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">
                  <p className="font-semibold">{review.counts.failed} certificate{review.counts.failed === 1 ? '' : 's'} could not be sent. The reason is written next to each name below. Fix it (for example a wrong email address), then try again.</p>
                  <button type="button" onClick={retryFailed} className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white"><RotateCw size={13} /> Try the failed ones again</button>
                </div>
              )}
              {review.counts.queued > 0 && review.people.some((x) => x.status === 'queued' && /^Waiting/.test(x.error)) && <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-700">The mail service has reached its limit for now. The rest waits and goes out by itself later (nothing is lost, and you can close this page).</p>}
            </div>
          )}
          <ul className="mt-3 divide-y divide-line rounded-xl border border-line">
            {review.people.map((x) => (
              <li key={x.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                <span className="min-w-0 flex-1"><b className="text-fg">{x.name}</b>{x.custom_name && <span className="ml-2 rounded bg-tech/10 px-1.5 py-0.5 text-[10px] font-semibold text-tech">custom name</span>}<span className="block truncate text-xs text-fg2">{x.email || 'no email'}</span>{x.status === 'sent' && <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700"><Mail size={11} /> emailed</span>}{x.status === 'queued' && <span className="flex items-center gap-1 text-xs font-semibold text-sky-700"><Clock size={11} /> {x.error || 'on the way'}</span>}{x.status === 'failed' && <span className="flex items-start gap-1 text-xs font-semibold text-red-600"><XCircle size={11} className="mt-0.5 shrink-0" /> Could not send: {x.error}</span>}</span>
                <button type="button" onClick={() => previewCert(x)} className="rounded-lg border border-line px-2.5 py-1.5 text-xs text-fg2 hover:border-tech hover:text-tech"><Eye size={13} className="inline" /> Preview</button>
                <button type="button" onClick={() => setEditing({ id: x.id, value: x.name })} className="rounded-lg border border-line px-2.5 py-1.5 text-xs text-fg2 hover:border-tech hover:text-tech"><Pencil size={13} className="inline" /> Edit name</button>
                {stage === 'published' && (x.status === 'sent' || x.status === 'failed') && <button type="button" disabled={sending} onClick={() => publish([x.id])} className="rounded-lg border border-line px-2.5 py-1.5 text-xs text-fg2 hover:border-tech hover:text-tech">{x.status === 'failed' ? 'Try again' : 'Send again'}</button>}
              </li>
            ))}
          </ul>
          {editing && review.people.some((x) => x.id === editing.id) && (
            <form onSubmit={(e) => { e.preventDefault(); saveName(); }} className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-tech/40 bg-tech/5 p-3">
              <label htmlFor="certname" className="text-xs font-semibold text-fg2">Name on the certificate</label>
              <input id="certname" autoFocus value={editing.value} onChange={(e) => setEditing({ ...editing, value: e.target.value })} maxLength={80} className={cn(inputCls, 'min-w-0 flex-1 !py-2')} />
              <button className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white">Save</button>
              <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-line px-3 py-2 text-xs text-fg2">Cancel</button>
            </form>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setStage('draft')} className="rounded-lg border border-line px-3 py-2 text-xs font-semibold text-fg2 hover:border-tech hover:text-tech">← {stage === 'published' ? 'Choose more people' : 'Back to editing'}</button>
            <button type="button" onClick={() => previewCert(null)} className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-semibold text-fg2 hover:border-tech hover:text-tech"><Eye size={13} /> Preview certificate</button>
            <button type="button" onClick={() => publish(null)} disabled={!review.can_publish || !review.waiting || sending} className="btn-primary ml-auto !px-4 !py-2.5 text-xs disabled:opacity-50">{sending ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />} Publish: email {review.waiting} certificate{review.waiting === 1 ? '' : 's'}</button>
          </div>
        </Panel>
      )}

      <div className="relative mt-6"><Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, ID or code" className={`${inputCls} !rounded-full !py-2 pl-9`} /></div>
      <div className="mt-3 space-y-2">
        {shown.length === 0 ? <p className="py-8 text-center text-sm text-muted">{rows.length ? 'No match.' : 'Nobody has registered yet.'}</p> : shown.map((r) => (
          <div key={r.id} className={cn('flex items-center gap-3 rounded-2xl border p-3.5', r.checked_in_at ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-line')}>
            {certOn && r.checked_in_at && <input type="checkbox" checked={!!r.cert_pick} disabled={!canSend(r) || (r.certificate_sent_at && stage === 'published')} onChange={() => togglePick(r)} aria-label={`Email a certificate to ${nameOf(r)}`} title={r.email ? 'Email a certificate to this person' : 'No email address'} className="size-5 shrink-0 accent-[var(--accent)] disabled:opacity-30" />}
            <span className={cn('grid size-10 shrink-0 place-items-center rounded-full', r.checked_in_at ? 'bg-emerald-500 text-white' : 'bg-alt text-muted')}>{r.checked_in_at ? <BadgeCheck size={20} /> : <UserX size={18} />}</span>
            <div className="min-w-0 flex-1">
              {editing?.id === r.id && stage === 'draft' ? (
                <form onSubmit={(e) => { e.preventDefault(); saveName(); }} className="flex items-center gap-2">
                  <input autoFocus value={editing.value} onChange={(e) => setEditing({ ...editing, value: e.target.value })} maxLength={80} aria-label="Name on the certificate" placeholder="Name on the certificate" className={cn(inputCls, '!py-2')} />
                  <button className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white">Save</button>
                  <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-line px-3 py-2 text-xs text-fg2">Cancel</button>
                </form>
              ) : <div className="truncate font-semibold text-fg">{nameOf(r)}{r.cert_name && <span className="ml-2 rounded bg-tech/10 px-1.5 py-0.5 text-[10px] font-semibold text-tech">custom name</span>}{certOn && r.certificate_sent_at && <span className="ml-2 inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700"><Mail size={10} /> emailed</span>}</div>}
              <div className="flex flex-wrap items-center gap-x-3 text-xs text-fg2"><span className="font-mono tracking-wider">{prettyCode(r.ticket || '')}</span>{r.student_id && <span>ID {r.student_id}</span>}
                {r.pay_status === 'pending' && <span className="font-semibold text-amber-600">payment not verified</span>}{r.pay_status === 'rejected' && <span className="font-semibold text-red-500">payment rejected</span>}</div></div>
            {certOn && r.checked_in_at && !(editing?.id === r.id && stage === 'draft') && (
              <span className="flex shrink-0 gap-1">
                <button type="button" onClick={() => previewCert(r)} aria-label={`Preview the certificate of ${nameOf(r)}`} title="Preview the certificate" className="grid size-9 place-items-center rounded-lg border border-line text-fg2 hover:border-tech hover:text-tech"><Eye size={15} /></button>
                <button type="button" onClick={() => setEditing({ id: r.id, value: r.cert_name || nameOf(r) })} aria-label={`Edit the name on the certificate of ${nameOf(r)}`} title="Edit the name on the certificate" className="grid size-9 place-items-center rounded-lg border border-line text-fg2 hover:border-tech hover:text-tech"><Pencil size={15} /></button>
              </span>
            )}
            <button onClick={() => toggle(r)} disabled={r.pay_status === 'rejected'} className={cn('shrink-0 rounded-lg px-3.5 py-2 text-xs font-semibold transition disabled:opacity-40', r.checked_in_at ? 'border border-line text-fg2 hover:border-red-500 hover:text-red-500' : 'bg-accent text-white')}>{r.checked_in_at ? 'Undo' : 'Check in'}</button>
          </div>
        ))}
      </div>
      {view && (
        <div className="fixed inset-0 z-[1000] grid place-items-center overflow-y-auto bg-black/80 p-3" role="dialog" aria-modal="true" aria-label={`Certificate: ${view.title}`} onClick={closeView}>
          <div className="w-full max-w-4xl rounded-2xl bg-surface p-3 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between gap-3 px-1">
              <b className="truncate text-sm text-fg">{view.title}</b>
              <span className="flex shrink-0 items-center gap-3">
                <a href={view.url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-tech hover:underline">Open the PDF</a>
                <button type="button" onClick={closeView} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-fg2 hover:border-red-500 hover:text-red-500">Close</button>
              </span>
            </div>
            <PdfCanvas blob={view.blob} />
          </div>
        </div>
      )}
    </div>
  );
}
