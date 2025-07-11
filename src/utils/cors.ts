/**
 * CORS configuration and utilities
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
export const EXPOSED_HEADERS = ['X-Proxied-By'];

/**
 * Create CORS headers for a response
 */
export function createCorsHeaders(allowedOrigin: string): Headers {
  const headers = new Headers();

  headers.set('Access-Control-Allow-Origin', allowedOrigin == null ? '*' : allowedOrigin);

  Object.entries(DEFAULT_CORS_HEADERS).forEach(([key, value]) => {
    headers.set(key, value);
  });

  headers.set('Access-Control-Expose-Headers', EXPOSED_HEADERS.join(', '));

  return headers;
}

/**
 * Create preflight response headers
 */
export function createPreflightHeaders(allowedOrigin: string): Headers {
  const headers = createCorsHeaders(allowedOrigin);
  return headers;
}

/**
 * Apply CORS headers to an existing Headers object
 */
export function applyCorsHeaders(headers: Headers, allowedOrigin: string): void {
  const corsHeaders = createCorsHeaders(allowedOrigin);

  corsHeaders.forEach((value, key) => {
    headers.set(key, value);
  });
}
