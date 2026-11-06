import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import SafeBoundary from './SafeBoundary';
import useStore from '../context/store';
import { hasWebGL } from '../lib/webgl';
import { cn } from '../lib/cn';

const Scene3D = lazy(() => import('../scenes/Scene3D'));

/** Smaller screens, data-saver and low-core devices get a lighter scene. */
function useLite() {
  return typeof window !== 'undefined' && (
    window.innerWidth < 768 || navigator.connection?.saveData || (navigator.hardwareConcurrency || 8) <= 6 || (navigator.deviceMemory || 8) <= 4
  );
}

/** Very weak devices never download the 3D bundle (about 800 kB) at all. */
const weakDevice = () => typeof navigator !== 'undefined' && ((navigator.hardwareConcurrency || 8) <= 2 || (navigator.deviceMemory || 8) <= 2 || !!navigator.connection?.saveData);

/** Lazy, WebGL-guarded 3D canvas that pauses rendering when scrolled out of view. */
export default function Backdrop3D({ variant = 'orbs', className }) {
  const dark = useStore((s) => s.resolvedTheme) === 'dark';
  const ref = useRef(null);
  const [active, setActive] = useState(true);
  const [ready, setReady] = useState(false);
  const [lost, setLost] = useState(false);
  const [visible, setVisible] = useState(true);
  const lite = useLite();

  useEffect(() => {
    if (weakDevice()) return undefined;
    // start only after the page has loaded and the browser is idle, so the first paint and scroll never compete with three.js parsing
    let id;
    const go = () => { id = 'requestIdleCallback' in window ? requestIdleCallback(() => setReady(true), { timeout: 4500 }) : setTimeout(() => setReady(true), 2500); };
    if (document.readyState === 'complete') go(); else window.addEventListener('load', go, { once: true });
    return () => { window.removeEventListener('load', go); if (id) ('cancelIdleCallback' in window ? cancelIdleCallback(id) : clearTimeout(id)); };
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { rootMargin: '100px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // no rendering while the tab is in the background
  useEffect(() => {
    const on = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);

  // weak GPU? if the first seconds of rendering run below ~22 fps, drop the 3D layer so the page never janks or freezes
  const live = ready && !lost && active && visible;
  useEffect(() => {
    if (!live) return;
    let frames = 0, raf = 0, start = 0;
    const tick = (t) => {
      if (!start) start = t;
      frames += 1;
      if (t - start >= 3000) { if ((frames * 1000) / (t - start) < 22) setLost(true); return; }
      raf = requestAnimationFrame(tick);
    };
    const warm = setTimeout(() => { raf = requestAnimationFrame(tick); }, 1500);
    return () => { clearTimeout(warm); cancelAnimationFrame(raf); };
  }, [live]);

  if (!ready || lost || !hasWebGL() || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return <div ref={ref} className={className} />;

  return (
    <div ref={ref} className={cn('pointer-events-none', className)} aria-hidden="true">
      <SafeBoundary>
        <Suspense fallback={null}><Scene3D variant={variant} dark={dark} active={active && visible} lite={lite} onLost={() => setLost(true)} /></Suspense>
      </SafeBoundary>
    </div>
  );
}
