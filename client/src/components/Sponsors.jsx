import { Link } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { Handshake, ArrowUpRight, ShieldCheck, Sparkles } from 'lucide-react';
import { thumb } from '../lib/img';
import useStore from '../context/store';
import { useT } from '../lib/i18n';

// Sample partner placeholder cards used to welcome potential sponsors & partners
const FEATURED_PARTNERS = [
  {
    id: 'p1',
    name: 'BAUET Innovation Center',
    tier: 'Institutional Partner',
    logo_url: '/logos/bauet.png',
    website: 'https://bauet.ac.bd',
  },
  {
    id: 'p2',
    name: 'Tech Community Bangladesh',
    tier: 'Community Partner',
    logo_url: null,
    website: null,
  },
];

export default function Sponsors() {
  const t = useT();
  const sponsors = useStore(useShallow((s) => s.sponsors)) || [];

  const list = sponsors.length > 0 ? sponsors : FEATURED_PARTNERS;

  return (
    <section className="section relative overflow-hidden !py-16">
      {/* Soft background ambient glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 size-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-tech/10 blur-[130px]" />

      <div className="container">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6 border-b border-line pb-8">
          <div>
            <div className="section-tag !mb-2.5 inline-flex items-center gap-1.5 text-tech">
              <Handshake size={14} className="text-tech" />
              {t('Partnerships & Collaborations')}
            </div>
            <h2 className="text-[clamp(1.8rem,3.8vw,2.6rem)] font-bold tracking-tight text-fg">
              Powered by <span className="bg-clip-text text-transparent grad-anim" style={{ backgroundImage: 'var(--grad-text)' }}>Visionary Partners</span>
            </h2>
            <p className="mt-2 max-w-xl text-sm text-fg2">
              We collaborate with forward-thinking tech enterprises, university research labs, and startup incubators.
            </p>
          </div>

          <Link
            to="/contact"
            className="group inline-flex items-center gap-2 rounded-full border border-tech/40 bg-tech/10 px-5 py-2.5 text-xs font-semibold text-tech transition-all duration-300 hover:border-tech hover:bg-tech hover:text-[#061440]"
          >
            <Sparkles size={14} /> Partner With Us <ArrowUpRight size={14} className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        {/* Partner Logo Cards Grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {list.map((s) => {
            const cardContent = (
              <div className="group relative flex h-28 flex-col items-center justify-center rounded-2xl border border-line bg-surface p-4 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-tech/50 hover:shadow-md sm:h-32">
                {s.logo_url ? (
                  <img
                    loading="lazy"
                    decoding="async"
                    src={thumb(s.logo_url, 320)}
                    alt={s.name}
                    className="max-h-12 w-auto max-w-[85%] object-contain opacity-85 transition-opacity duration-300 group-hover:opacity-100"
                  />
                ) : (
                  <span className="font-display text-sm font-bold text-fg transition-colors group-hover:text-accent sm:text-base">
                    {s.name}
                  </span>
                )}
                {s.tier && (
                  <span className="mt-2 rounded-full bg-alt px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted group-hover:text-tech">
                    {s.tier}
                  </span>
                )}
              </div>
            );

            return s.website ? (
              <a
                key={s.id}
                href={s.website}
                target="_blank"
                rel="noopener noreferrer"
                title={`${s.name} — Visit partner website`}
                className="block"
              >
                {cardContent}
              </a>
            ) : (
              <div key={s.id} title={s.name}>
                {cardContent}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
