import * as Sentry from '@sentry/bun';
import { getConfig } from './config.ts';
import type { Express } from 'express';

export interface SentryConfig {
  serviceName: string;
  environment?: string;
}

export function initializeSentry(config: SentryConfig): void {
  const envConfig = getConfig();
  
  // Only initialize if SENTRY_DSN is provided
  if (!envConfig.SENTRY_DSN) {
    console.warn('⚠️  Sentry DSN not configured. Error tracking disabled.');
    return;
  }

  Sentry.init({
    dsn: envConfig.SENTRY_DSN,
    environment: config.environment || envConfig.NODE_ENV,
    serverName: config.serviceName,
    
    // Set sample rate for performance monitoring
    tracesSampleRate: envConfig.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Capture breadcrumbs
    integrations: [
      // Add integrations as needed
    ],
    
    // Filter out sensitive data
    beforeSend(event, hint) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }
      
      // Remove sensitive query params
      if (event.request?.query_string) {
        const params = new URLSearchParams(event.request.query_string);
        if (params.has('token')) params.delete('token');
        if (params.has('password')) params.delete('password');
        event.request.query_string = params.toString();
      }
      
      return event;
    },
  });

  console.log(`✅ Sentry initialized for ${config.serviceName}`);
}

// Capture exception manually
export function captureException(error: Error, context?: Record<string, any>): void {
  if (context) {
    Sentry.setContext('additional', context);
  }
  Sentry.captureException(error);
}

// Capture message manually
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
  Sentry.captureMessage(message, level);
}

// Add breadcrumb
export function addBreadcrumb(breadcrumb: Sentry.Breadcrumb): void {
  Sentry.addBreadcrumb(breadcrumb);
}

// Set user context
export function setUser(user: { id: string; email?: string; username?: string }): void {
  Sentry.setUser(user);
}

// Clear user context
export function clearUser(): void {
  Sentry.setUser(null);
}

// Export Sentry for advanced usage
export { Sentry };
