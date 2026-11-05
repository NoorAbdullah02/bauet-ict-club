import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Award, BadgeCheck, Camera, CameraOff, CheckCircle2, CircleAlert, Loader2, Mail, Search, UserCheck, UserX } from 'lucide-react';
import useStore, { api } from '../context/store';
import { Panel, inputCls } from './ui';
import { formalDate } from '../lib/format';
import { prettyCode } from '../lib/qr';
import { fieldsOf, show } from '../lib/forms';
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
  const nameOf = (r) => r.full_name || show(ans(r)[fieldsOf(ev || {})[0]?.id]) || 'Guest';

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
  const sendCerts = async () => {
    try { const { data } = await api.post(`/event-registrations/event/${id}/certificates/send`); toast.success(data.sent ? `Certificates emailed to ${data.sent} people` : 'Everyone checked in already has theirs'); load(); }
    catch (e) { toast.error(e.response?.data?.error || 'Could not send'); }
  };

  if (ev === false) return <p className="text-sm text-red-500">Event not found.</p>;
  if (!ev || rows === null) return <Loader2 className="animate-spin text-muted" />;
  const certOn = !!ev.reg_form?.cert?.enabled;
  const waiting = (rows || []).filter((r) => r.checked_in_at && !r.certificate_sent_at && r.email && r.pay_status !== 'rejected').length;
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

      {certOn && (
        <Panel className="mt-4 flex flex-wrap items-center gap-3 p-5">
          <Award size={22} className="text-accent" />
          <div className="min-w-0 flex-1 text-sm"><b className="text-fg">Certificates are on</b><div className="text-xs text-fg2">Everyone who is checked in can download theirs. {waiting} still to be emailed.</div></div>
          <button onClick={sendCerts} disabled={!waiting} className="btn-primary !px-4 !py-2.5 text-xs disabled:opacity-50"><Mail size={14} /> Email certificates</button>
        </Panel>
      )}

      <div className="relative mt-6"><Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, ID or code" className={`${inputCls} !rounded-full !py-2 pl-9`} /></div>
      <div className="mt-3 space-y-2">
        {shown.length === 0 ? <p className="py-8 text-center text-sm text-muted">{rows.length ? 'No match.' : 'Nobody has registered yet.'}</p> : shown.map((r) => (
          <div key={r.id} className={cn('flex items-center gap-3 rounded-2xl border p-3.5', r.checked_in_at ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-line')}>
            <span className={cn('grid size-10 shrink-0 place-items-center rounded-full', r.checked_in_at ? 'bg-emerald-500 text-white' : 'bg-alt text-muted')}>{r.checked_in_at ? <BadgeCheck size={20} /> : <UserX size={18} />}</span>
            <div className="min-w-0 flex-1"><div className="truncate font-semibold text-fg">{nameOf(r)}</div>
              <div className="flex flex-wrap items-center gap-x-3 text-xs text-fg2"><span className="font-mono tracking-wider">{prettyCode(r.ticket || '')}</span>{r.student_id && <span>ID {r.student_id}</span>}
                {r.pay_status === 'pending' && <span className="font-semibold text-amber-600">payment not verified</span>}{r.pay_status === 'rejected' && <span className="font-semibold text-red-500">payment rejected</span>}</div></div>
            <button onClick={() => toggle(r)} disabled={r.pay_status === 'rejected'} className={cn('shrink-0 rounded-lg px-3.5 py-2 text-xs font-semibold transition disabled:opacity-40', r.checked_in_at ? 'border border-line text-fg2 hover:border-red-500 hover:text-red-500' : 'bg-accent text-white')}>{r.checked_in_at ? 'Undo' : 'Check in'}</button>
          </div>
        ))}
      </div>
    </div>
  );
}
