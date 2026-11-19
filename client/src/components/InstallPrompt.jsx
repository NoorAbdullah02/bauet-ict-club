import { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import Logo from './Logo';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Check if dismissed recently (within 7 days)
    const dismissedAt = localStorage.getItem('bauet-pwa-dismissed');
    if (dismissedAt && Date.now() - Number(dismissedAt) < 7 * 86400 * 1000) {
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Wait 4 seconds after page load before displaying smoothly
      setTimeout(() => setVisible(true), 4000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

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
    localStorage.setItem('bauet-pwa-dismissed', String(Date.now()));
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-in fade-in slide-in-from-bottom-5 duration-300">
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
