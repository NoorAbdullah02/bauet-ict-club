import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Send, Loader2, Users } from 'lucide-react';
import { api } from '../context/store';
import { Panel, PageTitle, inputCls, askConfirm } from './ui';

/** Compose a message and email it to every newsletter subscriber (or just yourself first, as a test). */
export default function Newsletter() {
  const [subs, setSubs] = useState(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [testTo, setTestTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [mail, setMail] = useState(null);

  useEffect(() => {
    api.get('/subscribers', { params: { _: Date.now() } }).then((r) => setSubs(r.data.length)).catch(() => setSubs(0));
    api.get('/email/status').then((r) => setMail(r.data)).catch(() => setMail({ configured: false }));
  }, []);

  const send = async (test) => {
    if (!test && !(await askConfirm({ title: `Send to ${subs} subscribers?`, message: 'Every subscriber gets this email. This cannot be undone.', confirmText: 'Send now' }))) return;
    setBusy(true);
    try {
      const r = await api.post('/email/newsletter', { subject, message, ...(test ? { testTo } : {}) });
      toast.success(test ? `Test sent to ${testTo}` : `Queued for ${r.data.queued} subscribers`);
      if (!test) { setSubject(''); setMessage(''); }
    } catch (e) { toast.error(e.response?.data?.error || 'Could not send'); }
    setBusy(false);
  };

  return (
    <div>
      <PageTitle title="Newsletter" sub={subs === null ? 'Loading…' : `${subs} subscribers`} />
      {mail && !mail.configured && <Panel className="mb-5 border-amber-500/40 p-4 text-sm text-fg2">Email is not set up yet. Add <code className="text-accent">BREVO_API_KEY</code> and <code className="text-accent">MAIL_FROM</code> to <code>.env</code>, restart the server, then come back.</Panel>}
      <Panel className="max-w-2xl space-y-4 p-6">
        <label className="block"><span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-fg2">Subject</span>
          <input className={inputCls} value={subject} maxLength={150} onChange={(e) => setSubject(e.target.value)} placeholder="Python workshop this Friday" /></label>
        <label className="block"><span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-fg2">Message</span>
          <textarea className={`${inputCls} min-h-48 resize-y`} value={message} maxLength={8000} onChange={(e) => setMessage(e.target.value)} placeholder="Write plain text. A blank line starts a new paragraph. An unsubscribe link is added automatically." /></label>
        <div className="flex flex-wrap items-center gap-3">
          <input type="email" className={`${inputCls} !w-64`} value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="your@email (for a test)" />
          <button disabled={busy || !testTo || subject.length < 3 || message.length < 10} onClick={() => send(true)} className="btn-outline !px-4 !py-2.5 text-xs disabled:opacity-50">Send test</button>
          <button disabled={busy || !subs || subject.length < 3 || message.length < 10} onClick={() => send(false)} className="btn-primary !px-5 !py-2.5 text-xs disabled:opacity-50">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} <Users size={14} /> Send to all
          </button>
        </div>
      </Panel>
    </div>
  );
}
