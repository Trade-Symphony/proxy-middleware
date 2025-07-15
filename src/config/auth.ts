/**
 * Authentication configuration constants
 */

/**
 * Default whitelisted paths that don't require authentication
 */
export const WHITELISTED_PATHS = [
  '/health',
  '/api/health',
  '/api/public/*',
] as const;
