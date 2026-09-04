import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App.tsx';
import './index.css';

Sentry.init({
  dsn: 'https://c2234e7544eb3870989a6695d76cb0fb@o4511833867091968.ingest.de.sentry.io/4511838676451408',
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.breadcrumbsIntegration(),
  ],
  tracesSampleRate: 1.0,
  environment: import.meta.env.MODE,
});

const container = document.getElementById('root')!;
const root = createRoot(container);
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
