import { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Image, Maximize2, X, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import useStore from '../context/store';
import { thumb } from '../lib/img';
import { useT } from '../lib/i18n';

// High-resolution curated tech club moments used when user has not yet uploaded custom photos
const CURATED_MOMENTS = [
  {
    id: 'c1',
    title: 'National Hackathon Championship',
    category: 'Competition',
    date: '2025',
    image_url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80',
    description: 'Teams collaborating overnight, solving real-world challenges.',
  },
  {
    id: 'c2',
    title: 'Robotics & Embedded Systems Lab',
    category: 'Robotics',
    date: '2025',
    image_url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1200&q=80',
    description: 'Hands-on hardware prototyping and IoT development.',
  },
  {
    id: 'c3',
    title: 'AI & Machine Learning Workshop',
    category: 'Workshop',
    date: '2025',
    image_url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=80',
    description: 'Deep dive into modern neural architectures and practical LLM fine-tuning.',
  },
  {
    id: 'c4',
    title: 'Competitive Programming Bootcamp',
    category: 'Coding',
    date: '2025',
    image_url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80',
    description: 'Algorithmic problem solving and ICPC preparation sessions.',
  },
  {
    id: 'c5',
    title: 'Annual Tech Summit & Project Expo',
    category: 'Exhibition',
    date: '2025',
    image_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
    description: 'Showcasing student-engineered innovations to industry leaders.',
  },
  {
    id: 'c6',
    title: 'Cyber Security & Ethical Hacking Drill',
    category: 'Security',
    date: '2025',
    image_url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
    description: 'Capture-the-flag competitions and defense strategy workshops.',
  },
  {
    id: 'c7',
    title: 'Web & Mobile Dev Masterclass',
    category: 'Development',
    date: '2025',
    image_url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80',
    description: 'Full-stack software engineering with modern toolchains.',
  },
  {
    id: 'c8',
    title: 'Club Orientation & Grand Reception',
    category: 'Community',
    date: '2025',
    image_url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80',
    description: 'Welcoming the new generation of tech pioneers to BAUET ICT Club.',
  },
];

export default function MediaReel() {
  const t = useT();
  const { gallery } = useStore(useShallow((s) => ({ gallery: s.gallery })));
  const [activePhoto, setActivePhoto] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const trackRef = useRef(null);

  // Combine real database gallery items with curated high-res photos
  const items = useMemo(() => {
    const list = gallery && gallery.length > 0 ? gallery : CURATED_MOMENTS;
    // Ensure at least 6 items for a gorgeous infinite loop
    if (list.length < 6) return [...list, ...CURATED_MOMENTS.slice(0, 6 - list.length)];
    return list;
  }, [gallery]);

  // Duplicate for seamless 50% infinite translation
  const displayItems = useMemo(() => [...items, ...items], [items]);

  const openLightbox = (item, e) => {
    e.stopPropagation();
    setActivePhoto(item);
  };

  const nextPhoto = () => {
    if (!activePhoto) return;
    const idx = items.findIndex((x) => x.id === activePhoto.id);
    const nextIdx = (idx + 1) % items.length;
    setActivePhoto(items[nextIdx]);
  };

  const prevPhoto = () => {
    if (!activePhoto) return;
    const idx = items.findIndex((x) => x.id === activePhoto.id);
    const prevIdx = (idx - 1 + items.length) % items.length;
    setActivePhoto(items[prevIdx]);
  };

  return (
    <section className="relative overflow-hidden py-14 sm:py-20">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute -left-20 top-1/2 -z-10 size-96 -translate-y-1/2 rounded-full bg-accent/15 blur-[120px]" />
      <div className="pointer-events-none absolute -right-20 top-1/2 -z-10 size-96 -translate-y-1/2 rounded-full bg-tech/15 blur-[120px]" />

      <div className="container mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="section-tag !mb-2.5 inline-flex items-center gap-1.5 text-tech">
            <Sparkles size={13} className="animate-spin text-tech" style={{ animationDuration: '4s' }} />
            {t('Life in Action')}
          </div>
          <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-bold tracking-tight text-fg">
            Campus Life &amp; <span className="bg-clip-text text-transparent grad-anim" style={{ backgroundImage: 'var(--grad-text)' }}>Moments in Motion</span>
          </h2>
        </div>
        <p className="max-w-md text-sm text-fg2">
          From late-night hackathons to technical breakthroughs — experience the heartbeat of our community.
        </p>
      </div>

      {/* Infinite scrolling reel */}
      <div
        className="group relative w-full overflow-hidden py-4"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Left & Right gradient fade masks */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[var(--bg)] to-transparent sm:w-28" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[var(--bg)] to-transparent sm:w-28" />

        <div
          ref={trackRef}
          className="flex w-max gap-5 px-4"
          style={{
            animation: `marquee 42s linear infinite`,
            animationPlayState: isPaused ? 'paused' : 'running',
          }}
        >
          {displayItems.map((item, idx) => {
            const img = item.image_url ? thumb(item.image_url, 900) : item.image_url;
            return (
              <div
                key={`${item.id}-${idx}`}
                onClick={(e) => openLightbox(item, e)}
                className="group/card relative h-[240px] w-[290px] shrink-0 cursor-pointer overflow-hidden rounded-[24px] border border-line bg-surface shadow-[var(--shadow-md)] transition-all duration-500 hover:-translate-y-2 hover:border-tech/60 hover:shadow-[0_20px_40px_rgba(47,214,176,0.18)] sm:h-[290px] sm:w-[360px]"
              >
                {/* Image */}
                <img
                  src={img}
                  alt={item.title || 'Club moment'}
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover transition-transform duration-700 ease-out group-hover/card:scale-105"
                />

                {/* Cyber Gradient Overlay */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0A1A4A]/95 via-[#0A1A4A]/30 to-transparent opacity-85 transition-opacity duration-300 group-hover/card:opacity-95" />

                {/* Top Badge */}
                <div className="absolute left-4 top-4 flex items-center gap-2">
                  <span className="rounded-full border border-white/25 bg-black/40 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-md">
                    {item.category || 'Event'}
                  </span>
                  {item.date && (
                    <span className="rounded-full bg-tech/25 px-2.5 py-0.5 font-mono text-[10px] font-bold text-tech backdrop-blur-md">
                      {String(item.date).slice(0, 4)}
                    </span>
                  )}
                </div>

                {/* View button overlay */}
                <div className="absolute right-4 top-4 grid size-9 place-items-center rounded-full bg-white/20 text-white opacity-0 backdrop-blur-md transition-opacity duration-300 group-hover/card:opacity-100 hover:bg-white hover:text-[#0A1A4A]">
                  <Maximize2 size={15} />
                </div>

                {/* Bottom Details */}
                <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                  <h3 className="line-clamp-1 font-display text-lg font-bold leading-tight drop-shadow-sm sm:text-xl">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="mt-1 line-clamp-1 text-xs text-white/80">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Lightbox Modal */}
      <AnimatePresence>
        {activePhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActivePhoto(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md sm:p-6"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-3xl border border-white/20 bg-[#0B1628] shadow-2xl"
            >
              {/* Close Button */}
              <button
                onClick={() => setActivePhoto(null)}
                aria-label="Close"
                className="absolute right-4 top-4 z-20 grid size-10 place-items-center rounded-full bg-black/60 text-white transition hover:bg-white hover:text-black"
              >
                <X size={20} />
              </button>

              {/* Prev & Next Arrows */}
              <button
                onClick={prevPhoto}
                aria-label="Previous"
                className="absolute left-4 top-1/2 z-20 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white backdrop-blur-md transition hover:bg-white hover:text-black"
              >
                <ChevronLeft size={22} />
              </button>
              <button
                onClick={nextPhoto}
                aria-label="Next"
                className="absolute right-4 top-1/2 z-20 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white backdrop-blur-md transition hover:bg-white hover:text-black"
              >
                <ChevronRight size={22} />
              </button>

              {/* Lightbox Image */}
              <div className="relative aspect-[16/10] max-h-[70vh] w-full overflow-hidden bg-black/50">
                <img
                  src={activePhoto.image_url}
                  alt={activePhoto.title}
                  className="size-full object-contain"
                />
              </div>

              {/* Lightbox Info */}
              <div className="border-t border-white/10 bg-[#07122B] p-5 text-white">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-tech/20 px-3 py-1 font-mono text-xs font-semibold text-tech">
                      {activePhoto.category || 'Club Highlight'}
                    </span>
                    {activePhoto.date && (
                      <span className="font-mono text-xs text-white/60">
                        {String(activePhoto.date).slice(0, 10)}
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-xs text-white/50">
                    Use arrows to navigate
                  </span>
                </div>
                <h3 className="mt-2 font-display text-xl font-bold sm:text-2xl">
                  {activePhoto.title}
                </h3>
                {activePhoto.description && (
                  <p className="mt-1 text-sm text-white/70">
                    {activePhoto.description}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
