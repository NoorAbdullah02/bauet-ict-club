import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Save, Loader2, FlaskConical, Trash2, KeyRound, ShieldCheck, LogOut, Bell, Send } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import useStore from '../context/store';
import { Panel, PageTitle, inputCls, askConfirm } from './ui';
import ServiceStatus from './ServiceStatus';
import Security from './Security';
import { api } from '../context/store';

function PasswordPanel() {
  const [v, setV] = useState({ current: '', next: '', again: '' });
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (v.next !== v.again) return toast.error('The two new passwords do not match');
    setBusy(true);
    try { const r = await api.post('/auth/change-password', { current: v.current, next: v.next }); if (r.data?.token) localStorage.setItem('bauet-token', r.data.token); toast.success('Password changed. Other devices were signed out.'); setV({ current: '', next: '', again: '' }); }
    catch (err) { toast.error(err.response?.data?.error || 'Could not change password'); }
    setBusy(false);
  };
  const field = (k, label, ac) => (
    <label className="block"><span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-fg2">{label}</span>
      <input type="password" autoComplete={ac} required className={inputCls} value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} /></label>
  );
  return (
    <Panel className="self-start p-6 xl:col-start-2">
      <form onSubmit={submit} className="space-y-4">
        <h3 className="flex items-center gap-2 text-xl text-fg"><KeyRound size={18} /> Change password</h3>
        {field('current', 'Current password', 'current-password')}
        {field('next', 'New password (min 6 characters, letters and numbers)', 'new-password')}
        {field('again', 'Repeat new password', 'new-password')}
        <button disabled={busy} className="btn-primary !px-5 !py-2.5 text-xs disabled:opacity-60">{busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Change password</button>
      </form>
    </Panel>
  );
}


