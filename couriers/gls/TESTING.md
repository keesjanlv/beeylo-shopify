# GLS Testing Guide

Comprehensive testing guide for GLS API integration.

---

## 📋 Overview

This document covers all testing scenarios for the GLS tracking integration, including unit tests, integration tests, and end-to-end testing.

---

## 🧪 Test Environment Setup

### 1. GLS Test Credentials

Request test credentials from GLS support:

```env
# Test environment
GLS_ENVIRONMENT=test
GLS_API_URL_TEST=https://api.test.mygls.hu
GLS_API_USERNAME=test_username
GLS_API_PASSWORD=test_password
```

### 2. Test Database

Create a separate test database:

```bash
createdb beeylo_test
npm run migrate:test
```

---

## 📦 Test Tracking Numbers

### GLS Test Parcels

| Parcel Number | Scenario | Status | Notes |
|---------------|----------|--------|-------|
| 35000001406746 | Normal delivery | DELIVERED | Complete tracking history |
| 35000001406747 | In transit | IN_TRANSIT | Multiple events |
| 35000001406748 | Out for delivery | OUT_FOR_DELIVERY | Expected delivery today |
| 35000001406749 | Failed delivery | DELIVERY_FAILED | Failed attempt |
| 35000001406750 | ParcelShop | AWAITING_COLLECTION | Ready for pickup |
| 35000001406751 | Returned | RETURNED | Returned to sender |
| 35000001406752 | Exception | EXCEPTION | Delivery issue |
| 99999999999999 | Not found | N/A | Returns 404 error |

---

## 🔬 Unit Tests

### Test GLSService Class

`tests/services/gls.service.test.ts`:

```typescript
import { GLSService } from '../../src/services/couriers/gls.service';
import { config } from '../../src/config';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('GLSService', () => {
  let glsService: GLSService;

  beforeEach(() => {
    // Set up test credentials
    config.couriers.gls.username = 'test_user';
    config.couriers.gls.password = 'test_pass';
    config.couriers.gls.apiUrl = 'https://api.test.mygls.hu';

    glsService = new GLSService();
  });

  describe('fetchTracking', () => {
    it('should fetch tracking data successfully', async () => {
      const mockResponse = {
        data: {
          ParcelStatusList: [
            {
              ParcelNumber: '35000001406746',
              StatusInfo: {
                StatusCode: 'DELIVERED',
                StatusText: 'Delivered',
                StatusDate: '2024-01-16T15:45:00',
              },
              Events: [
                {
                  Code: 'COLLECTED',
                  Date: '2024-01-15T09:00:00',
                  Location: 'Rotterdam',
                  Description: 'Parcel collected',
                },
              ],
              DeliveryInfo: {
                EstimatedDeliveryDate: '2024-01-16',
                ActualDeliveryDate: '2024-01-16',
              },
            },
          ],
        },
        status: 200,
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await glsService.fetchTracking('35000001406746');

      expect(result.tracking_number).toBe('35000001406746');
      expect(result.status).toBe('delivered');
      expect(result.events).toHaveLength(1);
    });

    it('should handle parcel not found error', async () => {
      mockedAxios.post.mockRejectedValue({
        response: {
          status: 404,
          data: {
            ErrorCode: 'PARCEL_NOT_FOUND',
            ErrorMessage: 'Parcel not found',
          },
        },
      });

      await expect(
        glsService.fetchTracking('99999999999999')
      ).rejects.toThrow();
    });

    it('should handle authentication error', async () => {
      mockedAxios.post.mockRejectedValue({
        response: {
          status: 401,
          data: {
            ErrorCode: 'AUTHENTICATION_FAILED',
          },
        },
      });

      await expect(
        glsService.fetchTracking('35000001406746')
      ).rejects.toThrow();
    });

    it('should handle rate limit error', async () => {
      mockedAxios.post.mockRejectedValue({
        response: {
          status: 429,
          data: {
            ErrorCode: 'RATE_LIMIT_EXCEEDED',
            RetryAfter: 60,
          },
        },
      });

      await expect(
        glsService.fetchTracking('35000001406746')
      ).rejects.toThrow();
    });
  });

  describe('mapStatusCode', () => {
    it('should map GLS status codes correctly', () => {
      const testCases = [
        { glsCode: 'PREADVICE', expected: 'pending' },
        { glsCode: 'COLLECTED', expected: 'in_transit' },
        { glsCode: 'IN_TRANSIT', expected: 'in_transit' },
        { glsCode: 'OUT_FOR_DELIVERY', expected: 'out_for_delivery' },
        { glsCode: 'DELIVERED', expected: 'delivered' },
        { glsCode: 'DELIVERY_FAILED', expected: 'failure' },
        { glsCode: 'RETURNED', expected: 'return_to_sender' },
      ];

      testCases.forEach(({ glsCode, expected }) => {
        const result = (glsService as any).mapStatusCode(glsCode);
        expect(result).toBe(expected);
      });
    });
  });

  describe('isEnabled', () => {
    it('should return true when credentials are configured', () => {
      config.couriers.gls.enabled = true;
      expect(GLSService.isEnabled()).toBe(true);
    });

    it('should return false when credentials are not configured', () => {
      config.couriers.gls.enabled = false;
      expect(GLSService.isEnabled()).toBe(false);
    });
  });
});
```

