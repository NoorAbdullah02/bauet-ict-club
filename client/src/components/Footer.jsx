import { Link } from 'react-router-dom';
import { Facebook, Mail, Phone, MapPin, ArrowUp, ArrowUpRight, Heart } from 'lucide-react';
import useStore from '../context/store';
import Logo from './Logo';

const EXPLORE = [['Home', '/'], ['About', '/about'], ['Events', '/events'], ['Notices', '/notices'], ['Team', '/team'], ['Gallery', '/gallery'], ['Awards', '/achievements']];
const INVOLVED = [['Join the club', '/join'], ['Committee member', '/join/committee'], ['General member', '/join/general'], ['Contact us', '/contact']];

const linkCls = 'group inline-flex items-center gap-2 text-sm text-fg2 transition-colors hover:text-accent';
const iconBtn = 'grid size-10 place-items-center rounded-full border border-line bg-surface/70 text-fg2 transition hover:-translate-y-0.5 hover:border-accent hover:text-accent';

function Col({ title, links }) {
  return (
    <nav aria-label={title}>
      <h4 className="mb-5 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">{title}</h4>
      <ul className="space-y-3">
        {links.map(([label, to]) => (
          <li key={to}><Link to={to} className={linkCls}><span className="h-px w-0 bg-accent transition-all duration-300 group-hover:w-3" />{label}</Link></li>
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
    <footer className="relative mt-8 border-t border-line" style={{ background: 'color-mix(in srgb, var(--bg-alt) 70%, transparent)' }}>
      <div className="h-[2px] w-full" style={{ background: 'var(--grad-text)' }} />

      <div className="container grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-[1.5fr_0.8fr_0.9fr_1.2fr] lg:gap-10">
        <div>
          <a href="https://www.bauet.ac.bd" target="_blank" rel="noopener noreferrer" className="group flex items-center gap-4" aria-label="BAUET website">
            <Logo kind="crest" height={72} />
            <span>
              <span className="block font-display text-2xl leading-none text-fg">BAUET</span>
              <span className="mt-1.5 block max-w-[15rem] text-xs leading-5 text-fg2 transition-colors group-hover:text-accent">Bangladesh Army University of Engineering &amp; Technology</span>
            </span>
          </a>
          <div className="mt-6 flex items-center gap-4 border-t border-line pt-6">
            <Logo kind="club" height={64} />
          </div>
          <p className="mt-5 max-w-sm text-sm leading-7 text-fg2">
            The technology club of Bangladesh Army University of Engineering &amp; Technology. Workshops, hackathons, contests and a community of builders.
          </p>
          <p className="mt-4 font-display text-lg italic text-fg">Dream. Create. Inspire.</p>
          <div className="mt-6 flex gap-2.5">
            {s.fb && <a href={s.fb} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className={iconBtn}><Facebook size={16} /></a>}
            <a href={`mailto:${email}`} aria-label="Email" className={iconBtn}><Mail size={16} /></a>
            <a href={`tel:${phone}`} aria-label="Phone" className={iconBtn}><Phone size={16} /></a>
          </div>
        </div>

        <Col title="Explore" links={EXPLORE} />
        <Col title="Get involved" links={INVOLVED} />

        <div>
          <h4 className="mb-5 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Contact</h4>
          <ul className="space-y-4 text-sm">
            <li><a href={`mailto:${email}`} className="flex items-start gap-3 text-fg2 transition-colors hover:text-accent"><Mail size={16} className="mt-0.5 shrink-0 text-accent" /><span className="break-all">{email}</span></a></li>
            <li><a href={`tel:${phone}`} className="flex items-start gap-3 text-fg2 transition-colors hover:text-accent"><Phone size={16} className="mt-0.5 shrink-0 text-accent" />{phone}</a></li>
            <li><a href="https://maps.google.com/?q=BAUET+Qadirabad+Cantonment+Natore" target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 text-fg2 transition-colors hover:text-accent"><MapPin size={16} className="mt-0.5 shrink-0 text-accent" />BAUET, Qadirabad Cantonment, Natore</a></li>
          </ul>
          <Link to="/join" className="btn-primary mt-7 !px-6 !py-3 text-sm">Join the club <ArrowUpRight size={15} /></Link>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="container flex flex-wrap items-center justify-between gap-3 py-5 text-xs text-muted">
          <span>© {new Date().getFullYear()} BAUET ICT Club. All rights reserved.</span>
          <span className="flex items-center gap-1.5">Made with <Heart size={12} className="fill-current text-accent" /> by the ICT Club · <Link to="/admin" className="hover:text-accent">Admin</Link></span>
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Back to top" className="flex items-center gap-1.5 font-medium text-fg2 transition hover:text-accent">Back to top <ArrowUp size={13} /></button>
        </div>
      </div>
    </footer>
  );
}
