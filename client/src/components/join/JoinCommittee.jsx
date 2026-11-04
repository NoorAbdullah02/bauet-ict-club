import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, ArrowRight, ArrowLeft, ArrowUpRight, Loader2, BadgeCheck, ScrollText, MessagesSquare, Star, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import Backdrop3D from '../Backdrop3D';
import { Field, PhotoDrop, inputCls, useApplication, POSTS, DEPARTMENTS, BATCHES } from './shared';
import { cn } from '../../lib/cn';

const STEPS = [
  { icon: ScrollText, t: 'Apply', d: 'Fill the form & upload your photo' },
  { icon: MessagesSquare, t: 'Interview', d: 'Short chat with the current committee' },
  { icon: Star, t: 'Selection', d: 'Admin picks the team for the session' },
  { icon: BadgeCheck, t: 'You’re featured', d: 'Your photo & post go live on Team page' },
];

const rules = (f) => {
  const e = {};
  if (!f.post) e.post = 'Select the post you want';
  if (!f.photo_url) e.photo_url = 'A profile photo is required';
  return e;
};

export default function JoinCommittee() {
  const app = useApplication('committee', { post: '' }, rules);
  const { form, errors, set, onPhoto, uploading, busy, done, submit, validate, reset } = app;
  const [step, setStep] = useState(0);

  const next = () => {
    const e = validate(['photo_url', 'full_name', 'student_id', 'batch', 'department', 'phone', 'email']);
    if (!Object.keys(e).length) setStep(1);
  };

  return (
    <div className="relative min-h-screen overflow-hidden pb-24 pt-32">
      <div className="pointer-events-none absolute -left-40 top-10 size-[34rem] rounded-full bg-accent/30 blur-[120px]" />
      <div className="pointer-events-none absolute -right-32 bottom-0 size-[28rem] rounded-full bg-tech/20 blur-[120px]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{ backgroundImage: 'linear-gradient(var(--fg) 1px, transparent 1px), linear-gradient(90deg, var(--fg) 1px, transparent 1px)', backgroundSize: '56px 56px' }} />

      <div className="container relative grid items-start gap-14 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="lg:sticky lg:top-28">
          <Link to="/join" className="mb-6 inline-flex items-center gap-1.5 text-xs text-fg2 hover:text-accent"><ArrowLeft size={13} /> All ways to join</Link>
          <br />
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/50 px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-tech backdrop-blur">
            <Crown size={13} /> Committee applications
          </span>
          <h2 className="mt-6 text-[clamp(2.6rem,6vw,4.6rem)] leading-[0.98] text-fg">
            Lead the club.<br />
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'var(--grad-text)' }}>Shape the session.</span>
          </h2>
          <p className="mt-6 max-w-md text-base leading-8 text-fg2">
            Apply for a post on the executive committee. Selected members are published on our Team page with their photo and role for the session.
          </p>

          {/* roles card: always readable; the 3D scene is only an optional backdrop behind it */}
          <div className="relative my-10 overflow-hidden rounded-[28px] border border-line bg-surface/40 backdrop-blur-sm">
            <Backdrop3D variant="committee" className="absolute inset-0 opacity-60" />
            <div className="relative p-6 font-mono text-[12.5px] leading-7 sm:p-7">
              <div className="mb-3 text-muted">{'// open posts this session'}</div>
              {[['President', '1 seat'], ['Vice President', 'Technical · Administration'], ['General Secretary', 'open'], ['Joint / Organizing Secretary', 'open'], ['Treasurer', 'open'], ['Executive Member', 'open']].map(([role, seats]) => (
                <div key={role} className="flex items-baseline justify-between gap-4 border-b border-dashed border-line/70 py-1.5 last:border-0">
                  <span className="text-fg">{role}</span>
                  <span className="text-right text-tech">{seats}</span>
                </div>
              ))}
              <div className="mt-4 text-muted"><b className="font-medium text-tech">$</b> apply --role=committee</div>
            </div>
          </div>

          <ol className="relative mt-10 space-y-6 border-l border-line pl-8">
            {STEPS.map((s, i) => (
              <motion.li key={s.t} initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="relative">
                <span className="absolute -left-[3.15rem] grid size-9 place-items-center rounded-full border border-line bg-bg text-tech shadow-[0_0_20px_rgba(61,227,255,0.25)]">
                  <s.icon size={15} />
                </span>
                <div className="font-display text-lg text-fg">{s.t}</div>
                <div className="text-sm text-fg2">{s.d}</div>
              </motion.li>
            ))}
          </ol>
        </div>

        <div className="relative rounded-[28px] border border-line bg-surface/70 p-6 shadow-[var(--shadow-xl)] backdrop-blur-2xl sm:p-9">
          <div className="pointer-events-none absolute inset-x-10 -top-px h-px bg-gradient-to-r from-transparent via-tech to-transparent" />
          <AnimatePresence mode="wait">
            {done ? (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="py-12 text-center">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 12 }}
                  className="mx-auto mb-6 grid size-20 place-items-center rounded-full text-white" style={{ background: 'var(--grad-btn)' }}>
                  <Crown size={34} />
                </motion.div>
                <h3 className="text-3xl text-fg">Application received, {done.full_name.split(' ')[0]}!</h3>
                <p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-fg2">
                  You applied for <b className="text-fg">{done.post}</b>. We’ll contact you at <b className="text-fg">{done.email}</b> about the interview.
                </p>
                <button onClick={() => { reset(); setStep(0); }} className="btn-outline mt-8"><RotateCcw size={15} /> New application</button>
              </motion.div>
            ) : (
              <motion.form key="form" noValidate onSubmit={(e) => { e.preventDefault(); step === 0 ? next() : submit(); }}>
                <div className="prompt-line mb-5"><b>$</b> apply --role=committee --session=next<span className="code-cursor !h-[0.9em] !w-[6px]" /></div>
                <div className="mb-8 flex items-center gap-3">
                  {['Photo & details', 'Post & note'].map((l, i) => (
                    <div key={l} className="flex flex-1 items-center gap-3">
                      <span className={cn('grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold transition',
                        step >= i ? 'text-white' : 'border border-line text-muted')} style={step >= i ? { background: 'var(--grad-btn)' } : undefined}>{i + 1}</span>
                      <span className={cn('text-sm font-medium', step >= i ? 'text-fg' : 'text-muted')}>{l}</span>
                      {i === 0 && <span className="h-px flex-1 bg-line"><motion.span className="block h-full bg-tech" animate={{ width: step ? '100%' : '0%' }} /></span>}
                    </div>
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  {step === 0 ? (
                    <motion.div key="s0" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="grid gap-5 sm:grid-cols-2">
                      <div className="sm:col-span-2"><PhotoDrop value={form.photo_url} onFile={onPhoto} uploading={uploading} error={errors.photo_url} /></div>
                      <Field label="Full name" required error={errors.full_name}><input className={inputCls(errors.full_name)} value={form.full_name} onChange={set('full_name')} placeholder="Your full name" autoComplete="name" /></Field>
                      <Field label="Student ID" required error={errors.student_id}><input className={inputCls(errors.student_id)} value={form.student_id} onChange={set('student_id')} placeholder="e.g. 2201010" /></Field>
                      <Field label="Batch" required error={errors.batch}>
                        <select className={inputCls(errors.batch)} value={form.batch} onChange={set('batch')}><option value="">Select batch</option>{BATCHES.map((b) => <option key={b} value={b}>{b}th batch</option>)}</select>
                      </Field>
                      <Field label="Department" required error={errors.department}>
                        <select className={inputCls(errors.department)} value={form.department} onChange={set('department')}><option value="">Select department</option>{DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}</select>
                      </Field>
                      <Field label="Phone" required error={errors.phone}><input className={inputCls(errors.phone)} type="tel" value={form.phone} onChange={set('phone')} placeholder="01XXXXXXXXX" autoComplete="tel" /></Field>
                      <Field label="Email" required error={errors.email}><input className={inputCls(errors.email)} type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" autoComplete="email" /></Field>
                      <Field label="Gender" className="sm:col-span-2">
                        <select className={inputCls()} value={form.gender} onChange={set('gender')}><option value="">Prefer not to say</option><option>Male</option><option>Female</option><option>Other</option></select>
                      </Field>
                    </motion.div>
                  ) : (
                    <motion.div key="s1" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="space-y-6">
                      <Field label="Apply for post" required error={errors.post}>
                        <select className={inputCls(errors.post)} value={form.post} onChange={set('post')}><option value="">Select a position</option>{POSTS.map((p) => <option key={p}>{p}</option>)}</select>
                      </Field>
                      <Field label="Why this post?">
                        <textarea className={cn(inputCls(), 'min-h-28 resize-y')} maxLength={600} value={form.note} onChange={set('note')} placeholder="Your experience and ideas for the club…" />
                      </Field>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="mt-8 flex items-center justify-between gap-3">
                  {step === 1 ? <button type="button" onClick={() => setStep(0)} className="btn-outline"><ArrowLeft size={15} /> Back</button> : <span />}
                  {step === 0 ? (
                    <button type="submit" className="btn-primary">Continue <ArrowRight size={16} /></button>
                  ) : (
                    <button type="submit" disabled={busy || uploading} className="btn-primary disabled:opacity-60">
                      {busy ? <><Loader2 size={16} className="animate-spin" /> Submitting…</> : <>Submit application <ArrowUpRight size={16} /></>}
                    </button>
                  )}
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
