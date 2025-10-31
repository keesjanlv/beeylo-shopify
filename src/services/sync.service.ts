import { db } from '../lib/supabase';
import { shopifyHelpers } from '../lib/shopify';
import { NotificationService } from './notification.service';

export class SyncService {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  /**
   * Sync a single order from Shopify to database
   */
  async syncOrder(storeId: string, shopifyOrder: any, receiveInApp?: boolean) {
    try {
      // First, sync the customer if exists (from order webhook data, not Customers API)
      let customerId = null;
      if (shopifyOrder.customer) {
        try {
          const customer = await this.syncCustomer(storeId, shopifyOrder.customer);
          customerId = customer.id;
        } catch (customerError) {
          // Customer sync failed - continue without customer_id
          // Order will still be created with email for user linking
          console.warn('Failed to sync customer, continuing with order sync:', customerError);
        }
      }

      // Check for receive_in_app from note_attributes if not explicitly provided
      if (receiveInApp === undefined) {
        receiveInApp = shopifyOrder.note_attributes?.find(
          (attr: any) => attr.name === 'Receive_in_Beeylo_App'
        )?.value === 'Yes';
      }

      // Prepare order data
      const orderData = {
        store_id: storeId,
        customer_id: customerId,
        shopify_order_id: shopifyOrder.id.toString(),
        order_number: shopifyOrder.name || shopifyOrder.order_number?.toString(),
        email: shopifyOrder.email,
        phone: shopifyOrder.phone,
        financial_status: shopifyOrder.financial_status,
        fulfillment_status: shopifyOrder.fulfillment_status,
        total_price: parseFloat(shopifyOrder.total_price || shopifyOrder.current_total_price || '0'),
        currency: shopifyOrder.currency || 'EUR',
        line_items: this.formatLineItems(shopifyOrder.line_items),
        shipping_address: shopifyOrder.shipping_address,
        billing_address: shopifyOrder.billing_address,
        receive_in_app: receiveInApp || false,
        created_at: shopifyOrder.created_at,
        updated_at: shopifyOrder.updated_at,
        cancelled_at: shopifyOrder.cancelled_at,
        synced_at: new Date().toISOString(),
      };

      // Upsert order
      const order = await db.upsertOrder(orderData);

      // Sync fulfillments if they exist
      if (shopifyOrder.fulfillments && shopifyOrder.fulfillments.length > 0) {
        for (const fulfillment of shopifyOrder.fulfillments) {
          await this.syncFulfillment(order.id, fulfillment);
        }
      }

      return order;
    } catch (error) {
      console.error('Failed to sync order:', error);
      throw error;
    }
  }

  /**
   * Sync a customer from Shopify to database
   */
  async syncCustomer(storeId: string, shopifyCustomer: any) {
    try {
      const customerData = {
        store_id: storeId,
        shopify_customer_id: shopifyCustomer.id.toString(),
        email: shopifyCustomer.email,
        phone: shopifyCustomer.phone,
        first_name: shopifyCustomer.first_name,
        last_name: shopifyCustomer.last_name,
        orders_count: shopifyCustomer.orders_count || 0,
        total_spent: parseFloat(shopifyCustomer.total_spent || '0'),
        verified_email: shopifyCustomer.verified_email || false,
        tax_exempt: shopifyCustomer.tax_exempt || false,
        tags: shopifyCustomer.tags ? shopifyCustomer.tags.split(',').map((t: string) => t.trim()) : [],
        created_at: shopifyCustomer.created_at,
        updated_at: shopifyCustomer.updated_at,
        synced_at: new Date().toISOString(),
      };

      const customer = await db.upsertCustomer(customerData);

      // Auto-link to Beeylo user by email
      const { CustomerLinkingService } = await import('./customer-linking.service');
      const linkingService = new CustomerLinkingService();
      await linkingService.autoLinkByEmail(customer.id);

      return customer;
    } catch (error) {
      console.error('Failed to sync customer:', error);
      throw error;
    }
  }

  /**
   * Sync a fulfillment from Shopify to database
   */
  async syncFulfillment(orderId: string, shopifyFulfillment: any) {
    try {
      const fulfillmentData = {
        order_id: orderId,
        shopify_fulfillment_id: shopifyFulfillment.id.toString(),
        status: shopifyFulfillment.status,
        tracking_company: shopifyFulfillment.tracking_company,
        tracking_number: shopifyFulfillment.tracking_number,
        tracking_url: shopifyFulfillment.tracking_url,
        shipment_status: shopifyFulfillment.shipment_status,
        line_items: this.formatLineItems(shopifyFulfillment.line_items),
        created_at: shopifyFulfillment.created_at,
        updated_at: shopifyFulfillment.updated_at,
      };

      const fulfillment = await db.upsertFulfillment(fulfillmentData);

      // If tracking number exists, start tracking
      if (fulfillment.tracking_number && fulfillment.tracking_company) {
        const { TrackingService } = await import('./tracking.service');
        const trackingService = new TrackingService();
        await trackingService.startTracking(fulfillment.id, fulfillment.tracking_number, fulfillment.tracking_company);
      }

      return fulfillment;
    } catch (error) {
      console.error('Failed to sync fulfillment:', error);
      throw error;
    }
  }

  /**
   * Sync orders for a store (manual or scheduled sync)
   */
  async syncStoreOrders(storeId: string, since?: string) {
    try {
      const store = await db.getStore(storeId);

      if (!store || !store.is_active) {
        throw new Error('Store not found or inactive');
      }

      const orders = await shopifyHelpers.fetchOrders(store.shop_domain, store.access_token, {
        since: since,
        limit: 250,
      });

      let syncedCount = 0;
      if (orders.orders) {
        for (const order of orders.orders) {
          await this.syncOrder(storeId, order);
          syncedCount++;
        }
      }

      return {
        success: true,
        orders_synced: syncedCount,
        message: `Successfully synced ${syncedCount} orders`,
      };
    } catch (error) {
      console.error('Failed to sync store orders:', error);
      throw error;
    }
  }

  /**
   * Format line items for storage
   */
  private formatLineItems(lineItems: any[] = []) {
    return lineItems.map((item) => ({
      id: item.id?.toString(),
      product_id: item.product_id?.toString(),
      variant_id: item.variant_id?.toString(),
      title: item.title || item.name,
      quantity: item.quantity,
      price: parseFloat(item.price || '0'),
      sku: item.sku,
      vendor: item.vendor,
      product_exists: item.product_exists !== false,
      fulfillment_service: item.fulfillment_service,
      fulfillment_status: item.fulfillment_status,
      image_url: item.properties?.find((p: any) => p.name === '_image_url')?.value,
    }));
  }

  /**
   * Find Beeylo user by email
   */
  private async findBeeyloUserByEmail(email: string) {
    try {
      const { data } = await db.supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      return data;
    } catch (error) {
      return null;
    }
  }
}
