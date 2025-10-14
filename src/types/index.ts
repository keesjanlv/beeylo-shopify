// Shopify Store Connection
export interface ShopifyStore {
  id: string;
  company_id: string;
  shop_domain: string;
  access_token: string;
  scope: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  settings: ShopifyStoreSettings;
}

export interface ShopifyStoreSettings {
  auto_sync: boolean;
  sync_interval_minutes: number;
  send_order_confirmations: boolean;
  send_shipping_updates: boolean;
  send_delivery_updates: boolean;
  notification_template_id?: string;
}

// Shopify Order (synced from Shopify)
export interface ShopifyOrder {
  id: string;
  store_id: string;
  shopify_order_id: string;
  order_number: string;
  customer_id: string;
  email: string;
  phone?: string;
  financial_status: string;
  fulfillment_status: string;
  total_price: number;
  currency: string;
  line_items: ShopifyLineItem[];
  shipping_address: ShopifyAddress;
  billing_address: ShopifyAddress;
  created_at: string;
  updated_at: string;
  cancelled_at?: string;
  synced_at: string;
}

export interface ShopifyLineItem {
  id: string;
  product_id: string;
  variant_id: string;
  title: string;
  quantity: number;
  price: number;
  sku?: string;
  vendor?: string;
  product_exists: boolean;
  fulfillment_service: string;
  fulfillment_status?: string;
  image_url?: string;
}

export interface ShopifyAddress {
  first_name: string;
  last_name: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  province?: string;
  country: string;
  zip: string;
  phone?: string;
}

// Shopify Customer (synced from Shopify)
export interface ShopifyCustomer {
  id: string;
  store_id: string;
  shopify_customer_id: string;
  email: string;
  phone?: string;
  first_name: string;
  last_name: string;
  orders_count: number;
  total_spent: number;
  verified_email: boolean;
  tax_exempt: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
  synced_at: string;
  beeylo_user_id?: string; // Linked Beeylo user
}

// Fulfillment and Tracking
export interface OrderFulfillment {
  id: string;
  order_id: string;
  shopify_fulfillment_id: string;
  status: 'pending' | 'open' | 'success' | 'cancelled' | 'error' | 'failure';
  tracking_company: string;
  tracking_number: string;
  tracking_url?: string;
  shipment_status?: string;
  line_items: ShopifyLineItem[];
  created_at: string;
  updated_at: string;
  estimated_delivery?: string;
  actual_delivery?: string;
}

// Tracking Updates (from courier APIs)
export interface TrackingUpdate {
  id: string;
  fulfillment_id: string;
  tracking_number: string;
  courier: 'postnl' | 'dhl' | 'dpd' | 'other';
  status: string;
  status_description: string;
  location?: string;
  timestamp: string;
  created_at: string;
}

// Webhook Events
export interface WebhookEvent {
  id: string;
  store_id: string;
  topic: string;
  shopify_id: string;
  payload: any;
  processed: boolean;
  processed_at?: string;
  error?: string;
  created_at: string;
}

// Notification to be sent to Beeylo app
export interface OrderNotification {
  id: string;
  order_id: string;
  customer_id: string;
  beeylo_user_id: string;
  type: 'order_confirmation' | 'order_shipped' | 'order_delivered' | 'order_cancelled';
  title: string;
  message: string;
  data: any;
  template_id?: string;
  sent: boolean;
  sent_at?: string;
  created_at: string;
}

// Courier API Response Types
export interface CourierTrackingResponse {
  tracking_number: string;
  status: string;
  status_description: string;
  events: CourierEvent[];
  estimated_delivery?: string;
  actual_delivery?: string;
  current_location?: string;
}

export interface CourierEvent {
  timestamp: string;
  status: string;
  description: string;
  location?: string;
}

// API Request/Response Types
export interface ConnectShopifyRequest {
  shop: string;
  code: string;
  company_id: string;
}

export interface ShopifyConnectionResponse {
  success: boolean;
  store: ShopifyStore;
  message: string;
}

export interface SyncOrdersRequest {
  store_id: string;
  since?: string; // ISO date string
  limit?: number;
}

export interface SyncOrdersResponse {
  success: boolean;
  orders_synced: number;
  customers_synced: number;
  message: string;
}
