# GLS API Integration Guide

Complete guide for integrating GLS (General Logistics Systems) parcel tracking API.

---

## 📋 Overview

**GLS** is one of Europe's leading parcel service providers, operating in 42 countries across Europe and North America. They offer comprehensive tracking APIs through their MyGLS platform.

### What You Get

- 🌍 **European coverage** - 42 countries across Europe
- 📍 **Real-time location** - Detailed tracking with depot information
- 🕐 **Frequent updates** - Every scan and movement
- 📦 **Proof of delivery** - POD with signature capture
- ⏱️ **Delivery timeframes** - Expected delivery date
- 🔔 **Webhook notifications** - Real-time status push updates
- 🌐 **Multi-language support** - Local language tracking info

---

## 🔑 Getting API Access

### Step 1: Contact GLS for API Access

GLS requires a business agreement before providing API access. Contact your regional GLS office:

#### Netherlands
- **Website**: https://api-portal.gls.nl
- **Email**: support@gls-netherlands.com
- **Phone**: +31 (0)20 521 3333

#### Belgium
- **Website**: https://gls-group.eu/BE/
- **Email**: info@gls-belgium.com
- **Phone**: +32 (0)3 760 56 00

#### Germany
- **Website**: https://gls-group.com/DE
- **Email**: kundenservice@gls-germany.com
- **Phone**: +49 (0)6677 646 907000

#### International (Other Countries)
- **Website**: https://dev-portal.gls-group.net
- **General Contact**: https://gls-group.com/GROUP/en/contact

### Step 2: Provide Business Information

When requesting API access, prepare:

1. **Company Details**:
   - Legal company name
   - Chamber of Commerce (KVK) number
   - VAT number
   - Business address

2. **Integration Details**:
   - Purpose: "E-commerce order tracking integration"
   - Expected monthly shipment volume
   - Technical contact person

3. **Existing Relationship**:
   - GLS customer number (if existing customer)
   - Contract details

### Step 3: Sign API Agreement

GLS will provide:
- Terms and conditions for API usage
- Service Level Agreement (SLA)
- Pricing structure (if applicable)

### Step 4: Receive API Credentials

After approval, you'll receive:

```
API Username: your_gls_username
API Password: your_gls_password
Customer ID: your_customer_id (if applicable)
Environment URLs:
  - Test/Sandbox: https://api.test.mygls.hu
  - Production: https://api.mygls.hu
```

**Timeline**: 2-4 weeks for approval and credential provisioning

---

## 🔐 Authentication

### HTTP Basic Authentication

GLS uses standard HTTP Basic Authentication for all API requests.

```bash
# Encode credentials
echo -n "username:password" | base64
# Result: dXNlcm5hbWU6cGFzc3dvcmQ=

# Use in API call
curl -X POST "https://api.mygls.hu/ParcelService.svc/json/GetParcelStatuses" \
  -H "Authorization: Basic dXNlcm5hbWU6cGFzc3dvcmQ=" \
  -H "Content-Type: application/json" \
  -d '{"ParcelNumber": "35000001406746"}'
```

### Environment Configuration

```env
# GLS API Configuration
GLS_API_USERNAME=your_gls_username
GLS_API_PASSWORD=your_gls_password
GLS_API_URL=https://api.mygls.hu
GLS_API_URL_TEST=https://api.test.mygls.hu
GLS_CUSTOMER_ID=your_customer_id

# Environment (test or production)
GLS_ENVIRONMENT=production
```

### TypeScript Authentication Helper

```typescript
function getGLSAuthHeader(): string {
  const credentials = `${process.env.GLS_API_USERNAME}:${process.env.GLS_API_PASSWORD}`;
  const encoded = Buffer.from(credentials).toString('base64');
  return `Basic ${encoded}`;
}
```

---

## 📡 API Endpoints

### 1. Track Single Parcel (REST)

**Endpoint:**
```
POST /ParcelService.svc/json/GetParcelStatuses
```

**Request:**
```bash
POST https://api.mygls.hu/ParcelService.svc/json/GetParcelStatuses
Headers:
  - Authorization: Basic {base64_credentials}
  - Content-Type: application/json

Body:
{
  "ParcelNumber": "35000001406746"
}
```

