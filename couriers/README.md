# Courier API Integrations

This folder contains documentation and implementation guides for direct courier API integrations to provide the most detailed tracking information possible.

---

## 🎯 Purpose

While Shopify provides basic tracking updates for 100+ carriers, direct courier API integrations offer:

- 📍 **Exact location tracking** - Know precisely where the package is
- 🕐 **Real-time updates** - Updates within minutes, not hours
- 📊 **Complete event history** - Every scan and movement
- 📝 **Detailed descriptions** - More context than basic status
- 🎯 **Better customer experience** - More transparency and confidence

---

## 📦 Priority System

### How Tracking Data is Prioritized:

1. **Courier API (Highest Priority)** - If API key is configured
   - Direct API calls to courier
   - Real-time, detailed tracking
   - Used for all tracking updates

2. **Shopify Updates (Fallback)** - If no courier API
   - Shopify's automatic carrier polling
   - Basic status updates
   - Good enough for most cases

### Implementation Logic:

```typescript
// When fulfillment is created/updated:
if (courierApiKeyExists) {
  // Use direct courier API
  trackingData = await fetchFromCourierAPI(trackingNumber);
  // Store detailed events in database
} else {
  // Use Shopify's data
  trackingData = fulfillment.shipment_status; // Basic status only
}
```

**✅ Confirmed:** The system automatically uses courier APIs when available, providing the best possible tracking experience.

---

## 🚚 Supported Couriers

Each courier has its own folder with complete integration documentation:

### European Couriers (Primary)
- **[PostNL](./postnl/)** - Netherlands national postal service
- **[DHL](./dhl/)** - International courier (Express & eCommerce)
- **[DPD](./dpd/)** - European parcel delivery network
- **[GLS](./gls/)** - General Logistics Systems (42 European countries)

### International Couriers
- **[UPS](./ups/)** - United Parcel Service
- **[FedEx](./fedex/)** - Federal Express

---

## 📋 Integration Status

| Courier | Status | Priority | Documentation | Implementation |
|---------|--------|----------|---------------|----------------|
| PostNL | 🟢 Implemented | High | ✅ Complete | ✅ Service code ready |
| DHL | 🟢 Implemented | High | ✅ Complete | ✅ Service code ready |
| DPD | 🟢 Implemented | High | ✅ Complete | ✅ Service code ready |
| GLS | 🟢 Implemented | High | ✅ Complete | ✅ Service code ready |
| UPS | 🟢 Implemented | Medium | ✅ Complete | ✅ Service code ready |
| FedEx | 🟢 Implemented | Medium | ✅ Complete | ✅ Service code ready |

**Legend:**
- 🟢 Implemented - Service code complete, ready for API keys
- 🟡 Documented - Documentation complete, ready for implementation
- 🔴 Planned - On roadmap

**Note:** All courier services are now implemented! Just add API credentials to start using them.

---

## 📚 What Each Courier Folder Contains

Each courier integration folder includes:

1. **`INTEGRATION_GUIDE.md`** - Complete API integration guide
   - API credentials setup
   - Authentication methods
   - Endpoint documentation
   - Request/response formats
   - Rate limits and restrictions

2. **`API_REFERENCE.md`** - Detailed API reference
   - All available endpoints
   - Request parameters
   - Response schemas
   - Error codes
   - Code examples

3. **`IMPLEMENTATION_PLAN.md`** - Step-by-step implementation
   - Code structure
   - Database changes needed
   - Testing strategy
   - Deployment checklist

4. **`TESTING.md`** - Testing documentation
   - Test tracking numbers
   - Sandbox environment setup
   - Test scenarios
   - Expected responses

---

## 🔧 How to Add a New Courier

1. **Create folder** - `couriers/[courier-name]/`
2. **Research API** - Get API documentation from courier
3. **Document integration** - Follow template from existing couriers
4. **Implement service** - Add to `src/services/tracking.service.ts`
5. **Add configuration** - Update `src/config/index.ts`
6. **Test thoroughly** - Use test tracking numbers
7. **Update documentation** - Add to this README

---

## 💰 Cost Considerations

### API Call Costs (Approximate)

| Courier | Pricing Model | Estimated Cost |
|---------|--------------|----------------|
| PostNL | Per API call | €0.01 - €0.05 per call |
| DHL | Subscription + calls | €50/month + per call |
| DPD | Contract basis | Varies by volume |
| UPS | Per tracking | $0.05 - $0.10 per track |
| FedEx | Per tracking | $0.05 - $0.10 per track |

**Note:** Costs vary based on:
- Contract negotiation
- Monthly volume
- Account type (business vs partner)
- Additional features needed

### Cost Optimization Strategies

1. **Cache tracking data** - Store recent checks, don't call API repeatedly
2. **Smart polling** - Check less frequently for delivered packages
3. **Batch requests** - Use batch endpoints where available
4. **Monitor usage** - Track API calls to avoid overage charges

---

## 🔐 Security Best Practices

### API Key Management