### Run Unit Tests

```bash
npm run test:unit
```

---

## 🔗 Integration Tests

### Test Against Real GLS API

`tests/integration/gls-api.test.ts`:

```typescript
import { GLSService } from '../../src/services/couriers/gls.service';

describe('GLS API Integration', () => {
  let glsService: GLSService;

  beforeAll(() => {
    // Use test credentials
    process.env.GLS_ENVIRONMENT = 'test';
    glsService = new GLSService();
  });

  it('should fetch tracking for delivered parcel', async () => {
    const result = await glsService.fetchTracking('35000001406746');

    expect(result.tracking_number).toBe('35000001406746');
    expect(result.status).toBe('delivered');
    expect(result.events.length).toBeGreaterThan(0);
    expect(result.events[0]).toHaveProperty('timestamp');
    expect(result.events[0]).toHaveProperty('description');
  }, 10000); // 10 second timeout

  it('should fetch tracking for in-transit parcel', async () => {
    const result = await glsService.fetchTracking('35000001406747');

    expect(result.tracking_number).toBe('35000001406747');
    expect(result.status).toBe('in_transit');
    expect(result.events.length).toBeGreaterThan(0);
  }, 10000);

  it('should handle non-existent parcel', async () => {
    await expect(
      glsService.fetchTracking('99999999999999')
    ).rejects.toThrow();
  }, 10000);
});
```

### Run Integration Tests

```bash
npm run test:integration
```

---

## 🌐 End-to-End Tests

### Test Full Tracking Flow

`tests/e2e/gls-tracking.test.ts`:

```typescript
import { TrackingService } from '../../src/services/tracking.service';
import { db } from '../../src/db';

describe('GLS Tracking E2E', () => {
  let trackingService: TrackingService;
  let testFulfillmentId: string;

  beforeAll(async () => {
    trackingService = new TrackingService();

    // Create test fulfillment
    const result = await db.query(
      `
      INSERT INTO order_fulfillments (
        order_id,
        tracking_number,
        tracking_company,
        status
      )
      VALUES ($1, $2, $3, $4)
      RETURNING id
      `,
      ['test-order-123', '35000001406746', 'GLS', 'pending']
    );

    testFulfillmentId = result.rows[0].id;
  });

  afterAll(async () => {
    // Clean up test data
    await db.query('DELETE FROM gls_tracking_events WHERE fulfillment_id = $1', [
      testFulfillmentId,
    ]);
    await db.query('DELETE FROM order_fulfillments WHERE id = $1', [
      testFulfillmentId,
    ]);
  });

  it('should fetch and store GLS tracking data', async () => {
    // Fetch tracking
    await trackingService.updateTracking(testFulfillmentId);

    // Verify events stored in database
    const events = await db.query(
      'SELECT * FROM gls_tracking_events WHERE fulfillment_id = $1 ORDER BY timestamp',
      [testFulfillmentId]
    );

    expect(events.rows.length).toBeGreaterThan(0);
    expect(events.rows[0]).toHaveProperty('parcel_number');
    expect(events.rows[0]).toHaveProperty('status_code');
    expect(events.rows[0]).toHaveProperty('location');
  }, 15000);

  it('should update existing tracking data', async () => {
    // Fetch tracking again
    await trackingService.updateTracking(testFulfillmentId);

    // Events should be updated, not duplicated
    const events = await db.query(
      'SELECT COUNT(*) as count FROM gls_tracking_events WHERE fulfillment_id = $1',
      [testFulfillmentId]
    );

    // Should have same or more events (not duplicated)
    expect(parseInt(events.rows[0].count)).toBeGreaterThan(0);
  }, 15000);
});
```

### Run E2E Tests

```bash
npm run test:e2e
```

---

## 🎯 Manual Testing Scenarios

### Scenario 1: Normal Delivery

**Test Parcel**: 35000001406746

**Steps**:
1. Create test order with GLS tracking number
2. Call tracking update API
3. Verify events stored in database
4. Check customer dashboard shows tracking

**Expected Result**:
- Status: DELIVERED
- Multiple tracking events
- POD with signature
- Delivery timestamp

### Scenario 2: In Transit

**Test Parcel**: 35000001406747

**Steps**:
1. Fetch tracking for in-transit parcel
2. Verify current location shown
3. Check estimated delivery date

**Expected Result**:
- Status: IN_TRANSIT
- Current depot/location
- Estimated delivery date

### Scenario 3: Failed Delivery

**Test Parcel**: 35000001406749

**Steps**:
1. Fetch tracking for failed delivery
2. Verify failure reason shown
3. Check next delivery attempt info

