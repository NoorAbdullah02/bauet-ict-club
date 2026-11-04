import { Link } from 'react-router-dom';
import { Facebook, Mail, Phone, MapPin, ArrowUp, ArrowUpRight, Crown, Users, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import useStore from '../context/store';
import Logo from './Logo';

const EXPLORE = [['Home', '/'], ['About', '/about'], ['Events', '/events'], ['Notices', '/notices'], ['Team', '/team'], ['Gallery', '/gallery'], ['Awards', '/achievements']];
const INVOLVED = [['Join the club', '/join'], ['Committee member', '/join/committee'], ['General member', '/join/general'], ['Contact us', '/contact']];

const link = 'group flex items-center gap-2 text-sm text-white/70 transition hover:text-white';
const social = 'grid size-11 place-items-center rounded-full border border-white/20 bg-white/10 text-white transition hover:-translate-y-1 hover:bg-white hover:text-[#2B1B8A]';
const prefetchAdmin = () => import('../admin/AdminApp');

function Col({ title, items }) {
  return (
    <nav aria-label={title}>
      <h4 className="mb-5 font-mono text-[11px] uppercase tracking-[0.22em] text-white/50">{title}</h4>
      <ul className="space-y-3">
        {items.map(([label, to]) => (
          <li key={to}><Link to={to} className={link}><span className="h-px w-0 bg-white transition-all duration-300 group-hover:w-4" />{label}</Link></li>
        ))}
      </ul>
    </nav>
  );
}

export default function Footer() {
  const settings = useStore((s) => s.settings);
  const s = settings?.socialLinks || {};
  const email = s.email || 'ictclubbauet@gmail.com';
  const phone = s.phone || '01707-533471';

  return (
    <footer className="px-3 pb-3 pt-10 sm:px-5 sm:pb-5">
      <div className="relative isolate mx-auto max-w-[1400px] overflow-hidden rounded-[36px] text-white sm:rounded-[44px]"
        style={{ background: 'linear-gradient(135deg, #1B1464 0%, #3B2BB8 38%, #2B6BFF 72%, #17B7FF 100%)' }}>
        {/* soft light blobs + dotted texture */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -left-24 -top-24 size-[26rem] rounded-full bg-[#FF7AE0]/35 blur-[110px]" />
          <div className="absolute -bottom-28 right-0 size-[30rem] rounded-full bg-[#3DE3FF]/30 blur-[120px]" />
          <div className="absolute inset-0 opacity-[0.18]" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '26px 26px', maskImage: 'linear-gradient(to bottom, black, transparent 80%)' }} />
        </div>

        {/* top: headline + CTAs */}
        <div className="flex flex-wrap items-end justify-between gap-8 px-7 pb-10 pt-14 sm:px-14 sm:pt-16">
          <div className="max-w-2xl">
            <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.24em] text-white/60">// ready when you are</div>
            <h2 className="font-display text-[clamp(2.2rem,5vw,4rem)] leading-[1.02]">Let’s build the future, <span className="italic text-[#FFE27A]">together.</span></h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/join/committee" className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-[#2B1B8A] shadow-xl transition hover:-translate-y-0.5 hover:shadow-2xl"><Crown size={16} /> Committee</Link>
            <Link to="/join/general" className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/20"><Users size={16} /> General member</Link>
          </div>
        </div>

        {/* middle: brand card + links + contact */}
        <div className="mx-4 grid gap-10 rounded-[28px] border border-white/15 bg-white/[0.08] p-7 backdrop-blur-xl sm:mx-8 sm:p-10 lg:grid-cols-[1.4fr_0.8fr_0.9fr_1.2fr]">
          <div>
            <div className="inline-flex items-center gap-4 rounded-2xl bg-white p-4 shadow-xl">
              <Logo kind="crest" height={58} className="!filter-none" />
              <span className="h-10 w-px bg-slate-200" />
              <Logo kind="club" height={62} className="!filter-none" />
            </div>
            <p className="mt-5 max-w-xs text-sm font-semibold text-white">BAUET ICT Club</p>
            <p className="mt-1 max-w-xs text-sm leading-7 text-white/70">Bangladesh Army University of Engineering &amp; Technology, Rajshahi. Workshops, hackathons, contests and a community of builders.</p>
            <div className="mt-5 flex gap-2.5">
              {s.fb && <a href={s.fb} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className={social}><Facebook size={17} /></a>}
              <a href={`mailto:${email}`} aria-label="Email" className={social}><Mail size={17} /></a>
              <a href={`tel:${phone}`} aria-label="Phone" className={social}><Phone size={17} /></a>
            </div>
          </div>

          <Col title="Explore" items={EXPLORE} />
          <Col title="Get involved" items={INVOLVED} />

          <div>
            <h4 className="mb-5 font-mono text-[11px] uppercase tracking-[0.22em] text-white/50">Contact</h4>
            <ul className="space-y-4 text-sm text-white/80">
              <li><a href={`mailto:${email}`} className="flex items-start gap-3 text-white/85 transition hover:text-white"><Mail size={16} className="mt-0.5 shrink-0 text-[#FFE27A]" /><span className="break-all">{email}</span></a></li>
              <li><a href={`tel:${phone}`} className="flex items-start gap-3 text-white/85 transition hover:text-white"><Phone size={16} className="mt-0.5 shrink-0 text-[#FFE27A]" />{phone}</a></li>
              <li><a href="https://maps.google.com/?q=BAUET+Qadirabad+Cantonment+Natore" target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 text-white/85 transition hover:text-white"><MapPin size={16} className="mt-0.5 shrink-0 text-[#FFE27A]" />BAUET, Qadirabad Cantonment, Natore</a></li>
            </ul>
            <Link to="/contact" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-white underline decoration-white/40 underline-offset-4 transition hover:decoration-white">Send us a message <ArrowUpRight size={15} /></Link>
          </div>
        </div>

        {/* bottom bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-7 py-6 text-xs text-white/65 sm:px-14">
          <span>© {new Date().getFullYear()} BAUET ICT Club · All rights reserved</span>
          <span className="flex items-center gap-1.5">Made with <Heart size={12} className="fill-[#FF7AE0] text-[#FF7AE0]" /> by the ICT Club · <Link to="/admin" onMouseEnter={prefetchAdmin} onFocus={prefetchAdmin} className="text-white/85 hover:text-white">Admin login</Link></span>
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Back to top" className="flex items-center gap-1.5 font-medium text-white transition hover:-translate-y-0.5">Back to top <span className="grid size-7 place-items-center rounded-full bg-white/15"><ArrowUp size={13} /></span></button>
        </div>
      </div>
    </footer>
  );
}
