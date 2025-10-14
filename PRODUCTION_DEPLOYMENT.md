# 🚀 Production Deployment Guide

Complete guide for deploying your Shopify integration from ngrok (development) to production.

---

## 📊 Current Port Configuration

Your development setup uses these ports:

- **Dashboard**: `http://localhost:3001` (Next.js)
- **Shopify Integration Server**: `http://localhost:3002` (Express)
- **ngrok Tunnel**: `https://dario-scotopic-zenobia.ngrok-free.dev` → `localhost:3002`

---

## 🎯 Recommended Production Hosting Services

### Option 1: Railway (⭐ RECOMMENDED - Easiest)

**Why Railway?**
- ✅ Free tier available
- ✅ Automatic HTTPS
- ✅ GitHub integration
- ✅ Simple deployment
- ✅ Good for Node.js apps
- ✅ Built-in environment variables

**Cost**: $5/month after free tier (~500 hours)

**Deployment Steps**:

1. **Sign up for Railway**
   - Go to https://railway.app
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your Shopify integration repo

3. **Configure Build Settings**
   ```
   Build Command: npm install && npm run build
   Start Command: npm start
   Root Directory: shopify
   ```

4. **Add Environment Variables**
   - Go to "Variables" tab
   - Add all variables from your `.env` file:
   ```
   SHOPIFY_API_KEY=adc25704df868c0f4533009588ab8ac2
   SHOPIFY_API_SECRET=8f5b820d69fd3bdc0c69a718056017b8
   SUPABASE_URL=https://xcuvffwuyrdmufvgzczs.supabase.co
   SUPABASE_SERVICE_KEY=sb_secret_2qDFKcJPHP1bl99WlrsPLg_PTjtvOKq
   SHOPIFY_WEBHOOK_SECRET=4e5ccbde256023366b3060aba58a44354fed4adb4049a637ea6ca064c2e6cc5d
   PORT=3002
   NODE_ENV=production
   ```

5. **Get Your Production URL**
   - Railway will provide a URL like: `https://your-app.railway.app`
   - Update these variables in Railway:
   ```
   SHOPIFY_HOST=https://your-app.railway.app
   APP_URL=https://your-app.railway.app
   DASHBOARD_URL=https://your-dashboard.vercel.app
   ```

6. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Your app is live!

---

### Option 2: Render

**Why Render?**
- ✅ Free tier available
- ✅ Automatic HTTPS
- ✅ GitHub integration
- ✅ Great performance

**Cost**: Free tier available, paid starts at $7/month

**Deployment Steps**:

1. **Sign up for Render**
   - Go to https://render.com
   - Sign up with GitHub

2. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repo

3. **Configure Service**
   ```
   Name: beeylo-shopify-integration
   Environment: Node
   Build Command: npm install && npm run build
   Start Command: npm start
   ```

4. **Add Environment Variables**
   - Same as Railway (see above)

5. **Deploy**
   - Click "Create Web Service"
   - Your app will be live at `https://beeylo-shopify-integration.onrender.com`

---

### Option 3: DigitalOcean App Platform

**Why DigitalOcean?**
- ✅ Reliable infrastructure
- ✅ Good documentation
- ✅ Scalable

**Cost**: Starting at $5/month

**Deployment Steps**:

1. **Sign up for DigitalOcean**
   - Go to https://www.digitalocean.com
   - Create an account

2. **Create New App**
   - Go to "App Platform"
   - Click "Create App"
   - Connect GitHub repo

3. **Configure**
   - Select Node.js
   - Set build and start commands
   - Add environment variables

4. **Deploy**
   - Review and launch
   - Get your production URL

---

### Option 4: Heroku

**Why Heroku?**
- ✅ Battle-tested
- ✅ Many add-ons
- ✅ Good for beginners

**Cost**: Starting at $7/month (eco dynos)

**Deployment Steps**:

1. **Install Heroku CLI**
   ```bash
   npm install -g heroku
   ```

2. **Login**
   ```bash
   heroku login
   ```

3. **Create App**
   ```bash
   cd shopify
   heroku create beeylo-shopify-integration
   ```

4. **Add Environment Variables**
   ```bash
   heroku config:set SHOPIFY_API_KEY=adc25704df868c0f4533009588ab8ac2
   heroku config:set SHOPIFY_API_SECRET=8f5b820d69fd3bdc0c69a718056017b8
   # ... add all other variables
   ```

5. **Deploy**
   ```bash
   git push heroku main
   ```

---

## 🔧 Post-Deployment Steps

After deploying to any service, follow these steps:

### 1. Update Shopify App URLs

Go to Shopify Partners Dashboard:
1. Navigate to your app
2. Go to "App setup"
3. Update:
   - **App URL**: `https://your-production-url.com`
   - **Allowed redirection URLs**: `https://your-production-url.com/auth/callback`
4. Click "Save"

### 2. Test Webhooks

1. Create a test order in your Shopify store
2. Check the `webhook_events` table in Supabase:
   ```sql
   SELECT * FROM webhook_events ORDER BY created_at DESC LIMIT 10;
   ```
3. Verify `processed = true` and no errors

### 3. Verify Database Connection

