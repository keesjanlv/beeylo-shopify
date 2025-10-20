import '@shopify/shopify-api/adapters/node';
import { shopifyApi, ApiVersion, Session } from '@shopify/shopify-api';
import { config } from '../config';

// Initialize Shopify API client
export const shopify = shopifyApi({
  apiKey: config.shopify.apiKey,
  apiSecretKey: config.shopify.apiSecret,
  scopes: config.shopify.scopes.split(','),
  hostName: new URL(config.shopify.host).hostname,
  hostScheme: new URL(config.shopify.host).protocol.replace(':', '') as 'http' | 'https',
  apiVersion: ApiVersion.October23,
  isEmbeddedApp: false,
  isCustomStoreApp: false,
});

// Create a GraphQL client for a specific shop
export function createShopifyClient(shop: string, accessToken: string) {
  const session = new Session({
    id: `offline_${shop}`,
    shop,
    state: 'active',
    isOnline: false,
    accessToken,
  });

  return new shopify.clients.Graphql({ session });
}

// Create REST client for a specific shop
export function createRestClient(shop: string, accessToken: string) {
  const session = new Session({
    id: `offline_${shop}`,
    shop,
    state: 'active',
    isOnline: false,
    accessToken,
  });

  return new shopify.clients.Rest({ session });
}

// Shopify API helper functions
export const shopifyHelpers = {
  // Fetch orders from Shopify
  async fetchOrders(shop: string, accessToken: string, options?: { since?: string; limit?: number }) {
    const client = createRestClient(shop, accessToken);

    const params: any = {
      limit: options?.limit || 250,
      status: 'any',
    };

    if (options?.since) {
      params.created_at_min = options.since;
    }

    const response = await client.get({
      path: 'orders',
      query: params,
    });

    return response.body as any;
  },

  // Fetch a single order
  async fetchOrder(shop: string, accessToken: string, orderId: string) {
    const client = createRestClient(shop, accessToken);

    const response = await client.get({
      path: `orders/${orderId}`,
    });

    return response.body as any;
  },

  // Fetch customers from Shopify
  async fetchCustomers(shop: string, accessToken: string, options?: { since?: string; limit?: number }) {
    const client = createRestClient(shop, accessToken);

    const params: any = {
      limit: options?.limit || 250,
    };

    if (options?.since) {
      params.created_at_min = options.since;
    }

    const response = await client.get({
      path: 'customers',
      query: params,
    });

    return response.body as any;
  },

  // Fetch a single customer
  async fetchCustomer(shop: string, accessToken: string, customerId: string) {
    const client = createRestClient(shop, accessToken);

    const response = await client.get({
      path: `customers/${customerId}`,
    });

    return response.body as any;
  },

  // Fetch fulfillments for an order
  async fetchFulfillments(shop: string, accessToken: string, orderId: string) {
    const client = createRestClient(shop, accessToken);

    const response = await client.get({
      path: `orders/${orderId}/fulfillments`,
    });

    return response.body as any;
  },

  // Register webhooks
  async registerWebhook(shop: string, accessToken: string, topic: string, address: string) {
    const client = createRestClient(shop, accessToken);

    const response = await client.post({
      path: 'webhooks',
      data: {
        webhook: {
          topic,
          address,
          format: 'json',
        },
      },
    });

    return response.body as any;
  },

  // List registered webhooks
  async listWebhooks(shop: string, accessToken: string) {
    const client = createRestClient(shop, accessToken);

    const response = await client.get({
      path: 'webhooks',
    });

    return response.body as any;
  },

  // Delete a webhook
  async deleteWebhook(shop: string, accessToken: string, webhookId: string) {
    const client = createRestClient(shop, accessToken);

    await client.delete({
      path: `webhooks/${webhookId}`,
    });
  },

  // List script tags
  async listScriptTags(shop: string, accessToken: string) {
    const client = createRestClient(shop, accessToken);

    const response = await client.get({
      path: 'script_tags',
    });

    return response.body as any;
  },

  // Register a script tag
  async registerScriptTag(shop: string, accessToken: string, scriptData: { event: string; src: string; display_scope: string }) {
    const client = createRestClient(shop, accessToken);

    const response = await client.post({
      path: 'script_tags',
      data: {
        script_tag: scriptData,
      },
    });

    return response.body as any;
  },

  // Delete a script tag
  async deleteScriptTag(shop: string, accessToken: string, scriptTagId: string) {
    const client = createRestClient(shop, accessToken);

    await client.delete({
      path: `script_tags/${scriptTagId}`,
    });
  },

  // Update order tags (used to mark Beeylo app delivery orders)
  async updateOrderTags(shop: string, accessToken: string, orderId: string, tags: string) {
    const client = createRestClient(shop, accessToken);

    const response = await client.put({
      path: `orders/${orderId}`,
      data: {
        order: {
          id: orderId,
          tags: tags,
        },
      },
    });

    return response.body as any;
  },

  // Add tags to an existing order (preserves existing tags)
  async addOrderTag(shop: string, accessToken: string, orderId: string, newTag: string) {
    try {
      // First, fetch the current order to get existing tags
      const orderResponse = await this.fetchOrder(shop, accessToken, orderId);
      const order = orderResponse.order;

      // Parse existing tags
      const existingTags = order.tags ? order.tags.split(',').map((t: string) => t.trim()) : [];

      // Add new tag if it doesn't exist
      if (!existingTags.includes(newTag)) {
        existingTags.push(newTag);
      }

      // Update with combined tags
      const updatedTags = existingTags.join(', ');
      return await this.updateOrderTags(shop, accessToken, orderId, updatedTags);
    } catch (error) {
      console.error('Failed to add order tag:', error);
      throw error;
    }
  },
};

// Webhook topics to register
export const WEBHOOK_TOPICS = {
  ORDERS_CREATE: 'orders/create',
  ORDERS_UPDATED: 'orders/updated',
  ORDERS_CANCELLED: 'orders/cancelled',
  ORDERS_FULFILLED: 'orders/fulfilled',
  ORDERS_PAID: 'orders/paid',
  FULFILLMENTS_CREATE: 'fulfillments/create',
  FULFILLMENTS_UPDATE: 'fulfillments/update',
  CUSTOMERS_CREATE: 'customers/create',
  CUSTOMERS_UPDATE: 'customers/update',
} as const;

export type WebhookTopic = typeof WEBHOOK_TOPICS[keyof typeof WEBHOOK_TOPICS];