**Response:**
```json
{
  "ParcelStatusList": [
    {
      "ParcelNumber": "35000001406746",
      "StatusInfo": {
        "StatusCode": "DELIVERED",
        "StatusText": "Delivered",
        "StatusDate": "2024-01-16T15:45:00"
      },
      "DepotInfo": {
        "DepotNumber": "NL-AMS-001",
        "DepotName": "GLS Amsterdam",
        "DepotAddress": "Strawinskylaan 1, 1077 XX Amsterdam"
      },
      "Events": [
        {
          "Code": "COLLECTED",
          "Date": "2024-01-15T09:00:00",
          "Location": "Rotterdam",
          "Description": "Parcel collected from sender"
        },
        {
          "Code": "IN_TRANSIT",
          "Date": "2024-01-15T12:30:00",
          "Location": "Utrecht Hub",
          "Description": "In transit to destination depot"
        },
        {
          "Code": "OUT_FOR_DELIVERY",
          "Date": "2024-01-16T08:00:00",
          "Location": "Amsterdam",
          "Description": "Out for delivery"
        },
        {
          "Code": "DELIVERED",
          "Date": "2024-01-16T15:45:00",
          "Location": "Amsterdam",
          "Description": "Successfully delivered",
          "ReceiverName": "J. de Vries"
        }
      ],
      "PODInfo": {
        "SignatureAvailable": true,
        "SignatureUrl": "https://gls-group.com/signature/...",
        "PhotoUrl": null,
        "ReceiverName": "J. de Vries",
        "DeliveryDate": "2024-01-16T15:45:00"
      },
      "DeliveryInfo": {
        "EstimatedDeliveryDate": "2024-01-16",
        "ActualDeliveryDate": "2024-01-16",
        "TimeSlot": "14:00-18:00"
      }
    }
  ]
}
```

### 2. Track Multiple Parcels (Batch)

**Endpoint:**
```
POST /ParcelService.svc/json/GetParcelStatusesByDate
```

**Request:**
```bash
POST https://api.mygls.hu/ParcelService.svc/json/GetParcelStatusesByDate
Headers:
  - Authorization: Basic {base64_credentials}
  - Content-Type: application/json

Body:
{
  "DateFrom": "2024-01-15T00:00:00",
  "DateTo": "2024-01-16T23:59:59",
  "ParcelNumbers": [
    "35000001406746",
    "35000001406747",
    "35000001406748"
  ]
}
```

### 3. Track & Trace API (Netherlands)

**Endpoint (GLS NL):**
```
POST /api/parcel/v1/details
```

**Request:**
```bash
POST https://api-portal.gls.nl/api/parcel/v1/details
Headers:
  - Authorization: Bearer {jwt_token}
  - Content-Type: application/json

Body:
{
  "username": "your_username",
  "password": "your_password",
  "parcelNumbers": ["35000001406746"]
}
```

---

## 📊 Status Codes

### GLS Status Codes

| Code | Description | Phase | Customer Message |
|------|-------------|-------|------------------|
| PREADVICE | Information received | Pre-transit | Your parcel has been registered |
| COLLECTED | Collected from sender | Collection | Parcel collected from sender |
| IN_TRANSIT | In transit | Transport | Your parcel is on its way |
| AT_DEPOT | At delivery depot | Depot | Parcel at delivery depot |
| OUT_FOR_DELIVERY | Out for delivery | Delivery | Out for delivery today |
| DELIVERED | Successfully delivered | Complete | Delivered successfully |
| DELIVERY_FAILED | Delivery attempt failed | Exception | Delivery attempt failed |
| AWAITING_COLLECTION | Ready for pickup | Pickup | Ready for collection at ParcelShop |
| RETURNED | Returned to sender | Return | Parcel returned to sender |
| EXCEPTION | Delivery exception | Problem | Delivery issue - contact GLS |

### Status Mapping to Common Format

```typescript
const statusMap: Record<string, string> = {
  'PREADVICE': 'pending',
  'COLLECTED': 'in_transit',
  'IN_TRANSIT': 'in_transit',
  'AT_DEPOT': 'in_transit',
  'OUT_FOR_DELIVERY': 'out_for_delivery',
  'DELIVERED': 'delivered',
  'DELIVERY_FAILED': 'failure',
  'AWAITING_COLLECTION': 'available_for_pickup',
  'RETURNED': 'return_to_sender',
  'EXCEPTION': 'failure',
};
```

