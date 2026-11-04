import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Save, Loader2, FlaskConical, Trash2 } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import useStore from '../context/store';
import { Panel, PageTitle, inputCls, askConfirm } from './ui';
import ServiceStatus from './ServiceStatus';

const FIELDS = [['heroTitle', 'Hero title', 'text'], ['heroSub', 'Hero subtitle', 'text'], ['aboutText', 'About text', 'textarea'], ['mission', 'Mission', 'textarea'], ['vision', 'Vision', 'textarea'], ['goal', 'Goal', 'textarea']];

export default function SettingsView() {
  const { settings, updateSettings } = useStore(useShallow((s) => ({ settings: s.settings, updateSettings: s.updateSettings })));
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
        <Panel className="self-start p-6 xl:col-start-2">
          <div className="flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-tech/12 text-tech"><FlaskConical size={22} /></span>
            <div className="min-w-0">
              <h3 className="text-xl text-fg">Demo data</h3>
              <p className="mt-1 text-sm leading-6 text-fg2">Fill the site with a sample <b>Winter 2026</b> committee, department ambassadors, events, notices, awards and a few pending applications — so you can see how everything looks. Remove it in one click.</p>
              <p className="mt-2 font-mono text-[11px] uppercase tracking-widest text-muted">{demo === null ? 'checking…' : demo > 0 ? `${demo} demo items loaded` : 'no demo data loaded'}</p>
              <button onClick={toggleDemo} disabled={demoBusy || demo === null} className={`mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold transition disabled:opacity-60 ${demo > 0 ? 'border border-red-500/40 text-red-500 hover:bg-red-500/10' : 'btn-primary'}`}>
                {demoBusy ? <Loader2 size={14} className="animate-spin" /> : demo > 0 ? <Trash2 size={14} /> : <FlaskConical size={14} />}{demo > 0 ? 'Remove demo data' : 'Load demo data'}
              </button>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
