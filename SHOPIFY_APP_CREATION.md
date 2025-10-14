# Complete Shopify App Creation Guide

This guide provides detailed, step-by-step instructions for creating and configuring your Shopify app in the Shopify Partners dashboard.

## Prerequisites

- A Shopify Partners account (free)
- Basic understanding of OAuth and webhooks
- A publicly accessible URL (use ngrok for development)

---

## Step 1: Create Shopify Partners Account

1. Navigate to https://partners.shopify.com/signup
2. Fill in your information:
   - Email address
   - Password
   - First and last name
   - Company name (can use "Your Name Development")
3. Verify your email address
4. Complete your partner profile

---

## Step 2: Access Partner Dashboard

1. Log in to https://partners.shopify.com
2. You'll see the main dashboard with navigation on the left
3. Click on **"Apps"** in the left sidebar

---

## Step 3: Create Your App

### Create App

1. Click the **"Create app"** button (green button in top right)
2. Select **"Create app manually"**
3. You'll see a form with several fields to fill out

### App Information

Fill in the following fields:

**App name**
```
Beeylo Order Notifications
```

**App URL**
```
https://your-domain.com
```
*Note: For development, you can use your ngrok URL temporarily*

**Allowed redirection URL(s)**
```
https://your-domain.com/auth/callback
http://localhost:3001/auth/callback
```
*Add both URLs, one per line. The localhost URL is for development.*

**App proxy** (leave empty for now)