```sql
-- Check if store is connected
SELECT * FROM shopify_stores WHERE is_active = true;

-- Check recent orders
SELECT * FROM shopify_orders ORDER BY synced_at DESC LIMIT 10;
```

### 4. Monitor Logs

In Railway/Render/DigitalOcean:
- Go to "Logs" tab
- Watch for any errors
- Ensure webhooks are being received

### 5. Update Dashboard

Update your dashboard's `.env` file:
```env
NEXT_PUBLIC_SHOPIFY_API_URL=https://your-production-url.com
```

Redeploy your dashboard (if on Vercel):
```bash
cd dashboardapp
vercel --prod
```

---

## 🔒 Security Checklist

Before going to production:

- [ ] All sensitive keys are in environment variables (not in code)
- [ ] HTTPS is enabled (automatic with Railway/Render)
- [ ] Supabase RLS policies are enabled
- [ ] Webhook secret is strong and random
- [ ] Rate limiting is considered (if expecting high traffic)
- [ ] CORS is properly configured
- [ ] No API keys are logged or exposed

---

## 📈 Monitoring & Maintenance

### Health Checks

Set up monitoring for your production service:

**Railway/Render**: Both provide built-in monitoring

**External Options**:
- UptimeRobot (free): https://uptimerobot.com
- Pingdom
- StatusCake

Monitor this endpoint:
```
GET https://your-production-url.com/health
```

### Log Rotation

For production, consider:
1. Using a logging service (Logtail, Papertrail)
2. Setting up log rotation
3. Monitoring error rates

### Database Maintenance

Weekly tasks:
```sql
-- Clean up old webhook events (older than 30 days)
DELETE FROM webhook_events WHERE created_at < NOW() - INTERVAL '30 days';

-- Check for failed syncs
SELECT * FROM webhook_events WHERE processed = false;

-- Monitor notification queue
SELECT COUNT(*) FROM order_notifications WHERE sent = false;
```

---

## 🚨 Troubleshooting Production Issues

### Webhooks Not Working

1. **Check URL is accessible**
   ```bash
   curl https://your-production-url.com/health
   ```

2. **Verify webhook signature**
   - Check `webhook_events` table for HMAC errors
   - Ensure `SHOPIFY_WEBHOOK_SECRET` matches in both places

3. **Check Shopify Dashboard**
   - Go to Partners → Your App → API calls
   - Look for webhook delivery failures

### Database Connection Issues

1. **Verify service role key**
   ```bash
   # Test connection
   curl https://xcuvffwuyrdmufvgzczs.supabase.co/rest/v1/shopify_stores \
     -H "apikey: YOUR_SERVICE_ROLE_KEY" \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
   ```

2. **Check RLS policies**
   - Ensure service_role policies are set to `USING (true)`

### Server Not Starting

1. **Check logs** in your hosting platform
2. **Verify all environment variables** are set
3. **Ensure PORT** is correct (use Railway/Render's default)
4. **Check build command** completed successfully

---

## 💰 Cost Comparison

| Service | Free Tier | Paid Start | Best For |
|---------|-----------|------------|----------|
| **Railway** | 500 hrs/month | $5/mo | Quick deployment |
| **Render** | 750 hrs/month | $7/mo | Reliability |
| **DigitalOcean** | No free tier | $5/mo | Scaling |
| **Heroku** | No free tier | $7/mo | Established apps |

**Recommendation**: Start with **Railway** or **Render** free tier, then upgrade based on usage.

---

## 🎯 Scaling Considerations

When you outgrow basic hosting:

### For 100+ stores:
- Add Redis for caching
- Use background job queues (Bull/BullMQ)
- Separate webhook processing to workers

### For 1000+ stores:
- Horizontal scaling (multiple instances)
- Database read replicas
- CDN for static assets
- Load balancer

### For 10,000+ stores:
- Microservices architecture
- Kubernetes deployment
- Dedicated Postgres instance
- Advanced monitoring (Datadog, New Relic)

---

## ✅ Deployment Checklist

Before launching:

**Pre-Deployment**:
- [ ] All tests passing locally
- [ ] Environment variables documented
- [ ] Database migration successful
- [ ] Webhooks tested with ngrok

**Deployment**:
- [ ] Choose hosting service
- [ ] Create production app
- [ ] Set all environment variables
- [ ] Deploy and verify build
- [ ] Get production URL

**Post-Deployment**:
- [ ] Update Shopify app URLs
- [ ] Test OAuth flow
- [ ] Create test order
- [ ] Verify webhooks work
- [ ] Check database tables
- [ ] Update dashboard .env
- [ ] Set up monitoring
- [ ] Document production URL

**Go Live**:
- [ ] Connect real stores
- [ ] Monitor for 24 hours
- [ ] Check error logs
- [ ] Verify notifications send
- [ ] Test tracking updates

---

## 📞 Support

If you encounter issues:

1. Check hosting platform logs
2. Review Supabase logs
3. Test with Shopify's webhook tester
4. Check the `webhook_events` table for errors
5. Verify all environment variables are set

---

## 🎉 You're Ready for Production!

Your Shopify integration is now ready to scale and handle real traffic. Remember to:
- Monitor logs regularly
- Keep dependencies updated
- Backup your database
- Document any customizations

Good luck! 🚀
