import { db } from '../lib/supabase';

export class NotificationService {
  /**
   * Send order confirmation notification
   */
  async sendOrderConfirmation(order: any) {
    try {
      // Find the customer and their Beeylo user ID
      const customer = await db.supabase
        .from('shopify_customers')
        .select('*, beeylo_user_id')
        .eq('id', order.customer_id)
        .single();

      if (!customer.data?.beeylo_user_id) {
        console.log(`No Beeylo user linked for customer ${order.customer_id}`);
        return null;
      }

      // Get store settings
      const store = await db.getStore(order.store_id);
      if (!store.settings.send_order_confirmations) {
        return null;
      }

      // Create notification
      const notification = await db.createNotification({
        order_id: order.id,
        customer_id: order.customer_id,
        beeylo_user_id: customer.data.beeylo_user_id,
        type: 'order_confirmation',
        title: `Order Confirmed - ${order.order_number}`,
        message: `Your order has been confirmed and is being prepared for shipment.`,
        data: {
          order_number: order.order_number,
          total_price: order.total_price,
          currency: order.currency,
          line_items: order.line_items,
          estimated_delivery: this.estimateDelivery(),
        },
        template_id: store.settings.notification_template_id,
      });

      // Send to Beeylo app (this would integrate with your notification system)
      await this.sendToBeeyloApp(notification);

      return notification;
    } catch (error) {
      console.error('Failed to send order confirmation:', error);
      return null;
    }
  }

  /**
   * Send shipping notification
   */
  async sendShippingNotification(order: any, fulfillment: any) {
    try {
      const customer = await db.supabase
        .from('shopify_customers')
        .select('*, beeylo_user_id')
        .eq('id', order.customer_id)
        .single();

      if (!customer.data?.beeylo_user_id) {
        return null;
      }

      const store = await db.getStore(order.store_id);
      if (!store.settings.send_shipping_updates) {
        return null;
      }

      const notification = await db.createNotification({
        order_id: order.id,
        customer_id: order.customer_id,
        beeylo_user_id: customer.data.beeylo_user_id,
        type: 'order_shipped',
        title: `Order Shipped - ${order.order_number}`,
        message: `Your order is on its way! Track your package using the tracking number below.`,
        data: {
          order_number: order.order_number,
          tracking_number: fulfillment.tracking_number,
          tracking_url: fulfillment.tracking_url,
          tracking_company: fulfillment.tracking_company,
          estimated_delivery: fulfillment.estimated_delivery,
        },
        template_id: store.settings.notification_template_id,
      });

      await this.sendToBeeyloApp(notification);

      return notification;
    } catch (error) {
      console.error('Failed to send shipping notification:', error);
      return null;
    }
  }

  /**
   * Send delivery notification
   */
  async sendDeliveryNotification(order: any, fulfillment: any) {
    try {
      const customer = await db.supabase
        .from('shopify_customers')
        .select('*, beeylo_user_id')
        .eq('id', order.customer_id)
        .single();

      if (!customer.data?.beeylo_user_id) {
        return null;
      }

      const store = await db.getStore(order.store_id);
      if (!store.settings.send_delivery_updates) {
        return null;
      }

      const notification = await db.createNotification({
        order_id: order.id,
        customer_id: order.customer_id,
        beeylo_user_id: customer.data.beeylo_user_id,
        type: 'order_delivered',
        title: `Order Delivered - ${order.order_number}`,
        message: `Your order has been delivered! We hope you enjoy your purchase.`,
        data: {
          order_number: order.order_number,
          delivery_timestamp: fulfillment.actual_delivery,
        },
        template_id: store.settings.notification_template_id,
      });

      await this.sendToBeeyloApp(notification);

      return notification;
    } catch (error) {
      console.error('Failed to send delivery notification:', error);
      return null;
    }
  }

  /**
   * Send order cancelled notification
   */
  async sendCancellationNotification(order: any) {
    try {
      const customer = await db.supabase
        .from('shopify_customers')
        .select('*, beeylo_user_id')
        .eq('id', order.customer_id)
        .single();

      if (!customer.data?.beeylo_user_id) {
        return null;
      }

      const notification = await db.createNotification({
        order_id: order.id,
        customer_id: order.customer_id,
        beeylo_user_id: customer.data.beeylo_user_id,
        type: 'order_cancelled',
        title: `Order Cancelled - ${order.order_number}`,
        message: `Your order has been cancelled. If you have any questions, please contact support.`,
        data: {
          order_number: order.order_number,
          cancelled_at: order.cancelled_at,
        },
      });

      await this.sendToBeeyloApp(notification);

      return notification;
    } catch (error) {
      console.error('Failed to send cancellation notification:', error);
      return null;
    }
  }

  /**
   * Send notification to Beeylo app
   * This integrates with your notification system (push notifications, in-app, etc.)
   */
  private async sendToBeeyloApp(notification: any) {
    try {
      // Create a ticket in the Beeylo app for this notification
      // This will appear in the user's Orders section
      const { data: ticket } = await db.supabase
        .from('tickets')
        .insert({
          sender: notification.title,
          title: notification.title,
          content_summary: notification.message,
          section: 'Orders',
          is_read: false,
          company_name: 'Your Store',
          icon_path: '/icons/package.svg',
          metadata: notification.data,
          user_id: notification.beeylo_user_id,
        })
        .select()
        .single();

      // Mark notification as sent
      await db.markNotificationSent(notification.id);

      // TODO: Send push notification via Firebase Cloud Messaging
      // await this.sendPushNotification(notification);

      return ticket;
    } catch (error) {
      console.error('Failed to send to Beeylo app:', error);
      throw error;
    }
  }

  /**
   * Send push notification (integrate with FCM)
   */
  private async sendPushNotification(notification: any) {
    // TODO: Implement Firebase Cloud Messaging integration
    // This would send a push notification to the user's mobile device
    console.log('Push notification:', notification.title);
  }

  /**
   * Process pending notifications (run as cron job)
   */
  async processPendingNotifications() {
    try {
      const notifications = await db.getPendingNotifications(100);

      for (const notification of notifications) {
        await this.sendToBeeyloApp(notification);
      }

      return notifications.length;
    } catch (error) {
      console.error('Failed to process pending notifications:', error);
      return 0;
    }
  }

  /**
   * Estimate delivery date (3-5 business days from now)
   */
  private estimateDelivery(): string {
    const date = new Date();
    date.setDate(date.getDate() + 4); // 4 days average
    return date.toISOString();
  }
}
