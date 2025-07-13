import { RateLimitConfig } from "../types";

export const rateLimitConfig: RateLimitConfig = {
  windowSizeMs: 60 * 1000,   // 1 minute
  maxRequests: 100,        // 100 requests per minute
  warningThreshold: 10,    // Warn when remaining requests are below this threshold
}