# DPD API Integration Guide

Complete guide for integrating DPD (Dynamic Parcel Distribution) tracking API - Europe's leading parcel delivery network.

---

## 📋 Overview

**DPD** operates in 50+ European countries with extensive coverage in Netherlands, Germany, UK, France, and Poland. Part of Geopost (La Poste Group).

### What You Get

- 🇪🇺 **Pan-European coverage** - 50+ countries
- 📍 **Predict service** - 1-hour delivery windows
- 🕐 **Real-time updates** - Every scan
- 📱 **SMS/Email integration** - Direct customer notifications
- 📦 **Pickup point network** - 40,000+ locations
- 🔔 **Proactive alerts** - Delivery exceptions

---

## 🔑 Getting API Access

### Step 1: Contact DPD

**Email**: api@dpd.com or country-specific (e.g., api@dpd.nl for Netherlands)
**Phone**: Country-specific customer service
**Website**: https://www.dpd.com

### Step 2: Business Agreement

Required information:
- Company details (Chamber of Commerce registration)
- Monthly shipment volume
- API use case and integration scope
- Technical contact details

### Step 3: Receive Credentials

After approval (2-4 weeks):
```
Username: your_username
Password: your_password
API Key: your_api_key (OAuth token)
Customer Number: your_customer_number
```

---

## 🔐 Authentication

### OAuth 2.0 Bearer Token

```bash
# Step 1: Get access token
curl -X POST "https://api.dpd.com/oauth2/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET"

# Response:
{
  "access_token": "eyJhbGc...",
  "token_type": "Bearer",
  "expires_in": 3600
}

# Step 2: Use token for tracking
curl -X GET "https://api.dpd.com/v1/parcels/12345678901234" \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Accept: application/json"
```

### Environment Configuration

```env
DPD_CLIENT_ID=your_client_id
DPD_CLIENT_SECRET=your_client_secret
DPD_CUSTOMER_NUMBER=your_customer_number
DPD_API_URL=https://api.dpd.com/v1
DPD_SANDBOX=false  # Use test environment
```

---

## 📡 API Endpoints

### Track Parcel

**Endpoint:**
```
GET /v1/parcels/{parcel-number}
```

**Request:**
```bash
GET https://api.dpd.com/v1/parcels/12345678901234
Headers:
  - Authorization: Bearer {access_token}
  - Accept: application/json
```

**Response:**
```json
{
  "parcelNumber": "12345678901234",
  "currentStatus": "DELIVERED",
  "currentStatusDescription": "Parcel has been delivered",
  "predictedDeliveryDate": "2024-01-16",
  "predictedDeliveryTimeWindow": {
    "from": "14:00",
    "to": "15:00"
  },
  "deliveryDate": "2024-01-16T14:35:00Z",
  "recipient": {
    "name": "J. de Vries",
    "address": {
      "street": "Hoofdstraat 1",
      "city": "Amsterdam",
      "postalCode": "1234AB",
      "countryCode": "NL"
    }
  },
  "parcelLifeCycleData": [
    {
      "date": "2024-01-15T09:00:00Z",
      "statusCode": "COLLECTED",
      "statusDescription": "Parcel collected from sender",
      "depot": {
        "name": "Rotterdam Depot",
        "city": "Rotterdam"
      }
    },
    {
      "date": "2024-01-15T12:30:00Z",
      "statusCode": "SORTING",
      "statusDescription": "Parcel at sorting center",
      "depot": {
        "name": "Utrecht Sorting Center",
        "city": "Utrecht"
      }
    },
    {
      "date": "2024-01-16T08:00:00Z",
      "statusCode": "OUT_FOR_DELIVERY",
      "statusDescription": "Out for delivery",
      "depot": {
        "name": "Amsterdam Delivery Depot",
        "city": "Amsterdam"
      }
    },
    {
      "date": "2024-01-16T14:35:00Z",
      "statusCode": "DELIVERED",
      "statusDescription": "Delivered to recipient",
      "depot": {
        "name": "Amsterdam",
        "city": "Amsterdam"
      },
      "receiver": {
        "name": "J. de Vries"
      }
    }
  ],
  "proofOfDelivery": {
    "signatureAvailable": true,
    "signatureUrl": "https://dpd.com/pod/12345678901234",
    "photoAvailable": false
  }
}
```

---

## 📊 Status Codes

| Code | Description | Phase |
|------|-------------|-------|
| ANNOUNCED | Parcel announced | Pre-transit |
| COLLECTED | Collected from sender | Collection |
| SORTING | At sorting center | Processing |
| IN_TRANSIT | In transit | Transport |
| OUT_FOR_DELIVERY | Out for delivery | Delivery |
| DELIVERED | Delivered successfully | Complete |
| EXCEPTION | Delivery exception | Problem |
| AT_PICKUP_POINT | At pickup point | Waiting |
| RETURNED | Returned to sender | Return |

---

## 🔄 TypeScript Interface

```typescript
interface DPDTrackingResponse {
  parcelNumber: string;
  currentStatus: string;
  currentStatusDescription: string;
  predictedDeliveryDate?: string;
  predictedDeliveryTimeWindow?: {
    from: string;
    to: string;
  };
  deliveryDate?: string;
  recipient: {
    name: string;
    address: {
      street: string;
      city: string;
      postalCode: string;
      countryCode: string;
    };
  };
  parcelLifeCycleData: Array<{
    date: string;
    statusCode: string;
    statusDescription: string;
    depot?: {
      name: string;
      city: string;
    };
    receiver?: {
      name: string;
    };
  }>;
  proofOfDelivery?: {
    signatureAvailable: boolean;
    signatureUrl?: string;
    photoAvailable: boolean;
    photoUrl?: string;
  };
}
```

---

## ⚠️ Rate Limits

- **Standard**: 60 requests per minute
- **Business**: 120 requests per minute
- **Enterprise**: Custom limits

### Token Expiry

- Access tokens expire after 60 minutes
- Implement token refresh logic
- Cache tokens to minimize auth requests

---

## 🧪 Test Tracking Numbers

DPD provides these in their sandbox environment:

| Parcel Number | Scenario | Expected Status |
|---------------|----------|-----------------|
| 12345678901234 | Normal delivery | DELIVERED |
| 98765432109876 | In transit | Multiple events |
| 11111111111111 | At pickup point | AT_PICKUP_POINT |
| 22222222222222 | Delivery exception | EXCEPTION |

---

## 💰 Pricing

- **API Access**: Free for DPD shipping customers
- **Per Request**: €0.02 - €0.04 (non-customers)
- **Monthly Minimum**: €50 (non-customers)
- **Volume Discounts**: Available for >5,000 calls/month

---

## 📞 Support

### DPD International

- **Website**: https://www.dpd.com
- **API Support**: api-support@dpd.com
- **Documentation**: https://developer.dpd.com

### DPD Netherlands

- **Email**: api@dpd.nl
- **Phone**: +31 (0)88 339 9999
- **Support Hours**: Monday-Friday, 8:00-18:00 CET

---

## ✅ Implementation Checklist

- [ ] Contact DPD for API access
- [ ] Receive OAuth credentials
- [ ] Implement OAuth token management
- [ ] Add credentials to `.env`
- [ ] Create DPD service class
- [ ] Implement status code mapping
- [ ] Add token refresh logic
- [ ] Test with sandbox parcels
- [ ] Implement error handling
- [ ] Set up monitoring
- [ ] Go live with production

---

For complete implementation, see `IMPLEMENTATION_PLAN.md`.
