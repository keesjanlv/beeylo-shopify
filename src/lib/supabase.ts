import { createClient } from '@supabase/supabase-js';
import { config } from '../config';

// Create Supabase client with service role key for backend operations
export const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Database helper functions
export const db = {
  // Shopify Stores
  async getStore(storeId: string) {
    const { data, error } = await supabase
      .from('shopify_stores')
      .select('*')
      .eq('id', storeId)
      .single();

    if (error) throw error;
    return data;
  },

  async getStoreByDomain(shopDomain: string) {
    const { data, error } = await supabase
      .from('shopify_stores')
      .select('*')
      .eq('shop_domain', shopDomain)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    return data;
  },

  async createStore(store: any) {
    const { data, error } = await supabase
      .from('shopify_stores')
      .insert(store)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateStore(storeId: string, updates: any) {
    const { data, error } = await supabase
      .from('shopify_stores')
      .update(updates)
      .eq('id', storeId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Shopify Customers
  async upsertCustomer(customer: any) {
    const { data, error } = await supabase
      .from('shopify_customers')
      .upsert(customer, {
        onConflict: 'store_id,shopify_customer_id',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getCustomerByEmail(storeId: string, email: string) {
    const { data, error } = await supabase
      .from('shopify_customers')
      .select('*')
      .eq('store_id', storeId)
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  // Shopify Orders
  async upsertOrder(order: any) {
    const { data, error } = await supabase
      .from('shopify_orders')
      .upsert(order, {
        onConflict: 'store_id,shopify_order_id',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getOrder(orderId: string) {
    const { data, error } = await supabase
      .from('shopify_orders')
      .select('*, customer:shopify_customers(*)')
      .eq('id', orderId)
      .single();

    if (error) throw error;
    return data;
  },

  async getOrdersByStore(storeId: string, limit = 50) {
    const { data, error } = await supabase
      .from('shopify_orders')
      .select('*, customer:shopify_customers(*)')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  // Order Fulfillments
  async upsertFulfillment(fulfillment: any) {
    const { data, error } = await supabase
      .from('order_fulfillments')
      .upsert(fulfillment, {
        onConflict: 'order_id,shopify_fulfillment_id',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getFulfillmentsByOrder(orderId: string) {
    const { data, error } = await supabase
      .from('order_fulfillments')
      .select('*')
      .eq('order_id', orderId);

    if (error) throw error;
    return data || [];
  },

  // Tracking Updates
  async createTrackingUpdate(update: any) {
    const { data, error } = await supabase
      .from('tracking_updates')
      .insert(update)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getTrackingUpdates(fulfillmentId: string) {
    const { data, error } = await supabase
      .from('tracking_updates')
      .select('*')
      .eq('fulfillment_id', fulfillmentId)
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Webhook Events
  async createWebhookEvent(event: any) {
    const { data, error } = await supabase
      .from('webhook_events')
      .insert(event)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async markWebhookProcessed(eventId: string, error?: string) {
    const { data, error: dbError } = await supabase
      .from('webhook_events')
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
        error: error || null,
      })
      .eq('id', eventId)
      .select()
      .single();

    if (dbError) throw dbError;
    return data;
  },

  // Order Notifications
  async createNotification(notification: any) {
    const { data, error } = await supabase
      .from('order_notifications')
      .insert(notification)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getPendingNotifications(limit = 100) {
    const { data, error } = await supabase
      .from('order_notifications')
      .select('*')
      .eq('sent', false)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  async markNotificationSent(notificationId: string) {
    const { data, error } = await supabase
      .from('order_notifications')
      .update({
        sent: true,
        sent_at: new Date().toISOString(),
      })
      .eq('id', notificationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
