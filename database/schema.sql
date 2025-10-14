-- Shopify Integration Database Schema for Supabase

-- Table: shopify_stores
-- Stores Shopify store connections for each company
CREATE TABLE IF NOT EXISTS shopify_stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  shop_domain TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL, -- Encrypted in production
  scope TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{
    "auto_sync": true,
    "sync_interval_minutes": 15,
    "send_order_confirmations": true,
    "send_shipping_updates": true,
    "send_delivery_updates": true
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shopify_stores_company_id ON shopify_stores(company_id);
CREATE INDEX idx_shopify_stores_shop_domain ON shopify_stores(shop_domain);

-- Table: shopify_customers
-- Synced customer data from Shopify
CREATE TABLE IF NOT EXISTS shopify_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES shopify_stores(id) ON DELETE CASCADE,
  shopify_customer_id TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  first_name TEXT,
  last_name TEXT,
  orders_count INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  verified_email BOOLEAN DEFAULT false,
  tax_exempt BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT '{}',
  beeylo_user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Link to Beeylo user
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, shopify_customer_id)
);

CREATE INDEX idx_shopify_customers_store_id ON shopify_customers(store_id);
CREATE INDEX idx_shopify_customers_email ON shopify_customers(email);
CREATE INDEX idx_shopify_customers_beeylo_user_id ON shopify_customers(beeylo_user_id);

-- Table: shopify_orders
-- Synced order data from Shopify
CREATE TABLE IF NOT EXISTS shopify_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES shopify_stores(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES shopify_customers(id) ON DELETE SET NULL,
  shopify_order_id TEXT NOT NULL,
  order_number TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  financial_status TEXT,
  fulfillment_status TEXT,
  total_price DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  line_items JSONB NOT NULL DEFAULT '[]',
  shipping_address JSONB,
  billing_address JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, shopify_order_id)
);

CREATE INDEX idx_shopify_orders_store_id ON shopify_orders(store_id);
CREATE INDEX idx_shopify_orders_customer_id ON shopify_orders(customer_id);
CREATE INDEX idx_shopify_orders_order_number ON shopify_orders(order_number);
CREATE INDEX idx_shopify_orders_email ON shopify_orders(email);
CREATE INDEX idx_shopify_orders_fulfillment_status ON shopify_orders(fulfillment_status);

-- Table: order_fulfillments
-- Tracks order fulfillments and shipping information
CREATE TABLE IF NOT EXISTS order_fulfillments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES shopify_orders(id) ON DELETE CASCADE,
  shopify_fulfillment_id TEXT NOT NULL,
  status TEXT NOT NULL, -- pending, open, success, cancelled, error, failure
  tracking_company TEXT,
  tracking_number TEXT,
  tracking_url TEXT,
  shipment_status TEXT,
  line_items JSONB DEFAULT '[]',
  estimated_delivery TIMESTAMPTZ,
  actual_delivery TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(order_id, shopify_fulfillment_id)
);

CREATE INDEX idx_order_fulfillments_order_id ON order_fulfillments(order_id);
CREATE INDEX idx_order_fulfillments_tracking_number ON order_fulfillments(tracking_number);
CREATE INDEX idx_order_fulfillments_status ON order_fulfillments(status);

-- Table: tracking_updates
-- Stores tracking events from courier APIs
CREATE TABLE IF NOT EXISTS tracking_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fulfillment_id UUID NOT NULL REFERENCES order_fulfillments(id) ON DELETE CASCADE,
  tracking_number TEXT NOT NULL,
  courier TEXT NOT NULL, -- postnl, dhl, dpd, other
  status TEXT NOT NULL,
  status_description TEXT,
  location TEXT,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tracking_updates_fulfillment_id ON tracking_updates(fulfillment_id);
CREATE INDEX idx_tracking_updates_tracking_number ON tracking_updates(tracking_number);
CREATE INDEX idx_tracking_updates_timestamp ON tracking_updates(timestamp DESC);

-- Table: webhook_events
-- Logs all Shopify webhook events for debugging
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES shopify_stores(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  shopify_id TEXT,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhook_events_store_id ON webhook_events(store_id);
CREATE INDEX idx_webhook_events_topic ON webhook_events(topic);
CREATE INDEX idx_webhook_events_processed ON webhook_events(processed);
CREATE INDEX idx_webhook_events_created_at ON webhook_events(created_at DESC);

-- Table: order_notifications
-- Queue for notifications to be sent to Beeylo app
CREATE TABLE IF NOT EXISTS order_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES shopify_orders(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES shopify_customers(id) ON DELETE SET NULL,
  beeylo_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- order_confirmation, order_shipped, order_delivered, order_cancelled
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  template_id UUID REFERENCES ticket_templates(id) ON DELETE SET NULL,
  sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_notifications_order_id ON order_notifications(order_id);
CREATE INDEX idx_order_notifications_beeylo_user_id ON order_notifications(beeylo_user_id);
CREATE INDEX idx_order_notifications_sent ON order_notifications(sent);
CREATE INDEX idx_order_notifications_type ON order_notifications(type);

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_shopify_stores_updated_at
  BEFORE UPDATE ON shopify_stores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE shopify_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_fulfillments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their company's Shopify data
CREATE POLICY shopify_stores_company_policy ON shopify_stores
  FOR ALL
  USING (company_id IN (
    SELECT company_id FROM company_users WHERE user_id = auth.uid()
  ));

CREATE POLICY shopify_customers_company_policy ON shopify_customers
  FOR ALL
  USING (store_id IN (
    SELECT id FROM shopify_stores WHERE company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY shopify_orders_company_policy ON shopify_orders
  FOR ALL
  USING (store_id IN (
    SELECT id FROM shopify_stores WHERE company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  ));

-- RLS Policy: Users can see notifications meant for them
CREATE POLICY order_notifications_user_policy ON order_notifications
  FOR SELECT
  USING (beeylo_user_id = auth.uid());

-- Service role can access everything (for backend processes)
CREATE POLICY shopify_stores_service_role ON shopify_stores
  FOR ALL
  TO service_role
  USING (true);

CREATE POLICY shopify_customers_service_role ON shopify_customers
  FOR ALL
  TO service_role
  USING (true);

CREATE POLICY shopify_orders_service_role ON shopify_orders
  FOR ALL
  TO service_role
  USING (true);

CREATE POLICY order_fulfillments_service_role ON order_fulfillments
  FOR ALL
  TO service_role
  USING (true);

CREATE POLICY tracking_updates_service_role ON tracking_updates
  FOR ALL
  TO service_role
  USING (true);

CREATE POLICY webhook_events_service_role ON webhook_events
  FOR ALL
  TO service_role
  USING (true);

CREATE POLICY order_notifications_service_role ON order_notifications
  FOR ALL
  TO service_role
  USING (true);
