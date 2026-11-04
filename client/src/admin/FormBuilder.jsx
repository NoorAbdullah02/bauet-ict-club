import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowDown, ArrowUp, Copy, Eye, Loader2, Pencil, Plus, Save, Trash2, RotateCcw } from 'lucide-react';
import useStore, { api } from '../context/store';
import Select from '../components/Select';
import DynamicForm from '../components/DynamicForm';
import { Drawer, inputCls, askConfirm } from './ui';
import { DEFAULT_FIELDS, PRESETS, TYPE_LABELS, PAY_METHODS, hasOptions, newField, uid } from '../lib/forms';
import { cn } from '../lib/cn';

const clone = (x) => JSON.parse(JSON.stringify(x));

/** Build the registration form of one event, like a Google Form: add questions, choose their type, mark them required, preview, save. */
export default function FormBuilder({ event, onClose, kind = 'event', onSaved }) {
  const updateItem = useStore((s) => s.updateItem);
  const [form, setForm] = useState(null);
  const [preview, setPreview] = useState(false);
  const [sample, setSample] = useState({});
  const [saving, setSaving] = useState(false);
  const [cap, setCap] = useState(0);
  const [open, setOpen] = useState(true);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');

  useEffect(() => {
    if (!event) return;
    const f = event.reg_form?.fields?.length ? clone(event.reg_form) : { title: '', intro: '', confirmation: '', unique: kind === 'form' ? '' : 'email', fields: clone(kind === 'form' ? [{ id: 'name', key: 'name', type: 'short', label: 'Your name', required: true }] : DEFAULT_FIELDS) };
    setForm(f); setPreview(false); setSample({}); setCap(Number(event.capacity) || 0); setOpen(kind === 'form' ? event.is_open !== false : event.reg_open !== false); setName(event.title || ''); setSlug(event.slug || '');
  }, [event?.id]);

  const fields = form?.fields || [];
  const setFields = (fn) => setForm((f) => ({ ...f, fields: fn(f.fields) }));
  const patch = (id, p) => setFields((l) => l.map((q) => (q.id === id ? { ...q, ...p } : q)));
  const move = (i, d) => setFields((l) => { const n = [...l]; const j = i + d; if (j < 0 || j >= n.length) return l; [n[i], n[j]] = [n[j], n[i]]; return n; });
  const emailFields = useMemo(() => fields.filter((q) => q.type === 'email'), [fields]);

  const save = async () => {
    const bad = fields.findIndex((q) => !q.label.trim());
    if (bad >= 0) return toast.error(`Question ${bad + 1} needs a title`);
    const few = fields.find((q) => hasOptions(q.type) && (q.options || []).filter((o) => o.trim()).length < 2);
    if (few) return toast.error(`“${few.label}” needs at least two choices`);
    setSaving(true);
    try {
      const pay = form.payment?.enabled ? { ...form.payment, amount: Number(form.payment.amount) } : undefined;
      const body = { ...form, payment: pay, fields: fields.map((q) => ({ ...q, options: hasOptions(q.type) ? q.options.map((o) => o.trim()).filter(Boolean) : undefined })) };
      if (kind === 'form') { const r = await api.put(`/forms/${event.id}`, { title: name.trim() || event.title, slug: slug.trim() || undefined, reg_form: body, capacity: Number(cap) || 0, is_open: open }); onSaved?.(r.data); }
      else await updateItem('events', event.id, { reg_form: body, capacity: Number(cap) || 0, reg_open: open });
      toast.success(kind === 'form' ? 'Form saved' : 'Registration form saved');
      onClose();
    } catch (e) { toast.error(e.response?.data?.error || 'Could not save the form'); }
    setSaving(false);
  };

  const reset = async () => {
    if (!(await askConfirm({ title: 'Use the standard form again?', message: 'Your custom questions for this event are removed. Answers people already gave are kept.', confirmText: 'Use standard form', danger: true }))) return;
    setSaving(true);
    try { await updateItem('events', event.id, { reg_form: null }); toast.success('Standard form restored'); onClose(); } catch { toast.error('Could not reset'); }
    setSaving(false);
  };

  return (
    <Drawer open={!!event} title={kind === 'form' ? 'Edit form' : 'Registration form'} onClose={onClose}
      footer={<>
        {kind === 'event' && <button onClick={reset} disabled={saving} className="mr-auto flex items-center gap-1.5 text-xs font-semibold text-fg2 hover:text-red-500"><RotateCcw size={13} /> Standard form</button>}
        <button onClick={() => setPreview((p) => !p)} className="btn-outline !px-4 !py-2.5 text-xs">{preview ? <Pencil size={14} /> : <Eye size={14} />} {preview ? 'Edit' : 'Preview'}</button>
        <button onClick={save} disabled={saving} className="btn-primary !px-5 !py-2.5 text-xs disabled:opacity-60">{saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save form</button>
      </>}>
      {!form ? null : preview ? (
        <div>
          <p className="mb-4 rounded-xl bg-alt p-3 text-xs text-fg2">This is how people see the form. Nothing you type here is saved.</p>
          {form.title && <h3 className="mb-1 text-lg text-fg">{form.title}</h3>}
          {form.intro && <p className="mb-4 whitespace-pre-line text-sm text-fg2">{form.intro}</p>}
          <DynamicForm fields={fields.map((q) => (hasOptions(q.type) ? { ...q, options: q.options.filter(Boolean) } : q))} values={sample} onChange={(id, v) => setSample((s) => ({ ...s, [id]: v }))} />
        </div>
      ) : (
        <div className="space-y-4">
          {kind === 'form' && (
            <div className="rounded-2xl border border-line p-4">
              <label className="block"><span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted">Form name</span><input className={inputCls} value={name} maxLength={200} onChange={(e) => setName(e.target.value)} /></label>
              <label className="mt-3 block"><span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted">Link name</span><div className="flex items-center gap-1 text-xs text-fg2"><span className="shrink-0">{window.location.origin}/f/</span><input className={cn(inputCls, '!py-2')} value={slug} maxLength={80} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} /></div></label>
            </div>
          )}
          <div className="rounded-2xl border border-line p-4">
            <input className={cn(inputCls, '!text-base font-semibold')} placeholder="Form title (optional)" value={form.title} maxLength={120} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <textarea className={cn(inputCls, 'mt-2 min-h-16 resize-y')} placeholder="Short note shown above the questions (optional)" value={form.intro} maxLength={1000} onChange={(e) => setForm({ ...form, intro: e.target.value })} />
          </div>

          {fields.map((q, i) => (
            <div key={q.id} className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex flex-wrap items-start gap-2">
                <input className={cn(inputCls, 'min-w-0 flex-1')} placeholder={`Question ${i + 1}`} value={q.label} maxLength={160} onChange={(e) => patch(q.id, { label: e.target.value })} />
                <Select className={cn(inputCls, '!w-44')} value={q.type} onChange={(e) => patch(q.id, { type: e.target.value, ...(hasOptions(e.target.value) && !q.options?.length ? { options: ['Option 1', 'Option 2'] } : {}) })}>
                  {Object.entries(TYPE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </Select>
              </div>
              <input className={cn(inputCls, 'mt-2 !py-2 text-xs')} placeholder="Help text under the question (optional)" value={q.help || ''} maxLength={200} onChange={(e) => patch(q.id, { help: e.target.value })} />
              {hasOptions(q.type) && (
                <label className="mt-2 block">
                  <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted">Choices, one per line</span>
                  <textarea className={cn(inputCls, 'min-h-24 resize-y text-sm')} value={(q.options || []).join('\n')} onChange={(e) => patch(q.id, { options: e.target.value.split('\n') })} />
                </label>
              )}
              {q.type === 'scale' && (
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <Select className={inputCls} value={q.scale?.max || 5} onChange={(e) => patch(q.id, { scale: { ...q.scale, max: Number(e.target.value) } })}><option value={5}>1 to 5</option><option value={10}>1 to 10</option></Select>
                  <input className={cn(inputCls, '!py-2 text-xs')} placeholder="Label for 1" value={q.scale?.low || ''} onChange={(e) => patch(q.id, { scale: { ...q.scale, low: e.target.value } })} />
                  <input className={cn(inputCls, '!py-2 text-xs')} placeholder="Label for last" value={q.scale?.high || ''} onChange={(e) => patch(q.id, { scale: { ...q.scale, high: e.target.value } })} />
                </div>
              )}
              {(() => {
                const earlier = fields.slice(0, i).filter((x) => ['dropdown', 'radio', 'checkbox', 'yesno'].includes(x.type) && x.label);
                if (!earlier.length) return null;
                const src = earlier.find((x) => x.id === q.showIf?.field);
                const choices = src ? (src.type === 'yesno' ? ['Yes', 'No'] : (src.options || []).filter(Boolean)) : [];
                return (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-fg2">
                    <span>Show only if</span>
                    <Select className={cn(inputCls, '!w-auto !py-1.5 text-xs')} value={q.showIf?.field || ''} onChange={(e) => patch(q.id, { showIf: e.target.value ? { field: e.target.value, equals: '' } : undefined })}>
                      <option value="">always show</option>{earlier.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
                    </Select>
                    {src && <><span>is</span><Select className={cn(inputCls, '!w-auto !py-1.5 text-xs')} value={q.showIf?.equals || ''} onChange={(e) => patch(q.id, { showIf: { field: src.id, equals: e.target.value } })}><option value="">choose…</option>{choices.map((c) => <option key={c} value={c}>{c}</option>)}</Select></>}
                  </div>
                );
              })()}
              <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-line pt-3">
                {q.type !== 'section' && <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-fg2"><input type="checkbox" className="size-4 accent-[#1F4FD8]" checked={q.required} onChange={(e) => patch(q.id, { required: e.target.checked })} /> Required</label>}
                {hasOptions(q.type) && <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-fg2"><input type="checkbox" className="size-4 accent-[#1F4FD8]" checked={!!q.allowOther} onChange={(e) => patch(q.id, { allowOther: e.target.checked })} /> Add “Other” (people type their own answer)</label>}
                <div className="ml-auto flex items-center gap-1">
                  {[[ArrowUp, 'Move up', () => move(i, -1)], [ArrowDown, 'Move down', () => move(i, 1)], [Copy, 'Duplicate', () => setFields((l) => { const n = [...l]; n.splice(i + 1, 0, { ...clone(q), id: uid(), key: undefined }); return n; })]].map(([I, t, fn]) => (
                    <button key={t} type="button" onClick={fn} aria-label={t} title={t} className="grid size-8 place-items-center rounded-lg text-fg2 hover:bg-tech/10 hover:text-tech"><I size={14} /></button>
                  ))}
                  <button type="button" onClick={() => setFields((l) => l.filter((x) => x.id !== q.id))} aria-label="Delete question" title="Delete" className="grid size-8 place-items-center rounded-lg text-fg2 hover:bg-red-500/10 hover:text-red-500"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}

          <div className="rounded-2xl border border-dashed border-line p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-fg"><Plus size={15} className="text-accent" /> Add a question</div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(TYPE_LABELS).map(([k, l]) => <button key={k} type="button" onClick={() => setFields((x) => [...x, newField(k)])} className="rounded-full border border-line px-3 py-1.5 text-xs text-fg2 transition hover:border-accent hover:text-accent">{l}</button>)}
            </div>
            <div className="mt-3 font-mono text-[10px] uppercase tracking-wider text-muted">Ready-made</div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {PRESETS.filter((p) => !fields.some((q) => q.key === p.key)).map((p) => <button key={p.key} type="button" onClick={() => setFields((x) => [...x, { ...clone(p), id: p.key }])} className="rounded-full bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent transition hover:bg-accent/20">{p.label}</button>)}
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-line p-4 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block"><span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted">Registration limit (0 = no limit)</span>
                <input type="number" min="0" className={inputCls} value={cap} onChange={(e) => setCap(e.target.value)} /></label>
              <label className="block"><span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted">Closes on (optional)</span>
                <input type="datetime-local" className={inputCls} value={form.closes_at || ''} onChange={(e) => setForm({ ...form, closes_at: e.target.value })} /></label>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-fg2"><input type="checkbox" className="size-4 accent-[#1F4FD8]" checked={open} onChange={(e) => setOpen(e.target.checked)} /> Accepting registrations</label>
              <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-fg2"><input type="checkbox" className="size-4 accent-[#1F4FD8]" checked={!!form.notify_admin} onChange={(e) => setForm({ ...form, notify_admin: e.target.checked })} /> Email me for every new registration</label>
            </div>
          </div>

          <div className="rounded-2xl border border-line p-4 text-sm">
            <label className="flex cursor-pointer items-center gap-2 font-semibold text-fg"><input type="checkbox" className="size-4 accent-[#1F4FD8]" checked={!!form.payment?.enabled} onChange={(e) => setForm({ ...form, payment: { amount: 100, methods: ['bKash'], numbers: {}, kind: 'send_money', note: '', ...form.payment, enabled: e.target.checked } })} /> This event has a fee (bKash / Nagad / Rocket)</label>
            {form.payment?.enabled && (
              <div className="mt-3 space-y-3">
                <label className="block"><span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted">Amount (BDT)</span>
                  <input type="number" min="1" className={inputCls} value={form.payment.amount} onChange={(e) => setForm({ ...form, payment: { ...form.payment, amount: e.target.value } })} /></label>
                {PAY_METHODS.map((m) => {
                  const on = form.payment.methods.includes(m);
                  return (
                    <div key={m} className="flex flex-wrap items-center gap-2">
                      <label className="flex w-28 cursor-pointer items-center gap-2 text-xs font-medium text-fg2"><input type="checkbox" className="size-4 accent-[#1F4FD8]" checked={on} onChange={(e) => setForm({ ...form, payment: { ...form.payment, methods: e.target.checked ? [...form.payment.methods, m] : form.payment.methods.filter((x) => x !== m) } })} /> {m}</label>
                      {on && <input type="tel" className={cn(inputCls, 'min-w-0 flex-1 !py-2')} placeholder={`${m} number people send money to`} value={form.payment.numbers?.[m] || ''} onChange={(e) => setForm({ ...form, payment: { ...form.payment, numbers: { ...form.payment.numbers, [m]: e.target.value } } })} />}
                    </div>
                  );
                })}
                <Select className={inputCls} value={form.payment.kind} onChange={(e) => setForm({ ...form, payment: { ...form.payment, kind: e.target.value } })}><option value="send_money">People use “Send Money”</option><option value="payment">People use “Payment”</option></Select>
                <textarea className={cn(inputCls, 'min-h-16 resize-y')} placeholder="Note shown with the payment details (for example: write your student ID as the reference)" value={form.payment.note || ''} maxLength={300} onChange={(e) => setForm({ ...form, payment: { ...form.payment, note: e.target.value } })} />
                <p className="text-xs text-muted">People enter the transaction ID and the number they paid from. You verify each payment in the registrations list; they get an email when you do.</p>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-line p-4 text-sm">
            <label className="block"><span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted">One answer per person for</span>
              <Select className={inputCls} value={form.unique || ''} onChange={(e) => setForm({ ...form, unique: e.target.value })}>
                <option value="">No duplicate check</option>
                {fields.filter((q) => ['email', 'short', 'phone', 'number'].includes(q.type) && q.label).map((q) => <option key={q.id} value={q.id}>{q.label}</option>)}
              </Select></label>
            <label className="mt-3 block"><span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted">Extra note in the confirmation email (optional)</span>
              <textarea className={cn(inputCls, 'min-h-16 resize-y')} placeholder="Room 301, bring your laptop and student ID. Doors open at 2:30 PM." value={form.email_note || ''} maxLength={600} onChange={(e) => setForm({ ...form, email_note: e.target.value })} /></label>
            <label className="mt-3 block"><span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted">Message after they submit (optional)</span>
              <textarea className={cn(inputCls, 'min-h-16 resize-y')} placeholder="Thank you! Please bring your student ID." value={form.confirmation} maxLength={500} onChange={(e) => setForm({ ...form, confirmation: e.target.value })} /></label>
            <p className="mt-3 text-xs text-muted">{emailFields.length ? 'A confirmation email goes to the first Email question.' : 'Add an Email question if you want people to get a confirmation email.'}</p>
          </div>
        </div>
      )}
    </Drawer>
  );
}
