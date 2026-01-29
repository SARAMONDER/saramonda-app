/**
 * Direct Order Creation Test
 */
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.resolve(__dirname, 'database/saramonda.db');

async function testOrderCreation() {
    console.log('🧪 Testing Order Creation...\n');

    const SQL = await initSqlJs();
    const buffer = fs.readFileSync(dbPath);
    const db = new SQL.Database(buffer);

    // Test 1: Check product exists
    console.log('1. Checking product prod_trim_a:');
    const productStmt = db.prepare('SELECT id, name, base_price, cost_price FROM products WHERE id = ?');
    productStmt.bind(['prod_trim_a']);
    if (productStmt.step()) {
        const product = productStmt.getAsObject();
        console.log('   ✅ Product found:', product);
    } else {
        console.log('   ❌ Product NOT found!');
    }
    productStmt.free();

    // Test 2: Generate order number
    console.log('\n2. Generating order number:');
    const branchId = 'branch_001';
    const today = new Date().toISOString().split('T')[0];
    const countStmt = db.prepare('SELECT COUNT(*) as count FROM orders WHERE branch_id = ? AND date(created_at) = ?');
    countStmt.bind([branchId, today]);
    countStmt.step();
    const count = countStmt.getAsObject();
    console.log('   Today order count:', count);
    countStmt.free();

    const now = new Date();
    const dateStr = `${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const sequence = String((count?.count || 0) + 1).padStart(3, '0');
    const orderNumber = `SAR-${dateStr}-${sequence}`;
    console.log('   Order number:', orderNumber);

    // Test 3: Insert order
    console.log('\n3. Creating order:');
    const orderId = uuidv4();
    try {
        const insertStmt = db.prepare(`
            INSERT INTO orders (
                id, order_number, branch_id, customer_name, customer_phone,
                status, subtotal, total, payment_method, delivery_type
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        insertStmt.bind([
            orderId, orderNumber, branchId, 'Test Customer', '0812345678',
            'pending', 890, 890 * 1.07, 'cash', 'pickup'
        ]);
        insertStmt.step();
        insertStmt.free();
        console.log('   ✅ Order created:', orderId);

        // Test 4: Insert order item
        const itemId = uuidv4();
        const itemStmt = db.prepare(`
            INSERT INTO order_items (
                id, order_id, product_id, product_name, quantity, unit_price, total_price
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        itemStmt.bind([itemId, orderId, 'prod_trim_a', 'ทริม A', 2, 890, 1780]);
        itemStmt.step();
        itemStmt.free();
        console.log('   ✅ Order item created');

        // Save database
        const data = db.export();
        fs.writeFileSync(dbPath, Buffer.from(data));
        console.log('   💾 Database saved');

    } catch (error) {
        console.log('   ❌ Error:', error.message);
    }

    // Verify
    console.log('\n4. Verifying order:');
    const verifyStmt = db.prepare('SELECT * FROM orders WHERE id = ?');
    verifyStmt.bind([orderId]);
    if (verifyStmt.step()) {
        console.log('   ✅ Order verified:', verifyStmt.getAsObject());
    }
    verifyStmt.free();

    console.log('\n✅ Test complete!');
}

testOrderCreation().catch(console.error);
