import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import AppBoundary from './components/AppBoundary';
import './styles/global.css';

// a page chunk that fails to load (new deploy, flaky network) would leave a blank screen: reload once to recover
window.addEventListener('vite:preloadError', (e) => {
  e.preventDefault();
  try {
    if (sessionStorage.getItem('chunk-reload')) return;
    sessionStorage.setItem('chunk-reload', '1');
  } catch { /* storage blocked */ }
  window.location.reload();
});
window.addEventListener('load', () => { try { sessionStorage.removeItem('chunk-reload'); } catch { /* ignore */ } });

// works offline-friendly and loads faster on repeat visits (production only; the admin area is never cached)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}); });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AppBoundary>
  </React.StrictMode>
);

console.log('%c</> BAUET ICT Club', 'font:700 18px monospace;color:#6C9BFF');
console.log('%cLike reading the console? Join us → /join', 'font:12px monospace;color:#38C8F0');
