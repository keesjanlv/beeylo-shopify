# GLS Implementation Plan

Step-by-step implementation guide for integrating GLS tracking into the Beeylo platform.

---

## 📋 Overview

This document provides the complete implementation plan for GLS parcel tracking integration, including code structure, database changes, and deployment steps.

---

## 🎯 Implementation Goals

1. ✅ Fetch real-time tracking data from GLS API
2. ✅ Store detailed tracking events in database
3. ✅ Map GLS status codes to common format
4. ✅ Handle errors and rate limiting gracefully
5. ✅ Support webhooks for real-time updates (optional)
6. ✅ Provide fallback to Shopify tracking

---

## 📁 File Structure

```
shopify/
├── src/
│   ├── config/
│   │   └── index.ts                    # Add GLS configuration
│   ├── services/
│   │   ├── couriers/
│   │   │   └── gls.service.ts         # NEW: GLS API service
│   │   └── tracking.service.ts         # Update: Add GLS integration
│   ├── types/
│   │   └── courier.types.ts            # Update: Add GLS types
│   └── webhooks/
│       └── gls-webhook.handler.ts      # NEW: GLS webhook handler
├── migrations/
│   └── 008_add_gls_tracking.sql       # NEW: Database changes
└── tests/
    └── services/
        └── gls.service.test.ts         # NEW: Tests
```

---

## 🔧 Step 1: Configuration

### 1.1 Environment Variables

Add to `shopify/.env`:

```env
# GLS API Configuration
GLS_API_USERNAME=your_gls_username
GLS_API_PASSWORD=your_gls_password
GLS_API_URL=https://api.mygls.hu
GLS_API_URL_TEST=https://api.test.mygls.hu
GLS_CUSTOMER_ID=your_customer_id

# Environment
GLS_ENVIRONMENT=production  # or 'test'

# Optional: Webhook secret
GLS_WEBHOOK_SECRET=your_webhook_secret
```

### 1.2 Update Configuration File

`src/config/index.ts`:

```typescript
export const config = {
  // ... existing config

  couriers: {
    // ... existing couriers

    gls: {
      username: process.env.GLS_API_USERNAME || '',
      password: process.env.GLS_API_PASSWORD || '',
      apiUrl:
        process.env.GLS_ENVIRONMENT === 'production'
          ? process.env.GLS_API_URL || 'https://api.mygls.hu'
          : process.env.GLS_API_URL_TEST || 'https://api.test.mygls.hu',
      customerId: process.env.GLS_CUSTOMER_ID || '',
      enabled: !!process.env.GLS_API_USERNAME,
      webhookSecret: process.env.GLS_WEBHOOK_SECRET || '',
    },
  },
};
```

---

## 💾 Step 2: Database Migration

### 2.1 Create Migration File

`migrations/008_add_gls_tracking.sql`:

```sql
-- GLS tracking events table
CREATE TABLE IF NOT EXISTS gls_tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fulfillment_id UUID REFERENCES order_fulfillments(id) ON DELETE CASCADE,
  parcel_number TEXT NOT NULL,
  status_code TEXT NOT NULL,
  status_text TEXT NOT NULL,
  location TEXT,
  depot_number TEXT,
  depot_name TEXT,
  depot_address TEXT,
  timestamp TIMESTAMPTZ NOT NULL,
  receiver_name TEXT,
  signature_url TEXT,
  photo_url TEXT,
  estimated_delivery TIMESTAMPTZ,
  actual_delivery TIMESTAMPTZ,
  raw_response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_gls_tracking_fulfillment
  ON gls_tracking_events(fulfillment_id);

CREATE INDEX IF NOT EXISTS idx_gls_parcel_number
  ON gls_tracking_events(parcel_number);

CREATE INDEX IF NOT EXISTS idx_gls_status_code
  ON gls_tracking_events(status_code);

CREATE INDEX IF NOT EXISTS idx_gls_timestamp
  ON gls_tracking_events(timestamp DESC);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_gls_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER gls_tracking_events_updated_at
  BEFORE UPDATE ON gls_tracking_events
  FOR EACH ROW
  EXECUTE FUNCTION update_gls_tracking_updated_at();

-- Add GLS to courier tracking stats view (if exists)
CREATE OR REPLACE VIEW courier_tracking_stats AS
SELECT
  'gls' as courier,
  COUNT(DISTINCT fulfillment_id) as total_fulfillments,
  COUNT(*) as total_events,
  COUNT(DISTINCT parcel_number) as unique_parcels,
  MAX(timestamp) as last_update
FROM gls_tracking_events
UNION ALL
-- ... existing courier stats
SELECT
  'postnl' as courier,
  COUNT(DISTINCT fulfillment_id) as total_fulfillments,
  COUNT(*) as total_events,
  COUNT(DISTINCT tracking_number) as unique_parcels,
  MAX(timestamp) as last_update
FROM postnl_tracking_events;

-- GLS API call logs (for monitoring)
CREATE TABLE IF NOT EXISTS gls_api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_number TEXT,
  endpoint TEXT NOT NULL,
  request_body JSONB,
  response_status INTEGER,
  response_body JSONB,
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gls_api_logs_created
  ON gls_api_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gls_api_logs_status
  ON gls_api_logs(response_status);

-- Clean up old logs (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_gls_api_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM gls_api_logs
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;
```

