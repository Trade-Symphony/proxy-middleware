# Firebase Authentication Setup

This guide explains how to configure Firebase Authentication for the Trade-Symphony Proxy Middleware.

## Prerequisites

1. **Firebase Project**: You need an existing Firebase project
2. **Firebase Admin SDK**: Service account credentials for server-side authentication

## Step 1: Create Firebase Service Account

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Project Settings** (gear icon) → **Service Accounts**
4. Click **Generate New Private Key**
5. Download the JSON file containing your service account credentials

## Step 2: Extract Service Account Details

From the downloaded JSON file, extract these values:

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "...",
  "token_uri": "...",
  "auth_provider_x509_cert_url": "...",
  "client_x509_cert_url": "..."
}
```

You'll need:

- `project_id` → `FIREBASE_PROJECT_ID`
- `private_key` → `FIREBASE_PRIVATE_KEY`
- `client_email` → `FIREBASE_CLIENT_EMAIL`

## Step 3: Configure Environment Variables

### Development (wrangler.jsonc)

For development, you can add the values to your `wrangler.jsonc`:

```jsonc
{
  "vars": {
    // ... existing vars ...
    "FIREBASE_PROJECT_ID": "your-firebase-project-id",
    "FIREBASE_PRIVATE_KEY": "-----BEGIN PRIVATE KEY-----\\nYour private key here\\n-----END PRIVATE KEY-----\\n",
    "FIREBASE_CLIENT_EMAIL": "firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com",
    "AUTH_REQUIRED": "true"
  }
}
```

**Important**: In JSON, escape newlines in the private key as `\\n`.

### Production (Cloudflare Secrets)

For production, use Cloudflare Workers secrets (recommended):

```bash
# Set Firebase configuration
wrangler secret put FIREBASE_PROJECT_ID
wrangler secret put FIREBASE_PRIVATE_KEY
wrangler secret put FIREBASE_CLIENT_EMAIL

# Optional: Override authentication settings
wrangler secret put AUTH_REQUIRED
```

## Step 4: Configure Authentication Settings

### AUTH_REQUIRED

- `"true"` (default): Authentication is required for non-whitelisted paths
- `"false"`: Authentication is disabled globally

### Default Whitelisted Paths

These paths are automatically whitelisted:

- `/health`
- `/api/health`
- `/api/public`

## Step 5: Client-Side Integration

### Frontend Authentication

```javascript
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

// Initialize Firebase Auth
const auth = getAuth();

// Sign in user
const userCredential = await signInWithEmailAndPassword(auth, email, password);
const user = userCredential.user;

// Get ID token
const idToken = await user.getIdToken();

// Use token in API requests
const response = await fetch("https://your-proxy.workers.dev/api/users", {
  headers: {
    Authorization: `Bearer ${idToken}`,
    "Content-Type": "application/json",
  },
});
```

### Token Refresh

Firebase ID tokens expire after 1 hour. Handle token refresh:

```javascript
// Check if token is valid and refresh if needed
const user = getAuth().currentUser;
if (user) {
  const idToken = await user.getIdToken(/* forceRefresh */ true);
  // Use refreshed token
}
```

## Step 6: Testing Authentication

### Test Whitelisted Endpoint (No Auth Required)

```bash
curl https://your-proxy.workers.dev/api/public/status
```

### Test Protected Endpoint (Auth Required)

```bash
# Without token (should return 401)
curl https://your-proxy.workers.dev/api/users

# With valid token (should succeed)
curl -H "Authorization: Bearer <your-firebase-id-token>" \
     https://your-proxy.workers.dev/api/users
```

## Troubleshooting

### Common Issues

1. **"Invalid or expired authentication token"**

   - Token has expired (1 hour lifetime)
   - Token is malformed
   - Firebase project configuration is incorrect

2. **"Authorization header with Bearer token is required"**

   - Missing `Authorization` header
   - Header format is incorrect (should be `Bearer <token>`)
   - Path is not whitelisted

3. **"Failed to initialize Firebase Admin SDK"**
   - Firebase service account credentials are incorrect
   - Private key formatting issues (check newline escaping)
   - Missing environment variables

### Debug Mode

Enable additional logging by checking the Worker logs in the Cloudflare dashboard. Look for:

```
[AUTH] Path /api/users is whitelisted, skipping authentication
[AUTH] Successfully authenticated user: user123
[AUTH] Token verification failed: ...
```

### Verify Configuration

You can verify your configuration by checking these endpoints:

1. **Health Check**: `GET /health` (should work without auth)
2. **Whitelisted Path**: `GET /api/public/test` (should work without auth if configured)
3. **Protected Path**: `GET /api/users` (should require auth)

## Security Best Practices

1. **Use Secrets in Production**: Never store Firebase credentials in plain text in wrangler.jsonc for production
2. **Rotate Keys Regularly**: Generate new service account keys periodically
3. **Limit Permissions**: Use a dedicated service account with minimal required permissions
4. **Whitelist Carefully**: Only whitelist paths that truly don't need authentication
5. **Monitor Logs**: Regularly check authentication logs for suspicious activity

## Environment Variable Reference

| Variable                | Required | Description                 | Example                                                |
| ----------------------- | -------- | --------------------------- | ------------------------------------------------------ |
| `FIREBASE_PROJECT_ID`   | Yes\*    | Firebase project ID         | `my-app-12345`                                         |
| `FIREBASE_PRIVATE_KEY`  | Yes\*    | Service account private key | `-----BEGIN PRIVATE KEY-----\n...`                     |
| `FIREBASE_CLIENT_EMAIL` | Yes\*    | Service account email       | `firebase-adminsdk-xxx@my-app.iam.gserviceaccount.com` |
| `AUTH_REQUIRED`         | No       | Enable/disable auth         | `true` (default) or `false`                            |

\*Required only if you want to enable Firebase authentication. If any Firebase variable is missing, authentication will be disabled.
