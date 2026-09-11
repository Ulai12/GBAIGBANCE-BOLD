import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';
import '@/utils/prefetchRoutes';

// Register Service Worker for PWA with prompt update
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      window.dispatchEvent(new CustomEvent('pwa-update-available', { detail: { update: () => updateSW(true) } }));
    },
    onOfflineReady() {
      console.log('[PWA] Prêt pour le mode hors ligne.');
    },
  });
}

const sentryDsn = import.meta.env.VITE_SENTRY_DSN || 'https://c2234e7544eb3870989a6695d76cb0fb@o4511833867091968.ingest.de.sentry.io/4511838676451408';
const isDevEnabled = import.meta.env.VITE_SENTRY_ENABLE_DEV === 'true';

Sentry.init({
  dsn: sentryDsn,
  // Only capture exceptions in production or if explicitly enabled for dev debugging
  enabled: import.meta.env.PROD || isDevEnabled,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.breadcrumbsIntegration(),
  ],
  tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,
  environment: import.meta.env.MODE,
  release: 'gbaigbance-bold@1.0.0',
  initialScope: {
    tags: {
      app: 'gbaigbance-bold',
      project: 'gbaigbance-bold',
    },
  },
  beforeSend(event, hint) {
    const error = hint?.originalException;
    if (error && typeof error === 'object') {
      const message = String((error as { message?: string }).message || '');
      // Filter out abort errors and benign HMR reload glitches
      if (
        message.includes('AbortError') ||
        message.includes('ResizeObserver loop') ||
        message.includes('Failed to fetch') && !navigator.onLine
      ) {
        return null;
      }
    }
    return event;
  },
});

const container = document.getElementById('root')!;
const root = createRoot(container);
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
