import { db } from '../lib/supabase';
import { SyncService } from './sync.service';
import { NotificationService } from './notification.service';
import { TrackingService } from './tracking.service';

export class WebhookService {
  private syncService: SyncService;
  private notificationService: NotificationService;
  private trackingService: TrackingService;

  constructor() {
    this.syncService = new SyncService();
    this.notificationService = new NotificationService();
    this.trackingService = new TrackingService();
  }

  /**
   * Handle orders/create webhook
   */
  async handleOrderCreate(shopDomain: string, payload: any) {
    try {
      const store = await db.getStoreByDomain(shopDomain);
      if (!store) {
        throw new Error(`Store not found: ${shopDomain}`);
      }

      // Check if customer opted to receive order in Beeylo app
      const receiveInApp = payload.note_attributes?.find(
        (attr: any) => attr.name === 'Receive_in_Beeylo_App'
      )?.value === 'Yes';

      console.log(`[Order Create] Order ${payload.id} - Receive in App: ${receiveInApp}`);

      // If customer opted for app delivery, tag the order in Shopify
      // This tag is used to identify orders where fulfillment notifications should be suppressed
      if (receiveInApp) {
        try {
          const { shopifyHelpers } = await import('../lib/shopify');
          await shopifyHelpers.addOrderTag(
            shopDomain,
            store.access_token,
            payload.id.toString(),
            'beeylo-app-delivery'
          );
          console.log(`[Order Create] Tagged order ${payload.id} with "beeylo-app-delivery"`);
        } catch (tagError) {
          console.error(`Failed to tag order ${payload.id}:`, tagError);
          // Don't throw - tagging is helpful but not critical
        }
      }

      // Sync the order with receive_in_app flag
      const order = await this.syncService.syncOrder(store.id, payload, receiveInApp);

      // Only send email notification if customer didn't opt for app delivery
      if (!receiveInApp) {
        await this.notificationService.sendOrderConfirmation(order);
      } else {
        console.log(`[Order Create] Skipping email notification - customer opted for app delivery`);
        // Send in-app notification instead
        await this.notificationService.sendInAppNotification(order);
      }

      return { success: true, order_id: order.id, receive_in_app: receiveInApp };
    } catch (error) {
      console.error('Failed to handle order create:', error);
      throw error;
    }
  }

  /**
   * Handle orders/updated webhook
   */
  async handleOrderUpdate(shopDomain: string, payload: any) {
    try {
      const store = await db.getStoreByDomain(shopDomain);
      if (!store) {
        throw new Error(`Store not found: ${shopDomain}`);
      }

      // Sync the updated order
      const order = await this.syncService.syncOrder(store.id, payload);

      return { success: true, order_id: order.id };
    } catch (error) {
      console.error('Failed to handle order update:', error);
      throw error;
    }
  }

  /**
   * Handle orders/cancelled webhook
   */
  async handleOrderCancelled(shopDomain: string, payload: any) {
    try {
      const store = await db.getStoreByDomain(shopDomain);
      if (!store) {
        throw new Error(`Store not found: ${shopDomain}`);
      }

      // Sync the cancelled order
      const order = await this.syncService.syncOrder(store.id, payload);

      // Send cancellation notification
      await this.notificationService.sendCancellationNotification(order);

      return { success: true, order_id: order.id };
    } catch (error) {
      console.error('Failed to handle order cancelled:', error);
      throw error;
    }
  }

  /**
   * Handle orders/fulfilled webhook
   */
  async handleOrderFulfilled(shopDomain: string, payload: any) {
    try {
      const store = await db.getStoreByDomain(shopDomain);
      if (!store) {
        throw new Error(`Store not found: ${shopDomain}`);
      }

      // Sync the order with fulfillments
      const order = await this.syncService.syncOrder(store.id, payload);

      return { success: true, order_id: order.id };
    } catch (error) {
      console.error('Failed to handle order fulfilled:', error);
      throw error;
    }
  }

