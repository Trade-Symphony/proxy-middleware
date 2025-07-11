import type { Context } from 'hono';
import type { HealthCheckResponse } from '../types/index.js';

/**
 * Health check route handler
 */
export function healthCheck(c: Context): Response {
  const response: HealthCheckResponse = {
    status: "OK",
    timestamp: new Date().toISOString(),
  };

  return c.json(response, 200);
}
