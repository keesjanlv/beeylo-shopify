import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { config } from '../config';

// Redis connection (use Railway Redis or local)
const redisConnection = new IORedis(config.redisUrl || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// Webhook processing queue
export const webhookQueue = new Queue('shopify-webhooks', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 3600, // Keep completed jobs for 1 hour
      count: 1000,
    },
    removeOnFail: {
      age: 86400, // Keep failed jobs for 24 hours
    },
  },
});

// Tracking update queue (lower priority, can be delayed)
export const trackingQueue = new Queue('tracking-updates', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      age: 3600,
      count: 500,
    },
  },
});

// Queue job types
export interface WebhookJob {
  topic: string;
  shopDomain: string;
  payload: any;
  storeId: string;
}

export interface TrackingJob {
  fulfillmentId: string;
  trackingNumber: string;
  courierName: string;
  storeId: string;
}

// Add jobs to queue
export async function queueWebhook(job: WebhookJob) {
  return webhookQueue.add('process-webhook', job, {
    priority: getPriority(job.topic),
  });
}

export async function queueTracking(job: TrackingJob) {
  return trackingQueue.add('fetch-tracking', job, {
    // Delay tracking by 5 minutes to let shipment data propagate
    delay: 5 * 60 * 1000,
  });
}

// Priority based on webhook type
function getPriority(topic: string): number {
  switch (topic) {
    case 'orders/create':
      return 1; // Highest - customer waiting
    case 'fulfillments/create':
      return 2; // High - shipping notification
    case 'fulfillments/update':
      return 3; // Medium
    default:
      return 5; // Low
  }
}

// Queue metrics for monitoring
export async function getQueueMetrics() {
  const [webhookCounts, trackingCounts] = await Promise.all([
    webhookQueue.getJobCounts(),
    trackingQueue.getJobCounts(),
  ]);

  return {
    webhooks: webhookCounts,
    tracking: trackingCounts,
    totalActive: webhookCounts.active + trackingCounts.active,
    totalWaiting: webhookCounts.waiting + trackingCounts.waiting,
  };
}

// Graceful shutdown
export async function closeQueues() {
  await Promise.all([
    webhookQueue.close(),
    trackingQueue.close(),
    redisConnection.quit(),
  ]);
}
