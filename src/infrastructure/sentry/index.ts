/**
 * GBAIGBANCE Infrastructure - Sentry & Error Telemetry
 */

export interface ErrorContext {
  componentStack?: string;
  userId?: string;
  extra?: Record<string, unknown>;
}

export function captureException(error: unknown, context?: ErrorContext): void {
  // Graceful logging, compatible with Sentry Web SDK or custom ingestion
  if (process.env.NODE_ENV === 'development') {
    console.error('[Telemetry / Sentry Caught Error]', error, context);
  }

  // If Sentry browser client is initialized on window
  const win = typeof window !== 'undefined' ? (window as unknown as { Sentry?: { captureException: (err: unknown, ctx?: unknown) => void } }) : null;
  if (win?.Sentry?.captureException) {
    win.Sentry.captureException(error, context);
  }
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Telemetry / Sentry ${level.toUpperCase()}]`, message);
  }
}
