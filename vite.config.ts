import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: path.join(root, 'frontend'),
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.join(root, 'frontend/src'),
    },
  },
  build: {
    outDir: path.join(root, 'portal/dist'),
    emptyOutDir: true,
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('/@ant-design/') || id.includes('/rc-') || id.includes('/@rc-component/') || id.includes('/antd/')) return 'vendor-antd';
          if (id.includes('/@tanstack/')) return 'vendor-query';
          if (id.includes('/react-router/')) return 'vendor-router';
          if (id.includes('/i18next/') || id.includes('/react-i18next/')) return 'vendor-i18n';
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) return 'vendor-react';
          return 'vendor';
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': 'http://127.0.0.1:3001',
    },
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
});
