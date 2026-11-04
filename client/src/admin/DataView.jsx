import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Search, Loader2, Save, Rocket } from 'lucide-react';
import useStore from '../context/store';
import { TYPES } from './config';
import LaunchCommittee from './LaunchCommittee';
import { sessionRank } from '../lib/sessions';
import { Panel, PageTitle, Drawer, FormField, inputCls, askConfirm, toastTrashed } from './ui';

export default function DataView({ type }) {
  const cfg = TYPES[type];
  const store = useStore.getState();
  const items = useStore((s) => s[type]) || [];
  const [q, setQ] = useState('');
  const [drawer, setDrawer] = useState(null);
  const [params, setParams] = useSearchParams();
  const [launching, setLaunching] = useState(false);
  const sessions = useStore((s) => s.sessions);
  const fields = useMemo(() => cfg.fields.map((f) => (f.dynamic === 'sessions' ? { ...f, options: sessions.map((x) => x.label).sort((a, b) => sessionRank(b) - sessionRank(a)) } : f)), [cfg, sessions]);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { useStore.getState().fetchList(type).catch(() => {}); if (type === 'members') useStore.getState().fetchSessions().catch(() => {}); setQ(''); }, [type]);

  const rows = useMemo(() => items.filter((i) => !q || JSON.stringify(i).toLowerCase().includes(q.toLowerCase())), [items, q]);

  const today = new Date().toISOString().slice(0, 10);
  const openAdd = () => { setForm(cfg.fields.some((f) => f.key === 'date') ? { date: today } : {}); setDrawer({ mode: 'add' }); };

  // dashboard shortcuts (…/notices?new=1) open the form straight away
  useEffect(() => {
    if (params.get('new') === '1') { openAdd(); setParams({}, { replace: true }); }
  }, [params, type]);
  const openEdit = (item) => { setForm({ ...item }); setDrawer({ mode: 'edit', id: item.id }); };

  const save = async () => {
    const missing = fields.find((f) => f.required && !form[f.key]);
    if (missing) return toast.error(`${missing.label} is required`);
    setSaving(true);
    try {
      const body = Object.fromEntries(fields.map((f) => [f.key, form[f.key] ?? (f.type === 'checkbox' ? false : '')]));
      if (drawer.mode === 'add') await store.addItem(type, body); else await store.updateItem(type, drawer.id, body);
      toast.success(drawer.mode === 'add' ? 'Added' : 'Saved');
      setDrawer(null);
    } catch (e) { toast.error(e.response?.data?.error || e.message); }
    setSaving(false);
  };

  const remove = async (item) => {
    const name = item.title || item.name || cfg.name.toLowerCase();
    const ok = await askConfirm({ title: `Delete this ${cfg.name.toLowerCase()}?`, message: `“${String(name).slice(0, 60)}” will be moved to the Trash. You can restore it for 30 days.`, confirmText: 'Move to Trash', danger: true });
    if (!ok) return;
    try {
      await useStore.getState().deleteItem(type, item.id);
      toastTrashed(cfg.name, async () => { await useStore.getState().restoreTrash(type, item.id); });
    } catch (e) { toast.error(e.response?.data?.error || 'Could not delete'); }
  };

  return (
    <div>
      <PageTitle title={`${cfg.name}s`} sub={`${items.length} total`}>
        <div className="relative"><Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className={`${inputCls} !w-56 !rounded-full !py-2 pl-9`} /></div>
        {type === 'members' && <button onClick={() => setLaunching(true)} className="flex items-center gap-2 rounded-full border border-accent px-5 py-2.5 text-xs font-semibold text-accent transition hover:bg-accent hover:text-white"><Rocket size={14} /> Launch new committee</button>}
        <button onClick={openAdd} className="btn-primary !px-5 !py-2.5 text-xs"><Plus size={15} /> Add {cfg.name}</button>
      </PageTitle>

      <Panel className="overflow-hidden">
        {rows.length === 0 ? <p className="p-12 text-center text-sm text-muted">Nothing here yet.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b border-line bg-alt/60">
                {cfg.cols.map((c) => <th key={c} className="px-5 py-3.5 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted">{c.replace('_', ' ')}</th>)}
                <th className="px-5 py-3.5" />
              </tr></thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.id} className="border-b border-line/60 transition last:border-0 hover:bg-accent/5">
                    {cfg.cols.map((c, ci) => (
                      <td key={c} className={`max-w-xs truncate px-5 py-3.5 ${ci === 0 ? 'font-medium text-fg' : 'text-fg2'}`}>
                        {typeof item[c] === 'boolean' ? (item[c] ? <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs text-emerald-500">Yes</span> : '—') : (/^\d{4}-\d{2}-\d{2}T/.test(String(item[c])) ? String(item[c]).slice(0, 10) : String(item[c] ?? '—').slice(0, 80))}
                      </td>
                    ))}
                    <td className="px-5 py-3.5"><div className="flex justify-end gap-1.5">
                      <button onClick={() => openEdit(item)} aria-label="Edit" className="grid size-8 place-items-center rounded-lg text-fg2 hover:bg-tech/15 hover:text-tech"><Pencil size={14} /></button>
                      <button onClick={() => remove(item)} aria-label="Delete" className="grid size-8 place-items-center rounded-lg text-fg2 hover:bg-red-500/15 hover:text-red-500"><Trash2 size={14} /></button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {type === 'members' && <LaunchCommittee open={launching} onClose={() => setLaunching(false)} />}
      <Drawer open={!!drawer} title={`${drawer?.mode === 'add' ? 'Add' : 'Edit'} ${cfg.name}`} onClose={() => setDrawer(null)}
        footer={<><button onClick={() => setDrawer(null)} className="btn-outline !px-5 !py-2.5 text-xs">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary !px-5 !py-2.5 text-xs disabled:opacity-60">{saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save</button></>}>
        {fields.map((f) => <FormField key={f.key} field={f} value={form[f.key]} onChange={(k, v) => setForm((p) => ({ ...p, [k]: v }))} />)}
      </Drawer>
    </div>
  );
}
