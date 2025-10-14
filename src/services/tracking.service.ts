import axios from 'axios';
import { db } from '../lib/supabase';
import { config } from '../config';
import { CourierTrackingResponse, CourierEvent } from '../types';
import { NotificationService } from './notification.service';
import { PostNLService } from './couriers/postnl.service';
import { DHLService } from './couriers/dhl.service';
import { DPDService } from './couriers/dpd.service';
import { UPSService } from './couriers/ups.service';
import { FedExService } from './couriers/fedex.service';
import { GLSService } from './couriers/gls.service';

export class TrackingService {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  /**
   * Start tracking a shipment
   */
  async startTracking(fulfillmentId: string, trackingNumber: string, courierName: string) {
    try {
      const courier = this.normalizeCourierName(courierName);
      const trackingInfo = await this.fetchTrackingInfo(trackingNumber, courier);

      if (trackingInfo) {
        // Store tracking events
        for (const event of trackingInfo.events) {
          await db.createTrackingUpdate({
            fulfillment_id: fulfillmentId,
            tracking_number: trackingNumber,
            courier: courier,
            status: event.status,
            status_description: event.description,
            location: event.location,
            timestamp: event.timestamp,
          });
        }

        // Update fulfillment with estimated delivery
        if (trackingInfo.estimated_delivery) {
          await db.supabase
            .from('order_fulfillments')
            .update({
              estimated_delivery: trackingInfo.estimated_delivery,
              shipment_status: trackingInfo.status,
            })
            .eq('id', fulfillmentId);
        }

        // Send notification if delivered
        if (trackingInfo.actual_delivery) {
          const fulfillment = await db.supabase
            .from('order_fulfillments')
            .select('*, order:shopify_orders(*)')
            .eq('id', fulfillmentId)
            .single();

          if (fulfillment.data) {
            await this.notificationService.sendDeliveryNotification(
              fulfillment.data.order,
              fulfillment.data
            );
          }
        }
      }

      return trackingInfo;
    } catch (error) {
      console.error(`Failed to track shipment ${trackingNumber}:`, error);
      return null;
    }
  }

  /**
   * Fetch tracking information from courier API
   */
  private async fetchTrackingInfo(
    trackingNumber: string,
    courier: string
  ): Promise<CourierTrackingResponse | null> {
    try {
      switch (courier) {
        case 'postnl':
          return await this.fetchPostNLTracking(trackingNumber);
        case 'dhl':
          return await this.fetchDHLTracking(trackingNumber);
        case 'dpd':
          return await this.fetchDPDTracking(trackingNumber);
        case 'ups':
          return await this.fetchUPSTracking(trackingNumber);
        case 'fedex':
          return await this.fetchFedExTracking(trackingNumber);
        case 'gls':
          return await this.fetchGLSTracking(trackingNumber);
        default:
          console.log(`[Tracking] Courier ${courier} not supported, using Shopify data`);
          return null;
      }
    } catch (error) {
      console.error(`[Tracking] Error fetching from ${courier}:`, error);
      return null; // Fall back to Shopify tracking
    }
  }

  /**
   * Fetch tracking from PostNL API
   */
  private async fetchPostNLTracking(trackingNumber: string): Promise<CourierTrackingResponse | null> {
    if (!PostNLService.isEnabled()) {
      console.log('[Tracking] PostNL API not configured, using Shopify data');
      return null;
    }

    try {
      const service = new PostNLService();
      return await service.fetchTracking(trackingNumber);
    } catch (error) {
      console.error('[Tracking] PostNL API error:', error);
      return null;
    }
  }

  /**
   * Fetch tracking from DHL API
   */
  private async fetchDHLTracking(trackingNumber: string): Promise<CourierTrackingResponse | null> {
    if (!DHLService.isEnabled()) {
      console.log('[Tracking] DHL API not configured, using Shopify data');
      return null;
    }

    try {
      const service = new DHLService();
      return await service.fetchTracking(trackingNumber);
    } catch (error) {
      console.error('[Tracking] DHL API error:', error);
      return null;
    }
  }

