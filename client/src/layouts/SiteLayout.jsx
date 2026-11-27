import { useEffect, Suspense } from 'react';
import { trackPage } from '../lib/track';
import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ChatBot from '../components/ChatBot';
import useStore, { api } from '../context/store';

const TITLES = {
  '/': 'BAUET ICT Club | Where Technology Meets Innovation', '/about': 'About', '/events': 'Events', '/notices': 'Notices', '/projects': 'Projects', '/resources': 'Resource library', '/leaderboard': 'Leaderboard', '/contests': 'Contests', '/my-card': 'My member card', '/jobs': 'Jobs and internships', '/jobs/remote': 'Remote jobs',
  '/team': 'Executive Committee', '/ambassadors': 'Department Ambassadors', '/gallery': 'Gallery', '/achievements': 'Awards & Achievements', '/faq': 'FAQ',
  '/contact': 'Contact', '/join': 'Join the Club', '/join/committee': 'Apply for the Committee', '/join/general': 'Become a General Member', '/join/ambassador': 'Become a Department Ambassador', '/app': 'Get the App', '/data': 'Club data', '/ticket': 'Find my ticket',
};

// pages whose own hero already renders an h1
const OWN_H1 = new Set(['/', '/ambassadors', '/join', '/join/ambassador', '/app']);

export default function SiteLayout() {
  const { pathname } = useLocation();
  const lang = useStore((st) => st.lang);
  useEffect(() => { document.documentElement.lang = lang === 'bn' ? 'bn' : 'en'; }, [lang]); // screen readers pick the right voice
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); trackPage(pathname); }, [pathname]);
  // keep this tab in step with edits made anywhere else (another phone, another browser): one tiny
  // request every 45 s, and the lists are fetched again only when the shared version number moved
  useEffect(() => {
    let last = 0;
    let stopped = false;
    const tick = async () => {
      if (document.hidden) return;
      try {
        const { v } = (await api.get('/version')).data || {};
        if (stopped || typeof v !== 'number') return;
        if (last && v !== last) await useStore.getState().fetchAll(true);
        last = v;
      } catch { /* offline or a sleeping server: try again on the next tick */ }
    };
    const id = setInterval(tick, 45000);
    const onVisible = () => { if (!document.hidden) tick(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { stopped = true; clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, []);

  useEffect(() => {
    if (/^\/(events\/\d+|contests\/\d+|f\/[^/]+|ticket\/|verify\/|certificate\/)/.test(pathname)) return; // event and form pages set their own title
    const t = TITLES[pathname.replace(/\/$/, '') || '/'];
    document.title = !t ? 'Page not found | BAUET ICT Club' : pathname === '/' ? t : `${t} | BAUET ICT Club`;
  }, [pathname]);

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:text-fg focus:shadow-lg">Skip to content</a>
      <Navbar />
      <motion.main id="main" tabIndex={-1} key={pathname} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.12, ease: 'easeOut' }}>
          {/* the page name for screen readers; inside <main> so every page has one landmark that holds its heading */}
          {!OWN_H1.has(pathname) && TITLES[pathname] && <h1 className="sr-only">{TITLES[pathname]}</h1>}
          {/* reserve the full first screen while a page chunk loads, so the footer does not jump (layout shift) when the page appears */}
          <Suspense fallback={<div className="grid min-h-[calc(100vh-var(--nav-height))] place-items-center"><span className="size-8 animate-spin rounded-full border-2 border-line border-t-accent" /></div>}>
            <Outlet />
          </Suspense>
      </motion.main>
      <Footer />
      <ChatBot />
    </>
  );
}
