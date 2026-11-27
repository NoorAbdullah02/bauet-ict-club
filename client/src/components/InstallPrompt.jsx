import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Download, X, Smartphone } from 'lucide-react';
import Logo from './Logo';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  // the banner sells the app to visitors; it has no place over the admin console's own buttons
  const isAdmin = useLocation().pathname.startsWith('/admin');

  useEffect(() => {
    if (isAdmin) { setVisible(false); return undefined; }
    // phones and tablets only: on a computer the banner just covers the page for an app nobody installs there
    if (typeof window !== 'undefined' && !window.matchMedia('(max-width: 900px), (pointer: coarse)').matches) return undefined;
    // Check if dismissed recently (within 7 days). Storage can be blocked in some browsers: never break the page because of it.
    let dismissedAt = null;
    try { dismissedAt = localStorage.getItem('bauet-pwa-dismissed'); } catch { /* storage blocked */ }
    if (dismissedAt && Date.now() - Number(dismissedAt) < 7 * 86400 * 1000) {
      return undefined;
    }

    let timer = 0;
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Wait 4 seconds after page load before displaying smoothly (only if still mobile/coarse)
      timer = setTimeout(() => {
        if (window.matchMedia('(max-width: 900px), (pointer: coarse)').matches) setVisible(true);
      }, 4000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => { window.removeEventListener('beforeinstallprompt', handler); clearTimeout(timer); };
  }, [isAdmin]);

  // let the floating chat button move up while this banner is on screen
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('install-banner', visible);
    return () => root.classList.remove('install-banner');
  }, [visible]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setVisible(false);
    try { localStorage.setItem('bauet-pwa-dismissed', String(Date.now())); } catch { /* storage blocked */ }
  };

  if (!visible || isAdmin) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md md:hidden animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-center gap-3.5 rounded-2xl border border-line bg-surface/95 p-3.5 shadow-2xl backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10 sm:p-4">
        <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-tr from-accent to-tech p-1.5 text-white shadow-md">
          <Logo kind="club" height={28} className="!filter-none" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="font-display text-xs font-bold text-fg sm:text-sm">
            Install BAUET ICT Club App
          </h4>
          <p className="line-clamp-1 text-[11px] text-muted">
            Add to home screen for fast offline access &amp; tickets
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleInstall}
            className="flex items-center gap-1 rounded-xl bg-accent px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-accent-hover"
          >
            <Download size={13} /> Install
          </button>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss banner"
            className="grid size-7 place-items-center rounded-lg text-muted transition hover:bg-alt hover:text-fg"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
