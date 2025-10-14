import axios, { AxiosInstance, AxiosError } from 'axios';
import { config } from '../../config';
import { CourierTrackingResponse, CourierEvent } from '../../types';

export class UPSService {
  private client: AxiosInstance;
  private accessToken: string | null = null;

  constructor() {
    if (!config.couriers.ups.clientId || !config.couriers.ups.clientSecret) {
      throw new Error('UPS API credentials not configured');
    }

    this.client = axios.create({
      baseURL: config.couriers.ups.apiUrl,
      timeout: 10000,
    });

    this.client.interceptors.request.use(
      (config) => {
        console.log(`[UPS API] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      }
    );
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken) {
      return this.accessToken;
    }

    try {
      const credentials = Buffer.from(
        `${config.couriers.ups.clientId}:${config.couriers.ups.clientSecret}`
      ).toString('base64');

      const response = await axios.post(
        `${config.couriers.ups.apiUrl}/oauth/token`,
        'grant_type=client_credentials',
        {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.accessToken = response.data.access_token;
      return this.accessToken;
    } catch (error) {
      console.error('[UPS] OAuth error:', error);
      throw new Error('Failed to authenticate with UPS');
    }
  }

  async fetchTracking(trackingNumber: string): Promise<CourierTrackingResponse> {
    try {
      console.log(`[UPS] Fetching tracking for: ${trackingNumber}`);

      const token = await this.getAccessToken();

      const response = await this.client.get(`/api/track/v1/details/${trackingNumber}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      const data = response.data;
      const shipment = data.trackResponse?.shipment?.[0];

      if (!shipment) {
        throw new Error('No tracking data found');
      }

      const pkg = shipment.package?.[0];

      // Parse UPS response format
      const events: CourierEvent[] = (pkg?.activity || []).map((event: any) => ({
        timestamp: `${event.date}T${event.time}`,
        status: this.mapStatusCode(event.status?.type),
        description: event.status?.description,
        location: event.location?.address?.city,
      })).sort((a: CourierEvent, b: CourierEvent) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      return {
        tracking_number: trackingNumber,
        status: this.mapStatusCode(pkg?.currentStatus?.type || 'unknown'),
        status_description: pkg?.currentStatus?.description || '',
        current_location: pkg?.currentStatus?.location?.address?.city || events[events.length - 1]?.location,
        events: events,
        estimated_delivery: pkg?.deliveryDate?.[0]?.date,
        actual_delivery: pkg?.deliveryInformation?.receivedBy ? pkg.deliveryDate?.[0]?.date : undefined,
        proof_of_delivery: pkg?.deliveryInformation?.receivedBy ? {
          receiver_name: pkg.deliveryInformation.receivedBy,
          timestamp: pkg.deliveryDate?.[0]?.date,
        } : undefined,
      };
    } catch (error) {
      console.error('[UPS] Tracking error:', error);
      throw this.handleError(error as AxiosError);
    }
  }

  private mapStatusCode(upsCode: string): string {
    const statusMap: Record<string, string> = {
      'I': 'pending',           // Information received
      'M': 'in_transit',        // In transit
      'X': 'out_for_delivery',  // Out for delivery
      'D': 'delivered',         // Delivered
      'P': 'available_for_pickup', // Ready for pickup
      'RS': 'return_to_sender', // Return to sender
    };

    return statusMap[upsCode] || 'unknown';
  }

  private handleError(error: AxiosError): Error {
    if (error.response) {
      const status = error.response.status;
      switch (status) {
        case 401:
          this.accessToken = null; // Clear token to force re-auth
          return new Error('UPS authentication failed - check credentials');
        case 404:
          return new Error('Tracking number not found');
        case 429:
          return new Error('UPS rate limit exceeded');
        default:
          return new Error(`UPS API error: ${status}`);
      }
    }
    return new Error('UPS API request failed');
  }

  static isEnabled(): boolean {
    return !!(config.couriers.ups.clientId && config.couriers.ups.clientSecret);
  }
}
