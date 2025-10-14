import axios, { AxiosInstance, AxiosError } from 'axios';
import { config } from '../../config';
import { CourierTrackingResponse, CourierEvent } from '../../types';

export class DHLService {
  private client: AxiosInstance;

  constructor() {
    if (!config.couriers.dhl.apiKey) {
      throw new Error('DHL API key not configured');
    }

    this.client = axios.create({
      baseURL: config.couriers.dhl.apiUrl,
      headers: {
        'DHL-API-Key': config.couriers.dhl.apiKey,
        'Accept': 'application/json',
      },
      timeout: 10000,
    });

    this.client.interceptors.request.use(
      (config) => {
        console.log(`[DHL API] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      }
    );
  }

  async fetchTracking(trackingNumber: string): Promise<CourierTrackingResponse> {
    try {
      console.log(`[DHL] Fetching tracking for: ${trackingNumber}`);

      const response = await this.client.get('', {
        params: { trackingNumber },
      });

      const data = response.data;
      const shipment = data.shipments?.[0];

      if (!shipment) {
        throw new Error('No tracking data found');
      }

      // Parse DHL response format
      const events: CourierEvent[] = (shipment.events || []).map((event: any) => ({
        timestamp: event.timestamp,
        status: this.mapStatusCode(event.statusCode),
        description: event.description,
        location: event.location?.address?.addressLocality,
      })).sort((a: CourierEvent, b: CourierEvent) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      return {
        tracking_number: trackingNumber,
        status: this.mapStatusCode(shipment.status?.statusCode || 'unknown'),
        status_description: shipment.status?.description || '',
        current_location: shipment.status?.location?.address?.addressLocality || events[events.length - 1]?.location,
        events: events,
        estimated_delivery: shipment.estimatedTimeOfDelivery,
        actual_delivery: shipment.details?.proofOfDelivery?.timestamp,
        proof_of_delivery: shipment.details?.proofOfDelivery ? {
          signature_url: shipment.details.proofOfDelivery.signatureUrl,
          receiver_name: shipment.details.proofOfDelivery.signed?.name,
          timestamp: shipment.details.proofOfDelivery.timestamp,
        } : undefined,
      };
    } catch (error) {
      console.error('[DHL] Tracking error:', error);
      throw this.handleError(error as AxiosError);
    }
  }

  private mapStatusCode(dhlCode: string): string {
    const statusMap: Record<string, string> = {
      'pre-transit': 'pending',
      'transit': 'in_transit',
      'delivered': 'delivered',
      'failure': 'failure',
      'unknown': 'unknown',
    };

    return statusMap[dhlCode] || 'unknown';
  }

  private handleError(error: AxiosError): Error {
    if (error.response) {
      const status = error.response.status;
      switch (status) {
        case 401:
          return new Error('DHL authentication failed - check API key');
        case 404:
          return new Error('Tracking number not found');
        case 429:
          return new Error('DHL rate limit exceeded');
        default:
          return new Error(`DHL API error: ${status}`);
      }
    }
    return new Error('DHL API request failed');
  }

  static isEnabled(): boolean {
    return !!config.couriers.dhl.apiKey;
  }
}
