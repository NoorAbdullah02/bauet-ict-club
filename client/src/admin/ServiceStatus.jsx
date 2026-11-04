import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Mail, Cloud, Loader2, Send, CheckCircle2, AlertTriangle } from 'lucide-react';
import { api } from '../context/store';
import { Panel, inputCls } from './ui';

const Dot = ({ ok }) => (ok ? <CheckCircle2 size={16} className="text-emerald-500" /> : <AlertTriangle size={16} className="text-amber-500" />);

/** Settings card: is email connected, is Cloudinary connected, and a button to send a test email. */
export default function ServiceStatus() {
  const [mail, setMail] = useState(null);
  const [img, setImg] = useState(null);
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    api.get('/email/status').then((r) => setMail(r.data)).catch(() => setMail({ configured: false }));
    api.get('/upload/status').then((r) => setImg(r.data)).catch(() => setImg({ configured: false }));
  };
  useEffect(load, []);

  const sendTest = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { await api.post('/email/test', { to }); toast.success(`Test email sent to ${to}`); load(); }
    catch (err) { toast.error(err.response?.data?.error || 'Could not send'); }
    setBusy(false);
  };

  return (
    <Panel className="space-y-5 self-start p-6 xl:col-start-2">
      <h3 className="text-xl text-fg">Connections</h3>

      <div className="flex gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent"><Mail size={18} /></span>
        <div className="min-w-0 text-sm">
          <div className="flex items-center gap-2 font-semibold text-fg"><Dot ok={mail?.configured} /> Email {mail === null ? '…' : mail.configured ? `via ${mail.provider.toUpperCase()}` : 'not set up'}</div>
          {mail?.configured
            ? <p className="mt-1 text-fg2">Sends from {mail.from}. Admin alerts go to {mail.adminNotify}. Sent {mail.sent}, failed {mail.failed}{mail.lastError ? `, last error: ${mail.lastError}` : ''}.</p>
            : <p className="mt-1 text-fg2">Add <code className="text-accent">SMTP_USER</code> and <code className="text-accent">SMTP_PASS</code> (a Gmail app password) to <code>.env</code> and restart. Applicants then get confirmation and result emails.</p>}
          {mail?.configured && (
            <form onSubmit={sendTest} className="mt-3 flex gap-2">
              <input type="email" required value={to} onChange={(e) => setTo(e.target.value)} placeholder="Send a test email to…" className={inputCls} />
              <button disabled={busy} className="btn-primary !px-4 !py-2.5 text-xs disabled:opacity-60">{busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Test</button>
            </form>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-tech/10 text-tech"><Cloud size={18} /></span>
        <div className="min-w-0 text-sm">
          <div className="flex items-center gap-2 font-semibold text-fg"><Dot ok={img?.provider === 'cloudinary' && img?.ok} /> Images {img === null ? '…' : img.provider === 'cloudinary' ? (img.ok ? `on Cloudinary (${img.cloud})` : 'Cloudinary keys rejected') : 'saved on this server'}</div>
          <p className="mt-1 text-fg2">{img?.provider === 'cloudinary' ? (img.ok ? 'Photos are optimised and stored on Cloudinary; deleting from Trash removes them there too.' : img.error) : (img?.note || 'Add CLOUDINARY_* keys to .env to store photos on Cloudinary.')}</p>
        </div>
      </div>
    </Panel>
  );
}
