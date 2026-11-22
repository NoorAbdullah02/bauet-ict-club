import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, X, Calendar, Bell } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import useStore from '../context/store';
import { useT } from '../lib/i18n';

export default function AnnouncementBar() {
  const t = useT();
  const { events, notices } = useStore(useShallow((s) => ({ events: s.events, notices: s.notices })));
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      const isDismissed = sessionStorage.getItem('bauet_ribbon_dismissed');
      if (!isDismissed) setDismissed(false);
    } catch {
      setDismissed(false);
    }
  }, []);

  if (dismissed) return null;

  const nextEvent = events
    .filter((e) => new Date(e.date) >= new Date())
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0];
  const pinnedNotice = notices.find((n) => n.pinned);

  const title = nextEvent
    ? `${t('Upcoming')}: ${nextEvent.title}`
    : pinnedNotice
      ? pinnedNotice.title
      : t('Applications are open for Spring 2026 session!');
  const link = nextEvent ? `/events/${nextEvent.id}` : pinnedNotice ? '/notices' : '/join';
  const cta = nextEvent ? t('Register now') : pinnedNotice ? t('View notice') : t('Apply now');
  const badgeLabel = nextEvent ? t('Upcoming') : pinnedNotice ? t('Notice') : t('Active');
  const BadgeIcon = nextEvent ? Calendar : pinnedNotice ? Bell : Sparkles;

  const onDismiss = () => {
    setDismissed(true);
    try { sessionStorage.setItem('bauet_ribbon_dismissed', '1'); } catch {}
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.98 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="group relative z-20 mx-auto mb-7 max-w-2xl px-3"
      >
        {/* Ambient atmospheric glow */}
        <div className="pointer-events-none absolute -inset-1 rounded-full bg-gradient-to-r from-emerald-500/25 via-blue-500/30 to-teal-500/25 blur-md opacity-60 transition-opacity duration-500 group-hover:opacity-90 dark:opacity-40 dark:group-hover:opacity-75" />

        {/* Gradient border container */}
        <div className="relative rounded-full p-[1px] bg-gradient-to-r from-emerald-500/40 via-blue-500/60 to-teal-500/40 shadow-[0_4px_24px_rgba(31,79,216,0.14)] dark:shadow-[0_4px_30px_rgba(47,214,176,0.18)]">
          {/* Glass inner content */}
          <div className="relative flex items-center justify-between gap-3 overflow-hidden rounded-full bg-white/85 px-3 py-1.5 backdrop-blur-xl transition-all duration-300 dark:bg-[#07132e]/90 sm:px-4 sm:py-2">
            {/* Shimmer light streak passing across on hover */}
            <div className="pointer-events-none absolute -inset-full top-0 block -rotate-12 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 transition-all duration-1000 group-hover:translate-x-full group-hover:opacity-100 dark:via-white/10" />

            <Link
              to={link}
              className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3 text-left focus:outline-hidden"
            >
              {/* Radar live pulsing dot */}
              <span className="relative flex size-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
              </span>

              {/* Tag pill badge */}
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 font-mono text-[10.5px] font-bold uppercase tracking-wider text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/20 dark:text-emerald-300">
                <BadgeIcon size={11} className="text-emerald-600 dark:text-emerald-400" />
                <span>{badgeLabel}</span>
              </span>

              {/* Headline text */}
              <span className="truncate text-xs font-semibold text-fg transition-colors duration-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 sm:text-[13px]">
                {title}
              </span>

              {/* Right CTA button pill */}
              <span className="ml-auto hidden shrink-0 items-center gap-1.5 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow-xs transition-all duration-200 group-hover:bg-blue-700 group-hover:shadow-[0_0_14px_rgba(37,99,235,0.45)] dark:bg-blue-500 dark:text-slate-950 dark:hover:bg-blue-400 sm:inline-flex">
                <span>{cta}</span>
                <ArrowRight size={12} className="transition-transform duration-200 group-hover:translate-x-0.5" />
              </span>
            </Link>

            {/* Dismiss button */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDismiss();
              }}
              aria-label="Dismiss banner"
              title={t('Dismiss')}
              className="grid size-6 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-black/5 hover:text-fg dark:hover:bg-white/10"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
