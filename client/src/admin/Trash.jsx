import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { RotateCcw, Trash2, Loader2, Calendar, Bell, Users, Image as ImageIcon, Trophy, FileText, MessageSquare, ClipboardList } from 'lucide-react';
import useStore from '../context/store';
import { Panel, PageTitle, askConfirm } from './ui';
import { cn } from '../lib/cn';

const ICONS = { events: Calendar, notices: Bell, members: Users, gallery: ImageIcon, achievements: Trophy, posts: FileText, messages: MessageSquare, registrations: ClipboardList };
const ago = (d) => {
  const m = Math.max(1, Math.round((Date.now() - new Date(d)) / 60000));
  if (m < 60) return `${m} min ago`;
  if (m < 1440) return `${Math.round(m / 60)} h ago`;
  return `${Math.round(m / 1440)} d ago`;
};

export default function Trash() {
  const { trash, fetchTrash, restoreTrash, purgeTrash, emptyTrash } = useStore();
  const [busy, setBusy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => { fetchTrash().catch(() => toast.error('Could not load the trash')).finally(() => setLoading(false)); }, []);

  const types = useMemo(() => ['all', ...new Set(trash.items.map((i) => i.type))], [trash.items]);
  const items = trash.items.filter((i) => filter === 'all' || i.type === filter);
  const key = (i) => `${i.type}:${i.id}`;

  const act = async (i, fn, ok) => {
    setBusy(key(i));
    try { await fn(); toast.success(ok); } catch (e) { toast.error(e.response?.data?.error || 'Something went wrong'); }
    setBusy(null);
  };

  const forever = async (i) => {
    const ok = await askConfirm({
      title: 'Delete permanently?',
      message: `“${i.title}” will be removed from the database${i.image ? ' and its photo deleted from storage' : ''}. This cannot be undone.`,
      confirmText: 'Delete forever', danger: true,
    });
    if (ok) act(i, () => purgeTrash(i.type, i.id), 'Deleted permanently');
  };

  const empty = async () => {
    const ok = await askConfirm({ title: 'Empty the Trash?', message: `All ${trash.items.length} item(s) will be deleted permanently, including their stored photos. This cannot be undone.`, confirmText: 'Empty Trash', danger: true });
    if (!ok) return;
    setBusy('all');
    try { const n = await emptyTrash(); toast.success(`${n} item(s) deleted permanently`); } catch { toast.error('Could not empty the trash'); }
    setBusy(null);
  };

  return (
    <div>
      <PageTitle title="Trash" sub={`Deleted items are kept for ${trash.retentionDays} days, then removed automatically.`}>
        <button onClick={empty} disabled={!trash.items.length || busy === 'all'} className="flex items-center gap-2 rounded-full border border-red-500/40 px-5 py-2.5 text-xs font-semibold text-red-500 transition hover:bg-red-500/10 disabled:opacity-40">
          {busy === 'all' ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Empty Trash
        </button>
      </PageTitle>

      {types.length > 2 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {types.map((t) => <button key={t} onClick={() => setFilter(t)} className={cn('rounded-full border px-4 py-1.5 text-xs font-medium capitalize transition', filter === t ? 'border-accent bg-accent text-white' : 'border-line text-fg2 hover:border-accent')}>{t}</button>)}
        </div>
      )}

      {loading ? <Loader2 className="animate-spin text-muted" /> : items.length === 0 ? (
        <Panel className="grid place-items-center gap-3 p-16 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-alt text-muted"><Trash2 size={24} /></span>
          <div className="font-display text-xl text-fg">Trash is empty</div>
          <p className="max-w-xs text-sm text-muted">Anything you delete will appear here so you can restore it.</p>
        </Panel>
      ) : (
        <div className="space-y-3">
          {items.map((i) => {
            const Icon = ICONS[i.type] || FileText;
            const working = busy === key(i);
            return (
              <Panel key={key(i)} className="flex flex-wrap items-center gap-4 p-4">
                <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-alt text-muted">
                  {i.image ? <img src={i.image} alt="" loading="lazy" className="size-full object-cover" /> : <Icon size={20} />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-fg">{i.title}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                    <span className="rounded-full bg-accent/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-accent">{i.label}</span>
                    {i.sub && <span className="truncate">{i.sub}</span>}
                    <span>Deleted {ago(i.deleted_at)}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button disabled={working} onClick={() => act(i, () => restoreTrash(i.type, i.id), 'Restored')} className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-500/20 disabled:opacity-50">
                    {working ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />} Restore
                  </button>
                  <button disabled={working} onClick={() => forever(i)} className="flex items-center gap-1.5 rounded-full bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-500 transition hover:bg-red-500/20 disabled:opacity-50"><Trash2 size={13} /> Delete forever</button>
                </div>
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}
