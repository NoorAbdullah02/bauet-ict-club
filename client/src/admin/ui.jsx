import Select from '../components/Select';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useShallow } from 'zustand/react/shallow';
import useStore from '../context/store';
import { cn } from '../lib/cn';
import ImageEditor from '../components/ImageEditor';
import { downloadUrl } from '../lib/img';

export const inputCls = 'w-full rounded-xl border border-line bg-bg/60 px-4 py-2.5 text-sm text-fg outline-none transition placeholder:text-muted focus:border-tech focus:ring-4 focus:ring-tech/15';

export function Panel({ className, children }) {
  return <div className={cn('min-w-0 rounded-3xl border border-line bg-surface shadow-[var(--shadow-sm)]', className)}>{children}</div>;
}

export function PageTitle({ title, sub, children }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl text-fg">{title}</h1>
        {sub && <p className="mt-1 text-sm text-fg2">{sub}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export function Drawer({ open, title, onClose, children, footer }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[300]">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 34 }}
            className="absolute inset-y-0 right-0 flex w-full max-w-lg flex-col border-l border-line bg-bg shadow-[var(--shadow-xl)]">
            <header className="flex items-center justify-between border-b border-line px-6 py-5">
              <h3 className="text-xl text-fg">{title}</h3>
              <button onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-full text-fg2 hover:bg-accent/10 hover:text-accent"><X size={18} /></button>
            </header>
            <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
            {footer && <footer className="flex justify-end gap-3 border-t border-line px-6 py-4">{footer}</footer>}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

export function FormField({ field, value, onChange, upload }) {
  const { uploadImage } = useStore(useShallow((s) => ({ uploadImage: s.uploadImage })));
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null); // picture waiting in the crop / resize editor
  const [other, setOther] = useState(false); // "Other" chosen in a select that allows typing a value
  const custom = field.allowOther && (other || (!!value && !field.options?.includes(value)));
  const label = <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-fg2">{field.label}{field.required && <span className="text-accent"> *</span>}</span>;
  const set = (v) => onChange(field.key, v);

  if (field.type === 'checkbox') return (
    <label className="mb-4 flex cursor-pointer items-center gap-3 rounded-xl border border-line px-4 py-3 text-sm text-fg">
      <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={!!value} onChange={(e) => set(e.target.checked)} />{field.label}
    </label>
  );

  if (field.type === 'image') return (
    <div className="mb-4">
      {label}
      <div className="flex items-center gap-3">
        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-line px-4 py-2.5 text-sm text-fg2 transition hover:border-tech hover:text-tech">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} {busy ? 'Uploading…' : value ? 'Change / crop image' : 'Upload image'}
          <input type="file" accept="image/*" hidden onChange={(e) => {
            const f = e.target.files?.[0]; e.target.value = '';
            if (f) setEditing(f);
          }} />
        </label>
        {value && <img loading="lazy" decoding="async" src={value} alt="" className="size-12 rounded-xl border border-line object-cover" />}
        {value && (
          <button type="button" onClick={async () => {
            try { const b = await (await fetch(value)).blob(); setEditing(new File([b], 'picture.jpg', { type: b.type || 'image/jpeg' })); } catch { toast.error('Could not open this picture here. Upload it again to edit.'); }
          }} className="rounded-xl border border-line px-3 py-2.5 text-xs font-semibold text-fg2 transition hover:border-tech hover:text-tech">Crop / resize</button>
        )}
        {value && !value.startsWith('data:') && <a href={downloadUrl(value, field.label)} download target="_blank" rel="noreferrer" title="Download the full-quality picture (for posters)" className="rounded-xl border border-line px-3 py-2.5 text-xs font-semibold text-fg2 transition hover:border-tech hover:text-tech">Download</a>}
      </div>
      {editing && <ImageEditor file={editing} aspect={field.kind === 'avatar' ? 1 : field.aspect || null} keepPng={field.kind === 'logo'} onCancel={() => setEditing(null)}
        onDone={async (f) => {
          setEditing(null); setBusy(true);
          try { set(await uploadImage(f, field.kind || 'cover', upload)); toast.success('Image saved as WebP'); } catch (err) { toast.error(err.response?.data?.error || 'Upload failed'); }
          setBusy(false);
        }} />}
      <input className={cn(inputCls, 'mt-2')} placeholder="…or paste an image URL" value={value || ''} onChange={(e) => set(e.target.value)} />
    </div>
  );

  return (
    <label className="mb-4 block">
      {label}
      {field.type === 'textarea' ? <textarea className={cn(inputCls, 'min-h-28 resize-y')} value={value || ''} required={field.required} onChange={(e) => set(e.target.value)} />
        : field.type === 'select' && field.allowOther ? (
          <div className="space-y-2">
            <Select className={inputCls} value={custom ? '__other' : value || ''} onChange={(e) => { if (e.target.value === '__other') { setOther(true); set(''); } else { setOther(false); set(e.target.value); } }}>
              <option value="">Select…</option>{field.options.map((o) => <option key={o}>{o}</option>)}<option value="__other">Other (type your own)…</option>
            </Select>
            {custom && <input className={inputCls} autoFocus placeholder="Type the category" value={value || ''} maxLength={50} onChange={(e) => set(e.target.value)} />}
          </div>
        )
        : field.type === 'select' ? (
          <Select className={inputCls} value={value || ''} onChange={(e) => set(e.target.value)}>
            <option value="">Select…</option>{field.options.map((o) => (typeof o === 'string' ? <option key={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>))}
          </Select>
        ) : <input className={inputCls} type={field.type || 'text'} value={field.type === 'date' ? String(value ?? '').slice(0, 10) : (value ?? '')} required={field.required} onChange={(e) => set(field.type === 'number' ? Number(e.target.value) : e.target.value)} />}
    </label>
  );
}

/* ---------- confirm dialog (promise based, replaces window.confirm) ---------- */
let openConfirm = null;
export const askConfirm = (opts) => new Promise((resolve) => {
  if (openConfirm) openConfirm({ ...opts, resolve });
  else resolve(window.confirm(opts.message || opts.title));
});

export function ConfirmHost() {
  const [dlg, setDlg] = useState(null);
  useEffect(() => { openConfirm = setDlg; return () => { openConfirm = null; }; }, []);
  const close = (v) => { dlg?.resolve(v); setDlg(null); };

  // portalled to <body> so it always sits above other pop-ups (e.g. the applicant details dialog)
  return createPortal(
    <AnimatePresence>
      {dlg && (
        <div className="fixed inset-0 z-[400] grid place-items-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => close(false)} className="absolute inset-0 bg-black/45" />
          <motion.div role="alertdialog" initial={{ opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
            className="relative w-full max-w-sm rounded-3xl border border-line bg-surface p-7 shadow-[var(--shadow-xl)]">
            <h3 className="text-xl text-fg">{dlg.title}</h3>
            {dlg.message && <p className="mt-2 text-sm leading-6 text-fg2">{dlg.message}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => close(false)} className="rounded-full border border-line px-5 py-2.5 text-sm font-medium text-fg2 hover:border-accent">Cancel</button>
              <button autoFocus onClick={() => close(true)} className={cn('rounded-full px-5 py-2.5 text-sm font-semibold text-white', dlg.danger ? 'bg-red-500 hover:bg-red-600' : 'bg-accent hover:brightness-110')}>{dlg.confirmText || 'Confirm'}</button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/** "Moved to Trash" toast with an Undo button. */
export function toastTrashed(label, onUndo) {
  toast.custom((t) => (
    <div className={cn('flex items-center gap-4 rounded-2xl border border-line bg-surface px-5 py-3.5 text-sm text-fg shadow-[var(--shadow-lg)] transition', t.visible ? 'opacity-100' : 'opacity-0')}>
      <span>{label} moved to Trash</span>
      <button onClick={async () => { toast.dismiss(t.id); try { await onUndo(); toast.success('Restored'); } catch { toast.error('Could not restore'); } }} className="font-semibold text-accent hover:underline">Undo</button>
    </div>
  ), { duration: 6000 });
}
