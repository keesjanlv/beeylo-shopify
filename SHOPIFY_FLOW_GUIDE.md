# Shopify Flow Integration Guide - Email Suppression

## Overview

This guide helps **Shopify Plus merchants** set up Shopify Flow workflows to automatically suppress email notifications when customers opt for app delivery.

> **Note**: Shopify Flow is only available for Shopify Plus stores. Non-Plus merchants will need to manually disable order confirmation emails in their store settings or use third-party apps.

## What is Shopify Flow?

Shopify Flow is an automation platform for Shopify Plus that allows you to build custom workflows using triggers, conditions, and actions. We'll use it to:

1. Detect when an order has `Receive_in_Beeylo_App = Yes`
2. Automatically suppress email notifications for that order
3. Let Beeylo handle all customer communications via the app

## Prerequisites

- Shopify Plus subscription
- Beeylo Shopify app installed
- Order confirmation emails currently enabled in store settings
- Access to Shopify admin → Apps → Flow

## Workflow 1: Suppress Order Confirmation Email

This workflow prevents Shopify from sending order confirmation emails when the customer opted for app delivery.

### Setup Instructions

1. **Open Shopify Flow**
   - Go to: Shopify Admin → Apps → Flow
   - Click "Create workflow"

2. **Set Trigger**
   ```
   Trigger: Order created
   ```

3. **Add Condition**
   ```
   Condition: Check if note attribute exists

   IF Order → Note attributes → Contains "Receive_in_Beeylo_App"
   AND Order → Note attributes → Contains "Yes"
   THEN continue
   ```

4. **Add Action**
   ```
   Action: Cancel workflow execution

   Or alternatively:

   Action: Add tag to order
   Tag: "beeylo-app-delivery"

   (This helps you identify orders in admin)
   ```

5. **Add Action (Optional)**
   ```
   Action: Add note to order
   Note: "Customer opted for Beeylo app delivery - email notifications suppressed"
   ```

6. **Save Workflow**
   - Name: "Beeylo App Delivery - Suppress Email"
   - Status: Active

### Visual Flow Diagram

```
┌─────────────────────┐
│   Order Created     │
│     (Trigger)       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Check Attribute    │
│  "Receive_in_       │
│   Beeylo_App"       │
│   = "Yes"           │
└──────────┬──────────┘
           │
           ▼
     ┌────┴────┐
     │  TRUE?  │
     └────┬────┘
          │ Yes
          ▼
┌─────────────────────┐
│   Add Tag:          │
│ "beeylo-app-        │
│   delivery"         │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Add Note to       │
│   Order             │
└─────────────────────┘
```

## Workflow 2: Route to Custom Email Template (Alternative)

Instead of suppressing emails entirely, you can route to a custom email template that directs customers to the Beeylo app.

### Setup Instructions

1. **Create Custom Email Template**
   - Go to: Settings → Notifications
   - Click "Order confirmation"
   - Duplicate template as "Order confirmation (Beeylo app)"
   - Edit template to include:
     ```liquid
     <p>Track your order in the Beeylo app!</p>
     <a href="beeylo://orders/{{ order.order_number }}">Open in Beeylo</a>
     ```

2. **Create Flow Workflow**
   ```
   Trigger: Order created

   Condition: Order → Note attributes → Contains "Receive_in_Beeylo_App" = "Yes"

   Action: Send custom email
   Template: "Order confirmation (Beeylo app)"
   To: {{ order.email }}
   ```

## Workflow 3: Suppress Shipping Notifications

Prevent Shopify from sending shipping notifications for app-delivery customers.

### Setup Instructions

1. **Open Shopify Flow**
   - Create new workflow

2. **Set Trigger**
   ```
   Trigger: Fulfillment created
   ```

3. **Add Condition**
   ```
   Condition: Check order tags

   IF Order → Tags → Contains "beeylo-app-delivery"
   THEN continue
   ```

4. **Add Action**
   ```
   Action: Add tag to fulfillment
   Tag: "no-email-notification"

   OR

   Action: Cancel default notification workflow
   ```

## Workflow 4: Suppress Delivery Notifications

Prevent delivery confirmation emails for app-delivery customers.

### Setup Instructions

```
Trigger: Order fulfilled

Condition: Order → Tags → Contains "beeylo-app-delivery"

Action: Skip delivery notification email
```

## Testing Your Workflows

### Test Scenario 1: App Delivery Order

1. Create a test order with "Receive_in_Beeylo_App = Yes"
2. Verify:
   - ✅ Order tagged with "beeylo-app-delivery"
   - ✅ No email sent to customer
   - ✅ Notification appears in Beeylo app
   - ✅ Push notification sent

### Test Scenario 2: Email Delivery Order

1. Create a test order WITHOUT the checkbox checked
2. Verify:
   - ✅ Order does NOT have "beeylo-app-delivery" tag
   - ✅ Email sent to customer normally
   - ✅ Standard Shopify flow continues

## Monitoring

### Check Workflow Execution

