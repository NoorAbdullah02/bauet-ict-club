import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useShallow } from 'zustand/react/shallow';
import useStore from '../context/store';
import { cn } from '../lib/cn';

export const inputCls = 'w-full rounded-xl border border-line bg-bg/60 px-4 py-2.5 text-sm text-fg outline-none transition placeholder:text-muted focus:border-tech focus:ring-4 focus:ring-tech/15';

export function Panel({ className, children }) {
  return <div className={cn('rounded-3xl border border-line bg-surface shadow-[var(--shadow-sm)]', className)}>{children}</div>;
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

export function FormField({ field, value, onChange }) {
  const { uploadImage } = useStore(useShallow((s) => ({ uploadImage: s.uploadImage })));
  const [busy, setBusy] = useState(false);
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
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} {busy ? 'Uploading…' : 'Upload image'}
          <input type="file" accept="image/*" hidden onChange={async (e) => {
            const f = e.target.files?.[0]; if (!f) return;
            setBusy(true);
            try { set(await uploadImage(f)); toast.success('Image uploaded'); } catch { toast.error('Upload failed'); }
            setBusy(false);
          }} />
        </label>
        {value && <img loading="lazy" decoding="async" src={value} alt="" className="size-12 rounded-xl border border-line object-cover" />}
      </div>
      <input className={cn(inputCls, 'mt-2')} placeholder="…or paste an image URL" value={value || ''} onChange={(e) => set(e.target.value)} />
    </div>
  );

  return (
    <label className="mb-4 block">
      {label}
      {field.type === 'textarea' ? <textarea className={cn(inputCls, 'min-h-28 resize-y')} value={value || ''} required={field.required} onChange={(e) => set(e.target.value)} />
        : field.type === 'select' ? (
          <select className={inputCls} value={value || ''} onChange={(e) => set(e.target.value)}>
            <option value="">Select…</option>{field.options.map((o) => <option key={o}>{o}</option>)}
          </select>
        ) : <input className={inputCls} type={field.type || 'text'} value={field.type === 'date' ? String(value ?? '').slice(0, 10) : (value ?? '')} required={field.required} onChange={(e) => set(field.type === 'number' ? Number(e.target.value) : e.target.value)} />}
    </label>
  );
}