---

## 🔄 Request/Response Format

### TypeScript Interfaces

```typescript
// GLS API Request
interface GLSTrackingRequest {
  ParcelNumber: string;
}

interface GLSBatchTrackingRequest {
  DateFrom: string; // ISO 8601 format
  DateTo: string;
  ParcelNumbers: string[];
}

// GLS API Response
interface GLSTrackingResponse {
  ParcelStatusList: GLSParcelStatus[];
}

interface GLSParcelStatus {
  ParcelNumber: string;
  StatusInfo: {
    StatusCode: string;
    StatusText: string;
    StatusDate: string; // ISO 8601
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

interface GLSEvent {
  Code: string;
  Date: string; // ISO 8601
  Location: string;
  Description: string;
  ReceiverName?: string;
}

// Common format for our system
interface CourierTrackingResponse {
  tracking_number: string;
  status: string;
  status_description: string;
  current_location?: string;
  estimated_delivery?: string;
  actual_delivery?: string;
  events: TrackingEvent[];
  proof_of_delivery?: {
    signature_url?: string;
    photo_url?: string;
    receiver_name?: string;
    timestamp?: string;
  };
}

interface TrackingEvent {
  timestamp: string;
  status: string;
  description: string;
  location?: string;
}
```

---

## ⚠️ Rate Limits

### Standard API Limits

- **Requests per minute**: 60
- **Requests per hour**: 1,000
- **Daily limit**: 10,000 requests
- **Burst capacity**: Up to 100 requests in short bursts

### Rate Limiting Strategy

```typescript
import Bottleneck from 'bottleneck';

const glsLimiter = new Bottleneck({
  minTime: 1000, // 1 second between requests
  maxConcurrent: 5, // Max 5 concurrent requests
  reservoir: 60, // 60 requests
  reservoirRefreshAmount: 60,
  reservoirRefreshInterval: 60 * 1000, // Per minute
});

async function fetchGLSTracking(parcelNumber: string) {
  return glsLimiter.schedule(() =>
    makeGLSAPICall(parcelNumber)
  );
}
```

---

## 🧪 Test Tracking Numbers

### GLS Test Environment

Test endpoint: `https://api.test.mygls.hu`

| Parcel Number | Scenario | Expected Status |
|---------------|----------|-----------------|
| 35000001406746 | Normal delivery | DELIVERED with full tracking |
| 35000001406747 | In transit | Multiple IN_TRANSIT events |
| 35000001406748 | Out for delivery | OUT_FOR_DELIVERY status |
| 35000001406749 | Failed delivery | DELIVERY_FAILED with reason |
| 35000001406750 | Awaiting pickup | AWAITING_COLLECTION at ParcelShop |
| 35000001406751 | Returned | RETURNED to sender |

**Note**: Test credentials are provided separately by GLS after API access approval.

---

## 💾 Database Storage

### GLS Tracking Events Table

```sql
CREATE TABLE gls_tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fulfillment_id UUID REFERENCES order_fulfillments(id),
  parcel_number TEXT NOT NULL,
  status_code TEXT NOT NULL,
  status_text TEXT NOT NULL,
  location TEXT,
  depot_number TEXT,
  depot_name TEXT,
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

CREATE INDEX idx_gls_tracking_fulfillment ON gls_tracking_events(fulfillment_id);
CREATE INDEX idx_gls_parcel_number ON gls_tracking_events(parcel_number);
CREATE INDEX idx_gls_status_code ON gls_tracking_events(status_code);
CREATE INDEX idx_gls_timestamp ON gls_tracking_events(timestamp);
```

---

## 🔔 Webhook Integration

### GLS Track & Trace Webhook

GLS can push status updates to your server in real-time.

**Webhook Endpoint (Your Server):**
```
POST https://your-domain.com/api/webhooks/gls
```

**Webhook Payload:**
```json
{
  "ParcelNumber": "35000001406746",
  "EventCode": "DELIVERED",
  "EventDate": "2024-01-16T15:45:00Z",
  "Location": "Amsterdam",
  "Description": "Successfully delivered",
  "ReceiverName": "J. de Vries"
}
```

