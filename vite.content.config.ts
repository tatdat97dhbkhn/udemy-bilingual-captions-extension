import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: new URL('./src/content/main.ts', import.meta.url).pathname,
      formats: ['iife'],
      name: 'UdemyBilingualCaptions',
      fileName: () => 'content.js',
    },
  },
});
