import { Router, Request, Response } from 'express';
import { db, supabase } from '../lib/supabase';
import { SyncService } from '../services/sync.service';
import { TrackingService } from '../services/tracking.service';

const router = Router();
const syncService = new SyncService();
const trackingService = new TrackingService();

/**
 * GET /api/stores
 * Get all connected Shopify stores for a company
 */
router.get('/stores', async (req: Request, res: Response) => {
  try {
    const { company_id } = req.query;

    if (!company_id) {
      return res.status(400).json({ error: 'Missing company_id parameter' });
    }

    const { data: stores, error } = await supabase
      .from('shopify_stores')
      .select('id, shop_domain, is_active, settings, created_at, updated_at')
      .eq('company_id', company_id);

    if (error) throw error;

    res.json({ stores: stores || [] });
  } catch (error: any) {
    console.error('Get stores error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/orders
 * Get orders for a store
 */
router.get('/orders', async (req: Request, res: Response) => {
  try {
    const { store_id, limit = 50 } = req.query;

    if (!store_id) {
      return res.status(400).json({ error: 'Missing store_id parameter' });
    }

    const orders = await db.getOrdersByStore(store_id as string, Number(limit));

    res.json({ orders });
  } catch (error: any) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/orders/:order_id
 * Get a specific order with fulfillment details
 */
router.get('/orders/:order_id', async (req: Request, res: Response) => {
  try {
    const { order_id } = req.params;

    const order = await db.getOrder(order_id);
    const fulfillments = await db.getFulfillmentsByOrder(order_id);

    // Get tracking updates for each fulfillment
    const fulfillmentsWithTracking = await Promise.all(
      fulfillments.map(async (fulfillment) => {
        const tracking = await db.getTrackingUpdates(fulfillment.id);
        return { ...fulfillment, tracking_updates: tracking };
      })
    );

    res.json({
      order,
      fulfillments: fulfillmentsWithTracking,
    });
  } catch (error: any) {
    console.error('Get order error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/customers
 * Get customers for a user (based on beeylo_user_id)
 */
router.get('/customers', async (req: Request, res: Response) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({ error: 'Missing user_id parameter' });
    }

    const { data: customers, error } = await supabase
      .from('shopify_customers')
      .select('*')
      .eq('beeylo_user_id', user_id);

    if (error) throw error;

    res.json({ customers: customers || [] });
  } catch (error: any) {
    console.error('Get customers error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/notifications
 * Get notifications for a user
 */
router.get('/notifications', async (req: Request, res: Response) => {
  try {
    const { user_id, unread_only = 'false' } = req.query;

    if (!user_id) {
      return res.status(400).json({ error: 'Missing user_id parameter' });
    }

    let query = supabase
      .from('order_notifications')
      .select('*')
      .eq('beeylo_user_id', user_id)
      .order('created_at', { ascending: false });

    if (unread_only === 'true') {
      query = query.eq('sent', false);
    }

    const { data: notifications, error } = await query;

    if (error) throw error;

    res.json({ notifications: notifications || [] });
  } catch (error: any) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/sync
 * Manually trigger a sync for a store
 */
router.post('/sync', async (req: Request, res: Response) => {
  try {
    const { store_id, since } = req.body;

    if (!store_id) {
      return res.status(400).json({ error: 'Missing store_id parameter' });
    }

    const result = await syncService.syncStoreOrders(store_id, since);

    res.json(result);
  } catch (error: any) {
    console.error('Sync error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/tracking/refresh
 * Refresh tracking information for a fulfillment
 */
router.post('/tracking/refresh', async (req: Request, res: Response) => {
  try {
    const { fulfillment_id } = req.body;

    if (!fulfillment_id) {
      return res.status(400).json({ error: 'Missing fulfillment_id parameter' });
    }

    const { data: fulfillment } = await supabase
      .from('order_fulfillments')
      .select('*')
      .eq('id', fulfillment_id)
      .single();

    if (!fulfillment) {
      return res.status(404).json({ error: 'Fulfillment not found' });
    }

    const trackingInfo = await trackingService.startTracking(
      fulfillment.id,
      fulfillment.tracking_number,
      fulfillment.tracking_company
    );

    res.json({ success: true, tracking: trackingInfo });
  } catch (error: any) {
    console.error('Tracking refresh error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/stores/:store_id
 * Get a specific store with settings
 */
router.get('/stores/:store_id', async (req: Request, res: Response) => {
  try {
    const { store_id } = req.params;

    const store = await db.getStore(store_id);

    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    // Remove sensitive access_token from response
    const { access_token, ...storeData } = store;

    res.json({ store: storeData });
  } catch (error: any) {
    console.error('Get store error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/stores/:store_id/settings
 * Update store settings
 */
router.put('/stores/:store_id/settings', async (req: Request, res: Response) => {
  try {
    const { store_id } = req.params;
    const { settings } = req.body;

    if (!settings) {
      return res.status(400).json({ error: 'Missing settings in request body' });
    }

    // Ensure default values for new settings
    const updatedSettings = {
      auto_sync: settings.auto_sync !== false,
      sync_interval_minutes: settings.sync_interval_minutes || 15,
      send_order_confirmations: settings.send_order_confirmations !== false,
      send_shipping_updates: settings.send_shipping_updates !== false,
      send_delivery_updates: settings.send_delivery_updates !== false,
      // New setting with default true
      suppress_shopify_notifications_for_beeylo_orders:
        settings.suppress_shopify_notifications_for_beeylo_orders !== false,
    };

    const store = await db.updateStore(store_id, { settings: updatedSettings });

    console.log(`[Settings] Updated store ${store_id} settings:`, updatedSettings);

    res.json({ success: true, store });
  } catch (error: any) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/stats
 * Get overall statistics for the dashboard
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    // Get total orders
    const { count: totalOrders } = await supabase
      .from('shopify_orders')
      .select('*', { count: 'exact', head: true });

    // Get total webhooks
    const { count: totalWebhooks } = await supabase
      .from('webhook_events')
      .select('*', { count: 'exact', head: true });

    // Get pending notifications
    const { count: pendingNotifications } = await supabase
      .from('order_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('sent', false);

    // Get active stores
    const { count: activeStores } = await supabase
      .from('shopify_stores')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    res.json({
      total_orders: totalOrders || 0,
      total_webhooks: totalWebhooks || 0,
      pending_notifications: pendingNotifications || 0,
      active_stores: activeStores || 0,
    });
  } catch (error: any) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/recent-activity
 * Get recent orders with their status
 */
router.get('/recent-activity', async (req: Request, res: Response) => {
  try {
    // Get recent orders with their details
    const { data: orders, error } = await supabase
      .from('shopify_orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(15);

    if (error) throw error;

    const activities = (orders || []).map((order: any) => {
      // Format the status
      let statusText = order.financial_status || 'pending';
      let fulfillmentStatus = order.fulfillment_status || 'unfulfilled';

      // Create status badges
      let statusBadge = '';
      if (order.cancelled_at) {
        statusBadge = 'Cancelled';
      } else if (fulfillmentStatus === 'fulfilled') {
        statusBadge = 'Fulfilled';
      } else if (fulfillmentStatus === 'partial') {
        statusBadge = 'Partially Fulfilled';
      } else if (statusText === 'paid') {
        statusBadge = 'Paid';
      } else if (statusText === 'pending') {
        statusBadge = 'Pending Payment';
      } else {
        statusBadge = statusText.charAt(0).toUpperCase() + statusText.slice(1);
      }

      return {
        id: order.id,
        order_number: order.order_number,
        order_name: order.order_name || `#${order.order_number}`,
        customer_name: order.customer_name || 'Guest',
        total_price: order.total_price || '0.00',
        currency: order.currency || 'USD',
        status: statusBadge,
        financial_status: statusText,
        fulfillment_status: fulfillmentStatus,
        created_at: order.created_at,
        cancelled_at: order.cancelled_at,
      };
    });

    res.json({ activities });
  } catch (error: any) {
    console.error('Get recent activity error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/webhooks/register
 * Manually register webhooks for a store (debug endpoint)
 */
router.post('/webhooks/register', async (req: Request, res: Response) => {
  try {
    const { store_id } = req.body;

    if (!store_id) {
      return res.status(400).json({ error: 'Missing store_id parameter' });
    }

    const store = await db.getStore(store_id);

    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    // Import OAuth service
    const { OAuthService } = await import('../services/oauth.service');
    const oauthService = new (OAuthService as any)();

    // Access private method through any cast
    await (oauthService as any).registerWebhooks(
      store.shop_domain,
      store.access_token,
      store.id
    );

    res.json({ success: true, message: 'Webhooks registered successfully' });
  } catch (error: any) {
    console.error('Register webhooks error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
