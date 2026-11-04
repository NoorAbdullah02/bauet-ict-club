import { cn } from '../lib/cn';

const SRC = { club: ['/logos/ict-club', 523, 298], crest: ['/logos/bauet', 209, 200] };

/** Transparent-background club / university logos (WebP with PNG fallback). */
export default function Logo({ kind = 'club', height = 40, className, priority = false }) {
  const [base, w, h] = SRC[kind];
  const width = Math.round((height * w) / h);
  // phones and retina screens (2x/3x) get the sharper 3x file; everything else keeps the small one
  const sizes = `${width}px`;
  return (
    <picture>
      <source srcSet={`${base}.webp ${w}w, ${base}@3x.webp ${w * 3}w`} sizes={sizes} type="image/webp" />
      <img src={`${base}.png`} srcSet={`${base}.png ${w}w, ${base}@3x.png ${w * 3}w`} sizes={sizes} width={width} height={height} alt={kind === 'club' ? 'BAUET ICT Club' : 'BAUET'}
        loading={priority ? 'eager' : 'lazy'} decoding="async" className={cn('logo-img w-auto select-none', className)} style={{ height }} draggable="false" />
    </picture>
  );
}
