import Bottleneck from 'bottleneck';

/**
 * Per-store rate limiters for Shopify API calls
 * Shopify REST API: 2 requests/second per store
 * Shopify GraphQL: 1000 points/second (50 queries/sec avg)
 */

const storeLimiters = new Map<string, Bottleneck>();

export function getStoreLimiter(storeId: string): Bottleneck {
  if (!storeLimiters.has(storeId)) {
    storeLimiters.set(
      storeId,
      new Bottleneck({
        maxConcurrent: 1, // One request at a time per store
        minTime: 500, // 2 requests per second = 500ms between requests
        reservoir: 40, // Bucket size (Shopify allows bursts)
        reservoirRefreshAmount: 40,
        reservoirRefreshInterval: 1000, // Refill every second
      })
    );
  }
  return storeLimiters.get(storeId)!;
}

/**
 * Courier API rate limiters
 * PostNL: 10 req/sec
 * DHL: 5 req/sec
 * Others: 2 req/sec default
 */

const courierLimiters = new Map<string, Bottleneck>();

export function getCourierLimiter(courier: string): Bottleneck {
  if (!courierLimiters.has(courier)) {
    const limits = getCourierLimits(courier);
    courierLimiters.set(
      courier,
      new Bottleneck({
        maxConcurrent: 1,
        minTime: limits.minTime,
        reservoir: limits.reservoir,
        reservoirRefreshAmount: limits.reservoir,
        reservoirRefreshInterval: 1000,
      })
    );
  }
  return courierLimiters.get(courier)!;
}

function getCourierLimits(courier: string) {
  switch (courier) {
    case 'postnl':
      return { minTime: 100, reservoir: 10 }; // 10 req/sec
    case 'dhl':
      return { minTime: 200, reservoir: 5 }; // 5 req/sec
    case 'ups':
    case 'fedex':
      return { minTime: 250, reservoir: 4 }; // 4 req/sec
    case 'dpd':
    case 'gls':
    default:
      return { minTime: 500, reservoir: 2 }; // 2 req/sec default
  }
}

/**
 * Global rate limiter for when store/courier is unknown
 */
export const globalLimiter = new Bottleneck({
  maxConcurrent: 5,
  minTime: 200, // 5 req/sec
});

/**
 * Cleanup old limiters (call periodically)
 */
export function cleanupLimiters() {
  const now = Date.now();
  const maxAge = 3600000; // 1 hour

  for (const [storeId, limiter] of storeLimiters.entries()) {
    // @ts-ignore - accessing private property for cleanup
    if (now - limiter._lastReservoirRefresh > maxAge) {
      limiter.disconnect();
      storeLimiters.delete(storeId);
    }
  }

  for (const [courier, limiter] of courierLimiters.entries()) {
    // @ts-ignore
    if (now - limiter._lastReservoirRefresh > maxAge) {
      limiter.disconnect();
      courierLimiters.delete(courier);
    }
  }
}

// Cleanup every hour
setInterval(cleanupLimiters, 3600000);
