# DHL API Integration Guide

Complete guide for integrating DHL Express and DHL eCommerce tracking APIs.

---

## 📋 Overview

**DHL** is one of the world's leading logistics companies. They offer two main tracking APIs:

1. **DHL Express** - Premium international courier service
2. **DHL eCommerce** - Economy parcel delivery (formerly DHL Parcel NL)

### What You Get

- 🌍 **Global tracking** - 220+ countries and territories
- 📍 **Real-time location** - GPS tracking for Express
- 🕐 **Frequent updates** - Every scan and movement
- 📦 **Proof of delivery** - Signature and photo
- ⏱️ **ETA updates** - Dynamic delivery estimates
- 🚚 **Multi-language** - Support for 40+ languages

---

## 🔑 Getting API Access

### DHL Express API

#### Step 1: Create DHL Developer Account

1. Visit: https://developer.dhl.com
2. Click "Get Started" or "Sign Up"
3. Complete registration:
   - Email and password
   - Company information
   - Developer profile

#### Step 2: Create Application

1. Log in to developer portal
2. Go to "My Apps"
3. Click "Create New App"
4. Fill in:
   - App name: "Beeylo Shopify Integration"
   - Description: "Order tracking integration"
   - API products: Select "Shipment Tracking - Unified"

#### Step 3: Get Credentials

After app creation:

```
API Key: your_api_key_here
API Secret: your_api_secret_here (if required)
```

### DHL eCommerce / Parcel NL

#### For Netherlands (DHL Parcel)

1. Contact DHL Parcel Netherlands:
   - Email: api@dhlparcel.nl
   - Phone: +31 (0)900 0570
2. Provide:
   - Company details (KVK number)
   - Monthly shipment volume
   - Integration use case
3. Receive credentials:
   - User ID
   - API Key
   - Account number

---

## 🔐 Authentication

### DHL Express - API Key Method

```bash
curl -X GET "https://api-eu.dhl.com/track/shipments?trackingNumber=1234567890" \
  -H "DHL-API-Key: your_api_key_here" \
  -H "Accept: application/json"
```

### DHL eCommerce - Basic Auth

```bash
curl -X GET "https://api-gw.dhlparcel.nl/track-trace?key=1234567890" \
  -H "Authorization: Basic base64(userId:apiKey)" \
  -H "Accept: application/json"
```

### Environment Configuration

```env
# DHL Express
DHL_EXPRESS_API_KEY=your_dhl_express_key
DHL_EXPRESS_API_URL=https://api-eu.dhl.com

# DHL eCommerce/Parcel
DHL_PARCEL_USER_ID=your_user_id
DHL_PARCEL_API_KEY=your_api_key
DHL_PARCEL_API_URL=https://api-gw.dhlparcel.nl

# Which DHL service to use (express or parcel)
DHL_SERVICE=express  # or "parcel" for NL domestic
```

---

## 📡 API Endpoints

### DHL Express - Unified Tracking API

**Endpoint:**
```
GET /track/shipments?trackingNumber={tracking-number}
```

**Request:**
```bash
GET https://api-eu.dhl.com/track/shipments?trackingNumber=1234567890
Headers:
  - DHL-API-Key: your_api_key_here
  - Accept: application/json
```

**Response:**
```json
{
  "shipments": [
    {
      "id": "1234567890",
      "service": "express",
      "origin": {
        "address": {
          "addressLocality": "Rotterdam",
          "countryCode": "NL"
        }
      },
      "destination": {
        "address": {
          "addressLocality": "Amsterdam",
          "countryCode": "NL"
        }
      },
      "status": {
        "timestamp": "2024-01-15T14:32:00",
        "location": {
          "address": {
            "addressLocality": "Utrecht"
          }
        },
        "statusCode": "transit",
        "status": "transit",
        "description": "Shipment is in transit"
      },
      "estimatedTimeOfDelivery": "2024-01-16T18:00:00",
      "estimatedDeliveryTimeFrame": {
        "estimatedFrom": "2024-01-16T09:00:00",
        "estimatedThrough": "2024-01-16T18:00:00"
      },
      "events": [
        {
          "timestamp": "2024-01-15T09:00:00",
          "location": {
            "address": {
              "addressLocality": "Rotterdam"
            }
          },
          "statusCode": "pre-transit",
          "status": "pre-transit",
          "description": "Shipment information received"
        },
        {
          "timestamp": "2024-01-15T12:00:00",
          "location": {
            "address": {
              "addressLocality": "Utrecht Facility"
            }
          },
          "statusCode": "transit",
          "status": "transit",
          "description": "Processed at DHL facility"
        },
        {
          "timestamp": "2024-01-15T14:32:00",
          "location": {
            "address": {
              "addressLocality": "Utrecht"
            }
          },
          "statusCode": "transit",
          "status": "transit",
          "description": "Shipment is in transit"
        }
      ],
      "details": {
        "proofOfDelivery": {
          "timestamp": "2024-01-16T15:45:00",
          "signatureUrl": "https://...",
          "signed": {
            "name": "J. de Vries"
          }
        }
      }
    }
  ]
}
```

