import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Lenis from 'lenis';
import { Toaster } from 'react-hot-toast';
import { useShallow } from 'zustand/react/shallow';
import useStore from './context/store';
import Preloader from './components/Preloader';
import SiteLayout from './layouts/SiteLayout';
import Home from './pages/Home';
import NotFound from './pages/NotFound';

const AdminApp = lazy(() => import('./admin/AdminApp'));
const named = (name) => lazy(() => import('./pages/Pages').then((m) => ({ default: m[name] })));
const AboutPage = named('AboutPage');
const EventsPage = named('EventsPage');
const EventDetailPage = named('EventDetailPage');
const FormPageRoute = named('FormPageRoute');
const TicketRoute = named('TicketRoute');
const VerifyRoute = named('VerifyRoute');
const CertificateRoute = named('CertificateRoute');
const NoticesPage = named('NoticesPage');
const TeamPage = named('TeamPage');
const GalleryPage = named('GalleryPage');
const AchievementsPage = named('AchievementsPage');
const ContactPage = named('ContactPage');
const ProjectsPage = named('ProjectsPage');
const ResourcesPage = named('ResourcesPage');
const FaqPage = named('FaqPage');
const JoinHubPage = named('JoinHubPage');
const JoinCommitteePage = named('JoinCommitteePage');
const JoinGeneralPage = named('JoinGeneralPage');
const JoinAmbassadorPage = named('JoinAmbassadorPage');
const AmbassadorsPage = named('AmbassadorsPage');
const GetAppPage = named('GetAppPage');
const MemberCardRoute = named('MemberCardRoute');

const Fallback = () => <div className="grid min-h-[60vh] place-items-center"><span className="size-8 animate-spin rounded-full border-2 border-line border-t-accent" /></div>;

export default function App() {
  const { fetchAll, theme, adminTheme } = useStore(useShallow((s) => ({ fetchAll: s.fetchAll, theme: s.resolvedTheme, adminTheme: s.adminTheme })));
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith('/admin');

  useEffect(() => {
    fetchAll();
    // warm the page chunk while the browser is idle so route changes feel instant
    const warm = () => import('./pages/Pages');
    const id = 'requestIdleCallback' in window ? requestIdleCallback(warm, { timeout: 2500 }) : setTimeout(warm, 1500);
    return () => ('cancelIdleCallback' in window ? cancelIdleCallback(id) : clearTimeout(id));
  }, []);
  // the admin console has its own theme (white by default); the public site keeps the visitor's choice
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isAdmin ? adminTheme : theme);
    document.body.classList.toggle('admin-mode', isAdmin);
  }, [theme, adminTheme, isAdmin]);

  // smooth inertial scrolling (site only — the admin console keeps native scrolling)
  useEffect(() => {
    if (isAdmin || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const lenis = new Lenis({ lerp: 0.16, wheelMultiplier: 1, smoothWheel: true });
    let raf;
    const loop = (t) => { lenis.raf(t); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); lenis.destroy(); };
  }, [isAdmin]);

  // scroll-reveal for headers and cards, including ones rendered after data loads
  useEffect(() => {
    const SEL = '.section-header, .spot, .team-card, .marquee';
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); pending.delete(e.target); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    const seen = new WeakSet();
    const pending = new Set(); // tagged but not revealed yet
    const tag = (el) => {
      if (seen.has(el) || el.classList.contains('in')) return;
      seen.add(el);
      pending.add(el);
      const i = [...(el.parentElement?.children || [])].indexOf(el);
      el.style.setProperty('--d', `${Math.min(i, 6) * 45}ms`);
      el.classList.add('reveal');
      io.observe(el);
      // failsafe: never leave something near the viewport invisible if the observer is slow
      setTimeout(() => { if (el.isConnected && !el.classList.contains('in') && el.getBoundingClientRect().top < innerHeight * 1.2) el.classList.add('in'); }, 2500);
    };
    const scan = (root) => {
      if (root.matches?.(SEL)) tag(root);
      root.querySelectorAll?.(SEL).forEach(tag);
    };
    // safety net: whenever scrolling settles, anything visible but still hidden is revealed (covers fast jumps and throttled observers)
    let settle;
    const sweep = () => {
      pending.forEach((el) => {
        if (!el.isConnected) { pending.delete(el); return; }
        const r = el.getBoundingClientRect();
        if (r.bottom > 0 && r.top < innerHeight) { el.classList.add('in'); pending.delete(el); io.unobserve(el); }
      });
    };
    const onScroll = () => { clearTimeout(settle); settle = setTimeout(sweep, 140); };
    window.addEventListener('scroll', onScroll, { passive: true });
    scan(document.getElementById('root'));
    // only inspect nodes that were actually added (ignores text/typing churn)
    const mo = new MutationObserver((records) => { records.forEach((r) => r.addedNodes.forEach((n) => n.nodeType === 1 && scan(n))); onScroll(); });
    mo.observe(document.getElementById('root'), { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); clearTimeout(settle); window.removeEventListener('scroll', onScroll); };
  }, []);

  // cursor-following aurora + spotlight cards (one rAF-throttled listener)
  useEffect(() => {
    const glow = document.querySelector('.cursor-glow');
    let raf = 0, last = null;
    const frame = () => {
      raf = 0;
      if (!last) return;
      glow?.style.setProperty('--px', `${last.clientX}px`);
      glow?.style.setProperty('--py', `${last.clientY}px`);
      const el = last.target.closest?.('.spot');
      if (el) {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${last.clientX - r.left}px`);
        el.style.setProperty('--my', `${last.clientY - r.top}px`);
      }
    };
    const move = (e) => { last = e; if (!raf) raf = requestAnimationFrame(frame); };
    window.addEventListener('pointermove', move, { passive: true });
    return () => { window.removeEventListener('pointermove', move); cancelAnimationFrame(raf); };
  }, []);

  return (
    <>
      <Preloader />
      <div className="cursor-glow" />
      <Toaster position="top-right" toastOptions={{
        duration: 3000,
        style: { background: 'var(--bg-surface)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 14, boxShadow: 'var(--shadow-lg)' },
      }} />
      <Routes>
        <Route element={<SiteLayout />}>
          <Route index element={<Home />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="app" element={<GetAppPage />} />
          <Route path="events" element={<EventsPage />} />
          <Route path="events/:id" element={<EventDetailPage />} />
          <Route path="f/:slug" element={<FormPageRoute />} />
          <Route path="ticket/:code" element={<TicketRoute />} />
          <Route path="card/:id" element={<MemberCardRoute />} />
          <Route path="verify/:code" element={<VerifyRoute />} />
          <Route path="certificate/:code" element={<CertificateRoute />} />
          <Route path="notices" element={<NoticesPage />} />
          <Route path="team" element={<TeamPage />} />
          <Route path="gallery" element={<GalleryPage />} />
          <Route path="achievements" element={<AchievementsPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="resources" element={<ResourcesPage />} />
          <Route path="faq" element={<FaqPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="join" element={<JoinHubPage />} />
          <Route path="join/committee" element={<JoinCommitteePage />} />
          <Route path="join/general" element={<JoinGeneralPage />} />
          <Route path="join/ambassador" element={<JoinAmbassadorPage />} />
          <Route path="ambassadors" element={<AmbassadorsPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route path="/admin/*" element={<Suspense fallback={<Fallback />}><AdminApp /></Suspense>} />
        </Routes>
    </>
  );
}
