import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { BarChart3, ClipboardList, Copy, CopyPlus, ExternalLink, FilePlus2, HandHeart, HelpCircle, Loader2, Pencil, Plus, Search, Star, Ticket, Trash2, Trophy, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../context/store';
import { Panel, Drawer, inputCls, askConfirm } from './ui';
import { copyText, shortLink } from '../lib/share';
import { formalDate } from '../lib/format';
import { TEMPLATES } from '../lib/formTemplates';
import { cn } from '../lib/cn';

const ICONS = { ticket: Ticket, star: Star, users: Users, hand: HandHeart, trophy: Trophy, poll: BarChart3, help: HelpCircle };

/** Admin → Forms: start from a ready-made form or a blank one, share the link, read the responses, copy or delete your forms. */
export default function FormsAdmin() {
  const [forms, setForms] = useState(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState('');
  const [q, setQ] = useState('');
  const navigate = useNavigate();

  const load = () => api.get('/forms').then((r) => setForms(r.data)).catch(() => { setForms([]); toast.error('Could not load the forms'); });
  useEffect(() => { load(); }, []);

  const make = async (title, reg_form, key) => {
    setBusy(key);
    try { const { data } = await api.post('/forms', { title, ...(reg_form ? { reg_form: { ...reg_form, title } } : {}) }); setForms((f) => [data, ...(f || [])]); setCreating(false); setName(''); navigate(`/admin/forms/${data.id}`); }
    catch (e) { toast.error(e.response?.data?.error || 'Could not create the form'); }
    setBusy('');
  };
  const copy = async (f) => {
    setBusy(`copy${f.id}`);
    try { const { data } = await api.post(`/forms/${f.id}/duplicate`); setForms((l) => [data, ...l]); toast.success('Copy made'); }
    catch (e) { toast.error(e.response?.data?.error || 'Could not copy'); }
    setBusy('');
  };
  const remove = async (f) => {
    if (!(await askConfirm({ title: `Delete “${f.title}”?`, message: `Its link stops working. ${f.responses} ${f.responses === 1 ? 'response is' : 'responses are'} kept in the Trash for 20 days in case you need them back.`, confirmText: 'Delete form', danger: true }))) return;
    try { await api.delete(`/forms/${f.id}`); setForms((l) => l.filter((x) => x.id !== f.id)); toast.success('Moved to the Trash. You can restore it for 20 days.'); } catch { toast.error('Could not delete'); }
  };
  const link = (f) => `${window.location.origin}/f/${f.slug}`;
  const shown = useMemo(() => (forms || []).filter((f) => !q || f.title.toLowerCase().includes(q.toLowerCase())), [forms, q]);
  const total = (forms || []).reduce((n, f) => n + f.responses, 0);

  return (
    <div>
      <div className="relative mb-8 overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-tech/12 via-surface to-accent/12 p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 size-48 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">Forms</div>
            <h1 className="mt-1 text-3xl text-fg sm:text-4xl">Build a form in minutes</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-fg2">Questions, pages, rules, payments and a link or QR code to share. Start from a ready-made form or from scratch.</p>
            {forms && <div className="mt-4 flex flex-wrap gap-2 text-xs"><span className="rounded-full border border-line bg-surface/80 px-3 py-1.5 font-semibold text-fg"><b>{forms.length}</b> {forms.length === 1 ? 'form' : 'forms'}</span><span className="rounded-full border border-line bg-surface/80 px-3 py-1.5 font-semibold text-fg"><b>{total}</b> {total === 1 ? 'response' : 'responses'}</span></div>}
          </div>
          <button onClick={() => setCreating(true)} className="btn-primary !px-6 !py-3 text-sm"><Plus size={16} /> Blank form</button>
        </div>
      </div>

      <section aria-labelledby="tpl" className="mb-10">
        <h2 id="tpl" className="mb-3 text-lg text-fg">Start with a ready-made form</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {TEMPLATES.map((t) => {
            const I = ICONS[t.icon] || ClipboardList;
            return (
              <button key={t.key} onClick={() => make(t.name, t.form, t.key)} disabled={!!busy} className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface p-4 text-left transition hover:-translate-y-1 hover:border-transparent hover:shadow-xl disabled:opacity-60">
                <span className="absolute inset-x-0 top-0 h-1" style={{ background: t.color }} />
                <span className="grid size-10 place-items-center rounded-xl text-white transition group-hover:scale-110" style={{ background: t.color }}>{busy === t.key ? <Loader2 size={18} className="animate-spin" /> : <I size={18} />}</span>
                <span className="mt-3 text-sm font-semibold text-fg">{t.name}</span>
                <span className="mt-1 text-xs leading-5 text-fg2">{t.desc}</span>
                <span className="mt-3 text-[11px] font-semibold text-tech opacity-0 transition group-hover:opacity-100">{t.form.fields.filter((x) => x.type !== 'section').length} questions · Use this</span>
              </button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="mine">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 id="mine" className="text-lg text-fg">Your forms</h2>
          {forms?.length > 0 && <div className="relative w-full max-w-64"><Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search forms" aria-label="Search forms" className={`${inputCls} !pl-9 !py-2 text-xs`} /></div>}
        </div>
        {forms === null ? <Loader2 className="animate-spin text-muted" /> : forms.length === 0 ? (
          <Panel className="grid place-items-center gap-3 p-10 text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-accent/10 text-accent"><FilePlus2 size={26} /></span>
            <h3 className="text-xl text-fg">No forms yet</h3>
            <p className="max-w-sm text-sm text-fg2">Pick a ready-made form above, or start a blank one.</p>
          </Panel>
        ) : shown.length === 0 ? <p className="py-6 text-center text-sm text-muted">No form matches “{q}”.</p> : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {shown.map((f) => {
              const closed = f.is_open === false;
              const theme = f.reg_form?.theme || '';
              return (
                <Panel key={f.id} className="group relative flex flex-col overflow-hidden p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
                  <span className="absolute inset-x-0 top-0 h-1" style={{ background: theme || 'linear-gradient(90deg,var(--accent),var(--tech))' }} />
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="min-w-0 break-words font-display text-lg leading-tight text-fg">{f.title}</h3>
                    <span className={cn('shrink-0 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider', closed ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/15 text-emerald-600')}>{closed ? 'Not published' : 'Published'}</span>
                  </div>
                  <div className="mt-1 text-xs text-muted">Created {formalDate(f.created_at)}</div>
                  <button onClick={() => navigate(`/admin/forms/${f.id}?tab=responses`)} className="mt-4 flex items-center gap-2 text-left text-sm text-fg2 transition hover:text-tech"><Users size={15} className="text-accent" /> <b className="text-fg">{f.responses}</b> {f.responses === 1 ? 'response' : 'responses'}{f.capacity ? ` of ${f.capacity}` : ''}</button>
                  <div className="mt-3 flex items-center gap-2 rounded-xl border border-line bg-alt/50 px-3 py-2 text-xs"><span className="min-w-0 flex-1 truncate font-mono text-fg2">/f/{f.slug}</span>
                    <button onClick={async () => toast[(await copyText(await shortLink(`/f/${f.slug}`))) ? 'success' : 'error']('Short link copied')} aria-label="Copy link" className="text-tech"><Copy size={14} /></button>
                    <a href={link(f)} target="_blank" rel="noreferrer" aria-label="Open the form" className="text-tech"><ExternalLink size={14} /></a></div>
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
                    <button onClick={() => navigate(`/admin/forms/${f.id}`)} className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-xs font-semibold text-white"><Pencil size={13} /> Edit</button>
                    <button onClick={() => navigate(`/admin/forms/${f.id}?tab=responses`)} className="flex items-center gap-1.5 rounded-lg border border-line px-3.5 py-2 text-xs font-semibold text-fg2 hover:border-tech hover:text-tech"><Users size={13} /> Responses</button>
                    <button onClick={() => copy(f)} disabled={!!busy} aria-label="Make a copy" title="Make a copy" className="ml-auto grid size-9 place-items-center rounded-lg text-fg2 hover:bg-tech/10 hover:text-tech disabled:opacity-50">{busy === `copy${f.id}` ? <Loader2 size={15} className="animate-spin" /> : <CopyPlus size={15} />}</button>
                    <button onClick={() => remove(f)} aria-label="Delete form" title="Delete" className="grid size-9 place-items-center rounded-lg text-fg2 hover:bg-red-500/10 hover:text-red-500"><Trash2 size={15} /></button>
                  </div>
                </Panel>
              );
            })}
          </div>
        )}
      </section>

      <Drawer open={creating} title="Blank form" onClose={() => setCreating(false)}
        footer={<><button onClick={() => setCreating(false)} className="btn-outline !px-5 !py-2.5 text-xs">Cancel</button><button onClick={() => make(name)} disabled={!!busy || name.trim().length < 2} className="btn-primary !px-5 !py-2.5 text-xs disabled:opacity-60">{busy === 'blank' ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Create</button></>}>
        <label className="block"><span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-fg2">Form name</span>
          <input autoFocus className={inputCls} value={name} maxLength={200} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && name.trim().length >= 2 && make(name)} placeholder="Python workshop feedback" /></label>
        <p className="mt-3 text-xs text-muted">You choose the questions next. The link is made from this name and you can change it later.</p>
      </Drawer>
    </div>
  );
}
