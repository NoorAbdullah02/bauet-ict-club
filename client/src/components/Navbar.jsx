import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Sun, Moon, Shield } from 'lucide-react';
import useStore from '../context/store';

const links = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'events', label: 'Events' },
  { id: 'notices', label: 'Notices' },
  { id: 'team', label: 'Team' },
  { id: 'gallery', label: 'Gallery' },
  { id: 'achievements', label: 'Achievements' },
  { id: 'contact', label: 'Contact' },
];

export default function Navbar({ onAdminOpen }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, setTheme } = useStore();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id) => {
    setMobileOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const isDark = theme === 'dark';

  return (
    <>
      <motion.nav
        initial={{ y: -80 }} animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          height: 'var(--nav-height)',
          background: scrolled
            ? isDark ? 'rgba(8,13,26,0.92)' : 'rgba(255,255,255,0.88)'
            : 'transparent',
          backdropFilter: scrolled ? 'blur(20px) saturate(180%)' : 'none',
          borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
          transition: 'background 0.35s, border 0.35s, backdrop-filter 0.35s',
        }}>
        <div className="container" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => scrollTo('home')}>
            <div style={{
              width: 36, height: 36, borderRadius: 9,
              background: 'linear-gradient(135deg, var(--accent), #B89530)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 11, fontWeight: 800, fontFamily: 'var(--font-mono)',
              letterSpacing: 0.5,
            }}>ICT</div>
            <span style={{
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16,
              color: scrolled ? 'var(--fg)' : '#fff',
              transition: 'color 0.3s',
            }}>BAUET ICT Club</span>
          </div>

          <div style={{ display: 'flex', gap: 2, alignItems: 'center' }} className="nav-links-desktop">
            {links.map(link => (
              <button key={link.id} onClick={() => scrollTo(link.id)}
                style={{
                  padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                  color: scrolled ? 'var(--fg-secondary)' : 'rgba(255,255,255,0.75)',
                  transition: 'all 0.2s', background: 'transparent',
                }}
                onMouseEnter={e => { e.target.style.color = 'var(--accent)'; e.target.style.background = 'var(--accent-light)'; }}
                onMouseLeave={e => { e.target.style.color = scrolled ? 'var(--fg-secondary)' : 'rgba(255,255,255,0.75)'; e.target.style.background = 'transparent'; }}>
                {link.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button onClick={() => setTheme(isDark ? 'light' : 'dark')}
              style={{
                width: 36, height: 36, borderRadius: 9,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: scrolled ? 'var(--bg-alt)' : 'rgba(255,255,255,0.08)',
                color: scrolled ? 'var(--fg-secondary)' : 'rgba(255,255,255,0.75)',
                transition: 'all 0.2s',
              }}>
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button onClick={onAdminOpen}
              style={{
                padding: '7px 18px', borderRadius: 50, fontSize: 12, fontWeight: 600,
                background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
                color: '#fff', display: 'flex', alignItems: 'center', gap: 5,
                boxShadow: '0 2px 10px rgba(201,168,76,0.2)',
              }}>
              <Shield size={13} />
              <span className="admin-text">Admin</span>
            </button>
            <button className="hamburger-btn"
              onClick={() => setMobileOpen(!mobileOpen)}
              style={{
                width: 36, height: 36, borderRadius: 9,
                display: 'none', alignItems: 'center', justifyContent: 'center',
                background: scrolled ? 'var(--bg-alt)' : 'rgba(255,255,255,0.08)',
                color: scrolled ? 'var(--fg)' : '#fff',
              }}>
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </motion.nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed', inset: 0, zIndex: 99,
              background: 'var(--bg)', padding: '96px 20px 36px',
              display: 'flex', flexDirection: 'column', gap: 4,
            }}>
            {links.map((link, i) => (
              <motion.button key={link.id}
                initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => scrollTo(link.id)}
                style={{
                  padding: '14px 20px', borderRadius: 10, fontSize: 18, fontWeight: 600,
                  fontFamily: 'var(--font-display)', color: 'var(--fg)', textAlign: 'left',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={e => e.target.style.background = 'var(--bg-alt)'}
                onMouseLeave={e => e.target.style.background = 'transparent'}>
                {link.label}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @media (max-width: 900px) {
          .nav-links-desktop { display: none !important; }
          .hamburger-btn { display: flex !important; }
          .admin-text { display: none; }
        }
      `}</style>
    </>
  );
}
