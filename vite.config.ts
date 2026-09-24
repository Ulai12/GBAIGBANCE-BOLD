import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function debugBuildDepsPlugin() {
  return {
    name: 'debug-build-deps',
    configResolved() {
      // #region agent log
      const payload = {
        sessionId: 'db6fdd',
        runId: process.env.DEBUG_RUN_ID || 'post-fix',
        hypothesisId: 'C',
        location: 'vite.config.ts:configResolved',
        message: 'vite config resolved',
        data: {
          hasEsbuildKey: false,
          usesRolldownOptions: true,
          reactIsDeclared: true,
        },
        timestamp: Date.now(),
      };
      try {
        fs.appendFileSync(path.join(__dirname, 'debug-db6fdd.log'), JSON.stringify(payload) + '\n');
      } catch {
        /* ignore */
      }
      fetch('http://127.0.0.1:7919/ingest/ce9dbe7c-1721-4bc6-90e5-ffa67b055c53', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'db6fdd' },
        body: JSON.stringify(payload),
      }).catch(() => {});
      // #endregion
    },
  };
}

export default defineConfig({
  envPrefix: ['VITE_', 'NEXT_PUBLIC_', 'GEMINI_'],
  plugins: [
    debugBuildDepsPlugin(),
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.ico', 'favicon-32x32.png', 'apple-touch-icon.png', 'icon.svg'],
      manifest: {
        id: '/',
        name: "Gbaigbance — L'événementiel africain",
        short_name: 'Gbaigbance',
        description: 'Découvrez, réservez et participez aux meilleurs événements en Afrique de l’Ouest.',
        theme_color: '#6600FF',
        background_color: '#F4F3F9',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        categories: ['events', 'entertainment', 'music', 'lifestyle'],
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        navigateFallbackDenylist: [/^\/rest\/v1/, /^\/auth\/v1/, /^\/storage\/v1/, /^\/api/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'unsplash-images-cache',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/images\.pexels\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'pexels-images-cache',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/public\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'gba-images',
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 60 * 60 * 24 * 14,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      react: path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
    },
    dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router', 'react-router-dom', 'motion/react'],
    exclude: ['lucide-react'],
  },
  build: {
    sourcemap: process.env.NODE_ENV === 'development' ? true : 'hidden',
    rolldownOptions: {
      checks: {
        pluginTimings: false,
      },
      output: {
        sourcemapExcludeSources: false,
        codeSplitting: {
          groups: [
            { name: 'react-vendor', test: /[\\/]node_modules[\\/](react|react-dom|scheduler|react-is)[\\/]/ },
            { name: 'supabase-vendor', test: /[\\/]node_modules[\\/]@supabase[\\/]/ },
            { name: 'recharts-vendor', test: /[\\/]node_modules[\\/](recharts|victory-vendor|redux|react-redux|@reduxjs)[\\/]/ },
            { name: 'motion-vendor', test: /[\\/]node_modules[\\/](motion|framer-motion)[\\/]/ },
            { name: 'sentry-vendor', test: /[\\/]node_modules[\\/]@sentry[\\/]/ },
            { name: 'icons-vendor', test: /[\\/]node_modules[\\/]lucide-react[\\/]/ },
          ],
        },
      },
    },
  },
});
 