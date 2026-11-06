import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { IdCard, Loader2 } from 'lucide-react';
import { api } from '../context/store';

const inp = 'w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm text-fg outline-none transition focus:border-tech';

/** A member who joined through the application form finds their own digital card with the e-mail and student ID they applied with. */
export default function MyCardPage() {
  const navigate = useNavigate();
  const [f, setF] = useState({ email: '', student_id: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg('');
    try { const r = await api.post('/card/find', f); navigate(r.data.path); }
    catch (ex) { const m = ex.response?.data?.error || 'Could not look it up. Please try again.'; setMsg(m); toast.error(m); }
    setBusy(false);
  };
  return (
    <section className="section">
      <div className="container max-w-md">
        <div className="section-header">
          <div className="section-tag">Members</div>
          <h2 className="section-title">My member card</h2>
          <p className="section-desc">Type the e-mail and student ID you used to join the club. Your card opens right away once an admin has approved your application.</p>
          <div className="divider" />
        </div>
        <form onSubmit={submit} className="space-y-3 rounded-3xl border border-line bg-surface p-6 shadow-sm">
          <input className={inp} type="email" required autoComplete="email" placeholder="Your e-mail" aria-label="Your e-mail" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          <input className={inp} required autoComplete="off" placeholder="Your student ID" aria-label="Your student ID" value={f.student_id} onChange={(e) => setF({ ...f, student_id: e.target.value })} />
          {msg && <p role="alert" className="rounded-xl bg-amber-500/10 p-3 text-sm text-amber-700">{msg}</p>}
          <button disabled={busy} className="btn-primary w-full justify-center">{busy ? <Loader2 size={16} className="animate-spin" /> : <IdCard size={16} />} Show my card</button>
        </form>
      </div>
    </section>
  );
}
