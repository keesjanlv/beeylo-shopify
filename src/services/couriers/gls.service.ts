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
      };
    } catch (error) {
      console.error('[GLS] Tracking error:', error);
      throw this.handleError(error as AxiosError);
    }
  }

  private mapStatusCode(glsCode: string): string {
    const statusMap: Record<string, string> = {
      '0': 'pending',
      '1': 'in_transit',
      '2': 'out_for_delivery',
      '3': 'delivered',
      '4': 'failure',
      '5': 'return_to_sender',
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