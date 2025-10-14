# 📦 Shopify Tracking - How It Works

Understanding what Shopify provides vs what courier APIs add.

---

## ✅ What Shopify Provides Automatically (FREE)

### Basic Tracking Data (Always Available)

When you fulfill an order in Shopify with tracking info, Shopify stores:

```javascript
{
  tracking_number: "3SABCD1234567890",
  tracking_company: "PostNL",
  tracking_url: "https://postnl.nl/track?code=3SABCD1234567890"
}
```

### Automatic Status Updates (For Supported Carriers)

For **100+ supported carriers** including PostNL, DHL, and DPD, Shopify automatically updates:

```javascript
{
  shipment_status: "in_transit" | "out_for_delivery" | "delivered" | "failure"
}
```

**How it works:**
1. You fulfill order with tracking number in Shopify
2. Shopify recognizes the carrier (PostNL, DHL, DPD, etc.)
3. Shopify **automatically polls the carrier** periodically
4. `shipment_status` field updates when status changes
5. Shopify sends `fulfillments/update` webhook to your app
6. Your integration receives the update and notifies the customer

### Supported Status Values

```
- confirmed: Fulfillment created
- in_transit: Package is on the way
- out_for_delivery: Package is out for delivery
- attempted_delivery: Delivery was attempted
- delivered: Package delivered successfully
- failure: Delivery failed
```

### Webhooks You Receive

```
POST /webhooks/fulfillments-create
{
  "tracking_number": "3SABCD1234567890",
  "tracking_company": "PostNL",
  "shipment_status": "confirmed"
}

POST /webhooks/fulfillments-update (automatic from Shopify)
{
  "tracking_number": "3SABCD1234567890",
  "tracking_company": "PostNL",
  "shipment_status": "in_transit"  // Updated!
}

POST /webhooks/fulfillments-update (when delivered)
{
  "tracking_number": "3SABCD1234567890",
  "tracking_company": "PostNL",
  "shipment_status": "delivered"  // Updated!
}
```

---

## 🔍 What Courier APIs Add (Optional)

If you connect directly to PostNL/DHL/DPD APIs, you get MORE details:

### Additional Data Available

```javascript
{
  // Basic (already in Shopify)
  tracking_number: "3SABCD1234567890",
  status: "in_transit",

  // EXTRA from Courier API:
  detailed_status: "Package at sorting facility",
  current_location: "Amsterdam Distribution Center",
  last_update_time: "2024-01-15T14:32:00Z",
  estimated_delivery: "2024-01-16T18:00:00Z",

  // Full event history:
  events: [
    {
      timestamp: "2024-01-15T09:00:00Z",
      status: "picked_up",
      location: "Rotterdam",
      description: "Package picked up from sender"
    },
    {
      timestamp: "2024-01-15T12:00:00Z",
      status: "in_transit",
      location: "Utrecht Sorting Center",
      description: "Package arrived at sorting facility"
    },
    {
      timestamp: "2024-01-15T14:32:00Z",
      status: "in_transit",
      location: "Amsterdam Distribution Center",
      description: "Package at distribution center"
    }
  ]
}
```

### What This Means

**Shopify gives you:**
- ✅ Tracking number and URL
- ✅ Basic status (in_transit, delivered, etc.)
- ✅ Automatic updates when status changes
- ✅ Works for 100+ carriers automatically

**Courier APIs add:**
- 📍 Exact location information
- 🕐 Precise timestamps for each event
- 📝 Detailed status descriptions
- 🗺️ Full tracking history
- ⏱️ More frequent updates (real-time vs periodic)

---

## 💰 Cost Comparison

### Shopify Tracking (FREE)
- ✅ No additional cost
- ✅ No setup required
- ✅ Works immediately
- ✅ Covers 100+ carriers
- ⏱️ Updates every few hours

### Courier APIs (PAID)
- 💵 Cost per API call (varies by carrier)
- 🔧 Requires API key setup
- 📊 Need separate contract with each carrier
- ⏱️ Real-time updates

---

## 🎯 Recommendation

### Start Without Courier APIs ✅

**Why:**
1. Shopify tracking is FREE and works automatically
2. Covers PostNL, DHL, DPD out of the box
3. Most customers just want to know: "When will it arrive?" and "Is it delivered?"
4. You can add courier APIs later if needed

**The integration I built works BOTH ways:**
- ✅ Works with just Shopify tracking (no courier APIs)
- ✅ Can add courier APIs later without code changes
- ✅ Automatically uses courier API if keys are provided

