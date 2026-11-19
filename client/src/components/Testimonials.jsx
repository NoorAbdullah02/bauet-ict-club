import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Quote, ChevronLeft, ChevronRight, Star, GraduationCap } from 'lucide-react';
import { useT } from '../lib/i18n';

const TESTIMONIALS = [
  {
    id: 1,
    name: 'Sazzad Hossain',
    role: 'Software Engineer @ Tech Co.',
    batch: 'ICE 7th Batch (Ex-President)',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    quote: 'BAUET ICT Club gave me the foundation, the teamwork experience, and the real-world engineering mindset that directly landed me my dream tech job.',
    rating: 5,
  },
  {
    id: 2,
    name: 'Fariha Tasnim',
    role: 'AI Researcher & Data Scientist',
    batch: 'CSE 8th Batch (Ex-VP Technical)',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80',
    quote: 'The collaborative hackathons and peer coding circles at the club turned textbook theory into working machine learning prototypes. A life-changing community!',
    rating: 5,
  },
  {
    id: 3,
    name: 'Tanvir Ahmed',
    role: 'DevOps & Cloud Architect',
    batch: 'EEE 9th Batch (Executive Alum)',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    quote: 'From organizing national programming contests to shipping production projects, the leadership skills I learned here are unmatched.',
    rating: 5,
  },
];

export default function Testimonials() {
  const t = useT();
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return undefined;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [isPaused]);

  const next = () => setCurrent((c) => (c + 1) % TESTIMONIALS.length);
  const prev = () => setCurrent((c) => (c - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);

  const item = TESTIMONIALS[current];

  return (
    <section className="section relative overflow-hidden !py-16">
      {/* Background radial glow */}
      <div className="pointer-events-none absolute left-1/3 top-1/2 -z-10 size-80 -translate-y-1/2 rounded-full bg-accent/15 blur-[120px]" />

      <div className="container max-w-4xl">
        <div className="mb-10 text-center">
          <div className="section-tag !mb-2.5 inline-flex items-center gap-1.5 text-tech">
            <GraduationCap size={14} className="text-tech" />
            {t('Voices of Impact')}
          </div>
          <h2 className="text-[clamp(1.8rem,3.8vw,2.6rem)] font-bold tracking-tight text-fg">
            What Our <span className="bg-clip-text text-transparent grad-anim" style={{ backgroundImage: 'var(--grad-text)' }}>Alumni &amp; Members Say</span>
          </h2>
        </div>

        {/* Testimonial Card */}
        <div
          className="relative rounded-3xl border border-line bg-surface p-6 shadow-[var(--shadow-xl)] sm:p-10"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Quote icon watermark */}
          <Quote className="pointer-events-none absolute right-6 top-6 size-16 text-muted/15 sm:size-24" />

          <AnimatePresence mode="wait">
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              transition={{ duration: 0.4 }}
              className="relative z-10"
            >
              {/* Star Rating */}
              <div className="mb-4 flex items-center gap-1 text-amber-400">
                {Array.from({ length: item.rating }, (_, i) => (
                  <Star key={i} size={16} className="fill-amber-400" />
                ))}
              </div>

              {/* Quote text */}
              <p className="font-display text-lg font-medium leading-relaxed text-fg sm:text-2xl">
                &ldquo;{item.quote}&rdquo;
              </p>

              {/* Author Info */}
              <div className="mt-8 flex items-center gap-4 border-t border-line pt-6">
                <img
                  src={item.avatar}
                  alt={item.name}
                  className="size-14 rounded-full object-cover ring-2 ring-tech/30"
                />
                <div>
                  <h4 className="font-display text-base font-bold text-fg sm:text-lg">
                    {item.name}
                  </h4>
                  <p className="text-xs font-semibold text-tech sm:text-sm">
                    {item.role}
                  </p>
                  <p className="font-mono text-[11px] text-muted">
                    {item.batch}
                  </p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Controls: Arrows + Dots */}
          <div className="mt-8 flex items-center justify-between border-t border-line/60 pt-4">
            {/* Dots */}
            <div className="flex gap-2">
              {TESTIMONIALS.map((t, idx) => (
                <button
                  key={t.id}
                  onClick={() => setCurrent(idx)}
                  aria-label={`Go to testimonial ${idx + 1}`}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    current === idx ? 'w-7 bg-tech' : 'w-2 bg-line hover:bg-muted'
                  }`}
                />
              ))}
            </div>

            {/* Arrows */}
            <div className="flex gap-2">
              <button
                onClick={prev}
                aria-label="Previous testimonial"
                className="grid size-9 place-items-center rounded-full border border-line bg-surface text-fg2 transition hover:border-tech hover:text-tech"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={next}
                aria-label="Next testimonial"
                className="grid size-9 place-items-center rounded-full border border-line bg-surface text-fg2 transition hover:border-tech hover:text-tech"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
