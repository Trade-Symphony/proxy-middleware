import type { Context } from 'hono';
import type { RateLimitConfig, RateLimitResult } from '../types/index.js';
import { rateLimitConfig } from '../config/rate-limit.js';

/**
 * Extract client IP address from request
 */
export function getClientIP(c: Context): string {
  const ip = c.req.header('cf-connecting-ip');
  return ip ? ip.trim() : 'unknown';
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
  env: CloudflareBindings,
  config: RateLimitConfig = rateLimitConfig
): Promise<RateLimitResult> {
  try {
    const rateLimiterStub = getRateLimiterStub(clientIP, env);

    const response = await rateLimiterStub.fetch('https://rate-limiter/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config })
    });

    if (!response.ok) {
      throw new Error(`Rate limit check failed: ${response.status} ${response.statusText}`);
    }

    return await response.json() as RateLimitResult;
  } catch (error) {
    throw error //Rethrow the error to be handled by the middleware
  }
}

/**
 * Create rate limit headers for response
 */
export function createRateLimitHeaders(
  result: RateLimitResult,
  config: RateLimitConfig = rateLimitConfig
): Headers {
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
