import type { Context, Next } from 'hono';
import { getClientIP, checkRateLimit, createRateLimitHeaders } from '../utils/rate-limit.js';
import { createStandardResponse } from '../utils/response.js';
import { RateLimitConfig } from '../types/index.js';
import { rateLimitConfig } from '../config/rate-limit.js';
import { getLogger } from '../utils/logger.js';

/**
 * Rate limiting middleware - applied globally to all routes
 */
export async function rateLimitMiddleware(c: Context, next: Next, config: RateLimitConfig = rateLimitConfig): Promise<Response | void> {
  const clientIP = getClientIP(c);
  const logger = getLogger(c);

  try {
    const result = await checkRateLimit(clientIP, c.env);

    // Add rate limit headers to response
    const rateLimitHeaders = createRateLimitHeaders(result);
    rateLimitHeaders.forEach((value, key) => {
      c.res.headers.set(key, value);
    });

    if (!result.allowed) {
      logger.warn(`[RATE LIMIT] Blocked request from IP: ${clientIP}`);

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
    if (result.remainingRequests <= config.warningThreshold) {
      logger.warn(`[RATE LIMIT] IP ${clientIP} approaching limit: ${result.remainingRequests} requests remaining`);
    }

    return next();
  } catch (error) {
    logger.error(`[RATE LIMIT] Error checking rate limit for IP ${clientIP}:`, error as Error);
    // Allow request on error to avoid breaking the service
    return next();
  }
}
