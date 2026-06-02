import { defineConfig, build } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'build-content-scripts',
      closeBundle: async () => {
        console.log('Starting secondary IIFE build for content scripts...');
        const scripts = [
          {
            name: 'content-meet',
            entry: resolve(__dirname, 'src/extension/content/meet.ts'),
          },
          {
            name: 'content-zoom',
            entry: resolve(__dirname, 'src/extension/content/zoom.ts'),
          },
          {
            name: 'content-teams',
            entry: resolve(__dirname, 'src/extension/content/teams.ts'),
          },
          {
            name: 'injected-mic',
            entry: resolve(__dirname, 'src/extension/injected-mic.ts'),
          },
        ];

        for (const script of scripts) {
          console.log(`Building ${script.name} as standalone IIFE...`);
          await build({
            configFile: false,
            resolve: {
              alias: {
                '@': fileURLToPath(new URL('./src', import.meta.url))
              }
            },
            build: {
              emptyOutDir: false,
              outDir: resolve(__dirname, 'dist'),
              lib: {
                entry: script.entry,
                name: script.name.replace(/-/g, '_'),
                formats: ['iife'],
                fileName: () => `${script.name}.js`,
              },
              rollupOptions: {
                output: {
                  extend: true,
                }
              }
            }
          });
        }
        console.log('All content scripts built successfully as IIFE.');
      }
    }
  ],
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
        'hearly-processor': resolve(__dirname, 'src/extension/hearly-processor.ts'),
      },
      output: {
        entryFileNames: '[name].js',
      },
    },
  },
});
