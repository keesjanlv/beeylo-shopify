# Beeylo Shopify Integration - Setup Guide

This guide will walk you through setting up the Shopify integration for Beeylo, from creating a Shopify app to connecting it with your dashboard and Flutter app.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Part 1: Create a Shopify App](#part-1-create-a-shopify-app)
3. [Part 2: Setup Database](#part-2-setup-database)
4. [Part 3: Configure Integration Server](#part-3-configure-integration-server)
5. [Part 4: Deploy the Integration](#part-4-deploy-the-integration)
6. [Part 5: Connect from Dashboard](#part-5-connect-from-dashboard)
7. [Part 6: Configure Courier APIs](#part-6-configure-courier-apis)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have:

- A Shopify Partner account (create one at https://partners.shopify.com)
- Access to your Supabase project
- A publicly accessible URL for webhooks (use ngrok for local development)
- Node.js 18+ and npm installed
- API keys for courier services (PostNL, DHL, DPD) - optional but recommended

---

## Part 1: Create a Shopify App

### Step 1: Create a Shopify Partner Account

1. Go to https://partners.shopify.com
2. Sign up or log in
3. Navigate to "Apps" in the partner dashboard

### Step 2: Create a New App

1. Click **"Create app"**
2. Choose **"Create app manually"**
3. Fill in the app details:
   - **App name**: `Beeylo Order Notifications`
   - **App URL**: `https://your-domain.com` (your integration server URL)
   - **Allowed redirection URL(s)**:
     ```
     https://your-domain.com/auth/callback
     http://localhost:3001/auth/callback (for development)
     ```

### Step 3: Configure App Scopes

In your app settings, go to **"Configuration"** and add these scopes:

- `read_orders` - Read order information
- `read_customers` - Read customer data
- `read_products` - Read product information
- `read_fulfillments` - Read fulfillment data
- `write_fulfillments` - Update fulfillment status (optional)

### Step 4: Get API Credentials

1. In your app dashboard, go to **"API credentials"**
2. Copy the **API key** and **API secret key**
3. Save these for later - you'll need them for configuration

---

## Part 2: Setup Database

### Step 1: Run Database Migration

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Copy the contents of `database/schema.sql` from this repository
4. Run the SQL script

This will create all necessary tables:
- `shopify_stores` - Store connections
- `shopify_customers` - Synced customer data
- `shopify_orders` - Synced order data
- `order_fulfillments` - Shipping and fulfillment info
- `tracking_updates` - Courier tracking events
- `webhook_events` - Webhook log
- `order_notifications` - Notification queue

### Step 2: Verify Tables

Run this query to verify all tables were created:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'shopify_%' OR table_name LIKE '%_notifications';
```

---

## Part 3: Configure Integration Server

### Step 1: Install Dependencies

```bash
cd shopify
npm install
```

### Step 2: Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Fill in your configuration in `.env`:

```env
# Shopify App Configuration
SHOPIFY_API_KEY=your_shopify_api_key_from_step_1
SHOPIFY_API_SECRET=your_shopify_api_secret_from_step_1
SHOPIFY_SCOPES=read_orders,read_customers,read_products,read_fulfillments
SHOPIFY_HOST=https://your-domain.com

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# Server Configuration
PORT=3001
NODE_ENV=development

# Webhook Secret (generate a random string)
SHOPIFY_WEBHOOK_SECRET=your_random_webhook_secret_here

# App URLs
APP_URL=https://your-domain.com
DASHBOARD_URL=https://your-dashboard-domain.com
```

### Step 3: Generate Webhook Secret

Generate a secure random string for webhook verification:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output to `SHOPIFY_WEBHOOK_SECRET` in your `.env` file.

---

## Part 4: Deploy the Integration

### Option A: Local Development with ngrok

1. Start the integration server:
   ```bash
   npm run dev
   ```

2. In a new terminal, start ngrok:
   ```bash
   ngrok http 3001
   ```

3. Copy the ngrok HTTPS URL (e.g., `https://abc123.ngrok.io`)

4. Update your `.env` file:
   ```env
   SHOPIFY_HOST=https://abc123.ngrok.io
   APP_URL=https://abc123.ngrok.io
   ```

5. Update your Shopify app's **App URL** and **Allowed redirection URLs** with the ngrok URL

### Option B: Production Deployment

Deploy to your preferred hosting platform (Heroku, Railway, DigitalOcean, etc.):

1. Build the project:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm start
   ```

3. Ensure your production URL is:
   - Publicly accessible
   - Using HTTPS
   - Set in your Shopify app configuration

---

## Part 5: Connect from Dashboard

### Step 1: Add Integration UI to Dashboard

Create a new page or section in your dashboard for Shopify integration:

**File: `dashboardapp/src/app/settings/integrations/page.tsx`**

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function IntegrationsPage() {
  const { user, company } = useAuth();
  const [shopDomain, setShopDomain] = useState('');
  const [connectedStores, setConnectedStores] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch connected stores
  useEffect(() => {
    if (company?.id) {
      fetchStores();
    }
  }, [company]);

  const fetchStores = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SHOPIFY_API_URL}/api/stores?company_id=${company.id}`
      );
      const data = await response.json();
      setConnectedStores(data.stores || []);
    } catch (error) {
      console.error('Failed to fetch stores:', error);
    }
  };

  const handleConnect = async () => {
    if (!shopDomain.trim()) {
      alert('Please enter your Shopify store domain');
      return;
    }

    setLoading(true);

    // Redirect to Shopify OAuth
    window.location.href = `${process.env.NEXT_PUBLIC_SHOPIFY_API_URL}/auth/shopify?shop=${shopDomain}&company_id=${company.id}`;
  };

  const handleDisconnect = async (storeId: string) => {
    if (!confirm('Are you sure you want to disconnect this store?')) {
      return;
    }

    try {
      await fetch(`${process.env.NEXT_PUBLIC_SHOPIFY_API_URL}/auth/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id: storeId }),
      });

      fetchStores();
    } catch (error) {
      console.error('Failed to disconnect store:', error);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Integrations</h1>

      {/* Shopify Connection */}
      <div className="card p-6 mb-6">
        <div className="flex items-center mb-4">
          <img src="/icons/shopify.svg" alt="Shopify" className="w-8 h-8 mr-3" />
          <h2 className="text-xl font-semibold">Shopify Integration</h2>
        </div>

        <p className="text-gray-600 mb-4">
          Connect your Shopify store to sync orders and send notifications through Beeylo.
        </p>

        {connectedStores.length === 0 ? (
          <div>
            <input
              type="text"
              value={shopDomain}
              onChange={(e) => setShopDomain(e.target.value)}
              placeholder="yourstore.myshopify.com"
              className="input mb-3"
            />
            <button
              onClick={handleConnect}
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Connecting...' : 'Connect Shopify Store'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {connectedStores.map((store: any) => (
              <div key={store.id} className="flex items-center justify-between p-4 bg-gray-50 rounded">
                <div>
                  <div className="font-medium">{store.shop_domain}</div>
                  <div className="text-sm text-gray-600">
                    Connected {new Date(store.created_at).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => handleDisconnect(store.id)}
                  className="btn-secondary text-red-600"
                >
                  Disconnect
                </button>
              </div>
            ))}
            <button onClick={() => setShopDomain('')} className="btn-secondary">
              Connect Another Store
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

### Step 2: Add Environment Variable

Add to `dashboardapp/.env.local`:

```env
NEXT_PUBLIC_SHOPIFY_API_URL=http://localhost:3001
# or in production:
NEXT_PUBLIC_SHOPIFY_API_URL=https://your-shopify-integration.com
```

### Step 3: Test Connection

1. Go to Settings > Integrations in your dashboard
2. Enter your Shopify store domain (e.g., `yourstore.myshopify.com`)
3. Click "Connect Shopify Store"
4. Approve the app installation in Shopify
5. You'll be redirected back to the dashboard

---

## Part 6: Configure Courier APIs

To enable real-time tracking updates, configure courier API keys:

### PostNL

1. Sign up for PostNL API access: https://developer.postnl.nl
2. Get your API key
3. Add to `.env`:
   ```env
   POSTNL_API_KEY=your_postnl_api_key
   ```

### DHL

1. Sign up for DHL API access: https://developer.dhl.com
2. Get your API key
3. Add to `.env`:
   ```env
   DHL_API_KEY=your_dhl_api_key
   ```

### DPD

1. Sign up for DPD API access
2. Get your API key
3. Add to `.env`:
   ```env
   DPD_API_KEY=your_dpd_api_key
   ```

**Note:** Courier APIs are optional. The integration will still work without them, but tracking updates will be limited to what Shopify provides.

---

## Testing

### Test Order Sync

1. Create a test order in your Shopify store
2. Check the `shopify_orders` table in Supabase
3. Verify the order appears in your dashboard

### Test Notifications

1. Fulfill an order in Shopify with tracking info
2. Check `order_notifications` table
3. Verify notification appears in the Flutter app

### Test Webhooks

1. Use Shopify's webhook testing tool
2. Check `webhook_events` table for logged events
3. Monitor server logs for any errors

---

## Troubleshooting

### Webhook Not Receiving Data

- Check that your webhook URL is publicly accessible
- Verify HMAC signature is correct
- Check `webhook_events` table for error messages
- Ensure Shopify app has correct scopes

### Orders Not Syncing

- Verify Shopify API credentials are correct
- Check `shopify_stores.is_active` is `true`
- Look for errors in server logs
- Try manual sync: POST to `/api/sync` with `store_id`

### Tracking Not Updating

- Verify courier API keys are configured
- Check courier API rate limits
- Look for errors in `tracking_updates` table
- Try manual refresh: POST to `/api/tracking/refresh`

### Notifications Not Sending

- Check `order_notifications.sent` status
- Verify customer has `beeylo_user_id` linked
- Check store settings: `send_order_confirmations`, etc.
- Look for errors in notification service logs

---

## Support

For issues or questions:

1. Check the server logs for detailed error messages
2. Review the Supabase tables for data issues
3. Test webhooks using Shopify's testing tool
4. Contact the development team with specific error messages

---

## Next Steps

After successful setup:

1. Configure notification templates in the dashboard
2. Link Shopify customers to Beeylo users
3. Customize order display in the Flutter app
4. Set up automated sync schedules
5. Monitor webhook reliability
6. Add custom courier integrations if needed
