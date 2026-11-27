import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Quote, ChevronLeft, ChevronRight, Star, GraduationCap } from 'lucide-react';
import { useT } from '../lib/i18n';
import useStore from '../context/store';
import { portrait } from '../lib/img';

/**
 * "Voices of Impact": what alumni and members say. Loaded from the bootstrap payload
 * (/api/bootstrap -> testimonials) so Home makes zero duplicate API requests.
 */
export default function Testimonials() {
  const t = useT();
  const raw = useStore((s) => s.testimonials);
  const items = useMemo(() => (Array.isArray(raw) ? raw : []).filter((x) => x.active !== false), [raw]);
  const [idx, setIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused || items.length < 2) return undefined;
    const timer = setInterval(() => setIdx((prev) => (prev + 1) % items.length), 6000);
    return () => clearInterval(timer);
  }, [isPaused, items.length]);

  if (items.length === 0) return null;

  const current = Math.min(idx, items.length - 1);
  const item = items[current];
  const name = item.name || 'Member';
  const rating = Math.max(1, Math.min(5, Number(item.rating) || 5));
  const next = () => setIdx((c) => (c + 1) % items.length);
  const prev = () => setIdx((c) => (c - 1 + items.length) % items.length);

  return (
    <section className="section relative overflow-hidden !py-16">
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

        <div
          className="relative rounded-3xl border border-line bg-surface p-6 shadow-[var(--shadow-xl)] sm:p-10"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <Quote className="pointer-events-none absolute right-6 top-6 size-16 text-muted/15 sm:size-24" />

          <AnimatePresence mode="wait">
            <motion.div
              key={item.id || current}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              transition={{ duration: 0.4 }}
              className="relative z-10"
            >
              <div className="mb-4 flex items-center gap-1 text-amber-400">
                {Array.from({ length: rating }, (_, i) => (
                  <Star key={i} size={16} className="fill-amber-400" />
                ))}
              </div>

              <p className="font-display text-lg font-medium leading-relaxed text-fg sm:text-2xl">
                &ldquo;{item.quote}&rdquo;
              </p>

              <div className="mt-8 flex items-center gap-4 border-t border-line pt-6">
                {item.image_url ? (
                  <img src={portrait(item.image_url, 160)} alt={name} loading="lazy" decoding="async" className="size-14 rounded-full object-cover ring-2 ring-tech/30" />
                ) : (
                  <div className="grid size-14 place-items-center rounded-full bg-accent/12 font-display text-xl text-accent ring-2 ring-tech/30">{name.charAt(0).toUpperCase()}</div>
                )}
                <div className="min-w-0">
                  <h3 className="font-display text-base font-bold text-fg sm:text-lg">{name}</h3>
                  {item.role && <p className="text-xs font-semibold text-tech sm:text-sm">{item.role}</p>}
                  {item.batch && <p className="font-mono text-[11px] text-muted">{item.batch}</p>}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {items.length > 1 && (
            <div className="mt-8 flex items-center justify-between border-t border-line/60 pt-4">
              <div className="flex gap-2">
                {items.map((tItem, i) => (
                  <button
                    key={tItem.id || i}
                    onClick={() => setIdx(i)}
                    aria-label={`Go to testimonial ${i + 1}`}
                    className={`h-2 rounded-full transition-all duration-300 ${current === i ? 'w-7 bg-tech' : 'w-2 bg-line hover:bg-muted'}`}
                  />
                ))}
              </div>

              <div className="flex gap-2">
                <button onClick={prev} aria-label="Previous testimonial" className="grid size-9 place-items-center rounded-full border border-line bg-surface text-fg2 transition hover:border-tech hover:text-tech">
                  <ChevronLeft size={16} />
                </button>
                <button onClick={next} aria-label="Next testimonial" className="grid size-9 place-items-center rounded-full border border-line bg-surface text-fg2 transition hover:border-tech hover:text-tech">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
