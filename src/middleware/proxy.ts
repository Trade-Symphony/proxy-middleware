import type { Context } from 'hono';
import type { ProxyConfig, ProxyRequestOptions } from '../types/index.js';
import { wrapInStandardFormat, isStandardResponse } from '../utils/response.js';
import { ConfigurationError, ProxyError, handleError } from '../utils/errors.js';
import { createPreflightHeaders, applyCorsHeaders } from '../utils/cors.js';
import { authenticateRequest, createAuthConfig } from '../utils/auth.js';
import { getLogger } from '../utils/logger.js';

/**
 * Headers that should not be forwarded to the target service
 */
const SKIP_REQUEST_HEADERS = new Set([
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
const SKIP_RESPONSE_HEADERS = new Set([
  'transfer-encoding',
  'connection',
  'keep-alive',
  'upgrade',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers'
]);

/**
 * Validate proxy configuration from environment variables
 */
function getProxyConfig(c: Context): ProxyConfig {
  const env = c.env as CloudflareBindings;
  const { API_SERVICE_URL, API_KEY, ALLOWED_ORIGIN } = env;
  const logger = getLogger(c);

  if (!API_SERVICE_URL) {
    logger.error("API_SERVICE_URL environment variable is not configured");
    throw new ConfigurationError("API_SERVICE_URL is required", "API_SERVICE_URL");
  }

  if (!API_KEY) {
    logger.error("API_KEY environment variable is not configured");
    throw new ConfigurationError("API_KEY is required", "API_KEY");
  }

  if (!ALLOWED_ORIGIN) {
    logger.error("ALLOWED_ORIGIN environment variable is not configured");
    throw new ConfigurationError("ALLOWED_ORIGIN is required", "ALLOWED_ORIGIN");
  }

  // Create authentication configuration (optional)
  const authConfig = createAuthConfig(env, c);

  return {
    apiServiceUrl: API_SERVICE_URL,
    apiKey: API_KEY,
    allowedOrigin: ALLOWED_ORIGIN,
    auth: authConfig,
  };
}

/**
 * Build the target URL for the proxy request
 */
function buildTargetUrl(originalUrl: string, apiServiceUrl: string): URL {
  const originalUrlObj = new URL(originalUrl);
  const apiPath = originalUrlObj.pathname.replace(/^\/api/, "");
  const targetUrl = new URL(apiPath || "/", apiServiceUrl);

  // Preserve query parameters
  originalUrlObj.searchParams.forEach((value, key) => {
    targetUrl.searchParams.set(key, value);
  });

  return targetUrl;
}

/**
 * Prepare headers for the proxy request
 */
function prepareRequestHeaders(originalHeaders: Headers, config: ProxyConfig, context: Context): Headers {
  const forwardHeaders = new Headers();

  // Copy headers except those in the skip list
  for (const [name, value] of originalHeaders.entries()) {
    if (!SKIP_REQUEST_HEADERS.has(name.toLowerCase())) {
      forwardHeaders.set(name, value);
    }
  }

  // Add X-Forwarded headers for transparency
  forwardHeaders.set('X-Forwarded-For', context.req.header('cf-connecting-ip') || 'unknown');
  forwardHeaders.set('X-Forwarded-Proto', 'https');
  forwardHeaders.set('X-Forwarded-Host', context.req.header('host') || 'unknown');

  // Add API key header
  forwardHeaders.set('X-Api-Key', config.apiKey);

  return forwardHeaders;
}

/**
 * Prepare headers for the proxy response
 */
function prepareResponseHeaders(originalHeaders: Headers, config: ProxyConfig): Headers {
  const responseHeaders = new Headers();

  // Copy headers except those in the skip list
  for (const [name, value] of originalHeaders.entries()) {
    if (!SKIP_RESPONSE_HEADERS.has(name.toLowerCase())) {
      responseHeaders.set(name, value);
    }
  }

  // Add proxy identification header
  responseHeaders.set('X-Proxied-By', 'Trade-Symphony-Proxy');

  // Add CORS headers
  applyCorsHeaders(responseHeaders, config.allowedOrigin);

  return responseHeaders;
}

/**
 * Process the response body and wrap in standard format if needed
 */
async function processResponseBody(response: Response, c: Context): Promise<any> {
  const contentType = response.headers.get('content-type');
  const logger = getLogger(c);

  if (contentType && contentType.includes('application/json')) {
    try {
      const responseData = await response.json();

      // If the response is already in standard format, return as-is
      if (isStandardResponse(responseData)) {
        return responseData;
      }

      // Wrap non-standard JSON response
      return wrapInStandardFormat(
        responseData,
        response.ok,
        response.ok ? undefined : `API returned ${response.status}`,
        response.status
      );
    } catch (jsonError) {
      logger.error(`[PROXY] Failed to parse JSON response`, jsonError as Error);
      throw new ProxyError('Failed to parse JSON response', response.status);
    }
  }

  // For non-JSON responses, return the response body as-is
  return response.body;
}

/**
 * Make the actual proxy request
 */
async function makeProxyRequest(
  targetUrl: URL,
  options: ProxyRequestOptions
): Promise<Response> {
  try {
    return await fetch(targetUrl.toString(), {
      method: options.method,
      headers: options.headers,
      body: options.body,
    });
  } catch (error) {
    throw new ProxyError(
      `Failed to connect to target service: ${error instanceof Error ? error.message : 'Unknown error'}`,
      502,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Log proxy request for observability
 */
function logProxyRequest(
  method: string,
  originalPath: string,
  status: number,
  duration: number,
  c: Context
): void {
  const logger = getLogger(c);
  logger.log(`[PROXY] ${method} ${originalPath} -> ${status} (${duration}ms)`);
}

/**
 * Handle OPTIONS preflight requests
 */
function handlePreflightRequest(config: ProxyConfig): Response {
  const responseHeaders = createPreflightHeaders(config.allowedOrigin);

  return new Response(null, {
    status: 204,
    headers: responseHeaders,
  });
}

/**
 * Main proxy middleware function
 */
export async function proxyMiddleware(c: Context): Promise<Response> {
  const logger = getLogger(c);
  try {
    const config = getProxyConfig(c);

    // Handle OPTIONS preflight requests
    if (c.req.method === 'OPTIONS') {
      return handlePreflightRequest(config);
    }

    const startTime = Date.now();
    const originalPath = new URL(c.req.url).pathname;

    // Authenticate request if authentication is configured
    if (config.auth) {
      const authHeader = c.req.header('Authorization') || null;
      await authenticateRequest(authHeader, originalPath, config.auth, c);
    }

    // Build target URL
    const targetUrl = buildTargetUrl(c.req.url, config.apiServiceUrl);

    // Prepare request headers
    const forwardHeaders = prepareRequestHeaders(c.req.raw.headers, config, c);

    // Prepare request body
    let body: BodyInit | undefined;
    if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
      body = await c.req.raw.clone().arrayBuffer();
    }

    // Make the proxy request
    const response = await makeProxyRequest(targetUrl, {
      method: c.req.method,
      url: targetUrl.toString(),
      headers: forwardHeaders,
      body,
    });

    const duration = Date.now() - startTime;

    // Log the request for observability
    logProxyRequest(c.req.method, originalPath, response.status, duration, c);

    // Prepare response headers
    const responseHeaders = prepareResponseHeaders(response.headers, config);

    // Process response body
    const processedBody = await processResponseBody(response, c);

    // If it's JSON data (standard response), return it with the context
    if (typeof processedBody === 'object' && processedBody !== null) {
      // Set headers on context
      responseHeaders.forEach((value, key) => {
        c.res.headers.set(key, value);
      });
      return c.json(processedBody, response.status as any);
    }

    // For non-JSON responses, return as-is
    return new Response(processedBody, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });

  } catch (error) {
    logger.error(`[PROXY ERROR] ${c.req.method} ${c.req.url}:`);

    if (error instanceof ConfigurationError) {
      return c.json(handleError(error, 500), 500);
    }

    if (error instanceof ProxyError) {
      return c.json(handleError(error, error.statusCode), error.statusCode as any);
    }

    // Generic error handling
    return c.json(handleError(error, 502), 502);
  }
}
