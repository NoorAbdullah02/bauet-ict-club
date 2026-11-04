import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import SafeBoundary from './SafeBoundary';
import useStore from '../context/store';
import { hasWebGL } from '../lib/webgl';
import { cn } from '../lib/cn';

const Scene3D = lazy(() => import('../scenes/Scene3D'));

/** Smaller screens, data-saver and low-core devices get a lighter scene. */
function useLite() {
  return typeof window !== 'undefined' && (
    window.innerWidth < 768 || navigator.connection?.saveData || (navigator.hardwareConcurrency || 8) <= 4
  );
}

/** Lazy, WebGL-guarded 3D canvas that pauses rendering when scrolled out of view. */
export default function Backdrop3D({ variant = 'orbs', className }) {
  const dark = useStore((s) => s.theme) === 'dark';
  const ref = useRef(null);
  const [active, setActive] = useState(true);
  const [ready, setReady] = useState(false);
  const lite = useLite();

  useEffect(() => {
    const go = () => setReady(true);
    const id = 'requestIdleCallback' in window ? requestIdleCallback(go, { timeout: 1200 }) : setTimeout(go, 400);
    return () => ('cancelIdleCallback' in window ? cancelIdleCallback(id) : clearTimeout(id));
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { rootMargin: '100px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  if (!ready || !hasWebGL() || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return <div ref={ref} className={className} />;

  return (
    <div ref={ref} className={cn('pointer-events-none', className)} aria-hidden="true">
      <SafeBoundary>
        <Suspense fallback={null}><Scene3D variant={variant} dark={dark} active={active} lite={lite} /></Suspense>
      </SafeBoundary>
    </div>
  );
}