### 2.2 Run Migration

```bash
cd shopify
npm run migrate
```

---

## 📝 Step 3: TypeScript Types

### 3.1 Update Courier Types

`src/types/courier.types.ts`:

```typescript
// GLS API Types
export interface GLSParcelStatus {
  ParcelNumber: string;
  StatusInfo: {
    StatusCode: string;
    StatusText: string;
    StatusDate: string;
  };
  DepotInfo?: {
    DepotNumber: string;
    DepotName: string;
    DepotAddress: string;
  };
  Events: GLSEvent[];
  PODInfo?: {
    SignatureAvailable: boolean;
    SignatureUrl?: string;
    PhotoUrl?: string;
    ReceiverName?: string;
    DeliveryDate?: string;
  };
  DeliveryInfo: {
    EstimatedDeliveryDate?: string;
    ActualDeliveryDate?: string;
    TimeSlot?: string;
  };
}

export interface GLSEvent {
  Code: string;
  Date: string;
  Location: string;
  Description: string;
  ReceiverName?: string;
}

export interface GLSTrackingResponse {
  ParcelStatusList: GLSParcelStatus[];
}

export interface GLSWebhookPayload {
  EventType: string;
  ParcelNumber: string;
  StatusCode: string;
  StatusDate: string;
  Location: string;
  Description: string;
  ReceiverName?: string;
  Timestamp: string;
}

// Common courier types
export interface CourierTrackingResponse {
  tracking_number: string;
  status: string;
  status_description: string;
  current_location?: string;
  estimated_delivery?: string;
  actual_delivery?: string;
  events: TrackingEvent[];
  proof_of_delivery?: ProofOfDelivery;
}

export interface TrackingEvent {
  timestamp: string;
  status: string;
  description: string;
  location?: string;
}

export interface ProofOfDelivery {
  signature_url?: string;
  photo_url?: string;
  receiver_name?: string;
  timestamp?: string;
}
```

---

## 🔨 Step 4: GLS Service Implementation

### 4.1 Create GLS Service

`src/services/couriers/gls.service.ts`:

