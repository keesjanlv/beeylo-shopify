import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Shopify Configuration
  shopify: {
    apiKey: process.env.SHOPIFY_API_KEY || '',
    apiSecret: process.env.SHOPIFY_API_SECRET || '',
    scopes: process.env.SHOPIFY_SCOPES || 'read_customers,read_discounts,read_fulfillments,write_fulfillments,read_inventory,read_orders,read_products',
    host: process.env.SHOPIFY_HOST || 'http://localhost:3001',
    webhookSecret: process.env.SHOPIFY_WEBHOOK_SECRET || '',
  },

  // Supabase Configuration
  supabase: {
    url: process.env.SUPABASE_URL || '',
    serviceKey: process.env.SUPABASE_SERVICE_KEY || '',
  },

  // Server Configuration
  server: {
    port: parseInt(process.env.PORT || '3001'),
    nodeEnv: process.env.NODE_ENV || 'development',
  },

  // Redis Configuration (for queue and rate limiting)
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // Courier API Configuration
  couriers: {
    postnl: {
      apiKey: process.env.POSTNL_API_KEY || '',
      apiUrl: process.env.POSTNL_API_URL || 'https://api.postnl.nl/shipment/v2',
      enabled: !!process.env.POSTNL_API_KEY,
    },
    dhl: {
      apiKey: process.env.DHL_API_KEY || '',
      apiUrl: process.env.DHL_API_URL || 'https://api-eu.dhl.com/track/shipments',
      enabled: !!process.env.DHL_API_KEY,
    },
    dpd: {
      apiKey: process.env.DPD_API_KEY || '',
      apiUrl: process.env.DPD_API_URL || 'https://api.dpd.com/shipping/v1',
      enabled: !!process.env.DPD_API_KEY,
    },
    ups: {
      clientId: process.env.UPS_CLIENT_ID || '',
      clientSecret: process.env.UPS_CLIENT_SECRET || '',
      apiUrl: process.env.UPS_API_URL || 'https://onlinetools.ups.com',
      enabled: !!(process.env.UPS_CLIENT_ID && process.env.UPS_CLIENT_SECRET),
    },
    fedex: {
      clientId: process.env.FEDEX_CLIENT_ID || '',
      clientSecret: process.env.FEDEX_CLIENT_SECRET || '',
      apiUrl: process.env.FEDEX_API_URL || 'https://apis.fedex.com',
      enabled: !!(process.env.FEDEX_CLIENT_ID && process.env.FEDEX_CLIENT_SECRET),
    },
    gls: {
      username: process.env.GLS_API_USERNAME || '',
      password: process.env.GLS_API_PASSWORD || '',
      apiUrl: process.env.GLS_ENVIRONMENT === 'production'
        ? (process.env.GLS_API_URL || 'https://api.mygls.hu')
        : (process.env.GLS_API_URL_TEST || 'https://api.test.mygls.hu'),
      customerId: process.env.GLS_CUSTOMER_ID || '',
      enabled: !!(process.env.GLS_API_USERNAME && process.env.GLS_API_PASSWORD),
      webhookSecret: process.env.GLS_WEBHOOK_SECRET || '',
    },
  },

  // App URLs
  urls: {
    app: process.env.APP_URL || 'http://localhost:3001',
    dashboard: process.env.DASHBOARD_URL || 'http://localhost:3000',
  },
};

// Validate required config
export function validateConfig() {
  const required = [
    'SHOPIFY_API_KEY',
    'SHOPIFY_API_SECRET',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_KEY',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please copy .env.example to .env and fill in the values.'
    );
  }
}
