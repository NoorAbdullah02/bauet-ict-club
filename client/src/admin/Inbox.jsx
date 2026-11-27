import { useEffect, useState } from 'react';
import { Eye, EyeOff, Trash2, Mail, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { useShallow } from 'zustand/react/shallow';
import useStore from '../context/store';
import { canDelete } from './roles';
import { Panel, PageTitle, askConfirm, toastTrashed, inputCls } from './ui';
import { cn } from '../lib/cn';

export default function Inbox() {
  const { messages, fetchMessages, updateItem, deleteItem } = useStore(useShallow((s) => ({ messages: s.messages, fetchMessages: s.fetchMessages, updateItem: s.updateItem, deleteItem: s.deleteItem })));
  const user = useStore((s) => s.user);
  const [q, setQ] = useState('');
  useEffect(() => { fetchMessages().catch(() => toast.error('Could not load messages')); }, []);
  const run = async (fn) => { try { await fn(); } catch (e) { toast.error(e.response?.data?.error || e.message); } };
  const s = q.trim().toLowerCase();
  const shown = s ? messages.filter((m) => `${m.name} ${m.email} ${m.subject || ''} ${m.message}`.toLowerCase().includes(s)) : messages;

  return (
    <div>
      <PageTitle title="Messages" sub={`${messages.filter((m) => !m.is_read).length} unread of ${messages.length}`}>
        {messages.length > 0 && (
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search messages…" className={`${inputCls} !w-56 !rounded-full !py-2 pl-9`} />
          </div>
        )}
      </PageTitle>
      {messages.length === 0 ? <Panel className="p-12 text-center text-sm text-muted">Inbox is empty.</Panel> : shown.length === 0 ? <Panel className="p-12 text-center text-sm text-muted">No matching messages.</Panel> : (
        <div className="space-y-3">
          {shown.map((m) => (
            <Panel key={m.id} className={cn('p-6 transition', !m.is_read && 'border-accent/50 shadow-[0_0_0_3px_rgba(var(--accent-rgb),0.08)]')}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><div className="flex items-center gap-2"><strong className="text-fg">{m.name}</strong>{!m.is_read && <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-white">NEW</span>}</div>
                  <a href={`mailto:${m.email}`} className="mt-0.5 flex items-center gap-1.5 text-xs text-tech"><Mail size={12} />{m.email}</a></div>
                <span className="text-xs text-muted">{new Date(m.created_at).toLocaleString()}</span>
              </div>
              {m.subject && <div className="mt-3 text-sm font-semibold text-fg">{m.subject}</div>}
              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-fg2">{m.message}</p>
              <div className="mt-4 flex gap-2">
                <button onClick={() => run(() => updateItem('messages', m.id, { is_read: !m.is_read }))} className="flex items-center gap-1.5 rounded-lg bg-tech/10 px-3 py-1.5 text-xs font-semibold text-tech">{m.is_read ? <EyeOff size={13} /> : <Eye size={13} />} Mark {m.is_read ? 'unread' : 'read'}</button>
                {canDelete(user) && <button onClick={async () => { if (await askConfirm({ title: 'Delete this message?', message: 'It will be moved to the Trash.', confirmText: 'Move to Trash', danger: true })) run(async () => { await deleteItem('messages', m.id); toastTrashed('Message', () => useStore.getState().restoreTrash('messages', m.id)); }); }} className="flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-500"><Trash2 size={13} /> Delete</button>}
              </div>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
