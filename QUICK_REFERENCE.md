# Beeylo Shopify Integration - Quick Reference

Quick reference guide for common tasks and operations.

## 🚀 Quick Start Commands

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run with ngrok (for development)
ngrok http 3001
```

## 🔑 Environment Variables (Minimal Required)

```env
SHOPIFY_API_KEY=your_key
SHOPIFY_API_SECRET=your_secret
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=your_key
SHOPIFY_HOST=https://your-domain.com
APP_URL=https://your-domain.com
DASHBOARD_URL=https://dashboard.com
```

## 📡 API Endpoints Quick Reference

### Connect Store
```bash
# Browser: Redirect to this URL
https://your-api.com/auth/shopify?shop=store.myshopify.com&company_id=xxx
```

### Disconnect Store
```bash
curl -X POST https://your-api.com/auth/disconnect \
  -H "Content-Type: application/json" \
  -d '{"store_id": "xxx"}'
```

### Get Orders
```bash
curl "https://your-api.com/api/orders?store_id=xxx&limit=50"
```

### Get Order Details
```bash
curl "https://your-api.com/api/orders/{order_id}"
```

### Manual Sync
```bash
curl -X POST https://your-api.com/api/sync \
  -H "Content-Type: application/json" \
  -d '{"store_id": "xxx"}'
```

### Refresh Tracking
```bash
curl -X POST https://your-api.com/api/tracking/refresh \
  -H "Content-Type: application/json" \
  -d '{"fulfillment_id": "xxx"}'
```

### Get Notifications
```bash
curl "https://your-api.com/api/notifications?user_id=xxx&unread_only=true"
```

## 🗄️ Database Queries

### Check Connected Stores
```sql
SELECT shop_domain, is_active, created_at
FROM shopify_stores
WHERE company_id = 'xxx';
```

### Recent Orders
```sql
SELECT order_number, email, total_price, fulfillment_status, created_at
FROM shopify_orders
WHERE store_id = 'xxx'
ORDER BY created_at DESC
LIMIT 10;
```

### Pending Notifications
```sql
SELECT * FROM order_notifications
WHERE sent = false
ORDER BY created_at ASC;
```

### Webhook Errors
```sql
SELECT topic, error, created_at
FROM webhook_events
WHERE processed = false OR error IS NOT NULL
ORDER BY created_at DESC;
```

### Tracking Updates
```sql
SELECT t.*, f.tracking_number
FROM tracking_updates t
JOIN order_fulfillments f ON f.id = t.fulfillment_id
WHERE f.order_id = 'xxx'
ORDER BY t.timestamp DESC;
```

## 🔧 Common Tasks

### Add New Webhook Topic

1. Add to `WEBHOOK_TOPICS` in `src/lib/shopify.ts`:
```typescript
export const WEBHOOK_TOPICS = {
  // ... existing
  NEW_TOPIC: 'new/topic',
} as const;
```

2. Add to OAuth service webhook registration:
```typescript
const topics = [
  // ... existing
  WEBHOOK_TOPICS.NEW_TOPIC,
];
```

3. Create handler in `webhook.service.ts`:
```typescript
async handleNewTopic(shopDomain: string, payload: any) {
  // Handle webhook
}
```

4. Add route in `webhook.routes.ts`:
```typescript
router.post('/new-topic', verifyWebhook, async (req, res) => {
  const result = await webhookService.handleNewTopic(
    req.shopDomain!,
    req.body
  );
  res.json(result);
});
```

### Add New Courier

1. Add API config to `src/config/index.ts`:
```typescript
couriers: {
  // ... existing
  newCourier: {
    apiKey: process.env.NEW_COURIER_API_KEY || '',
    apiUrl: 'https://api.newcourier.com',
  },
}
```

2. Add to `normalizeCourierName()` in `tracking.service.ts`:
```typescript
if (name.includes('newcourier')) {
  return 'newcourier';
}
```

3. Add fetch method:
```typescript
private async fetchNewCourierTracking(trackingNumber: string) {
  // Implement courier API call
  // Return CourierTrackingResponse
}
```

4. Add to switch statement in `fetchTrackingInfo()`:
```typescript
case 'newcourier':
  return this.fetchNewCourierTracking(trackingNumber);
```

### Link Customer to Beeylo User

```sql
-- By email (automatic during sync)
UPDATE shopify_customers
SET beeylo_user_id = (
  SELECT id FROM users WHERE email = shopify_customers.email
)
WHERE beeylo_user_id IS NULL;

