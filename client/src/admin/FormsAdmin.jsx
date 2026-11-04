import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ClipboardList, Copy, ExternalLink, Loader2, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { api } from '../context/store';
import { Panel, PageTitle, Drawer, inputCls, askConfirm } from './ui';
import FormBuilder from './FormBuilder';
import EventRegistrations from './EventRegistrations';
import { copyText } from '../lib/share';
import { formalDate } from '../lib/format';
import { cn } from '../lib/cn';

/** Admin → Forms: build any form (survey, feedback, recruitment, paid sign-up), share its link, read the responses. */
export default function FormsAdmin() {
  const [forms, setForms] = useState(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState(null);
  const [view, setView] = useState(null);

  const load = () => api.get('/forms').then((r) => setForms(r.data)).catch(() => { setForms([]); toast.error('Could not load the forms'); });
  useEffect(() => { load(); }, []);

  const create = async () => {
    setBusy(true);
    try { const { data } = await api.post('/forms', { title: name }); setForms((f) => [data, ...(f || [])]); setCreating(false); setName(''); setEdit(data); }
    catch (e) { toast.error(e.response?.data?.error || 'Could not create the form'); }
    setBusy(false);
  };
  const remove = async (f) => {
    if (!(await askConfirm({ title: `Delete “${f.title}”?`, message: `Its link stops working. ${f.responses} ${f.responses === 1 ? 'response is' : 'responses are'} kept for 30 days in case you need them back.`, confirmText: 'Delete form', danger: true }))) return;
    try { await api.delete(`/forms/${f.id}`); setForms((l) => l.filter((x) => x.id !== f.id)); toast.success('Form deleted'); } catch { toast.error('Could not delete'); }
  };
  const link = (f) => `${window.location.origin}/f/${f.slug}`;

  return (
    <div>
      <PageTitle title="Forms" sub="Build a form like Google Forms: questions, payments, a link to share and a list of responses.">
        <button onClick={() => setCreating(true)} className="btn-primary !px-5 !py-2.5 text-xs"><Plus size={15} /> New form</button>
      </PageTitle>

      {forms === null ? <Loader2 className="animate-spin text-muted" /> : forms.length === 0 ? (
        <Panel className="grid place-items-center gap-3 p-12 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-accent/10 text-accent"><ClipboardList size={26} /></span>
          <h3 className="text-xl text-fg">No forms yet</h3>
          <p className="max-w-sm text-sm text-fg2">Make a form for a survey, feedback, a recruitment drive or a paid sign-up, then share its link.</p>
          <button onClick={() => setCreating(true)} className="btn-primary mt-1 !px-5 !py-2.5 text-xs"><Plus size={15} /> Create your first form</button>
        </Panel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {forms.map((f) => {
            const closed = f.is_open === false;
            return (
              <Panel key={f.id} className="flex flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="min-w-0 break-words font-display text-lg leading-tight text-fg">{f.title}</h3>
                  <span className={cn('shrink-0 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider', closed ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/15 text-emerald-600')}>{closed ? 'Closed' : 'Open'}</span>
                </div>
                <div className="mt-1 text-xs text-muted">Created {formalDate(f.created_at)}</div>
                <button onClick={() => setView(f)} className="mt-4 flex items-center gap-2 text-left text-sm text-fg2 transition hover:text-tech"><Users size={15} className="text-accent" /> <b className="text-fg">{f.responses}</b> {f.responses === 1 ? 'response' : 'responses'}{f.capacity ? ` of ${f.capacity}` : ''}</button>
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-line bg-alt/50 px-3 py-2 text-xs"><span className="min-w-0 flex-1 truncate font-mono text-fg2">/f/{f.slug}</span>
                  <button onClick={async () => toast[(await copyText(link(f))) ? 'success' : 'error']('Link copied')} aria-label="Copy link" className="text-tech"><Copy size={14} /></button>
                  <a href={link(f)} target="_blank" rel="noreferrer" aria-label="Open the form" className="text-tech"><ExternalLink size={14} /></a></div>
                <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                  <button onClick={() => setEdit(f)} className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-xs font-semibold text-white"><Pencil size={13} /> Edit</button>
                  <button onClick={() => setView(f)} className="flex items-center gap-1.5 rounded-lg border border-line px-3.5 py-2 text-xs font-semibold text-fg2 hover:border-tech hover:text-tech"><Users size={13} /> Responses</button>
                  <button onClick={() => remove(f)} aria-label="Delete form" className="ml-auto grid size-9 place-items-center rounded-lg text-fg2 hover:bg-red-500/10 hover:text-red-500"><Trash2 size={15} /></button>
                </div>
              </Panel>
            );
          })}
        </div>
      )}

      <Drawer open={creating} title="New form" onClose={() => setCreating(false)}
        footer={<><button onClick={() => setCreating(false)} className="btn-outline !px-5 !py-2.5 text-xs">Cancel</button><button onClick={create} disabled={busy || name.trim().length < 2} className="btn-primary !px-5 !py-2.5 text-xs disabled:opacity-60">{busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Create and edit</button></>}>
        <label className="block"><span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-fg2">Form name</span>
          <input autoFocus className={inputCls} value={name} maxLength={200} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && name.trim().length >= 2 && create()} placeholder="Python workshop feedback" /></label>
        <p className="mt-3 text-xs text-muted">You choose the questions next. The people-facing link is made from this name and you can change it later.</p>
      </Drawer>

      <FormBuilder kind="form" event={edit} onClose={() => setEdit(null)} onSaved={(f) => setForms((l) => (l || []).map((x) => (x.id === f.id ? { ...x, ...f } : x)))} />
      <EventRegistrations kind="form" event={view} onClose={() => { setView(null); load(); }} />
    </div>
  );
}
