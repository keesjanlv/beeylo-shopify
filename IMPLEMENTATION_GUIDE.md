# Beeylo App Delivery Implementation Guide

## Overview

This implementation allows Shopify customers to opt-in to receive their order updates through the Beeylo app instead of via email. The feature is available for all Shopify stores (not just Plus).

## Architecture

### Components

1. **Frontend Script** (`public/beeylo-cart-integration.js`)
   - Injects a checkbox on the cart page
   - Captures customer preference
   - Stores preference in cart attributes
   - Uses localStorage for persistence

2. **ScriptTag Registration** (`services/oauth.service.ts`)
   - Automatically registers the script when a store connects
   - Injects script into all online store pages
   - Cleans up script tags on store disconnect

3. **Webhook Handler** (`services/webhook.service.ts`)
   - Processes orders/create webhook
   - Reads `Receive_in_Beeylo_App` attribute from note_attributes
   - Routes notification accordingly (email vs app)

4. **Order Sync Service** (`services/sync.service.ts`)
   - Syncs orders to database
   - Stores `receive_in_app` flag in database
   - Preserves customer preference for future reference

5. **Notification Service** (`services/notification.service.ts`)
   - Handles both email and in-app notifications
   - Creates tickets in Beeylo app
   - Sends push notifications via FCM

6. **Database Migration** (`supabase/migrations/004_add_receive_in_app_column.sql`)
   - Adds `receive_in_app` boolean column to `shopify_orders` table
   - Creates index for efficient filtering

## How It Works

### 1. Store Connection Flow

When a merchant installs the Beeylo Shopify app:

```typescript
// oauth.service.ts - handleCallback()
1. Exchange OAuth code for access token
2. Register webhooks
3. Register script tag → injects beeylo-cart-integration.js
4. Perform initial sync of orders
```

The script tag is registered with:
- **Event**: `onload` (loads on every page)
- **Display Scope**: `online_store` (only storefront, not checkout)
- **Source**: `https://your-app.railway.app/public/beeylo-cart-integration.js`

### 2. Customer Checkout Flow

```
Customer adds items to cart
  ↓
Customer visits cart page
  ↓
Script injects checkbox: "Receive order updates in Beeylo app"
  ↓
Customer checks box (preference stored in localStorage)
  ↓
Cart attribute added: attributes[Receive_in_Beeylo_App] = "Yes"
  ↓
Customer completes checkout
  ↓
Shopify creates order with note_attributes containing the preference
```

### 3. Order Processing Flow

```
Shopify fires orders/create webhook
  ↓
webhook.service.ts - handleOrderCreate()
  ↓
Checks payload.note_attributes for "Receive_in_Beeylo_App"
  ↓
sync.service.ts - syncOrder() with receive_in_app flag
  ↓
Order saved to database with receive_in_app = true/false
  ↓
IF receive_in_app = false:
  → sendOrderConfirmation() → Email notification

IF receive_in_app = true:
  → sendInAppNotification() → In-app notification + Push
```

### 4. In-App Delivery

When `receive_in_app = true`:

```typescript
// notification.service.ts - sendInAppNotification()
1. Find customer's beeylo_user_id
2. Create notification record
3. Create ticket in Beeylo app (appears in Orders section)
4. Send push notification via FCM
5. Skip email notification entirely
```

## Database Schema

### shopify_orders table

```sql
ALTER TABLE shopify_orders
ADD COLUMN receive_in_app BOOLEAN DEFAULT FALSE;

CREATE INDEX idx_shopify_orders_receive_in_app
ON shopify_orders(receive_in_app) WHERE receive_in_app = TRUE;
```

### Queries

```sql
-- Find all app-delivery orders
SELECT * FROM shopify_orders
WHERE receive_in_app = TRUE;

-- Find app-delivery orders for a specific store
SELECT * FROM shopify_orders
WHERE store_id = 'xxx' AND receive_in_app = TRUE;

-- Check customer preference distribution
SELECT receive_in_app, COUNT(*)
FROM shopify_orders
GROUP BY receive_in_app;
```

## API Endpoints

### Serve Script
```
GET /public/beeylo-cart-integration.js
- Returns JavaScript file
- No authentication required (public)
- Cached by Shopify
```

### Webhook Endpoint
```
POST /webhooks/orders-create
- Receives orders/create from Shopify
- Validates HMAC signature
- Extracts note_attributes
- Routes notification accordingly
```

## Configuration

### Environment Variables