  /**
   * Fetch tracking from DPD API
   */
  private async fetchDPDTracking(trackingNumber: string): Promise<CourierTrackingResponse | null> {
    if (!DPDService.isEnabled()) {
      console.log('[Tracking] DPD API not configured, using Shopify data');
      return null;
    }

    try {
      const service = new DPDService();
      return await service.fetchTracking(trackingNumber);
    } catch (error) {
      console.error('[Tracking] DPD API error:', error);
      return null;
    }
  }

  /**
   * Fetch tracking from UPS API
   */
  private async fetchUPSTracking(trackingNumber: string): Promise<CourierTrackingResponse | null> {
    if (!UPSService.isEnabled()) {
      console.log('[Tracking] UPS API not configured, using Shopify data');
      return null;
    }

    try {
      const service = new UPSService();
      return await service.fetchTracking(trackingNumber);
    } catch (error) {
      console.error('[Tracking] UPS API error:', error);
      return null;
    }
  }

  /**
   * Fetch tracking from FedEx API
   */
  private async fetchFedExTracking(trackingNumber: string): Promise<CourierTrackingResponse | null> {
    if (!FedExService.isEnabled()) {
      console.log('[Tracking] FedEx API not configured, using Shopify data');
      return null;
    }

    try {
      const service = new FedExService();
      return await service.fetchTracking(trackingNumber);
    } catch (error) {
      console.error('[Tracking] FedEx API error:', error);
      return null;
    }
  }

  /**
   * Fetch tracking from GLS API
   */
  private async fetchGLSTracking(trackingNumber: string): Promise<CourierTrackingResponse | null> {
    if (!GLSService.isEnabled()) {
      console.log('[Tracking] GLS API not configured, using Shopify data');
      return null;
    }

    try {
      const service = new GLSService();
      return await service.fetchTracking(trackingNumber);
    } catch (error) {
      console.error('[Tracking] GLS API error:', error);
      return null;
    }
  }

  /**
   * Normalize courier name
   */
  private normalizeCourierName(courierName: string): string {
    const name = courierName.toLowerCase().trim();

    // PostNL
    if (name.includes('postnl') || name.includes('post nl')) {
      return 'postnl';
    }

    // DHL
    if (name.includes('dhl')) {
      return 'dhl';
    }

    // DPD
    if (name.includes('dpd')) {
      return 'dpd';
    }

    // UPS
    if (name.includes('ups') || name.includes('united parcel')) {
      return 'ups';
    }

    // FedEx
    if (name.includes('fedex') || name.includes('federal express')) {
      return 'fedex';
    }

    // GLS
    if (name.includes('gls') || name.includes('general logistics')) {
      return 'gls';
    }

    return 'other';
  }

  /**
   * Periodic check for tracking updates (run as cron job)
   */
  async checkAllActiveShipments() {
    try {
      // Get all fulfillments that are not delivered
      const { data: fulfillments } = await db.supabase
        .from('order_fulfillments')
        .select('*')
        .in('status', ['pending', 'open', 'success'])
        .not('tracking_number', 'is', null);

      if (!fulfillments) return;

      for (const fulfillment of fulfillments) {
        // Check if we need to update (don't check too frequently)
        const lastUpdate = await this.getLastTrackingUpdate(fulfillment.id);
        const hoursSinceLastUpdate = lastUpdate
          ? (Date.now() - new Date(lastUpdate.created_at).getTime()) / (1000 * 60 * 60)
          : 24;

        // Only check if more than 2 hours since last update
        if (hoursSinceLastUpdate >= 2) {
          await this.startTracking(
            fulfillment.id,
            fulfillment.tracking_number,
            fulfillment.tracking_company
          );
        }
      }
    } catch (error) {
      console.error('Failed to check active shipments:', error);
    }
  }

  /**
   * Get last tracking update for a fulfillment
   */
  private async getLastTrackingUpdate(fulfillmentId: string) {
    const { data } = await db.supabase
      .from('tracking_updates')
      .select('*')
      .eq('fulfillment_id', fulfillmentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return data;
  }
}
