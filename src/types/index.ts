/**
 * Standard response format interface
 */
export interface StandardResponse<T = any> {
  success: boolean;
  message: string | null;
  timestamp: string;
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
 * Proxy configuration interface
 */
export interface ProxyConfig {
  apiServiceUrl: string;
  apiKey: string;
  allowedOrigin: string;
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
