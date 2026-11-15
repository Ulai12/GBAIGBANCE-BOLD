import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'motion/react';
import * as Sentry from '@sentry/react';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Enregistrement PWA avec détection rapide et application automatique des mises à jour.
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

        // Évite les vérifications rapprochées lors d'un focus + retour au premier plan.
        const now = Date.now();
        if (now - lastCheck < 10_000) return;
        lastCheck = now;

        void registration.update().catch(() => {
          // Une vérification échouée (réseau lent / hors ligne) sera retentée plus tard.
        });
      };

      // Vercel est interrogé toutes les 30 secondes tant que l'app est visible.
      window.setInterval(checkForUpdate, 30_000);
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
