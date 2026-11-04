import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Save, Loader2 } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import useStore from '../context/store';
import { Panel, PageTitle, inputCls } from './ui';

const FIELDS = [['heroTitle', 'Hero title', 'text'], ['heroSub', 'Hero subtitle', 'text'], ['aboutText', 'About text', 'textarea'], ['mission', 'Mission', 'textarea'], ['vision', 'Vision', 'textarea'], ['goal', 'Goal', 'textarea']];

export default function SettingsView() {
  const { settings, updateSettings } = useStore(useShallow((s) => ({ settings: s.settings, updateSettings: s.updateSettings })));
  const [f, setF] = useState(null);
  const [busy, setBusy] = useState(false);
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
        <Panel className="space-y-4 self-start p-6">
          <h3 className="text-xl text-fg">Contact & social</h3>
          {[['fb', 'Facebook URL'], ['email', 'Email'], ['phone', 'Phone']].map(([k, label]) => (
            <label key={k} className="block"><span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-fg2">{label}</span>
              <input className={inputCls} value={f.socialLinks?.[k] || ''} onChange={(e) => setF({ ...f, socialLinks: { ...f.socialLinks, [k]: e.target.value } })} /></label>
          ))}
        </Panel>
      </div>
    </div>
  );
}
