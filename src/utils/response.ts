import type { StandardResponse } from '../types/index.js';

/**
 * Helper function to create standardized responses
 */
export function createStandardResponse<T>(
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

/**
 * Check if a response is already in standard format
 */
export function isStandardResponse(data: any): data is StandardResponse {
  return (
    data &&
    typeof data === 'object' &&
    'success' in data &&
    'message' in data &&
    'timestamp' in data &&
    'data' in data
  );
}

/**
 * Wrap a response in standard format if it's not already
 */
export function wrapInStandardFormat<T>(
  data: T,
  success: boolean,
  message?: string
): StandardResponse<T> {
  if (isStandardResponse(data)) {
    return data;
  }

  return createStandardResponse(
    success,
    data,
    message || (success ? null : 'Request failed')
  );
}
