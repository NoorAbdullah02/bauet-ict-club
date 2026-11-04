import { useEffect, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ChatBot from '../components/ChatBot';

export default function SiteLayout() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); }, [pathname]);

  return (
    <>
      <Navbar />
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
