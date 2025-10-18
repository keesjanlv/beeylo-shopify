/**
 * Script to bulk-link Shopify customers to Beeylo users by email
 * Also re-syncs orders to populate user_id
 */

import { CustomerLinkingService } from '../src/services/customer-linking.service';
import { OrderSyncService } from '../src/services/order-sync.service';

async function main() {
  console.log('🔗 Starting customer linking process...\n');

  const linkingService = new CustomerLinkingService();
  const orderSync = new OrderSyncService();

  try {
    // Step 1: Link customers
    const linkResult = await linkingService.bulkAutoLink();

    if (linkResult.linked === 0) {
      console.log('\n⚠️  No customers were linked. Make sure:');
      console.log('   1. Shopify customers have email addresses');
      console.log('   2. Beeylo users exist with matching emails');
      console.log('   3. Beeylo users have user_type = "flutter_consumer" or "both"');
      process.exit(0);
    }

    // Step 2: Re-sync all orders to update user_id
    console.log('\n🔄 Re-syncing orders to populate user_id...');
    const syncResult = await orderSync.syncAllExisting();

    console.log('\n🎉 Process complete!');
    console.log(`   ${linkResult.linked} customers linked`);
    console.log(`   ${syncResult.success} orders updated`);

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();
