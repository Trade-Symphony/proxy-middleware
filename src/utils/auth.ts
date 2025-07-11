import * as admin from 'firebase-admin';
import type { AuthConfig } from '../types/index.js';
import { ConfigurationError, ProxyError } from './errors.js';
import { DecodedIdToken } from 'firebase-admin/auth';

/**
 * Default whitelisted paths that don't require authentication
 */
const WHITELISTED_PATHS = [
  '/health',
  '/api/health',
  '/api/public/*',
];

/**
 * Initialize Firebase Admin SDK
 */
function initializeFirebase(config: AuthConfig): void {
  try {
    // Check if Firebase is already initialized
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: config.firebase.projectId,
          privateKey: config.firebase.privateKey.replace(/\\n/g, '\n'),
          clientEmail: config.firebase.clientEmail,
        }),
        projectId: config.firebase.projectId,
      });
    }
  } catch (error) {
    console.error('[AUTH] Failed to initialize Firebase:', error);
    throw new ConfigurationError(
      'Failed to initialize Firebase Admin SDK',
      'FIREBASE_CONFIG'
    );
  }
}

/**
 * Verify Firebase ID token
 */
export async function verifyFirebaseToken(idToken: string): Promise<DecodedIdToken> {
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken as DecodedIdToken;
  } catch (error) {
    console.error('[AUTH] Token verification failed:', error);
    throw new ProxyError('Invalid or expired authentication token', 401);
  }
}

/**
 * Check if a path is whitelisted (doesn't require authentication)
 */
export function isPathWhitelisted(path: string): boolean {
  const allWhitelistedPaths = [...WHITELISTED_PATHS];

  return allWhitelistedPaths.some(whitelistedPath => {
    // Exact match
    if (path === whitelistedPath) {
      return true;
    }

    // Wildcard match (e.g., /api/public/* matches /api/public/anything)
    if (whitelistedPath.endsWith('/*')) {
      const basePath = whitelistedPath.slice(0, -2);
      return path.startsWith(basePath);
    }

    // Prefix match for paths ending with specific pattern
    if (whitelistedPath.endsWith('*')) {
      const basePath = whitelistedPath.slice(0, -1);
      return path.startsWith(basePath);
    }

    return false;
  });
}

/**
 * Extract Bearer token from Authorization header
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Authenticate request using Firebase token
 */
export async function authenticateRequest(
  authHeader: string | null,
  path: string,
  config: AuthConfig
): Promise<DecodedIdToken | null> {
  // Initialize Firebase if not already done
  initializeFirebase(config);

  // Check if authentication is required for this path
  if (!config.requireAuth || isPathWhitelisted(path)) {
    console.log(`[AUTH] Path ${path} is whitelisted, skipping authentication`);
    return null;
  }

  // Extract token from Authorization header
  const token = extractBearerToken(authHeader);
  if (!token) {
    throw new ProxyError('Authorization header with Bearer token is required', 401);
  }

  // Verify the Firebase token
  const userToken = await verifyFirebaseToken(token);
  console.log(`[AUTH] Successfully authenticated user: ${userToken.uid}`);

  return userToken;
}

/**
 * Create authentication configuration from environment variables
 */
export function createAuthConfig(env: CloudflareBindings): AuthConfig | undefined {
  const {
    FIREBASE_PROJECT_ID,
    FIREBASE_PRIVATE_KEY,
    FIREBASE_CLIENT_EMAIL,
    AUTH_REQUIRED,
  } = env;

  // If no Firebase config is provided, authentication is disabled
  if (!FIREBASE_PROJECT_ID || !FIREBASE_PRIVATE_KEY || !FIREBASE_CLIENT_EMAIL) {
    console.log('[AUTH] Firebase configuration not found, authentication disabled');
    return undefined;
  }

  return {
    firebase: {
      projectId: FIREBASE_PROJECT_ID,
      privateKey: FIREBASE_PRIVATE_KEY,
      clientEmail: FIREBASE_CLIENT_EMAIL,
    },
    requireAuth: String(AUTH_REQUIRED) !== 'false', // Default to true unless explicitly set to 'false'
  };
}