-- Manual linking
UPDATE shopify_customers
SET beeylo_user_id = 'beeylo-user-id'
WHERE email = 'customer@example.com';
```

## 🐛 Debugging

### Check Server Health
```bash
curl https://your-api.com/health
```

### View Recent Logs (Production)
```bash
# Assuming deployed with PM2
pm2 logs shopify-integration --lines 100

# Or with Docker
docker logs -f container-name
```

### Test Webhook Locally
```bash
# Create test payload
cat > test-order.json << EOF
{
  "id": 123456789,
  "email": "test@example.com",
  "order_number": 1001,
  "total_price": "99.99",
  "line_items": []
}
EOF

# Send test webhook
curl -X POST http://localhost:3001/webhooks/orders-create \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Shop-Domain: test.myshopify.com" \
  -H "X-Shopify-Hmac-Sha256: test-hmac" \
  -d @test-order.json
```

### Verify Database Connection
```bash
# In Node.js REPL
node
> const { supabase } = require('./dist/lib/supabase');
> await supabase.from('shopify_stores').select('count');
```

## 📊 Monitoring Queries

### System Health Check
```sql
-- Active stores
SELECT COUNT(*) FROM shopify_stores WHERE is_active = true;

-- Orders synced today
SELECT COUNT(*) FROM shopify_orders
WHERE DATE(synced_at) = CURRENT_DATE;

-- Pending notifications
SELECT COUNT(*) FROM order_notifications WHERE sent = false;

-- Recent webhook errors
SELECT COUNT(*) FROM webhook_events
WHERE error IS NOT NULL
AND created_at > NOW() - INTERVAL '1 day';
```

### Performance Metrics
```sql
-- Average sync time (if tracking)
SELECT AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) as avg_seconds
FROM webhook_events
WHERE processed = true;

-- Orders by fulfillment status
SELECT fulfillment_status, COUNT(*)
FROM shopify_orders
GROUP BY fulfillment_status;

-- Notifications sent per day (last 7 days)
SELECT DATE(sent_at) as date, COUNT(*) as sent
FROM order_notifications
WHERE sent = true
AND sent_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(sent_at)
ORDER BY date DESC;
```

## 🔒 Security Checklist

- [ ] `SHOPIFY_API_SECRET` is not committed to git
- [ ] `SUPABASE_SERVICE_KEY` is kept secret
- [ ] Webhook HMAC verification is enabled
- [ ] HTTPS is used for all URLs
- [ ] CORS is properly configured
- [ ] Rate limiting is implemented
- [ ] RLS policies are enabled in Supabase
- [ ] Access tokens are encrypted at rest
- [ ] Logs don't contain sensitive data

## 📝 Deployment Checklist

Before deploying to production:

- [ ] Environment variables are set
- [ ] Database migration has been run
- [ ] Shopify app URLs are updated
- [ ] HTTPS is enabled and working
- [ ] Health check endpoint responds
- [ ] Webhooks are reachable publicly
- [ ] Test order flows end-to-end
- [ ] Error monitoring is set up
- [ ] Backup strategy is in place
- [ ] Rate limits are configured

## 🆘 Emergency Procedures

### Stop Processing Webhooks
```sql
-- Disable all stores temporarily
UPDATE shopify_stores SET is_active = false;
```

### Clear Notification Queue
```sql
-- Mark all as sent (use with caution!)
UPDATE order_notifications
SET sent = true, sent_at = NOW()
WHERE sent = false;
```

### Disconnect All Stores
```bash
# Get all store IDs
psql -c "SELECT id FROM shopify_stores WHERE is_active = true"

# Disconnect each one
for id in $(psql -tA -c "SELECT id FROM shopify_stores"); do
  curl -X POST https://your-api.com/auth/disconnect \
    -d "{\"store_id\":\"$id\"}"
done
```

### Force Re-sync
```sql
-- Reset sync timestamps to trigger full re-sync
UPDATE shopify_orders SET synced_at = '2020-01-01';
```

## 📞 Support Contacts

- Shopify API Status: https://status.shopify.com
- Supabase Status: https://status.supabase.com
- ngrok Status: https://status.ngrok.com

## 📚 Useful Resources

- Shopify Admin API: https://shopify.dev/docs/api/admin
- Webhook Topics: https://shopify.dev/docs/api/admin-rest/webhooks
- OAuth Guide: https://shopify.dev/docs/apps/auth/oauth
- Rate Limits: https://shopify.dev/docs/api/usage/rate-limits
- Supabase Docs: https://supabase.com/docs

---

Last Updated: $(date)
