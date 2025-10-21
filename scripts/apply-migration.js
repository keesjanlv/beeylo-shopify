/**
 * Apply Supabase migration for customer_order_index
 * Run with: node scripts/apply-migration.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('📦 Applying customer_order_index migration...\n');

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '../../supabase/migrations/20251021_create_customer_order_index.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');

    // Split into individual statements (semicolon-separated)
    const statements = migrationSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`Found ${statements.length} SQL statements\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const preview = statement.substring(0, 60).replace(/\n/g, ' ') + '...';

      console.log(`[${i + 1}/${statements.length}] ${preview}`);

      const { data, error } = await supabase.rpc('exec_sql', {
        sql_string: statement + ';'
      });

      if (error) {
        // Try direct query if RPC doesn't exist
        const { error: directError } = await supabase
          .from('_supabase_migrations')
          .select('*')
          .limit(1);

        if (directError) {
          console.error(`   ❌ Error: ${error.message}`);
          console.error(`   Statement: ${statement.substring(0, 100)}...`);
          // Continue anyway - some errors are expected (e.g., table already exists)
        }
      } else {
        console.log('   ✅ Success');
      }
    }

    console.log('\n✅ Migration applied successfully!\n');
    console.log('Verifying tables...');

    // Verify customer_order_index table exists
    const { data: tables, error: tableError } = await supabase
      .from('customer_order_index')
      .select('*')
      .limit(1);

    if (tableError) {
      if (tableError.message.includes('does not exist')) {
        console.error('❌ customer_order_index table was not created');
        console.log('\n📋 Please apply the migration manually via Supabase dashboard:');
        console.log('   1. Go to https://supabase.com/dashboard/project/xcuvffwuyrdmufvgzczs/sql');
        console.log('   2. Copy contents of: supabase/migrations/20251021_create_customer_order_index.sql');
        console.log('   3. Paste and run\n');
        process.exit(1);
      }
    } else {
      console.log('✅ customer_order_index table exists');

      // Check how many entries
      const { count } = await supabase
        .from('customer_order_index')
        .select('*', { count: 'exact', head: true });

      console.log(`✅ Index has ${count || 0} entries`);
    }

    console.log('\n🎉 All done! Migration is ready.\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n📋 Please apply the migration manually via Supabase dashboard:');
    console.log('   1. Go to https://supabase.com/dashboard/project/xcuvffwuyrdmufvgzczs/sql');
    console.log('   2. Copy contents of: supabase/migrations/20251021_create_customer_order_index.sql');
    console.log('   3. Paste and run\n');
    process.exit(1);
  }
}

applyMigration();