  /**
   * Handle fulfillments/create webhook
   */
  async handleFulfillmentCreate(shopDomain: string, payload: any) {
    try {
      const store = await db.getStoreByDomain(shopDomain);
      if (!store) {
        throw new Error(`Store not found: ${shopDomain}`);
      }

      // Find the order
      const { data: order } = await db.supabase
        .from('shopify_orders')
        .select('*')
        .eq('store_id', store.id)
        .eq('shopify_order_id', payload.order_id.toString())
        .single();

      if (!order) {
        throw new Error(`Order not found: ${payload.order_id}`);
      }

      // Sync the fulfillment
      const fulfillment = await this.syncService.syncFulfillment(order.id, payload);

      // Check store settings for notification suppression preference
      const suppressNotifications = store.settings?.suppress_shopify_notifications_for_beeylo_orders !== false;

      // Send shipping notification based on order preference and store settings
      if (!order.receive_in_app) {
        // Regular order - always send email notification
        await this.notificationService.sendShippingNotification(order, fulfillment);
      } else if (!suppressNotifications) {
        // Beeylo app order, but store owner wants to keep Shopify emails too
        console.log(`[Fulfillment Create] Sending both email and app notification - store setting allows duplicate notifications`);
        await this.notificationService.sendShippingNotification(order, fulfillment);
      } else {
        // Beeylo app order with suppression enabled (default)
        console.log(`[Fulfillment Create] Sending in-app shipping notification for order ${payload.order_id}`);
        // Send in-app notification
        await this.notificationService.sendShippingNotification(order, fulfillment);
      }

      // Start tracking the shipment
      if (fulfillment.tracking_number && fulfillment.tracking_company) {
        await this.trackingService.startTracking(
          fulfillment.id,
          fulfillment.tracking_number,
          fulfillment.tracking_company
        );
      }

      return { success: true, fulfillment_id: fulfillment.id };
    } catch (error) {
      console.error('Failed to handle fulfillment create:', error);
      throw error;
    }
  }

  /**
   * Handle fulfillments/update webhook
   */
  async handleFulfillmentUpdate(shopDomain: string, payload: any) {
    try {
      const store = await db.getStoreByDomain(shopDomain);
      if (!store) {
        throw new Error(`Store not found: ${shopDomain}`);
      }

      // Find the order
      const { data: order } = await db.supabase
        .from('shopify_orders')
        .select('*')
        .eq('store_id', store.id)
        .eq('shopify_order_id', payload.order_id.toString())
        .single();

      if (!order) {
        throw new Error(`Order not found: ${payload.order_id}`);
      }

      // Sync the fulfillment
      const fulfillment = await this.syncService.syncFulfillment(order.id, payload);

      // Check tracking updates
      if (fulfillment.tracking_number && fulfillment.tracking_company) {
        await this.trackingService.startTracking(
          fulfillment.id,
          fulfillment.tracking_number,
          fulfillment.tracking_company
        );
      }

      return { success: true, fulfillment_id: fulfillment.id };
    } catch (error) {
      console.error('Failed to handle fulfillment update:', error);
      throw error;
    }
  }

  /**
   * Handle customers/create webhook
   */
  async handleCustomerCreate(shopDomain: string, payload: any) {
    try {
      const store = await db.getStoreByDomain(shopDomain);
      if (!store) {
        throw new Error(`Store not found: ${shopDomain}`);
      }

      // Sync the customer
      const customer = await this.syncService.syncCustomer(store.id, payload);

      return { success: true, customer_id: customer.id };
    } catch (error) {
      console.error('Failed to handle customer create:', error);
      throw error;
    }
  }

  /**
   * Handle customers/update webhook
   */
  async handleCustomerUpdate(shopDomain: string, payload: any) {
    try {
      const store = await db.getStoreByDomain(shopDomain);
      if (!store) {
        throw new Error(`Store not found: ${shopDomain}`);
      }

      // Sync the customer
      const customer = await this.syncService.syncCustomer(store.id, payload);

      return { success: true, customer_id: customer.id };
    } catch (error) {
      console.error('Failed to handle customer update:', error);
      throw error;
    }
  }

  /**
   * Log webhook event to database
   */
  async logWebhookEvent(storeId: string, topic: string, shopifyId: string, payload: any) {
    try {
      return await db.createWebhookEvent({
        store_id: storeId,
        topic,
        shopify_id: shopifyId,
        payload,
        processed: false,
      });
    } catch (error) {
      console.error('Failed to log webhook event:', error);
      return null;
    }
  }
}
