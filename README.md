# Trade-Symphony Proxy Middleware

A Cloudflare Worker-based proxy middleware that forwards API requests to backend services while preserving headers, query parameters, and HTTP methods.

## Features

- **Standardized Response Format**: All responses follow a consistent format with success status, message, timestamp, and data
- **Firebase Authentication**: Optional Firebase token-based authentication with configurable whitelisting
- **Request Forwarding**: Proxies all `/api/*` routes to the configured API service
- **Header Preservation**: Maintains original request headers while filtering out internal Cloudflare headers
- **Query Parameter Support**: Preserves all query parameters in forwarded requests
- **HTTP Method Support**: Supports all HTTP methods (GET, POST, PUT, DELETE, etc.)
- **Request Body Forwarding**: Properly handles request bodies for non-GET/HEAD requests
- **Observability**: Logs response status codes and request duration for monitoring
- **Error Handling**: Graceful error handling with proper HTTP status codes
- **Health Check**: Built-in health check endpoint at `/health`

## Response Format

All **proxied API responses** follow a standardized format. The `/health` endpoint maintains its original simple format.

### Proxied API Response Format

```typescript
{
  success: boolean,        // true for successful operations, false for errors
  message: string | null,  // descriptive message, null if no specific message
  timestamp: string,       // ISO 8601 timestamp
  data: any                // response payload or null for errors
}
```

### Examples

**Successful Proxied Response:**

```json
{
  "success": true,
  "message": null,
  "timestamp": "2025-07-11T10:30:00.000Z",
  "data": {
    "users": [{ "id": 1, "name": "John Doe" }]
  }
}
```

**Error Response from Proxy:**

```json
{
  "success": false,
  "message": "API returned 404",
  "timestamp": "2025-07-11T10:30:00.000Z",
  "data": null
}
```

**Health Check Response:**

```json
{
  "status": "OK",
  "timestamp": "2025-07-11T10:30:00.000Z"
}
```

## Configuration

### Environment Variables in wrangler.jsonc

The basic configuration should be defined in your `wrangler.jsonc`:

```json
{
  "vars": {
    "API_SERVICE_URL": "https://api.example.com",
    "API_KEY": "your-api-key-here",
    "ALLOWED_ORIGIN": "https://yourdomain.com"
  }
}
```

### Using Secrets for Production (Override Environment Variables)

For production deployments, override the sensitive values using Cloudflare Workers secrets. Check [SECRETS_SETUP.md](SECRETS_SETUP.md) for detailed instructions.

### How it Works

1. **Development**: Uses values from `wrangler.jsonc` vars section
2. **Production**: Secrets override the vars with the same name
3. **Fallback**: If secrets aren't set, it falls back to the vars values

### Environment Variables

- **API_SERVICE_URL**: The base URL of your target API service
- **API_KEY**: The API key that will be sent as `X-API-KEY` header to authenticate requests to the target API
- **ALLOWED_ORIGIN**: The allowed CORS origin

#### Firebase Authentication (Optional)

- **FIREBASE_PROJECT_ID**: Your Firebase project ID
- **FIREBASE_PRIVATE_KEY**: Your Firebase service account private key (with newlines preserved)
- **FIREBASE_CLIENT_EMAIL**: Your Firebase service account client email
- **AUTH_REQUIRED**: Set to "false" to disable authentication (default: "true" when Firebase config is present)

#### Default Whitelisted Paths

The following paths are automatically whitelisted and don't require authentication:

- `/health`
- `/api/health`
- `/api/public`

> **Security Note**: Use placeholder values in `wrangler.jsonc` and set actual production values as secrets. Secrets always take precedence over environment variables.

## Endpoints

### Health Check

- **GET** `/health` - Returns service status and timestamp

### API Proxy

- **ALL** `/api/*` - Forwards requests to the configured API service
  - Strips `/api` prefix from the forwarded URL
  - Preserves all query parameters
  - Maintains request headers (except internal Cloudflare headers)
  - Adds `X-Forwarded-*` headers for transparency
  - Returns `X-Proxied-By` header in responses
  - **Response Wrapping**: JSON responses are automatically wrapped in the standard format
  - **Format Detection**: If the target API already returns standard format, it passes through unchanged

## Usage Examples

```bash
# Health check
curl https://your-proxy.workers.dev/health

# Proxy API requests without authentication (if path is whitelisted)
curl https://your-proxy.workers.dev/api/public/status

# Proxy API requests with Firebase authentication
curl https://your-proxy.workers.dev/api/users?limit=10 \
  -H "Authorization: Bearer <firebase-id-token>"

# POST request with authentication
curl -X POST https://your-proxy.workers.dev/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <firebase-id-token>" \
  -d '{"name": "John", "email": "john@example.com"}'
```

### Authentication Flow

1. **Client obtains Firebase ID token** by authenticating with Firebase Auth
2. **Client includes token** in Authorization header as `Bearer <token>`
3. **Proxy validates token** against Firebase before forwarding request
4. **Whitelisted paths** bypass authentication automatically

## Development

```bash
# Install dependencies
yarn install

# Start development server
yarn dev

# Deploy to Cloudflare Workers
yarn deploy
```

## Headers Handling

### Request Headers

- **Preserved**: All application headers (Authorization, Content-Type, etc.)
- **Filtered Out**: Internal Cloudflare headers (cf-ray, cf-connecting-ip, etc.)
- **Added**: X-Forwarded-For, X-Forwarded-Proto, X-Forwarded-Host, X-API-KEY (from environment)

### Response Headers

- **Preserved**: All response headers from the target API
- **Filtered Out**: Connection-related headers (transfer-encoding, connection, etc.)
- **Added**: X-Proxied-By header for identification

## Error Handling

- **401**: Authentication failed (invalid or missing Firebase token)
- **500**: Service configuration errors (missing API_SERVICE_URL, API_KEY, or Firebase config)
- **502**: Proxy request failures (network errors, invalid responses)
- **404**: Non-API routes (only `/api/*` and `/health` are supported)

## Authentication Error Examples

**Missing Authorization Header:**

```json
{
  "success": false,
  "message": "Authorization header with Bearer token is required",
  "timestamp": "2025-07-12T10:30:00.000Z",
  "data": null
}
```

**Invalid Firebase Token:**

```json
{
  "success": false,
  "message": "Invalid or expired authentication token",
  "timestamp": "2025-07-12T10:30:00.000Z",
  "data": null
}
```

## Observability

The proxy logs all requests in the format:

```
[PROXY] METHOD /api/path -> STATUS_CODE (DURATIONms)
```

For errors:

```
[PROXY ERROR] METHOD /api/path: Error details
```
