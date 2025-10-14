import axios, { AxiosInstance, AxiosError } from 'axios';
import { config } from '../../config';
import { CourierTrackingResponse, CourierEvent } from '../../types';

export class FedExService {
  private client: AxiosInstance;
  private accessToken: string | null = null;

  constructor() {
    if (!config.couriers.fedex.clientId || !config.couriers.fedex.clientSecret) {
      throw new Error('FedEx API credentials not configured');
    }

    this.client = axios.create({
      baseURL: config.couriers.fedex.apiUrl,
      timeout: 10000,
    });

    this.client.interceptors.request.use(
      (config) => {
        console.log(`[FedEx API] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      }
    );
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken) {
      return this.accessToken;
    }

    try {
      const response = await axios.post(
        `${config.couriers.fedex.apiUrl}/oauth/token`,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: config.couriers.fedex.clientId,
          client_secret: config.couriers.fedex.clientSecret,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.accessToken = response.data.access_token;
      return this.accessToken;
    } catch (error) {
      console.error('[FedEx] OAuth error:', error);
      throw new Error('Failed to authenticate with FedEx');
    }
  }

  async fetchTracking(trackingNumber: string): Promise<CourierTrackingResponse> {
    try {
      console.log(`[FedEx] Fetching tracking for: ${trackingNumber}`);

      const token = await this.getAccessToken();

      const response = await this.client.post(
        '/track/v1/trackingnumbers',
        {
          includeDetailedScans: true,
          trackingInfo: [
            {
              trackingNumberInfo: {
                trackingNumber: trackingNumber,
              },
            },
          ],
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        }
      );

      const data = response.data;
      const trackResult = data.output?.completeTrackResults?.[0]?.trackResults?.[0];

      if (!trackResult) {
        throw new Error('No tracking data found');
      }

      // Parse FedEx response format
      const events: CourierEvent[] = (trackResult.scanEvents || []).map((event: any) => ({
        timestamp: event.date,
        status: this.mapStatusCode(event.eventType),
        description: event.eventDescription,
        location: event.scanLocation?.city,
      })).sort((a: CourierEvent, b: CourierEvent) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      return {
        tracking_number: trackingNumber,
        status: this.mapStatusCode(trackResult.latestStatusDetail?.code || 'unknown'),
        status_description: trackResult.latestStatusDetail?.description || '',
        current_location: trackResult.latestStatusDetail?.scanLocation?.city || events[events.length - 1]?.location,
        events: events,
        estimated_delivery: trackResult.estimatedDeliveryTimeWindow?.window?.begins,
        actual_delivery: trackResult.actualDeliveryTimestamp,
        proof_of_delivery: trackResult.deliveryDetails?.receivedByName ? {
          receiver_name: trackResult.deliveryDetails.receivedByName,
          signature_url: trackResult.deliveryDetails.signatureImageUrl,
          timestamp: trackResult.actualDeliveryTimestamp,
        } : undefined,
      };
    } catch (error) {
      console.error('[FedEx] Tracking error:', error);
      throw this.handleError(error as AxiosError);
    }
  }

  private mapStatusCode(fedexCode: string): string {
    const statusMap: Record<string, string> = {
      'OC': 'pending',          // Order created
      'PU': 'in_transit',       // Picked up
      'IT': 'in_transit',       // In transit
      'AR': 'in_transit',       // Arrived at facility
      'OD': 'out_for_delivery', // Out for delivery
      'DL': 'delivered',        // Delivered
      'DE': 'failure',          // Delivery exception
      'HL': 'available_for_pickup', // Held at location
      'RS': 'return_to_sender', // Return to sender
    };

    return statusMap[fedexCode] || 'unknown';
  }

  private handleError(error: AxiosError): Error {
    if (error.response) {
      const status = error.response.status;
      switch (status) {
        case 401:
          this.accessToken = null; // Clear token to force re-auth
          return new Error('FedEx authentication failed - check credentials');
        case 404:
          return new Error('Tracking number not found');
        case 429:
          return new Error('FedEx rate limit exceeded');
        default:
          return new Error(`FedEx API error: ${status}`);
      }
    }
    return new Error('FedEx API request failed');
  }

  static isEnabled(): boolean {
    return !!(config.couriers.fedex.clientId && config.couriers.fedex.clientSecret);
  }
}