### DHL Parcel NL - Track & Trace API

**Endpoint:**
```
GET /track-trace?key={tracking-number}
```

**Request:**
```bash
GET https://api-gw.dhlparcel.nl/track-trace?key=JVGL1234567890
Headers:
  - Authorization: Basic base64(userId:apiKey)
  - Accept: application/json
```

**Response:**
```json
{
  "trackedShipments": [
    {
      "barcode": "JVGL1234567890",
      "status": {
        "key": "DELIVERED",
        "message": "Delivered"
      },
      "events": [
        {
          "timestamp": "2024-01-15T09:00:00+01:00",
          "status": {
            "key": "COLLECTED",
            "message": "Collected from sender"
          },
          "location": "Rotterdam"
        },
        {
          "timestamp": "2024-01-15T12:00:00+01:00",
          "status": {
            "key": "SORTING",
            "message": "At sorting center"
          },
          "location": "Utrecht"
        },
        {
          "timestamp": "2024-01-16T15:45:00+01:00",
          "status": {
            "key": "DELIVERED",
            "message": "Delivered"
          },
          "location": "Amsterdam",
          "receiver": {
            "name": "J. de Vries"
          }
        }
      ]
    }
  ]
}
```

---

## 📊 Status Codes

### DHL Express Status Codes

| Code | Status | Description | Phase |
|------|--------|-------------|-------|
| pre-transit | Pre-transit | Information received | Collection |
| transit | In Transit | Package moving | Transport |
| delivered | Delivered | Successfully delivered | Delivery |
| failure | Failed | Delivery failed | Exception |
| unknown | Unknown | Status not available | Unknown |

### DHL Parcel Status Keys

| Key | Description | Phase |
|-----|-------------|-------|
| COLLECTED | Collected from sender | Collection |
| SORTING | At sorting center | Processing |
| TRANSIT | In transit | Transport |
| DELIVERY | Out for delivery | Delivery |
| DELIVERED | Successfully delivered | Complete |
| EXCEPTION | Delivery exception | Problem |
| RETURNED | Returned to sender | Return |

---

## 🔄 Request/Response Format

### TypeScript Interfaces

```typescript
// DHL Express
interface DHLExpressTrackingResponse {
  shipments: Array<{
    id: string;
    service: string;
    origin: {
      address: {
        addressLocality: string;
        countryCode: string;
      };
    };
    destination: {
      address: {
        addressLocality: string;
        countryCode: string;
      };
    };
    status: {
      timestamp: string;
      statusCode: string;
      status: string;
      description: string;
      location?: {
        address: {
          addressLocality: string;
        };
      };
    };
    estimatedTimeOfDelivery?: string;
    events: Array<{
      timestamp: string;
      statusCode: string;
      status: string;
      description: string;
      location?: {
        address: {
          addressLocality: string;
        };
      };
    }>;
    details?: {
      proofOfDelivery?: {
        timestamp: string;
        signatureUrl?: string;
        signed?: {
          name: string;
        };
      };
    };
  }>;
}

// DHL Parcel
interface DHLParcelTrackingResponse {
  trackedShipments: Array<{
    barcode: string;
    status: {
      key: string;
      message: string;
    };
    events: Array<{
      timestamp: string;
      status: {
        key: string;
        message: string;
      };
      location?: string;
      receiver?: {
        name: string;
      };
    }>;
  }>;
}
```

---

## ⚠️ Rate Limits

### DHL Express

- **Standard**: 250 requests per minute
- **Enterprise**: Custom limits
- **Burst**: Up to 500 requests per minute (short term)

### DHL Parcel

- **Standard**: 60 requests per minute
- **Business**: 120 requests per minute

### Handling Rate Limits

```typescript
const rateLimiter = {
  dhlExpress: new RateLimiter(250, 'minute'),
  dhlParcel: new RateLimiter(60, 'minute'),
};

async function fetchWithRateLimit(service: 'express' | 'parcel') {
  await rateLimiter[service === 'express' ? 'dhlExpress' : 'dhlParcel'].wait();
  return await fetch(/* ... */);
}
```

---

## 🧪 Test Tracking Numbers

### DHL Express Sandbox

| Tracking Number | Scenario | Expected Status |
|----------------|----------|-----------------|
| 1234567890 | Normal delivery | Multiple events, delivered |
| 9876543210 | In transit | Multiple transit events |
| 1111111111 | Failed delivery | Delivery exception |
| 2222222222 | Held at facility | Awaiting pickup |

### DHL Parcel Sandbox

| Barcode | Scenario | Expected Status |
|---------|----------|-----------------|
| JVGL1234567890 | Normal delivery | Delivered |
| JVGL9876543210 | In transit | Multiple events |
| JVGL1111111111 | Exception | Delivery failed |

---

## 💾 Database Storage

### DHL Tracking Events Table

