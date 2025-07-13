/**
 * Standard response format interface
 */
export interface StandardResponse<T = any> {
  success: boolean;
  message: string | null;
  timestamp: string;
  statusCode: number;
  data: T;
}

/**
 * Health check response interface
 */
export interface HealthCheckResponse {
  status: string;
  timestamp: string;
}

/**
 * Firebase configuration interface
 */
export interface FirebaseConfig {
  projectId: string;
  privateKey: string;
  clientEmail: string;
}

/**
 * Authentication configuration interface
 */
export interface AuthConfig {
  firebase: FirebaseConfig;
  requireAuth: boolean;
}

/**
 * Proxy configuration interface
 */
export interface ProxyConfig {
  apiServiceUrl: string;
  apiKey: string;
  allowedOrigin: string;
  auth?: AuthConfig;
}

/**
 * Proxy request options
 */
export interface ProxyRequestOptions {
  method: string;
  url: string;
  headers: Headers;
  body?: BodyInit;
}

/**
 * Proxy response metadata
 */
export interface ProxyResponseMetadata {
  duration: number;
  status: number;
  originalPath: string;
}

/**
 * Rate limiting configuration interface
 */
export interface RateLimitConfig {
  windowSizeMs: number;
  maxRequests: number;
  warningThreshold: number;
}

/**
 * Rate limit result interface
 */
export interface RateLimitResult {
  allowed: boolean;
  remainingRequests: number;
  resetTime: number;
  retryAfter?: number;
}

/**
 * Rate limit window data stored in Durable Object
 */
export interface RateLimitWindow {
  requests: number[];
  windowStart: number;
  lastActivity: number;
}
