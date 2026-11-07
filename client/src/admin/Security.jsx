import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Download, Loader2, ShieldCheck, Trash2, UserPlus } from 'lucide-react';
import { api } from '../context/store';
import { Panel, inputCls, askConfirm } from './ui';
import { saveFile } from '../lib/download';
import { formalDate } from '../lib/format';

/** Main admin only: extra "editor" logins and a full backup. */
export default function Security() {
  const [team, setTeam] = useState(null);
  const [f, setF] = useState({ username: '', password: '' });
  const [busy, setBusy] = useState(false);
  const load = () => api.get('/team').then((r) => setTeam(r.data)).catch(() => setTeam([]));
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault(); setBusy(true);
    try { await api.post('/team', f); toast.success('Editor login created'); setF({ username: '', password: '' }); load(); }
    catch (err) { toast.error(err.response?.data?.error || 'Could not create'); }
    setBusy(false);
  };
  const remove = async (u) => {
    if (!(await askConfirm({ title: `Remove “${u.username}”?`, message: 'This person can no longer sign in. What they made stays.', confirmText: 'Remove login', danger: true }))) return;
    try { await api.delete(`/team/${u.id}`); load(); toast.success('Removed'); } catch { toast.error('Could not remove'); }
  };

  return (
    <>
      <Panel className="self-start p-6 xl:col-start-2">
        <h3 className="flex items-center gap-2 text-xl text-fg"><ShieldCheck size={18} /> Team logins</h3>
        <p className="mt-1 text-xs leading-5 text-fg2">An <b>editor</b> can add and change events, forms and notices, but cannot delete anything, see payments, backups or this list.</p>
        <ul className="mt-3 divide-y divide-line text-sm">
          {team === null ? <li className="py-2"><Loader2 size={14} className="animate-spin text-muted" /></li> : team.map((u) => (
            <li key={u.id} className="flex items-center gap-2 py-2"><span className="min-w-0 flex-1 truncate text-fg">{u.username}{u.email && <span className="block truncate text-xs text-muted">{u.email}</span>}</span><span className="rounded-full bg-alt px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-fg2">{u.role === 'editor' ? 'Editor' : u.role === 'admin' ? 'Admin' : 'Main admin'}</span>
              <span className="hidden text-xs text-muted sm:inline">{formalDate(u.created_at)}</span>
              {u.role !== 'superadmin' && <button onClick={() => remove(u)} aria-label={`Remove ${u.username}`} className="grid size-8 place-items-center rounded-lg text-fg2 hover:bg-red-500/10 hover:text-red-500"><Trash2 size={14} /></button>}</li>
          ))}
        </ul>
        <form onSubmit={add} className="mt-4 grid gap-2 sm:grid-cols-2">
          <input className={inputCls} placeholder="Username" autoComplete="off" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} required />
          <input className={inputCls} type="password" placeholder="Password (10+ characters)" autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required />
          <button disabled={busy} className="btn-primary !px-5 !py-2.5 text-xs disabled:opacity-60 sm:col-span-2">{busy ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />} Add editor</button>
        </form>
      </Panel>
      <Panel className="self-start p-6 xl:col-start-2">
        <h3 className="flex items-center gap-2 text-xl text-fg"><Download size={18} /> Backup</h3>
        <p className="mt-1 text-sm leading-6 text-fg2">One ZIP with everything (events, forms, responses, members, messages ...) as files you can open. Pictures stay on Cloudinary. Save it somewhere safe, for example once a month and before every new semester.</p>
        <button onClick={() => saveFile('/backup', {}, `bauet-ict-backup-${new Date().toISOString().slice(0, 10)}.zip`)} className="btn-primary mt-4 !px-5 !py-2.5 text-xs"><Download size={14} /> Download full backup</button>
      </Panel>
    </>
  );
}
