/**
 * Simple API Test
 */
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.resolve(__dirname, 'database/saramonda.db');

async function test() {
    console.log('🧪 Starting database test...\n');

    const SQL = await initSqlJs();
    const buffer = fs.readFileSync(dbPath);
    const db = new SQL.Database(buffer);

    // Test products
    console.log('📦 Products:');
    const stmt = db.prepare('SELECT id, name, base_price FROM products WHERE is_available = 1');
    while (stmt.step()) {
        const row = stmt.getAsObject();
        console.log(`  - ${row.id}: ${row.name} (฿${row.base_price})`);
    }
    stmt.free();

    // Test users
    console.log('\n👤 Users:');
    const stmt2 = db.prepare('SELECT email, role FROM users');
    while (stmt2.step()) {
        const row = stmt2.getAsObject();
        console.log(`  - ${row.email} (${row.role})`);
    }
    stmt2.free();

    // Test variants
    console.log('\n📏 Variants for prod_trim_a:');
    const stmt3 = db.prepare('SELECT id, name, price_modifier FROM product_variants WHERE product_id = ?');
    stmt3.bind(['prod_trim_a']);
    while (stmt3.step()) {
        const row = stmt3.getAsObject();
        console.log(`  - ${row.id}: ${row.name} (+฿${row.price_modifier})`);
    }
    stmt3.free();

    // Test with prepared statement
    console.log('\n🔍 Testing prepared statement get:');
    const stmt4 = db.prepare('SELECT id, name, base_price, cost_price FROM products WHERE id = ?');
    stmt4.bind(['prod_trim_a']);
    if (stmt4.step()) {
        console.log('  Result:', stmt4.getAsObject());
    }
    stmt4.free();

    console.log('\n✅ Database test complete!');
}

test().catch(console.error);
