import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Megaphone, ArrowLeft, ArrowUpRight, Loader2, RotateCcw, Check, PartyPopper } from 'lucide-react';
import Backdrop3D from '../Backdrop3D';
import { Field, PhotoDrop, inputCls, useApplication, BATCHES } from './shared';
import { cn } from '../../lib/cn';

const DEPTS = [['ICE', 'Information & Communication'], ['CSE', 'Computer Science'], ['EEE', 'Electrical & Electronic'], ['CE', 'Civil'], ['ME', 'Mechanical']];
const ROLE = ['Be the voice of the club in your department', 'Spread news of events, contests and notices', 'Bring new members and ideas to the committee'];

const rules = (f) => (f.photo_url ? {} : { photo_url: 'A profile photo is required' });

export default function JoinAmbassador() {
  const { form, errors, set, patch, onPhoto, uploading, busy, done, submit, reset } = useApplication('ambassador', {}, rules);

  return (
    <div className="relative min-h-screen overflow-hidden pb-24 pt-32">
      <Backdrop3D variant="orbs" className="absolute inset-x-0 top-0 h-[34rem] opacity-80 [mask-image:linear-gradient(to_bottom,black_35%,transparent)]" />
      <div className="container relative grid items-start gap-12 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="lg:sticky lg:top-28">
          <Link to="/join" className="mb-6 inline-flex items-center gap-1.5 text-xs text-fg2 hover:text-accent"><ArrowLeft size={13} /> All ways to join</Link>
          <div className="section-tag !mb-4 !justify-start">Department ambassador</div>
          <h1 className="text-[clamp(2.6rem,6vw,4.4rem)] leading-[1] text-fg">Represent your <span className="bg-clip-text text-transparent grad-anim" style={{ backgroundImage: 'var(--grad-text)' }}>department.</span></h1>
          <p className="mt-6 max-w-md text-base leading-8 text-fg2">Ambassadors connect the club with every department. Selected ambassadors are listed on the Ambassadors page with their photo.</p>
          <ul className="mt-8 space-y-3">
            {ROLE.map((r) => <li key={r} className="flex items-start gap-3 text-sm text-fg2"><span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-tech/15 text-tech"><Check size={12} /></span>{r}</li>)}
          </ul>
        </div>

        <div className="rounded-[28px] border border-line bg-surface p-6 shadow-[var(--shadow-lg)] sm:p-9">
          <AnimatePresence mode="wait">
            {done ? (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="py-12 text-center">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 14 }}
                  className="mx-auto mb-6 grid size-20 place-items-center rounded-full text-white" style={{ background: 'var(--grad-btn)' }}><PartyPopper size={34} /></motion.div>
                <h3 className="text-3xl text-fg">Application received, {done.full_name.split(' ')[0]}!</h3>
                <p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-fg2">We’ll review your ambassador application and contact you at <b className="text-fg">{done.email}</b>.</p>
                <button onClick={reset} className="btn-outline mt-8"><RotateCcw size={15} /> New application</button>
              </motion.div>
            ) : (
              <motion.form key="form" noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
                <div className="prompt-line mb-6"><b>$</b> apply --role=ambassador<span className="code-cursor !h-[0.9em] !w-[6px]" /></div>
                <PhotoDrop value={form.photo_url} onFile={onPhoto} uploading={uploading} error={errors.photo_url} />

                <div className="mt-7">
                  <span className="mb-2.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-fg2">Your department <span className="text-accent">*</span></span>
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                    {DEPTS.map(([d, full]) => (
                      <button key={d} type="button" onClick={() => patch('department', d)} aria-pressed={form.department === d}
                        className={cn('rounded-2xl border p-3.5 text-left transition', form.department === d ? 'border-accent bg-accent/10 shadow-md' : 'border-line hover:border-muted')}>
                        <div className={cn('font-display text-xl', form.department === d ? 'text-accent' : 'text-fg')}>{d}</div>
                        <div className="mt-0.5 text-[11px] leading-4 text-muted">{full}</div>
                      </button>
                    ))}
                  </div>
                  {errors.department && <span className="mt-1.5 block text-xs text-red-500">{errors.department}</span>}
                </div>

                <div className="mt-7 grid gap-5 sm:grid-cols-2">
                  <Field label="Full name" required error={errors.full_name}><input className={inputCls(errors.full_name)} value={form.full_name} onChange={set('full_name')} placeholder="Your full name" autoComplete="name" /></Field>
                  <Field label="Student ID" required error={errors.student_id}><input className={inputCls(errors.student_id)} value={form.student_id} onChange={set('student_id')} placeholder="e.g. 2201010" /></Field>
                  <Field label="Batch" required error={errors.batch}>
                    <select className={inputCls(errors.batch)} value={form.batch} onChange={set('batch')}><option value="">Select batch</option>{BATCHES.map((b) => <option key={b} value={b}>{b}th batch</option>)}</select>
                  </Field>
                  <Field label="Gender"><select className={inputCls()} value={form.gender} onChange={set('gender')}><option value="">Prefer not to say</option><option>Male</option><option>Female</option><option>Other</option></select></Field>
                  <Field label="Phone" required error={errors.phone}><input className={inputCls(errors.phone)} type="tel" value={form.phone} onChange={set('phone')} placeholder="01XXXXXXXXX" autoComplete="tel" /></Field>
                  <Field label="Email" required error={errors.email}><input className={inputCls(errors.email)} type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" autoComplete="email" /></Field>
                </div>

                <Field label="How would you represent your department?" className="mt-6">
                  <textarea className={cn(inputCls(), 'min-h-28 resize-y')} maxLength={600} value={form.note} onChange={set('note')} placeholder="Your ideas, experience, and why you’d be a good ambassador…" />
                </Field>

                <button type="submit" disabled={busy || uploading} className="btn-primary mt-8 w-full disabled:opacity-60 sm:w-auto">
                  {busy ? <><Loader2 size={16} className="animate-spin" /> Submitting…</> : <>Apply as ambassador <ArrowUpRight size={16} /></>}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
