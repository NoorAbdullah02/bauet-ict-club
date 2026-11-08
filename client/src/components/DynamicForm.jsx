import Select from './Select';
import { inputCls } from './join/shared';
import { cn } from '../lib/cn';
import { useEffect, useMemo, useState } from 'react';
import { Loader2, ImagePlus, ArrowLeft, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../context/store';
import { isVisible, isOther, OTHER, isEmpty, ruleProblem } from '../lib/forms';
import { compressImage } from '../lib/compressImage';

const label = (f) => (
  <span className="mb-1.5 block text-sm font-semibold text-fg">
    {f.label || 'Untitled question'}{f.required && <span className="ml-1 text-red-500">*</span>}
    {f.help && <span className="mt-0.5 block text-xs font-normal text-muted">{f.help}</span>}
  </span>
);

/** Picture question: the person picks a picture, it is uploaded and the link is the answer. */
function PhotoAnswer({ value, onChange, disabled, error }) {
  const [busy, setBusy] = useState(false);
  const pick = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const small = await compressImage(file, { max: 1400 });
      const fd = new FormData(); fd.append('photo', small);
      const r = await api.post('/registrations/photo', fd);
      onChange(r.data.url);
      toast.success('Picture uploaded');
    } catch (e) { onChange(''); toast.error(e.response?.data?.error || 'Could not upload the picture. Use a JPG or PNG under 3 MB.'); }
    setBusy(false);
  };
  return (
    <label className={cn('flex cursor-pointer items-center gap-4 rounded-2xl border-2 border-dashed p-3.5 transition hover:border-tech/60', error ? 'border-red-500/70' : 'border-line')}>
      <span className="relative grid size-28 shrink-0 place-items-center overflow-hidden rounded-2xl bg-alt ring-1 ring-line">
        {value ? <img src={value} alt="Your upload" className="size-full object-cover" /> : <ImagePlus className="text-muted" />}
        {busy && <span className="absolute inset-0 grid place-items-center bg-bg/70"><Loader2 size={18} className="animate-spin text-tech" /></span>}
      </span>
      <span className={cn('text-sm', value && !busy ? 'font-semibold text-emerald-600' : 'text-fg2')} aria-live="polite">{busy ? 'Uploading…' : value ? 'Uploaded ✓ Tap to change' : 'Choose a picture (JPG or PNG, max 3 MB)'}</span>
      <input type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={disabled || busy} onChange={(e) => pick(e.target.files?.[0])} />
    </label>
  );
}

