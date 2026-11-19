import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { ImagePlus, Loader2 } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import useStore from '../../context/store';
import { cn } from '../../lib/cn';
import { compressImage } from '../../lib/compressImage';
import { scrollToFirstError } from '../../lib/forms';

export { POSTS } from '../../lib/posts';
export const DEPARTMENTS = ['ICE', 'CSE', 'EEE', 'CE', 'ME', 'BBA', 'LLB', 'ENG', 'ELL', 'Other'];
export const BATCHES = Array.from({ length: 19 }, (_, i) => String(12 + i));

export const inputCls = (err) => cn(
  'w-full rounded-xl border bg-bg/60 px-4 py-3 text-sm text-fg outline-none transition placeholder:text-muted',
  'focus:border-tech focus:ring-4 focus:ring-tech/15',
  err ? 'border-red-500/70' : 'border-line hover:border-muted'
);

export function Field({ label, required, error, children, className }) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.14em] text-fg2">
        {label}{required && <span className="text-accent">*</span>}
      </span>
      {children}
      {error && <span className="mt-1.5 block text-xs text-red-500">{error}</span>}
    </label>
  );
}

export function PhotoDrop({ value, onFile, uploading, error, optional }) {
  const ref = useRef(null);
  const [drag, setDrag] = useState(false);
  const pick = (f) => f && onFile(f);

  return (
    <div>
      <span className="mb-1.5 flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.14em] text-fg2">
        Profile photo {optional ? <span className="normal-case tracking-normal text-muted">(optional)</span> : <span className="text-accent">*</span>}
      </span>
      <button type="button" onClick={() => ref.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }}
        className={cn(
          'group relative flex w-full items-center gap-5 rounded-2xl border-2 border-dashed p-4 text-left transition',
          drag ? 'border-tech bg-tech/10' : error ? 'border-red-500/70' : 'border-line hover:border-tech/60 hover:bg-tech/5'
        )}>
        <span className="relative grid size-28 shrink-0 place-items-center overflow-hidden rounded-2xl bg-alt ring-1 ring-line">
          {value ? <img loading="lazy" decoding="async" src={value} alt="Your photo" className="size-full object-cover" /> : <ImagePlus className="text-muted transition group-hover:text-tech" />}
          {uploading && <span className="absolute inset-0 grid place-items-center bg-bg/70"><Loader2 className="animate-spin text-tech" size={20} /></span>}
        </span>
        <span>
          <span className={cn('block text-sm font-semibold', value && !uploading ? 'text-emerald-600' : 'text-fg')} aria-live="polite">{uploading ? 'Uploading…' : value ? 'Photo uploaded ✓ Click to change' : 'Drop your photo or click to browse'}</span>
          <span className="mt-0.5 block text-xs text-muted">JPG or PNG · max 3MB · a clear face photo works best</span>
        </span>
        <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => pick(e.target.files?.[0])} />
      </button>
      {error && <span className="mt-1.5 block text-xs text-red-500">{error}</span>}
    </div>
  );
}

const BASE = { full_name: '', student_id: '', batch: '', department: '', phone: '', email: '', gender: '', birth_date: '', note: '', photo_url: '' };

/** Shared state, validation and submit flow for both application types. */
export function useApplication(type, extra, extraRules) {
  const { submitRegistration, uploadApplicantPhoto } = useStore(useShallow((s) => ({ submitRegistration: s.submitRegistration, uploadApplicantPhoto: s.uploadApplicantPhoto })));
  const initial = { ...BASE, ...extra };
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  const patch = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); };
  const set = (k) => (e) => patch(k, e.target.value);

  const onPhoto = async (file) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return toast.error('Please choose a JPG or PNG image');
    if (file.size > 15 * 1024 * 1024) return toast.error('Image must be under 15MB');
    setUploading(true);
    try {
      const small = await compressImage(file, { max: 1200 }); // phone photos shrink to a few hundred KB
      if (small.size > 3 * 1024 * 1024) { setUploading(false); return toast.error('Image is still too large, please pick another photo'); }
      patch('photo_url', await uploadApplicantPhoto(small));
      toast.success('Photo uploaded');
    }
    catch (e) { toast.error(e.response?.data?.error || 'Photo upload failed'); }
    setUploading(false);
  };

  const baseErrors = (f) => {
    const e = {};
    if (f.full_name.trim().length < 2) e.full_name = 'Enter your full name';
    if (f.student_id.trim().length < 2) e.student_id = 'Student ID is required';
    if (!f.batch) e.batch = 'Select your batch';
    if (!f.department) e.department = 'Select your department';
    if (!/^(\+?88)?01[3-9]\d{8}$/.test(f.phone.replace(/[\s-]/g, ''))) e.phone = 'Enter a valid mobile number (01XXXXXXXXX)';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = 'Enter a valid email';
    return e;
  };

  const validate = (keys) => {
    const all = { ...baseErrors(form), ...extraRules(form) };
    const e = keys ? Object.fromEntries(Object.entries(all).filter(([k]) => keys.includes(k))) : all;
    setErrors(e);
    return e;
  };

  const submit = async () => {
    const e = validate();
    if (Object.keys(e).length) {
      toast.error('Please fix the highlighted fields');
      scrollToFirstError();
      return false;
    }
    setBusy(true);
    try {
      const res = await submitRegistration({ ...form, type });
      setDone(res.registration);
    } catch (err) {
      const d = err.response?.data;
      if (d?.fields) {
        setErrors(d.fields);
        scrollToFirstError();
      }
      toast.error(d?.error || 'Could not submit. Please try again.');
    }
    setBusy(false);
  };

  const reset = () => { setForm(initial); setErrors({}); setDone(null); };
  return { form, errors, set, patch, onPhoto, uploading, busy, done, submit, validate, reset };
}
