# Setting up Cloudflare Workers Secrets

## Overview

Environment variables should be defined in `wrangler.jsonc` with placeholder values.
Secrets override these variables in production environments.

## Step 1: Ensure vars are in wrangler.jsonc

```json
{
  "vars": {
    "API_SERVICE_URL": "https://api.example.com",
    "API_KEY": "your-api-key-here"
  }
}
```

## Step 2: Set production secrets (override vars)

```cmd
cd "c:\Users\yasog\OneDrive\Documents\Trade-Symphony\proxy"
wrangler secret put API_SERVICE_URL
```

When prompted, enter your actual API service URL (e.g., https://your-actual-api.com)

## Step 2: Set API Key as a secret

```cmd
wrangler secret put API_KEY
```

When prompted, enter your actual API key

## Step 3: List all secrets (optional - to verify)

```cmd
wrangler secret list
```

## Alternative Method: Using --text flag

If you prefer to set secrets in one command:

```cmd
wrangler secret put API_SERVICE_URL --text "https://your-actual-api.com"
wrangler secret put API_KEY --text "your-actual-api-key"
```

## For different environments:

If you have staging/production environments:

```cmd
# For staging
wrangler secret put API_SERVICE_URL --env staging
wrangler secret put API_KEY --env staging

# For production
wrangler secret put API_SERVICE_URL --env production
wrangler secret put API_KEY --env production
```

## Notes:

- Secrets are encrypted and stored securely by Cloudflare
- They are not visible in your wrangler.jsonc file
- Secrets override environment variables with the same name
- You'll need to set these before deploying to production
