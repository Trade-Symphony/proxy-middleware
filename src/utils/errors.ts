import { createStandardResponse } from './response.js';

/**
 * Custom error class for proxy-related errors
 */
export class ProxyError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'ProxyError';
  }
}

/**
 * Custom error class for configuration errors
 */
export class ConfigurationError extends Error {
  constructor(message: string, public missingConfig: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/**
 * Handle and format errors into standard response format
 */
export function handleError(error: unknown, statusCode: number = 500) {
  console.error('[ERROR]', error);

  let message: string;
  
  if (error instanceof ProxyError) {
    message = error.message;
    statusCode = error.statusCode;
  } else if (error instanceof ConfigurationError) {
    message = 'Service configuration error';
    statusCode = 500;
  } else if (error instanceof Error) {
    message = error.message;
  } else {
    message = 'Unknown error occurred';
  }

  return createStandardResponse(false, null, message);
}
