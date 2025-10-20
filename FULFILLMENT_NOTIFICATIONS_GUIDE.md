# Fulfillment Notifications Guide - Beeylo App Delivery

## Overview

When customers opt to receive order updates through the Beeylo app (by checking the cart page checkbox), this guide explains how email notifications are handled.

## How It Works

### Order Confirmation Emails ✉️
**Status:** **CANNOT** be suppressed

- Shopify **requires** order confirmation emails to be sent
- These are sent automatically by Shopify when an order is created
- Your app cannot disable these emails
- This is by design to ensure customers always have proof of purchase

### Shipping & Fulfillment Notifications ✉️
**Status:** **CAN** be suppressed

- Shipping confirmation emails **can** be suppressed
- Fulfillment update emails **can** be suppressed
- Delivery notification emails **can** be suppressed

## Automated Beeylo Integration

When a customer checks "Receive order updates in the Beeylo app", the following happens automatically:

### 1. Order Tagging
✅ **Automatic** - Your Beeylo app handles this

When an order is created with `Receive_in_Beeylo_App = Yes`:
- The order is automatically tagged with `"beeylo-app-delivery"`
- This tag is visible in Shopify admin under the order
- This tag is used to identify orders that should skip email notifications

### 2. In-App Notifications
✅ **Automatic** - Your Beeylo app handles this

- Order confirmation → Beeylo app notification
- Shipping updates → Beeylo app notification
- Delivery updates → Beeylo app notification
- All tracking information → Available in Beeylo app

## Suppressing Shopify Email Notifications

To prevent Shopify from sending shipping/fulfillment emails to customers who opted for Beeylo app delivery, you have 3 options:

---

## Option 1: Manual Fulfillment with notify_customer=false (Recommended)

### When Creating Fulfillments via API

When your fulfillment service or app creates fulfillments, set `notify_customer: false`:

#### REST API Example:
```bash
POST /admin/api/2025-10/fulfillments.json
{
  "fulfillment": {
    "message": "The package was shipped this morning.",
    "notify_customer": false,  # ← THIS IS KEY
    "tracking_info": {
      "company": "UPS",
      "number": "1Z001985YW99744790"
    },
    "line_items_by_fulfillment_order": [
      {
        "fulfillment_order_id": 1046000813
      }
    ]
  }
}
```

#### GraphQL Example:
```graphql
mutation fulfillmentCreate($fulfillment: FulfillmentV2Input!) {
  fulfillmentCreateV2(fulfillment: $fulfillment) {
    fulfillment {
      id
      status
    }
    userErrors {
      field
      message
    }
  }
}

# Variables:
{
  "fulfillment": {
    "notifyCustomer": false,  # ← THIS IS KEY
    "trackingInfo": {
      "company": "UPS",
      "number": "1Z001985YW99744790"
    },
    "lineItemsByFulfillmentOrder": [
      {
        "fulfillmentOrderId": "gid://shopify/FulfillmentOrder/123"
      }
    ]
  }
}
```

### When to Check for Beeylo App Delivery

Before creating a fulfillment, check if the order has the `beeylo-app-delivery` tag:

```typescript
// Pseudocode
const order = await shopify.fetchOrder(orderId);

if (order.tags.includes('beeylo-app-delivery')) {
  // Create fulfillment with notify_customer: false
  await shopify.createFulfillment({
    ...fulfillmentData,
    notify_customer: false
  });
} else {
  // Normal fulfillment with customer notification
  await shopify.createFulfillment({
    ...fulfillmentData,
    notify_customer: true
  });
}
```

---

## Option 2: Shopify Flow (All Plans)

Shopify Flow is now available on **all Shopify plans**, not just Plus!

### Create a Workflow to Suppress Notifications

1. **Open Shopify Flow**
   - Go to: Shopify Admin → Apps → Flow
   - Click "Create workflow"

2. **Set Trigger**
   ```
   Trigger: Fulfillment created
   ```

3. **Add Condition**
   ```
   Condition: Check if order has tag

   IF Order → Tags → Contains "beeylo-app-delivery"
   THEN continue
   ```

4. **Add Action**
   ```
   Action: [This is where you'd typically suppress the notification,
           but Shopify Flow has limitations here]

   Alternative: Add a note to the order
   Note: "Beeylo app delivery - customer notified via app"
   ```

### ⚠️ Limitation

Shopify Flow **cannot directly** suppress fulfillment notifications that have already been triggered. You need to use Option 1 (API with `notify_customer: false`) or Option 3 (merchant settings).

### What Flow CAN Do

✅ Identify Beeylo app delivery orders
✅ Add internal notes for merchant reference
✅ Trigger custom notifications
✅ Tag fulfillments for reporting

---

## Option 3: Merchant Store Settings (Manual)

### For ALL Orders (Not Recommended)

Merchants can disable **all** fulfillment emails in their store settings:

1. Go to: Settings → Notifications
2. Find "Shipping confirmation"
3. Uncheck "Automatically send shipping confirmation"

