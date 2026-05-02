import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.',
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/index-[name].js',
        chunkFileNames: 'assets/index-[name].js',
        assetFileNames: 'assets/index-[name][extname]'
      }
    }
  }
});