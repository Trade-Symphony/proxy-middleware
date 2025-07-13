import type { Context, Next } from 'hono';
import { getClientIP, checkRateLimit, createRateLimitHeaders } from '../utils/rate-limit.js';
import { createStandardResponse } from '../utils/response.js';

/**
 * Rate limiting middleware - applied globally to all routes
 */
export async function rateLimitMiddleware(c: Context, next: Next): Promise<Response | void> {
  const clientIP = getClientIP(c);

  try {
    const result = await checkRateLimit(clientIP, c.env);

    // Add rate limit headers to response
    const rateLimitHeaders = createRateLimitHeaders(result);
    rateLimitHeaders.forEach((value, key) => {
      c.res.headers.set(key, value);
    });

    if (!result.allowed) {
      console.warn(`[RATE LIMIT] Blocked request from IP: ${clientIP}`);

      return c.json(
        createStandardResponse(
          false,
          null,
          'Too many requests. Please try again later.',
          429
        ),
        429
      );
    }

    // Log rate limit info for monitoring
    if (result.remainingRequests <= 10) {
      console.warn(`[RATE LIMIT] IP ${clientIP} approaching limit: ${result.remainingRequests} requests remaining`);
    }

    return next();
  } catch (error) {
    console.error(`[RATE LIMIT] Error checking rate limit for IP ${clientIP}:`, error);
    // Allow request on error to avoid breaking the service
    return next();
  }
}
