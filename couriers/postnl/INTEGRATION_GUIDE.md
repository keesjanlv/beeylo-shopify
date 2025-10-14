# PostNL API Integration Guide

Complete guide for integrating PostNL tracking API into Beeylo's Shopify integration.

---

## 📋 Overview

**PostNL** is the primary postal service in the Netherlands, handling millions of parcels daily. Their API provides real-time tracking data for both domestic and international shipments.

### What You Get

- 📍 Real-time location updates
- 🕐 Precise timestamp for each event
- 📦 Detailed status descriptions in Dutch and English
- 🎯 Estimated delivery time
- ✉️ Proof of delivery information
- 📧 Signature confirmation

---

## 🔑 Getting API Access

### Step 1: Create Business Account

1. Visit: https://developer.postnl.nl
2. Click "Register" or "Aanmelden"
3. Fill in company details:
   - Company name
   - KVK number (Dutch Chamber of Commerce)
   - Contact information
   - Estimated monthly volume

### Step 2: Request API Access

1. Log in to developer portal
2. Navigate to "API Products"
3. Select "Track & Trace API"
4. Submit access request with:
   - Use case description
   - Expected call volume
   - Integration timeline

### Step 3: Get Credentials

After approval (typically 2-4 weeks):

1. Go to "My Applications"
2. Create new application
3. Copy these credentials:
   ```
   API Key: your_api_key_here
   Consumer Key: your_consumer_key_here
   Consumer Secret: your_consumer_secret_here
   ```

### Step 4: Access Sandbox

For testing:
- Sandbox URL: `https://api-sandbox.postnl.nl`
- Production URL: `https://api.postnl.nl`
- Test tracking numbers provided in portal

---

## 🔐 Authentication

### Method: API Key Header

PostNL uses API key authentication via headers:

```bash
curl -X GET "https://api.postnl.nl/shipment/v2/track-and-trace/3SABCD1234567890" \
  -H "apikey: your_api_key_here" \
  -H "Accept: application/json"
```

### Environment Configuration

```env
# PostNL API Configuration
POSTNL_API_KEY=your_api_key_here
POSTNL_CONSUMER_KEY=your_consumer_key_here
POSTNL_CONSUMER_SECRET=your_consumer_secret_here
POSTNL_API_URL=https://api.postnl.nl/shipment/v2
POSTNL_SANDBOX=false  # Set to true for testing
```

---

## 📡 API Endpoints

### 1. Track & Trace - Get Shipment Status

**Endpoint:**
```
GET /shipment/v2/track-and-trace/{tracking-number}
```

**Request:**
```bash
GET https://api.postnl.nl/shipment/v2/track-and-trace/3SABCD1234567890
Headers:
  - apikey: your_api_key_here
  - Accept: application/json
```

**Response:**
```json
{
  "CurrentStatus": {
    "shipment": {
      "MainBarcode": "3SABCD1234567890",
      "Barcode": "3SABCD1234567890",
      "ShipmentAmount": "1",
      "ShipmentCounter": "1",
      "StatusCode": "2",
      "StatusDescription": "Zending in behandeling",
      "PhaseCode": "2",
      "PhaseDescription": "Sortering",
      "TimeStamp": "15-01-2024 14:32:00"
    },
    "status": [
      {
        "TimeStamp": "15-01-2024 09:00:00",
        "StatusCode": "1",
        "StatusDescription": "Zending voorgemeld",
        "StatusPhase": "Collection"
      },
      {
        "TimeStamp": "15-01-2024 12:00:00",
        "StatusCode": "2",
        "StatusDescription": "Zending in behandeling",
        "StatusPhase": "Sorting"
      },
      {
        "TimeStamp": "15-01-2024 14:32:00",
        "StatusCode": "3",
        "StatusDescription": "Zending onderweg naar bestemming",
        "StatusPhase": "Distribution"
      }
    ]
  },
  "CompleteStatus": {
    "shipment": {
      // Detailed shipment info
      "ProductCode": "3085",
      "ProductDescription": "Pakket",
      "Reference": "ORDER-12345",
      "DeliveryDate": "16-01-2024",
      "Addresses": {
        "Receiver": {
          "Name": "Jan de Vries",
          "Address": "Hoofdstraat 1",
          "Zipcode": "1234AB",
          "City": "Amsterdam",
          "CountryCode": "NL"
        }
      }
    }
  }
}
```