/** Two-step sign-in with an authenticator app + "sign out everywhere". */
function TwoFactorPanel() {
  const [st, setSt] = useState(null);
  const [step, setStep] = useState('idle'); // idle | password | scan | codes | off
  const [pw, setPw] = useState('');
  const [code, setCode] = useState('');
  const [setup, setSetup] = useState(null);
  const [codes, setCodes] = useState([]);
  const [busy, setBusy] = useState(false);
  const load = () => api.get('/auth/2fa/status').then((r) => setSt(r.data)).catch(() => setSt({ enabled: false }));
  useEffect(() => { load(); }, []);
  const run = async (fn, okMsg) => {
    setBusy(true);
    try { await fn(); if (okMsg) toast.success(okMsg); } catch (e) { toast.error(e.response?.data?.error || 'Something went wrong'); }
    setBusy(false);
  };
  const start = (e) => { e.preventDefault(); run(async () => { const r = await api.post('/auth/2fa/setup', { password: pw }); setSetup(r.data); setStep('scan'); setPw(''); }); };
  const enable = (e) => { e.preventDefault(); run(async () => { const r = await api.post('/auth/2fa/enable', { code }); setCodes(r.data.backupCodes); setStep('codes'); setCode(''); load(); }, 'Two-step sign-in is on'); };
  const disable = (e) => { e.preventDefault(); run(async () => { await api.post('/auth/2fa/disable', { password: pw, code }); setStep('idle'); setPw(''); setCode(''); load(); }, 'Two-step sign-in is off'); };
  const everywhere = async () => {
    if (!(await askConfirm({ title: 'Sign out everywhere?', message: 'Every other phone and computer signed in to this account will be signed out. You stay signed in here.', confirmText: 'Sign out others' }))) return;
    run(async () => { const r = await api.post('/auth/logout-all'); if (r.data?.token) localStorage.setItem('bauet-token', r.data.token); }, 'Other devices signed out');
  };
  const input = (v, set, ph, type = 'text', extra = {}) => <input type={type} value={v} onChange={(e) => set(e.target.value)} placeholder={ph} required className={inputCls} {...extra} />;
  return (
    <Panel className="self-start space-y-4 p-6 xl:col-start-2">
      <h3 className="flex items-center gap-2 text-xl text-fg"><ShieldCheck size={18} /> Two-step sign-in</h3>
      {!st ? <Loader2 className="animate-spin" size={16} /> : step === 'idle' && (
        <>
          <p className="text-sm text-fg2">{st.enabled ? `On. Signing in needs a 6-digit code from your authenticator app. ${st.backupCodesLeft} backup code${st.backupCodesLeft === 1 ? '' : 's'} left.` : 'Off. Turn it on so a stolen password alone can never open the admin console.'}</p>
          <div className="flex flex-wrap gap-2">
            {st.enabled
              ? <button onClick={() => setStep('off')} className="btn-outline !px-5 !py-2.5 text-xs">Turn off</button>
              : <button onClick={() => setStep('password')} className="btn-primary !px-5 !py-2.5 text-xs"><ShieldCheck size={14} /> Turn on</button>}
            <button onClick={everywhere} disabled={busy} className="btn-outline !px-5 !py-2.5 text-xs"><LogOut size={14} /> Sign out other devices</button>
          </div>
        </>
      )}
      {step === 'password' && (
        <form onSubmit={start} className="space-y-3">
          <p className="text-sm text-fg2">Confirm your password to begin.</p>
          {input(pw, setPw, 'Your password', 'password', { autoComplete: 'current-password' })}
          <div className="flex gap-2"><button disabled={busy} className="btn-primary !px-5 !py-2.5 text-xs">Continue</button><button type="button" onClick={() => setStep('idle')} className="btn-outline !px-5 !py-2.5 text-xs">Cancel</button></div>
        </form>
      )}
      {step === 'scan' && setup && (
        <form onSubmit={enable} className="space-y-3">
          <p className="text-sm text-fg2">1. Open Google Authenticator, Microsoft Authenticator or Authy and scan this picture.</p>
          <img src={setup.qr} alt="QR code for your authenticator app" width={200} height={200} className="rounded-xl border border-line bg-white p-2" />
          <p className="break-all font-mono text-[11px] text-muted">Cannot scan? Type this key: {setup.secret}</p>
          <p className="text-sm text-fg2">2. Type the 6-digit code it shows.</p>
          {input(code, setCode, '123456', 'text', { inputMode: 'numeric', autoComplete: 'one-time-code', maxLength: 6 })}
          <div className="flex gap-2"><button disabled={busy} className="btn-primary !px-5 !py-2.5 text-xs">Turn on</button><button type="button" onClick={() => setStep('idle')} className="btn-outline !px-5 !py-2.5 text-xs">Cancel</button></div>
        </form>
      )}
      {step === 'codes' && (
        <div className="space-y-3">
          <p className="text-sm text-fg2">Save these 8 backup codes somewhere safe (a password manager or paper). Each works once if you lose your phone. They are shown only now.</p>
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-line bg-bg p-3 font-mono text-sm text-fg">{codes.map((c) => <span key={c}>{c}</span>)}</div>
          <div className="flex gap-2">
            <button onClick={() => navigator.clipboard?.writeText(codes.join('\n')).then(() => toast.success('Copied'))} className="btn-outline !px-5 !py-2.5 text-xs">Copy</button>
            <button onClick={() => { setCodes([]); setStep('idle'); }} className="btn-primary !px-5 !py-2.5 text-xs">I saved them</button>
          </div>
        </div>
      )}
      {step === 'off' && (
        <form onSubmit={disable} className="space-y-3">
          <p className="text-sm text-fg2">Enter your password and a current code (or a backup code).</p>
          {input(pw, setPw, 'Your password', 'password', { autoComplete: 'current-password' })}
          {input(code, setCode, '6-digit or backup code', 'text', { autoComplete: 'one-time-code' })}
          <div className="flex gap-2"><button disabled={busy} className="btn-primary !px-5 !py-2.5 text-xs">Turn off</button><button type="button" onClick={() => setStep('idle')} className="btn-outline !px-5 !py-2.5 text-xs">Cancel</button></div>
        </form>
      )}
    </Panel>
  );
}

