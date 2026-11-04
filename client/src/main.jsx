import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

console.log('%c</> BAUET ICT Club', 'font:700 18px monospace;color:#6C9BFF');
console.log('%cLike reading the console? Join us → /join', 'font:12px monospace;color:#38C8F0');
