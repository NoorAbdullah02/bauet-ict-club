import { useEffect, useMemo, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { cn } from '../lib/cn';

// [text, token-class] segments; newlines are literal "\n"
const CODE = [
  ['// bauet-ict-club.js\n', 'c'],
  ['const ', 'k'], ['club', 'v'], [' = {\n', 'p'],
  ['  name', 'v'], [': ', 'p'], ["'BAUET ICT Club'", 's'], [',\n', 'p'],
  ['  motto', 'v'], [': ', 'p'], ["'Dream. Create. Inspire.'", 's'], [',\n', 'p'],
  ['  stack', 'v'], [': [', 'p'], ["'web'", 's'], [', ', 'p'], ["'ai'", 's'], [', ', 'p'], ["'iot'", 's'], [', ', 'p'], ["'cp'", 's'], ['],\n', 'p'],
  ['  est', 'v'], [': ', 'p'], ['2019', 'n'], [',\n', 'p'],
  ['};\n\n', 'p'],
  ['club', 'v'], ['.', 'p'], ['join', 'f'], ['(', 'p'], ['you', 'v'], [');', 'p'], [' // ✨ apply in 2 min', 'c'],
];

const TOTAL = CODE.reduce((n, [t]) => n + t.length, 0);

export default function CodeWindow({ className }) {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.3 });
  const [n, setN] = useState(0);
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (!inView) return;
    if (reduced) { setN(TOTAL); return; }
    let i = 0;
    const id = setInterval(() => { i += 1; setN(i); if (i >= TOTAL) clearInterval(id); }, 26);
    return () => clearInterval(id);
  }, [inView, reduced]);

  const parts = useMemo(() => {
    let left = n;
    return CODE.map(([t, k]) => { const s = t.slice(0, Math.max(0, left)); left -= t.length; return [s, k]; });
  }, [n]);

  return (
    <div ref={ref} className={cn('code-window', className)}>
      <div className="code-bar">
        <i style={{ background: '#FF5F57' }} /><i style={{ background: '#FEBC2E' }} /><i style={{ background: '#28C840' }} />
        <span>~/bauet-ict-club — zsh</span>
      </div>
      <pre className="code-body" aria-label="Code sample: the club object and a join call">
        {parts.map(([s, k], i) => s && <span key={i} className={`tok-${k}`}>{s}</span>)}
        <span className="code-cursor" />
      </pre>
      <div className="code-foot"><span className="tok-f">$</span> npm run join <span className="tok-c">— opens /join</span></div>
    </div>
  );
}