**Setup Instructions:**
1. Create webhook endpoint in your application
2. Provide endpoint URL to GLS support
3. GLS configures webhook for your account
4. Validate webhook signature (if provided)
5. Process status updates in real-time

---

## 🚨 Error Handling

### Common Error Responses

| Status Code | Error | Cause | Solution |
|-------------|-------|-------|----------|
| 401 | Unauthorized | Invalid credentials | Check username/password |
| 404 | Parcel not found | Tracking number not in system | Verify tracking number or wait |
| 429 | Too many requests | Rate limit exceeded | Implement rate limiting |
| 500 | Internal server error | GLS server issue | Retry with exponential backoff |
| 503 | Service unavailable | Maintenance or outage | Check status page, retry later |

### Error Response Format

```json
{
  "ErrorCode": "PARCEL_NOT_FOUND",
  "ErrorMessage": "The parcel number 35000001406746 was not found in our system",
  "StatusCode": 404,
  "Timestamp": "2024-01-16T10:00:00Z"
}
```

### Error Handling Strategy

```typescript
async function fetchGLSTrackingWithRetry(
  parcelNumber: string,
  maxRetries = 3
): Promise<GLSTrackingResponse> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fetchGLSTracking(parcelNumber);
    } catch (error) {
      if (error.status === 404 && attempt < maxRetries) {
        // Parcel might not be in system yet, wait and retry
        await sleep(5000 * attempt); // Exponential backoff
        continue;
      }

      if (error.status === 429) {
        // Rate limited, wait longer
        await sleep(60000); // Wait 1 minute
        continue;
      }

      if (error.status >= 500 && attempt < maxRetries) {
        // Server error, retry
        await sleep(2000 * attempt);
        continue;
      }

      // Don't retry on other errors
      throw error;
    }
  }

  throw new Error(`Failed to fetch tracking after ${maxRetries} attempts`);
}
```

---

## 💰 Pricing

### GLS API Pricing (Estimated)

- **Setup Fee**: €0 (for existing GLS customers)
- **Monthly Base**: €50 - €100 (depending on volume)
- **Per API Call**: €0.02 - €0.04
- **Volume Discounts**: Available for >1000 parcels/month

### Cost Optimization

1. **Cache tracking data** - Store recent results (5-10 minutes)
2. **Use webhooks** - Reduce polling API calls
3. **Batch requests** - Use date range queries for multiple parcels
4. **Smart polling** - Check less frequently after delivery

**Example**: 1000 parcels/month with 5 status checks each = 5000 API calls
- Cost: €50 base + (5000 × €0.03) = €200/month

---

## 📞 Support

### GLS Developer Support

- **Developer Portal**: https://dev-portal.gls-group.net
- **Netherlands Support**: support@gls-netherlands.com
- **Technical Issues**: api-support@gls-group.com
- **Phone Support**: +31 (0)20 521 3333 (NL)

### Documentation Resources

- **API Documentation**: Available in developer portal after approval
- **Integration Guides**: Provided with API credentials
- **Webhook Setup**: Contact GLS support for configuration

---

## ✅ Implementation Checklist

- [ ] Contact GLS for API access
- [ ] Provide business information and use case
- [ ] Sign API agreement and terms
- [ ] Receive API credentials (username, password)
- [ ] Test connection with sandbox environment
- [ ] Add credentials to `.env` file
- [ ] Implement authentication helper
- [ ] Create GLS service class
- [ ] Add status code mapping
- [ ] Implement error handling and retries
- [ ] Add rate limiting
- [ ] Test with test tracking numbers
- [ ] Set up webhook endpoint (optional)
- [ ] Configure webhook with GLS (optional)
- [ ] Test production API
- [ ] Monitor API usage and costs
- [ ] Go live

---

## 🎯 Next Steps

1. **Review API Reference** - See `API_REFERENCE.md` for detailed endpoint documentation
2. **Read Implementation Plan** - See `IMPLEMENTATION_PLAN.md` for code implementation
3. **Check Testing Guide** - See `TESTING.md` for testing scenarios
4. **Contact GLS** - Start the API access request process

---

For questions or issues, contact your GLS account manager or GLS technical support.
