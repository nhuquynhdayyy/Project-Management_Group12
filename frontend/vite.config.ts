import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import cesium from 'vite-plugin-cesium';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // rebuildCesium: true  → Vite bundles Cesium's ESM source directly and
    // injects window.CESIUM_BASE_URL so workers / assets resolve correctly.
    cesium({ rebuildCesium: true }),
  ],
  build: {
    // Cesium is large; silence the chunk-size warning
    chunkSizeWarningLimit: 5000,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
