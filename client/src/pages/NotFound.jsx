import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Briefcase, Calendar, Home, Mail, Megaphone, Search, Swords, Users } from 'lucide-react';
import PageShell from '../components/PageShell';
import { useT } from '../lib/i18n';

const POPULAR = [['/events', 'Events', Calendar], ['/jobs', 'Jobs', Briefcase], ['/contests', 'Contests', Swords], ['/team', 'Team', Users], ['/notices', 'Notices', Megaphone], ['/contact', 'Contact', Mail]];

/**
 * The page shown when something is missing or went wrong. /anything-unknown shows it as a 404; other pages can show it with
 * their own title and message, for example "This event does not exist".
 */
export function ProblemPage({ code = '404', title = 'We could not find this page', message = 'The link may be old or mistyped, or the page was moved.', showPath = true }) {
  const t = useT();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const openSearch = () => window.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true }));
  return (
    <PageShell variant="orbs">
      <section className="container grid min-h-[75vh] place-items-center px-4 py-24">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-xl text-center">
          <div role="img" aria-label={`Error ${code}`} className="select-none bg-clip-text font-display text-[clamp(5.5rem,22vw,9rem)] font-bold leading-none text-transparent" style={{ backgroundImage: 'linear-gradient(135deg,#1F4FD8,#17A2D8 55%,#0B7F58)' }}>{code}</div>
          <h1 className="mt-2 text-[clamp(1.5rem,4vw,2.1rem)] leading-tight text-fg">{t(title)}</h1>
          <p className="mx-auto mt-3 max-w-md text-fg2">{t(message)}</p>
          {showPath && <code className="mx-auto mt-4 inline-block max-w-full truncate rounded-xl border border-line bg-surface px-3 py-1.5 font-mono text-xs text-fg2" title={pathname}>{pathname}</code>}

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link to="/" className="btn-primary"><Home size={16} /> {t('Go to the home page')}</Link>
            <button type="button" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))} className="btn-outline"><ArrowLeft size={16} /> {t('Go back')}</button>
            <button type="button" onClick={openSearch} className="btn-outline"><Search size={16} /> {t('Search')}</button>
          </div>

          <div className="mt-10">
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">{t('Maybe you wanted')}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {POPULAR.map(([to, label, Icon]) => (
                <Link key={to} to={to} className="flex items-center gap-2.5 rounded-2xl border border-line bg-surface px-3.5 py-3 text-sm font-semibold text-fg transition hover:-translate-y-0.5 hover:border-tech hover:text-tech">
                  <Icon size={17} className="text-accent" /> {t(label)}
                </Link>
              ))}
            </div>
          </div>
          <p className="mt-8 text-sm text-muted">{t('Think this is a mistake?')} <Link to="/contact" className="font-semibold text-accent underline underline-offset-2">{t('Tell us')}</Link></p>
        </motion.div>
      </section>
    </PageShell>
  );
}

export default function NotFound() {
  return <ProblemPage />;
}
