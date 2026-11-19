import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, Clock, MapPin, CalendarPlus, Share2, Facebook, MessageCircle, Send, Link2, CheckCircle2, Loader2, Users, ExternalLink, Ticket } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import useStore, { api } from '../context/store';
import DynamicForm from './DynamicForm';
import PaymentBox from './PaymentBox';
import { useGateway, modeOf } from '../lib/pay';
import { qrDataUrl, prettyCode } from '../lib/qr';
import { fieldsOf, isVisible, isEmpty, themeStyle, scrollToFirstError } from '../lib/forms';
import { formalDate, formalTime } from '../lib/format';
import { thumb } from '../lib/img';
import { downloadIcs, eventStart } from '../lib/ics';
import { eventLink, shareLinks, copyText, nativeShare } from '../lib/share';
import CheckEmailNote from './CheckEmailNote';

/** One event with its own address (/events/12): details, share buttons and the registration form. */
export default function EventDetail() {
  const { id } = useParams();
  const { events } = useStore(useShallow((s) => ({ events: s.events })));
  const [fetched, setFetched] = useState(null);
  const [count, setCount] = useState(null);
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [thanks, setThanks] = useState('');
  const [waiting, setWaiting] = useState(0); // place in the waiting list (0 = a normal seat)
  const [payment, setPayment] = useState({});
  const [payErrors, setPayErrors] = useState({});
  const [pendingPay, setPendingPay] = useState(false);
  const [ticket, setTicket] = useState('');
  const [ticketQr, setTicketQr] = useState('');
  const [menu, setMenu] = useState(false);
  const gateway = useGateway();
  const payFailed = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('pay') === 'failed';

  const ev = useMemo(() => events.find((e) => String(e.id) === String(id)) || fetched, [events, fetched, id]);

  useEffect(() => { // opened straight from a shared link: ask for just this event
    if (!events.find((e) => String(e.id) === String(id))) api.get(`/events/${id}`).then((r) => setFetched(r.data)).catch(() => setFetched(false));
  }, [id, events]);
  useEffect(() => { api.get('/event-registrations/counts').then((r) => setCount(r.data[id] || 0)).catch(() => {}); }, [id, done]);
  useEffect(() => { if (ticket) qrDataUrl(ticket, 300).then(setTicketQr).catch(() => {}); }, [ticket]);
  useEffect(() => { if (ev?.title) document.title = `${ev.title} | BAUET ICT Club`; }, [ev?.title]);

  if (!ev) {
    return (
      <section className="section"><div className="container grid min-h-[40vh] place-items-center text-center">
        {fetched === false ? (<div><h1 className="text-3xl text-fg">Event not found</h1><p className="mt-2 text-fg2">It may have been removed.</p><Link to="/events" className="btn-primary mt-6 inline-flex">See all events</Link></div>)
          : <Loader2 className="animate-spin text-muted" />}
      </div></section>
    );
  }

  const start = eventStart(ev);
  const past = start ? start < new Date(new Date().toDateString()) : false;
  const full = !!ev.capacity && count !== null && count >= ev.capacity;
  const form0 = ev.reg_form || {};
  const closesAt = form0.closes_at ? (form0.closes_at.length === 10 ? `${form0.closes_at}T23:59` : form0.closes_at) : '';
  const timeUp = !!closesAt && closesAt < new Date(Date.now() + 6 * 3600e3).toISOString().slice(0, 16); // Bangladesh time
  const payCfg = form0.payment?.enabled ? form0.payment : null;
  const waitOpen = full && !payCfg; // a free event that is full lets people join a waiting list
  const closed = ev.reg_open === false || past || (full && !waitOpen) || timeUp;
  const url = eventLink(ev.id);
  const text = `${ev.title}: ${formalDate(ev.date, { weekday: true })}${ev.time ? `, ${formalTime(ev.time)}` : ''}${ev.location ? `, ${ev.location}` : ''}`;
  const links = shareLinks(url, text);

  const share = async () => { if (!(await nativeShare({ title: ev.title, text, url }))) setMenu((m) => !m); };
  const copy = async () => { const ok = await copyText(url); toast[ok ? 'success' : 'error'](ok ? 'Link copied' : 'Could not copy the link'); setMenu(false); };

  const fields = fieldsOf(ev);
  const submit = async (e) => {
    e.preventDefault();
    const err = {};
    fields.forEach((f) => { if (f.type !== 'section' && isVisible(f, form) && f.required && isEmpty(form[f.id])) err[f.id] = 'This question is required'; });
    const pe = {};
    const payMode = payCfg ? modeOf(payCfg, gateway, payment) : null;
    if (payCfg && payMode === 'manual') {
      const p = { method: payCfg.methods[0], ...payment };
      if (!/^(\+?88)?01[3-9]\d{8}$/.test(String(p.sender || '').replace(/[\s-]/g, ''))) pe.sender = 'Enter the mobile number you paid from';
      if (!/^[A-Za-z0-9]{6,20}$/.test(String(p.trx_id || '').trim())) pe.trx_id = 'Enter the transaction ID (6 to 20 letters and numbers)';
    }
    setErrors(err); setPayErrors(pe);
    if (Object.keys(err).length || Object.keys(pe).length) {
      toast.error('Please check the highlighted questions');
      scrollToFirstError();
      return;
    }
    setBusy(true);
    try { const r = await api.post(`/event-registrations/${ev.id}`, { _hp: document.querySelector('input[data-hp]')?.value || '', answers: Object.fromEntries(fields.filter((f) => isVisible(f, form)).map((f) => [f.id, form[f.id]]).filter(([, v]) => !isEmpty(v))), ...(payCfg ? (payMode === 'online' ? { pay_mode: 'online' } : { payment: { method: payCfg.methods[0], ...payment } }) : {}) }); if (r.data.pay_url) { window.location.assign(r.data.pay_url); return; } setThanks(r.data.message || ''); setPendingPay(!!r.data.pending_payment); setTicket(r.data.ticket || ''); setWaiting(r.data.waitlisted ? r.data.position || 1 : 0); setDone(true); }
    catch (ex) {
      const d = ex.response?.data;
      if (d?.fields) setErrors(d.fields);
      if (d?.payment) setPayErrors(d.payment);
      scrollToFirstError();
      toast.error(d?.error || 'Could not register. Please try again.');
    }
    setBusy(false);
  };

  const row = (Icon, children) => <div className="flex items-start gap-3 text-fg2"><Icon size={17} className="mt-0.5 shrink-0 text-accent" /><span>{children}</span></div>;

  return (
    <section className="section">
      <div className="container max-w-5xl">
        <Link to="/events" className="mb-6 inline-flex items-center gap-2 text-sm text-fg2 hover:text-accent"><ArrowLeft size={15} /> All events</Link>
        <div className="grid gap-8 lg:grid-cols-[1.25fr_1fr]">
          <motion.article initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="min-w-0">
            {ev.image_url && <img src={thumb(ev.image_url, 1100)} alt={ev.title} decoding="async" className="mb-6 max-h-96 w-full rounded-3xl border border-line object-cover" />}
            {ev.category && <span className="badge badge-tech mb-3 inline-block">{ev.category}</span>}
            <h1 className="text-[clamp(1.9rem,4vw,2.9rem)] leading-tight text-fg">{ev.title}</h1>
            <div className="mt-5 space-y-2.5 text-[15px]">
              {row(Calendar, formalDate(ev.date, { weekday: true }))}
              {ev.time && row(Clock, formalTime(ev.time))}
              {ev.location && row(MapPin, ev.location)}
              {ev.capacity ? row(Users, `${count ?? '…'} of ${ev.capacity} places taken${count !== null && ev.capacity - count > 0 && ev.capacity - count <= 10 ? ` · only ${ev.capacity - count} left` : ''}`) : count ? row(Users, `${count} registered`) : null}
              {payCfg && row(Ticket, `Fee: ${payCfg.amount} BDT (${payCfg.methods.join(', ')})`)}
            </div>
            {ev.description && <p className="mt-6 whitespace-pre-line text-[15px] leading-7 text-fg2">{ev.description}</p>}

            <div className="relative mt-7 flex flex-wrap items-center gap-3">
              {start && !past && <button onClick={() => downloadIcs(ev)} className="btn-outline !px-4 !py-2.5 text-xs"><CalendarPlus size={15} /> Add to calendar</button>}
              <button onClick={share} aria-haspopup="menu" aria-expanded={menu} className="btn-outline !px-4 !py-2.5 text-xs"><Share2 size={15} /> Share</button>
              {menu && (
                <div role="menu" className="absolute left-0 top-full z-20 mt-2 w-56 rounded-2xl border border-line bg-surface p-2 shadow-[var(--shadow-lg)]">
                  {[[Facebook, 'Facebook', links.facebook], [MessageCircle, 'WhatsApp', links.whatsapp], [Send, 'Telegram', links.telegram]].map(([I, l, h]) => (
                    <a key={l} role="menuitem" href={h} target="_blank" rel="noopener noreferrer" onClick={() => setMenu(false)} className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm text-fg2 transition hover:bg-accent/10 hover:text-accent"><I size={16} /> {l}</a>
                  ))}
                  <button role="menuitem" onClick={copy} className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm text-fg2 transition hover:bg-accent/10 hover:text-accent"><Link2 size={16} /> Copy link</button>
                </div>
              )}
            </div>
          </motion.article>

          <motion.aside initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="min-w-0 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl border border-line bg-surface p-6 shadow-[var(--shadow-md)]">
              <div className="mb-4 flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-accent/10 text-accent"><Ticket size={20} /></span><div><h2 className="text-xl text-fg">Register</h2><p className="text-xs text-muted">{closed ? 'Registration is closed' : payCfg ? `Fee ${payCfg.amount} BDT · takes a minute` : 'Free · takes a minute'}</p></div></div>

              {done ? (
                <div className="py-4 text-center">
                  <CheckCircle2 size={44} className="mx-auto text-emerald-500" />
                  <h3 className="mt-3 text-xl text-fg">{waiting ? 'You are on the waiting list' : pendingPay ? 'Registration received' : 'You are registered!'}</h3>
                  <p className="mt-1 whitespace-pre-line text-sm text-fg2">{waiting ? `${ev.title} is full right now, so you are number ${waiting} in line. If a seat opens up you get it automatically and we email you.` : thanks || (pendingPay ? `We got your payment details for ${ev.title}. Your place is confirmed as soon as we verify the transaction. You will get an email.` : `We saved your place for ${ev.title}. If you gave an email address, a confirmation is on its way.`)}</p>
                  <CheckEmailNote className="mx-auto mt-4 max-w-md" />
                  {ticket && (
                    <div className="mt-5 rounded-2xl border border-line bg-alt/50 p-4">
                      <div className="mx-auto grid size-36 place-items-center rounded-xl bg-white p-1.5">{ticketQr ? <img src={ticketQr} alt="Your ticket QR code" className="size-full" /> : <Loader2 className="animate-spin text-muted" />}</div>
                      <div className="mt-2 font-mono text-sm tracking-[0.25em] text-fg">{prettyCode(ticket)}</div>
                      <a href={`/ticket/${ticket}`} className="mt-2 inline-block text-xs font-semibold text-tech underline">Open my ticket</a>
                      <p className="mt-1 text-xs text-muted">{waiting ? 'This ticket works only after you get a seat. Keep it.' : 'Show this QR code at the entrance. We also emailed it to you.'}</p>
                    </div>
                  )}
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    {start && <button onClick={() => downloadIcs(ev)} className="btn-outline !px-4 !py-2 text-xs"><CalendarPlus size={14} /> Add to calendar</button>}
                    <button onClick={share} className="btn-outline !px-4 !py-2 text-xs"><Share2 size={14} /> Invite friends</button>
                  </div>
                </div>
              ) : closed ? (
                <p className="rounded-2xl bg-alt p-4 text-sm text-fg2">{past ? 'This event has already taken place.' : full ? 'This event is full.' : timeUp ? 'The registration deadline has passed.' : 'Registration for this event is closed.'} <Link to="/events" className="font-semibold text-tech">See other events</Link></p>
              ) : ev.reg_url ? (
                <div>
                  <p className="text-sm text-fg2">Registration for this event is done on its own form.</p>
                  <a href={ev.reg_url} target="_blank" rel="noopener noreferrer" className="btn-primary mt-4 w-full justify-center">Register now <ExternalLink size={15} /></a>
                </div>
              ) : (
                <form onSubmit={submit} noValidate className="space-y-5" style={themeStyle(ev.reg_form?.theme)}>
                  {ev.reg_form?.title && <h3 className="text-lg text-fg">{ev.reg_form.title}</h3>}
                  {payFailed && <p className="rounded-xl bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600">The payment was not completed, so no seat was kept. You can try again below.</p>}
                  {waitOpen && <p className="rounded-xl bg-sky-500/10 px-3.5 py-2.5 text-sm text-sky-700">All seats are taken. Join the waiting list: if someone drops out you get their seat automatically and we email you.</p>}
                  {ev.reg_form?.intro && <p className="whitespace-pre-line text-sm text-fg2">{ev.reg_form.intro}</p>}
                  {closesAt && <p className="rounded-xl bg-alt px-3.5 py-2 text-xs text-fg2">Registration closes {formalDate(closesAt)}{closesAt.length > 10 ? `, ${formalTime(closesAt.slice(11))}` : ''}</p>}
                  <DynamicForm fields={fields} values={form} errors={errors} onPageError={setErrors} onChange={(id, v) => { setForm((f) => ({ ...f, [id]: v })); setErrors((x) => ({ ...x, [id]: undefined })); }}>
                    {payCfg && <PaymentBox gateway={gateway} setting={payCfg} value={payment} errors={payErrors} onChange={(p) => { setPayment(p); setPayErrors({}); }} />}
                    <button disabled={busy} className="btn-primary mt-1 w-full justify-center disabled:opacity-60">{busy ? <Loader2 size={16} className="animate-spin" /> : <Ticket size={16} />} {busy ? 'Submitting…' : waitOpen ? 'Join the waiting list' : 'Submit registration'}</button>
                  </DynamicForm>
                </form>
              )}
            </div>
          </motion.aside>
        </div>
      </div>
    </section>
  );
}
