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

  const onDismiss = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDismissed(true);
    try { sessionStorage.setItem('bauet_ribbon_dismissed', '1'); } catch {}
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.98 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto mb-6 flex justify-center px-4"
      >
        <div className="group relative inline-flex max-w-full items-center gap-2.5 rounded-full border border-line bg-surface/85 py-1.5 pl-2.5 pr-2 shadow-xs backdrop-blur-md transition-all duration-300 hover:border-accent/40 hover:bg-surface hover:shadow-md">
          {/* Badge */}
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-tech/30 bg-tech-light px-2.5 py-0.5 font-mono text-[10.5px] font-semibold uppercase tracking-wider text-tech">
            <span className="size-1.5 rounded-full bg-tech animate-pulse" />
            <BadgeIcon size={11} />
            <span>{badgeLabel}</span>
          </span>

          {/* Divider */}
          <span className="hidden h-3.5 w-px bg-line sm:block" />

          {/* Clickable text and CTA link */}
          <Link
            to={link}
            className="flex min-w-0 items-center gap-2 text-left focus:outline-hidden"
          >
            <span className="truncate text-xs font-medium text-fg transition-colors group-hover:text-accent sm:text-[13px]">
              {title}
            </span>

            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-accent transition-all duration-200 group-hover:text-accent-hover sm:ml-1">
              <span>{cta}</span>
              <ArrowRight size={12} className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </span>
          </Link>

          {/* Close button */}
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss announcement"
            title={t('Dismiss')}
            className="ml-0.5 grid size-5 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-fg/5 hover:text-fg"
          >
            <X size={12} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
