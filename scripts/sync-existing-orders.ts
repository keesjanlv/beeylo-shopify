/**
 * One-time script to sync all existing Shopify orders to orders table
 * Run this once after deploying the order-sync service
 */

import { OrderSyncService } from '../src/services/order-sync.service';

async function main() {
  console.log('🚀 Starting one-time order sync...\n');

  const syncService = new OrderSyncService();

  try {
    const result = await syncService.syncAllExisting();

    console.log('\n📊 Sync Results:');
    console.log(`   Total orders: ${result.total}`);
    console.log(`   ✅ Successful: ${result.success}`);
    console.log(`   ❌ Failed: ${result.failed}`);

    if (result.failed > 0) {
      console.log('\n⚠️  Some orders failed to sync. Check logs above for details.');
      process.exit(1);
    } else {
      console.log('\n🎉 All orders synced successfully!');
      process.exit(0);
    }
  } catch (error) {
    console.error('\n❌ Fatal error during sync:', error);
    process.exit(1);
  }
}

main();
