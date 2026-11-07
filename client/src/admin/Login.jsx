import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Lock, User, Eye, EyeOff, ShieldCheck, AlertCircle, ArrowRight } from 'lucide-react';
import useStore from '../context/store';
import Backdrop3D from '../components/Backdrop3D';
import Logo from '../components/Logo';

const field = 'peer w-full rounded-2xl border border-line bg-bg/70 py-3.5 pl-12 pr-4 text-[15px] text-fg outline-none transition placeholder:text-muted focus:border-tech focus:bg-bg focus:ring-4 focus:ring-tech/15';

export default function Login() {
  const login = useStore((s) => s.login);
  const [f, setF] = useState({ username: localStorage.getItem('bauet-admin-name') || 'ICT-Club', password: '', code: '' });
  const [needCode, setNeedCode] = useState(false);
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!f.username.trim() || !f.password) { setErr(!f.username.trim() ? 'Type your username first.' : 'Type your password.'); return; }
    if (needCode && !f.code.trim()) { setErr('Type the 6-digit code from your authenticator app.'); return; }
    setErr(''); setBusy(true);
    try { await login(f.username.trim(), f.password, needCode ? f.code.trim() : undefined); } catch (ex) {
      const d = ex?.response?.data;
      if (d?.twoFactor) { setNeedCode(true); setErr(needCode ? 'That code is not right. Try the newest code, or a backup code.' : ''); }
      else {
        const st = ex?.response?.status;
        // say what really happened: a wrong password is a 401; a sleeping or restarting server is not a wrong password
        setErr(st === 429 ? 'Too many attempts. Please wait a few minutes and try again.'
          : st === 401 || st === 400 ? 'Invalid username or password'
          : !st ? 'The server did not answer. It may be waking up (up to a minute). Wait and try again.'
          : `The server had a problem (${st}). Wait a minute and try again.${d?.error ? ' ' + d.error : ''}`);
      }
    }
    setBusy(false);
  };

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-10">
      <Backdrop3D variant="hero" className="absolute inset-0 opacity-60" />
      <div className="pointer-events-none absolute -left-32 top-10 size-[26rem] rounded-full bg-accent/20 blur-[110px]" />
      <div className="pointer-events-none absolute -right-28 bottom-0 size-[24rem] rounded-full bg-tech/20 blur-[110px]" />
      <Link to="/" className="absolute left-5 top-5 z-10 flex items-center gap-2 rounded-full border border-line bg-[var(--glass)] px-4 py-2 text-sm text-fg2 backdrop-blur transition hover:border-accent hover:text-accent"><ArrowLeft size={15} /> Back to site</Link>

      <motion.div initial={{ opacity: 0, y: 30, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }} className="relative z-10 w-full max-w-[26rem]">
        {/* soft gradient frame */}
        <div className="absolute -inset-px rounded-[34px] opacity-70 blur-[1px]" style={{ background: 'linear-gradient(135deg, var(--accent), transparent 40%, var(--tech))' }} />
        <form onSubmit={submit} noValidate className="relative rounded-[33px] border border-line bg-[var(--glass)] p-8 shadow-[var(--shadow-xl)] backdrop-blur-2xl sm:p-10">
          <div className="mb-8 text-center">
            <div className="mb-5 flex justify-center"><Logo kind="club" height={92} priority /></div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/70 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-tech"><ShieldCheck size={12} /> Admin console</span>
            <h1 className="mt-4 text-[1.9rem] leading-tight text-fg">Welcome back</h1>
            <p className="mt-1.5 text-sm text-fg2">Sign in to manage the club website, applications and committees.</p>
          </div>

          <label className="mb-4 block">
            <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-fg2">Username</span>
            <span className="relative block">
              <input className={field} value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} placeholder="ICT-Club" required autoComplete="username" autoCapitalize="none" spellCheck={false} />
              <User size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted transition peer-focus:text-tech" />
            </span>
          </label>

          <label className="mb-2 block">
            <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-fg2">Password</span>
            <span className="relative block">
              <input className={`${field} pr-12`} type={show ? 'text' : 'password'} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })}
                onKeyUp={(e) => setCaps(e.getModifierState?.('CapsLock') || false)} onBlur={() => setCaps(false)}
                placeholder="Your password" required autoComplete="current-password" />
              <Lock size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted transition peer-focus:text-tech" />
              <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show} title={show ? 'Hide password' : 'Show password'}
                className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-xl text-fg2 transition hover:bg-accent/10 hover:text-accent">
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>
          {needCode && (
            <label className="mb-2 mt-4 block">
              <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-fg2">6-digit code (or a backup code)</span>
              <span className="relative block">
                <input className={`${field} tracking-[0.3em]`} value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} placeholder="123456" autoFocus required inputMode="numeric" autoComplete="one-time-code" maxLength={11} spellCheck={false} />
                <ShieldCheck size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted transition peer-focus:text-tech" />
              </span>
              <span className="mt-1 block text-xs text-muted">Open your authenticator app and type the code for BAUET ICT Club.</span>
            </label>
          )}
          {caps && <p className="mt-1 flex items-center gap-1.5 text-xs text-amber-600"><AlertCircle size={13} /> Caps Lock is on</p>}

          {err && (
            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} role="alert" className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-500">
              <AlertCircle size={16} className="shrink-0" /> {err}
            </motion.p>
          )}

          <button disabled={busy || !f.username || !f.password || (needCode && !f.code)} className="btn-primary group mt-6 w-full !py-3.5 disabled:opacity-60">
            {busy ? <Loader2 size={17} className="animate-spin" /> : <Lock size={15} />} {busy ? 'Signing in…' : 'Sign in'}
            {!busy && <ArrowRight size={16} className="transition group-hover:translate-x-1" />}
          </button>

          <p className="mt-6 text-center text-xs text-muted">Only club administrators can sign in. Repeated wrong passwords lock the account for a while.</p>
        </form>
      </motion.div>
    </div>
  );
}