---

## 📊 Status Codes & Meanings

PostNL uses numeric status codes:

| Code | Dutch Description | English Translation | Phase |
|------|------------------|---------------------|-------|
| 1 | Zending voorgemeld | Shipment announced | Collection |
| 2 | Zending in behandeling | Shipment being processed | Sorting |
| 3 | Zending onderweg | Shipment in transit | Distribution |
| 4 | Zending bij afhaalpunt | Shipment at pickup point | Distribution |
| 5 | Zending bezorgd | Shipment delivered | Delivery |
| 6 | Zending niet bezorgd | Shipment not delivered | Delivery |
| 7 | Retour naar afzender | Return to sender | Return |
| 8 | Zending op douane | At customs | International |

### Phase Codes

- **Collection**: Package picked up
- **Sorting**: At sorting facility
- **Distribution**: Out for delivery
- **Delivery**: Final delivery attempt
- **Return**: Being returned
- **International**: International processing

---

## 🔄 Request/Response Format

### TypeScript Interface

```typescript
interface PostNLTrackingResponse {
  CurrentStatus: {
    shipment: {
      MainBarcode: string;
      Barcode: string;
      StatusCode: string;
      StatusDescription: string;
      PhaseCode: string;
      PhaseDescription: string;
      TimeStamp: string;
    };
    status: Array<{
      TimeStamp: string;
      StatusCode: string;
      StatusDescription: string;
      StatusPhase: string;
      LocationCode?: string;
      LocationDescription?: string;
    }>;
  };
  CompleteStatus: {
    shipment: {
      ProductCode: string;
      ProductDescription: string;
      DeliveryDate?: string;
      Addresses?: {
        Receiver: {
          Name: string;
          Address: string;
          Zipcode: string;
          City: string;
          CountryCode: string;
        };
      };
    };
  };
}
```

---

## ⚠️ Rate Limits

### Limits

- **Free tier**: 100 requests per minute
- **Business tier**: 250 requests per minute
- **Enterprise tier**: Custom limits

### Handling Rate Limits

```typescript
// Implement exponential backoff
if (response.status === 429) {
  const retryAfter = response.headers['retry-after'] || 60;
  await sleep(retryAfter * 1000);
  return retry();
}
```

### Best Practices

1. **Cache results** - Store for 5-15 minutes
2. **Batch requests** - Group multiple tracking numbers
3. **Smart polling** - Check less frequently for delivered packages
4. **Monitor usage** - Track API calls to avoid limits

---

## 🧪 Test Tracking Numbers

PostNL provides test tracking numbers in sandbox:

### Scenarios

| Tracking Number | Scenario | Expected Status |
|----------------|----------|-----------------|
| 3SABCD1234567890 | Normal delivery | Delivered |
| 3SABCD0987654321 | In transit | Multiple updates |
| 3SABCD1111111111 | Failed delivery | Not delivered |
| 3SABCD2222222222 | At pickup point | Waiting for pickup |
| 3SABCD3333333333 | Return to sender | Being returned |

### Testing Checklist

- [ ] Normal delivery flow
- [ ] Multiple status updates
- [ ] Failed delivery attempt
- [ ] Package at pickup point
- [ ] International shipment
- [ ] Return to sender
- [ ] Invalid tracking number
- [ ] Rate limit handling

---

## 💾 Database Storage

### Tracking Events Table

```sql
CREATE TABLE postnl_tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fulfillment_id UUID REFERENCES order_fulfillments(id),
  tracking_number TEXT NOT NULL,
  status_code TEXT NOT NULL,
  status_description TEXT NOT NULL,
  phase_code TEXT,
  phase_description TEXT,
  location_code TEXT,
  location_description TEXT,
  timestamp TIMESTAMPTZ NOT NULL,
  raw_response JSONB, -- Store full API response
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_postnl_tracking_fulfillment ON postnl_tracking_events(fulfillment_id);
CREATE INDEX idx_postnl_tracking_number ON postnl_tracking_events(tracking_number);
```

