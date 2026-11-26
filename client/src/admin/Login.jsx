import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Lock, User, Eye, EyeOff, ShieldCheck, AlertCircle, ArrowRight, Mail, CheckCircle2, KeyRound, UserPlus } from 'lucide-react';
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
    if (!username.trim()) { setErr('Type your username or e-mail first.'); return; }
    setBusy(true);
    try { const r = await api.post('/auth/forgot', { username: username.trim() }); setMsg(r.data?.message || 'A reset link was sent to the e-mail address on that account.'); }
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
        <p className="mt-1.5 text-sm text-fg2">{done ? 'You can sign in with the new password now.' : mode === 'reset' ? '6 or more characters, with letters and numbers or symbols.' : 'Type the username or e-mail this account was made with. We e-mail a one-time link there, and it works for 30 minutes.'}</p>
      </div>
      {done ? (
        <button type="button" onClick={() => setMode('in')} className="btn-primary w-full !py-3.5"><Lock size={15} /> Go to sign in</button>
      ) : mode === 'reset' ? (
        <form onSubmit={change} noValidate>
          <label className="mb-4 block"><span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-fg2">New password</span>
            <span className="relative block"><input className={`${field} pr-12`} type={show ? 'text' : 'password'} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" placeholder="For example Ice-2016" />
              <Lock size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted peer-focus:text-tech" />
              <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-xl text-fg2 hover:text-accent">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>
          <PasswordMeter pw={pw} username={q.get('u') || username} />
          <label className="mb-2 mt-4 block"><span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-fg2">Type it again</span>
            <span className="relative block"><input className={field} type={show ? 'text' : 'password'} value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" placeholder="Same password" />
              <Lock size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted peer-focus:text-tech" /></span></label>
          {err && <p role="alert" className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-500"><AlertCircle size={16} className="shrink-0" /> {err}</p>}
          <button disabled={busy || !passwordScore(pw, q.get('u') || username).ok || pw !== pw2} className="btn-primary mt-6 w-full !py-3.5 disabled:opacity-60">{busy ? <Loader2 size={17} className="animate-spin" /> : <KeyRound size={15} />} {busy ? 'Saving…' : 'Save new password'}</button>
        </form>
      ) : (
        <form onSubmit={ask} noValidate>
          <label className="mb-2 block"><span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-fg2">Username or e-mail</span>
            <span className="relative block"><input className={field} value={username} onChange={(e) => setUsername(e.target.value)} autoCapitalize="none" autoComplete="username" spellCheck={false} placeholder="editor or you@example.com" />
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

// how strong a new password is: weak / medium / strong, and whether it meets the club's rule (6+ characters, letters with numbers or symbols)
function passwordScore(pw, username = '') {
  const long = pw.length >= 6, mix = /[a-z]/i.test(pw) && /[^a-z]/i.test(pw);
  const lower = /[a-z]/.test(pw), upper = /[A-Z]/.test(pw), digit = /\d/.test(pw), sym = /[^A-Za-z0-9]/.test(pw);
  const named = username.length >= 3 && pw.toLowerCase().includes(username.toLowerCase());
  const easy = /^(.)\1+$/.test(pw) || /^(123456|password|qwerty|abcdef)/i.test(pw);
  const ok = long && mix && !named && !easy;
  let pts = 0;
  if (pw.length >= 6) pts++; if (pw.length >= 10) pts++; if (lower && upper) pts++; if (digit) pts++; if (sym) pts++;
  const level = !ok ? 0 : pts >= 5 ? 3 : pts >= 4 ? 2 : 1; // 0 refused, 1 weak but allowed, 2 medium, 3 strong
  return { ok, level, long, mix, named, easy };
}
function PasswordMeter({ pw, username }) {
  if (!pw) return null;
  const r = passwordScore(pw, username);
  const label = !r.ok ? 'Not allowed yet' : ['', 'Weak', 'Medium', 'Strong'][r.level];
  const color = !r.ok ? 'bg-red-500' : r.level === 1 ? 'bg-amber-500' : r.level === 2 ? 'bg-lime-500' : 'bg-emerald-500';
  const tip = (v, t) => <li className={v ? 'text-emerald-600' : 'text-muted'}>{v ? '✓' : '•'} {t}</li>;
  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex gap-1.5">{[1, 2, 3].map((i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${r.ok && r.level >= i ? color : !r.ok && i === 1 ? color : 'bg-line'}`} />)}</div>
      <p className="mt-1 text-xs font-semibold text-fg2">{label}</p>
      <ul className="mt-1 space-y-0.5 text-xs">
        {tip(r.long, '6 or more characters')}
        {tip(r.mix, 'Letters together with numbers or symbols')}
        {tip(!r.named && !r.easy, 'Not your user name, not a common word')}
      </ul>
      {r.ok && r.level < 3 && <p className="mt-1 text-xs text-muted">Tip: add a capital letter, a symbol and 10+ characters to make it strong.</p>}
    </div>
  );
}

// six boxes for the e-mailed code: type, paste or let the phone fill it in
function OtpBoxes({ value, onChange }) {
  const ref = useRef(null);
  const digits = value.padEnd(6, ' ').split('');
  return (
    <div className="relative" onClick={() => ref.current?.focus()}>
      <input ref={ref} value={value} onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus aria-label="6-digit code"
        className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0" />
      <div className="flex justify-between gap-2" aria-hidden="true">
        {digits.map((d, i) => (
          <span key={i} className={`grid h-14 flex-1 place-items-center rounded-2xl border bg-bg/70 font-mono text-2xl font-bold text-fg transition ${i === Math.min(value.length, 5) ? 'border-tech ring-4 ring-tech/15' : d.trim() ? 'border-accent/60' : 'border-line'}`}>{d.trim()}</span>
        ))}
      </div>
    </div>
  );
}

// sign-up (at most 3 admin accounts): user name, e-mail and password, then the 6-digit code that is e-mailed
function SignupPanel({ setMode }) {
  const login = useStore((s) => s.login);
  const [step, setStep] = useState(1);
  const [f, setF] = useState({ username: '', email: '', password: '' });
  const [code, setCode] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const signupReady = /^[A-Za-z0-9._-]{3,30}$/.test(f.username.trim()) && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim()) && passwordScore(f.password, f.username.trim()).ok;
  const say = (ex) => setErr(ex?.response?.status === 429 ? 'Too many attempts. Wait a few minutes and try again.' : ex?.response?.data?.error || 'The server did not answer. It may be waking up. Wait a minute and try again.');

  const start = async (e) => {
    e.preventDefault(); setErr(''); setMsg('');
    if (!f.username.trim() || !f.email.trim() || !f.password) { setErr('Fill in the user name, the e-mail and the password.'); return; }
    setBusy(true);
    try { const r = await api.post('/auth/signup/start', { username: f.username.trim(), email: f.email.trim(), password: f.password }); setMsg(r.data?.message || 'We sent a code to your e-mail.'); setStep(2); }
    catch (ex) { say(ex); }
    setBusy(false);
  };
  const verify = async (e) => {
    e.preventDefault(); setErr('');
    setBusy(true);
    try {
      await api.post('/auth/signup/verify', { email: f.email.trim(), code: code.trim() });
      try { await login(f.username.trim(), f.password); } catch { setMode('in'); } // signed in at once; if that fails the sign-in page opens
    } catch (ex) { say(ex); }
    setBusy(false);
  };

  return (
    <div className="relative rounded-[33px] border border-line bg-[var(--glass)] p-8 shadow-[var(--shadow-xl)] backdrop-blur-2xl sm:p-10">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-tech/10 text-tech">{step === 1 ? <UserPlus size={26} /> : <Mail size={26} />}</div>
        <h1 className="text-[1.6rem] leading-tight text-fg">{step === 1 ? 'Create your account' : 'Check your e-mail'}</h1>
        <p className="mt-1.5 text-sm text-fg2">{step === 1 ? 'Only 3 admin accounts can be made. Your e-mail is checked with a code.' : msg}</p>
      </div>
      {step === 1 ? (
        <form onSubmit={start} noValidate>
          <label className="mb-4 block"><span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-fg2">User name</span>
            <span className="relative block"><input className={field} value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} autoCapitalize="none" spellCheck={false} autoComplete="username" placeholder="3 to 30 letters or numbers" />
              <User size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted peer-focus:text-tech" /></span></label>
          <label className="mb-4 block"><span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-fg2">E-mail</span>
            <span className="relative block"><input className={field} type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoCapitalize="none" spellCheck={false} autoComplete="email" placeholder="you@gmail.com" />
              <Mail size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted peer-focus:text-tech" /></span></label>
          <label className="mb-2 block"><span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-fg2">Password</span>
            <span className="relative block"><input className={`${field} pr-12`} type={show ? 'text' : 'password'} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="new-password" placeholder="6+ characters, letters and numbers" />
              <Lock size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted peer-focus:text-tech" />
              <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-xl text-fg2 hover:text-accent">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>
          <PasswordMeter pw={f.password} username={f.username.trim()} />
          {err && <p role="alert" className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-500"><AlertCircle size={16} className="shrink-0" /> {err}</p>}
          <button disabled={busy || !signupReady} className="btn-primary mt-6 w-full !py-3.5 disabled:opacity-60">{busy ? <Loader2 size={17} className="animate-spin" /> : <Mail size={15} />} {busy ? 'Sending…' : 'Send me the code'}</button>
        </form>
      ) : (
        <form onSubmit={verify} noValidate>
          <OtpBoxes value={code} onChange={setCode} />
          {err && <p role="alert" className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-500"><AlertCircle size={16} className="shrink-0" /> {err}</p>}
          <button disabled={busy || code.trim().length < 6} className="btn-primary mt-6 w-full !py-3.5 disabled:opacity-60">{busy ? <Loader2 size={17} className="animate-spin" /> : <CheckCircle2 size={15} />} {busy ? 'Checking…' : 'Create my account'}</button>
          <div className="mt-4 flex items-center justify-between text-xs"><button type="button" onClick={() => { setStep(1); setErr(''); setCode(''); }} className="text-muted hover:text-accent">Wrong e-mail? Go back</button><button type="button" disabled={busy} onClick={start} className="font-semibold text-accent hover:underline disabled:opacity-50">Send the code again</button></div>
        </form>
      )}
      <button type="button" onClick={() => setMode('in')} className="mt-5 block w-full text-center text-sm font-semibold text-accent hover:underline">Back to sign in</button>
    </div>
  );
}

export default function Login() {
  const login = useStore((s) => s.login);
  const [f, setF] = useState({ username: localStorage.getItem('bauet-admin-name') || '', password: '', code: '' });
  const [needCode, setNeedCode] = useState(false);
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  // a link from the reset e-mail (?reset=...) opens the new-password form straight away
  const [mode, setMode] = useState(() => (new URLSearchParams(window.location.search).get('reset') ? 'reset' : 'in'));

  // sign-up is offered only while fewer than 3 admin accounts exist
  const [slots, setSlots] = useState(0);
  useEffect(() => { api.get('/auth/signup/status').then((r) => setSlots(r.data?.open ? r.data.left : 0)).catch(() => {}); }, []);

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
        {mode === 'signup' ? <SignupPanel setMode={setMode} /> : mode !== 'in' ? <ResetPanel mode={mode} setMode={setMode} username={f.username} setUsername={(v) => setF({ ...f, username: v })} /> : (
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
              <input className={field} value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} placeholder="Your user name" required autoComplete="username" autoCapitalize="none" spellCheck={false} />
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

          {slots > 0 && <button type="button" onClick={() => setMode('signup')} className="btn-outline mt-3 w-full !py-3"><UserPlus size={15} /> Create an account ({slots} left)</button>}

          <p className="mt-6 text-center text-xs text-muted">Only club administrators can sign in. Repeated wrong passwords lock the account for a while.</p>
        </form>
        )}
      </motion.div>
    </div>
  );
}
