import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { IdCard, Loader2, Mail, KeyRound, ArrowRight, RotateCw, CheckCircle2 } from 'lucide-react';
import { api } from '../context/store';

const inp = 'w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm text-fg outline-none transition focus:border-tech';

export default function MyCardPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('otp'); // 'otp' | 'direct'
  const [email, setEmail] = useState('');
  const [studentId, setStudentId] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [maskedMail, setMaskedMail] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  const requestOtp = async (e) => {
    if (e) e.preventDefault();
    if (!email) return toast.error('Enter your email');
    setBusy(true); setMsg('');
    try {
      const res = await api.post('/card/otp/request', { email });
      setOtpSent(true);
      setMaskedMail(res.data.email || email);
      setCountdown(res.data.resendIn || 30);
      toast.success('Verification code sent to your email!');
    } catch (ex) {
      const m = ex.response?.data?.error || 'Could not send verification code';
      setMsg(m); toast.error(m);
    }
    setBusy(false);
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length < 6) return toast.error('Enter 6-digit code');
    setBusy(true); setMsg('');
    try {
      const res = await api.post('/card/otp/verify', { email, code: otpCode.trim() });
      toast.success('Verified! Opening your member card...');
      navigate(res.data.path);
    } catch (ex) {
      const m = ex.response?.data?.error || 'Invalid or expired code';
      setMsg(m); toast.error(m);
    }
    setBusy(false);
  };

  const submitDirect = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg('');
    try {
      const r = await api.post('/card/find', { email, student_id: studentId });
      navigate(r.data.path);
    } catch (ex) {
      const m = ex.response?.data?.error || 'Could not look it up. Please try again.';
      setMsg(m); toast.error(m);
    }
    setBusy(false);
  };

  return (
    <section className="section">
      <div className="container max-w-md">
        <div className="section-header">
          <div className="section-tag">Members</div>
          <h2 className="section-title">My Member Card</h2>
          <p className="section-desc">Access your official digital card and verified profile securely.</p>
          <div className="divider" />
        </div>

        <div className="mb-4 flex rounded-2xl border border-line bg-surface p-1">
          <button
            type="button"
            onClick={() => { setTab('otp'); setMsg(''); }}
            className={`flex-1 rounded-xl py-2 text-xs font-semibold transition ${tab === 'otp' ? 'bg-accent text-white shadow-sm' : 'text-fg2 hover:text-fg'}`}
          >
            Email OTP (Secure)
          </button>
          <button
            type="button"
            onClick={() => { setTab('direct'); setMsg(''); }}
            className={`flex-1 rounded-xl py-2 text-xs font-semibold transition ${tab === 'direct' ? 'bg-accent text-white shadow-sm' : 'text-fg2 hover:text-fg'}`}
          >
            Student ID Lookup
          </button>
        </div>

        {tab === 'otp' ? (
          <div className="space-y-4 rounded-3xl border border-line bg-surface p-6 shadow-sm">
            {!otpSent ? (
              <form onSubmit={requestOtp} className="space-y-3">
                <div>
                  <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-fg2">Registered Email</label>
                  <input
                    className={inp}
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="e.g. student@bauet.ac.bd"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                {msg && <p role="alert" className="rounded-xl bg-amber-500/10 p-3 text-sm text-amber-700">{msg}</p>}
                <button disabled={busy} className="btn-primary w-full justify-center">
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />} Send Verification Code
                </button>
              </form>
            ) : (
              <form onSubmit={verifyOtp} className="space-y-4">
                <div className="rounded-2xl bg-accent/10 p-3.5 text-center text-xs text-accent">
                  We sent a 6-digit code to <b>{maskedMail}</b>
                </div>
                <div>
                  <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-fg2">Enter 6-Digit Code</label>
                  <input
                    className={`${inp} text-center font-mono text-lg tracking-[0.25em] font-bold`}
                    type="text"
                    required
                    maxLength={6}
                    placeholder="••••••"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => setOtpSent(false)}
                    className="text-fg2 hover:underline cursor-pointer"
                  >
                    Change Email
                  </button>
                  <button
                    type="button"
                    disabled={countdown > 0 || busy}
                    onClick={requestOtp}
                    className="inline-flex items-center gap-1 font-semibold text-accent disabled:opacity-50 cursor-pointer"
                  >
                    <RotateCw size={13} className={busy ? 'animate-spin' : ''} />
                    {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend code'}
                  </button>
                </div>

                {msg && <p role="alert" className="rounded-xl bg-amber-500/10 p-3 text-sm text-amber-700">{msg}</p>}

                <button disabled={busy} className="btn-primary w-full justify-center">
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Verify & Open Card
                </button>
              </form>
            )}
          </div>
        ) : (
          <form onSubmit={submitDirect} className="space-y-3 rounded-3xl border border-line bg-surface p-6 shadow-sm">
            <input className={inp} type="email" required autoComplete="email" placeholder="Your e-mail" aria-label="Your e-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className={inp} required autoComplete="off" placeholder="Your student ID" aria-label="Your student ID" value={studentId} onChange={(e) => setStudentId(e.target.value)} />
            {msg && <p role="alert" className="rounded-xl bg-amber-500/10 p-3 text-sm text-amber-700">{msg}</p>}
            <button disabled={busy} className="btn-primary w-full justify-center">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <IdCard size={16} />} Show my card
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
