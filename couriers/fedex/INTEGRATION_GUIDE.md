# FedEx API Integration Guide

Complete guide for integrating FedEx Tracking API - global express delivery.

---

## 📋 Overview

**FedEx** - Leading express delivery company with overnight, ground, and international services.

### Features

- 🌍 220+ countries and territories
- 📍 Real-time GPS tracking
- 🕐 Delivery Manager for customization
- 📦 Picture proof of delivery
- ⏱️ Precise delivery windows
- 🚚 Multi-piece shipment tracking

---

## 🔑 Getting API Access

### Step 1: Create FedEx Developer Account

1. Visit: https://developer.fedex.com
2. Register account
3. Create application

### Step 2: Get Credentials

```
API Key: your_api_key
Secret Key: your_secret_key
Account Number: your_fedex_account
```

### Environment Configuration

```env
FEDEX_API_KEY=your_api_key
FEDEX_SECRET_KEY=your_secret_key
FEDEX_ACCOUNT_NUMBER=your_account
FEDEX_API_URL=https://apis.fedex.com
FEDEX_SANDBOX=false
```

---

## 🔐 Authentication - OAuth 2.0

```bash
curl -X POST "https://apis.fedex.com/oauth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=YOUR_API_KEY&client_secret=YOUR_SECRET_KEY"

# Response:
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

---

## 📡 Track API Endpoint

**Endpoint:**
```
POST /track/v1/trackingnumbers
```

**Request:**
```json
{
  "trackingInfo": [
    {
      "trackingNumberInfo": {
        "trackingNumber": "123456789012"
      }
    }
  ],
  "includeDetailedScans": true
}
```

**Response Example:**
```json
{
  "output": {
    "completeTrackResults": [
      {
        "trackingNumber": "123456789012",
        "trackResults": [
          {
            "trackingNumberInfo": {
              "trackingNumber": "123456789012"
            },
            "latestStatusDetail": {
              "code": "DL",
              "derivedCode": "DL",
              "statusByLocale": "Delivered",
              "description": "Delivered"
            },
            "dateAndTimes": [
              {
                "type": "ACTUAL_DELIVERY",
                "dateTime": "2024-01-16T14:35:00Z"
              },
              {
                "type": "ESTIMATED_DELIVERY",
                "dateTime": "2024-01-16T20:00:00Z"
              }
            ],
            "scanEvents": [
              {
                "date": "2024-01-15T09:00:00Z",
                "eventType": "PU",
                "eventDescription": "Picked up",
                "scanLocation": {
                  "city": "ROTTERDAM",
                  "countryCode": "NL"
                }
              },
              {
                "date": "2024-01-16T14:35:00Z",
                "eventType": "DL",
                "eventDescription": "Delivered",
                "scanLocation": {
                  "city": "AMSTERDAM",
                  "countryCode": "NL"
                }
              }
            ],
            "deliveryDetails": {
              "receivedByName": "J. DE VRIES",
              "signatureProofOfDeliveryAvailable": true
            }
          }
        ]
      }
    ]
  }
}
```

---

## 📊 Status Codes

| Code | Description |
|------|-------------|
| PU | Picked up |
| IT | In transit |
| AR | Arrived at FedEx location |
| OD | Out for delivery |
| DL | Delivered |
| DE | Delivery exception |
| CA | Canceled |

---

## ⚠️ Rate Limits

- **API Calls**: 300 per minute
- **Token**: Valid for 60 minutes
- **Daily**: 100,000 requests

---

## 💰 Pricing

- Free for FedEx shipping customers
- $0.08 per track for non-customers
- Enterprise pricing available

---

## 📞 Support

- **Developer Portal**: https://developer.fedex.com
- **Support**: websupport@fedex.com
- **Phone**: 1-800-GO-FEDEX

---

For complete implementation, see `IMPLEMENTATION_PLAN.md`.
