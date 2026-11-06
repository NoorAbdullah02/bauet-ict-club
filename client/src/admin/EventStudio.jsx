import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Check, CalendarDays, ClipboardList, Loader2, Sparkles, MapPin, Clock, Users, Link2 } from 'lucide-react';
import useStore from '../context/store';
import { TYPES } from './config';
import { FormField } from './ui';
import FormEditor from './FormEditor';
import { formalDate, formalTime } from '../lib/format';
import { cn } from '../lib/cn';

const FIELDS = Object.fromEntries(TYPES.events.fields.map((f) => [f.key, f]));
const today = () => new Date().toISOString().slice(0, 10);

function Steps({ step, onDetails }) {
  const items = [[1, 'Event details', CalendarDays], [2, 'Registration form', ClipboardList]];
  return (
    <ol className="mx-auto mb-6 flex max-w-xl items-center gap-2" aria-label="Steps">
      {items.map(([n, label, I], i) => {
        const done = step > n, on = step === n;
        return (
          <li key={n} className="flex min-w-0 flex-1 items-center gap-2">
            <button type="button" disabled={!(done && n === 1)} onClick={onDetails} aria-current={on ? 'step' : undefined}
              className={cn('flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl border px-3.5 py-2.5 text-left transition', on ? 'border-tech bg-tech/10' : done ? 'border-emerald-500/40 bg-emerald-500/8' : 'border-line bg-surface')}>
              <span className={cn('grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold', on ? 'bg-tech text-white' : done ? 'bg-emerald-500 text-white' : 'bg-alt text-muted')}>{done ? <Check size={15} /> : <I size={15} />}</span>
              <span className="min-w-0"><span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Step {n}</span><span className="block truncate text-sm font-semibold text-fg">{label}</span></span>
            </button>
            {i === 0 && <span className={cn('h-px w-4 shrink-0 sm:w-8', step > 1 ? 'bg-emerald-500' : 'bg-line')} />}
          </li>
        );
      })}
    </ol>
  );
}

