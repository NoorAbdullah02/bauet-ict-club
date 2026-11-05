import { Link } from 'react-router-dom';
import { Facebook, Mail, Phone, MapPin, ArrowUp, ArrowUpRight, Smartphone, Heart } from 'lucide-react';
import useStore from '../context/store';
import Logo from './Logo';

const EXPLORE = [['About', '/about'], ['Events', '/events'], ['Notices', '/notices'], ['Projects', '/projects'], ['Team', '/team'], ['Ambassadors', '/ambassadors'], ['FAQ', '/faq']];
const INVOLVED = [['Join the club', '/join'], ['Committee', '/join/committee'], ['General member', '/join/general'], ['Ambassador', '/join/ambassador'], ['Get the app', '/app']];

const link = 'group/l inline-flex items-center gap-1.5 py-1.5 text-[13px] text-white/70 transition-all duration-300 hover:translate-x-1 hover:text-white';
const social = 'grid size-10 place-items-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-white hover:bg-white hover:text-[#0A1A4A] hover:shadow-[0_8px_24px_rgba(124,240,178,0.35)]';
const prefetchAdmin = () => import('../admin/AdminApp');

export default function Footer() {
  const settings = useStore((s) => s.settings);
  const s = settings?.socialLinks || {};
  const email = s.email || 'ictclubbauet@gmail.com';
  const phone = s.phone || '01707-533471';
  const h3 = 'mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-white/50 before:h-px before:w-4 before:bg-[#7CF0B2]/70';
  const contact = 'group flex items-start gap-3 text-white/80 transition hover:text-white';
  const chip = 'mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-white/10 text-[#7CF0B2] transition group-hover:bg-[#7CF0B2]/20';

  return (
    <footer className="px-3 pb-3 pt-10 sm:px-5 sm:pb-4">
      <div className="relative isolate mx-auto max-w-[1280px] overflow-hidden rounded-[32px] text-white shadow-[0_30px_80px_rgba(5,14,38,0.35)]"
        style={{ background: 'linear-gradient(125deg, #061440 0%, #0B2A78 52%, #0B6A86 125%)' }}>
        {/* ambient light and a fine grid, same family as the page background */}
        <div className="pointer-events-none absolute -right-20 -top-24 -z-10 size-80 rounded-full bg-[#35D989]/25 blur-[100px]" />
        <div className="pointer-events-none absolute -left-20 bottom-0 -z-10 size-72 rounded-full bg-[#38C8F0]/25 blur-[100px]" />
        <div className="pointer-events-none absolute left-1/3 top-1/4 -z-10 size-64 rounded-full bg-[#8B5CF6]/20 blur-[110px]" />
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-60 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_80%_70%_at_50%_30%,#000_20%,transparent_80%)]" />
        <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[#7CF0B2] to-transparent opacity-80" />

        {/* call to action */}
        <div className="flex flex-col items-start justify-between gap-5 border-b border-white/12 px-6 py-8 sm:px-10 md:flex-row md:items-center">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#7CF0B2]">Build with us</p>
            <h2 className="mt-2 max-w-xl text-2xl font-semibold leading-tight sm:text-[1.9rem]">Ready to turn ideas into <span className="bg-gradient-to-r from-[#8DB2FF] via-[#38C8F0] to-[#7CF0B2] bg-clip-text text-transparent">real projects?</span></h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/join" className="group inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#0A1A4A] shadow-lg transition hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(124,240,178,0.4)]">Join the club <ArrowUpRight size={15} className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></Link>
            <Link to="/app" className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-medium text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/20"><Smartphone size={15} /> Get the app</Link>
          </div>
        </div>

        <div className="grid gap-10 px-6 py-10 sm:px-10 md:grid-cols-[1.4fr_0.7fr_0.8fr_1.2fr]">
          <div>
            <div className="inline-flex items-center gap-3 rounded-2xl bg-white px-3.5 py-2.5 shadow-lg">
              <Logo kind="crest" height={40} className="!filter-none" />
              <span className="h-7 w-px bg-slate-200" />
              <Logo kind="club" height={42} className="!filter-none" />
            </div>
            <p className="mt-4 max-w-xs text-[13px] leading-6 text-white/70">Bangladesh Army University of Engineering &amp; Technology, Rajshahi. A community of students who learn, build and lead in technology.</p>
            <div className="mt-4 flex gap-2.5">
              {s.fb && <a href={s.fb} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className={social}><Facebook size={16} /></a>}
              <a href={`mailto:${email}`} aria-label="Email" className={social}><Mail size={16} /></a>
              <a href={`tel:${phone}`} aria-label="Phone" className={social}><Phone size={16} /></a>
            </div>
          </div>

          <nav aria-label="Explore">
            <h3 className={h3}>Explore</h3>
            <ul className="space-y-0.5">{EXPLORE.map(([l, to]) => <li key={to}><Link to={to} className={link}>{l}</Link></li>)}</ul>
          </nav>

          <nav aria-label="Get involved">
            <h3 className={h3}>Get involved</h3>
            <ul className="space-y-0.5">{INVOLVED.map(([l, to]) => <li key={to}><Link to={to} className={link}>{l}</Link></li>)}</ul>
          </nav>

          <div>
            <h3 className={h3}>Contact</h3>
            <ul className="space-y-3 text-[13px]">
              <li><a href={`mailto:${email}`} className={contact}><span className={chip}><Mail size={14} /></span><span className="break-all pt-0.5">{email}</span></a></li>
              <li><a href={`tel:${phone}`} className={contact}><span className={chip}><Phone size={14} /></span><span className="pt-0.5">{phone}</span></a></li>
              <li><a href="https://maps.google.com/?q=BAUET+Qadirabad+Cantonment+Natore" target="_blank" rel="noopener noreferrer" className={contact}><span className={chip}><MapPin size={14} /></span><span className="pt-0.5">Qadirabad Cantonment, Natore</span></a></li>
            </ul>
          </div>
        </div>

        {/* big soft wordmark */}
        <div aria-hidden="true" className="pointer-events-none select-none overflow-hidden px-6 text-center font-bold leading-none tracking-tight sm:px-10"
          style={{ fontSize: 'clamp(1.7rem, 9.4vw, 8.5rem)', whiteSpace: 'nowrap', background: 'linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', marginBottom: '-0.12em' }}>
          BAUET ICT CLUB
        </div>

        <div className="relative flex flex-wrap items-center justify-between gap-2 border-t border-white/12 bg-black/10 px-6 py-3.5 text-[12px] text-white/65 backdrop-blur-sm sm:px-10">
          <span>© {new Date().getFullYear()} BAUET ICT Club</span>
          <span className="inline-flex items-center gap-1.5 max-sm:hidden">Made with <Heart size={12} className="fill-[#FF6B8A] text-[#FF6B8A]" /> in Rajshahi</span>
          <span><Link to="/admin" onMouseEnter={prefetchAdmin} onFocus={prefetchAdmin} className="inline-block py-2 text-white/75 hover:text-white">Admin</Link></span>
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Back to top" className="flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1.5 text-white/85 transition hover:bg-white/15 hover:text-white">Top <ArrowUp size={13} /></button>
        </div>
      </div>
    </footer>
  );
}
