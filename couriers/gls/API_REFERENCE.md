# GLS API Reference

Detailed API reference for GLS MyGLS API and Track & Trace services.

---

## 📋 Table of Contents

1. [Authentication](#authentication)
2. [Base URLs](#base-urls)
3. [Common Headers](#common-headers)
4. [Endpoints](#endpoints)
5. [Data Models](#data-models)
6. [Status Codes](#status-codes)
7. [Error Codes](#error-codes)
8. [Rate Limiting](#rate-limiting)

---

## 🔐 Authentication

### HTTP Basic Authentication

All API requests require HTTP Basic Authentication.

**Format:**
```
Authorization: Basic {base64(username:password)}
```

**Example:**
```typescript
const username = 'your_username';
const password = 'your_password';
const credentials = Buffer.from(`${username}:${password}`).toString('base64');
const authHeader = `Basic ${credentials}`;
```

**Curl Example:**
```bash
curl -X POST "https://api.mygls.hu/ParcelService.svc/json/GetParcelStatuses" \
  -u "username:password" \
  -H "Content-Type: application/json" \
  -d '{"ParcelNumber": "35000001406746"}'
```

---

## 🌐 Base URLs

### Production
```
MyGLS API: https://api.mygls.hu
GLS Netherlands: https://api-portal.gls.nl
```

### Test/Sandbox
```
MyGLS Test API: https://api.test.mygls.hu
```

---

## 📨 Common Headers

### Required Headers

| Header | Value | Description |
|--------|-------|-------------|
| `Authorization` | `Basic {credentials}` | Authentication credentials |
| `Content-Type` | `application/json` | Request body format |
| `Accept` | `application/json` | Response format |

### Optional Headers

| Header | Value | Description |
|--------|-------|-------------|
| `Accept-Language` | `en`, `nl`, `de`, etc. | Response language |
| `User-Agent` | `Beeylo/1.0` | Client identification |

---

## 📡 Endpoints

### 1. Get Parcel Status (Single)

Get tracking information for a single parcel.

**Endpoint:**
```
POST /ParcelService.svc/json/GetParcelStatuses
```

**Request:**
```typescript
interface GetParcelStatusRequest {
  ParcelNumber: string;
}
```

**Example:**
```json
{
  "ParcelNumber": "35000001406746"
}
```

**Response:**
```typescript
interface GetParcelStatusResponse {
  ParcelStatusList: ParcelStatus[];
}
```

**Success Response (200):**
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
        }
      ],
      "PODInfo": {
        "SignatureAvailable": true,
        "SignatureUrl": "https://gls-group.com/signature/12345",
        "ReceiverName": "J. de Vries",
        "DeliveryDate": "2024-01-16T15:45:00"
      },
      "DeliveryInfo": {
        "EstimatedDeliveryDate": "2024-01-16",
        "ActualDeliveryDate": "2024-01-16"
      }
    }
  ]
}
```

**Error Response (404):**
```json
{
  "ErrorCode": "PARCEL_NOT_FOUND",
  "ErrorMessage": "Parcel number not found",
  "StatusCode": 404
}
```

---

### 2. Get Parcel Statuses by Date

Get tracking information for multiple parcels within a date range.

**Endpoint:**
```
POST /ParcelService.svc/json/GetParcelStatusesByDate
```

**Request:**
```typescript
interface GetParcelStatusesByDateRequest {
  DateFrom: string; // ISO 8601 format
  DateTo: string;   // ISO 8601 format
  ParcelNumbers?: string[]; // Optional filter
}
```

**Example:**
```json
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

**Response:** Same as Get Parcel Status, but with multiple parcels in `ParcelStatusList`.

**Rate Limit:** Limited to 50 parcels per request.

---

### 3. Track & Trace API (GLS Netherlands)

Alternative endpoint for GLS Netherlands customers.

**Endpoint:**
```
POST /api/parcel/v1/details
```

**Request:**
```typescript
interface GLSNLTrackingRequest {
  username: string;
  password: string;
  parcelNumbers: string[];
}
```

**Example:**
```json
{
  "username": "your_username",
  "password": "your_password",
  "parcelNumbers": ["35000001406746"]
}
```

**Response:**
```json
{
  "parcels": [
    {
      "parcelNumber": "35000001406746",
      "status": "DELIVERED",
      "statusDescription": "Parcel has been delivered",
      "events": [
        {
          "timestamp": "2024-01-16T15:45:00+01:00",
          "code": "DELIVERED",
          "description": "Delivered to recipient",
          "location": "Amsterdam"
        }
      ]
    }
  ]
}
```

---

### 4. Get POD (Proof of Delivery)

Get proof of delivery document with signature.

**Endpoint:**
```
GET /ParcelService.svc/json/GetPOD?parcelNumber={parcelNumber}
```

**Request Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `parcelNumber` | string | Yes | Parcel tracking number |

**Response:**
```json
{
  "ParcelNumber": "35000001406746",
  "POD": {
    "Available": true,
    "DeliveryDate": "2024-01-16T15:45:00",
    "ReceiverName": "J. de Vries",
    "SignatureUrl": "https://gls-group.com/signature/12345.pdf",
    "SignatureImageBase64": "iVBORw0KGgoAAAANS...",
    "PhotoUrl": null
  }
}
```

---

### 5. Webhook Registration

Register a webhook endpoint to receive real-time tracking updates.

**Note:** This is typically configured by GLS support, not via API.

**Contact GLS Support to configure:**
- Webhook URL: `https://your-domain.com/api/webhooks/gls`
- Events to subscribe: `ALL` or specific codes
- Authentication method: API key or signature

**Webhook Payload:**
```json
{
  "EventType": "TRACKING_UPDATE",
  "ParcelNumber": "35000001406746",
  "StatusCode": "DELIVERED",
  "StatusDate": "2024-01-16T15:45:00Z",
  "Location": "Amsterdam",
  "Description": "Successfully delivered",
  "ReceiverName": "J. de Vries",
  "Timestamp": "2024-01-16T15:45:10Z"
}
```

---

## 📊 Data Models

### ParcelStatus

```typescript
interface ParcelStatus {
  ParcelNumber: string;
  StatusInfo: StatusInfo;
  DepotInfo?: DepotInfo;
  Events: Event[];
  PODInfo?: PODInfo;
  DeliveryInfo: DeliveryInfo;
  ServiceInfo?: ServiceInfo;
}
```

### StatusInfo

```typescript
interface StatusInfo {
  StatusCode: string;      // Current status code
  StatusText: string;      // Human-readable status
  StatusDate: string;      // ISO 8601 timestamp
}
```

### DepotInfo

```typescript
interface DepotInfo {
  DepotNumber: string;     // Depot identifier
  DepotName: string;       // Depot name
  DepotAddress: string;    // Full depot address
  ContactPhone?: string;   // Depot phone number
  ContactEmail?: string;   // Depot email
}
```

### Event

```typescript
interface Event {
  Code: string;            // Event status code
  Date: string;            // ISO 8601 timestamp
  Location: string;        // City or depot name
  Description: string;     // Event description
  ReceiverName?: string;   // Only for delivery events
}
```

### PODInfo

```typescript
interface PODInfo {
  SignatureAvailable: boolean;
  SignatureUrl?: string;        // URL to signature image
  PhotoUrl?: string;            // URL to delivery photo
  ReceiverName?: string;        // Name of person who received
  DeliveryDate?: string;        // ISO 8601 timestamp
  DeliveryNote?: string;        // Additional notes
}
```

### DeliveryInfo

```typescript
interface DeliveryInfo {
  EstimatedDeliveryDate?: string;  // ISO 8601 date
  ActualDeliveryDate?: string;     // ISO 8601 date
  TimeSlot?: string;               // e.g., "14:00-18:00"
  DeliveryType?: string;           // HOME, PARCELSHOP, etc.
}
```

### ServiceInfo

```typescript
interface ServiceInfo {
  ServiceCode: string;          // e.g., BUSINESS_PARCEL
  ServiceName: string;          // Service description
  Weight?: number;              // In grams
  Dimensions?: {
    Length: number;             // In cm
    Width: number;
    Height: number;
  };
}
```

---

## 🏷️ Status Codes

### Primary Status Codes

| Code | Description | Phase | Customer-Facing |
|------|-------------|-------|-----------------|
| `PREADVICE` | Information received | Pre-transit | "Your parcel has been registered" |
| `COLLECTED` | Picked up from sender | Collection | "Parcel collected from sender" |
| `IN_TRANSIT` | In transit | Transport | "Your parcel is on its way" |
| `AT_DEPOT` | At delivery depot | Depot | "Parcel at delivery depot" |
| `AT_HUB` | At sorting hub | Sorting | "Processing at GLS facility" |
| `OUT_FOR_DELIVERY` | Out for delivery | Delivery | "Out for delivery today" |
| `DELIVERED` | Successfully delivered | Complete | "Delivered successfully" |
| `DELIVERY_FAILED` | Delivery attempt failed | Exception | "Delivery attempt unsuccessful" |
| `AWAITING_COLLECTION` | Ready for pickup | Pickup | "Ready for collection" |
| `COLLECTED_BY_RECIPIENT` | Picked up by recipient | Complete | "Collected from ParcelShop" |
| `RETURNED` | Returned to sender | Return | "Parcel returned to sender" |
| `CANCELLED` | Shipment cancelled | Cancelled | "Shipment cancelled" |
| `EXCEPTION` | Delivery exception | Problem | "Delivery issue occurred" |
| `DAMAGED` | Parcel damaged | Problem | "Parcel damage reported" |
| `LOST` | Parcel lost | Problem | "Parcel is being investigated" |

### Event Codes (Detailed)

| Code | Description | Typical Location |
|------|-------------|------------------|
| `COLLECTED` | Collected from sender | Pickup location |
| `RECEIVED_AT_DEPOT` | Received at depot | Local depot |
| `DEPARTED_DEPOT` | Left depot | Local depot |
| `ARRIVED_AT_HUB` | Arrived at hub | Sorting hub |
| `DEPARTED_HUB` | Left sorting hub | Sorting hub |
| `IN_TRANSIT_TO_DEPOT` | On way to delivery depot | In vehicle |
| `ARRIVED_AT_DELIVERY_DEPOT` | At delivery depot | Delivery depot |
| `LOADED_FOR_DELIVERY` | Loaded on delivery vehicle | Delivery depot |
| `OUT_FOR_DELIVERY` | Out for delivery | In delivery |
| `DELIVERY_ATTEMPTED` | Delivery attempt made | Delivery address |
| `DELIVERED` | Successfully delivered | Delivery address |
| `DELIVERY_TO_NEIGHBOR` | Delivered to neighbor | Neighbor address |
| `DELIVERY_TO_PARCELSHOP` | Delivered to ParcelShop | ParcelShop |
| `AWAITING_COLLECTION` | Ready for pickup | ParcelShop |
| `RETURN_REQUESTED` | Return initiated | Various |
| `RETURN_IN_TRANSIT` | Being returned | In transit |
| `RETURNED_TO_SENDER` | Returned | Return address |

---

## ❌ Error Codes

### HTTP Status Codes

| Status | Meaning | Description |
|--------|---------|-------------|
| `200` | OK | Request successful |
| `400` | Bad Request | Invalid request format |
| `401` | Unauthorized | Invalid credentials |
| `403` | Forbidden | Access denied |
| `404` | Not Found | Parcel not found |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | GLS server error |
| `503` | Service Unavailable | Service temporarily down |

### Application Error Codes

| Error Code | Description | Resolution |
|------------|-------------|------------|
| `PARCEL_NOT_FOUND` | Parcel number not in system | Wait or verify tracking number |
| `INVALID_PARCEL_NUMBER` | Invalid tracking number format | Check tracking number format |
| `INVALID_DATE_RANGE` | Invalid date range | Check date format (ISO 8601) |
| `AUTHENTICATION_FAILED` | Invalid credentials | Verify username/password |
| `RATE_LIMIT_EXCEEDED` | Too many requests | Implement rate limiting |
| `SERVICE_UNAVAILABLE` | API temporarily unavailable | Retry later |
| `INVALID_REQUEST` | Malformed request | Check request format |
| `UNAUTHORIZED_ACCESS` | No access to parcel data | Verify parcel belongs to account |

### Error Response Format

```typescript
interface ErrorResponse {
  ErrorCode: string;
  ErrorMessage: string;
  StatusCode: number;
  Timestamp?: string;
  Details?: string;
}
```

**Example:**
```json
{
  "ErrorCode": "PARCEL_NOT_FOUND",
  "ErrorMessage": "The parcel number 35000001406746 was not found in our system",
  "StatusCode": 404,
  "Timestamp": "2024-01-16T10:00:00Z",
  "Details": "Parcel may not be scanned yet or tracking number is incorrect"
}
```

---

## ⚠️ Rate Limiting

### Rate Limit Headers

GLS may include rate limit information in response headers:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1642334400
```

### Rate Limits by Endpoint

| Endpoint | Limit | Window |
|----------|-------|--------|
| `GetParcelStatuses` | 60 | Per minute |
| `GetParcelStatusesByDate` | 30 | Per minute |
| `GetPOD` | 30 | Per minute |
| All endpoints combined | 1000 | Per hour |

### Rate Limit Response

When rate limit is exceeded:

```json
{
  "ErrorCode": "RATE_LIMIT_EXCEEDED",
  "ErrorMessage": "Rate limit exceeded. Try again in 45 seconds",
  "StatusCode": 429,
  "RetryAfter": 45
}
```

---

## 📝 Request Examples

### Example 1: Track Single Parcel

```bash
curl -X POST "https://api.mygls.hu/ParcelService.svc/json/GetParcelStatuses" \
  -H "Authorization: Basic dXNlcm5hbWU6cGFzc3dvcmQ=" \
  -H "Content-Type: application/json" \
  -d '{
    "ParcelNumber": "35000001406746"
  }'
```

### Example 2: Track Multiple Parcels by Date

```bash
curl -X POST "https://api.mygls.hu/ParcelService.svc/json/GetParcelStatusesByDate" \
  -H "Authorization: Basic dXNlcm5hbWU6cGFzc3dvcmQ=" \
  -H "Content-Type: application/json" \
  -d '{
    "DateFrom": "2024-01-15T00:00:00",
    "DateTo": "2024-01-16T23:59:59",
    "ParcelNumbers": [
      "35000001406746",
      "35000001406747"
    ]
  }'
```

### Example 3: TypeScript Implementation

```typescript
import axios from 'axios';

class GLSAPIClient {
  private baseUrl: string;
  private authHeader: string;

  constructor(username: string, password: string, testMode = false) {
    this.baseUrl = testMode
      ? 'https://api.test.mygls.hu'
      : 'https://api.mygls.hu';

    const credentials = Buffer.from(`${username}:${password}`).toString('base64');
    this.authHeader = `Basic ${credentials}`;
  }

  async getParcelStatus(parcelNumber: string): Promise<ParcelStatus> {
    const response = await axios.post(
      `${this.baseUrl}/ParcelService.svc/json/GetParcelStatuses`,
      { ParcelNumber: parcelNumber },
      {
        headers: {
          'Authorization': this.authHeader,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      }
    );

    return response.data.ParcelStatusList[0];
  }

  async getParcelStatusesByDate(
    dateFrom: Date,
    dateTo: Date,
    parcelNumbers?: string[]
  ): Promise<ParcelStatus[]> {
    const response = await axios.post(
      `${this.baseUrl}/ParcelService.svc/json/GetParcelStatusesByDate`,
      {
        DateFrom: dateFrom.toISOString(),
        DateTo: dateTo.toISOString(),
        ParcelNumbers: parcelNumbers,
      },
      {
        headers: {
          'Authorization': this.authHeader,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      }
    );

    return response.data.ParcelStatusList;
  }
}

// Usage
const client = new GLSAPIClient('username', 'password');
const status = await client.getParcelStatus('35000001406746');
console.log(status);
```

---

## 🔄 Response Caching

### Recommended Caching Strategy

```typescript
interface CachedResponse {
  data: ParcelStatus;
  timestamp: number;
  ttl: number;
}

class GLSAPIClientWithCache {
  private cache = new Map<string, CachedResponse>();

  async getParcelStatus(parcelNumber: string): Promise<ParcelStatus> {
    const cached = this.cache.get(parcelNumber);

    // Check if cached and not expired
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }

    // Fetch from API
    const data = await this.fetchFromAPI(parcelNumber);

    // Determine TTL based on status
    let ttl: number;
    switch (data.StatusInfo.StatusCode) {
      case 'DELIVERED':
        ttl = 24 * 60 * 60 * 1000; // 24 hours
        break;
      case 'OUT_FOR_DELIVERY':
        ttl = 5 * 60 * 1000; // 5 minutes
        break;
      default:
        ttl = 10 * 60 * 1000; // 10 minutes
    }

    // Cache response
    this.cache.set(parcelNumber, {
      data,
      timestamp: Date.now(),
      ttl,
    });

    return data;
  }
}
```

---

## 📚 Additional Resources

- **GLS Group Website**: https://gls-group.com
- **Developer Portal**: https://dev-portal.gls-group.net
- **Netherlands API Portal**: https://api-portal.gls.nl
- **Support Email**: api-support@gls-group.com

---

For implementation guidance, see `IMPLEMENTATION_PLAN.md`.
For testing scenarios, see `TESTING.md`.