export default function EventStudio() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const addItem = useStore((s) => s.addItem);
  const eventId = params.get('id');
  const [form, setForm] = useState({ date: today(), reg_open: true, featured: false, capacity: '' });
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState('club'); // 'club' = the form built here, 'link' = Google Form or any other web link
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const upload = { area: 'events', scope: String(form.date || today()).slice(0, 4) };

  const create = async (withForm) => {
    if (!String(form.title || '').trim()) return toast.error('Give the event a title');
    if (!form.date) return toast.error('Choose the date');
    if (mode === 'link') {
      try { if (!['http:', 'https:'].includes(new URL(String(form.reg_url || '').trim()).protocol)) throw new Error(); } catch { return toast.error('Paste the full form link, starting with https://'); }
    }
    setSaving(true);
    try {
      const body = Object.fromEntries(TYPES.events.fields.map((f) => [f.key, form[f.key] ?? (f.type === 'checkbox' || f.type === 'hidden' ? false : '')]));
      if (mode === 'club') body.reg_url = ''; else body.capacity = 0;
      const made = await addItem('events', body);
      if (withForm) { toast.success('Event created: now build its registration form'); setParams({ id: String(made.id) }, { replace: true }); window.scrollTo({ top: 0 }); }
      else { toast.success('Event created'); navigate('/admin/events'); }
    } catch (e) { toast.error(e.response?.data?.error || e.message); }
    setSaving(false);
  };

  if (eventId) {
    return (
      <div>
        <Steps step={2} onDetails={() => navigate('/admin/events')} />
        <FormEditor kind="event" eventId={eventId} />
        <div className="mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/8 p-4">
          <p className="text-sm text-fg"><b>All done?</b> Changes save by themselves. The event is live on the website now.</p>
          <Link to="/admin/events" className="btn-primary !px-5 !py-2.5 text-xs"><Check size={14} /> Finish</Link>
        </div>
      </div>
    );
  }

  const own = mode === 'link';
  return (
    <div>
      <Steps step={1} />
      <div className="mb-5 flex items-center gap-3">
        <Link to="/admin/events" aria-label="Back to events" className="grid size-9 place-items-center rounded-full text-fg2 hover:bg-tech/10 hover:text-tech"><ArrowLeft size={18} /></Link>
        <div><h1 className="text-3xl text-fg">New event</h1><p className="text-sm text-fg2">Fill in the details, then build the registration form on the next step.</p></div>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-line bg-surface p-5 sm:p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg text-fg"><CalendarDays size={18} className="text-tech" /> About the event</h2>
            <div className="space-y-4">
              <FormField field={FIELDS.title} value={form.title} onChange={set} upload={upload} />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField field={FIELDS.date} value={form.date} onChange={set} upload={upload} />
                <FormField field={FIELDS.time} value={form.time} onChange={set} upload={upload} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField field={FIELDS.location} value={form.location} onChange={set} upload={upload} />
                <FormField field={FIELDS.category} value={form.category} onChange={set} upload={upload} />
              </div>
              <FormField field={FIELDS.description} value={form.description} onChange={set} upload={upload} />
            </div>
          </section>
          <section className="rounded-3xl border border-line bg-surface p-5 sm:p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg text-fg"><Users size={18} className="text-tech" /> How do people register?</h2>
            <div role="radiogroup" aria-label="Registration method" className="grid gap-3 sm:grid-cols-2">
              {[['club', ClipboardList, 'Club form', 'Build the form here. Seat limit, deadline, bKash payment, ticket with QR code, check-in and certificate all work.'],
                ['link', Link2, 'Google Form or other link', 'People click "Register now" and go straight to your own form. Responses stay in that tool.']].map(([k, I, t, d]) => (
                <button key={k} type="button" role="radio" aria-checked={mode === k} onClick={() => setMode(k)}
                  className={cn('flex gap-3 rounded-2xl border-2 p-4 text-left transition', mode === k ? 'border-tech bg-tech/8' : 'border-line hover:border-tech/50')}>
                  <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', mode === k ? 'bg-tech text-white' : 'bg-alt text-fg2')}><I size={18} /></span>
                  <span className="min-w-0"><span className="flex items-center gap-2 text-sm font-semibold text-fg">{t}{mode === k && <Check size={14} className="text-tech" />}</span><span className="mt-1 block text-xs leading-5 text-fg2">{d}</span></span>
                </button>
              ))}
            </div>
            <div className="mt-4 space-y-4">
              <FormField field={FIELDS.reg_open} value={form.reg_open} onChange={set} upload={upload} />
              <FormField field={FIELDS.publish_at} all={form} value={form.publish_at} onChange={set} upload={upload} />
              {mode === 'club'
                ? <FormField field={FIELDS.capacity} value={form.capacity} onChange={set} upload={upload} />
                : (
                  <label className="block"><span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-fg2">Form link *</span>
                    <input type="url" inputMode="url" placeholder="https://forms.gle/..." value={form.reg_url || ''} onChange={(e) => set('reg_url', e.target.value)} className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm text-fg outline-none focus:border-tech" />
                    <span className="mt-1.5 block text-xs text-muted">Paste the share link of your Google Form (or Microsoft Forms, Typeform ...). It opens in a new tab.</span></label>
                )}
            </div>
          </section>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          <section className="rounded-3xl border border-line bg-surface p-5 sm:p-6">
            <h2 className="mb-4 text-lg text-fg">Picture</h2>
            <div className="space-y-4">
              <FormField field={FIELDS.image_url} value={form.image_url} onChange={set} upload={upload} />
              <FormField field={FIELDS.featured} value={form.featured} onChange={set} upload={upload} />
            </div>
          </section>
          <section className="overflow-hidden rounded-3xl border border-line bg-surface">
            <div className="aspect-[16/8] bg-gradient-to-br from-tech/30 via-alt to-accent/30">{form.image_url && <img src={form.image_url} alt="" className="size-full object-cover" />}</div>
            <div className="p-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Preview{form.category ? ` · ${form.category}` : ''}</div>
              <div className="mt-1 font-display text-xl text-fg">{form.title || 'Event title'}</div>
              <div className="mt-2 space-y-1 text-xs text-fg2">
                {form.date && <div className="flex items-center gap-1.5"><CalendarDays size={13} /> {formalDate(form.date)}</div>}
                {form.time && <div className="flex items-center gap-1.5"><Clock size={13} /> {formalTime(form.time)}</div>}
                {form.location && <div className="flex items-center gap-1.5"><MapPin size={13} /> {form.location}</div>}
              </div>
            </div>
          </section>
        </aside>
      </div>

      <div className="sticky bottom-0 z-20 -mx-5 mt-8 flex flex-wrap items-center justify-end gap-3 border-t border-line bg-surface/95 px-5 py-3.5 backdrop-blur sm:-mx-8 sm:px-8">
        <Link to="/admin/events" className="btn-outline !px-5 !py-2.5 text-xs">Cancel</Link>
        {own
          ? <button onClick={() => create(false)} disabled={saving} className="btn-primary !px-6 !py-2.5 text-xs disabled:opacity-60">{saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Create event</button>
          : <>
            <button onClick={() => create(false)} disabled={saving} className="btn-outline !px-5 !py-2.5 text-xs disabled:opacity-60">Create without form</button>
            <button onClick={() => create(true)} disabled={saving} className="btn-primary !px-6 !py-2.5 text-xs disabled:opacity-60">{saving ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Create &amp; build form</button>
          </>}
      </div>
    </div>
  );
}
