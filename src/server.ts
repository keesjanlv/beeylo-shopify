import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { config, validateConfig } from './config';
import authRoutes from './routes/auth.routes';
import webhookRoutes from './routes/webhook.routes';
import apiRoutes from './routes/api.routes';

// Validate configuration
try {
  validateConfig();
} catch (error: any) {
  console.error('Configuration error:', error.message);
  process.exit(1);
}

const app: Express = express();
const PORT = config.server.port;

// Security middleware - Configure helmet to allow Shopify iframe embedding
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      frameAncestors: [
        "'self'",
        "https://*.myshopify.com",
        "https://admin.shopify.com"
      ],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.shopify.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://*.myshopify.com"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration - Allow Shopify admin and dashboard
app.use(cors({
  origin: [
    config.urls.dashboard,
    'http://localhost:3000',
    'http://localhost:3001',
    /https:\/\/.*\.myshopify\.com$/,
    'https://admin.shopify.com'
  ],
  credentials: true,
}));

// Serve static files from public directory
app.use('/public', express.static(path.join(__dirname, '..', 'public')));

// Body parsing middleware
// Note: Webhooks need raw body for signature verification
app.use('/webhooks', express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf.toString();
  },
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'beeylo-shopify-integration',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/auth', authRoutes);
app.use('/webhooks', webhookRoutes);
app.use('/api', apiRoutes);

// Root endpoint - Serve the dashboard UI (only visible inside Shopify admin)
app.get('/', (req: Request, res: Response) => {
  try {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
  } catch (error) {
    // Fallback if HTML file doesn't exist
    res.json({
      status: 'running',
      service: 'Beeylo Shopify Integration',
      message: 'This app is running correctly. To use it, install it in your Shopify admin.',
      endpoints: {
        health: '/health',
        install: '/auth/shopify?shop=YOUR_STORE.myshopify.com&company_id=YOUR_COMPANY_ID',
        api: '/api',
        webhooks: '/webhooks',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: config.server.nodeEnv === 'development' ? err.message : undefined,
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🐝 Beeylo Shopify Integration Server                    ║
║                                                            ║
║   Status: Running                                          ║
║   Port: ${PORT}                                              ║
║   Environment: ${config.server.nodeEnv}                           ║
║                                                            ║
║   Endpoints:                                               ║
║   - OAuth: ${config.urls.app}/auth/shopify                    ║
║   - Webhooks: ${config.urls.app}/webhooks                     ║
║   - API: ${config.urls.app}/api                               ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

export default app;
