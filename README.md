# Beeylo Shopify Integration

Real-time order sync and customer notifications for Shopify stores.

## Features

- = Real-time order synchronization via webhooks
- =æ Fulfillment and tracking updates
- =d Customer data sync
- =š Multi-courier tracking support (PostNL, DHL, DPD, UPS, FedEx, GLS)
- =Ê Dashboard with statistics and recent activity
- = Order notifications

## Tech Stack

- Node.js + TypeScript
- Express.js
- Shopify API
- Supabase (PostgreSQL)
- ngrok (for local development)

## Local Development

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Shopify Partner account
- ngrok account

### Setup

1. Clone the repository:
```bash
git clone https://github.com/keesjanlv/beeylo-shopify.git
cd beeylo-shopify
```

2. Install dependencies:
```bash
npm install
```

3. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

4. Fill in your environment variables in `.env`:
   - Shopify API credentials from your Partner Dashboard
   - Supabase URL and service key
   - Generate a webhook secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

5. Start ngrok:
```bash
ngrok http 3002
```

6. Update `SHOPIFY_HOST` and `APP_URL` in `.env` with your ngrok URL

7. Start the development server:
```bash
npm run dev
```

## Railway Deployment

### Environment Variables

Set these in Railway dashboard:

**Required:**
- `SHOPIFY_API_KEY` - Your Shopify API key
- `SHOPIFY_API_SECRET` - Your Shopify API secret
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_KEY` - Your Supabase service role key
- `SHOPIFY_WEBHOOK_SECRET` - Generated webhook secret
- `SHOPIFY_HOST` - Your Railway app URL (e.g., `https://your-app.railway.app`)
- `APP_URL` - Same as SHOPIFY_HOST
- `PORT` - 3002 (or Railway's PORT variable)
- `NODE_ENV` - production

**Optional (Courier APIs):**
- `POSTNL_API_KEY`
- `DHL_API_KEY`
- `DPD_CLIENT_ID` / `DPD_CLIENT_SECRET`
- `UPS_CLIENT_ID` / `UPS_CLIENT_SECRET`
- `FEDEX_CLIENT_ID` / `FEDEX_CLIENT_SECRET`
- `GLS_USERNAME` / `GLS_PASSWORD`

### Deployment Steps

1. Push to GitHub:
```bash
git push origin main
```

2. In Railway:
   - Create new project
   - Connect your GitHub repository
   - Add environment variables
   - Deploy

3. Update Shopify App URLs:
   - App URL: `https://your-app.railway.app`
   - Redirect URLs: `https://your-app.railway.app/auth/shopify/callback`

4. The app will automatically register webhooks when stores connect

## API Endpoints

### OAuth
- `GET /auth/shopify` - Initiate OAuth flow
- `GET /auth/shopify/callback` - OAuth callback

### Webhooks
- `POST /webhooks/orders-create`
- `POST /webhooks/orders-updated`
- `POST /webhooks/orders-cancelled`
- `POST /webhooks/orders-fulfilled`
- `POST /webhooks/orders-paid`
- `POST /webhooks/fulfillments-create`
- `POST /webhooks/fulfillments-update`
- `POST /webhooks/customers-create`
- `POST /webhooks/customers-update`

### API
- `GET /api/stats` - Dashboard statistics
- `GET /api/recent-activity` - Recent orders
- `GET /api/orders` - Get orders for a store
- `GET /api/stores` - Get connected stores
- `GET /api/notifications` - Get notifications for a user
- `POST /api/sync` - Manually sync store orders

## Database Schema

See Supabase migrations in your database or use the sync service to initialize tables:

- `shopify_stores` - Connected Shopify stores
- `shopify_orders` - Synced orders
- `shopify_customers` - Customer data
- `order_fulfillments` - Fulfillment tracking
- `tracking_updates` - Shipment tracking events
- `webhook_events` - Webhook event log
- `order_notifications` - Customer notifications

## Security

- All webhook requests are verified using HMAC-SHA256
- API secret is used for webhook signature verification
- Environment variables are never committed (see `.gitignore`)
- Supabase Row Level Security (RLS) policies protect data

## Support

For issues or questions, please open an issue on GitHub.

## License

Proprietary - Beeylo