/** Phone notifications: is the Firebase key read, how many phones have the app, and a test message (admins). */
function PushPanel() {
  const [st, setSt] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [msg, setMsg] = useState({ title: '', body: '', page: '/' });
  const [sending, setSending] = useState(false);
  const load = () => api.get('/push/status').then((r) => setSt(r.data)).catch(() => setSt({ error: true }));
  useEffect(() => { load(); }, []);
  const test = async () => {
    setBusy(true); setResult(null);
    try { const r = await api.post('/push/test'); setResult(r.data); load(); }
    catch (e) { setResult({ problem: e.response?.data?.error || 'Could not reach the server' }); }
    setBusy(false);
  };
  const sendMsg = async (e) => {
    e.preventDefault();
    if (!(await askConfirm({ title: 'Send this to every phone?', message: `“${msg.title}”: ${msg.body}\n\nIt reaches everyone who has the app, even people who switched topics off. It cannot be taken back.`, confirmText: 'Send now' }))) return;
    setSending(true);
    try { const r = await api.post('/push/send', msg); toast.success(`Sent to ${r.data.sent} phone${r.data.sent === 1 ? '' : 's'}`); setMsg({ title: '', body: '', page: '/' }); }
    catch (err) { toast.error(err.response?.data?.error || 'Could not send'); }
    setSending(false);
  };
  const row = (ok, label, detail) => (
    <li className="flex items-start gap-2.5 text-sm"><span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white ${ok ? 'bg-emerald-500' : 'bg-red-500'}`}>{ok ? '✓' : '!'}</span><span><b className="text-fg">{label}</b>{detail ? <span className="text-fg2"> {detail}</span> : null}</span></li>
  );
  return (
    <Panel className="self-start space-y-4 p-6 xl:col-start-2">
      <h3 className="flex items-center gap-2 text-xl text-fg"><Bell size={18} /> Phone notifications</h3>
      {!st ? <Loader2 className="animate-spin" size={16} /> : st.error ? <p className="text-sm text-red-500">Could not load the status.</p> : (
        <>
          <ul className="space-y-2">
            {row(st.configured, 'Firebase key', st.configured ? `read (project ${st.project})` : 'not read')}
            {row(st.enabled, 'Sending', st.enabled ? 'on' : 'off')}
            {row(st.phones > 0, 'Phones with the app', `${st.phones} registered`)}
          </ul>
          {st.problem && <p className="rounded-xl bg-amber-500/10 px-3.5 py-2.5 text-sm text-amber-700">{st.problem}</p>}
          <button onClick={test} disabled={busy || !st.enabled} className="btn-primary !px-5 !py-2.5 text-xs disabled:opacity-60">{busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Send a test notification</button>
          {result && (
            <p className={`rounded-xl px-3.5 py-2.5 text-sm ${result.sent > 0 ? 'bg-emerald-500/10 text-emerald-700' : 'bg-red-500/10 text-red-600'}`}>
              {result.sent > 0 ? `Sent to ${result.sent} phone${result.sent === 1 ? '' : 's'}. Check the phone now.` : (result.problem || 'Nothing was sent.')}
            </p>
          )}
          <form onSubmit={sendMsg} className="space-y-3 rounded-2xl border border-line bg-alt/50 p-4">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-fg"><Send size={14} /> Write a message to every phone</h4>
            <input className={inputCls} maxLength={80} required placeholder="Title (for example: Class moved)" value={msg.title} onChange={(e) => setMsg({ ...msg, title: e.target.value })} />
            <textarea className={`${inputCls} min-h-20`} maxLength={160} required placeholder="Message (160 characters at most)" value={msg.body} onChange={(e) => setMsg({ ...msg, body: e.target.value })} />
            <label className="block text-xs text-fg2">Opens this page when tapped
              <select className={`${inputCls} mt-1`} value={msg.page} onChange={(e) => setMsg({ ...msg, page: e.target.value })}>
                {[['/', 'Home'], ['/events', 'Events'], ['/notices', 'Notices'], ['/jobs', 'Jobs'], ['/contests', 'Contests'], ['/projects', 'Projects'], ['/resources', 'Resources'], ['/team', 'Team'], ['/gallery', 'Gallery']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <div className="flex items-center justify-between gap-2"><span className="text-xs text-muted">{msg.body.length}/160</span>
              <button disabled={sending || !st.enabled} className="btn-primary !px-5 !py-2.5 text-xs disabled:opacity-60">{sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Send to all phones</button></div>
          </form>
          <p className="text-xs text-muted">New events, notices (urgent ones reach everyone), jobs, contests and projects are sent by themselves; so are "tomorrow" and "today" reminders for events and "2 days left" for contests. The test goes to every phone that has the app and allowed notifications. Each person's phone must have the newest app (build 114 or newer).</p>
        </>
      )}
    </Panel>
  );
}

const FIELDS = [['heroTitle', 'Hero title', 'text'], ['heroSub', 'Hero subtitle', 'text'], ['aboutText', 'About text', 'textarea'], ['mission', 'Mission', 'textarea'], ['vision', 'Vision', 'textarea'], ['goal', 'Goal', 'textarea']];

export default function SettingsView() {
  const { settings, updateSettings } = useStore(useShallow((s) => ({ settings: s.settings, updateSettings: s.updateSettings })));
  const user = useStore((s) => s.user);
  const [f, setF] = useState(null);
  const [busy, setBusy] = useState(false);
  const [demo, setDemo] = useState(null);
  const [demoBusy, setDemoBusy] = useState(false);
  const { demoStatus, loadDemo, removeDemo } = useStore(useShallow((s) => ({ demoStatus: s.demoStatus, loadDemo: s.loadDemo, removeDemo: s.removeDemo })));
  useEffect(() => { demoStatus().then(setDemo).catch(() => setDemo(0)); }, []);

  const toggleDemo = async () => {
    if (demo > 0 && !(await askConfirm({ title: 'Remove all demo data?', message: 'Only the sample events, notices, committee, ambassadors and applications are deleted. Your real data is not touched.', confirmText: 'Remove demo data', danger: true }))) return;
    setDemoBusy(true);
    try {
      if (demo > 0) { const r = await removeDemo(); toast.success(`Removed ${r.removed} demo items`); setDemo(0); }
      else { const r = await loadDemo(); toast.success(r.loaded ? `Loaded ${r.count} demo items` : r.reason); setDemo(r.count ?? 0); }
    } catch (e) { toast.error(e.response?.data?.error || 'Something went wrong'); }
    setDemoBusy(false);
  };
  useEffect(() => { if (settings && !f) setF({ ...settings, socialLinks: { ...settings.socialLinks } }); }, [settings]);
  if (!f) return <p className="text-sm text-muted">Loading settings…</p>;

  const save = async () => {
    setBusy(true);
    try { await updateSettings(f); toast.success('Settings saved'); } catch { toast.error('Could not save settings'); }
    setBusy(false);
  };

  return (
    <div>
      <PageTitle title="Site settings" sub="Text shown on the public website.">
        <button onClick={save} disabled={busy} className="btn-primary !px-5 !py-2.5 text-xs disabled:opacity-60">{busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save changes</button>
      </PageTitle>
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Panel className="space-y-4 p-6">
          {FIELDS.map(([k, label, type]) => (
            <label key={k} className="block"><span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-fg2">{label}</span>
              {type === 'textarea' ? <textarea className={`${inputCls} min-h-24 resize-y`} value={f[k] || ''} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
                : <input className={inputCls} value={f[k] || ''} onChange={(e) => setF({ ...f, [k]: e.target.value })} />}</label>
          ))}
        </Panel>
        <Panel className="space-y-4 self-start p-6 xl:col-start-2">
          <h3 className="text-xl text-fg">Contact & social</h3>
          {[['fb', 'Facebook URL'], ['email', 'Email'], ['phone', 'Phone']].map(([k, label]) => (
            <label key={k} className="block"><span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-fg2">{label}</span>
              <input className={inputCls} value={f.socialLinks?.[k] || ''} onChange={(e) => setF({ ...f, socialLinks: { ...f.socialLinks, [k]: e.target.value } })} /></label>
          ))}
        </Panel>
        <ServiceStatus />
        <PasswordPanel />
        <TwoFactorPanel />
        {['superadmin', 'admin'].includes(user?.role) && <PushPanel />}
        {user?.role === 'superadmin' && <Security />}
        {demo > 0 && (
        <Panel className="self-start p-6 xl:col-start-2">
          <div className="flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-tech/12 text-tech"><FlaskConical size={22} /></span>
            <div className="min-w-0">
              <h3 className="text-xl text-fg">Demo data</h3>
              <p className="mt-1 text-sm leading-6 text-fg2">Sample (demo) rows are still in the database. Remove them in one click: only the demo rows go, your real data stays.</p>
              <p className="mt-2 font-mono text-[11px] uppercase tracking-widest text-muted">{demo === null ? 'checking…' : demo > 0 ? `${demo} demo items loaded` : 'no demo data loaded'}</p>
              <button onClick={toggleDemo} disabled={demoBusy || demo === null} className={`mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold transition disabled:opacity-60 ${demo > 0 ? 'border border-red-500/40 text-red-500 hover:bg-red-500/10' : 'btn-primary'}`}>
                {demoBusy ? <Loader2 size={14} className="animate-spin" /> : demo > 0 ? <Trash2 size={14} /> : <FlaskConical size={14} />}{demo > 0 ? 'Remove demo data' : 'Load demo data'}
              </button>
            </div>
          </div>
        </Panel>
        )}
      </div>
    </div>
  );
}
