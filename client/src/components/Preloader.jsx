import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from './Logo';

export default function Preloader() {
  const [show, setShow] = useState(() => !sessionStorage.getItem('bauet-intro') && !window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => { setShow(false); try { sessionStorage.setItem('bauet-intro', '1'); } catch { /* ignore */ } }, 900);
    return () => clearTimeout(t);
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div className="preloader" exit={{ clipPath: 'inset(0 0 100% 0)' }} transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}>
          <div className="text-center">
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }} className="flex justify-center"><Logo kind="club" height={96} priority /></motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="preloader-mark mt-5">&gt; booting bauet-ict-club…</motion.div>
            <div className="preloader-bar mx-auto"><i /></div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
