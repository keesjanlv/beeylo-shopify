import { db } from '../lib/supabase';

/**
 * OrderSyncService
 * Syncs orders from shopify_orders table to orders table (Flutter format)
 */
export class OrderSyncService {
  /**
   * Sync Shopify order to orders table for Flutter app
   */
  async syncToFlutterOrders(shopifyOrderId: string) {
    try {
      // 1. Fetch shopify_order with relations
      const { data: shopifyOrder, error: fetchError } = await db.supabase
        .from('shopify_orders')
        .select(`
          *,
          customer:shopify_customers!customer_id(beeylo_user_id, email),
          store:shopify_stores!store_id(company_id),
          fulfillments:order_fulfillments(tracking_number, tracking_company, status, shipment_status)
        `)
        .eq('id', shopifyOrderId)
        .single();

      if (fetchError || !shopifyOrder) {
        throw new Error(`Order not found: ${fetchError?.message}`);
      }

      // 2. Transform to orders format (only fields that exist in orders table)
      const orderData = {
        user_id: shopifyOrder.customer?.beeylo_user_id || null,
        company_id: shopifyOrder.store?.company_id || null,
        order_name: shopifyOrder.order_number,
        order_number: shopifyOrder.order_number,
        title: this.generateTitle(shopifyOrder.line_items),
        products: shopifyOrder.line_items,
        subject: `Order ${shopifyOrder.order_number}`,
        tracking_number: shopifyOrder.fulfillments?.[0]?.tracking_number || null,
        courier_name: shopifyOrder.fulfillments?.[0]?.tracking_company || null,
        order_events: this.generateEvents(shopifyOrder),
        created_at: shopifyOrder.created_at,
        updated_at: shopifyOrder.updated_at,
      };

      // 3. Upsert to orders table
      const { data: order, error: upsertError } = await db.supabase
        .from('orders')
        .upsert(orderData, { onConflict: 'order_number' })
        .select()
        .single();

      if (upsertError) {
        throw new Error(`Failed to upsert order: ${upsertError.message}`);
      }

      console.log(`✅ Synced order ${shopifyOrder.order_number} to orders table`);
      return order;

    } catch (error) {
      console.error('Order sync failed:', error);
      throw error;
    }
  }

  /**
   * Generate user-friendly title from line items
   */
  private generateTitle(lineItems: any[]): string {
    if (!lineItems?.length) return 'Order';

    const total = lineItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const first = lineItems[0];
    const firstName = first.title || first.name || 'Product';

    if (lineItems.length === 1) {
      return `${firstName} x${first.quantity || 1}`;
    } else {
      return `${firstName} and ${total - (first.quantity || 1)} more`;
    }
  }

  /**
   * Generate order events timeline
   */
  private generateEvents(order: any): any[] {
    const events = [];

    if (order.created_at) {
      events.push({
        date: order.created_at,
        event: 'Order placed',
        status: 'completed'
      });
    }

    if (order.financial_status === 'paid') {
      events.push({
        date: order.updated_at,
        event: 'Payment confirmed',
        status: 'completed'
      });
    }

    if (order.fulfillment_status === 'fulfilled') {
      events.push({
        date: order.updated_at,
        event: 'Shipped',
        status: 'completed'
      });

      // Add tracking info if available
      if (order.fulfillments?.[0]?.tracking_number) {
        events.push({
          date: order.updated_at,
          event: 'Out for delivery',
          status: 'in_progress'
        });
      }
    }

    if (order.cancelled_at) {
      events.push({
        date: order.cancelled_at,
        event: 'Cancelled',
        status: 'cancelled'
      });
    }

    // Sort by date
    return events.sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }

  /**
   * One-time migration: sync all existing shopify_orders to orders table
   */
  async syncAllExisting() {
    try {
      const { data: orders, error } = await db.supabase
        .from('shopify_orders')
        .select('id, order_number');

      if (error) {
        throw new Error(`Failed to fetch orders: ${error.message}`);
      }

      console.log(`Starting sync of ${orders?.length || 0} orders...`);

      let successCount = 0;
      let errorCount = 0;

      for (const order of orders || []) {
        try {
          await this.syncToFlutterOrders(order.id);
          successCount++;
        } catch (err) {
          console.error(`Failed to sync order ${order.order_number}:`, err);
          errorCount++;
        }
      }

      console.log(`✅ Sync complete: ${successCount} successful, ${errorCount} failed`);

      return {
        total: orders?.length || 0,
        success: successCount,
        failed: errorCount
      };

    } catch (error) {
      console.error('Bulk sync failed:', error);
      throw error;
    }
  }
}
