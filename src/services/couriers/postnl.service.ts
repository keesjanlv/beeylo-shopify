import axios, { AxiosInstance, AxiosError } from 'axios';
import { config } from '../../config';
import { CourierTrackingResponse, CourierEvent } from '../../types';

export class PostNLService {
  private client: AxiosInstance;

  constructor() {
    if (!config.couriers.postnl.apiKey) {
      throw new Error('PostNL API key not configured');
    }

    this.client = axios.create({
      baseURL: config.couriers.postnl.apiUrl,
      headers: {
        'apikey': config.couriers.postnl.apiKey,
        'Accept': 'application/json',
      },
      timeout: 10000,
    });

    this.client.interceptors.request.use(
      (config) => {
        console.log(`[PostNL API] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      }
    );
  }

  async fetchTracking(trackingNumber: string): Promise<CourierTrackingResponse> {
    try {
      console.log(`[PostNL] Fetching tracking for: ${trackingNumber}`);

      const response = await this.client.get(`/${trackingNumber}`);
      const data = response.data;

      // Parse PostNL response format
      const events: CourierEvent[] = (data.statusHistory || []).map((event: any) => ({
        timestamp: event.TimeStamp,
        status: this.mapStatusCode(event.StatusCode),
        description: event.StatusDescription,
        location: event.LocationCode,
      })).sort((a: CourierEvent, b: CourierEvent) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      return {
        tracking_number: trackingNumber,
        status: this.mapStatusCode(data.currentStatus?.StatusCode || 'unknown'),
        status_description: data.currentStatus?.StatusDescription || '',
        current_location: events[events.length - 1]?.location,
        events: events,
        estimated_delivery: data.expectedDeliveryDate,
        actual_delivery: data.actualDeliveryDate,
        proof_of_delivery: data.signature ? {
          signature_url: data.signature.imageUrl,
          receiver_name: data.signature.receiverName,
          timestamp: data.actualDeliveryDate,
        } : undefined,
      };
    } catch (error) {
      console.error('[PostNL] Tracking error:', error);
      throw this.handleError(error as AxiosError);
    }
  }

  private mapStatusCode(postNLCode: string): string {
    const statusMap: Record<string, string> = {
      '1': 'pending',           // Information received
      '2': 'in_transit',        // Collected from sender
      '3': 'in_transit',        // Sorting
      '4': 'in_transit',        // Distribution
      '5': 'out_for_delivery',  // Out for delivery
      '6': 'delivered',         // Delivered
      '7': 'failure',           // Not delivered
      '8': 'available_for_pickup', // Ready for pickup
      '9': 'return_to_sender',  // Returned
    };

    return statusMap[postNLCode] || 'unknown';
  }

  private handleError(error: AxiosError): Error {
    if (error.response) {
      const status = error.response.status;
      switch (status) {
        case 401:
          return new Error('PostNL authentication failed - check API key');
        case 404:
          return new Error('Tracking number not found');
        case 429:
          return new Error('PostNL rate limit exceeded');
        default:
          return new Error(`PostNL API error: ${status}`);
      }
    }
    return new Error('PostNL API request failed');
  }

  static isEnabled(): boolean {
    return !!config.couriers.postnl.apiKey;
  }
}
