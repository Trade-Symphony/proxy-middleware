import { Hono } from "hono";
import { healthCheck } from "./routes/health.js";
import { proxyMiddleware } from "./middleware/proxy.js";
import { rateLimitMiddleware } from "./middleware/rate-limit.js";
import { createStandardResponse } from "./utils/response.js";
import { Logtail } from "@logtail/edge";
import { createLogger } from "./utils/logger.js";
import { EdgeWithExecutionContext } from "@logtail/edge/dist/es6/edgeWithExecutionContext.js";

const app = new Hono<{ Bindings: CloudflareBindings, Variables: { logger?: EdgeWithExecutionContext } }>();

// Health check endpoint
app.get("/health", healthCheck);

// Initialize Logger
app.use((c, next) => {
  const logger = createLogger(c.env, c.executionCtx);
  c.set("logger", logger);
  return next();
})

// Apply rate limiting globally to every route except /health
app.use("*", rateLimitMiddleware);

// Proxy middleware for /api/* routes
app.all("/api/*", proxyMiddleware);

// Catch-all route for non-API requests
app.all("*", (c) => {
  return c.json(createStandardResponse(
    false,
    null,
    "API route not found",
    404
  ), 404);
});

// Export the Durable Object class
export { RateLimiterDO } from "./durable-objects/rate-limiter.js";

export default app;
