import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (/[\\/]framer-motion|motion-dom|motion-utils/.test(id)) return 'motion';
          if (/[\\/](react|react-dom|scheduler|react-router|react-router-dom)[\\/]/.test(id)) return 'react';
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: `http://localhost:${process.env.API_PORT || 5000}`, changeOrigin: true },
      '/uploads': { target: `http://localhost:${process.env.API_PORT || 5000}`, changeOrigin: true },
    },
  },
});