```sql
CREATE TABLE dhl_tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fulfillment_id UUID REFERENCES order_fulfillments(id),
  tracking_number TEXT NOT NULL,
  service TEXT NOT NULL, -- 'express' or 'parcel'
  status_code TEXT NOT NULL,
  status_description TEXT NOT NULL,
  location TEXT,
  timestamp TIMESTAMPTZ NOT NULL,
  proof_of_delivery_url TEXT,
  signature_name TEXT,
  raw_response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dhl_tracking_fulfillment ON dhl_tracking_events(fulfillment_id);
CREATE INDEX idx_dhl_tracking_number ON dhl_tracking_events(tracking_number);
CREATE INDEX idx_dhl_service ON dhl_tracking_events(service);
```

---

## 🔧 Implementation Steps

### 1. Determine DHL Service

```typescript
function determineDHLService(trackingNumber: string): 'express' | 'parcel' {
  // DHL Express: 10 digits
  if (/^\d{10}$/.test(trackingNumber)) {
    return 'express';
  }

  // DHL Parcel NL: Starts with JVGL
  if (trackingNumber.startsWith('JVGL')) {
    return 'parcel';
  }

  // Default to express for international
  return 'express';
}
```

### 2. Create DHL Service Classes

```typescript
// src/services/couriers/dhl-express.service.ts
export class DHLExpressService {
  async fetchTracking(trackingNumber: string) {
    const response = await axios.get(
      `${config.couriers.dhl.expressUrl}/track/shipments`,
      {
        params: { trackingNumber },
        headers: {
          'DHL-API-Key': config.couriers.dhl.expressApiKey,
          'Accept': 'application/json',
        },
      }
    );
    return this.parseExpressResponse(response.data);
  }
}

// src/services/couriers/dhl-parcel.service.ts
export class DHLParcelService {
  async fetchTracking(trackingNumber: string) {
    const auth = Buffer.from(
      `${config.couriers.dhl.parcelUserId}:${config.couriers.dhl.parcelApiKey}`
    ).toString('base64');

    const response = await axios.get(
      `${config.couriers.dhl.parcelUrl}/track-trace`,
      {
        params: { key: trackingNumber },
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
        },
      }
    );
    return this.parseParcelResponse(response.data);
  }
}
```

### 3. Update Tracking Service

```typescript
private async fetchDHLTracking(trackingNumber: string) {
  const service = this.determineDHLService(trackingNumber);

  if (service === 'express') {
    const dhlExpress = new DHLExpressService();
    return await dhlExpress.fetchTracking(trackingNumber);
  } else {
    const dhlParcel = new DHLParcelService();
    return await dhlParcel.fetchTracking(trackingNumber);
  }
}
```

---

## 📈 Monitoring

### Key Metrics

```sql
-- DHL API success rate by service
SELECT
  service,
  DATE(created_at) as date,
  COUNT(*) as total_calls,
  SUM(CASE WHEN status_code IS NOT NULL THEN 1 ELSE 0 END) as successful_calls
FROM dhl_tracking_events
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY service, DATE(created_at);

-- Average delivery time
SELECT
  AVG(EXTRACT(EPOCH FROM (delivered_at - created_at)) / 3600) as avg_hours
FROM order_fulfillments
WHERE tracking_company ILIKE '%dhl%'
  AND delivered_at IS NOT NULL;
```

---

## 💰 Pricing

### DHL Express API

- **Setup**: Free
- **Sandbox**: Free unlimited testing
- **Production**: Free for DHL Express customers
- **Non-customers**: Contact DHL for pricing

### DHL Parcel API

- **Setup**: Free
- **Per call**: ~€0.02 - €0.05
- **Monthly minimum**: €50
- **Volume discounts**: Available

---

## 🚨 Error Handling

### Common Errors

| Status | Error | Solution |
|--------|-------|----------|
| 400 | Bad Request | Check tracking number format |
| 401 | Unauthorized | Verify API key |
| 404 | Not Found | Tracking not in system yet |
| 429 | Too Many Requests | Implement rate limiting |
| 500 | Server Error | Retry with backoff |

### Error Response Format

```json
{
  "title": "Tracking number not found",
  "status": 404,
  "detail": "The tracking number 1234567890 was not found in our system"
}
```

---

## 📞 Support

### DHL Express

- **Developer Portal**: https://developer.dhl.com
- **Support Email**: api.support@dhl.com
- **Documentation**: https://developer.dhl.com/api-reference/shipment-tracking

### DHL Parcel NL

- **Support Email**: api@dhlparcel.nl
- **Phone**: +31 (0)900 0570
- **Documentation**: https://api-gw.dhlparcel.nl/docs

---

## ✅ Implementation Checklist

- [ ] Register for DHL developer account
- [ ] Create application and get API key
- [ ] Determine which DHL service to use (Express vs Parcel)
- [ ] Add credentials to `.env`
- [ ] Implement service detection logic
- [ ] Create DHL Express service
- [ ] Create DHL Parcel service (if needed)
- [ ] Add status code mapping
- [ ] Implement error handling
- [ ] Test with sandbox tracking numbers
- [ ] Test both Express and Parcel flows
- [ ] Implement rate limiting
- [ ] Set up monitoring
- [ ] Go live with production API

---

For detailed API reference, see `API_REFERENCE.md`.
For implementation code, see `IMPLEMENTATION_PLAN.md`.
