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
