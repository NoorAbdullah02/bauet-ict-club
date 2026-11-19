import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Film, Sparkles, ExternalLink, X, Volume2, ShieldCheck, Award } from 'lucide-react';
import { useT } from '../lib/i18n';

const HIGHLIGHT_VIDEOS = [
  {
    id: 'v1',
    title: 'BAUET ICT Club — Innovate, Build, Lead',
    tag: 'Official Trailer',
    duration: '2:15',
    embedId: 'dQw4w9WgXcQ', // Can be replaced with actual club channel video ID
    youtubeUrl: 'https://www.youtube.com',
    thumbnail: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80',
    description: 'A glimpse into the energy, collaborative hackathons, and creative projects at BAUET ICT Club.',
  },
  {
    id: 'v2',
    title: 'National Hackathon & Robotics Championship Highlights',
    tag: 'Hackathon Recap',
    duration: '3:40',
    embedId: 'L_LUpnjgPso',
    youtubeUrl: 'https://www.youtube.com',
    thumbnail: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=1200&q=80',
    description: '36 hours of non-stop code, engineering prototypes, and high-stakes pitch presentations.',
  },
  {
    id: 'v3',
    title: 'AI, Machine Learning & Modern Web Workshop',
    tag: 'Hands-on Bootcamp',
    duration: '4:10',
    embedId: 'fJ9rUzIMcZQ',
    youtubeUrl: 'https://www.youtube.com',
    thumbnail: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80',
    description: 'Hands-on sessions led by industry alumni and faculty advisors on state-of-the-art tech.',
  },
];

export default function VideoShowcase() {
  const t = useT();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [modalVideo, setModalVideo] = useState(null);

  const active = HIGHLIGHT_VIDEOS[selectedIdx];

  return (
    <section className="section relative overflow-hidden bg-alt/40 !py-16 sm:!py-24">
      {/* Glow elements */}
      <div className="pointer-events-none absolute -right-24 top-1/4 -z-10 size-80 rounded-full bg-accent/20 blur-[120px]" />
      <div className="pointer-events-none absolute -left-24 bottom-1/4 -z-10 size-80 rounded-full bg-tech/20 blur-[120px]" />

      <div className="container">
        {/* Section Header */}
        <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="section-tag !mb-2.5 inline-flex items-center gap-1.5 text-tech">
              <Film size={14} className="text-tech" />
              {t('Club In Motion')}
            </div>
            <h2 className="text-[clamp(2rem,4.5vw,3.2rem)] font-bold tracking-tight text-fg">
              Watch Our <span className="bg-clip-text text-transparent grad-anim" style={{ backgroundImage: 'var(--grad-text)' }}>Journey Unfold</span>
            </h2>
            <p className="mt-3 max-w-xl text-base text-fg2">
              Step inside our workshops, code sprints, and celebrations. Experience how we turn ideas into production-ready software and hardware.
            </p>
          </div>
          <a
            href="https://www.youtube.com"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline !py-2.5 text-sm"
          >
            Club Channel <ExternalLink size={15} />
          </a>
        </div>

        {/* Video Player Grid */}
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Main Cinema Screen (8 Cols) */}
          <div className="lg:col-span-8">
            <div className="group relative aspect-[16/9] w-full overflow-hidden rounded-[28px] border border-line bg-[#07122B] shadow-[var(--shadow-xl)]">
              {isPlaying ? (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${active.embedId}?autoplay=1&rel=0&modestbranding=1`}
                  title={active.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="size-full border-0"
                />
              ) : (
                <>
                  {/* Poster Image */}
                  <img
                    src={active.thumbnail}
                    alt={active.title}
                    className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />

                  {/* Gradient Scrim */}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#061440]/90 via-[#061440]/40 to-transparent" />

                  {/* Tech Grid Pattern */}
                  <div
                    className="pointer-events-none absolute inset-0 opacity-15"
                    style={{
                      backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
                      backgroundSize: '24px 24px',
                    }}
                  />

                  {/* Play Button Pulsing */}
                  <div className="absolute inset-0 grid place-items-center">
                    <button
                      onClick={() => setIsPlaying(true)}
                      aria-label="Play video"
                      className="group/btn relative grid size-20 place-items-center rounded-full text-white shadow-2xl transition-transform duration-300 hover:scale-110 sm:size-24"
                      style={{ background: 'var(--grad-btn)' }}
                    >
                      <span className="absolute -inset-3 animate-ping rounded-full bg-accent/40 opacity-75" />
                      <Play size={32} className="ml-1 fill-white text-white drop-shadow-md sm:size-36" />
                    </button>
                  </div>

                  {/* Bottom Video Information */}
                  <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-tech/25 px-3 py-1 font-mono text-[11px] font-bold text-tech backdrop-blur-md">
                        {active.tag}
                      </span>
                      <span className="rounded-full bg-white/20 px-3 py-1 font-mono text-[11px] text-white backdrop-blur-md">
                        {active.duration}
                      </span>
                    </div>
                    <h3 className="mt-3 font-display text-xl font-bold leading-tight sm:text-2xl">
                      {active.title}
                    </h3>
                    <p className="mt-1.5 line-clamp-2 max-w-2xl text-xs text-white/80 sm:text-sm">
                      {active.description}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Video Playlist Sidebar (4 Cols) */}
          <div className="flex flex-col justify-between gap-3 lg:col-span-4">
            <div className="space-y-3">
              {HIGHLIGHT_VIDEOS.map((item, idx) => {
                const isSelected = selectedIdx === idx;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSelectedIdx(idx);
                      setIsPlaying(false);
                    }}
                    className={`group flex w-full items-center gap-4 rounded-2xl border p-3.5 text-left transition-all duration-300 ${
                      isSelected
                        ? 'border-tech bg-surface shadow-[var(--shadow-md)] ring-2 ring-tech/20'
                        : 'border-line bg-surface/60 hover:border-line hover:bg-surface'
                    }`}
                  >
                    {/* Small thumbnail */}
                    <div className="relative aspect-[16/10] w-24 shrink-0 overflow-hidden rounded-xl bg-alt">
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="size-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 grid place-items-center bg-black/40">
                        <Play size={14} className="fill-white text-white" />
                      </div>
                      <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 font-mono text-[9px] text-white">
                        {item.duration}
                      </span>
                    </div>

                    {/* Meta */}
                    <div className="min-w-0 flex-1">
                      <span
                        className={`font-mono text-[10px] font-semibold uppercase tracking-wider ${
                          isSelected ? 'text-tech' : 'text-muted'
                        }`}
                      >
                        {item.tag}
                      </span>
                      <h4 className="mt-0.5 line-clamp-2 font-display text-sm font-semibold leading-snug text-fg">
                        {item.title}
                      </h4>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Quick Feature Callout Card */}
            <div className="mt-2 rounded-2xl border border-line bg-surface p-4">
              <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-tech/15 text-tech">
                  <Award size={20} />
                </span>
                <div>
                  <h4 className="font-display text-sm font-bold text-fg">Have video content to share?</h4>
                  <p className="text-xs text-fg2">Send tech talks or demo videos to the committee to be featured.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