---

## 🔧 Implementation Steps

### 1. Update Configuration

```typescript
// src/config/index.ts
export const config = {
  couriers: {
    postnl: {
      apiKey: process.env.POSTNL_API_KEY || '',
      apiUrl: process.env.POSTNL_SANDBOX === 'true'
        ? 'https://api-sandbox.postnl.nl/shipment/v2'
        : 'https://api.postnl.nl/shipment/v2',
    },
  },
};
```

### 2. Create PostNL Service

```typescript
// src/services/couriers/postnl.service.ts
export class PostNLService {
  async fetchTracking(trackingNumber: string) {
    // Implement API call
    // Parse response
    // Transform to common format
    // Return tracking data
  }
}
```

### 3. Update Tracking Service

```typescript
// src/services/tracking.service.ts
private async fetchPostNLTracking(trackingNumber: string) {
  const postnl = new PostNLService();
  return await postnl.fetchTracking(trackingNumber);
}
```

### 4. Add Webhook Handler

When Shopify fulfillment has PostNL tracking:
```typescript
if (trackingCompany === 'PostNL' && config.couriers.postnl.apiKey) {
  // Use PostNL API for detailed tracking
  await trackingService.startTracking(fulfillmentId, trackingNumber, 'postnl');
}
```

---

## 📈 Monitoring

### Key Metrics

```sql
-- PostNL API success rate
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_calls,
  SUM(CASE WHEN status_code IS NOT NULL THEN 1 ELSE 0 END) as successful_calls
FROM postnl_tracking_events
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at);

-- Average events per shipment
SELECT
  AVG(event_count) as avg_events
FROM (
  SELECT tracking_number, COUNT(*) as event_count
  FROM postnl_tracking_events
  GROUP BY tracking_number
) subquery;
```

---

## 💰 Pricing

### API Costs (Approximate)

- **Setup fee**: Free
- **Per API call**: €0.01 - €0.05
- **Monthly minimum**: None
- **Volume discounts**: Available for >10,000 calls/month

### Cost Optimization

1. Cache responses for 5-15 minutes
2. Only check active shipments
3. Reduce frequency for delivered packages
4. Use batch endpoints where available

---

## 🚨 Error Handling

### Common Errors

| Status | Error | Solution |
|--------|-------|----------|
| 400 | Invalid tracking number | Validate format before calling |
| 401 | Unauthorized | Check API key |
| 404 | Tracking not found | Package not yet in system |
| 429 | Rate limit exceeded | Implement backoff |
| 500 | Server error | Retry with exponential backoff |

### Error Response

```json
{
  "fault": {
    "faultstring": "Invalid ApiKey",
    "detail": {
      "errorcode": "oauth.v2.InvalidApiKey"
    }
  }
}
```

---

## 📞 Support

### PostNL Developer Support

- **Email**: developer@postnl.nl
- **Portal**: https://developer.postnl.nl/support
- **Phone**: +31 88 868 6666
- **Hours**: Monday-Friday, 8:00-17:00 CET

### Documentation

- API Docs: https://developer.postnl.nl/docs/track-and-trace
- Sandbox: https://developer.postnl.nl/sandbox
- Status Page: https://status.postnl.nl

---

## ✅ Implementation Checklist

- [ ] Register for PostNL developer account
- [ ] Request API access (2-4 week lead time)
- [ ] Get API credentials
- [ ] Add credentials to `.env`
- [ ] Implement PostNL service class
- [ ] Add status code mapping
- [ ] Implement error handling
- [ ] Test with sandbox tracking numbers
- [ ] Test all scenarios (delivery, failed, return)
- [ ] Implement caching
- [ ] Add rate limit handling
- [ ] Set up monitoring
- [ ] Document for team
- [ ] Go live with production API

---

## 🔄 Next Steps

After PostNL integration:
1. Monitor API usage and costs
2. Gather customer feedback
3. Optimize polling frequency
4. Consider batch endpoints
5. Move to other couriers (DHL, DPD)

---

For detailed API reference, see `API_REFERENCE.md` in this folder.
For implementation code, see `IMPLEMENTATION_PLAN.md`.
