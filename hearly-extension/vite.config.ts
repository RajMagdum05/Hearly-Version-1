import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'index.html'),
        background: resolve(__dirname, 'src/extension/background.ts'),
        'content-meet': resolve(__dirname, 'src/extension/content/meet.ts'),
        'content-zoom': resolve(__dirname, 'src/extension/content/zoom.ts'),
        'content-teams': resolve(__dirname, 'src/extension/content/teams.ts'),
      },
      output: {
        entryFileNames: '[name].js',
      },
    },
  },
});
