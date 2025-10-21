import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { WebhookService } from '../services/webhook.service';
import { TrackingService } from '../services/tracking.service';
import { WebhookJob, TrackingJob } from '../lib/queue';
import { getStoreLimiter, getCourierLimiter } from '../lib/rate-limiter';
import { config } from '../config';

const redisConnection = new IORedis(config.redisUrl || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const webhookService = new WebhookService();
const trackingService = new TrackingService();

/**
 * Webhook processing worker
 * Processes queued webhooks from Shopify
 */
export const webhookWorker = new Worker(
  'shopify-webhooks',
  async (job) => {
    const data = job.data as WebhookJob;
    console.log(`[Worker] Processing ${data.topic} for ${data.shopDomain}`);

    try {
      // Apply rate limiting per store
      const limiter = getStoreLimiter(data.storeId);

      await limiter.schedule(async () => {
        switch (data.topic) {
          case 'orders/create':
            return await webhookService.handleOrderCreate(data.shopDomain, data.payload);

          case 'orders/updated':
            return await webhookService.handleOrderUpdate(data.shopDomain, data.payload);

          case 'orders/cancelled':
            return await webhookService.handleOrderCancelled(data.shopDomain, data.payload);

          case 'fulfillments/create':
            return await webhookService.handleFulfillmentCreate(data.shopDomain, data.payload);

          case 'fulfillments/update':
            return await webhookService.handleFulfillmentUpdate(data.shopDomain, data.payload);

          case 'customers/create':
            return await webhookService.handleCustomerCreate(data.shopDomain, data.payload);

          case 'customers/update':
            return await webhookService.handleCustomerUpdate(data.shopDomain, data.payload);

          default:
            console.log(`[Worker] Unknown topic: ${data.topic}`);
            return { success: false, error: 'Unknown topic' };
        }
      });

      console.log(`[Worker] ✅ Completed ${data.topic} for ${data.shopDomain}`);
      return { success: true };
    } catch (error: any) {
      console.error(`[Worker] ❌ Failed ${data.topic}:`, error.message);
      throw error; // Will trigger retry
    }
  },
  {
    connection: redisConnection,
    concurrency: 10, // Process 10 webhooks concurrently
    limiter: {
      max: 100, // Max 100 jobs
      duration: 1000, // per second
    },
  }
);

/**
 * Tracking update worker
 * Fetches tracking updates from courier APIs
 */
export const trackingWorker = new Worker(
  'tracking-updates',
  async (job) => {
    const data = job.data as TrackingJob;
    console.log(`[Tracking Worker] Fetching ${data.courierName} tracking for ${data.trackingNumber}`);

    try {
      // Apply courier-specific rate limiting
      const limiter = getCourierLimiter(data.courierName.toLowerCase());

      const result = await limiter.schedule(async () => {
        return await trackingService.startTracking(
          data.fulfillmentId,
          data.trackingNumber,
          data.courierName
        );
      });

      console.log(`[Tracking Worker] ✅ Updated tracking for ${data.trackingNumber}`);
      return { success: true, events: result?.events?.length || 0 };
    } catch (error: any) {
      console.error(`[Tracking Worker] ❌ Failed tracking:`, error.message);

      // Don't retry if courier API is not configured
      if (error.message?.includes('not configured')) {
        console.log('[Tracking Worker] Courier API not configured, marking as completed');
        return { success: false, skipped: true };
      }

      throw error; // Will trigger retry
    }
  },
  {
    connection: redisConnection,
    concurrency: 5, // Process 5 tracking requests concurrently
    limiter: {
      max: 20, // Max 20 jobs
      duration: 1000, // per second (conservative across all couriers)
    },
  }
);

// Worker event handlers
webhookWorker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} completed`);
});

webhookWorker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err.message);
});

trackingWorker.on('completed', (job) => {
  console.log(`[Tracking Worker] Job ${job.id} completed`);
});

trackingWorker.on('failed', (job, err) => {
  console.error(`[Tracking Worker] Job ${job?.id} failed:`, err.message);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Worker] Shutting down...');
  await webhookWorker.close();
  await trackingWorker.close();
  await redisConnection.quit();
  process.exit(0);
});
