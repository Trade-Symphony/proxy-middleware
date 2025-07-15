/**
 * CORS configuration constants
 */

/**
 * Default CORS headers
 */
export const DEFAULT_CORS_HEADERS = {
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-KEY, X-Requested-With',
  'Access-Control-Max-Age': '86400',
} as const;

/**
 * Headers that should be exposed to the client
 */
export const EXPOSED_HEADERS = ['X-Proxied-By'] as const;
