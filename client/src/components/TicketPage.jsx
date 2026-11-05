import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { CalendarPlus, CheckCircle2, Clock, Download, Loader2, MapPin, Printer, XCircle, Calendar, ScanLine } from 'lucide-react';
import { api } from '../context/store';
import { qrDataUrl, prettyCode } from '../lib/qr';
import { formalDate, formalTime } from '../lib/format';
import { downloadIcs } from '../lib/ics';

const STATUS = {
  confirmed: ['You are in', 'text-emerald-600 bg-emerald-500/10', CheckCircle2],
  pending: ['Waiting for payment check', 'text-amber-600 bg-amber-500/10', Clock],
  waitlist: ['On the waiting list', 'text-sky-600 bg-sky-500/10', Clock],
  cancelled: ['Cancelled', 'text-red-500 bg-red-500/10', XCircle],
};

/** One person's ticket for one event: a QR code to show at the entrance. Opened from the email or right after registering. */
export default function TicketPage() {
  const { code } = useParams();
  const [t, setT] = useState(null); // null = loading, false = not found
  const [qr, setQr] = useState('');
  const [gone, setGone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get(`/event-registrations/ticket/${code}`).then((r) => { setT(r.data); document.title = `Ticket: ${r.data.event.title} | BAUET ICT Club`; }).catch(() => setT(false));
    const meta = Object.assign(document.createElement('meta'), { name: 'robots', content: 'noindex' });
    document.head.appendChild(meta);
    return () => meta.remove();
  }, [code]);
  useEffect(() => { if (t) qrDataUrl(t.code, 420).then(setQr).catch(() => {}); }, [t]);

  if (t === null) return <section className="section"><div className="container grid min-h-[50vh] place-items-center"><Loader2 className="animate-spin text-muted" /></div></section>;
  if (t === false) return <section className="section"><div className="container grid min-h-[40vh] place-items-center text-center"><div><h1 className="text-3xl text-fg">Ticket not found</h1><p className="mt-2 text-fg2">Check the link in your email, or the code you typed.</p><Link to="/events" className="btn-primary mt-6 inline-flex">See events</Link></div></div></section>;

  const cancel = async () => {
    if (!window.confirm('Cancel your registration? Your seat goes to the next person and this ticket stops working.')) return;
    setBusy(true);
    try { await api.post(`/event-registrations/ticket/${t.code}/cancel`); setGone(true); }
    catch (ex) { toast.error(ex.response?.data?.error || 'Could not cancel. Please try again.'); }
    setBusy(false);
  };
  if (gone) return <section className="section"><div className="container grid min-h-[40vh] place-items-center text-center"><div><CheckCircle2 size={44} className="mx-auto text-emerald-500" /><h1 className="mt-3 text-3xl text-fg">Registration cancelled</h1><p className="mt-2 text-fg2">Your seat was given back. You can register again any time while seats are open.</p><a href="/events" className="btn-primary mt-5 inline-flex">See events</a></div></div></section>;

  const [label, tone, Icon] = STATUS[t.status] || STATUS.confirmed;
  const ev = t.event;
  return (
    <section className="section">
      <div className="container max-w-md">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="overflow-hidden rounded-[28px] border border-line bg-surface shadow-[var(--shadow-lg)] print:shadow-none">
          <div className="px-7 py-6 text-white" style={{ background: 'linear-gradient(120deg,#0A1A4A,#1F4FD8 70%,#17A2D8)' }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/70">Event ticket · BAUET ICT Club</div>
            <h1 className="mt-2 text-[1.6rem] leading-tight text-white">{ev.title}</h1>
          </div>
          <div className="space-y-2.5 px-7 pt-6 text-[15px] text-fg2">
            <div className="flex items-center gap-3"><Calendar size={17} className="text-accent" /> {formalDate(ev.date, { weekday: true })}{ev.time ? ` · ${formalTime(ev.time)}` : ''}</div>
            {ev.location && <div className="flex items-center gap-3"><MapPin size={17} className="text-accent" /> {ev.location}</div>}
          </div>
          <div className="mx-7 my-6 border-t border-dashed border-line" />
          <div className="px-7 pb-7 text-center">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted">Name</div>
            <div className="font-display text-2xl text-fg">{t.name}</div>
            <div className={`mx-auto mt-3 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold ${tone}`}><Icon size={14} /> {t.checked_in ? 'Checked in' : label}</div>
            <div className="mx-auto mt-5 grid size-56 place-items-center rounded-2xl border border-line bg-white p-2">
              {qr ? <img src={qr} alt={`QR code for ticket ${prettyCode(t.code)}`} className="size-full" /> : <Loader2 className="animate-spin text-muted" />}
            </div>
            <div className="mt-3 font-mono text-lg tracking-[0.25em] text-fg">{prettyCode(t.code)}</div>
            <p className="mt-1 text-xs text-muted">Show this at the entrance. Keep the code private.</p>
            {t.status === 'waitlist' && <p className="mt-3 rounded-xl bg-sky-500/10 p-3 text-xs text-sky-700">The event is full, so you are in line. If a seat opens up you get it automatically and we email you. Keep this page; it will show "You are in" then.</p>}
            {t.status === 'pending' && <p className="mt-3 rounded-xl bg-amber-500/10 p-3 text-xs text-amber-700">Your place is confirmed once we verify your payment. You will get an email.</p>}
            <div className="mt-6 flex flex-wrap justify-center gap-2 print:hidden">
              <button onClick={() => window.print()} className="btn-outline !px-4 !py-2.5 text-xs"><Printer size={14} /> Print</button>
              {t.status !== 'cancelled' && <button onClick={() => downloadIcs({ title: ev.title, date: String(ev.date).slice(0, 10), time: ev.time, location: ev.location, description: `Ticket ${prettyCode(t.code)}` })} className="btn-outline !px-4 !py-2.5 text-xs"><CalendarPlus size={14} /> Calendar</button>}
              {t.certificate && <a href={`/api/event-registrations/certificate/${t.code}`} className="btn-primary !px-4 !py-2.5 text-xs"><Download size={14} /> Certificate</a>}
            </div>
          </div>
        </motion.div>
        {t.can_cancel && <div className="mt-4 text-center print:hidden"><button onClick={cancel} disabled={busy} className="text-xs font-semibold text-red-500 underline underline-offset-2 disabled:opacity-50">{busy ? 'Cancelling…' : 'Cannot come? Cancel my registration'}</button></div>}
        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted print:hidden"><ScanLine size={13} /> Staff scan this code to check you in</p>
      </div>
    </section>
  );
}
