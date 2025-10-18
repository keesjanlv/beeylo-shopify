import { shopify } from '../lib/shopify';
import { db } from '../lib/supabase';
import { config } from '../config';
import { WEBHOOK_TOPICS, shopifyHelpers } from '../lib/shopify';

export class OAuthService {
  /**
   * Generate the OAuth authorization URL for a shop
   */
  async getAuthorizationUrl(shop: string, companyId: string): Promise<string> {
    // Validate shop domain
    if (!shop || !shop.includes('.myshopify.com')) {
      throw new Error('Invalid shop domain. Must be in format: yourstore.myshopify.com');
    }

    // Store company_id in state for callback
    const state = Buffer.from(JSON.stringify({ companyId })).toString('base64');

    // Sanitize shop domain
    const sanitizedShop = shopify.utils.sanitizeShop(shop, true)!;

    // Build OAuth URL manually to avoid adapter issues
    const scopes = config.shopify.scopes;
    const redirectUri = `${config.urls.app}/auth/callback`;
    const authUrl = `https://${sanitizedShop}/admin/oauth/authorize?client_id=${config.shopify.apiKey}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

    return authUrl;
  }

  /**
   * Handle OAuth callback and exchange code for access token
   */
  async handleCallback(shop: string, code: string, state: string) {
    // Decode state to get company_id
    const { companyId } = JSON.parse(Buffer.from(state, 'base64').toString());

    // Exchange code for access token manually
    const accessTokenUrl = `https://${shop}/admin/oauth/access_token`;
    const response = await fetch(accessTokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: config.shopify.apiKey,
        client_secret: config.shopify.apiSecret,
        code: code,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to exchange code for access token: ${response.statusText}`);
    }

    const tokenData: any = await response.json();
    const accessToken = tokenData.access_token as string;
    const scope = tokenData.scope as string;

    if (!accessToken) {
      throw new Error('Failed to obtain access token');
    }

    // Check if store already exists
    const existingStore = await db.getStoreByDomain(shop);

    let store;
    if (existingStore) {
      // Update existing store
      store = await db.updateStore(existingStore.id, {
        access_token: accessToken,
        scope: scope,
        is_active: true,
        updated_at: new Date().toISOString(),
      });
    } else {
      // Create new store connection
      store = await db.createStore({
        company_id: companyId,
        shop_domain: shop,
        access_token: accessToken,
        scope: scope,
        is_active: true,
        settings: {
          auto_sync: true,
          sync_interval_minutes: 15,
          send_order_confirmations: true,
          send_shipping_updates: true,
          send_delivery_updates: true,
        },
      });
    }

    // Register webhooks
    await this.registerWebhooks(shop, accessToken, store.id);

    // Register script tag for cart integration
    await this.registerScriptTag(shop, accessToken);

    // Trigger initial sync
    await this.performInitialSync(store.id, shop, accessToken);

    return store;
  }

  /**
   * Register script tag for Beeylo cart integration
   */
  private async registerScriptTag(shop: string, accessToken: string) {
    try {
      const scriptUrl = `${config.urls.app}/public/beeylo-cart-integration.js`;

      // Check if script tag already exists
      const existingScripts = await shopifyHelpers.listScriptTags(shop, accessToken);
      const scriptExists = existingScripts.script_tags?.some(
        (script: any) => script.src === scriptUrl
      );

      if (scriptExists) {
        console.log(`Script tag already registered for ${shop}`);
        return;
      }

      // Register new script tag
      await shopifyHelpers.registerScriptTag(shop, accessToken, {
        event: 'onload',
        src: scriptUrl,
        display_scope: 'online_store',
      });

      console.log(`✅ Script tag registered for ${shop}: ${scriptUrl}`);
    } catch (error) {
      console.error('Failed to register script tag:', error);
      // Don't throw - script tag is nice-to-have, not critical
    }
  }

  /**
   * Register all necessary webhooks
   */
  private async registerWebhooks(shop: string, accessToken: string, storeId: string) {
    const webhookUrl = `${config.urls.app}/webhooks`;

    const topics = [
      WEBHOOK_TOPICS.ORDERS_CREATE,
      WEBHOOK_TOPICS.ORDERS_UPDATED,
      WEBHOOK_TOPICS.ORDERS_CANCELLED,
      WEBHOOK_TOPICS.ORDERS_FULFILLED,
      WEBHOOK_TOPICS.ORDERS_PAID,
      WEBHOOK_TOPICS.FULFILLMENTS_CREATE,
      WEBHOOK_TOPICS.FULFILLMENTS_UPDATE,
      WEBHOOK_TOPICS.CUSTOMERS_CREATE,
      WEBHOOK_TOPICS.CUSTOMERS_UPDATE,
    ];

    // Get existing webhooks
    const existingWebhooks = await shopifyHelpers.listWebhooks(shop, accessToken);
    const existingTopics = existingWebhooks.webhooks?.map((w: any) => w.topic) || [];

    // Register missing webhooks
    for (const topic of topics) {
      if (!existingTopics.includes(topic)) {
        try {
          await shopifyHelpers.registerWebhook(shop, accessToken, topic, `${webhookUrl}/${topic.replace('/', '-')}`);
          console.log(`Registered webhook: ${topic} for ${shop}`);
        } catch (error) {
          console.error(`Failed to register webhook ${topic}:`, error);
        }
      }
    }
  }

  /**
   * Perform initial sync of orders and customers
   */
  private async performInitialSync(storeId: string, shop: string, accessToken: string) {
    try {
      // Sync last 90 days of orders
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - 90);

      const orders = await shopifyHelpers.fetchOrders(shop, accessToken, {
        since: sinceDate.toISOString(),
        limit: 250,
      });

      // Import sync service
      const { SyncService } = await import('./sync.service');
      const syncService = new SyncService();

      if (orders.orders) {
        for (const order of orders.orders) {
          await syncService.syncOrder(storeId, order);
        }
      }

      console.log(`Initial sync completed for ${shop}: ${orders.orders?.length || 0} orders`);
    } catch (error) {
      console.error('Initial sync failed:', error);
      throw error;
    }
  }

  /**
   * Disconnect a Shopify store
   */
  async disconnectStore(storeId: string) {
    const store = await db.getStore(storeId);

    if (!store) {
      throw new Error('Store not found');
    }

    // Delete all webhooks
    try {
      const webhooks = await shopifyHelpers.listWebhooks(store.shop_domain, store.access_token);

      if (webhooks.webhooks) {
        for (const webhook of webhooks.webhooks) {
          await shopifyHelpers.deleteWebhook(store.shop_domain, store.access_token, webhook.id);
        }
      }
    } catch (error) {
      console.error('Failed to delete webhooks:', error);
    }

    // Delete script tags
    try {
      const scripts = await shopifyHelpers.listScriptTags(store.shop_domain, store.access_token);

      if (scripts.script_tags) {
        for (const script of scripts.script_tags) {
          if (script.src?.includes(config.urls.app)) {
            await shopifyHelpers.deleteScriptTag(store.shop_domain, store.access_token, script.id);
          }
        }
      }
    } catch (error) {
      console.error('Failed to delete script tags:', error);
    }

    // Deactivate store
    await db.updateStore(storeId, { is_active: false });

    return { success: true, message: 'Store disconnected successfully' };
  }
}
