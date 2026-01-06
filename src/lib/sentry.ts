/**
 * Sentry Error Monitoring Configuration
 *
 * Initializes Sentry for production error tracking and monitoring.
 * Only active in production environments to avoid noise during development.
 */

import * as Sentry from '@sentry/react';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const ENVIRONMENT = import.meta.env.MODE || 'development';
const IS_PRODUCTION = ENVIRONMENT === 'production';

/**
 * Initialize Sentry error monitoring
 * Call this once at app startup (in main.tsx)
 */
export function initSentry() {
  // Only initialize in production or if explicitly enabled
  if (!IS_PRODUCTION && !import.meta.env.VITE_SENTRY_ENABLE_DEV) {
    console.log('[Sentry] Skipped initialization (not in production)');
    return;
  }

  if (!SENTRY_DSN) {
    console.warn('[Sentry] DSN not configured. Set VITE_SENTRY_DSN environment variable.');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,

    // Performance monitoring (adjust sample rate based on traffic)
    tracesSampleRate: IS_PRODUCTION ? 0.1 : 1.0, // 10% in prod, 100% in dev

    // Capture 100% of errors (errors are cheaper than performance traces)
    sampleRate: 1.0,

    // Enable session replay for debugging (10% sample rate)
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0, // Always capture replay on error

    integrations: [
      // Capture React component errors
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true, // Privacy: mask all text content
        blockAllMedia: true, // Privacy: block images/video
      }),
      // Capture HTTP requests
      Sentry.httpClientIntegration(),
    ],

    // Filter out expected errors
    beforeSend(event, hint) {
      const error = hint.originalException;

      // Filter out network errors that are user-related (offline, etc.)
      if (error && typeof error === 'object' && 'message' in error) {
        const message = String(error.message).toLowerCase();

        // Don't send user network issues
        if (message.includes('network request failed') ||
            message.includes('failed to fetch') ||
            message.includes('load failed')) {
          return null;
        }

        // Don't send expected auth errors
        if (message.includes('invalid login credentials')) {
          return null;
        }
      }

      return event;
    },

    // Tag all events with app version
    initialScope: {
      tags: {
        'app.version': import.meta.env.VITE_APP_VERSION || 'unknown',
      },
    },
  });

  console.log('[Sentry] Initialized successfully');
}

/**
 * Capture an error manually
 * Use for caught exceptions that should be logged
 */
export function captureError(error: Error, context?: Record<string, any>) {
  if (context) {
    Sentry.captureException(error, { extra: context });
  } else {
    Sentry.captureException(error);
  }
}

/**
 * Set user context for error tracking
 * Call after successful login
 */
export function setUserContext(user: { id: string; email?: string | null }) {
  Sentry.setUser({
    id: user.id,
    email: user.email || undefined,
  });
}

/**
 * Clear user context
 * Call after logout
 */
export function clearUserContext() {
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging context
 * Use for important user actions
 */
export function addBreadcrumb(message: string, data?: Record<string, any>) {
  Sentry.addBreadcrumb({
    message,
    level: 'info',
    data,
  });
}
