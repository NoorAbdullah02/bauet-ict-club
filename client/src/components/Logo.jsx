import { cn } from '../lib/cn';

const SRC = { club: ['/logos/ict-club', 523, 298], crest: ['/logos/bauet', 209, 200] };

/** Transparent-background club / university logos (WebP with PNG fallback). */
export default function Logo({ kind = 'club', height = 40, className, priority = false }) {
  const [base, w, h] = SRC[kind];
  return (
    <picture>
      <source srcSet={`${base}.webp`} type="image/webp" />
      <img src={`${base}.png`} width={Math.round((height * w) / h)} height={height} alt={kind === 'club' ? 'BAUET ICT Club' : 'BAUET'}
        loading={priority ? 'eager' : 'lazy'} decoding="async" className={cn('logo-img w-auto select-none', className)} style={{ height }} draggable="false" />
    </picture>
  );
}
