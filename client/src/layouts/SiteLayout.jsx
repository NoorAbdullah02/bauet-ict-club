import { useEffect, Suspense } from 'react';
import { trackPage } from '../lib/track';
import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ChatBot from '../components/ChatBot';

const TITLES = {
  '/': 'BAUET ICT Club | Where Technology Meets Innovation', '/about': 'About', '/events': 'Events', '/notices': 'Notices', '/projects': 'Projects', '/resources': 'Resource library', '/leaderboard': 'Leaderboard', '/contests': 'Contests', '/my-card': 'My member card', '/jobs': 'Jobs and internships', '/jobs/remote': 'Remote jobs',
  '/team': 'Executive Committee', '/ambassadors': 'Department Ambassadors', '/gallery': 'Gallery', '/achievements': 'Awards & Achievements', '/faq': 'FAQ',
  '/contact': 'Contact', '/join': 'Join the Club', '/join/committee': 'Apply for the Committee', '/join/general': 'Become a General Member', '/join/ambassador': 'Become a Department Ambassador', '/app': 'Get the App',
};

// pages whose own hero already renders an h1
const OWN_H1 = new Set(['/', '/ambassadors', '/join', '/join/ambassador', '/app']);

export default function SiteLayout() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); trackPage(pathname); }, [pathname]);
  useEffect(() => {
    if (/^\/(events\/\d+|contests\/\d+|f\/[^/]+|ticket\/|verify\/|certificate\/)/.test(pathname)) return; // event and form pages set their own title
    const t = TITLES[pathname.replace(/\/$/, '') || '/'];
    document.title = !t ? 'Page not found | BAUET ICT Club' : pathname === '/' ? t : `${t} | BAUET ICT Club`;
  }, [pathname]);

  return (
    <>
      <Navbar />
      {!OWN_H1.has(pathname) && TITLES[pathname] && <h1 className="sr-only">{TITLES[pathname]}</h1>}
      <motion.main key={pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
          <Suspense fallback={<div className="grid min-h-[70vh] place-items-center"><span className="size-8 animate-spin rounded-full border-2 border-line border-t-accent" /></div>}>
            <Outlet />
          </Suspense>
      </motion.main>
      <Footer />
      <ChatBot />
    </>
  );
}
