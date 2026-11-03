import { useEffect, useState, Suspense } from 'react';
import { Toaster } from 'react-hot-toast';
import useStore from './context/store';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import About from './components/About';
import Events from './components/Events';
import Notices from './components/Notices';
import Team from './components/Team';
import Gallery from './components/Gallery';
import Achievements from './components/Achievements';
import Contact from './components/Contact';
import Footer from './components/Footer';
import ChatBot from './components/ChatBot';
import AdminPanel from './components/AdminPanel';

export default function App() {
  const [adminOpen, setAdminOpen] = useState(false);
  const { fetchAll, checkAuth, theme } = useStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    fetchAll();
    checkAuth();
  }, []);

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--bg-surface)',
            color: 'var(--fg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 14,
            boxShadow: 'var(--shadow-lg)',
          },
        }}
      />
      <Navbar onAdminOpen={() => setAdminOpen(true)} />
      <main>
        <Hero />
        <About />
        <Events />
        <Notices />
        <Team />
        <Gallery />
        <Achievements />
        <Contact />
      </main>
      <Footer />
      <ChatBot />
      <AdminPanel open={adminOpen} onClose={() => setAdminOpen(false)} />
    </>
  );
}
