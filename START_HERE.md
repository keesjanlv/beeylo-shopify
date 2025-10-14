# 🚀 START HERE - Quick Setup Guide

Everything you need to get the Shopify integration running in 30 minutes.

---

## 📋 Quick Checklist

- [ ] 1. Get Shopify API credentials (15 min)
- [ ] 2. Run database migration (2 min)
- [ ] 3. Configure environment variables (5 min)
- [ ] 4. Start the integration server (2 min)
- [ ] 5. Connect your first store (5 min)
- [ ] 6. Test with an order (5 min)

**Total time: ~30 minutes**

---

## 1️⃣ Get Shopify API Credentials (15 min)

### Quick Steps:

1. Go to https://partners.shopify.com (sign up if needed)
2. Click "Apps" → "Create app" → "Create app manually"
3. Fill in:
   - Name: `Beeylo Order Notifications`
   - App URL: `https://temp.com` (we'll update this)
   - Callback URL: `https://temp.com/auth/callback`
4. Go to "API credentials" tab
5. Copy these two values:

```
SHOPIFY_API_KEY=abc123...
SHOPIFY_API_SECRET=xyz789...
```

6. Scroll to "Admin API access scopes"
7. Check these boxes:
   - ✅ read_orders
   - ✅ read_customers
   - ✅ read_products
   - ✅ read_fulfillments
8. Click "Save"

**✅ Done!** You now have your Shopify credentials.

📖 **Detailed guide:** See `SHOPIFY_APP_CREATION.md`

---

## 2️⃣ Run Database Migration (2 min)

1. Open https://supabase.com and go to your project
2. Click "SQL Editor" in sidebar
3. Click "New Query"
4. Copy ALL contents from `shopify/database/schema.sql`
5. Paste into SQL Editor
6. Click "Run" (bottom right)
7. Wait for "Success. No rows returned"

**✅ Done!** Database is ready.

📖 **Need help?** See `SETUP_GUIDE.md` Part 2

---

## 3️⃣ Configure Environment (5 min)

### Step 1: Copy template

```bash
cd shopify
cp .env.example .env
```

### Step 2: Get your Supabase credentials

1. Go to Supabase project settings
2. Click "API" in sidebar
3. Copy these values:

```
Project URL: https://xxxxx.supabase.co
service_role key: eyJhbGc... (long key)
```

### Step 3: Generate webhook secret

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output.

### Step 4: Fill in `.env`

Open `shopify/.env` and fill in:

```env
# From Shopify (step 1)
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret

# From Supabase (step 2)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...

# Generated (step 3)
SHOPIFY_WEBHOOK_SECRET=your_generated_secret

# Leave these for now (we'll update in step 4)
SHOPIFY_HOST=http://localhost:3001
APP_URL=http://localhost:3001
DASHBOARD_URL=http://localhost:3000
```

**✅ Done!** Configuration is complete.

📖 **What do these mean?** See `WHAT_YOU_NEED.md`

---

## 4️⃣ Start the Server (2 min)

### For Development (Local Testing)

**Terminal 1:** Start the integration server
```bash
cd shopify
npm install
npm run dev
```

You should see:
```
🐝 Beeylo Shopify Integration Server
Status: Running
Port: 3001
```

**Terminal 2:** Start ngrok (for webhooks)
```bash
ngrok http 3001
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

**Terminal 3:** Update your URLs
```bash
cd shopify
# Edit .env and update:
SHOPIFY_HOST=https://abc123.ngrok.io
APP_URL=https://abc123.ngrok.io
```

Restart the server (Ctrl+C in Terminal 1, then `npm run dev` again)

### Update Shopify App URLs

1. Go back to https://partners.shopify.com
2. Click on your app
3. Go to "App setup"
4. Update:
   - App URL: `https://abc123.ngrok.io`
   - Allowed redirection URLs: Add `https://abc123.ngrok.io/auth/callback`
5. Click "Save"

**✅ Done!** Server is running and reachable.

---

## 5️⃣ Connect Your First Store (5 min)

### Option A: Use Your Dashboard (Recommended)

1. Open your dashboard: http://localhost:3000
2. Go to Settings → Integrations
3. Enter your store domain: `yourstore.myshopify.com`
4. Click "Connect Shopify Store"
5. You'll be redirected to Shopify
6. Click "Install app"
7. You'll be redirected back to your dashboard

**✅ Done!** Store is connected.

### Option B: Manual URL (if dashboard not ready)

Visit this URL in your browser:
```
http://localhost:3001/auth/shopify?shop=yourstore.myshopify.com&company_id=YOUR_COMPANY_ID
```

Replace:
- `yourstore` with your actual store name
- `YOUR_COMPANY_ID` with your company UUID from Supabase

---

## 6️⃣ Test with an Order (5 min)

### Create Test Order

1. Go to your Shopify admin
2. Click "Orders" → "Create order"
3. Add a customer (or create test customer)
4. Add a product
5. Click "Create order"
6. Click "Mark as paid"

### Verify Sync

**Check 1: Server Logs**
You should see:
```
Webhook received: orders/create
Order synced: #1001
Notification created
```

**Check 2: Supabase**
```sql
-- Check if order was synced
SELECT * FROM shopify_orders ORDER BY created_at DESC LIMIT 1;

-- Check if notification was created
SELECT * FROM order_notifications ORDER BY created_at DESC LIMIT 1;
```

**Check 3: Dashboard**
- Go to your dashboard
- Check if order appears in customer data

### Test Fulfillment

1. In Shopify admin, open the order
2. Click "Fulfill items"
3. Add tracking:
   - Tracking number: `3SABCD1234567890`
   - Carrier: `PostNL`
4. Click "Fulfill"

**Verify:**
- Check server logs for fulfillment webhook
- Check `order_fulfillments` table in Supabase
- New notification should be created for shipping

**✅ Done!** Integration is working!

---

## 🎉 Success! What Now?

Your integration is now:
- ✅ Connected to Shopify
- ✅ Syncing orders in real-time
- ✅ Creating notifications
- ✅ Tracking fulfillments

### Next Steps:

1. **Link customers** - Connect Shopify customers to Beeylo users by email
2. **Customize notifications** - Create notification templates in your dashboard
3. **Test Flutter app** - Verify notifications appear in the mobile app
4. **Deploy to production** - When ready, deploy to a real server

---

## 🆘 Troubleshooting

### Server won't start
```bash
# Check if port 3001 is already in use
netstat -ano | findstr :3001  # Windows
lsof -i :3001                  # Mac/Linux

# Kill the process or use different port
PORT=3002 npm run dev
```

### Webhooks not working
1. Check ngrok is running
2. Verify ngrok URL in `.env` matches Shopify app settings
3. Check server logs for webhook errors
4. Verify HMAC signature in `webhook_events` table

### Orders not syncing
1. Check `webhook_events` table for errors
2. Verify Shopify API credentials are correct
3. Check `shopify_stores.is_active = true`
4. Try manual sync: `POST /api/sync` with store_id

### Database errors
1. Verify all tables were created (run schema.sql again)
2. Check RLS policies are enabled
3. Verify service_role key (not anon key) is used

---

## 📚 Documentation

- **`WHAT_YOU_NEED.md`** - Complete list of required credentials
- **`SHOPIFY_TRACKING_EXPLAINED.md`** - How tracking works (spoiler: courier APIs not needed!)
- **`SETUP_GUIDE.md`** - Detailed step-by-step guide
- **`SHOPIFY_APP_CREATION.md`** - Creating your Shopify app
- **`QUICK_REFERENCE.md`** - Commands and queries
- **`README.md`** - Project overview

---

## 💡 Pro Tips

1. **Keep ngrok running** - If ngrok stops, webhooks will fail
2. **Check logs first** - Most issues are visible in server logs
3. **Test in development store** - Don't test on live store!
4. **Courier APIs not needed** - Shopify provides tracking for free
5. **Start simple** - Get basic flow working, then add features

---

## 🎯 Quick Reference

**Server URLs:**
- Health check: http://localhost:3001/health
- API docs: http://localhost:3001/

**Dashboard:**
- Integrations: http://localhost:3000/settings/integrations

**Supabase:**
- Tables to check: `shopify_stores`, `shopify_orders`, `order_notifications`

**Common Commands:**
```bash
# Start server
npm run dev

# Start ngrok
ngrok http 3001

# Check logs
# (watch Terminal 1)

# Manual sync
curl -X POST http://localhost:3001/api/sync \
  -H "Content-Type: application/json" \
  -d '{"store_id": "your-store-id"}'
```

---

**Need help?** Check the other documentation files or contact the development team.

**Ready to go?** Start with step 1! 🚀
