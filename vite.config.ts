import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        background: new URL('./src/background/service-worker.ts', import.meta.url).pathname,
        popup: new URL('./popup.html', import.meta.url).pathname,
      },
      output: {
        entryFileNames: '[name].js',
        assetFileNames: '[name][extname]',
      },
    },
  },
  test: { environment: 'node', globals: true },
});