**Expected Result**:
- Status: DELIVERY_FAILED
- Failure reason
- Retry information

### Scenario 4: ParcelShop Pickup

**Test Parcel**: 35000001406750

**Steps**:
1. Fetch tracking for ParcelShop delivery
2. Verify ParcelShop details shown
3. Check pickup instructions

**Expected Result**:
- Status: AWAITING_COLLECTION
- ParcelShop name and address
- Pickup deadline

### Scenario 5: Error Handling

**Test Parcel**: 99999999999999

**Steps**:
1. Try to fetch non-existent parcel
2. Verify graceful error handling
3. Check fallback to Shopify data

**Expected Result**:
- 404 error caught
- Fallback to Shopify tracking
- No application crash

---

## 🔍 Performance Testing

### Load Test

Test API performance under load:

```typescript
import { GLSService } from '../../src/services/couriers/gls.service';

describe('GLS Performance', () => {
  it('should handle multiple concurrent requests', async () => {
    const glsService = new GLSService();
    const testParcels = [
      '35000001406746',
      '35000001406747',
      '35000001406748',
      '35000001406749',
      '35000001406750',
    ];

    const startTime = Date.now();

    // Fetch all parcels concurrently
    const results = await Promise.all(
      testParcels.map((parcel) => glsService.fetchTracking(parcel))
    );

    const duration = Date.now() - startTime;

    expect(results).toHaveLength(5);
    expect(duration).toBeLessThan(15000); // Should complete within 15 seconds
  }, 20000);
});
```

### Rate Limit Test

```typescript
it('should respect rate limits', async () => {
  const glsService = new GLSService();
  const requests = 100;

  // Make 100 requests as fast as possible
  const promises = Array.from({ length: requests }, () =>
    glsService.fetchTracking('35000001406746')
  );

  // Should handle rate limiting gracefully
  await expect(Promise.all(promises)).resolves.toBeDefined();
});
```

---

## 📊 Monitoring Tests

### API Health Check

```typescript
describe('GLS API Health', () => {
  it('should return success for health check', async () => {
    const glsService = new GLSService();

    // Use known working tracking number
    const result = await glsService.fetchTracking('35000001406746');

    expect(result).toBeDefined();
    expect(result.tracking_number).toBe('35000001406746');
  });
});
```

### Database Logging

```sql
-- Verify API calls are logged
SELECT COUNT(*) FROM gls_api_logs
WHERE created_at > NOW() - INTERVAL '1 hour';

-- Check success rate
SELECT
  response_status,
  COUNT(*) as count
FROM gls_api_logs
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY response_status;
```

---

## 🐛 Debugging

### Enable Debug Logging

```env
DEBUG=gls:*
LOG_LEVEL=debug
```

### Check Logs

```bash
# Application logs
tail -f logs/application.log | grep GLS

# Database logs
tail -f logs/database.log | grep gls_tracking_events
```

### Common Issues

#### Issue 1: Authentication Failed

**Symptom**: 401 Unauthorized errors

**Solution**:
```bash
# Verify credentials
echo $GLS_API_USERNAME
echo $GLS_API_PASSWORD

# Test auth manually
curl -u "username:password" https://api.test.mygls.hu/ParcelService.svc/json/GetParcelStatuses
```

#### Issue 2: Parcel Not Found

**Symptom**: 404 errors for valid tracking numbers

**Solution**:
- Parcel may not be scanned yet (wait 1-2 hours)
- Verify tracking number format
- Check if using correct API environment (test vs production)

#### Issue 3: Rate Limit Exceeded

**Symptom**: 429 Too Many Requests errors

**Solution**:
- Implement rate limiting with Bottleneck
- Reduce polling frequency
- Use webhooks instead of polling

---

## ✅ Test Checklist

### Unit Tests
- [ ] GLSService.fetchTracking()
- [ ] Status code mapping
- [ ] Error handling
- [ ] Response parsing

### Integration Tests
- [ ] Real API connection
- [ ] Delivered parcel
- [ ] In-transit parcel
- [ ] Failed delivery
- [ ] ParcelShop pickup
- [ ] Error scenarios

### E2E Tests
- [ ] Full tracking flow
- [ ] Database storage
- [ ] Customer dashboard display
- [ ] Webhook handling (if enabled)

### Performance Tests
- [ ] Concurrent requests
- [ ] Rate limiting
- [ ] Response times
- [ ] Load testing

### Manual Tests
- [ ] All test scenarios
- [ ] Error handling
- [ ] Fallback to Shopify
- [ ] Customer experience

---

## 📈 Success Criteria

All tests should pass with:
- ✅ Unit test coverage > 80%
- ✅ Integration tests passing
- ✅ E2E tests passing
- ✅ Average response time < 2 seconds
- ✅ Success rate > 95%
- ✅ No memory leaks
- ✅ Graceful error handling

---

## 🚀 Running All Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

---

For implementation details, see `IMPLEMENTATION_PLAN.md`.
For API reference, see `API_REFERENCE.md`.
