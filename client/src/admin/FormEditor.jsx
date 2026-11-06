import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import {
  ArrowDown, ArrowLeft, ArrowUp, Check, CircleAlert, Copy, ExternalLink, Eye, GripVertical, Heading, Loader2, Plus, PlusCircle,
  Settings2, Trash2, Users, X, Wallet, FileText, Palette, Shuffle, SlidersHorizontal, ListChecks, Pencil, Link2, QrCode, Award,
} from 'lucide-react';
import useStore, { api } from '../context/store';
import Select from '../components/Select';
import DynamicForm from '../components/DynamicForm';
import PaymentBox from '../components/PaymentBox';
import { inputCls } from './ui';
import QrModal from '../components/QrModal';
import { ResponsesPanel } from './EventRegistrations';
import { DEFAULT_FIELDS, PRESETS, TYPE_LABELS, PAY_METHODS, hasOptions, newField, uid } from '../lib/forms';
import { copyText, eventLink } from '../lib/share';
import { useGateway } from '../lib/pay';
import { cn } from '../lib/cn';

const clone = (x) => JSON.parse(JSON.stringify(x));
const STATUS = {
  saved: ['All changes saved', 'text-emerald-600', Check], saving: ['Saving…', 'text-fg2', Loader2], dirty: ['Unsaved changes', 'text-fg2', Pencil],
  error: ['Could not save. Retrying…', 'text-red-500', CircleAlert], invalid: ['Not saved yet', 'text-amber-600', CircleAlert],
};

/** What is wrong with the form right now (the server refuses it too), or ''. */
function problemOf(doc) {
  const q = doc.fields.findIndex((x) => x.type !== 'section' ? !x.label.trim() : !x.label.trim());
  if (q >= 0) return `Question ${q + 1} needs a title`;
  const few = doc.fields.find((x) => hasOptions(x.type) && x.options.filter((o) => o.trim()).length < 2);
  if (few) return `“${few.label}” needs at least two choices`;
  if (doc.payment?.enabled) {
    if (!(Number(doc.payment.amount) > 0)) return 'Enter the fee amount';
    if (doc.payment.manual === false && !doc.payment.online) return 'Choose at least one way to pay';
    if (doc.payment.manual !== false && !doc.payment.methods?.length) return 'Choose a payment method';
    const miss = doc.payment.manual === false ? null : doc.payment.methods.find((m) => !/^(\+?88)?01[3-9]\d{8}$/.test(String(doc.payment.numbers?.[m] || '').replace(/[\s-]/g, '')));
    if (miss) return `Enter the ${miss} number people send money to`;
  }
  return '';
}

function Switch({ checked, onChange, label, disabled }) {
  return (
    <label className={cn('flex items-center gap-2.5 text-sm text-fg2', disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer')}>
      <button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)} className={cn('relative h-6 w-10 shrink-0 rounded-full transition', checked ? 'bg-accent' : 'bg-line')}>
        <span className={cn('absolute top-0.5 size-5 rounded-full bg-white shadow transition-all', checked ? 'left-[18px]' : 'left-0.5')} />
      </button>
      {label}
    </label>
  );
}

/** One choice per row with Add option / Add "Other", like Google Forms. */
function OptionsEditor({ q, patch }) {
  const opts = q.options || [];
  const set = (i, v) => patch({ options: opts.map((o, j) => (j === i ? v : o)) });
  const icon = q.type === 'radio' ? 'rounded-full' : q.type === 'checkbox' ? 'rounded-md' : 'hidden';
  return (
    <div className="mt-3 space-y-1.5">
      {opts.map((o, i) => (
        <div key={i} className="group flex items-center gap-2.5">
          {q.type === 'dropdown' ? <span className="w-5 text-center text-xs text-muted">{i + 1}.</span> : <span className={cn('size-4 shrink-0 border-2 border-line', icon)} />}
          <input className="min-w-0 flex-1 border-b border-transparent bg-transparent py-1.5 text-sm text-fg outline-none transition hover:border-line focus:border-tech" value={o} maxLength={100} placeholder={`Option ${i + 1}`} onChange={(e) => set(i, e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); patch({ options: [...opts.slice(0, i + 1), '', ...opts.slice(i + 1)] }); setTimeout(() => e.target.closest('div').nextElementSibling?.querySelector('input')?.focus(), 30); } }} />
          <button type="button" onClick={() => patch({ options: opts.filter((_, j) => j !== i) })} disabled={opts.length <= 2} aria-label="Remove option" className="grid size-7 place-items-center rounded-full text-muted opacity-0 transition hover:bg-red-500/10 hover:text-red-500 focus:opacity-100 group-hover:opacity-100 disabled:hidden"><X size={15} /></button>
        </div>
      ))}
      {q.allowOther && <div className="flex items-center gap-2.5 text-sm text-muted"><span className={cn('size-4 shrink-0 border-2 border-line', icon)} /> Other: <span className="flex-1 border-b border-dotted border-line">&nbsp;</span>
        <button type="button" onClick={() => patch({ allowOther: false })} aria-label="Remove Other" className="grid size-7 place-items-center rounded-full hover:bg-red-500/10 hover:text-red-500"><X size={15} /></button></div>}
      <div className="flex flex-wrap items-center gap-3 pt-1 text-sm">
        <button type="button" onClick={() => patch({ options: [...opts, ''] })} className="font-medium text-tech hover:underline">Add option</button>
        {!q.allowOther && <><span className="text-muted">or</span><button type="button" onClick={() => patch({ allowOther: true })} className="font-medium text-tech hover:underline">add “Other”</button></>}
      </div>
    </div>
  );
}

