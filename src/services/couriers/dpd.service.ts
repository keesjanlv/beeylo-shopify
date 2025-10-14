import axios, { AxiosInstance, AxiosError } from 'axios';
import { config } from '../../config';
import { CourierTrackingResponse, CourierEvent } from '../../types';

export class DPDService {
  private client: AxiosInstance;

  constructor() {
    if (!config.couriers.dpd.apiKey) {
      throw new Error('DPD API key not configured');
    }

    this.client = axios.create({
      baseURL: config.couriers.dpd.apiUrl,
      headers: {
        'Authorization': `Bearer ${config.couriers.dpd.apiKey}`,
        'Accept': 'application/json',
      },
      timeout: 10000,
    });

    this.client.interceptors.request.use(
      (config) => {
        console.log(`[DPD API] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      }
    );
  }

  async fetchTracking(trackingNumber: string): Promise<CourierTrackingResponse> {
    try {
      console.log(`[DPD] Fetching tracking for: ${trackingNumber}`);

      const response = await this.client.get(`/parcels/${trackingNumber}`);
      const data = response.data;

      // Parse DPD response format
      const events: CourierEvent[] = (data.parcelLifeCycleData || []).map((event: any) => ({
        timestamp: event.date,
        status: this.mapStatusCode(event.statusCode),
        description: event.statusDescription,
        location: event.depot?.city,
      })).sort((a: CourierEvent, b: CourierEvent) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      return {
        tracking_number: trackingNumber,
        status: this.mapStatusCode(data.currentStatus || 'unknown'),
        status_description: data.currentStatusDescription || '',
        current_location: events[events.length - 1]?.location,
        events: events,
        estimated_delivery: data.predictedDeliveryDate,
        actual_delivery: data.deliveryDate,
        proof_of_delivery: data.proofOfDelivery ? {
          signature_url: data.proofOfDelivery.signatureUrl,
          receiver_name: data.proofOfDelivery.recipientName,
          timestamp: data.deliveryDate,
        } : undefined,
      };
    } catch (error) {
      console.error('[DPD] Tracking error:', error);
      throw this.handleError(error as AxiosError);
    }
  }

  private mapStatusCode(dpdCode: string): string {
    const statusMap: Record<string, string> = {
      'COLLECTED': 'in_transit',
      'AT_DEPOT': 'in_transit',
      'IN_TRANSIT': 'in_transit',
      'OUT_FOR_DELIVERY': 'out_for_delivery',
      'DELIVERED': 'delivered',
      'DELIVERY_FAILED': 'failure',
      'RETURNED': 'return_to_sender',
    };

    return statusMap[dpdCode] || 'unknown';
  }

  private handleError(error: AxiosError): Error {
    if (error.response) {
      const status = error.response.status;
      switch (status) {
        case 401:
          return new Error('DPD authentication failed - check API key');
        case 404:
          return new Error('Tracking number not found');
        case 429:
          return new Error('DPD rate limit exceeded');
        default:
          return new Error(`DPD API error: ${status}`);
      }
    }
    return new Error('DPD API request failed');
  }

  static isEnabled(): boolean {
    return !!config.couriers.dpd.apiKey;
  }
}
