import { useEffect, useRef } from 'react';
import VanillaTilt from 'vanilla-tilt';
import { cn } from '../lib/cn';

export default function Tilt({ className, children, max = 8, ...rest }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    VanillaTilt.init(el, { max, speed: 500, glare: true, 'max-glare': 0.12, scale: 1.015 });
    return () => el.vanillaTilt?.destroy();
  }, [max]);

  return <div ref={ref} className={cn('spot', className)} {...rest}>{children}</div>;
}
