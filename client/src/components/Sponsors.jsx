import { useShallow } from 'zustand/react/shallow';
import useStore from '../context/store';

/** Partner strip for the home page; hidden until at least one sponsor exists. */
export default function Sponsors() {
  const sponsors = useStore(useShallow((s) => s.sponsors)) || [];
  if (!sponsors.length) return null;
  return (
    <section className="section !py-14">
      <div className="container">
        <div className="mb-8 text-center font-mono text-[11px] uppercase tracking-[0.22em] text-muted">// supported by</div>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
          {sponsors.map((s) => {
            const inner = s.logo_url
              ? <img loading="lazy" decoding="async" src={s.logo_url} alt={s.name} className="h-10 w-auto max-w-[9rem] object-contain opacity-70 grayscale transition duration-300 group-hover:opacity-100 group-hover:grayscale-0" />
              : <span className="font-display text-xl text-fg2 transition group-hover:text-accent">{s.name}</span>;
            return s.website
              ? <a key={s.id} href={s.website} target="_blank" rel="noopener noreferrer" title={s.name} className="group">{inner}</a>
              : <span key={s.id} title={s.name} className="group">{inner}</span>;
          })}
        </div>
      </div>
    </section>
  );
}
