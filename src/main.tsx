import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'motion/react';
import * as Sentry from '@sentry/react';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

window.addEventListener('vite:preloadError', (event) => {
  const retryKey = 'gba-vite-preload-retry-at';
  const now = Date.now();
  let shouldReload = false;

  try {
    const lastRetry = Number(sessionStorage.getItem(retryKey));
    shouldReload = !lastRetry || now - lastRetry > 30_000;
    if (shouldReload) sessionStorage.setItem(retryKey, String(now));
  } catch (error) {
    console.error('[app] Unable to retry a failed module load because session storage is unavailable.', error);
  }

  if (!shouldReload) return;
  event.preventDefault();
  window.location.reload();
});

// Enregistrement PWA avec mise à jour disponible à la demande.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      window.dispatchEvent(
        new CustomEvent('pwa-update-available', {
          detail: { update: () => updateSW(true) },
        }),
      );
    },
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;

      let lastCheck = 0;
      const checkForUpdate = () => {
        if (!navigator.onLine || document.visibilityState !== 'visible') return;

        const now = Date.now();
        if (now - lastCheck < 60_000) return;
        lastCheck = now;

        void registration.update().catch(() => {
          if (navigator.onLine) {
            console.warn('[PWA] La vérification de mise à jour a échoué; elle sera retentée plus tard.');
          }
        });
      };

      window.setInterval(checkForUpdate, 5 * 60_000);
      document.addEventListener('visibilitychange', checkForUpdate);
      window.addEventListener('focus', checkForUpdate);
      window.addEventListener('online', checkForUpdate);
      checkForUpdate();
    },
    onOfflineReady() {
      console.log('[PWA] Prêt pour le mode hors ligne.');
    },
  });
}

const sentryDsn = import.meta.env.VITE_SENTRY_DSN || 'https://c2234e7544eb3870989a6695d76cb0fb@o4511833867091968.ingest.de.sentry.io/4511838676451408';
const isDev = import.meta.env.DEV;
const isDevEnabled = import.meta.env.VITE_SENTRY_ENABLE_DEV === 'true';

Sentry.init({
  dsn: sentryDsn,
  environment: import.meta.env.MODE || (isDev ? 'development' : 'production'),
  // Captured in production or if explicitly enabled for dev debugging / DSN specified
  enabled: import.meta.env.PROD || isDevEnabled || Boolean(import.meta.env.VITE_SENTRY_DSN),
  debug: isDev && isDevEnabled,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.breadcrumbsIntegration(),
  ],
  tracesSampleRate: isDev ? 1.0 : 0.2,
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
        (message.includes('Failed to fetch') && !navigator.onLine)
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
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </StrictMode>
);
