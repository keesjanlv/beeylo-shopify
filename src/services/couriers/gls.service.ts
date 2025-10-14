import axios, { AxiosInstance, AxiosError } from 'axios';
import { config } from '../../config';
import { CourierTrackingResponse, CourierEvent } from '../../types';

export class GLSService {
  private client: AxiosInstance;
  private authHeader: string;

  constructor() {
    if (!config.couriers.gls.username || !config.couriers.gls.password) {
      throw new Error('GLS API credentials not configured');
    }

    // Create auth header
    const credentials = Buffer.from(
      `${config.couriers.gls.username}:${config.couriers.gls.password}`
    ).toString('base64');
    this.authHeader = `Basic ${credentials}`;

    this.client = axios.create({
      baseURL: config.couriers.gls.apiUrl,
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 10000,
    });

    this.client.interceptors.request.use(
      (config) => {
        console.log(`[GLS API] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      }
    );
  }

  async fetchTracking(parcelNumber: string): Promise<CourierTrackingResponse> {
    try {
      console.log(`[GLS] Fetching tracking for parcel: ${parcelNumber}`);

      const response = await this.client.post(
        '/ParcelService.svc/json/GetParcelStatuses',
        {
          ParcelNumber: parcelNumber,
        }
      );

      if (!response.data.ParcelStatusList || response.data.ParcelStatusList.length === 0) {
        throw new Error(`No tracking data found for parcel ${parcelNumber}`);
      }

      const glsStatus = response.data.ParcelStatusList[0];

      // Transform events
      const events: CourierEvent[] = (glsStatus.Events || []).map((event: any) => ({
        timestamp: event.Date,
        status: this.mapStatusCode(event.Code),
        description: event.Description,
        location: event.Location,
      })).sort((a: CourierEvent, b: CourierEvent) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      return {
        tracking_number: glsStatus.ParcelNumber,
        status: this.mapStatusCode(glsStatus.StatusInfo.StatusCode),
        status_description: glsStatus.StatusInfo.StatusText,
        current_location: glsStatus.DepotInfo?.DepotName || events[events.length - 1]?.location,
        estimated_delivery: glsStatus.DeliveryInfo.EstimatedDeliveryDate,
        actual_delivery: glsStatus.DeliveryInfo.ActualDeliveryDate,
        events: events,
        proof_of_delivery: glsStatus.PODInfo?.SignatureAvailable
          ? {
              signature_url: glsStatus.PODInfo.SignatureUrl,
              photo_url: glsStatus.PODInfo.PhotoUrl,
              receiver_name: glsStatus.PODInfo.ReceiverName,
              timestamp: glsStatus.PODInfo.DeliveryDate,
            }
          : undefined,
      };
    } catch (error) {
      console.error('[GLS] Tracking error:', error);
      throw this.handleError(error as AxiosError);
    }
  }

  private mapStatusCode(glsCode: string): string {
    const statusMap: Record<string, string> = {
      'PREADVICE': 'pending',
      'COLLECTED': 'in_transit',
      'IN_TRANSIT': 'in_transit',
      'AT_DEPOT': 'in_transit',
      'AT_HUB': 'in_transit',
      'OUT_FOR_DELIVERY': 'out_for_delivery',
      'DELIVERED': 'delivered',
      'DELIVERY_FAILED': 'failure',
      'AWAITING_COLLECTION': 'available_for_pickup',
      'COLLECTED_BY_RECIPIENT': 'delivered',
      'RETURNED': 'return_to_sender',
      'CANCELLED': 'cancelled',
      'EXCEPTION': 'failure',
      'DAMAGED': 'failure',
      'LOST': 'failure',
    };

    return statusMap[glsCode] || 'unknown';
  }

  private handleError(error: AxiosError): Error {
    if (error.response) {
      const status = error.response.status;
      switch (status) {
        case 401:
          return new Error('GLS authentication failed - check credentials');
        case 404:
          return new Error('Parcel number not found');
        case 429:
          return new Error('GLS rate limit exceeded');
        default:
          return new Error(`GLS API error: ${status}`);
      }
    }
    return new Error('GLS API request failed');
  }

  static isEnabled(): boolean {
    return !!(config.couriers.gls.username && config.couriers.gls.password);
  }
}