**Cons:**
- ❌ Disables emails for ALL customers (even those who didn't opt for Beeylo)
- ❌ Not selective
- ❌ Requires manual re-enabling

### For Specific Customers (Manual Process)

When manually creating a fulfillment in Shopify admin:

1. Go to Orders → Select order with `beeylo-app-delivery` tag
2. Click "Fulfill items"
3. **Uncheck** "Notify customer of shipment"
4. Click "Fulfill"

**Cons:**
- ❌ Manual process
- ❌ Easy to forget
- ❌ Not scalable

---

## Recommended Setup

### For Your Integration

**Use Option 1:** Always set `notify_customer: false` when creating fulfillments for orders tagged with `beeylo-app-delivery`.

```typescript
// In your fulfillment service
import { shopifyHelpers } from './lib/shopify';

async function createFulfillment(orderId: string, trackingInfo: any) {
  // Fetch the order
  const order = await shopifyHelpers.fetchOrder(shop, accessToken, orderId);

  // Check if order uses Beeylo app delivery
  const useBeeyloApp = order.order.tags?.includes('beeylo-app-delivery');

  // Create fulfillment with appropriate notification setting
  const fulfillment = await shopify.rest.Fulfillment.create({
    session: session,
    order_id: orderId,
    notify_customer: !useBeeyloApp,  // false if Beeylo, true otherwise
    tracking_info: trackingInfo,
    line_items_by_fulfillment_order: fulfillmentOrders
  });

  if (useBeeyloApp) {
    console.log(`✅ Fulfillment created without email notification - using Beeylo app delivery`);
  }

  return fulfillment;
}
```

### For Merchants

**Educate merchants** to:
1. Use your integration for automated fulfillments (Option 1)
2. When manually fulfilling, check for `beeylo-app-delivery` tag
3. Uncheck "Notify customer" when fulfilling tagged orders

---

## Testing Your Setup

### Test Scenario 1: Beeylo App Delivery

1. Create test order with checkbox checked
2. Verify order has `beeylo-app-delivery` tag
3. Create fulfillment with tracking
4. Verify:
   - ✅ No email sent to customer
   - ✅ Notification appears in Beeylo app
   - ✅ Tracking info available in Beeylo app

### Test Scenario 2: Regular Email Delivery

1. Create test order WITHOUT checkbox checked
2. Verify order does NOT have `beeylo-app-delivery` tag
3. Create fulfillment with tracking
4. Verify:
   - ✅ Email sent to customer
   - ✅ Standard Shopify flow continues

---

## FAQs

### Q: Can we suppress order confirmation emails?
**A:** No. Shopify requires these to be sent for customer protection and proof of purchase.

### Q: What if a customer changes their mind?
**A:** Customers will still receive order confirmations via email. If they need shipping updates, they can contact support or check the Shopify order status page.

### Q: Does this work for all Shopify plans?
**A:** Yes! The `notify_customer: false` parameter works on all plans. Shopify Flow is also now available on all plans.

### Q: What about delivery notifications?
**A:** Same approach - set `notify_customer: false` when updating tracking info:

```typescript
await shopify.fulfillmentTrackingInfoUpdate({
  fulfillmentId: "gid://shopify/Fulfillment/123",
  notifyCustomer: false,  // ← Suppresses delivery notification
  trackingInfoInput: {
    company: "UPS",
    number: "1Z001985YW99744790"
  }
});
```

### Q: How do I know if it's working?
**A:** Check these indicators:
- ✅ Order has `beeylo-app-delivery` tag in Shopify admin
- ✅ Customer receives order confirmation email (mandatory)
- ❌ Customer does NOT receive shipping confirmation email
- ❌ Customer does NOT receive delivery notification email
- ✅ Customer sees all updates in Beeylo app

---

## Summary

| Notification Type | Can Suppress? | Method |
|------------------|---------------|--------|
| Order Confirmation | ❌ No | N/A - Mandatory |
| Shipping Confirmation | ✅ Yes | `notify_customer: false` |
| Fulfillment Updates | ✅ Yes | `notify_customer: false` |
| Delivery Notification | ✅ Yes | `notify_customer: false` |

**Key Takeaway:** You cannot suppress order confirmation emails (Shopify policy), but you CAN suppress all shipping/fulfillment notifications by using `notify_customer: false` when creating or updating fulfillments.

---

## Support

For issues or questions:
- Check your webhook logs for order tagging
- Verify `receive_in_app` flag in database
- Test with Shopify's fulfillment API
- Review Shopify Flow execution history

**Official Documentation:**
- [Shopify Fulfillment API](https://shopify.dev/docs/api/admin-rest/latest/resources/fulfillment)
- [GraphQL Fulfillment Mutations](https://shopify.dev/docs/api/admin-graphql/latest/mutations/fulfillmentCreate)
- [Shopify Flow](https://help.shopify.com/en/manual/apps/flow)
