import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { CheckCircle2, Loader2, Send, Share2, Facebook, MessageCircle, Link2, Users } from 'lucide-react';
import { api } from '../context/store';
import DynamicForm from './DynamicForm';
import PaymentBox from './PaymentBox';
import { useGateway, modeOf } from '../lib/pay';
import { isVisible, isEmpty, themeStyle, scrollToFirstError } from '../lib/forms';
import { formalDate, formalTime } from '../lib/format';
import { shareLinks, copyText, nativeShare } from '../lib/share';
import CheckEmailNote from './CheckEmailNote';

/** A stand-alone form made in Admin → Forms, opened from its own link: /f/<name>. */
export default function FormPage() {
  const { slug } = useParams();
  const [form, setForm] = useState(null); // null = loading, false = not found
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [payment, setPayment] = useState({});
  const [payErrors, setPayErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [menu, setMenu] = useState(false);
  const gateway = useGateway();
  const returned = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('paid') === '1' : false; // came back from the payment page, paid
  const payFailed = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('pay') === 'failed';

  useEffect(() => {
    api.get(`/forms/public/${slug}`).then((r) => { setForm(r.data); document.title = `${r.data.title} | BAUET ICT Club`; })
      .catch(() => setForm(false));
    const meta = Object.assign(document.createElement('meta'), { name: 'robots', content: 'noindex' });
    document.head.appendChild(meta);
    return () => meta.remove();
  }, [slug]);

  if (form === null) return <section className="section"><div className="container grid min-h-[50vh] place-items-center"><Loader2 className="animate-spin text-muted" /></div></section>;
  if (form === false) return <section className="section"><div className="container grid min-h-[40vh] place-items-center text-center"><div><h1 className="text-3xl text-fg">Form not found</h1><p className="mt-2 text-fg2">The link may be wrong or the form was removed.</p><Link to="/" className="btn-primary mt-6 inline-flex">Go to the website</Link></div></div></section>;

  const rf = form.reg_form || {};
  const fields = rf.fields || [];
  const closesAt = rf.closes_at ? (rf.closes_at.length === 10 ? `${rf.closes_at}T23:59` : rf.closes_at) : '';
  const timeUp = !!closesAt && closesAt < new Date(Date.now() + 6 * 3600e3).toISOString().slice(0, 16);
  const full = !!form.capacity && form.count >= form.capacity;
  const closed = !form.is_open || timeUp || full;
  const payCfg = rf.payment?.enabled ? rf.payment : null;
  const url = `${window.location.origin}/f/${form.slug}`;
  const links = shareLinks(url, form.title);

  const submit = async (e) => {
    e.preventDefault();
    const err = {};
    fields.forEach((f) => { if (f.type !== 'section' && isVisible(f, values) && f.required && isEmpty(values[f.id])) err[f.id] = 'This question is required'; });
    const pe = {};
    const payMode = payCfg ? modeOf(payCfg, gateway, payment) : null;
    if (payCfg && payMode === 'manual') {
      if (!/^(\+?88)?01[3-9]\d{8}$/.test(String(payment.sender || '').replace(/[\s-]/g, ''))) pe.sender = 'Enter the mobile number you paid from';
      if (!/^[A-Za-z0-9]{6,20}$/.test(String(payment.trx_id || '').trim())) pe.trx_id = 'Enter the transaction ID (6 to 20 letters and numbers)';
    }
    setErrors(err); setPayErrors(pe);
    if (Object.keys(err).length || Object.keys(pe).length) {
      toast.error('Please check the highlighted questions');
      scrollToFirstError();
      return;
    }
    setBusy(true);
    try {
      const answers = Object.fromEntries(fields.filter((f) => isVisible(f, values)).map((f) => [f.id, values[f.id]]).filter(([, v]) => !isEmpty(v)));
      const r = await api.post(`/forms/public/${slug}`, { _hp: document.querySelector('input[data-hp]')?.value || '', answers, ...(payCfg ? (payMode === 'online' ? { pay_mode: 'online' } : { payment: { method: payCfg.methods[0], ...payment } }) : {}) });
      if (r.data.pay_url) { window.location.assign(r.data.pay_url); return; }
      setDone({ message: r.data.message, pending: r.data.pending_payment });
    } catch (ex) {
      const d = ex.response?.data;
      if (d?.fields) setErrors(d.fields);
      if (d?.payment) setPayErrors(d.payment);
      scrollToFirstError();
      toast.error(d?.error || 'Could not submit. Please try again.');
    }
    setBusy(false);
  };

  const share = async () => { if (!(await nativeShare({ title: form.title, text: form.title, url }))) setMenu((m) => !m); };

  return (
    <section className="section">
      <div className="container max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="relative rounded-3xl border border-line bg-surface p-6 shadow-[var(--shadow-md)] sm:p-9">
            <div className="absolute inset-x-0 top-0 h-2 rounded-t-3xl" style={{ background: 'linear-gradient(90deg,var(--accent),var(--tech))' }} />
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-[clamp(1.6rem,4vw,2.3rem)] leading-tight text-fg">{rf.title || form.title}</h1>
              <div className="relative shrink-0">
                <button onClick={share} aria-label="Share this form" aria-haspopup="menu" aria-expanded={menu} className="grid size-10 place-items-center rounded-full border border-line text-fg2 transition hover:border-accent hover:text-accent"><Share2 size={16} /></button>
                {menu && (
                  <div role="menu" className="absolute right-0 top-full z-20 mt-2 w-52 rounded-2xl border border-line bg-surface p-2 shadow-[var(--shadow-lg)]">
                    <a role="menuitem" href={links.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm text-fg2 hover:bg-accent/10 hover:text-accent"><Facebook size={16} /> Facebook</a>
                    <a role="menuitem" href={links.whatsapp} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm text-fg2 hover:bg-accent/10 hover:text-accent"><MessageCircle size={16} /> WhatsApp</a>
                    <button role="menuitem" onClick={async () => { const ok = await copyText(url); toast[ok ? 'success' : 'error'](ok ? 'Link copied' : 'Could not copy'); setMenu(false); }} className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm text-fg2 hover:bg-accent/10 hover:text-accent"><Link2 size={16} /> Copy link</button>
                  </div>
                )}
              </div>
            </div>
            {(rf.intro || form.description) && <p className="mt-3 whitespace-pre-line text-[15px] leading-7 text-fg2">{rf.intro || form.description}</p>}
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
              {form.capacity ? <span className="flex items-center gap-1.5"><Users size={13} /> {form.count} of {form.capacity} responses</span> : null}
              {closesAt && !timeUp && <span>Closes {formalDate(closesAt)}{closesAt.length > 10 ? `, ${formalTime(closesAt.slice(11))}` : ''}</span>}
            </div>

            <div className="mt-7 border-t border-line pt-7">
              {payFailed && !done && <p className="mb-5 rounded-xl bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600">The payment was not completed, so your response was not saved. You can try again below.</p>}
              {done || returned ? (
                <div className="py-6 text-center">
                  <CheckCircle2 size={48} className="mx-auto text-emerald-500" />
                  <h2 className="mt-3 text-2xl text-fg">{done?.pending ? 'Response received' : 'Thank you!'}</h2>
                  <p className="mx-auto mt-2 max-w-md whitespace-pre-line text-sm text-fg2">{done?.message || (returned ? 'Your payment was received and your response is saved.' : done?.pending ? 'We will check your payment and confirm by email.' : 'Your response has been recorded.')}</p>
                  <CheckEmailNote className="mx-auto mt-4 max-w-md" />
                </div>
              ) : closed ? (
                <p className="rounded-2xl bg-alt p-5 text-center text-sm text-fg2">{full ? 'This form has reached its limit.' : timeUp ? 'This form has closed.' : 'This form is not accepting responses right now.'}</p>
              ) : (
                <form onSubmit={submit} noValidate className="space-y-5" style={themeStyle(rf.theme)}>
                  <DynamicForm fields={fields} values={values} errors={errors} onPageError={setErrors} onChange={(id, v) => { setValues((s) => ({ ...s, [id]: v })); setErrors((x) => ({ ...x, [id]: undefined })); }}>
                    {payCfg && <PaymentBox gateway={gateway} setting={payCfg} value={payment} errors={payErrors} onChange={(p) => { setPayment(p); setPayErrors({}); }} />}
                    <button disabled={busy} className="btn-primary w-full justify-center disabled:opacity-60">{busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} {busy ? 'Submitting…' : 'Submit'}</button>
                  </DynamicForm>
                </form>
              )}
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-muted">Made with the BAUET ICT Club forms</p>
        </motion.div>
      </div>
    </section>
  );
}