1. Go to: Shopify Admin → Apps → Flow
2. Click your workflow
3. View "Run history" tab
4. Check for:
   - Total runs
   - Successful executions
   - Failed executions
   - Condition matches

### Common Metrics

```
Metric: App Delivery Adoption Rate
Formula: (Orders with tag "beeylo-app-delivery") / (Total orders) * 100

Metric: Email Suppression Success Rate
Formula: (Successful workflow runs) / (Orders with attribute) * 100
```

## Troubleshooting

### Workflow Not Triggering

**Issue**: Flow doesn't run when order is created

**Solutions**:
1. Check workflow status is "Active"
2. Verify trigger is "Order created" (not "Order paid")
3. Check condition syntax - attribute name must match exactly
4. Test with manual trigger using sample order

### Condition Not Matching

**Issue**: Condition doesn't detect the attribute

**Solutions**:
1. Verify attribute format in order:
   ```graphql
   query {
     order(id: "gid://shopify/Order/123") {
       customAttributes {
         key
         value
       }
     }
   }
   ```
2. Check for typos in attribute name
3. Ensure value is exactly "Yes" (case-sensitive)

### Emails Still Being Sent

**Issue**: Customers receive emails despite workflow

**Solutions**:
1. Check email notification settings in Shopify admin
2. Verify workflow executes BEFORE email is sent
3. Use "Add tag" action earlier in workflow
4. Check for other apps that might be sending emails

## Advanced Flow Patterns

### Multi-Language Support

```
Trigger: Order created

Condition: Order → Note attributes → Contains "Receive_in_Beeylo_App" = "Yes"

Branch by Store Language:
  IF Order → Language → "en" → Send English template
  IF Order → Language → "es" → Send Spanish template
  IF Order → Language → "fr" → Send French template
```

### VIP Customer Handling

```
Trigger: Order created

Condition 1: Order → Customer → Tags → Contains "VIP"
Condition 2: Order → Note attributes → Contains "Receive_in_Beeylo_App" = "Yes"

Action: Send notification to sales team
        + Suppress customer email
        + Add VIP tag to order
```

### Order Value Segmentation

```
Trigger: Order created

Condition 1: Order → Total → Greater than $500
Condition 2: Order → Note attributes → Contains "Receive_in_Beeylo_App" = "Yes"

Action: Tag as "high-value-app-delivery"
        + Add to special customer segment
```

## Alternative Solutions for Non-Plus Merchants

If your store doesn't have Shopify Plus, here are alternatives:

### Option 1: Disable Automatic Emails

```
Settings → Notifications → Order confirmation
→ Uncheck "Automatically send order confirmation"
```

**Pros**: Simple, free
**Cons**: Disables emails for ALL customers

### Option 2: Third-Party Apps

Apps that offer conditional email sending:
- Klaviyo (with conditional logic)
- Omnisend (with segmentation)
- Brevo (formerly Sendinblue)

### Option 3: Custom Email Service

Use Beeylo backend to send emails:

```typescript
// notification.service.ts
async sendOrderConfirmation(order: any) {
  if (order.receive_in_app) {
    await this.sendInAppNotification(order);
  } else {
    await this.sendEmailNotification(order);
  }
}

async sendEmailNotification(order: any) {
  // Use your email service (SendGrid, Mailgun, etc.)
  await emailService.send({
    to: order.email,
    template: 'order-confirmation',
    data: order,
  });
}
```

## Best Practices

### 1. Clear Communication

Add a note to your store's FAQ:
> "You can choose to receive order updates in the Beeylo app instead of email. Simply check the box at checkout!"

### 2. Fallback Handling

Always have a fallback in case the app notification fails:

```
IF push notification fails
THEN send email as backup
```

### 3. Order Status Page

Update the order status page template to include Beeylo app link:

```liquid
{% if order.note_attributes contains "Receive_in_Beeylo_App" %}
  <div class="beeylo-banner">
    <h3>Track your order in the Beeylo app</h3>
    <a href="beeylo://orders/{{ order.order_number }}">
      Open in Beeylo
    </a>
  </div>
{% endif %}
```

### 4. Analytics Tracking

Track adoption in Google Analytics:

```javascript
// In beeylo-cart-integration.js
if (checkbox.checked) {
  gtag('event', 'beeylo_app_delivery_selected', {
    'event_category': 'checkout',
    'event_label': 'cart_page'
  });
}
```

## Support

For Shopify Flow questions:
- Shopify Help Center: https://help.shopify.com/en/manual/apps/flow
- Shopify Community: https://community.shopify.com/

For Beeylo integration questions:
- Check Railway logs
- Review webhook events table
- Contact Beeylo support

## Resources

- [Shopify Flow Documentation](https://help.shopify.com/en/manual/apps/flow)
- [Shopify Liquid Documentation](https://shopify.dev/docs/api/liquid)
- [Order Object Reference](https://shopify.dev/docs/api/admin-rest/2025-10/resources/order)
- [Custom Attributes Guide](https://shopify.dev/docs/api/storefront/latest/mutations/cartAttributesUpdate)
