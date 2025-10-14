# 🔑 What You Need to Provide - Checklist

This is a complete list of all keys, strings, and URLs you need to provide to make the Shopify integration work.

---

## ✅ REQUIRED (Must Have)

### 1. Shopify App Credentials
**Where to get:** Create Shopify app at https://partners.shopify.com

```env
SHOPIFY_API_KEY=your_api_key_here
SHOPIFY_API_SECRET=your_api_secret_here
```

**Steps:**
1. Go to Shopify Partners dashboard
2. Create new app
3. Copy API key and API secret from "API credentials" tab

---

### 2. Supabase Credentials
**Where to get:** Your Supabase project dashboard

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here
```

**Steps:**
1. Go to Supabase project settings
2. Copy Project URL
3. Copy service_role key from API settings (NOT the anon key!)

---

### 3. Server URLs
**What these are:** Where your Shopify integration server is deployed

```env
SHOPIFY_HOST=https://your-domain.com
APP_URL=https://your-domain.com
DASHBOARD_URL=https://your-dashboard.com
```

**Options:**
- **Development:** Use ngrok URL (e.g., `https://abc123.ngrok.io`)
- **Production:** Your actual domain (e.g., `https://api.beeylo.com`)

---

### 4. Webhook Secret
**What this is:** A random string to verify webhooks are from Shopify

```env
SHOPIFY_WEBHOOK_SECRET=generate_a_random_string
```

**How to generate:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output.

---

### 5. Dashboard Environment Variable
**Where:** In your dashboard's `.env.local` file

```env
NEXT_PUBLIC_SHOPIFY_API_URL=http://localhost:3001
# or production:
NEXT_PUBLIC_SHOPIFY_API_URL=https://your-shopify-integration.com
```

---

## 📦 OPTIONAL (Recommended for Later)

### Courier API Keys (NOT NEEDED Initially!)

**Why optional:** Shopify provides automatic tracking updates for PostNL, DHL, DPD, and 100+ carriers built-in. You only need these if you want MORE detailed tracking.

#### PostNL API (Optional)
```env
POSTNL_API_KEY=your_postnl_key
```
- Website: https://developer.postnl.nl
- Cost: Contact PostNL
- Benefit: More detailed tracking events

#### DHL API (Optional)
```env
DHL_API_KEY=your_dhl_key
```
- Website: https://developer.dhl.com
- Cost: Contact DHL
- Benefit: Real-time location tracking

#### DPD API (Optional)
```env
DPD_API_KEY=your_dpd_key
```
- Website: Contact DPD
- Cost: Contact DPD
- Benefit: Additional tracking details

---

## 📋 Complete `.env` File Template

Copy this to `shopify/.env` and fill in the REQUIRED values:

```env
# ============================================
# REQUIRED - Must fill in these values
# ============================================

# Shopify App Credentials (from Partners dashboard)
SHOPIFY_API_KEY=
SHOPIFY_API_SECRET=
SHOPIFY_SCOPES=read_orders,read_customers,read_products,read_fulfillments

# Your Server URLs (use ngrok for development)
SHOPIFY_HOST=
APP_URL=
DASHBOARD_URL=

# Supabase Credentials
SUPABASE_URL=
SUPABASE_SERVICE_KEY=

# Webhook Secret (generate with node command above)
SHOPIFY_WEBHOOK_SECRET=

# Server Config
PORT=3001
NODE_ENV=development

# ============================================
# OPTIONAL - Leave blank for now
# ============================================

# Courier APIs (Shopify provides tracking automatically!)
POSTNL_API_KEY=
DHL_API_KEY=
DPD_API_KEY=
```

---

## 📝 What You DON'T Need to Worry About

- ❌ No Firebase keys needed (using Supabase)
- ❌ No Flutter app keys needed here (separate setup)
- ❌ No payment processor keys needed
- ❌ No email service keys needed
- ❌ Courier APIs NOT required (Shopify handles it!)

---

## 🎯 Minimum to Get Started

**To test everything locally, you ONLY need:**

1. ✅ Shopify API Key + Secret
2. ✅ Supabase URL + Service Key
3. ✅ Generated Webhook Secret
4. ✅ ngrok URL (for development)

**That's it!** The courier APIs can be added later if you want more detailed tracking.

---

## 🔍 Where to Find Each Value

| Value | Where to Find It |
|-------|-----------------|
| `SHOPIFY_API_KEY` | Shopify Partners > Your App > API credentials |
| `SHOPIFY_API_SECRET` | Shopify Partners > Your App > API credentials |
| `SUPABASE_URL` | Supabase Dashboard > Settings > API > Project URL |
| `SUPABASE_SERVICE_KEY` | Supabase Dashboard > Settings > API > service_role key |
| `SHOPIFY_HOST` | Your ngrok URL or production domain |
| `APP_URL` | Same as SHOPIFY_HOST |
| `DASHBOARD_URL` | Your Next.js dashboard URL |
| `SHOPIFY_WEBHOOK_SECRET` | Generate yourself with node command |
| `NEXT_PUBLIC_SHOPIFY_API_URL` | Same as APP_URL |

---

## 📞 Questions?

- **"Do I need courier APIs?"** → NO! Start without them. Shopify provides tracking.
- **"What is service_role key?"** → It's in Supabase API settings, NOT the anon key
- **"What domain for development?"** → Use ngrok (see setup guide)
- **"Where to deploy in production?"** → Railway, Render, Heroku, or any Node.js host

---

## ✨ Next Steps

Once you have the REQUIRED values:

1. Copy `.env.example` to `.env`
2. Fill in the required values
3. Run `npm install` in the shopify folder
4. Run `npm run dev`
5. Start ngrok: `ngrok http 3001`
6. Update `.env` with ngrok URL
7. Test connection from dashboard

That's it! 🚀