**Webhooks** (leave empty - we'll configure this later)

4. Click **"Create app"**

---

## Step 4: Configure App Settings

After creating the app, you'll be taken to the app dashboard.

### Overview Tab

This shows your app's basic information. Note the following:

1. **API key** - Copy this, you'll need it for `.env`
2. **API secret key** - Click to reveal, copy this too

### API Credentials Tab

1. Click on **"API credentials"** in the left sidebar
2. Here you'll see:
   - **API key** - Your public identifier
   - **API secret key** - Keep this secret!
   - **Access tokens** - Will appear after stores install your app

---

## Step 5: Configure API Access Scopes

This is crucial - your app needs permission to access specific data.

1. Still in **"API credentials"**, scroll down to **"Admin API access scopes"**

2. Enable the following scopes by checking the boxes:

### Required Scopes

| Scope | Permission | Why We Need It |
|-------|-----------|----------------|
| `read_orders` | Read orders | To sync order data to Beeylo |
| `read_customers` | Read customers | To link Shopify customers to Beeylo users |
| `read_products` | Read products | To display product information in orders |
| `read_fulfillments` | Read fulfillments | To get tracking information |

### Optional Scopes (for future features)

| Scope | Permission | Why We Need It |
|-------|-----------|----------------|
| `write_fulfillments` | Write fulfillments | To update fulfillment status from Beeylo |
| `read_inventory` | Read inventory | To show stock levels |
| `read_discounts` | Read discounts | To display applied discounts |

3. Click **"Save"** at the bottom

---

## Step 6: Set Up App Distribution

1. Click on **"Distribution"** in the left sidebar
2. Choose **"Private distribution"** (recommended for Beeylo)
   - This means only stores you specify can install the app
   - No public listing in Shopify App Store
3. If you want to make it public later, you can choose **"Public listing"**

---

## Step 7: Configure App Extensions (Optional)

If you want to add app embeds or theme extensions:

1. Click on **"Extensions"** in the left sidebar
2. Click **"Create extension"**
3. Choose extension type:
   - **App embed** - Adds functionality across the entire store
   - **Theme app extension** - Adds blocks to specific pages

For now, you can skip this as it's not required for the basic integration.

---

## Step 8: Get Your Credentials

Now that your app is set up, gather these credentials:

1. Go back to **"API credentials"**
2. Copy the following to your `.env` file:

```env
# From "API key"
SHOPIFY_API_KEY=your_api_key_here

# From "API secret key"
SHOPIFY_API_SECRET=your_api_secret_here
```

---

## Step 9: Test Your App Locally

Before testing with a real store, set up ngrok:

### Install ngrok

```bash
# Install ngrok (if not already installed)
npm install -g ngrok

# Or download from https://ngrok.com/download
```

### Start Your Integration Server

```bash
cd shopify
npm run dev
```

The server should start on port 3001.

### Start ngrok

In a new terminal:

```bash
ngrok http 3001
```

You'll see output like:

```
Forwarding https://abc123.ngrok.io -> http://localhost:3001
```

### Update Your App URLs

1. Go back to Shopify Partners dashboard
2. Click on your app
3. Click **"App setup"** in left sidebar
4. Update **App URL** to: `https://abc123.ngrok.io`
5. Update **Allowed redirection URL(s)** to include: `https://abc123.ngrok.io/auth/callback`
6. Click **"Save"**

---

## Step 10: Create a Development Store

To test your app, you need a Shopify store:

1. In Partners dashboard, click **"Stores"** in left sidebar
2. Click **"Add store"**
3. Select **"Development store"**
4. Fill in:
   - **Store name**: `beeylo-test-store` (or any name)
   - **Store purpose**: Select "Test an app or theme"
   - **Login information**: Your email and password
5. Click **"Save"**

Wait a few minutes for the store to be created.

---

## Step 11: Install Your App on Test Store

### Option A: Install via Partners Dashboard

1. In Partners dashboard, go to **"Stores"**
2. Click on your test store
3. Click **"Install app"** dropdown
4. Select your app ("Beeylo Order Notifications")
5. Approve the installation

### Option B: Install via OAuth Link (Recommended)

1. Construct the installation URL:
```
https://beeylo-test-store.myshopify.com/admin/oauth/authorize?client_id=YOUR_API_KEY&scope=read_orders,read_customers,read_products,read_fulfillments&redirect_uri=https://abc123.ngrok.io/auth/callback
```

Replace:
- `beeylo-test-store` with your store name
- `YOUR_API_KEY` with your actual API key
- `abc123.ngrok.io` with your ngrok URL

2. Visit this URL in your browser
3. You'll be prompted to approve the app installation
4. Click **"Install app"**
5. You'll be redirected to your callback URL

---

## Step 12: Verify Installation

### Check in Dashboard

1. Go to your test store admin: `https://beeylo-test-store.myshopify.com/admin`
2. Click **"Apps"** in left sidebar
3. You should see "Beeylo Order Notifications" listed

### Check in Supabase

1. Go to your Supabase project
2. Open **SQL Editor**
3. Run:
```sql
SELECT * FROM shopify_stores ORDER BY created_at DESC LIMIT 1;
```

You should see your newly connected store!

### Check Server Logs

In your terminal running the integration server, you should see:
```
OAuth callback received for shop: beeylo-test-store.myshopify.com
Store connected successfully
Registering webhooks...
Initial sync started...
```

---

## Step 13: Test with Sample Order

### Create Test Order

1. In your test store admin, go to **"Orders"**
2. Click **"Create order"**
3. Fill in:
   - Customer: Create a test customer
   - Products: Add a product
   - Shipping: Add shipping address
4. Click **"Create order"**

### Verify Sync

1. Check `shopify_orders` table in Supabase:
```sql
SELECT * FROM shopify_orders ORDER BY created_at DESC LIMIT 1;
```

2. Check `webhook_events` table:
```sql
SELECT * FROM webhook_events ORDER BY created_at DESC LIMIT 5;
```

3. Check server logs for webhook processing

---

## Step 14: Production Deployment Checklist

Before deploying to production:

### Update App URLs

1. Deploy your integration server to production
2. In Shopify Partners, update:
   - **App URL** to your production URL
   - **Allowed redirection URLs** to your production callback URL
3. Remove ngrok URLs

### Security Checklist

- [ ] Generate strong `SHOPIFY_WEBHOOK_SECRET`
- [ ] Use HTTPS for all URLs
- [ ] Store API secrets in environment variables (not in code)
- [ ] Enable Supabase Row Level Security
- [ ] Set up proper CORS restrictions
- [ ] Add rate limiting to API endpoints
- [ ] Set up logging and monitoring
- [ ] Test webhook signature verification

### Compliance

- [ ] Review Shopify's [API Terms of Service](https://www.shopify.com/legal/api-terms)
- [ ] Ensure GDPR compliance for customer data
- [ ] Add privacy policy URL to app settings
- [ ] Add support email to app settings

---

## Troubleshooting

### "App installation failed"

**Cause**: Usually due to incorrect redirect URI

**Solution**:
1. Double-check redirect URI matches exactly
2. Ensure it starts with `https://` (not `http://`)
3. Verify no trailing slash

### "Invalid API key"

**Cause**: API key doesn't match the app

**Solution**:
1. Go to Partners dashboard > Your App > API credentials
2. Copy the API key exactly (no extra spaces)
3. Update `.env` file
4. Restart integration server

### "Webhook not verified"

**Cause**: HMAC signature verification failing

**Solution**:
1. Ensure you're using the raw request body
2. Check `SHOPIFY_WEBHOOK_SECRET` is set
3. Verify webhook topic matches registered webhook

### "Orders not syncing"

**Cause**: Missing API scopes

**Solution**:
1. Go to API credentials > Admin API access scopes
2. Ensure `read_orders` is enabled
3. Reinstall app to apply new scopes

---

## Next Steps

After successful app creation:

1. ✅ App created in Partners dashboard
2. ✅ Test store created and app installed
3. ✅ Webhooks registered automatically
4. ✅ Test order synced successfully

Now you can:
- Connect real stores (with their permission)
- Monitor webhook deliveries in Partners dashboard
- View API logs and analytics
- Add more features to your integration

---

## Useful Links

- [Shopify Partners Dashboard](https://partners.shopify.com)
- [Shopify API Documentation](https://shopify.dev/docs/api)
- [Webhook Topics Reference](https://shopify.dev/docs/api/admin-rest/2024-01/resources/webhook)
- [OAuth Documentation](https://shopify.dev/docs/apps/auth/oauth)
- [API Rate Limits](https://shopify.dev/docs/api/usage/rate-limits)

---

## Support

If you encounter issues:

1. Check Shopify Partners dashboard > Your App > API calls
   - This shows all API requests and errors
2. Check webhook deliveries in Partners dashboard
3. Review server logs for detailed error messages
4. Test with Shopify's webhook testing tool

For Shopify API support:
- [Shopify Community Forums](https://community.shopify.com)
- [Shopify Partners Support](https://partners.shopify.com/organizations)
