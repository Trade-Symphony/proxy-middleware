/**
 * CORS configuration and utilities
 */

import { DEFAULT_CORS_HEADERS, EXPOSED_HEADERS } from '../config/cors.js';

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
