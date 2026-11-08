import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../context/store';

/** /ticket without a code: open a ticket by its code, or get all tickets of an email address sent to that address. */
export default function TicketFind() {
  const nav = useNavigate();
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const open = (e) => {
    e.preventDefault();
    const c = code.replace(/[^a-z0-9]/gi, '').toUpperCase();
    if (c.length < 8) { toast.error('A ticket code has at least 8 letters and numbers.'); return; }
    nav(`/ticket/${c}`);
  };
  const send = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { const r = await api.post('/event-registrations/lost', { email }); toast.success(r.data?.message || 'Check your email.'); }
    catch (err) { toast.error(err.response?.data?.error || 'Could not send. Please try again.'); }
    setBusy(false);
  };
  const input = 'w-full rounded-xl border border-line bg-bg px-4 py-3 text-sm text-fg outline-none focus:border-tech';
  return (
    <section className="section">
      <div className="container max-w-xl">
        <div className="section-header">
          <div className="section-tag">Tickets</div>
          <h2 className="section-title">Find my ticket</h2>
          <div className="divider" />
        </div>
        <form onSubmit={open} className="rounded-2xl border border-line bg-surface p-5">
          <label htmlFor="tcode" className="font-display text-lg text-fg">I have my ticket code</label>
          <input id="tcode" value={code} onChange={(e) => setCode(e.target.value)} placeholder="ABCDE-12345" autoComplete="off" className={`${input} mt-3 font-mono tracking-widest`} />
          <button type="submit" className="btn-primary mt-3 !px-5 !py-2.5 text-xs">Open ticket</button>
        </form>
        <form onSubmit={send} className="mt-4 rounded-2xl border border-line bg-surface p-5">
          <label htmlFor="temail" className="font-display text-lg text-fg">I lost it</label>
          <p className="mt-1 text-sm text-fg2">Enter the email you registered with. We email your tickets to that address.</p>
          <input id="temail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" className={`${input} mt-3`} />
          <button type="submit" disabled={busy} className="btn-primary mt-3 !px-5 !py-2.5 text-xs">{busy ? 'Sending…' : 'Email my tickets'}</button>
        </form>
      </div>
    </section>
  );
}
