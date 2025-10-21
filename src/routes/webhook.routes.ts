import { Router, Request, Response } from 'express';
import { WebhookService } from '../services/webhook.service';
import { db } from '../lib/supabase';
import crypto from 'crypto';
import { config } from '../config';
import { queueWebhook } from '../lib/queue';

const router = Router();
const webhookService = new WebhookService();

/**
 * Middleware to verify Shopify webhook using HMAC
 */
async function verifyWebhook(req: Request, res: Response, next: Function) {
  try {
    const hmac = req.get('X-Shopify-Hmac-Sha256');
    const shop = req.get('X-Shopify-Shop-Domain');
    const topic = req.get('X-Shopify-Topic');

    console.log(`[Webhook] Received webhook: ${topic} from ${shop}`);

    if (!hmac || !shop) {
      console.error('[Webhook] Missing headers:', { hmac: !!hmac, shop: !!shop });
      return res.status(401).json({ error: 'Missing webhook headers' });
    }

    // Use rawBody captured by Express middleware
    const rawBody = (req as any).rawBody;
    if (!rawBody) {
      console.error('[Webhook] Missing raw body');
      return res.status(400).json({ error: 'Missing raw body' });
    }

    // Manually verify HMAC using Shopify API Secret
    const hash = crypto
      .createHmac('sha256', config.shopify.apiSecret)
      .update(rawBody, 'utf8')
      .digest('base64');

    const isValid = hash === hmac;

    if (!isValid) {
      console.error('[Webhook] Signature mismatch', {
        topic,
        shop,
        expected: hash.substring(0, 20) + '...',
        received: hmac.substring(0, 20) + '...'
      });
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    console.log(`[Webhook] ✓ Verified ${topic} from ${shop}`);

    // Attach shop to request
    req.shopDomain = shop;
    next();
  } catch (error) {
    console.error('[Webhook] Verification error:', error);
    res.status(500).json({ error: 'Webhook verification failed' });
  }
}

/**
 * Helper to queue webhook and respond immediately
 */
async function queueAndRespond(
  req: Request,
  res: Response,
  topic: string
) {
  try {
    // Get store for storeId
    const store = await db.getStoreByDomain(req.shopDomain!);
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    // Queue webhook processing (responds within 1 second)
    await queueWebhook({
      topic,
      shopDomain: req.shopDomain!,
      payload: req.body,
      storeId: store.id,
    });

    // Acknowledge immediately (Shopify requires response within 5 seconds)
    res.status(200).json({ success: true, queued: true });
  } catch (error: any) {
    console.error(`${topic} webhook error:`, error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST /webhooks/orders-create
 */
router.post('/orders-create', verifyWebhook, async (req: Request, res: Response) => {
  await queueAndRespond(req, res, 'orders/create');
});

/**
 * POST /webhooks/orders-updated
 */
router.post('/orders-updated', verifyWebhook, async (req: Request, res: Response) => {
  await queueAndRespond(req, res, 'orders/updated');
});

/**
 * POST /webhooks/orders-cancelled
 */
router.post('/orders-cancelled', verifyWebhook, async (req: Request, res: Response) => {
  await queueAndRespond(req, res, 'orders/cancelled');
});

/**
 * POST /webhooks/orders-fulfilled
 */
router.post('/orders-fulfilled', verifyWebhook, async (req: Request, res: Response) => {
  await queueAndRespond(req, res, 'orders/fulfilled');
});

/**
 * POST /webhooks/orders-paid
 */
router.post('/orders-paid', verifyWebhook, async (req: Request, res: Response) => {
  await queueAndRespond(req, res, 'orders/updated');
});

/**
 * POST /webhooks/fulfillments-create
 */
router.post('/fulfillments-create', verifyWebhook, async (req: Request, res: Response) => {
  await queueAndRespond(req, res, 'fulfillments/create');
});

/**
 * POST /webhooks/fulfillments-update
 */
router.post('/fulfillments-update', verifyWebhook, async (req: Request, res: Response) => {
  await queueAndRespond(req, res, 'fulfillments/update');
});

/**
 * POST /webhooks/customers-create
 */
router.post('/customers-create', verifyWebhook, async (req: Request, res: Response) => {
  await queueAndRespond(req, res, 'customers/create');
});

/**
 * POST /webhooks/customers-update
 */
router.post('/customers-update', verifyWebhook, async (req: Request, res: Response) => {
  await queueAndRespond(req, res, 'customers/update');
});

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      shopDomain?: string;
    }
  }
}

export default router;