function QuestionCard({ q, i, total, fields, active, onActivate, patch, remove, duplicate, move, drag }) {
  const earlier = fields.slice(0, i).filter((x) => ['dropdown', 'radio', 'checkbox', 'yesno'].includes(x.type) && x.label);
  const src = earlier.find((x) => x.id === q.showIf?.field);
  const choices = src ? (src.type === 'yesno' ? ['Yes', 'No'] : (src.options || []).filter(Boolean)) : [];
  const isSection = q.type === 'section';
  return (
    <motion.div layout="position" transition={{ duration: 0.18 }} draggable={drag.id === q.id} onDragStart={() => drag.start(q.id)} onDragOver={(e) => { e.preventDefault(); drag.over(q.id); }} onDrop={() => drag.drop(q.id)} onDragEnd={drag.end}
      onClick={(e) => { e.stopPropagation(); onActivate(); }} className={cn('group relative cursor-pointer rounded-2xl border bg-surface p-5 shadow-sm transition sm:p-6', active ? 'border-transparent shadow-[var(--shadow-md)] ring-2 ring-tech/40' : 'border-line hover:shadow-md', drag.over_ === q.id && 'ring-2 ring-accent')}>
      {active && <span className="absolute inset-y-3 left-0 w-1.5 rounded-r-full bg-tech" />}
      <button type="button" onMouseDown={() => drag.arm(q.id)} onMouseUp={drag.end} onClick={(e) => e.stopPropagation()} aria-label="Drag to reorder" className="absolute left-1/2 top-1 hidden -translate-x-1/2 cursor-grab text-muted hover:text-fg sm:block"><GripVertical size={18} className="rotate-90" /></button>

      {!active ? (
        <div>
          {isSection && q.page && <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-accent/12 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-accent"><FileText size={11} /> New page</div>}
          <div className={cn('text-[15px]', isSection ? 'font-display text-lg text-fg' : 'font-medium text-fg')}>{q.label || <span className="text-muted">Untitled question</span>}{q.required && <span className="ml-1 text-red-500">*</span>}</div>
          {q.help && <div className="mt-0.5 text-xs text-muted">{q.help}</div>}
          {!isSection && <div className="pointer-events-none mt-3 opacity-70"><DynamicForm fields={[{ ...q, label: '', help: '', showIf: undefined, required: false }]} values={{}} onChange={() => {}} disabled hideLabels /></div>}
          {q.showIf && <div className="mt-2 text-xs text-accent">Shown only if “{fields.find((x) => x.id === q.showIf.field)?.label}” is {q.showIf.equals}</div>}
        </div>
      ) : (
        <div onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input autoFocus={!q.label} className={cn('min-w-0 flex-1 rounded-t-lg border-b-2 border-line bg-alt/70 px-3 py-3 text-[15px] text-fg outline-none transition focus:border-tech', isSection && 'font-display text-lg')} placeholder={isSection ? 'Heading' : `Question ${i + 1}`} value={q.label} maxLength={160} onChange={(e) => patch({ label: e.target.value })} />
            <Select className={cn(inputCls, 'sm:!w-52')} value={q.type} onChange={(e) => { const t = e.target.value; patch({ type: t, ...(hasOptions(t) && !(q.options || []).length ? { options: ['Option 1', 'Option 2'] } : {}), ...(t === 'scale' && !q.scale ? { scale: { max: 5, low: '', high: '' } } : {}) }); }}>
              {Object.entries(TYPE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </Select>
          </div>
          <input className="mt-2 w-full border-b border-transparent bg-transparent py-1.5 text-sm text-fg2 outline-none transition placeholder:text-muted hover:border-line focus:border-tech" placeholder={isSection ? 'Description (optional)' : 'Help text (optional)'} value={q.help || ''} maxLength={200} onChange={(e) => patch({ help: e.target.value })} />

          {hasOptions(q.type) && <OptionsEditor q={q} patch={patch} />}
          {q.type === 'scale' && (
            <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
              <Select className={inputCls} value={q.scale?.max || 5} onChange={(e) => patch({ scale: { ...q.scale, max: Number(e.target.value) } })}><option value={5}>1 to 5</option><option value={10}>1 to 10</option></Select>
              <input className={inputCls} placeholder="Label for 1" value={q.scale?.low || ''} maxLength={40} onChange={(e) => patch({ scale: { ...q.scale, low: e.target.value } })} />
              <input className={inputCls} placeholder="Label for the last" value={q.scale?.high || ''} maxLength={40} onChange={(e) => patch({ scale: { ...q.scale, high: e.target.value } })} />
            </div>
          )}
          {!hasOptions(q.type) && q.type !== 'scale' && !isSection && <div className="pointer-events-none mt-3 opacity-60"><DynamicForm fields={[{ ...q, label: '', help: '', showIf: undefined, required: false }]} values={{}} onChange={() => {}} disabled hideLabels /></div>}

          {(['short', 'long', 'number', 'checkbox'].includes(q.type) || hasOptions(q.type) || isSection) && (
            <div className="mt-4 space-y-3 rounded-xl bg-alt/60 px-3 py-3 text-xs text-fg2">
              <div className="flex items-center gap-2 font-semibold text-fg"><SlidersHorizontal size={14} className="text-accent" /> {isSection ? 'Page' : 'Rules'}</div>
              {isSection && <Switch checked={!!q.page} onChange={(v) => patch({ page: v })} label="Start a new page here (people get Next and Back buttons)" />}
              {['short', 'long'].includes(q.type) && (
                <div className="grid grid-cols-2 gap-2">
                  <label>Fewest characters<input type="number" min="0" className={cn(inputCls, 'mt-1 !py-1.5')} value={q.minLen ?? ''} onChange={(e) => patch({ minLen: e.target.value === '' ? undefined : Number(e.target.value) })} /></label>
                  <label>Most characters<input type="number" min="0" className={cn(inputCls, 'mt-1 !py-1.5')} value={q.maxLen ?? ''} onChange={(e) => patch({ maxLen: e.target.value === '' ? undefined : Number(e.target.value) })} /></label>
                </div>
              )}
              {q.type === 'short' && <PatternRule q={q} patch={patch} />}
              {q.type === 'number' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <label>Smallest<input type="number" className={cn(inputCls, 'mt-1 !py-1.5')} value={q.min ?? ''} onChange={(e) => patch({ min: e.target.value === '' ? undefined : Number(e.target.value) })} /></label>
                    <label>Biggest<input type="number" className={cn(inputCls, 'mt-1 !py-1.5')} value={q.max ?? ''} onChange={(e) => patch({ max: e.target.value === '' ? undefined : Number(e.target.value) })} /></label>
                  </div>
                  <Switch checked={!!q.whole} onChange={(v) => patch({ whole: v })} label="Whole numbers only" />
                </div>
              )}
              {q.type === 'checkbox' && (
                <div className="grid grid-cols-2 gap-2">
                  <label>Choose at least<input type="number" min="1" className={cn(inputCls, 'mt-1 !py-1.5')} value={q.minSel ?? ''} onChange={(e) => patch({ minSel: e.target.value === '' ? undefined : Number(e.target.value) })} /></label>
                  <label>Choose at most<input type="number" min="1" className={cn(inputCls, 'mt-1 !py-1.5')} value={q.maxSel ?? ''} onChange={(e) => patch({ maxSel: e.target.value === '' ? undefined : Number(e.target.value) })} /></label>
                </div>
              )}
              {hasOptions(q.type) && <Switch checked={!!q.shuffle} onChange={(v) => patch({ shuffle: v })} label="Shuffle the order of choices for each person" />}
            </div>
          )}

          {earlier.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-alt/60 px-3 py-2 text-xs text-fg2">
              <ListChecks size={14} className="text-accent" /> Show this only if
              <Select className={cn(inputCls, '!w-auto !py-1.5 text-xs')} value={q.showIf?.field || ''} onChange={(e) => patch({ showIf: e.target.value ? { field: e.target.value, equals: '' } : undefined })}><option value="">(always show)</option>{earlier.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</Select>
              {src && <>is<Select className={cn(inputCls, '!w-auto !py-1.5 text-xs')} value={q.showIf?.equals || ''} onChange={(e) => patch({ showIf: { field: src.id, equals: e.target.value } })}><option value="">choose…</option>{choices.map((c) => <option key={c} value={c}>{c}</option>)}</Select></>}
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
            <button type="button" onClick={duplicate} className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-fg2 hover:bg-tech/10 hover:text-tech"><Copy size={14} /> Duplicate</button>
            <button type="button" onClick={() => move(-1)} disabled={i === 0} aria-label="Move up" className="grid size-8 place-items-center rounded-lg text-fg2 hover:bg-tech/10 hover:text-tech disabled:opacity-30"><ArrowUp size={15} /></button>
            <button type="button" onClick={() => move(1)} disabled={i === total - 1} aria-label="Move down" className="grid size-8 place-items-center rounded-lg text-fg2 hover:bg-tech/10 hover:text-tech disabled:opacity-30"><ArrowDown size={15} /></button>
            <button type="button" onClick={remove} aria-label="Delete question" className="grid size-8 place-items-center rounded-lg text-fg2 hover:bg-red-500/10 hover:text-red-500"><Trash2 size={15} /></button>
            {!isSection && <div className="ml-auto border-l border-line pl-4"><Switch checked={!!q.required} onChange={(v) => patch({ required: v })} label="Required" /></div>}
          </div>
        </div>
      )}
    </motion.div>
  );
}

/** Full-page form editor, like Google Forms: questions on a canvas, autosave, preview, responses and settings in tabs.
 *  Works for stand-alone forms (/admin/forms/:id) and for the registration form of an event (/admin/events/:id/form). */
const PATTERNS = [
  { id: 'none', label: 'Any text', pattern: '' },
  { id: 'digits', label: 'Digits only', pattern: '^[0-9]+$', msg: 'Use digits only' },
  { id: 'id9', label: 'Student ID (9 digits)', pattern: '^[0-9]{9}$', msg: 'Enter your 9 digit ID' },
  { id: 'phone', label: 'Bangladesh mobile number', pattern: '^(\\+?88)?01[3-9][0-9]{8}$', msg: 'Enter a valid Bangladesh mobile number' },
  { id: 'letters', label: 'Letters only', pattern: "^[A-Za-z .'-]+$", msg: 'Use letters only' },
  { id: 'custom', label: 'Custom (advanced)' },
];

function PatternRule({ q, patch }) {
  const found = PATTERNS.find((p) => p.id !== 'custom' && p.id !== 'none' && p.pattern === q.pattern);
  const [custom, setCustom] = useState(!!q.pattern && !found);
  const mode = custom ? 'custom' : q.pattern ? found?.id : 'none';
  const pick = (id) => {
    const p = PATTERNS.find((x) => x.id === id);
    if (id === 'custom') { setCustom(true); return; }
    setCustom(false);
    patch({ pattern: p.pattern || undefined, patternMsg: p.msg || undefined });
  };
  return (
    <div className="space-y-2">
      <label className="block">What should people type?
        <Select className={cn(inputCls, 'mt-1 !py-1.5')} value={mode} onChange={(e) => pick(e.target.value)}>
          {PATTERNS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </Select>
      </label>
      {mode !== 'none' && (
        <label className="block">Message if it is wrong
          <input className={cn(inputCls, 'mt-1 !py-1.5')} placeholder="Please check this answer" maxLength={100} value={q.patternMsg || ''} onChange={(e) => patch({ patternMsg: e.target.value })} />
        </label>
      )}
      {mode === 'custom' && (
        <label className="block">Pattern (regular expression)
          <input className={cn(inputCls, 'mt-1 !py-1.5 font-mono')} placeholder="^[0-9]{9}$" maxLength={80} value={q.pattern || ''} onChange={(e) => patch({ pattern: e.target.value || undefined })} />
          <span className="mt-1 block text-[11px] text-muted">For example ^[0-9]{'{9}'}$ means exactly 9 digits.</span>
        </label>
      )}
    </div>
  );
}

export default function FormEditor({ kind = 'form', eventId }) {
  const gateway = useGateway();
  const routeId = useParams().id;
  const id = eventId ?? routeId;
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'questions';
  const setTab = (t) => { const n = new URLSearchParams(params); if (t === 'questions') n.delete('tab'); else n.set('tab', t); setParams(n, { replace: true }); };
  const updateItem = useStore((s) => s.updateItem);
  const storeEvents = useStore((s) => s.events);

  const [item, setItem] = useState(null); // the form row or the event row
  const [doc, setDoc] = useState(null); // the editable copy
  const [status, setStatus] = useState('saved');
  const [problem, setProblem] = useState('');
  const [activeId, setActiveId] = useState(null);
  const [preview, setPreview] = useState(false);
  const [shortCode, setShortCode] = useState('');
  const [which, setWhich] = useState('short'); // which of the two working links is shown, copied and used for the QR code
  const [alias, setAlias] = useState('');
  const pagePath = item ? (kind === 'form' ? `/f/${item.slug || doc?.slug}` : `/events/${item.id}`) : '';
  useEffect(() => { // short link of this form / event, made on first view
    if (!pagePath || pagePath.endsWith('undefined')) return;
    api.post('/short', { path: pagePath }).then((r) => { setShortCode(r.data.code); setAlias(r.data.code); }).catch(() => {});
  }, [pagePath]);
  const [qr, setQr] = useState(false);
  const [sample, setSample] = useState({});
  const [notFound, setNotFound] = useState(false);
  const [formsList, setFormsList] = useState([]); // for "ask for feedback after the event"
  const [sendingFb, setSendingFb] = useState(false);
  useEffect(() => { if (kind === 'event') api.get('/forms').then((r) => setFormsList(r.data)).catch(() => {}); }, [kind]);
  const sendFeedbackNow = async () => {
    setSendingFb(true);
    try { const r = await api.post(`/event-registrations/event/${id}/feedback/send`); toast.success(`Feedback link sent to ${r.data.sent} ${r.data.sent === 1 ? 'person' : 'people'}`); }
    catch (ex) { toast.error(ex.response?.data?.error || 'Could not send'); }
    setSendingFb(false);
  };
  const rev = useRef(0);
  const timer = useRef(null);
  const [dragId, setDragId] = useState(null);
  const [dragFrom, setDragFrom] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  // ---- load ----
  useEffect(() => {
    let alive = true;
    const start = (row) => {
      if (!alive) return;
      setItem(row);
      const f = row.reg_form?.fields?.length ? clone(row.reg_form) : { title: '', intro: '', confirmation: '', unique: kind === 'form' ? '' : 'email', fields: clone(kind === 'form' ? [{ id: 'name', key: 'name', type: 'short', label: 'Your name', required: true }] : DEFAULT_FIELDS) };
      setDoc({
        title: kind === 'form' ? row.title : row.title, heading: f.title || '', intro: f.intro || row.description || '', confirmation: f.confirmation || '', email_note: f.email_note || '', unique: f.unique || '',
        notify_admin: !!f.notify_admin, feedback_form: f.feedback_form || '', theme: f.theme || '', closes_at: f.closes_at || '', payment: f.payment || null, cert: f.cert || null, fields: f.fields,
        capacity: Number(row.capacity) || 0, open: kind === 'form' ? row.is_open !== false : row.reg_open !== false, slug: row.slug || '',
      });
      setActiveId(null);
      setStatus('saved');
    };
    if (kind === 'form') api.get('/forms').then((r) => { const row = r.data.find((x) => String(x.id) === String(id)); row ? start(row) : alive && setNotFound(true); }).catch(() => alive && setNotFound(true));
    else {
      const local = storeEvents.find((e) => String(e.id) === String(id));
      if (local) start(local); else api.get(`/events/${id}`).then((r) => start(r.data)).catch(() => alive && setNotFound(true));
    }
    return () => { alive = false; };
  }, [id, kind]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- autosave ----
  const body = useCallback((d) => ({
    title: d.heading.trim(), intro: d.intro, confirmation: d.confirmation, email_note: d.email_note, unique: d.unique, notify_admin: d.notify_admin, feedback_form: kind === 'event' ? d.feedback_form || undefined : undefined, theme: d.theme || undefined, closes_at: d.closes_at || undefined,
    payment: d.payment?.enabled ? { ...d.payment, amount: Number(d.payment.amount), online: !!d.payment.online } : undefined,
    cert: d.cert?.enabled ? d.cert : undefined,
    fields: d.fields.map((q) => ({ ...q, options: hasOptions(q.type) ? q.options.map((o) => o.trim()).filter(Boolean) : undefined })),
  }), [kind]);

  const save = useCallback(async (d, mine) => {
    setStatus('saving');
    try {
      if (kind === 'form') {
        const r = await api.put(`/forms/${id}`, { title: d.title.trim() || undefined, slug: d.slug.trim() || undefined, description: d.intro || null, reg_form: body(d), capacity: Number(d.capacity) || 0, is_open: d.open });
        setItem(r.data);
      } else await updateItem('events', id, { reg_form: body(d), capacity: Number(d.capacity) || 0, reg_open: d.open });
      if (rev.current === mine) setStatus('saved');
    } catch (e) {
      const msg = e.response?.data?.error;
      if (msg) { setProblem(msg); setStatus('invalid'); } else setStatus('error');
    }
  }, [id, kind, body, updateItem]);

  useEffect(() => {
    if (!doc || (status !== 'dirty' && status !== 'error')) return undefined;
    const p = problemOf(doc);
    setProblem(p);
    clearTimeout(timer.current);
    if (p) { setStatus('invalid'); return undefined; }
    const mine = rev.current;
    timer.current = setTimeout(() => save(doc, mine), status === 'error' ? 4000 : 1000);
    return () => clearTimeout(timer.current);
  }, [doc, status, save]);

  useEffect(() => { // an invalid form becomes saveable again as soon as it is fixed
    if (status === 'invalid' && doc && !problemOf(doc)) setStatus('dirty');
  }, [doc, status]);
  useEffect(() => {
    const warn = (e) => { if (status === 'dirty' || status === 'invalid' || status === 'saving') { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [status]);

  const edit = (fn) => { rev.current += 1; setDoc((d) => fn(d)); setStatus('dirty'); };
  const patchDoc = (p) => edit((d) => ({ ...d, ...p }));
  const patchQ = (qid, p) => edit((d) => ({ ...d, fields: d.fields.map((q) => (q.id === qid ? { ...q, ...p } : q)) }));
  const addQ = (q) => { edit((d) => { const at = activeId ? d.fields.findIndex((x) => x.id === activeId) + 1 : d.fields.length; const n = [...d.fields]; n.splice(at, 0, q); return { ...d, fields: n }; }); setActiveId(q.id); };
  const moveQ = (qid, dir) => edit((d) => { const n = [...d.fields]; const i = n.findIndex((x) => x.id === qid); const j = i + dir; if (j < 0 || j >= n.length) return d; [n[i], n[j]] = [n[j], n[i]]; return { ...d, fields: n }; });
  const dropQ = (toId) => { if (dragFrom && dragFrom !== toId) edit((d) => { const n = [...d.fields]; const a = n.findIndex((x) => x.id === dragFrom); const b = n.findIndex((x) => x.id === toId); const [m] = n.splice(a, 1); n.splice(b, 0, m); return { ...d, fields: n }; }); setDragFrom(null); setDragOver(null); setDragId(null); };

  const longLink = item ? (kind === 'form' ? `${window.location.origin}/f/${doc?.slug || item.slug}` : eventLink(item.id)) : '';
  const shortUrl = shortCode ? `${window.location.origin}/s/${shortCode}` : '';
  const link = which === 'short' && shortUrl ? shortUrl : longLink; // both links work; the short one is the default
  const backTo = kind === 'form' ? '/admin/forms' : '/admin/events';
  const previewFields = useMemo(() => (doc ? doc.fields.map((q) => (hasOptions(q.type) ? { ...q, options: q.options.filter(Boolean) } : q)) : []), [doc]);

  if (notFound) return <div className="py-20 text-center"><h2 className="text-2xl text-fg">Not found</h2><Link to={backTo} className="btn-primary mt-5 inline-flex">Back</Link></div>;
  if (!doc || !item) return <Loader2 className="animate-spin text-muted" />;
  const [sLabel, sColor, SIcon] = STATUS[status] || STATUS.saved;

  return (
    <div className="-mt-2">
      {/* top bar */}
      <div className="sticky top-14 z-30 -mx-1 mb-6 rounded-2xl border border-line bg-surface/95 px-4 py-3 shadow-sm backdrop-blur sm:top-16">
        <div className="flex flex-wrap items-center gap-3">
          <Link to={backTo} aria-label="Back" className="grid size-9 place-items-center rounded-full text-fg2 hover:bg-tech/10 hover:text-tech"><ArrowLeft size={18} /></Link>
          {kind === 'form'
            ? <input className="min-w-0 flex-1 bg-transparent font-display text-xl text-fg outline-none focus:border-b focus:border-tech" value={doc.title} maxLength={200} onChange={(e) => patchDoc({ title: e.target.value })} aria-label="Form name" />
            : <div className="min-w-0 flex-1"><div className="truncate font-display text-xl text-fg">{item.title}</div><div className="text-xs text-muted">Registration form for this event</div></div>}
          <span className={cn('flex items-center gap-1.5 text-xs font-medium', sColor)} title={problem || ''}><SIcon size={14} className={status === 'saving' ? 'animate-spin' : ''} /> {sLabel}</span>
          <button onClick={() => { setPreview((p) => !p); setTab('questions'); }} className={cn('flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition', preview ? 'border-tech bg-tech/10 text-tech' : 'border-line text-fg2 hover:border-tech hover:text-tech')}>{preview ? <Pencil size={14} /> : <Eye size={14} />} {preview ? 'Back to editing' : 'Preview'}</button>
          <button onClick={async () => toast[(await copyText(link)) ? 'success' : 'error']('Link copied')} className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-semibold text-fg2 hover:border-tech hover:text-tech"><Link2 size={14} /> Copy link</button>
          <button onClick={() => setQr(true)} className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-semibold text-fg2 hover:border-tech hover:text-tech"><QrCode size={14} /> QR code</button>
          <a href={longLink} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-xs font-semibold text-white"><ExternalLink size={14} /> Open</a>
        </div>
        <div className={cn('mt-3 flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 text-xs', doc.open ? 'border-emerald-500/30 bg-emerald-500/8' : 'border-amber-500/30 bg-amber-500/10')}>
          {doc.open
            ? <><span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600"><Check size={14} /> Published</span>
              <Select className={cn(inputCls, '!w-auto min-w-0 flex-1 !py-1.5 font-mono text-xs')} value={which} onChange={(e) => setWhich(e.target.value)} aria-label="Which link to share">
                {shortUrl && <option value="short">Short · {shortUrl}</option>}
                <option value="long">Full · {longLink}</option>
              </Select>
              <button onClick={async () => toast[(await copyText(link)) ? 'success' : 'error']('Link copied')} className="inline-flex items-center gap-1 font-semibold text-tech"><Copy size={13} /> Copy link</button></>
            : <><span className="inline-flex items-center gap-1.5 font-semibold text-amber-600"><CircleAlert size={14} /> Not published: nobody can fill this in yet</span><span className="flex-1" />
              <button onClick={async () => { patchDoc({ open: true }); toast.success((await copyText(link)) ? 'Published. Link copied' : 'Published'); }} className="rounded-lg bg-accent px-3.5 py-1.5 font-semibold text-white">Publish</button></>}
        </div>
        {status === 'invalid' && problem && <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-600"><CircleAlert size={13} /> {problem}. Your changes are saved as soon as this is fixed.</p>}
        <div className="mt-3 flex gap-1 border-t border-line pt-2">
          {[['questions', Pencil, 'Questions'], ['responses', Users, 'Responses'], ['settings', Settings2, 'Settings']].map(([k, I, l]) => (
            <button key={k} onClick={() => { setTab(k); setPreview(false); }} className={cn('flex items-center gap-1.5 rounded-t-lg border-b-2 px-4 py-2 text-sm font-medium transition', tab === k ? 'border-tech text-tech' : 'border-transparent text-fg2 hover:text-fg')}><I size={15} /> {l}</button>
          ))}
          <div className="ml-auto flex items-center pr-1"><Switch checked={doc.open} onChange={(v) => patchDoc({ open: v })} label={doc.open ? 'Published' : 'Not published'} /></div>
        </div>
      </div>

      {qr && <QrModal url={link} title={kind === 'form' ? doc.title : item.title} onClose={() => setQr(false)} />}

      {tab === 'responses' && <div className="mx-auto max-w-3xl"><ResponsesPanel event={{ ...item, reg_form: { ...(item.reg_form || {}), fields: doc.fields, payment: doc.payment?.enabled ? doc.payment : undefined }, capacity: doc.capacity }} kind={kind} /></div>}

      {tab === 'questions' && (preview ? (
        <div className="mx-auto max-w-2xl">
          <div className="relative rounded-3xl border border-line bg-surface p-6 shadow-[var(--shadow-md)] sm:p-9">
            <div className="absolute inset-x-0 top-0 h-2 rounded-t-3xl" style={{ background: 'linear-gradient(90deg,var(--accent),var(--tech))' }} />
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-alt px-3 py-2 text-xs text-fg2"><span>Preview: this is what people see. Nothing here is saved.</span><button onClick={() => setPreview(false)} className="inline-flex items-center gap-1 font-semibold text-tech"><Pencil size={12} /> Back to editing</button></div>
            <h2 className="text-3xl text-fg">{doc.heading || (kind === 'form' ? doc.title : item.title)}</h2>
            {doc.intro && <p className="mt-3 whitespace-pre-line text-fg2">{doc.intro}</p>}
            <div className="mt-6"><DynamicForm fields={previewFields} values={sample} onChange={(k, v) => setSample((s) => ({ ...s, [k]: v }))} /></div>
            {doc.payment?.enabled && doc.payment.methods?.length > 0 && <div className="mt-5"><PaymentBox setting={{ ...doc.payment, numbers: doc.payment.numbers || {} }} value={{}} onChange={() => {}} /></div>}
            <button className="btn-primary mt-6 w-full justify-center" type="button">Submit</button>
          </div>
        </div>
      ) : (
        <div className="mx-auto flex max-w-4xl items-start gap-4">
          <div className="min-w-0 flex-1 space-y-4" onClick={() => setActiveId(null)}>
            <div className="relative rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8" onClick={(e) => e.stopPropagation()}>
              <div className="absolute inset-x-0 top-0 h-2.5 rounded-t-2xl" style={{ background: 'linear-gradient(90deg,var(--accent),var(--tech))' }} />
              <input className="w-full border-b border-transparent bg-transparent pb-1 font-display text-3xl text-fg outline-none transition placeholder:text-muted hover:border-line focus:border-tech" placeholder={kind === 'form' ? doc.title || 'Form title' : item.title} value={doc.heading} maxLength={120} onChange={(e) => patchDoc({ heading: e.target.value })} aria-label="Heading shown on the form" />
              <textarea className="mt-3 min-h-16 w-full resize-y border-b border-transparent bg-transparent text-[15px] leading-7 text-fg2 outline-none transition placeholder:text-muted hover:border-line focus:border-tech" placeholder="Form description (optional)" value={doc.intro} maxLength={1000} onChange={(e) => patchDoc({ intro: e.target.value })} />
              {doc.payment?.enabled && <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-accent/10 px-3.5 py-1.5 text-xs font-semibold text-accent"><Wallet size={14} /> Fee: {doc.payment.amount} BDT</div>}
            </div>

            {doc.fields.map((q, i) => (
              <QuestionCard key={q.id} q={q} i={i} total={doc.fields.length} fields={doc.fields} active={activeId === q.id}
                onActivate={() => setActiveId(q.id)} patch={(p) => patchQ(q.id, p)} move={(d) => moveQ(q.id, d)}
                remove={() => { edit((d) => ({ ...d, fields: d.fields.filter((x) => x.id !== q.id), unique: d.unique === q.id ? '' : d.unique })); setActiveId(null); }}
                duplicate={() => addQ({ ...clone(q), id: uid(), key: undefined })}
                drag={{ id: dragId, over_: dragOver, arm: setDragId, start: setDragFrom, over: setDragOver, drop: dropQ, end: () => { setDragId(null); setDragFrom(null); setDragOver(null); } }} />
            ))}
            {doc.fields.length === 0 && <div className="rounded-2xl border border-dashed border-line p-10 text-center text-sm text-muted">No questions yet. Use the buttons on the right (or below on a phone) to add one.</div>}

            <div className="flex flex-wrap items-center justify-center gap-2 pb-6 lg:hidden" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => addQ(newField('short'))} className="btn-primary !px-4 !py-2.5 text-xs"><Plus size={14} /> Add question</button>
              <button onClick={() => addQ(newField('section'))} className="btn-outline !px-4 !py-2.5 text-xs"><Heading size={14} /> Add heading</button>
              <button onClick={() => addQ(newField('section', { page: true, label: `Page ${doc.fields.filter((q) => q.page).length + 2}` }))} className="btn-outline !px-4 !py-2.5 text-xs"><FileText size={14} /> Add page</button>
            </div>
          </div>

          {/* floating toolbar */}
          <div className="sticky top-52 hidden shrink-0 flex-col gap-1 rounded-2xl border border-line bg-surface p-1.5 shadow-md lg:flex" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => addQ(newField('short'))} title="Add question" aria-label="Add question" className="grid size-11 place-items-center rounded-xl text-fg2 hover:bg-tech/10 hover:text-tech"><PlusCircle size={22} /></button>
            <button onClick={() => addQ(newField('section'))} title="Add heading" aria-label="Add heading" className="grid size-11 place-items-center rounded-xl text-fg2 hover:bg-tech/10 hover:text-tech"><Heading size={20} /></button>
            <button onClick={() => addQ(newField('section', { page: true, label: `Page ${doc.fields.filter((q) => q.page).length + 2}` }))} title="Add a new page" aria-label="Add a new page" className="grid size-11 place-items-center rounded-xl text-fg2 hover:bg-tech/10 hover:text-tech"><FileText size={20} /></button>
            <div className="my-1 h-px bg-line" />
            {PRESETS.filter((p) => !doc.fields.some((q) => q.key === p.key)).map((p) => (
              <button key={p.key} onClick={() => addQ({ ...clone(p), id: p.key })} title={`Add: ${p.label}`} aria-label={`Add ${p.label}`} className="grid size-11 place-items-center rounded-xl text-[10px] font-bold uppercase text-fg2 hover:bg-accent/10 hover:text-accent">{p.key === 'student_id' ? 'ID' : p.key.slice(0, 3)}</button>
            ))}
          </div>
        </div>
      ))}

      {tab === 'settings' && (
        <div className="mx-auto max-w-2xl space-y-5">
          {kind === 'form' && (
            <section className="rounded-2xl border border-line bg-surface p-6">
              <h3 className="mb-3 text-lg text-fg">Link</h3>
              <div className="flex items-center gap-1 text-sm text-fg2"><span className="shrink-0">{window.location.origin}/f/</span><input className={cn(inputCls, '!py-2')} value={doc.slug} maxLength={80} onChange={(e) => patchDoc({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} /></div>
              <p className="mt-2 text-xs text-muted">If you change the link name, the old link stops working.</p>
            </section>
          )}
          <section className="rounded-2xl border border-line bg-surface p-6">
            <h3 className="mb-3 text-lg text-fg">Short link</h3>
            <div className="flex flex-wrap items-center gap-2 text-sm text-fg2"><span className="shrink-0">{window.location.origin}/s/</span>
              <input className={cn(inputCls, '!w-48 !py-2')} value={alias} maxLength={40} aria-label="Short link name" onChange={(e) => setAlias(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} />
              <button type="button" disabled={alias.length < 3 || alias === shortCode} onClick={async () => { try { const r = await api.post('/short', { path: pagePath, alias }); setShortCode(r.data.code); toast.success('Short link saved'); } catch (e) { toast.error(e.response?.data?.error || 'Could not save'); } }} className="rounded-lg bg-accent px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-40">Save</button>
              <button type="button" onClick={async () => toast[(await copyText(link)) ? 'success' : 'error']('Link copied')} className="rounded-lg border border-line px-3.5 py-2 text-xs font-semibold text-fg2 hover:border-tech hover:text-tech">Copy</button></div>
            <p className="mt-2 text-xs text-muted">A short link is easy to type, read out and fit on a poster. Pick your own name, like <b>python-workshop</b>. The old short links keep working.</p>
          </section>
          <section className="rounded-2xl border border-line bg-surface p-6">
            <h3 className="mb-3 flex items-center gap-2 text-lg text-fg"><Palette size={18} /> Colour</h3>
            <div className="flex flex-wrap items-center gap-2.5">
              {[['', 'Club colours'], ['#1f4fd8', 'Blue'], ['#0b7f58', 'Green'], ['#7c3aed', 'Purple'], ['#c2410c', 'Orange'], ['#be123c', 'Rose'], ['#0e7490', 'Teal']].map(([c, l]) => (
                <button key={l} type="button" onClick={() => patchDoc({ theme: c })} title={l} aria-label={l} aria-pressed={doc.theme === c}
                  className={cn('grid size-10 place-items-center rounded-full border-2 transition', doc.theme === c ? 'border-fg' : 'border-transparent hover:border-line')} style={{ background: c || 'linear-gradient(135deg,#1F4FD8,#0B7F58)' }}>{doc.theme === c && <Check size={16} className="text-white" />}</button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">Buttons and highlights on the public form use this colour.</p>
          </section>
          <section className="rounded-2xl border border-line bg-surface p-6">
            <h3 className="mb-4 text-lg text-fg">Limits</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block"><span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted">Response limit (0 = no limit)</span><input type="number" min="0" className={inputCls} value={doc.capacity} onChange={(e) => patchDoc({ capacity: e.target.value })} /></label>
              <label className="block"><span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted">Closes on (optional)</span><input type="datetime-local" className={inputCls} value={doc.closes_at} onChange={(e) => patchDoc({ closes_at: e.target.value })} /></label>
            </div>
            <label className="mt-4 block"><span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted">One response per person for</span>
              <Select className={inputCls} value={doc.unique} onChange={(e) => patchDoc({ unique: e.target.value })}><option value="">No duplicate check</option>{doc.fields.filter((q) => ['email', 'short', 'phone', 'number'].includes(q.type) && q.label).map((q) => <option key={q.id} value={q.id}>{q.label}</option>)}</Select></label>
          </section>

          <section className="rounded-2xl border border-line bg-surface p-6">
            <div className="flex items-center justify-between gap-3"><h3 className="flex items-center gap-2 text-lg text-fg"><Wallet size={18} className="text-accent" /> Payment</h3>
              <Switch checked={!!doc.payment?.enabled} onChange={(v) => patchDoc({ payment: { amount: 100, manual: true, online: false, methods: ['bKash'], numbers: {}, kind: 'send_money', note: '', ...doc.payment, enabled: v } })} label={doc.payment?.enabled ? 'On' : 'Off'} /></div>
            <p className="mt-1 text-xs text-muted">Choose how people can pay. You can allow one way or both.</p>
            {doc.payment?.enabled && (
              <div className="mt-4 space-y-3">
                <label className="block"><span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted">Amount (BDT)</span><input type="number" min="1" className={inputCls} value={doc.payment.amount} onChange={(e) => patchDoc({ payment: { ...doc.payment, amount: e.target.value } })} /></label>
                <div className="rounded-2xl border border-line bg-alt/50 p-4">
                  <Switch checked={doc.payment.manual !== false} onChange={(v) => patchDoc({ payment: { ...doc.payment, manual: v } })} label="Send money by hand (bKash, Nagad, Rocket)" />
                  <p className="mt-1 text-xs text-muted">People send money to your number and type the transaction ID. You check each payment in Responses and press Verify. No account needed.</p>
                </div>
                <div className="rounded-2xl border border-line bg-alt/50 p-4">
                  <Switch checked={!!doc.payment.online && gateway} disabled={!gateway} onChange={(v) => patchDoc({ payment: { ...doc.payment, online: v } })} label="Pay online (payment gateway)" />
                  <p className="mt-1 text-xs text-muted">{gateway ? 'People pay on the secure payment page (bKash, Nagad, Rocket or card) and the place is confirmed at once. The company keeps a small fee.' : 'Needs a merchant account. When the keys are added on the server (SSLCOMMERZ_STORE_ID and SSLCOMMERZ_STORE_PASSWD) this switch turns on.'}</p>
                </div>
                {doc.payment.manual !== false && PAY_METHODS.map((m) => {
                  const on = doc.payment.methods.includes(m);
                  return (
                    <div key={m} className="flex flex-wrap items-center gap-3">
                      <label className="flex w-28 cursor-pointer items-center gap-2 text-sm font-medium text-fg2"><input type="checkbox" className="size-4 accent-[#1F4FD8]" checked={on} onChange={(e) => patchDoc({ payment: { ...doc.payment, methods: e.target.checked ? [...doc.payment.methods, m] : doc.payment.methods.filter((x) => x !== m) } })} /> {m}</label>
                      {on && <input type="tel" className={cn(inputCls, 'min-w-0 flex-1')} placeholder={`${m} number people send money to`} value={doc.payment.numbers?.[m] || ''} onChange={(e) => patchDoc({ payment: { ...doc.payment, numbers: { ...doc.payment.numbers, [m]: e.target.value } } })} />}
                    </div>
                  );
                })}
                <Select className={inputCls} value={doc.payment.kind} onChange={(e) => patchDoc({ payment: { ...doc.payment, kind: e.target.value } })}><option value="send_money">People use “Send Money”</option><option value="payment">People use “Payment”</option></Select>
                <textarea className={cn(inputCls, 'min-h-16 resize-y')} placeholder="Note shown with the payment details (for example: write your student ID as reference)" value={doc.payment.note || ''} maxLength={300} onChange={(e) => patchDoc({ payment: { ...doc.payment, note: e.target.value } })} />
              </div>
            )}
          </section>

          {kind === 'event' && (
            <section className="rounded-2xl border border-line bg-surface p-6">
              <div className="flex items-center justify-between gap-3"><h3 className="flex items-center gap-2 text-lg text-fg"><Award size={18} className="text-accent" /> Certificates</h3>
                <Switch checked={!!doc.cert?.enabled} onChange={(v) => patchDoc({ cert: { title: 'Certificate of Participation', signer: '', signer_title: 'BAUET ICT Club', note: '', ...doc.cert, enabled: v } })} label={doc.cert?.enabled ? 'On' : 'Off'} /></div>
              <p className="mt-1 text-xs text-muted">People who are checked in at the entrance can download a certificate with a QR code anyone can verify. You can also email them all at once from the Check-in desk.</p>
              {doc.cert?.enabled && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="block sm:col-span-2"><span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted">Title</span><input className={inputCls} value={doc.cert.title} maxLength={60} onChange={(e) => patchDoc({ cert: { ...doc.cert, title: e.target.value } })} /></label>
                  <label className="block"><span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted">Signed by</span><input className={inputCls} placeholder="Dr. Md. Rubel Bashar" value={doc.cert.signer} maxLength={60} onChange={(e) => patchDoc({ cert: { ...doc.cert, signer: e.target.value } })} /></label>
                  <label className="block"><span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted">Role</span><input className={inputCls} placeholder="President, BAUET ICT Club" value={doc.cert.signer_title} maxLength={80} onChange={(e) => patchDoc({ cert: { ...doc.cert, signer_title: e.target.value } })} /></label>
                  <label className="block sm:col-span-2"><span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted">Line under the event name (optional)</span><input className={inputCls} placeholder="for completing the full-day workshop" value={doc.cert.note} maxLength={160} onChange={(e) => patchDoc({ cert: { ...doc.cert, note: e.target.value } })} /></label>
                </div>
              )}
            </section>
          )}

          <section className="rounded-2xl border border-line bg-surface p-6">
            <h3 className="mb-4 text-lg text-fg">After someone submits</h3>
            <label className="block"><span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted">Message on the page</span><textarea className={cn(inputCls, 'min-h-16 resize-y')} placeholder="Thank you! Please bring your student ID." value={doc.confirmation} maxLength={500} onChange={(e) => patchDoc({ confirmation: e.target.value })} /></label>
            <label className="mt-4 block"><span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted">Extra note in their confirmation email</span><textarea className={cn(inputCls, 'min-h-16 resize-y')} placeholder="Room 301. Doors open at 2:30 PM." value={doc.email_note} maxLength={600} onChange={(e) => patchDoc({ email_note: e.target.value })} /></label>
            <div className="mt-4"><Switch checked={doc.notify_admin} onChange={(v) => patchDoc({ notify_admin: v })} label="Email me for every new response" /></div>
            {kind === 'event' && (
              <div className="mt-5 rounded-2xl border border-line bg-alt/50 p-4">
                <p className="text-sm font-semibold text-fg">Ask for feedback after the event</p>
                <p className="mt-1 text-xs text-muted">The day after the event, everyone who came (checked in) gets an email with a link to this form. Make the form first under Forms.</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Select className={cn(inputCls, 'min-w-[14rem] flex-1 !py-2')} value={doc.feedback_form || ''} onChange={(e) => patchDoc({ feedback_form: e.target.value })} aria-label="Feedback form">
                    <option value="">No feedback email</option>
                    {formsList.map((f) => <option key={f.id} value={f.slug}>{f.title}</option>)}
                  </Select>
                  {doc.feedback_form && <button type="button" onClick={sendFeedbackNow} disabled={sendingFb} className="btn-outline !px-4 !py-2 text-xs disabled:opacity-60">{sendingFb ? 'Sending…' : 'Send the link now'}</button>}
                </div>
              </div>
            )}
            <p className="mt-3 text-xs text-muted">{doc.fields.some((q) => q.type === 'email') ? 'The confirmation email goes to the first Email question.' : 'Add an Email question if people should get a confirmation email.'}</p>
          </section>
        </div>
      )}
    </div>
  );
}
