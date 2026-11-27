import { cn } from '../lib/cn';

const SRC = { club: ['/logos/ict-club', 523, 298], crest: ['/logos/bauet', 209, 200] };

/** Transparent-background club / university logos (WebP with PNG fallback). */
export default function Logo({ kind = 'club', height = 40, className, priority = false }) {
  const [base, w, h] = SRC[kind];
  const width = Math.round((height * w) / h);
  const sizes = `${width}px`;
  // 523w / 209w is already >3x denser than navbar & hero sizes; only pull @3x for huge print/banner usage
  const hiRes = height > 120;
  return (
    <picture>
      <source srcSet={hiRes ? `${base}.webp ${w}w, ${base}@3x.webp ${w * 3}w` : `${base}.webp ${w}w`} sizes={sizes} type="image/webp" />
      <img src={`${base}.png`} srcSet={hiRes ? `${base}.png ${w}w, ${base}@3x.png ${w * 3}w` : `${base}.png ${w}w`} sizes={sizes} width={width} height={height} alt={kind === 'club' ? 'BAUET ICT Club' : 'BAUET'}
        loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : undefined} decoding="async" className={cn('logo-img w-auto select-none', className)} style={{ height }} draggable="false" />
    </picture>
  );
}
