# Setting up Cloudflare Workers Secrets

## Overview

Environment variables should be defined in `wrangler.jsonc` with placeholder values.
Secrets override these variables in production environments.

## Step 1: Ensure vars are in wrangler.jsonc

```json
{
  "vars": {
    "API_SERVICE_URL": "https://api.example.com",
    "API_KEY": "your-api-key-here",
    "ALLOWED_ORIGIN": "https://yourdomain.com"
  }
}
```

## Step 2: Set production secrets (override vars)

```bash
wrangler secret put API_SERVICE_URL
```

When prompted, enter your actual API service URL (e.g., https://your-actual-api.com)

## Step 3: Set API Key as a secret

```bash
wrangler secret put API_KEY
```

When prompted, enter your actual API key

## Step 4: Set ALLOWED_ORIGIN as a secret

```bash
wrangler secret put ALLOWED_ORIGIN
```

When prompted, enter your actual allowed origin (e.g., https://yourfrontend.com)

## Step 5: List all secrets (optional - to verify)

```bash
wrangler secret list
```

## For different environments:

If you have staging/production environments:

```bash
# For staging
wrangler secret put API_SERVICE_URL --env staging
wrangler secret put API_KEY --env staging
wrangler secret put ALLOWED_ORIGIN --env staging

# For production
wrangler secret put API_SERVICE_URL --env production
wrangler secret put API_KEY --env production
wrangler secret put ALLOWED_ORIGIN --env production
```

## Notes:

- Secrets are encrypted and stored securely by Cloudflare
- They are not visible in your wrangler.jsonc file
- Secrets override environment variables with the same name
- You'll need to set these before deploying to production
