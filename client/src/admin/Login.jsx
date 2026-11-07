import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Lock, User, Eye, EyeOff, ShieldCheck, AlertCircle, ArrowRight, Mail, CheckCircle2, KeyRound } from 'lucide-react';
import useStore, { api } from '../context/store';
import Backdrop3D from '../components/Backdrop3D';
import Logo from '../components/Logo';

const field = 'peer w-full rounded-2xl border border-line bg-bg/70 py-3.5 pl-12 pr-4 text-[15px] text-fg outline-none transition placeholder:text-muted focus:border-tech focus:bg-bg focus:ring-4 focus:ring-tech/15';

// forgotten password: ask for a link (sent to the club e-mail), then choose a new password from that link
function ResetPanel({ mode, setMode, username, setUsername }) {
  const q = new URLSearchParams(window.location.search);
  const token = q.get('reset') || '';
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);
  const back = () => { if (token) window.history.replaceState({}, '', '/admin'); setMode('in'); };

  const ask = async (e) => {
    e.preventDefault(); setErr(''); setMsg('');
    if (!username.trim()) { setErr('Type your username first.'); return; }
    setBusy(true);
    try { const r = await api.post('/auth/forgot', { username: username.trim() }); setMsg(r.data?.message || 'A reset link was sent to the club e-mail address.'); }
    catch (ex) { setErr(ex?.response?.status === 429 ? 'Too many requests. Wait a few minutes and try again.' : ex?.response?.data?.error || 'The server did not answer. It may be waking up. Wait a minute and try again.'); }
    setBusy(false);
  };
  const change = async (e) => {
    e.preventDefault(); setErr('');
    if (pw !== pw2) { setErr('The two passwords are not the same.'); return; }
    setBusy(true);
    try { await api.post('/auth/reset', { token, username: q.get('u') || username, password: pw }); setDone(true); window.history.replaceState({}, '', '/admin'); }
    catch (ex) { setErr(ex?.response?.data?.error || 'The server did not answer. Wait a minute and try again.'); }
    setBusy(false);
  };

  return (
    <div className="relative rounded-[33px] border border-line bg-[var(--glass)] p-8 shadow-[var(--shadow-xl)] backdrop-blur-2xl sm:p-10">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-tech/10 text-tech">{mode === 'reset' ? <KeyRound size={26} /> : <Mail size={26} />}</div>
        <h1 className="text-[1.6rem] leading-tight text-fg">{done ? 'Password changed' : mode === 'reset' ? 'Choose a new password' : 'Forgot your password?'}</h1>
        <p className="mt-1.5 text-sm text-fg2">{done ? 'You can sign in with the new password now.' : mode === 'reset' ? '6 or more characters, with letters and numbers or symbols.' : 'We e-mail a one-time link to the club e-mail address. The link works for 30 minutes.'}</p>
      </div>
      {done ? (
        <button type="button" onClick={() => setMode('in')} className="btn-primary w-full !py-3.5"><Lock size={15} /> Go to sign in</button>
      ) : mode === 'reset' ? (
        <form onSubmit={change} noValidate>
          <label className="mb-4 block"><span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-fg2">New password</span>
            <span className="relative block"><input className={`${field} pr-12`} type={show ? 'text' : 'password'} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" placeholder="For example Ice-2016" />
              <Lock size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted peer-focus:text-tech" />
              <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-xl text-fg2 hover:text-accent">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>
          <label className="mb-2 block"><span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-fg2">Type it again</span>
            <span className="relative block"><input className={field} type={show ? 'text' : 'password'} value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" placeholder="Same password" />
              <Lock size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted peer-focus:text-tech" /></span></label>
          {err && <p role="alert" className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-500"><AlertCircle size={16} className="shrink-0" /> {err}</p>}
          <button disabled={busy || !pw || !pw2} className="btn-primary mt-6 w-full !py-3.5 disabled:opacity-60">{busy ? <Loader2 size={17} className="animate-spin" /> : <KeyRound size={15} />} {busy ? 'Saving…' : 'Save new password'}</button>
        </form>
      ) : (
        <form onSubmit={ask} noValidate>
          <label className="mb-2 block"><span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-fg2">Username</span>
            <span className="relative block"><input className={field} value={username} onChange={(e) => setUsername(e.target.value)} autoCapitalize="none" spellCheck={false} />
              <User size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted peer-focus:text-tech" /></span></label>
          {msg && <p role="status" className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-sm text-emerald-600"><CheckCircle2 size={16} className="mt-0.5 shrink-0" /> {msg}</p>}
          {err && <p role="alert" className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-500"><AlertCircle size={16} className="shrink-0" /> {err}</p>}
          <button disabled={busy} className="btn-primary mt-6 w-full !py-3.5 disabled:opacity-60">{busy ? <Loader2 size={17} className="animate-spin" /> : <Mail size={15} />} {busy ? 'Sending…' : 'E-mail me the reset link'}</button>
        </form>
      )}
      {!done && <button type="button" onClick={back} className="mt-5 block w-full text-center text-sm font-semibold text-accent hover:underline">Back to sign in</button>}
    </div>
  );
}

export default function Login() {
  const login = useStore((s) => s.login);
  const [f, setF] = useState({ username: localStorage.getItem('bauet-admin-name') || 'ICT-Club', password: '', code: '' });
  const [needCode, setNeedCode] = useState(false);
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  // a link from the reset e-mail (?reset=...) opens the new-password form straight away
  const [mode, setMode] = useState(() => (new URLSearchParams(window.location.search).get('reset') ? 'reset' : 'in'));

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
        {mode !== 'in' ? <ResetPanel mode={mode} setMode={setMode} username={f.username} setUsername={(v) => setF({ ...f, username: v })} /> : (
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
          <div className="mb-1 text-right"><button type="button" onClick={() => setMode('forgot')} className="text-xs font-semibold text-accent hover:underline">Forgot password?</button></div>
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
        )}
      </motion.div>
    </div>
  );
}
