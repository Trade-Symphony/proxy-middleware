import { Hono } from "hono";

// Standard response format interface
interface StandardResponse<T = any> {
  success: boolean;
  message: string | null;
  timestamp: string;
  data: T;
}

// Helper function to create standardized responses
function createStandardResponse<T>(
  success: boolean,
  data: T,
  message: string | null = null
): StandardResponse<T> {
  return {
    success,
    message,
    timestamp: new Date().toISOString(),
    data,
  };
}

const app = new Hono<{ Bindings: CloudflareBindings }>();

// Health check endpoint
app.get("/health", (c) => {
  return c.json({
    status: "OK",
    timestamp: new Date().toISOString(),
  }, 200);
});

// Proxy middleware for /api/* routes
app.all("/api/*", async (c) => {
  const { API_SERVICE_URL, API_KEY, ALLOWED_ORIGIN } = c.env;

  // Handle OPTIONS preflight requests
  if (c.req.method === 'OPTIONS') {
    const responseHeaders = new Headers();
    responseHeaders.set('Access-Control-Allow-Origin', ALLOWED_ORIGIN || '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-KEY, X-Requested-With');
    responseHeaders.set('Access-Control-Max-Age', '86400');

    return new Response(null, {
      status: 204,
      headers: responseHeaders,
    });
  }

  if (!API_SERVICE_URL) {
    console.error("API_SERVICE_URL environment variable is not configured");
    return c.json(createStandardResponse(
      false,
      null,
      "Service configuration error"
    ), 500);
  }

  if (!API_KEY) {
    console.error("API_KEY environment variable is not configured");
    return c.json(createStandardResponse(
      false,
      null,
      "Service configuration error"
    ), 500);
  }

  try {
    // Extract the path after /api
    const originalPath = new URL(c.req.url).pathname;
    const apiPath = originalPath.replace(/^\/api/, "");

    // Construct the target URL
    const targetUrl = new URL(apiPath || "/", API_SERVICE_URL);

    // Preserve query parameters
    const originalUrl = new URL(c.req.url);
    originalUrl.searchParams.forEach((value, key) => {
      targetUrl.searchParams.set(key, value);
    });

    // Prepare headers to forward (exclude host and some internal headers)
    const forwardHeaders = new Headers();
    const skipHeaders = new Set([
      'host',
      'cf-ray',
      'cf-connecting-ip',
      'cf-visitor',
      'x-forwarded-for',
      'x-forwarded-proto',
      'x-real-ip'
    ]);

    for (const [name, value] of c.req.raw.headers.entries()) {
      if (!skipHeaders.has(name.toLowerCase())) {
        forwardHeaders.set(name, value);
      }
    }

    // Add X-Forwarded headers for transparency
    forwardHeaders.set('X-Forwarded-For', c.req.header('cf-connecting-ip') || 'unknown');
    forwardHeaders.set('X-Forwarded-Proto', 'https');
    forwardHeaders.set('X-Forwarded-Host', c.req.header('host') || 'unknown');

    // Add API key header
    forwardHeaders.set('X-API-KEY', API_KEY);

    // Prepare the request body
    let body: BodyInit | undefined;
    if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
      body = await c.req.raw.clone().arrayBuffer();
    }

    const startTime = Date.now();

    // Make the proxied request
    const response = await fetch(targetUrl.toString(), {
      method: c.req.method,
      headers: forwardHeaders,
      body,
    });

    const duration = Date.now() - startTime;

    // Log the request for observability
    console.log(`[PROXY] ${c.req.method} ${originalPath} -> ${response.status} (${duration}ms)`);

    // Prepare response headers (exclude some that shouldn't be forwarded)
    const responseHeaders = new Headers();
    const skipResponseHeaders = new Set([
      'transfer-encoding',
      'connection',
      'keep-alive',
      'upgrade',
      'proxy-authenticate',
      'proxy-authorization',
      'te',
      'trailers'
    ]);

    for (const [name, value] of response.headers.entries()) {
      if (!skipResponseHeaders.has(name.toLowerCase())) {
        responseHeaders.set(name, value);
      }
    }

    // Add proxy identification header
    responseHeaders.set('X-Proxied-By', 'Trade-Symphony-Proxy');

    // Add CORS headers
    responseHeaders.set('Access-Control-Allow-Origin', ALLOWED_ORIGIN || '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-KEY, X-Requested-With');
    responseHeaders.set('Access-Control-Expose-Headers', 'X-Proxied-By');
    responseHeaders.set('Access-Control-Max-Age', '86400');

    // Parse the response body to wrap it in standard format
    let responseData;
    const contentType = response.headers.get('content-type');

    if (contentType && contentType.includes('application/json')) {
      try {
        responseData = await response.json();

        // If the response is already in standard format, return as-is
        if (responseData && typeof responseData === 'object' &&
          'success' in responseData && 'timestamp' in responseData && 'data' in responseData) {
          return c.json(responseData, response.status as any);
        }

        // Wrap non-standard JSON response
        const wrappedResponse = createStandardResponse(
          response.ok,
          responseData,
          response.ok ? null : `API returned ${response.status}`
        );

        return c.json(wrappedResponse, response.status as any);
      } catch (jsonError) {
        console.warn(`[PROXY] Failed to parse JSON response: ${jsonError}`);
        // Fall back to returning the original response
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
        });
      }
    }

    // For non-JSON responses, return as-is
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error(`[PROXY ERROR] ${c.req.method} ${c.req.url}:`, error);

    // Return a generic error response in standard format
    return c.json(createStandardResponse(
      false,
      null,
      error instanceof Error ? error.message : "Unknown proxy error"
    ), 502);
  }
});

// Catch-all route for non-API requests
app.all("*", (c) => {
  return c.json(createStandardResponse(
    false,
    null,
    "API route not found"
  ), 404);
});

export default app;
