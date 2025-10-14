# UPS API Integration Guide

Complete guide for integrating UPS Tracking API - global logistics leader.

---

## 📋 Overview

**UPS (United Parcel Service)** - One of the world's largest package delivery companies with operations in 220+ countries.

### Features

- 🌍 Global coverage - 220+ countries
- 📍 Real-time tracking with GPS
- 🕐 Quantum View for advance notification
- 📦 Proof of delivery with signature
- ⏱️ My Choice for delivery customization
- 🚚 Multi-package shipment tracking

---

## 🔑 Getting API Access

### Step 1: Create UPS Account

1. Visit: https://www.ups.com/upsdeveloperkit
2. Register for UPS Developer Kit
3. Accept terms and conditions

### Step 2: Get Credentials

After registration:
```
Client ID: your_client_id
Client Secret: your_client_secret
Account Number: your_ups_account_number
```

### Environment Configuration

```env
UPS_CLIENT_ID=your_client_id
UPS_CLIENT_SECRET=your_client_secret
UPS_ACCOUNT_NUMBER=your_account_number
UPS_API_URL=https://onlinetools.ups.com/api
UPS_SANDBOX=false
```

---

## 🔐 Authentication - OAuth 2.0

```bash
# Get access token
curl -X POST "https://onlinetools.ups.com/security/v1/oauth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "x-merchant-id: your_account_number" \
  -d "grant_type=client_credentials&client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET"

# Response:
{
  "access_token": "eyJraWQ...",
  "token_type": "Bearer",
  "expires_in": 14400
}
```

---

## 📡 Track API Endpoint

**Endpoint:**
```
GET /api/track/v1/details/{tracking-number}
```

**Response Example:**
```json
{
  "trackResponse": {
    "shipment": [
      {
        "inquiryNumber": "1Z9999999999999999",
        "package": [
          {
            "trackingNumber": "1Z9999999999999999",
            "deliveryDate": [
              {
                "type": "DEL",
                "date": "20240116"
              }
            ],
            "deliveryTime": {
              "startTime": "090000",
              "endTime": "180000"
            },
            "activity": [
              {
                "location": {
                  "address": {
                    "city": "AMSTERDAM",
                    "stateProvince": "NH",
                    "postalCode": "1234AB",
                    "country": "NL"
                  }
                },
                "status": {
                  "type": "D",
                  "description": "DELIVERED",
                  "code": "FS"
                },
                "date": "20240116",
                "time": "143500"
              },
              {
                "location": {
                  "address": {
                    "city": "UTRECHT",
                    "country": "NL"
                  }
                },
                "status": {
                  "type": "I",
                  "description": "OUT FOR DELIVERY",
                  "code": "OT"
                },
                "date": "20240116",
                "time": "080000"
              }
            ]
          }
        ]
      }
    ]
  }
}
```

---

## 📊 Status Codes

| Code | Type | Description |
|------|------|-------------|
| I | In Transit | Package in transit |
| X | Exception | Delivery exception |
| D | Delivered | Successfully delivered |
| M | Manifest | Package manifest |
| P | Pickup | Picked up |
| OR | Origin | Origin scan |
| FS | Delivered | Final delivery |

---

## ⚠️ Rate Limits

- **Transactions**: 250 per minute
- **Token**: Valid for 4 hours
- **Daily**: 50,000 requests (standard tier)

---

## 💰 Pricing

- Free for UPS shipping customers
- $0.10 per track for non-customers
- Volume discounts available

---

## 📞 Support

- **Developer Portal**: https://developer.ups.com
- **Support Email**: developersupport@ups.com
- **Phone**: 1-800-PICK-UPS

---

For complete implementation, see `IMPLEMENTATION_PLAN.md`.