/** Draws a form from its question list. values = { fieldId: answer }, errors = { fieldId: message } */
const shuffled = (list, seed) => { // same order for the same person on every re-draw
  const a = [...list]; let h = 0; for (const c of seed) h = (h * 31 + c.charCodeAt(0)) | 0;
  for (let i = a.length - 1; i > 0; i--) { h = (h * 1103515245 + 12345) | 0; const j = Math.abs(h) % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

/** Splits the questions into pages at every heading marked "starts a new page". */
function pagesOf(fields) {
  const pages = [[]];
  fields.forEach((f, i) => { if (f.type === 'section' && f.page && i > 0 && pages[pages.length - 1].length) pages.push([]); pages[pages.length - 1].push(f); });
  return pages;
}

export default function DynamicForm({ fields: all, values, errors = {}, onChange, disabled, hideLabels, children, onPageError }) {
  const AUTO = { name: 'name', email: 'email', phone: 'tel' };
  const seed = useMemo(() => Math.random().toString(36).slice(2), []);
  const pages = useMemo(() => pagesOf(all), [all]);
  const [page, setPage] = useState(0);
  const last = Math.min(page, pages.length - 1) === pages.length - 1;
  const here = pages[Math.min(page, pages.length - 1)] || [];
  // a server error on an earlier page: take the person back to it
  useEffect(() => {
    const bad = pages.findIndex((pg) => pg.some((f) => errors[f.id]));
    if (bad >= 0 && bad !== page) setPage(bad);
  }, [errors]); // eslint-disable-line react-hooks/exhaustive-deps
  const next = () => {
    const err = {};
    here.forEach((f) => {
      if (f.type === 'section' || !isVisible(f, values)) return;
      if (f.required && isEmpty(values[f.id])) err[f.id] = 'This question is required';
      else { const m = ruleProblem(f, values[f.id]); if (m) err[f.id] = m; }
    });
    if (Object.keys(err).length) { onPageError?.(err); return; }
    setPage((p) => p + 1); window.scrollTo?.({ top: 0, behavior: 'smooth' });
  };
  const fields = here;
  const opts = (f) => (f.shuffle ? shuffled(f.options || [], seed + f.id) : f.options || []);
  return (
    <div className="space-y-5">
      {pages.length > 1 && (
        <div aria-label={`Page ${page + 1} of ${pages.length}`}>
          <div className="mb-1.5 flex justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-muted"><span>Page {Math.min(page, pages.length - 1) + 1} of {pages.length}</span></div>
          <div className="h-1.5 overflow-hidden rounded-full bg-alt"><div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${((Math.min(page, pages.length - 1) + 1) / pages.length) * 100}%` }} /></div>
        </div>
      )}
      {/* trap for spam bots: invisible to people, bots fill it and are ignored */}
      <input type="text" name="contact_me_by_fax_only" tabIndex={-1} autoComplete="off" aria-hidden="true" data-hp="1" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />
      {fields.filter((f) => isVisible(f, values)).map((f) => {
        const v = values[f.id];
        const err = errors[f.id];
        const set = (x) => onChange(f.id, x);
        let control;
        switch (f.type) {
          case 'long': control = <textarea className={cn(inputCls(err), 'min-h-24 resize-y')} value={v || ''} onChange={(e) => set(e.target.value)} disabled={disabled} />; break;
          case 'dropdown': control = (
            <div className="space-y-2">
              <Select className={inputCls(err)} value={isOther(v) ? '__other' : v || ''} onChange={(e) => set(e.target.value === '__other' ? OTHER : e.target.value)} disabled={disabled}>
                <option value="">Choose</option>{opts(f).map((o) => <option key={o} value={o}>{o}</option>)}{f.allowOther && <option value="__other">Other…</option>}
              </Select>
              {isOther(v) && <input className={inputCls(err)} placeholder="Type your answer" value={v.slice(OTHER.length)} onChange={(e) => set(OTHER + e.target.value)} disabled={disabled} />}
            </div>); break;
          case 'radio': case 'yesno': control = (
            <div className="space-y-2">{[...(f.type === 'yesno' ? ['Yes', 'No'] : opts(f))].map((o) => (
              <label key={o} className={cn('flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-2.5 text-sm transition', v === o ? 'border-accent bg-accent/8 text-fg' : 'border-line text-fg2 hover:border-muted')}>
                <input type="radio" name={f.id} checked={v === o} onChange={() => set(o)} disabled={disabled} className="size-4 accent-[#1F4FD8]" />{o}
              </label>))}
              {f.type === 'radio' && f.allowOther && (
                <div className={cn('flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm transition', isOther(v) ? 'border-accent bg-accent/8' : 'border-line')}>
                  <input type="radio" name={f.id} checked={isOther(v)} onChange={() => set(OTHER)} disabled={disabled} className="size-4 accent-[#1F4FD8]" aria-label="Other" />
                  <span className="text-fg2">Other:</span>
                  <input className="min-w-0 flex-1 border-b border-line bg-transparent py-1 text-fg outline-none focus:border-tech" value={isOther(v) ? v.slice(OTHER.length) : ''} onFocus={() => !isOther(v) && set(OTHER)} onChange={(e) => set(OTHER + e.target.value)} disabled={disabled} />
                </div>)}
            </div>); break;
          case 'checkbox': control = (
            <div className="space-y-2">{opts(f).map((o) => {
              const list = Array.isArray(v) ? v : [];
              const on = list.includes(o);
              return (
                <label key={o} className={cn('flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-2.5 text-sm transition', on ? 'border-accent bg-accent/8 text-fg' : 'border-line text-fg2 hover:border-muted')}>
                  <input type="checkbox" checked={on} onChange={() => set(on ? list.filter((x) => x !== o) : [...list, o])} disabled={disabled} className="size-4 accent-[#1F4FD8]" />{o}
                </label>);
            })}
            {f.allowOther && (() => {
              const list = Array.isArray(v) ? v : [];
              const other = list.find(isOther);
              return (
                <div className={cn('flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm transition', other !== undefined ? 'border-accent bg-accent/8' : 'border-line')}>
                  <input type="checkbox" checked={other !== undefined} onChange={() => set(other !== undefined ? list.filter((x) => !isOther(x)) : [...list, OTHER])} disabled={disabled} className="size-4 accent-[#1F4FD8]" aria-label="Other" />
                  <span className="text-fg2">Other:</span>
                  <input className="min-w-0 flex-1 border-b border-line bg-transparent py-1 text-fg outline-none focus:border-tech" value={other ? other.slice(OTHER.length) : ''} onFocus={() => other === undefined && set([...list, OTHER])} onChange={(e) => set([...list.filter((x) => !isOther(x)), OTHER + e.target.value])} disabled={disabled} />
                </div>);
            })()}
            </div>); break;
          case 'time': control = <input type="time" className={inputCls(err)} value={v || ''} onChange={(e) => set(e.target.value)} disabled={disabled} />; break;
          case 'photo': control = <PhotoAnswer value={v} onChange={set} disabled={disabled} error={err} />; break;
          case 'scale': control = (
            <div>
              <div className="flex flex-wrap gap-2">{Array.from({ length: f.scale?.max || 5 }, (_, i) => i + 1).map((n) => (
                <button key={n} type="button" disabled={disabled} onClick={() => set(n)} aria-pressed={v === n}
                  className={cn('grid size-11 place-items-center rounded-xl border text-sm font-semibold transition', v === n ? 'border-accent bg-accent text-white' : 'border-line text-fg2 hover:border-accent')}>{n}</button>))}</div>
              {(f.scale?.low || f.scale?.high) && <div className="mt-1.5 flex justify-between text-xs text-muted"><span>{f.scale.low}</span><span>{f.scale.high}</span></div>}
            </div>); break;
          case 'date': control = <input type="date" className={inputCls(err)} value={v || ''} onChange={(e) => set(e.target.value)} disabled={disabled} />; break;
          case 'number': control = <input type="number" inputMode="decimal" className={inputCls(err)} value={v ?? ''} onChange={(e) => set(e.target.value)} disabled={disabled} />; break;
          case 'email': control = <input type="email" className={inputCls(err)} value={v || ''} onChange={(e) => set(e.target.value)} autoComplete="email" disabled={disabled} />; break;
          case 'phone': control = <input type="tel" className={inputCls(err)} value={v || ''} onChange={(e) => set(e.target.value)} autoComplete="tel" placeholder="01XXXXXXXXX" disabled={disabled} />; break;
          default: control = <input className={inputCls(err)} value={v || ''} onChange={(e) => set(e.target.value)} autoComplete={AUTO[f.key] || 'off'} inputMode={/^\^?\(?\[0-9\]|^\^?\\d/.test(f.pattern || '') ? 'numeric' : undefined} autoCapitalize={f.key === 'full_name' ? 'words' : undefined} enterKeyHint="next" disabled={disabled} />;
        }
        if (f.type === 'section') return <div key={f.id} className="border-t border-line pt-4"><h4 className="text-base font-semibold text-fg">{f.label}</h4>{f.help && <p className="mt-1 whitespace-pre-line text-sm text-fg2">{f.help}</p>}</div>;
        const grouped = ['radio', 'yesno', 'checkbox', 'scale', 'photo'].includes(f.type);
        return (
          <div key={f.id}>
            {grouped ? <div>{!hideLabels && label(f)}{control}</div> : <label className="block">{!hideLabels && label(f)}{control}</label>}
            {err && <span className="mt-1.5 block text-xs text-red-500">{err}</span>}
          </div>
        );
      })}
      {pages.length > 1 && !last && (
        <div className="flex justify-between gap-3">
          <button type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="btn-outline !px-5 !py-2.5 text-sm disabled:opacity-30"><ArrowLeft size={15} /> Back</button>
          <button type="button" onClick={next} className="btn-primary !px-6 !py-2.5 text-sm">Next <ArrowRight size={15} /></button>
        </div>
      )}
      {last && pages.length > 1 && page > 0 && <button type="button" onClick={() => setPage((p) => p - 1)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-tech"><ArrowLeft size={15} /> Back</button>}
      {last && children}
    </div>
  );
}
