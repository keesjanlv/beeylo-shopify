import { db } from '../lib/supabase';

/**
 * CustomerLinkingService
 * Links Shopify customers to Beeylo user accounts by email
 */
export class CustomerLinkingService {
  /**
   * Auto-link a Shopify customer to Beeylo user by email match
   */
  async autoLinkByEmail(shopifyCustomerId: string): Promise<string | null> {
    try {
      // Get Shopify customer
      const { data: customer, error: customerError } = await db.supabase
        .from('shopify_customers')
        .select('id, email, beeylo_user_id')
        .eq('id', shopifyCustomerId)
        .single();

      if (customerError || !customer) {
        console.error('Customer not found:', customerError?.message);
        return null;
      }

      // Skip if already linked
      if (customer.beeylo_user_id) {
        console.log(`Customer ${customer.email} already linked to user ${customer.beeylo_user_id}`);
        return customer.beeylo_user_id;
      }

      // Skip if no email
      if (!customer.email) {
        console.log('Customer has no email, cannot link');
        return null;
      }

      // Find Beeylo user by email
      const { data: user, error: userError } = await db.supabase
        .from('user_profiles')
        .select('id, email, user_type')
        .eq('email', customer.email)
        .in('user_type', ['flutter_consumer', 'both'])
        .single();

      if (userError || !user) {
        console.log(`No Beeylo user found for email: ${customer.email}`);
        return null;
      }

      // Link them
      const { error: updateError } = await db.supabase
        .from('shopify_customers')
        .update({ beeylo_user_id: user.id })
        .eq('id', shopifyCustomerId);

      if (updateError) {
        throw new Error(`Failed to link customer: ${updateError.message}`);
      }

      console.log(`✅ Linked ${customer.email} to user ${user.id}`);
      return user.id;

    } catch (error) {
      console.error('Auto-link failed:', error);
      return null;
    }
  }

  /**
   * Bulk auto-link all unlinked customers
   */
  async bulkAutoLink(): Promise<{ total: number; linked: number; failed: number }> {
    try {
      // Get all unlinked customers
      const { data: unlinkedCustomers, error } = await db.supabase
        .from('shopify_customers')
        .select('id, email')
        .is('beeylo_user_id', null)
        .not('email', 'is', null);

      if (error) {
        throw new Error(`Failed to fetch customers: ${error.message}`);
      }

      console.log(`Found ${unlinkedCustomers?.length || 0} unlinked customers with emails`);

      let linkedCount = 0;
      let failedCount = 0;

      for (const customer of unlinkedCustomers || []) {
        const userId = await this.autoLinkByEmail(customer.id);
        if (userId) {
          linkedCount++;
        } else {
          failedCount++;
        }
      }

      console.log(`\n✅ Bulk linking complete:`);
      console.log(`   Total: ${unlinkedCustomers?.length || 0}`);
      console.log(`   Linked: ${linkedCount}`);
      console.log(`   Not linked: ${failedCount}`);

      return {
        total: unlinkedCustomers?.length || 0,
        linked: linkedCount,
        failed: failedCount
      };

    } catch (error) {
      console.error('Bulk link failed:', error);
      throw error;
    }
  }

  /**
   * Re-sync orders for a newly linked customer
   * This updates the user_id in the orders table
   */
  async resyncCustomerOrders(beeyloUserId: string): Promise<number> {
    try {
      // Get customer ID
      const { data: customer } = await db.supabase
        .from('shopify_customers')
        .select('id')
        .eq('beeylo_user_id', beeyloUserId)
        .single();

      if (!customer) {
        return 0;
      }

      // Get all shopify_orders for this customer
      const { data: shopifyOrders } = await db.supabase
        .from('shopify_orders')
        .select('order_number')
        .eq('customer_id', customer.id);

      if (!shopifyOrders || shopifyOrders.length === 0) {
        return 0;
      }

      // Update user_id in orders table
      const { error: updateError } = await db.supabase
        .from('orders')
        .update({ user_id: beeyloUserId })
        .in('order_number', shopifyOrders.map(o => o.order_number));

      if (updateError) {
        throw new Error(`Failed to update orders: ${updateError.message}`);
      }

      console.log(`✅ Updated ${shopifyOrders.length} orders for user ${beeyloUserId}`);
      return shopifyOrders.length;

    } catch (error) {
      console.error('Resync orders failed:', error);
      return 0;
    }
  }
}