```typescript
import axios, { AxiosInstance, AxiosError } from 'axios';
import { config } from '../../config';
import { db } from '../../db';
import {
  GLSTrackingResponse,
  GLSParcelStatus,
  CourierTrackingResponse,
  TrackingEvent,
} from '../../types/courier.types';

export class GLSService {
  private client: AxiosInstance;
  private authHeader: string;

  constructor() {
    if (!config.couriers.gls.username || !config.couriers.gls.password) {
      throw new Error('GLS API credentials not configured');
    }

    // Create auth header
    const credentials = Buffer.from(
      `${config.couriers.gls.username}:${config.couriers.gls.password}`
    ).toString('base64');
    this.authHeader = `Basic ${credentials}`;

    // Create axios client
    this.client = axios.create({
      baseURL: config.couriers.gls.apiUrl,
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      timeout: 10000, // 10 seconds
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`[GLS API] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        this.handleAPIError(error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Fetch tracking information for a single parcel
   */
  async fetchTracking(parcelNumber: string): Promise<CourierTrackingResponse> {
    const startTime = Date.now();

    try {
      console.log(`[GLS] Fetching tracking for parcel: ${parcelNumber}`);

      const response = await this.client.post<GLSTrackingResponse>(
        '/ParcelService.svc/json/GetParcelStatuses',
        {
          ParcelNumber: parcelNumber,
        }
      );

      const duration = Date.now() - startTime;

      // Log API call
      await this.logAPICall({
        parcelNumber,
        endpoint: 'GetParcelStatuses',
        requestBody: { ParcelNumber: parcelNumber },
        responseStatus: response.status,
        responseBody: response.data,
        durationMs: duration,
      });

      if (
        !response.data.ParcelStatusList ||
        response.data.ParcelStatusList.length === 0
      ) {
        throw new Error(`No tracking data found for parcel ${parcelNumber}`);
      }

      const glsStatus = response.data.ParcelStatusList[0];

      // Parse and transform to common format
      return this.parseGLSResponse(glsStatus);
    } catch (error) {
      const duration = Date.now() - startTime;

      // Log failed API call
      await this.logAPICall({
        parcelNumber,
        endpoint: 'GetParcelStatuses',
        requestBody: { ParcelNumber: parcelNumber },
        responseStatus: (error as any).response?.status || 0,
        errorMessage: (error as Error).message,
        durationMs: duration,
      });

      throw error;
    }
  }

  /**
   * Parse GLS API response to common format
   */
  private parseGLSResponse(
    glsStatus: GLSParcelStatus
  ): CourierTrackingResponse {
    // Map GLS status codes to common status
    const status = this.mapStatusCode(glsStatus.StatusInfo.StatusCode);

    // Transform events
    const events: TrackingEvent[] = glsStatus.Events.map((event) => ({
      timestamp: event.Date,
      status: this.mapStatusCode(event.Code),
      description: event.Description,
      location: event.Location,
    })).sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return {
      tracking_number: glsStatus.ParcelNumber,
      status,
      status_description: glsStatus.StatusInfo.StatusText,
      current_location: glsStatus.DepotInfo?.DepotName || events[events.length - 1]?.location,
      estimated_delivery: glsStatus.DeliveryInfo.EstimatedDeliveryDate,
      actual_delivery: glsStatus.DeliveryInfo.ActualDeliveryDate,
      events,
      proof_of_delivery: glsStatus.PODInfo?.SignatureAvailable
        ? {
            signature_url: glsStatus.PODInfo.SignatureUrl,
            photo_url: glsStatus.PODInfo.PhotoUrl,
            receiver_name: glsStatus.PODInfo.ReceiverName,
            timestamp: glsStatus.PODInfo.DeliveryDate,
          }
        : undefined,
    };
  }

  /**
   * Map GLS status codes to common status format
   */
  private mapStatusCode(glsCode: string): string {
    const statusMap: Record<string, string> = {
      PREADVICE: 'pending',
      COLLECTED: 'in_transit',
      IN_TRANSIT: 'in_transit',
      AT_DEPOT: 'in_transit',
      AT_HUB: 'in_transit',
      OUT_FOR_DELIVERY: 'out_for_delivery',
      DELIVERED: 'delivered',
      DELIVERY_FAILED: 'failure',
      AWAITING_COLLECTION: 'available_for_pickup',
      COLLECTED_BY_RECIPIENT: 'delivered',
      RETURNED: 'return_to_sender',
      CANCELLED: 'cancelled',
      EXCEPTION: 'failure',
      DAMAGED: 'failure',
      LOST: 'failure',
    };

    return statusMap[glsCode] || 'unknown';
  }

  /**
   * Save tracking events to database
   */
  async saveTrackingEvents(
    fulfillmentId: string,
    trackingData: CourierTrackingResponse
  ): Promise<void> {
    for (const event of trackingData.events) {
      await db.query(
        `
        INSERT INTO gls_tracking_events (
          fulfillment_id,
          parcel_number,
          status_code,
          status_text,
          location,
          timestamp,
          receiver_name,
          signature_url,
          photo_url,
          estimated_delivery,
          actual_delivery,
          raw_response
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT DO NOTHING
        `,
        [
          fulfillmentId,
          trackingData.tracking_number,
          event.status,
          event.description,
          event.location,
          event.timestamp,
          trackingData.proof_of_delivery?.receiver_name,
          trackingData.proof_of_delivery?.signature_url,
          trackingData.proof_of_delivery?.photo_url,
          trackingData.estimated_delivery,
          trackingData.actual_delivery,
          JSON.stringify(trackingData),
        ]
      );
    }

    console.log(
      `[GLS] Saved ${trackingData.events.length} events for ${trackingData.tracking_number}`
    );
  }

  /**
   * Handle API errors
   */
  private handleAPIError(error: AxiosError): void {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as any;

      switch (status) {
        case 401:
          console.error('[GLS] Authentication failed - check credentials');
          break;
        case 404:
          console.warn('[GLS] Parcel not found in system yet');
          break;
        case 429:
          console.error('[GLS] Rate limit exceeded');
          break;
        case 500:
        case 503:
          console.error('[GLS] GLS API server error');
          break;
        default:
          console.error(`[GLS] API error: ${status}`, data);
      }
    } else if (error.request) {
      console.error('[GLS] No response received from API');
    } else {
      console.error('[GLS] Error setting up request:', error.message);
    }
  }

  /**
   * Log API calls for monitoring
   */
  private async logAPICall(logData: {
    parcelNumber?: string;
    endpoint: string;
    requestBody: any;
    responseStatus?: number;
    responseBody?: any;
    errorMessage?: string;
    durationMs: number;
  }): Promise<void> {
    try {
      await db.query(
        `
        INSERT INTO gls_api_logs (
          parcel_number,
          endpoint,
          request_body,
          response_status,
          response_body,
          error_message,
          duration_ms
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          logData.parcelNumber,
          logData.endpoint,
          JSON.stringify(logData.requestBody),
          logData.responseStatus,
          logData.responseBody ? JSON.stringify(logData.responseBody) : null,
          logData.errorMessage,
          logData.durationMs,
        ]
      );
    } catch (error) {
      console.error('[GLS] Failed to log API call:', error);
    }
  }

  /**
   * Check if GLS API is configured and enabled
   */
  static isEnabled(): boolean {
    return config.couriers.gls.enabled;
  }
}
```

---

## 🔄 Step 5: Update Tracking Service

### 5.1 Update Main Tracking Service

`src/services/tracking.service.ts`:

```typescript
import { GLSService } from './couriers/gls.service';

export class TrackingService {
  // ... existing code

  /**
   * Normalize courier name
   */
  private normalizeCourierName(courierName: string): string {
    const normalized = courierName.toLowerCase().trim();

    if (normalized.includes('gls')) return 'gls';
    if (normalized.includes('postnl')) return 'postnl';
    if (normalized.includes('dhl')) return 'dhl';
    if (normalized.includes('dpd')) return 'dpd';
    if (normalized.includes('ups')) return 'ups';
    if (normalized.includes('fedex')) return 'fedex';

    return 'other';
  }

  /**
   * Fetch tracking info from courier API
   */
  private async fetchTrackingInfo(
    trackingNumber: string,
    courier: string
  ): Promise<CourierTrackingResponse | null> {
    try {
      switch (courier) {
        case 'gls':
          return await this.fetchGLSTracking(trackingNumber);
        case 'postnl':
          return await this.fetchPostNLTracking(trackingNumber);
        case 'dhl':
          return await this.fetchDHLTracking(trackingNumber);
        case 'dpd':
          return await this.fetchDPDTracking(trackingNumber);
        // ... other couriers
        default:
          return null;
      }
    } catch (error) {
      console.error(`[Tracking] Error fetching from ${courier}:`, error);
      return null;
    }
  }

  /**
   * Fetch GLS tracking
   */
  private async fetchGLSTracking(
    trackingNumber: string
  ): Promise<CourierTrackingResponse | null> {
    if (!GLSService.isEnabled()) {
      console.log('[Tracking] GLS API not configured, using Shopify data');
      return null;
    }

    try {
      const glsService = new GLSService();
      return await glsService.fetchTracking(trackingNumber);
    } catch (error) {
      console.error('[Tracking] GLS API error:', error);
      return null; // Fall back to Shopify
    }
  }

  // ... rest of the tracking service
}
```

---

## 🎣 Step 6: Webhook Handler (Optional)

### 6.1 Create Webhook Handler

`src/webhooks/gls-webhook.handler.ts`:

```typescript
import { Request, Response } from 'express';
import { GLSWebhookPayload } from '../types/courier.types';
import { TrackingService } from '../services/tracking.service';
import { config } from '../config';

export class GLSWebhookHandler {
  /**
   * Handle incoming GLS webhook
   */
  static async handle(req: Request, res: Response): Promise<void> {
    try {
      // Validate webhook (if secret is configured)
      if (config.couriers.gls.webhookSecret) {
        const signature = req.headers['x-gls-signature'] as string;
        if (!GLSWebhookHandler.validateSignature(req.body, signature)) {
          res.status(401).json({ error: 'Invalid signature' });
          return;
        }
      }

      const payload: GLSWebhookPayload = req.body;
      console.log('[GLS Webhook] Received:', payload);

      // Find fulfillment by tracking number
      const trackingService = new TrackingService();
      await trackingService.processWebhookUpdate(
        'gls',
        payload.ParcelNumber,
        payload
      );

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('[GLS Webhook] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Validate webhook signature
   */
  private static validateSignature(payload: any, signature: string): boolean {
    // Implement signature validation based on GLS documentation
    // This is a placeholder - actual implementation depends on GLS webhook spec
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', config.couriers.gls.webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return signature === expectedSignature;
  }
}
```

### 6.2 Add Webhook Route

`src/routes/webhooks.ts`:

```typescript
import express from 'express';
import { GLSWebhookHandler } from '../webhooks/gls-webhook.handler';

const router = express.Router();

// GLS webhook endpoint
router.post('/gls', GLSWebhookHandler.handle);

// ... other webhook routes

export default router;
```

---

## 🧪 Step 7: Testing

See `TESTING.md` for complete testing guide.

Quick test:

```bash
# Test GLS API connection
npm run test:gls-connection

# Test tracking fetch
npm run test:gls-tracking
```

---

## 🚀 Step 8: Deployment

### 8.1 Pre-deployment Checklist

- [ ] GLS API credentials added to production `.env`
- [ ] Database migration run successfully
- [ ] All tests passing
- [ ] Error handling tested
- [ ] Rate limiting configured
- [ ] Monitoring alerts configured

### 8.2 Deploy

```bash
# Run migration
npm run migrate:production

# Deploy code
npm run deploy

# Verify deployment
npm run health-check
```

### 8.3 Monitor

```bash
# Check GLS API logs
SELECT * FROM gls_api_logs ORDER BY created_at DESC LIMIT 100;

# Check success rate
SELECT
  response_status,
  COUNT(*) as count,
  AVG(duration_ms) as avg_duration
FROM gls_api_logs
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY response_status;
```

---

## 📊 Step 9: Monitoring & Maintenance

### 9.1 Monitor API Performance

```sql
-- API success rate
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_calls,
  SUM(CASE WHEN response_status = 200 THEN 1 ELSE 0 END) as successful,
  ROUND(100.0 * SUM(CASE WHEN response_status = 200 THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM gls_api_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Average response time
SELECT
  AVG(duration_ms) as avg_ms,
  MIN(duration_ms) as min_ms,
  MAX(duration_ms) as max_ms
FROM gls_api_logs
WHERE created_at > NOW() - INTERVAL '1 hour'
  AND response_status = 200;
```

### 9.2 Set Up Alerts

Monitor for:
- API success rate < 95%
- Average response time > 5 seconds
- Rate limit errors (429)
- Authentication failures (401)

---

## ✅ Implementation Checklist

- [ ] Step 1: Configuration added
- [ ] Step 2: Database migration complete
- [ ] Step 3: TypeScript types defined
- [ ] Step 4: GLS service implemented
- [ ] Step 5: Tracking service updated
- [ ] Step 6: Webhook handler created (optional)
- [ ] Step 7: Tests written and passing
- [ ] Step 8: Deployed to production
- [ ] Step 9: Monitoring configured

---

## 🎉 Success Criteria

After implementation, you should be able to:

1. ✅ Fetch real-time tracking from GLS API
2. ✅ See detailed tracking events in database
3. ✅ View tracking in customer dashboard
4. ✅ Receive webhook updates (if configured)
5. ✅ Fall back to Shopify if GLS API fails
6. ✅ Monitor API performance and costs

---

For testing procedures, see `TESTING.md`.
For API details, see `API_REFERENCE.md`.