```env
# Store in environment variables, NEVER commit to git
POSTNL_API_KEY=your_key_here
DHL_API_KEY=your_key_here
DPD_API_KEY=your_key_here
```

### Rate Limiting

```typescript
// Implement rate limiting per courier
const rateLimits = {
  postnl: { requests: 100, per: 'minute' },
  dhl: { requests: 250, per: 'minute' },
  dpd: { requests: 60, per: 'minute' },
};
```

### Error Handling

```typescript
// Graceful fallback to Shopify data if API fails
try {
  trackingData = await fetchFromCourierAPI(trackingNumber);
} catch (error) {
  console.error('Courier API failed, using Shopify data');
  trackingData = shopifyTrackingData; // Fallback
}
```

---

## 📊 Tracking Data Comparison

### Shopify Basic Tracking
```json
{
  "tracking_number": "3SABCD1234567890",
  "tracking_company": "PostNL",
  "tracking_url": "https://...",
  "shipment_status": "in_transit"
}
```

### Courier API Detailed Tracking
```json
{
  "tracking_number": "3SABCD1234567890",
  "status": "in_transit",
  "current_location": "Amsterdam Distribution Center",
  "estimated_delivery": "2024-01-16T18:00:00Z",
  "events": [
    {
      "timestamp": "2024-01-15T09:00:00Z",
      "status": "picked_up",
      "location": "Rotterdam Warehouse",
      "description": "Package picked up from sender"
    },
    {
      "timestamp": "2024-01-15T12:00:00Z",
      "status": "in_transit",
      "location": "Utrecht Sorting Center",
      "description": "Package arrived at sorting facility"
    },
    {
      "timestamp": "2024-01-15T14:32:00Z",
      "status": "in_transit",
      "location": "Amsterdam Distribution Center",
      "description": "Package at distribution center"
    }
  ]
}
```

**Difference:**
- Shopify: 1 data point (current status)
- Courier API: Full journey with 3+ detailed events

---

## 🎯 Implementation Priority

### Phase 1: Core European Carriers (Recommended)
Focus on these first as they cover 80%+ of European e-commerce:
1. ✅ **PostNL** - Netherlands
2. ✅ **DHL** - International
3. ✅ **DPD** - Europe-wide

### Phase 2: International Expansion
Add based on customer demand:
4. **UPS** - Global
5. **FedEx** - Global

### Phase 3: Additional Carriers
Add as needed for specific markets

---

## 📞 Getting API Access

### General Process

1. **Contact courier** - Reach out to business/developer team
2. **Provide business info** - Company details, volume estimates
3. **Sign agreement** - API terms and conditions
4. **Get credentials** - API key, client ID, secret
5. **Access sandbox** - Test environment for development
6. **Go live** - Production API access

### Expected Timeline

- **PostNL**: 2-4 weeks
- **DHL**: 1-2 weeks (if existing DHL customer)
- **DPD**: 2-3 weeks
- **UPS/FedEx**: 1-2 weeks (faster for existing customers)

---

## 🧪 Testing Strategy

### Test Environments

All major couriers provide sandbox/test environments:
- Test tracking numbers
- Simulated tracking events
- No real shipments needed

### Test Scenarios

1. **Happy path** - Package delivered successfully
2. **Delayed delivery** - Estimated date changes
3. **Failed delivery** - Delivery attempted but failed
4. **Return to sender** - Package returned
5. **Lost package** - No updates for extended period

---

## 📈 Monitoring & Analytics

### Key Metrics to Track

1. **API Success Rate** - % of successful API calls
2. **Response Time** - Average API response time
3. **Update Frequency** - How often status changes
4. **Delivery Accuracy** - Estimated vs actual delivery
5. **Error Rate** - API failures per courier

### Dashboard Queries

```sql
-- API call success rate by courier
SELECT
  courier,
  COUNT(*) as total_calls,
  SUM(CASE WHEN error IS NULL THEN 1 ELSE 0 END) as successful_calls,
  ROUND(100.0 * SUM(CASE WHEN error IS NULL THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM tracking_api_calls
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY courier;

-- Average tracking events per shipment
SELECT
  courier,
  AVG(event_count) as avg_events_per_shipment
FROM (
  SELECT
    courier,
    fulfillment_id,
    COUNT(*) as event_count
  FROM tracking_updates
  GROUP BY courier, fulfillment_id
) subquery
GROUP BY courier;
```

---

## 🚀 Next Steps

1. **Read individual courier guides** - Start with PostNL, DHL, DPD
2. **Get API credentials** - Contact couriers for access
3. **Implement in order** - One courier at a time
4. **Test thoroughly** - Use sandbox environments
5. **Monitor performance** - Track metrics and errors
6. **Optimize costs** - Implement caching and smart polling

---

## 📚 Additional Resources

- [Shopify Carrier Documentation](https://help.shopify.com/en/manual/shipping/tracking)
- [Tracking Integration Best Practices](../docs/TRACKING_BEST_PRACTICES.md)
- [API Security Guidelines](../docs/API_SECURITY.md)

---

For questions or issues, refer to individual courier integration guides or contact the development team.
