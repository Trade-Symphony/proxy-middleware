/**
 * Proxy middleware configuration constants
 */

/**
 * Headers that should not be forwarded to the target service
 */
export const SKIP_REQUEST_HEADERS = new Set([
  'host',
  'cf-ray',
  'cf-connecting-ip',
  'cf-visitor',
  'x-forwarded-for',
  'x-forwarded-proto',
  'x-real-ip'
]);

/**
 * Headers that should not be forwarded from the target service response
 */
export const SKIP_RESPONSE_HEADERS = new Set([
  'transfer-encoding',
  'connection',
  'keep-alive',
  'upgrade',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers'
]);
