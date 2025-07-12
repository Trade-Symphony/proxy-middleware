import type { Context } from 'hono';
import type { RateLimitConfig, RateLimitResult } from '../types/index.js';

/**
 * Extract client IP address from request
 */
export function getClientIP(c: Context): string {
  // Try various headers in order of preference
  const headers = [
    'cf-connecting-ip',
    'x-forwarded-for',
    'x-real-ip',
    'x-client-ip'
  ];

  for (const header of headers) {
    const ip = c.req.header(header);
    if (ip) {
      // For X-Forwarded-For, take the first IP (client IP)
      return ip.split(',')[0].trim();
    }
  }

  // Fallback to 'unknown' if no IP found
  return 'unknown';
}

/**
 * Get or create rate limiter Durable Object for an IP
 */
function getRateLimiterStub(ip: string, env: CloudflareBindings): DurableObjectStub {
  const rateLimiterId = env.RATE_LIMITER.idFromName(ip);
  return env.RATE_LIMITER.get(rateLimiterId);
}

/**
 * Check rate limit for a client IP
 */
export async function checkRateLimit(
  clientIP: string,
  config: RateLimitConfig,
  env: CloudflareBindings
): Promise<RateLimitResult> {
  try {
    const rateLimiterStub = getRateLimiterStub(clientIP, env);

    const response = await rateLimiterStub.fetch('https://rate-limiter/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config })
    });

    if (!response.ok) {
      console.error(`Rate limiter error: ${response.status} ${response.statusText}`);
      // Allow request on rate limiter error
      return {
        allowed: true,
        remainingRequests: config.maxRequests,
        resetTime: Date.now() + config.windowSizeMs
      };
    }

    return await response.json() as RateLimitResult;
  } catch (error) {
    console.error('Rate limiter fetch error:', error);
    // Allow request on error
    return {
      allowed: true,
      remainingRequests: config.maxRequests,
      resetTime: Date.now() + config.windowSizeMs
    };
  }
}

/**
 * Create rate limit headers for response
 */
export function createRateLimitHeaders(result: RateLimitResult, config: RateLimitConfig): Headers {
  const headers = new Headers();

  headers.set('X-RateLimit-Limit', config.maxRequests.toString());
  headers.set('X-RateLimit-Remaining', result.remainingRequests.toString());
  headers.set('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString());
  headers.set('X-RateLimit-Window', (config.windowSizeMs / 1000).toString());

  if (result.retryAfter) {
    headers.set('Retry-After', result.retryAfter.toString());
  }

  return headers;
}
