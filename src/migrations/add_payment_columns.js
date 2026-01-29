/**
 * Database Migration: Add Payment & Rating Columns
 * Run this script to update the orders table with new columns
 * 
 * Usage: node src/migrations/add_payment_columns.js
 */

const db = require('../config/database');

async function migrate() {
    console.log('🔄 Starting migration: Add Payment & Rating Columns...\n');

    try {
        // Wait for database to be ready
        await db.ensureReady();

        // Add new columns to orders table
        const alterations = [
            // Payment columns
            `ALTER TABLE orders ADD COLUMN line_user_id TEXT`,
            `ALTER TABLE orders ADD COLUMN slip_ref TEXT`,
            `ALTER TABLE orders ADD COLUMN slip_amount REAL`,
            `ALTER TABLE orders ADD COLUMN slip_image_url TEXT`,
            `ALTER TABLE orders ADD COLUMN payment_verified_at TEXT`,
            `ALTER TABLE orders ADD COLUMN payment_verified_by TEXT`,

            // Delivery columns
            `ALTER TABLE orders ADD COLUMN delivery_date TEXT`,
            `ALTER TABLE orders ADD COLUMN delivery_time_slot TEXT`,
            `ALTER TABLE orders ADD COLUMN delivery_area TEXT`,
            `ALTER TABLE orders ADD COLUMN courier_name TEXT`,
            `ALTER TABLE orders ADD COLUMN courier_phone TEXT`,

            // Rating columns
            `ALTER TABLE orders ADD COLUMN customer_rating INTEGER`,
            `ALTER TABLE orders ADD COLUMN rating_comment TEXT`,
            `ALTER TABLE orders ADD COLUMN rated_at TEXT`,

            // Cancellation columns
            `ALTER TABLE orders ADD COLUMN cancel_reason TEXT`,
            `ALTER TABLE orders ADD COLUMN cancelled_at TEXT`,
            `ALTER TABLE orders ADD COLUMN cancelled_by TEXT`,

            // Update timestamp
            `ALTER TABLE orders ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP`
        ];

        let successCount = 0;
        let skipCount = 0;

        for (const sql of alterations) {
            try {
                db.exec(sql);
                const colName = sql.match(/ADD COLUMN (\w+)/)[1];
                console.log(`  ✅ Added column: ${colName}`);
                successCount++;
            } catch (error) {
                if (error.message.includes('duplicate column name')) {
                    const colName = sql.match(/ADD COLUMN (\w+)/)[1];
                    console.log(`  ⏭️ Column already exists: ${colName}`);
                    skipCount++;
                } else {
                    console.log(`  ❌ Error: ${error.message}`);
                }
            }
        }

        // Create index for slip_ref to prevent duplicates
        try {
            db.exec(`CREATE INDEX IF NOT EXISTS idx_orders_slip_ref ON orders(slip_ref)`);
            console.log(`  ✅ Created index: idx_orders_slip_ref`);
        } catch (error) {
            console.log(`  ⏭️ Index already exists`);
        }

        // Create index for line_user_id for faster queries
        try {
            db.exec(`CREATE INDEX IF NOT EXISTS idx_orders_line_user_id ON orders(line_user_id)`);
            console.log(`  ✅ Created index: idx_orders_line_user_id`);
        } catch (error) {
            console.log(`  ⏭️ Index already exists`);
        }

        // Create index for payment_status
        try {
            db.exec(`CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status)`);
            console.log(`  ✅ Created index: idx_orders_payment_status`);
        } catch (error) {
            console.log(`  ⏭️ Index already exists`);
        }

        console.log(`\n✨ Migration completed!`);
        console.log(`   - Added: ${successCount} columns`);
        console.log(`   - Skipped: ${skipCount} columns (already exist)`);

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run migration
migrate().then(() => {
    console.log('\n🎉 Done! You can now use payment features.');
    process.exit(0);
}).catch((error) => {
    console.error('Migration error:', error);
    process.exit(1);
});
