import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, X } from 'lucide-react';
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

  const onDismiss = () => {
    setDismissed(true);
    try { sessionStorage.setItem('bauet_ribbon_dismissed', '1'); } catch {}
  };

  return (
    <div className="relative z-20 mx-auto mb-6 flex max-w-2xl items-center justify-between gap-3 rounded-full border border-tech/30 bg-surface/70 px-4 py-1.5 shadow-[0_0_20px_rgba(var(--tech-rgb),0.12)] backdrop-blur-md">
      <Link to={link} className="flex min-w-0 flex-1 items-center gap-2.5 text-xs text-fg">
        <span className="flex size-2 shrink-0 rounded-full bg-tech animate-pulse" />
        <span className="inline-flex shrink-0 items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-tech">
          <Sparkles size={11} /> {t('Active')}
        </span>
        <span className="truncate font-medium">{title}</span>
        <span className="hidden shrink-0 items-center gap-1 font-semibold text-accent sm:inline-flex">
          {cta} <ArrowRight size={12} />
        </span>
      </Link>
      <button onClick={onDismiss} aria-label="Dismiss banner" className="grid size-5 shrink-0 place-items-center rounded-full text-muted hover:text-fg">
        <X size={12} />
      </button>
    </div>
  );
}
