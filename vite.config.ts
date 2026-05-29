import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
  },
  server: {
    port: 5173,
    strictPort: false,
    open: false,
    proxy: {
      '/ws': { target: 'ws://localhost:5174', ws: true },
    },
  },
  preview: {
    port: 4173,
    strictPort: false,
  },
});
