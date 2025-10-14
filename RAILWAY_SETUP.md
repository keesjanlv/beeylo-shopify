# Railway Deployment Guide

This guide will help you deploy the Beeylo Shopify Integration to Railway.

## Prerequisites

- GitHub account with access to this repository
- Railway account (free tier works)
- Shopify Partner account with your app created
- Supabase project set up with the database schema

## Step 1: Create Railway Project

1. Go to [Railway](https://railway.app/)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Authenticate with GitHub if needed
5. Select the `keesjanlv/beeylo-shopify` repository

## Step 2: Configure Environment Variables

In Railway project settings, add these environment variables:

### Required Variables

```env
SHOPIFY_API_KEY=adc25704df868c0f4533009588ab8ac2
SHOPIFY_API_SECRET=8f5b820d69fd3bdc0c69a718056017b8
SUPABASE_URL=https://xcuvffwuyrdmufvgzczs.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhjd... (your full key)
SHOPIFY_WEBHOOK_SECRET=4e5ccbde256023366b3060aba58a44354fed4adb4049a637ea6ca064c2e6cc5d
NODE_ENV=production
PORT=3002
```

**IMPORTANT:** After first deployment, Railway will give you a URL like `https://beeylo-shopify-production.up.railway.app`. You MUST then add these variables:

```env
SHOPIFY_HOST=https://beeylo-shopify-production.up.railway.app
APP_URL=https://beeylo-shopify-production.up.railway.app
```

### Optional Variables (Courier APIs)

Only add if you want enhanced tracking:

```env
POSTNL_API_KEY=
DHL_API_KEY=
DPD_CLIENT_ID=
DPD_CLIENT_SECRET=
UPS_CLIENT_ID=
UPS_CLIENT_SECRET=
FEDEX_CLIENT_ID=
FEDEX_CLIENT_SECRET=
GLS_USERNAME=
GLS_PASSWORD=
```

## Step 3: Deploy

1. Railway will automatically build and deploy
2. Wait for build to complete (2-3 minutes)
3. Copy your Railway app URL from the dashboard

## Step 4: Update Shopify App Settings

1. Go to [Shopify Partners Dashboard](https://partners.shopify.com/)
2. Select your app
3. Go to "Configuration"
4. Update these URLs (replace with your Railway URL):

**App URL:**
```
https://your-railway-url.railway.app
```

**Allowed redirection URL(s):**
```
https://your-railway-url.railway.app/auth/shopify/callback
```

5. Click "Save"

## Step 5: Update Environment Variables

1. Go back to Railway
2. Add/update these variables with your Railway URL:
```env
SHOPIFY_HOST=https://your-railway-url.railway.app
APP_URL=https://your-railway-url.railway.app
```
3. Railway will automatically redeploy

## Step 6: Test the Integration

1. In Shopify Partners, go to your app
2. Click "Test app" or install it on a development store
3. You should see the OAuth flow
4. After installation, verify:
   - Dashboard loads at `https://your-railway-url.railway.app`
   - Statistics show your store
   - Create a test order in Shopify
   - Order should appear in "Recent Orders" after clicking Refresh

## Step 7: Check Webhooks

1. In Railway, click on your deployment
2. Go to "Observability" → "Logs"
3. Create a test order in Shopify
4. You should see logs like:
```
[Webhook] Received webhook: orders/create from your-store.myshopify.com
[Webhook] ✓ Verified orders/create from your-store.myshopify.com
```

## Troubleshooting

### Webhooks not working

**Check webhook signature:**
- Ensure `SHOPIFY_API_SECRET` matches your Shopify app's API secret
- Webhooks use the API secret (NOT webhook secret) for HMAC verification

**Check webhook registration:**
- Webhooks are automatically registered when a store connects
- You can manually check in Shopify Admin → Settings → Notifications → Webhooks

### OAuth errors

**"Invalid redirect_uri":**
- Make sure redirect URL in Shopify matches Railway URL exactly
- No trailing slashes
- Must be HTTPS

**"Shop parameter missing":**
- Install the app through Shopify admin or Partners dashboard
- Don't access the Railway URL directly

### Database errors

**"Store not found":**
- Check Supabase connection
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`
- Make sure database tables are created (see `database/schema.sql`)

### Build errors

**"Module not found":**
- Make sure all dependencies are in `package.json`
- Railway uses `npm install` by default
- Check Railway build logs for specific errors

## Monitoring

Railway provides:
- Real-time logs in "Observability"
- Metrics (CPU, Memory, Network)
- Deployment history
- Automatic SSL certificates
- Custom domains (optional)

## Cost Estimate

Railway free tier includes:
- $5 credit per month
- ~500 hours of usage
- Usually sufficient for development/testing

For production:
- Estimate: $5-10/month depending on traffic
- Pay only for what you use

## Next Steps

After deployment is successful:

1. Test thoroughly with multiple orders
2. Set up production Shopify store (if not already)
3. Configure courier APIs for enhanced tracking (optional)
4. Monitor logs for any errors
5. Set up custom domain in Railway (optional)

## Support

If you encounter issues:

1. Check Railway logs first
2. Verify all environment variables
3. Test locally with ngrok if needed
4. Check Supabase logs for database issues
5. Open an issue on GitHub if problem persists

---

**Last Updated:** October 2025
**Deployment URL:** https://github.com/keesjanlv/beeylo-shopify
