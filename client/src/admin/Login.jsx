import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Lock } from 'lucide-react';
import useStore from '../context/store';
import Backdrop3D from '../components/Backdrop3D';
import Logo from '../components/Logo';
import { inputCls } from './ui';

export default function Login() {
  const login = useStore((s) => s.login);
  const [f, setF] = useState({ username: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try { await login(f.username, f.password); } catch { setErr('Invalid username or password'); }
    setBusy(false);
  };

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden px-4">
      <Backdrop3D variant="hero" className="absolute inset-0 opacity-60" />
      <Link to="/" className="absolute left-6 top-6 z-10 flex items-center gap-2 text-sm text-fg2 hover:text-accent"><ArrowLeft size={15} /> Back to site</Link>
      <motion.form onSubmit={submit} initial={{ opacity: 0, y: 30, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md rounded-[32px] border border-line bg-[var(--glass)] p-9 shadow-[var(--shadow-xl)] backdrop-blur-2xl">
        <div className="mb-8 text-center">
          <div className="mb-5 flex justify-center"><Logo kind="club" height={84} priority /></div>
          <h1 className="text-3xl text-fg">Admin console</h1>
          <p className="mt-1 text-sm text-fg2">Sign in to manage the club website</p>
        </div>
        <label className="mb-4 block"><span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-fg2">Username</span>
          <input className={inputCls} value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} autoFocus required autoComplete="username" /></label>
        <label className="mb-2 block"><span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-fg2">Password</span>
          <input className={inputCls} type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required autoComplete="current-password" /></label>
        {err && <p className="mt-2 text-center text-sm text-red-500">{err}</p>}
        <button disabled={busy} className="btn-primary mt-6 w-full disabled:opacity-60">{busy ? <Loader2 size={16} className="animate-spin" /> : <Lock size={15} />} {busy ? 'Signing in…' : 'Sign in'}</button>
      </motion.form>
    </div>
  );
}
