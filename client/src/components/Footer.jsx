import { Link } from 'react-router-dom';
import { Facebook, Mail, Phone, MapPin, ArrowUp } from 'lucide-react';
import useStore from '../context/store';
import Logo from './Logo';

const EXPLORE = [['About', '/about'], ['Events', '/events'], ['Notices', '/notices'], ['Team', '/team'], ['Ambassadors', '/ambassadors']];
const INVOLVED = [['Join the club', '/join'], ['Committee', '/join/committee'], ['General member', '/join/general'], ['Ambassador', '/join/ambassador']];

const link = 'text-[13px] text-white/70 transition-colors hover:text-white';
const social = 'grid size-9 place-items-center rounded-full border border-white/20 bg-white/10 text-white transition hover:-translate-y-0.5 hover:bg-white hover:text-[#0A1A4A]';
const prefetchAdmin = () => import('../admin/AdminApp');

export default function Footer() {
  const settings = useStore((s) => s.settings);
  const s = settings?.socialLinks || {};
  const email = s.email || 'ictclubbauet@gmail.com';
  const phone = s.phone || '01707-533471';

  return (
    <footer className="px-3 pb-3 pt-8 sm:px-5 sm:pb-4">
      <div className="relative isolate mx-auto max-w-[1280px] overflow-hidden rounded-[28px] text-white"
        style={{ background: 'linear-gradient(120deg, #081A4D 0%, #0F2F82 55%, #0E6E86 120%)' }}>
        <div className="pointer-events-none absolute -right-16 -top-20 -z-10 size-72 rounded-full bg-[#35D989]/20 blur-[90px]" />
        <div className="pointer-events-none absolute -left-16 bottom-0 -z-10 size-64 rounded-full bg-[#38C8F0]/20 blur-[90px]" />

        <div className="grid gap-8 px-6 py-8 sm:px-10 md:grid-cols-[1.3fr_0.7fr_0.8fr_1.2fr]">
          <div>
            <div className="inline-flex items-center gap-3 rounded-2xl bg-white px-3.5 py-2.5 shadow-lg">
              <Logo kind="crest" height={40} className="!filter-none" />
              <span className="h-7 w-px bg-slate-200" />
              <Logo kind="club" height={42} className="!filter-none" />
            </div>
            <p className="mt-3 max-w-xs text-[13px] leading-6 text-white/65">Bangladesh Army University of Engineering &amp; Technology, Rajshahi.</p>
            <div className="mt-3 flex gap-2">
              {s.fb && <a href={s.fb} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className={social}><Facebook size={15} /></a>}
              <a href={`mailto:${email}`} aria-label="Email" className={social}><Mail size={15} /></a>
              <a href={`tel:${phone}`} aria-label="Phone" className={social}><Phone size={15} /></a>
            </div>
          </div>

          <nav aria-label="Explore">
            <h4 className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-white/45">Explore</h4>
            <ul className="space-y-2">{EXPLORE.map(([l, to]) => <li key={to}><Link to={to} className={link}>{l}</Link></li>)}</ul>
          </nav>

          <nav aria-label="Get involved">
            <h4 className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-white/45">Get involved</h4>
            <ul className="space-y-2">{INVOLVED.map(([l, to]) => <li key={to}><Link to={to} className={link}>{l}</Link></li>)}</ul>
          </nav>

          <div>
            <h4 className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-white/45">Contact</h4>
            <ul className="space-y-2.5 text-[13px]">
              <li><a href={`mailto:${email}`} className="flex items-start gap-2.5 text-white/80 transition hover:text-white"><Mail size={14} className="mt-0.5 shrink-0 text-[#7CF0B2]" /><span className="break-all">{email}</span></a></li>
              <li><a href={`tel:${phone}`} className="flex items-start gap-2.5 text-white/80 transition hover:text-white"><Phone size={14} className="mt-0.5 shrink-0 text-[#7CF0B2]" />{phone}</a></li>
              <li><a href="https://maps.google.com/?q=BAUET+Qadirabad+Cantonment+Natore" target="_blank" rel="noopener noreferrer" className="flex items-start gap-2.5 text-white/80 transition hover:text-white"><MapPin size={14} className="mt-0.5 shrink-0 text-[#7CF0B2]" />Qadirabad Cantonment, Natore</a></li>
            </ul>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/12 px-6 py-3.5 text-[12px] text-white/60 sm:px-10">
          <span>© {new Date().getFullYear()} BAUET ICT Club</span>
          <span><Link to="/admin" onMouseEnter={prefetchAdmin} onFocus={prefetchAdmin} className="text-white/75 hover:text-white">Admin</Link></span>
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Back to top" className="flex items-center gap-1.5 text-white/80 transition hover:text-white">Top <ArrowUp size={13} /></button>
        </div>
      </div>
    </footer>
  );
}
