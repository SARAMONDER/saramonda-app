/**
 * Database Configuration and Schema
 * Using sql.js for cross-platform SQLite (pure JavaScript)
 * Synchronous initialization for simpler usage
 */
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

let db = null;
let SQL = null;

// Database path
const dbPath = path.resolve(__dirname, '../../database/saramonda.db');
const dbDir = path.dirname(dbPath);

// Ensure database directory exists
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

/**
 * Save database to file
 */
function saveDatabase() {
    if (!db) return;
    try {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(dbPath, buffer);
    } catch (error) {
        console.error('Database save error:', error);
    }
}

/**
 * Initialize all database tables
 */
function initializeTables() {
    const tables = [
        `CREATE TABLE IF NOT EXISTS branches (id TEXT PRIMARY KEY, name TEXT, address TEXT, phone TEXT, is_active INTEGER DEFAULT 1, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
        `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, branch_id TEXT, email TEXT UNIQUE, password_hash TEXT, name TEXT, phone TEXT, role TEXT DEFAULT 'customer', is_active INTEGER DEFAULT 1, last_login TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
        `CREATE TABLE IF NOT EXISTS refresh_tokens (id TEXT PRIMARY KEY, user_id TEXT, token TEXT, expires_at TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
        `CREATE TABLE IF NOT EXISTS members (id TEXT PRIMARY KEY, user_id TEXT, branch_id TEXT, name TEXT, email TEXT, phone TEXT, tier TEXT DEFAULT 'BRONZE', points INTEGER DEFAULT 0, total_points INTEGER DEFAULT 0, total_spent REAL DEFAULT 0, line_user_id TEXT, birthday TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
        // Customer table for LINE Login users (Lean CRM)
        `CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY, line_user_id TEXT UNIQUE, display_name TEXT, picture_url TEXT, phone TEXT, address TEXT, delivery_area TEXT, order_count INTEGER DEFAULT 0, total_spend REAL DEFAULT 0, last_order_date TEXT, last_login TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
        `CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, branch_id TEXT, name TEXT, name_en TEXT, sort_order INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
        `CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, branch_id TEXT, category_id TEXT, name TEXT, name_en TEXT, description TEXT, base_price REAL, cost_price REAL DEFAULT 0, image_url TEXT, has_variants INTEGER DEFAULT 0, is_available INTEGER DEFAULT 1, sort_order INTEGER DEFAULT 0, prep_time_minutes INTEGER DEFAULT 10, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
        `CREATE TABLE IF NOT EXISTS product_variants (id TEXT PRIMARY KEY, product_id TEXT, name TEXT, price_modifier REAL DEFAULT 0, is_available INTEGER DEFAULT 1, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
        `CREATE TABLE IF NOT EXISTS ingredients (id TEXT PRIMARY KEY, branch_id TEXT, name TEXT, unit TEXT, cost_per_unit REAL DEFAULT 0, current_stock REAL DEFAULT 0, min_stock_level REAL DEFAULT 0, supplier_id TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
        `CREATE TABLE IF NOT EXISTS recipes (id TEXT PRIMARY KEY, product_id TEXT, ingredient_id TEXT, quantity REAL, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
        // Orders with customer_line_id for linking to LINE users
        `CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, order_number TEXT UNIQUE, branch_id TEXT, member_id TEXT, customer_line_id TEXT, customer_name TEXT, customer_phone TEXT, customer_address TEXT, status TEXT DEFAULT 'pending', subtotal REAL, discount_amount REAL DEFAULT 0, tax_amount REAL DEFAULT 0, total REAL, payment_method TEXT, payment_status TEXT DEFAULT 'pending', points_earned INTEGER DEFAULT 0, coupon_code TEXT, notes TEXT, priority TEXT DEFAULT 'normal', estimated_prep_time INTEGER, delivery_type TEXT DEFAULT 'pickup', created_at TEXT DEFAULT CURRENT_TIMESTAMP, completed_at TEXT)`,
        `CREATE TABLE IF NOT EXISTS order_items (id TEXT PRIMARY KEY, order_id TEXT, product_id TEXT, variant_id TEXT, product_name TEXT, variant_name TEXT, quantity INTEGER, unit_price REAL, total_price REAL, cost_price REAL DEFAULT 0, notes TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
        `CREATE TABLE IF NOT EXISTS order_status_history (id TEXT PRIMARY KEY, order_id TEXT, status TEXT, changed_by TEXT, notes TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
        `CREATE TABLE IF NOT EXISTS payments (id TEXT PRIMARY KEY, order_id TEXT, branch_id TEXT, amount REAL, payment_method TEXT, payment_status TEXT DEFAULT 'pending', transaction_ref TEXT, payment_data TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
        `CREATE TABLE IF NOT EXISTS coupons (id TEXT PRIMARY KEY, branch_id TEXT, code TEXT UNIQUE, type TEXT, value REAL, min_order_amount REAL DEFAULT 0, max_discount REAL, usage_limit INTEGER, usage_count INTEGER DEFAULT 0, valid_from TEXT, valid_until TEXT, is_active INTEGER DEFAULT 1, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
        `CREATE TABLE IF NOT EXISTS member_coupons (id TEXT PRIMARY KEY, member_id TEXT, coupon_id TEXT, is_used INTEGER DEFAULT 0, used_at TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
        `CREATE TABLE IF NOT EXISTS points_transactions (id TEXT PRIMARY KEY, member_id TEXT, order_id TEXT, type TEXT, points INTEGER, description TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
        `CREATE TABLE IF NOT EXISTS stock_transactions (id TEXT PRIMARY KEY, branch_id TEXT, ingredient_id TEXT, type TEXT, quantity REAL, reference_type TEXT, reference_id TEXT, notes TEXT, created_by TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
        `CREATE TABLE IF NOT EXISTS daily_summary (id TEXT PRIMARY KEY, branch_id TEXT, date TEXT, total_orders INTEGER DEFAULT 0, total_revenue REAL DEFAULT 0, total_cost REAL DEFAULT 0, gross_profit REAL DEFAULT 0, gross_margin REAL DEFAULT 0, cash_sales REAL DEFAULT 0, card_sales REAL DEFAULT 0, other_sales REAL DEFAULT 0, discounts_given REAL DEFAULT 0, tax_collected REAL DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
        `CREATE TABLE IF NOT EXISTS audit_logs (id TEXT PRIMARY KEY, branch_id TEXT, user_id TEXT, action TEXT, entity_type TEXT, entity_id TEXT, old_data TEXT, new_data TEXT, ip_address TEXT, user_agent TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`
    ];

    for (const sql of tables) {
        db.run(sql);
    }
    saveDatabase();
}

/**
 * Ensure database is ready (for async init)
 */
let initPromise = null;
async function ensureDbReady() {
    if (db) return;
    if (initPromise) {
        await initPromise;
        return;
    }

    initPromise = initSqlJs().then((sql) => {
        SQL = sql;
        try {
            if (fs.existsSync(dbPath)) {
                const buffer = fs.readFileSync(dbPath);
                db = new SQL.Database(buffer);
                console.log('📦 Database loaded from file');
            } else {
                db = new SQL.Database();
                console.log('📦 New database created');
            }
        } catch (error) {
            console.error('Database load error:', error);
            db = new SQL.Database();
        }
        initializeTables();
        console.log('✅ Database tables initialized');

        // Auto-save every 30s
        setInterval(saveDatabase, 30000);
    });

    await initPromise;
}

// Start initialization immediately
ensureDbReady();

/**
 * Database wrapper compatible with better-sqlite3 API
 */
const dbWrapper = {
    prepare(sql) {
        return {
            run(...params) {
                if (!db) throw new Error('Database not initialized - call ensureDbReady()');
                try {
                    if (params.length === 0) {
                        db.run(sql);
                    } else {
                        const stmt = db.prepare(sql);
                        stmt.bind(params);
                        stmt.step();
                        stmt.free();
                    }
                    saveDatabase();
                    return { changes: db.getRowsModified() };
                } catch (error) {
                    console.error('DB run error:', error.message);
                    throw error;
                }
            },
            get(...params) {
                if (!db) return undefined;
                try {
                    const stmt = db.prepare(sql);
                    if (params.length > 0) stmt.bind(params);
                    let result = undefined;
                    if (stmt.step()) {
                        result = stmt.getAsObject();
                    }
                    stmt.free();
                    return result;
                } catch (error) {
                    console.error('DB get error:', error.message);
                    return undefined;
                }
            },
            all(...params) {
                if (!db) return [];
                try {
                    const stmt = db.prepare(sql);
                    if (params.length > 0) stmt.bind(params);
                    const results = [];
                    while (stmt.step()) {
                        results.push(stmt.getAsObject());
                    }
                    stmt.free();
                    return results;
                } catch (error) {
                    console.error('DB all error:', error.message);
                    return [];
                }
            }
        };
    },
    exec(sql) {
        if (!db) throw new Error('Database not initialized');
        db.run(sql);
        saveDatabase();
    },
    transaction(fn) {
        return (...args) => {
            if (!db) throw new Error('Database not initialized');
            db.run('BEGIN TRANSACTION');
            try {
                const result = fn(...args);
                db.run('COMMIT');
                saveDatabase();
                return result;
            } catch (error) {
                db.run('ROLLBACK');
                throw error;
            }
        };
    },
    ensureReady: ensureDbReady
};

module.exports = dbWrapper;
