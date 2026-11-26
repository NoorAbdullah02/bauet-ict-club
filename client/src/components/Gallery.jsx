import { useState, useMemo, useEffect, useRef } from 'react';
import { thumb } from '../lib/img';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Image, X, ChevronLeft, ChevronRight, Calendar, Tag } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import useStore from '../context/store';
import EmptyState from './EmptyState';

const fadeUp = {
  hidden: { opacity: 0, y: 35 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { duration: 0.5, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] } }),
};

export default function Gallery() {
  const { gallery } = useStore(useShallow((s) => ({ gallery: s.gallery })));
  const settings = useStore((s) => s.settings);
  const [lightbox, setLightbox] = useState(null);
  const [filter, setFilter] = useState('all');
  const [ref, inView] = useInView({ threshold: 0.05, triggerOnce: true });
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);

  const categories = useMemo(() => ['all', ...new Set(gallery.map((g) => g.category).filter(Boolean))], [gallery]);
  const filtered = useMemo(() => {
    let items = [...gallery].sort((a, b) => new Date(b.created_at || b.date || 0) - new Date(a.created_at || a.date || 0));
    if (filter !== 'all') items = items.filter((g) => g.category === filter);
    return items;
  }, [gallery, filter]);

  // Navigate lightbox
  const nextItem = () => {
    if (!lightbox || filtered.length <= 1) return;
    const curIdx = filtered.findIndex((x) => x.id === lightbox.id);
    const nextIdx = (curIdx + 1) % filtered.length;
    setLightbox(filtered[nextIdx]);
  };

  const prevItem = () => {
    if (!lightbox || filtered.length <= 1) return;
    const curIdx = filtered.findIndex((x) => x.id === lightbox.id);
    const prevIdx = (curIdx - 1 + filtered.length) % filtered.length;
    setLightbox(filtered[prevIdx]);
  };

  // Keyboard controls
  useEffect(() => {
    if (!lightbox) return undefined;
    const handleKey = (e) => {
      if (e.key === 'Escape') setLightbox(null);
      if (e.key === 'ArrowRight') nextItem();
      if (e.key === 'ArrowLeft') prevItem();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightbox, filtered]);

  // Touch Swipe handlers
  const onTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };
  const onTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };
  const onTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const dist = touchStartX.current - touchEndX.current;
    if (dist > 50) nextItem(); // swiped left -> next
    if (dist < -50) prevItem(); // swiped right -> prev
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const currentIdx = lightbox ? filtered.findIndex((x) => x.id === lightbox.id) : -1;

  return (
    <section id="gallery" className="section section-alt min-h-[70vh]" ref={ref}>
      <div className="container">
        <motion.div className="section-header" initial="hidden" animate={inView ? 'visible' : 'hidden'} variants={fadeUp} custom={0}>
          <div className="section-tag">{settings?.galleryTag || 'Visual Stories'}</div>
          <h2 className="section-title">{settings?.galleryTitle || 'Gallery & Moments'}</h2>
          <p className="section-desc">{settings?.galleryDesc || 'Snapshots of innovation, teamwork, and tech milestones at BAUET'}</p>
          <div className="divider" />
        </motion.div>

        {/* Filter categories */}
        {categories.length > 1 && (
          <motion.div
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
            variants={fadeUp}
            custom={1}
            className="mb-8 flex flex-wrap justify-center gap-2"
          >
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`rounded-full px-5 py-2 text-xs font-semibold capitalize transition-all duration-200 ${
                  filter === cat
                    ? 'bg-accent text-white shadow-md shadow-accent/25'
                    : 'border border-line bg-surface text-fg2 hover:border-muted hover:text-fg'
                }`}
              >
                {cat === 'all' ? 'All Moments' : cat}
              </button>
            ))}
          </motion.div>
        )}

        {filtered.length === 0 && (
          <EmptyState
            icon={Image}
            title="No photos yet"
            hint="Photos from our ongoing workshops, tech meets, and contests will be showcased here."
            className="my-10"
          />
        )}

        {/* Responsive Mobile-Friendly Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((g, i) => (
            <motion.div
              key={g.id}
              custom={i + 2}
              initial="hidden"
              animate={inView ? 'visible' : 'hidden'}
              variants={fadeUp}
              onClick={() => setLightbox(g)}
              className="group relative aspect-[4/3] cursor-pointer overflow-hidden rounded-2xl border border-line bg-surface shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-tech/50 hover:shadow-lg sm:rounded-3xl"
              whileHover={{ scale: 1.02 }}
            >
              {g.image_url && (
                <img
                  src={thumb(g.image_url, 720)}
                  alt={g.title || 'Club photo'}
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover transition-transform duration-500 group-hover:scale-108"
                />
              )}

              {/* Scrim */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0A1A4A]/90 via-[#0A1A4A]/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 max-sm:opacity-75" />

              {/* Overlay Details */}
              <div className="absolute inset-x-0 bottom-0 p-3 text-white transition-opacity duration-300 sm:p-4 sm:opacity-0 sm:group-hover:opacity-100">
                {g.category && (
                  <span className="mb-1 inline-block rounded bg-white/20 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider backdrop-blur">
                    {g.category}
                  </span>
                )}
                <h3 className="line-clamp-1 font-display text-xs font-bold leading-tight sm:text-sm">
                  {g.title || 'Club Activity'}
                </h3>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Swipeable & Keyboard-Friendly Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(null)}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 p-3 backdrop-blur-md sm:p-6"
          >
            {/* Top Bar with Counter & Close Button */}
            <div
              className="absolute left-4 top-4 z-20 flex items-center gap-3 text-white"
              onClick={(e) => e.stopPropagation()}
            >
              {currentIdx >= 0 && (
                <span className="rounded-full bg-white/10 px-3 py-1 font-mono text-xs backdrop-blur">
                  {currentIdx + 1} / {filtered.length}
                </span>
              )}
            </div>

            <button
              onClick={() => setLightbox(null)}
              aria-label="Close"
              className="absolute right-4 top-4 z-20 grid size-11 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white hover:text-black"
            >
              <X size={22} />
            </button>

            {/* Previous & Next Buttons */}
            {filtered.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    prevItem();
                  }}
                  aria-label="Previous image"
                  className="absolute left-3 top-1/2 z-20 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white hover:text-black sm:left-6"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    nextItem();
                  }}
                  aria-label="Next image"
                  className="absolute right-3 top-1/2 z-20 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white hover:text-black sm:right-6"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}

            {/* Modal Content */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-3xl border border-white/15 bg-[#07122B] shadow-2xl"
            >
              <div className="relative aspect-[16/10] max-h-[72vh] w-full overflow-hidden bg-black/60">
                <img
                  src={thumb(lightbox.image_url, 1600)}
                  alt={lightbox.title || ''}
                  className="size-full object-contain"
                />
              </div>

              {/* Caption Footer */}
              <div className="border-t border-white/10 bg-[#07122B] p-4 text-white sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-display text-base font-bold sm:text-xl">
                    {lightbox.title || 'Club Activity'}
                  </h3>
                  <div className="flex items-center gap-2">
                    {lightbox.category && (
                      <span className="flex items-center gap-1 rounded-full bg-tech/20 px-2.5 py-0.5 font-mono text-[11px] text-tech">
                        <Tag size={11} /> {lightbox.category}
                      </span>
                    )}
                    {lightbox.date && (
                      <span className="flex items-center gap-1 font-mono text-xs text-white/60">
                        <Calendar size={11} /> {String(lightbox.date).slice(0, 10)}
                      </span>
                    )}
                  </div>
                </div>
                {lightbox.description && (
                  <p className="mt-1 text-xs text-white/70 sm:text-sm">
                    {lightbox.description}
                  </p>
                )}
                <div className="mt-2 text-right font-mono text-[10px] text-white/40">
                  Swipe or use ← → arrow keys to navigate
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