```bash
# .env
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
SHOPIFY_SCOPES=read_orders,write_orders,read_customers,write_customers,read_script_tags,write_script_tags
APP_URL=https://your-app.railway.app

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Required Shopify Scopes

- `read_orders` - Read order data
- `write_orders` - Update order data
- `read_customers` - Read customer data
- `write_customers` - Link customers to Beeylo users
- `read_script_tags` - List existing script tags
- `write_script_tags` - Register/delete script tags

## Testing

### 1. Test Script Injection

1. Install the app on a development store
2. Visit the cart page (`/cart`)
3. Verify checkbox appears: "Receive order updates in Beeylo app instead of email"
4. Check browser localStorage: `beeylo_receive_in_app` should be set

### 2. Test Cart Attribute

1. Check the checkbox
2. Add to cart
3. Inspect cart object (use Shopify's cart.js API):
   ```javascript
   fetch('/cart.js').then(r => r.json()).then(console.log)
   ```
4. Verify `attributes.Receive_in_Beeylo_App = "Yes"`

### 3. Test Order Creation

1. Complete a test checkout with the box checked
2. Check webhook logs for orders/create
3. Verify `note_attributes` contains:
   ```json
   {
     "name": "Receive_in_Beeylo_App",
     "value": "Yes"
   }
   ```
4. Check database: `receive_in_app` should be `TRUE`

### 4. Test Notification Routing

**Test 1: Email Delivery (box unchecked)**
```
1. Create order without checking box
2. Verify: receive_in_app = FALSE in database
3. Verify: sendOrderConfirmation() called
4. Verify: Email sent to customer
```

**Test 2: App Delivery (box checked)**
```
1. Create order with box checked
2. Verify: receive_in_app = TRUE in database
3. Verify: sendInAppNotification() called
4. Verify: Ticket created in Beeylo app
5. Verify: Push notification sent
6. Verify: NO email sent
```

## Troubleshooting

### Script Not Appearing on Cart Page

1. Check if script tag is registered:
   ```bash
   GET /admin/api/2025-10/script_tags.json
   ```
2. Verify script URL is accessible:
   ```bash
   curl https://your-app.railway.app/public/beeylo-cart-integration.js
   ```
3. Check browser console for JavaScript errors
4. Verify theme has standard cart page structure

### Cart Attribute Not Being Captured

1. Check localStorage: `beeylo_receive_in_app`
2. Inspect cart form - verify attribute input exists
3. Test cart update:
   ```javascript
   fetch('/cart/update.js', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       attributes: { 'Receive_in_Beeylo_App': 'Yes' }
     })
   })
   ```

### Webhook Not Receiving Attribute

1. Verify cart attribute was set before checkout
2. Check webhook payload - look for `note_attributes`
3. Ensure order was created AFTER attribute was set
4. Test with Shopify's webhook testing tool

### Notification Not Being Delivered

1. Check if customer has `beeylo_user_id` linked
2. Verify notification record created in database
3. Check FCM logs for push notification status
4. Verify Supabase Edge Function is deployed

## Deployment

### Prerequisites

1. Database migration applied
2. Environment variables configured
3. Supabase Edge Function deployed (`send-push-notification`)
4. Railway connected to git repository

### Deployment Steps

```bash
# 1. Apply database migration
npx supabase migration up

# 2. Build TypeScript
npm run build

# 3. Commit changes
git add .
git commit -m "Add Beeylo app delivery feature"

# 4. Push to git (Railway auto-deploys)
git push origin main

# 5. Verify deployment
curl https://your-app.railway.app/health
```

### Post-Deployment Verification

1. Install app on test store
2. Verify script tag registered
3. Complete test checkout
4. Verify webhook processing
5. Check notification delivery

## Maintenance

### Monitoring

Monitor these metrics:
- Script tag registration success rate
- Cart attribute capture rate
- Webhook processing success rate
- Notification delivery rate

### Logs to Watch

```typescript
// Script tag registration
console.log(`✅ Script tag registered for ${shop}`)

// Order processing
console.log(`[Order Create] Order ${orderId} - Receive in App: ${receiveInApp}`)

// Notification delivery
console.log(`✅ In-app notification sent for order ${orderNumber}`)
console.log(`✅ Push notification sent: ${messageId}`)
```

### Common Issues

**Issue**: ScriptTag API Deprecation Warning
- **Status**: ScriptTag API is deprecated for checkout (Aug 2025)
- **Impact**: Our script is only used on cart page (not checkout)
- **Action**: Monitor Shopify announcements for alternatives
- **Mitigation**: Plan migration to Theme App Extensions if needed

**Issue**: Cart attributes not persisting
- **Cause**: Customer modifies cart after setting attribute
- **Solution**: Script re-applies attribute on cart page load

**Issue**: Duplicate script tags
- **Cause**: Multiple app installations
- **Solution**: Script checks for existing tags before registering

## Future Enhancements

1. **Theme App Extensions**: Migrate from ScriptTag to Theme App Extensions for better performance and compatibility
2. **Order Status Page**: Add Beeylo tracking link to order status page
3. **Analytics Dashboard**: Track adoption rate of app delivery
4. **A/B Testing**: Test different checkbox placements and messaging
5. **Multi-language Support**: Translate checkbox text based on store locale

## Support

For questions or issues:
- Check Railway logs: `railway logs`
- Check Supabase logs: Dashboard → Logs
- Review webhook events: `shopify_webhook_events` table
- Contact: [Your Support Email]