### When to Add Courier APIs

Consider adding courier APIs if:

1. 📊 **High-value customers** want detailed tracking
2. 🚨 **Frequent support tickets** about "Where's my package?"
3. 📍 **Location tracking** is a competitive advantage
4. 💼 **B2B customers** need detailed logistics info
5. 📈 **Analytics** on shipping performance needed

---

## 🔄 How the Integration Works

### Without Courier APIs (Recommended Start)

```
Order Fulfilled in Shopify
    ↓
Shopify stores tracking number
    ↓
Shopify polls PostNL/DHL automatically
    ↓
Status changes: in_transit → delivered
    ↓
Shopify sends webhook to your integration
    ↓
Integration creates notification
    ↓
Customer sees "Your package is delivered!" in Beeylo app
```

### With Courier APIs (Optional Enhancement)

```
Order Fulfilled in Shopify
    ↓
Integration receives webhook
    ↓
Integration calls PostNL/DHL API directly
    ↓
Gets detailed location: "Amsterdam Distribution Center"
    ↓
Stores detailed tracking events in database
    ↓
Customer sees "Package at Amsterdam Distribution Center, arriving tomorrow"
```

---

## 📊 Feature Comparison

| Feature | Shopify Only | + Courier APIs |
|---------|-------------|---------------|
| Tracking number | ✅ Yes | ✅ Yes |
| Tracking URL | ✅ Yes | ✅ Yes |
| Basic status | ✅ Yes | ✅ Yes |
| Delivered notification | ✅ Yes | ✅ Yes |
| Exact location | ❌ No | ✅ Yes |
| Event history | ❌ No | ✅ Yes |
| Real-time updates | ⏱️ Periodic | ✅ Real-time |
| Estimated delivery | ❌ No | ✅ Yes |
| Setup required | ✅ None | 🔧 API keys |
| Cost | ✅ Free | 💵 Paid |

---

## 🎬 Real-World Example

### Scenario: Customer orders shoes

**With Shopify Tracking Only:**
1. Order confirmed → "Order confirmed!"
2. Shipped → "Your order is on the way! Track: [link]"
3. Delivered → "Your package has been delivered!"

**What customer sees in Beeylo app:**
```
✅ Order Confirmed
📦 Order Shipped - Track here
✅ Delivered
```

**With Courier APIs Added:**
1. Order confirmed → "Order confirmed!"
2. Picked up → "Package picked up from our warehouse"
3. At sorting center → "Package at Utrecht Sorting Center"
4. Out for delivery → "Package out for delivery in Amsterdam"
5. Delivered → "Delivered to your address at 14:32"

**What customer sees in Beeylo app:**
```
✅ Order Confirmed
📍 Picked up from Rotterdam - 09:00
📍 At Utrecht Sorting Center - 12:00
📍 At Amsterdam Distribution Center - 14:32
🚚 Out for delivery - 08:00 next day
✅ Delivered to your door - 14:32
```

---

## 🤔 FAQ

### Q: Do I need to do anything to enable Shopify tracking?

**A:** No! Just enter the tracking number and select the carrier when fulfilling the order in Shopify. Shopify handles the rest.

### Q: Which carriers does Shopify support?

**A:** 100+ carriers including:
- PostNL (Netherlands)
- DHL (Global)
- DPD (Europe)
- FedEx, UPS, USPS
- And many more: https://help.shopify.com/en/manual/shipping/tracking

### Q: How often does Shopify update tracking status?

**A:** Every few hours. Exact frequency depends on the carrier, but typically 2-6 hours.

### Q: Will my customers get notifications?

**A:** Yes! Your Beeylo integration will send notifications to the app when:
- Order is confirmed
- Order is shipped (with tracking link)
- Delivery status changes
- Order is delivered

### Q: Can I add courier APIs later?

**A:** Yes! The integration supports both. Just add the API keys to `.env` and restart the server.

### Q: Which should I start with?

**A:** Start with Shopify tracking only. Add courier APIs only if you need the extra detail.

---

## ✅ Conclusion

**For 90% of use cases, Shopify's built-in tracking is sufficient.**

- It's free
- It's automatic
- It covers all major carriers
- It provides what customers need most: "When will it arrive?" and "Has it been delivered?"

**Start without courier APIs and add them later if you need more detailed tracking.**

The integration I built is ready for both scenarios! 🚀
