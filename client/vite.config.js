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
          // tiny shared helpers: without their own chunk Rollup parks them inside the
          // admin charts chunk, which then drags all of recharts onto the public home page
          if (/[\\/](clsx|tailwind-merge)[\\/]/.test(id)) return 'ui';
          if (/[\\/]lucide-react[\\/]/.test(id)) return 'icons';
          if (/[\\/](recharts|d3-[a-z-]+|victory-vendor|recharts-scale|decimal\.js-light|internmap)[\\/]/.test(id)) return 'charts'; // admin only
          if (/[\\/](react|react-dom|scheduler|react-router|react-router-dom)[\\/]/.test(id)) return 'react';
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true, // also reachable from your phone / another laptop on the same Wi-Fi: http://<this PC's IP>:5173
    proxy: {
      '/api': { target: `http://localhost:${process.env.API_PORT || 5000}`, changeOrigin: true },
      '/uploads': { target: `http://localhost:${process.env.API_PORT || 5000}`, changeOrigin: true },
    },
  },
});
