import type { RateLimitConfig, RateLimitResult, RateLimitWindow } from '../types/index.js';

export class RateLimiterDO {
  private state: DurableObjectState;
  private cleanupAlarm: number | null = null;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const action = url.pathname.split('/').pop();

    if (action === 'check' && request.method === 'POST') {
      const body = await request.json() as { config: RateLimitConfig };
      const result = await this.checkRateLimit(body.config);
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('Not Found', { status: 404 });
  }

  async alarm(): Promise<void> {
    // Clean up the Durable Object after 60 seconds of inactivity
    const windowData = await this.state.storage.get<RateLimitWindow>('rate_limit_window');

    if (windowData) {
      const now = Date.now();
      const inactivityThreshold = 60 * 1000; // 60 seconds

      if (now - windowData.lastActivity > inactivityThreshold) {
        // Clear all data and let the object be garbage collected
        await this.state.storage.deleteAll();
        console.log('[RATE LIMITER] Cleaned up inactive rate limiter object');
        return;
      }

      // If still active, set another alarm
      await this.scheduleCleanup();
    }
  }

  private async scheduleCleanup(): Promise<void> {
    const cleanupTime = Date.now() + 60 * 1000; // 60 seconds from now
    await this.state.storage.setAlarm(cleanupTime);
  }

  private async checkRateLimit(config: RateLimitConfig): Promise<RateLimitResult> {
    const now = Date.now();
    const windowKey = 'rate_limit_window';

    // Get current window data
    let windowData = await this.state.storage.get<RateLimitWindow>(windowKey);

    if (!windowData) {
      windowData = {
        requests: [],
        windowStart: now,
        lastActivity: now
      };
    }

    // Update last activity
    windowData.lastActivity = now;

    // Clean old requests outside the sliding window
    const windowStart = now - config.windowSizeMs;
    windowData.requests = windowData.requests.filter(timestamp => timestamp >= windowStart);

    // Check if we can allow this request
    const currentRequests = windowData.requests.length;
    const allowed = currentRequests < config.maxRequests;

    if (allowed) {
      // Add current request timestamp
      windowData.requests.push(now);
      windowData.windowStart = Math.min(windowData.windowStart, windowStart);
    }

    // Save updated window data
    await this.state.storage.put(windowKey, windowData);

    // Schedule cleanup alarm if not already set
    if (!this.cleanupAlarm) {
      await this.scheduleCleanup();
      this.cleanupAlarm = 1; // Mark as set
    }

    // Calculate reset time (when the oldest request will expire)
    const oldestRequest = windowData.requests[0] || now;
    const resetTime = oldestRequest + config.windowSizeMs;
    const retryAfter = allowed ? undefined : Math.ceil((resetTime - now) / 1000);

    return {
      allowed,
      remainingRequests: Math.max(0, config.maxRequests - currentRequests - (allowed ? 1 : 0)),
      resetTime,
      retryAfter
    };
  }
}
