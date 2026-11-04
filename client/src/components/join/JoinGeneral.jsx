import { motion, AnimatePresence } from 'framer-motion';
import { Users, Check, Loader2, ArrowUpRight, ArrowLeft, PartyPopper, RotateCcw, Zap, Gift, MessageCircleHeart } from 'lucide-react';
import { Link } from 'react-router-dom';
import Backdrop3D from '../Backdrop3D';
import { Field, PhotoDrop, inputCls, useApplication, DEPARTMENTS, BATCHES } from './shared';
import { cn } from '../../lib/cn';

const INTERESTS = [
  'Web Development', 'AI & ML', 'Competitive Programming', 'Cyber Security', 'Robotics & IoT', 'App Development',
  'UI / UX Design', 'Graphics & Video', 'Photography', 'Content Writing', 'Event Management', 'Public Speaking',
];
const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const PERKS = [
  { icon: Zap, t: 'Free workshops', d: 'Hands-on sessions every month' },
  { icon: Gift, t: 'Member perks', d: 'Contests, swag & early access' },
  { icon: MessageCircleHeart, t: 'Real community', d: 'Friends, mentors, project teams' },
];

const rules = (f) => (f.interests.length ? {} : { interests: 'Pick at least one area' });

export default function JoinGeneral() {
  const app = useApplication('general', { interests: [], experience: '' }, rules);
  const { form, errors, set, patch, onPhoto, uploading, busy, done, submit, reset } = app;

  const toggle = (i) => patch('interests', form.interests.includes(i) ? form.interests.filter((x) => x !== i) : [...form.interests, i].slice(0, 8));

  return (
    <div className="relative min-h-screen overflow-hidden pb-24 pt-32">
      <Backdrop3D variant="general" className="absolute inset-x-0 top-0 h-[40rem] [mask-image:linear-gradient(to_bottom,black_40%,transparent)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-line to-transparent" />
      <div className="pointer-events-none absolute -right-24 top-20 size-96 rounded-full bg-tech/15 blur-[100px]" />
      <div className="pointer-events-none absolute -left-24 bottom-10 size-96 rounded-full bg-accent/15 blur-[100px]" />

      <div className="container relative">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <Link to="/join" className="mb-6 inline-flex items-center gap-1.5 text-xs text-fg2 hover:text-accent"><ArrowLeft size={13} /> All ways to join</Link><br />
          <span className="inline-flex items-center gap-2 rounded-full bg-tech/10 px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-tech">
            <Users size={13} /> General membership
          </span>
          <h2 className="mt-6 text-[clamp(2.4rem,5.5vw,4rem)] leading-[1] text-fg">
            Become a member in <span className="italic text-accent">two minutes.</span>
          </h2>
          <p className="mt-5 text-base leading-8 text-fg2">No election, no pressure — tell us what you love and we’ll bring you into the community.</p>
        </div>

        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_1.4fr]">
          <div className="grid gap-4 self-start sm:grid-cols-3 lg:grid-cols-1">
            {PERKS.map((p, i) => (
              <motion.div key={p.t} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="spot rounded-3xl border border-line bg-surface p-6 transition hover:-translate-y-1 hover:border-tech/50 hover:shadow-[var(--shadow-lg)]">
                <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-accent to-tech text-white"><p.icon size={20} /></span>
                <div className="mt-5 font-display text-xl text-fg">{p.t}</div>
                <div className="mt-1 text-sm text-fg2">{p.d}</div>
              </motion.div>
            ))}
          </div>

          <div className="rounded-[28px] border border-line bg-surface p-6 shadow-[var(--shadow-lg)] sm:p-9">
            <AnimatePresence mode="wait">
              {done ? (
                <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="py-12 text-center">
                  <motion.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 14 }}
                    className="mx-auto mb-6 grid size-20 place-items-center rounded-full text-white" style={{ background: 'var(--grad-btn)', color: 'var(--btn-fg)' }}>
                    <PartyPopper size={34} />
                  </motion.div>
                  <h3 className="text-3xl text-fg">Welcome aboard, {done.full_name.split(' ')[0]}!</h3>
                  <p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-fg2">We’ve got your request and will confirm your membership at <b className="text-fg">{done.email}</b>.</p>
                  <button onClick={reset} className="btn-outline mt-8"><RotateCcw size={15} /> Add another member</button>
                </motion.div>
              ) : (
                <motion.form key="form" noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
                  <div className="prompt-line mb-6"><b>$</b> join --member --interests=&lt;you&gt;<span className="code-cursor !h-[0.9em] !w-[6px]" /></div>
                  <div className="grid gap-5 sm:grid-cols-2">
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
                  </div>

                  <div className="mt-7">
                    <span className="mb-2.5 flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.14em] text-fg2">
                      What excites you? <span className="text-accent">*</span><span className="ml-auto normal-case tracking-normal text-muted">{form.interests.length}/8</span>
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {INTERESTS.map((i) => {
                        const on = form.interests.includes(i);
                        return (
                          <motion.button key={i} type="button" whileTap={{ scale: 0.93 }} onClick={() => toggle(i)} aria-pressed={on}
                            className={cn('flex items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] font-medium transition',
                              on ? 'border-transparent text-white shadow-lg' : 'border-line bg-bg/60 text-fg2 hover:border-tech hover:text-tech')}
                            style={on ? { background: 'var(--grad-btn)', color: 'var(--btn-fg)' } : undefined}>
                            {on && <Check size={13} />}{i}
                          </motion.button>
                        );
                      })}
                    </div>
                    {errors.interests && <span className="mt-1.5 block text-xs text-red-500">{errors.interests}</span>}
                  </div>

                  <div className="mt-6 grid gap-5 sm:grid-cols-2">
                    <Field label="Experience level">
                      <div className="flex gap-2">
                        {LEVELS.map((l) => (
                          <button key={l} type="button" onClick={() => patch('experience', form.experience === l ? '' : l)} aria-pressed={form.experience === l}
                            className={cn('flex-1 rounded-xl border px-2 py-3 text-xs font-medium transition',
                              form.experience === l ? 'border-accent bg-accent/10 text-accent' : 'border-line text-fg2 hover:border-muted')}>{l}</button>
                        ))}
                      </div>
                    </Field>
                    <Field label="Gender">
                      <select className={inputCls()} value={form.gender} onChange={set('gender')}><option value="">Prefer not to say</option><option>Male</option><option>Female</option><option>Other</option></select>
                    </Field>
                  </div>

                  <div className="mt-6"><PhotoDrop value={form.photo_url} onFile={onPhoto} uploading={uploading} optional /></div>

                  <Field label="Why do you want to join?" className="mt-6">
                    <textarea className={cn(inputCls(), 'min-h-24 resize-y')} maxLength={600} value={form.note} onChange={set('note')} placeholder="What do you hope to learn or build?" />
                  </Field>

                  <button type="submit" disabled={busy || uploading} className="btn-primary mt-8 w-full disabled:opacity-60 sm:w-auto">
                    {busy ? <><Loader2 size={16} className="animate-spin" /> Submitting…</> : <>Join as member <ArrowUpRight size={16} /></>}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
