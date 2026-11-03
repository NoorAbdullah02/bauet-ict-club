import { Facebook, Mail, Phone, ArrowUp, MapPin, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import useStore from '../context/store';

export default function Footer() {
  const { settings } = useStore();
  const s = settings?.socialLinks || {};

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <footer style={{ background: 'var(--navy)', color: 'rgba(255,255,255,0.6)', position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.03,
        backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(201,168,76,0.3) 1px, transparent 1px), radial-gradient(circle at 75% 75%, rgba(0,150,199,0.3) 1px, transparent 1px)',
        backgroundSize: '80px 80px', pointerEvents: 'none',
      }} />

      <div className="container" style={{ position: 'relative', padding: '64px var(--gutter) 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 36, marginBottom: 44 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 9,
                background: 'linear-gradient(135deg, var(--accent), #B89530)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 11, fontWeight: 800, fontFamily: 'var(--font-mono)',
              }}>ICT</div>
              <span style={{ color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>BAUET ICT Club</span>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.75, marginBottom: 16, color: 'rgba(255,255,255,0.4)' }}>
              The premier technology club of Bangladesh Army University of Engineering & Technology.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              {s.fb && (
                <a href={s.fb} target="_blank" rel="noopener noreferrer"
                  style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', transition: 'all 0.2s', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <Facebook size={14} />
                </a>
              )}
              <a href={`mailto:${s.email || 'ictclubbauet@gmail.com'}`}
                style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', transition: 'all 0.2s', border: '1px solid rgba(255,255,255,0.06)' }}>
                <Mail size={14} />
              </a>
            </div>
          </div>

          <div>
            <h4 style={{ color: '#fff', fontSize: 13, fontWeight: 700, marginBottom: 16, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: 1.5 }}>Quick Links</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {['About', 'Events', 'Notices', 'Team', 'Gallery'].map(link => (
                <button key={link} onClick={() => scrollTo(link.toLowerCase())}
                  style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'left', transition: 'color 0.2s' }}
                  onMouseEnter={e => e.target.style.color = '#C9A84C'}
                  onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.4)'}>
                  {link}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 style={{ color: '#fff', fontSize: 13, fontWeight: 700, marginBottom: 16, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: 1.5 }}>Activities</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {['Workshops', 'Hackathons', 'Tech Talks', 'Projects', 'Competitions'].map(a => (
                <span key={a} style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>{a}</span>
              ))}
            </div>
          </div>

          <div>
            <h4 style={{ color: '#fff', fontSize: 13, fontWeight: 700, marginBottom: 16, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: 1.5 }}>Contact</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <a href={`mailto:${s.email || 'ictclubbauet@gmail.com'}`}
                style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Mail size={12} style={{ flexShrink: 0 }} /> {s.email || 'ictclubbauet@gmail.com'}
              </a>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Phone size={12} style={{ flexShrink: 0 }} /> {s.phone || '01707-533471'}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                <MapPin size={12} style={{ flexShrink: 0, marginTop: 2 }} /> BAUET, Qadirabad Cantonment, Natore, Rajshahi
              </span>
            </div>
          </div>
        </div>

        <div style={{
          paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
          fontSize: 12, color: 'rgba(255,255,255,0.25)',
        }}>
          <span>&copy; {new Date().getFullYear()} BAUET ICT Club. All rights reserved.</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            Dream. Create. Inspire. <Heart size={10} style={{ color: 'var(--accent)' }} />
          </span>
        </div>
      </div>

      <motion.button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        whileHover={{ scale: 1.08 }}
        style={{
          position: 'fixed', bottom: 88, right: 20, zIndex: 50,
          width: 40, height: 40, borderRadius: 50,
          background: 'var(--accent)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(201,168,76,0.3)',
          border: 'none', cursor: 'pointer',
        }}>
        <ArrowUp size={16} />
      </motion.button>
    </footer>
  );
}
