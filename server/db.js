import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AISLES, CATALOGUE_VERSION, FEEDS, LEGACY_PRODUCTS, STORE_PROFILES } from './catalogue.js';

const dir = path.dirname(fileURLToPath(import.meta.url));
export const db = new Database(process.env.DB_FILE || path.join(dir, '..', 'hamba.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS stores(
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL, code TEXT UNIQUE,
  address TEXT, lat REAL, lng REAL, open_h INTEGER DEFAULT 8, close_h INTEGER DEFAULT 20,
  mode TEXT DEFAULT 'auto', color TEXT DEFAULT '#2447f5');
CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, phone TEXT,
  pass TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'customer', store_id INTEGER REFERENCES stores(id));
CREATE TABLE IF NOT EXISTS products(
  id INTEGER PRIMARY KEY, store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL, price REAL NOT NULL, available INTEGER DEFAULT 1, source_url TEXT,
  UNIQUE(store_id, name));
CREATE TABLE IF NOT EXISTS orders(
  id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), store_id INTEGER NOT NULL REFERENCES stores(id),
  total REAL NOT NULL, status TEXT NOT NULL, address TEXT, lat REAL, lng REAL,
  dispatched_at INTEGER, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS order_items(
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE, name TEXT, price REAL, qty INTEGER);
CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY, value TEXT);
`);

function addColumn(table, name, ddl) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some(c => c.name === name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${ddl}`);
}
addColumn('products', 'category', "TEXT DEFAULT ''");
addColumn('products', 'brand', "TEXT DEFAULT ''");
addColumn('products', 'pack', "TEXT DEFAULT ''");
addColumn('products', 'sku', 'TEXT');
addColumn('products', 'image', 'TEXT');
addColumn('products', 'blurb', 'TEXT');
addColumn('stores', 'blurb', "TEXT DEFAULT ''");
addColumn('stores', 'image', "TEXT DEFAULT ''");

export { AISLES };

// Store hours are always read in South African time, wherever the server runs.
export function isOpen(s, now = new Date()) {
  if (s.mode === 'open') return true;
  if (s.mode === 'closed') return false;
  const h = Number(new Intl.DateTimeFormat('en-ZA', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Africa/Johannesburg' }).format(now));
  return h >= s.open_h && h < s.close_h;
}

const blank = v => {
  const s = v == null ? '' : String(v).trim();
  return s || null;
};

// Upserts a product feed for one store. Same shape as server/catalogue.js.
// Price is updated on conflict (a supplier feed is allowed to change the shelf price).
// Stock (available) is set on insert only, so a merchant's sold-out toggle is kept.
export function importProducts(code, list) {
  const s = db.prepare('SELECT id FROM stores WHERE code=?').get(code);
  if (!s) throw new Error('Unknown store code ' + code);
  const up = db.prepare(`INSERT INTO products(store_id,name,price,source_url,sku,brand,category,pack,image,blurb,available)
    VALUES(@store_id,@name,@price,@source_url,@sku,@brand,@category,@pack,@image,@blurb,@available)
    ON CONFLICT(store_id,name) DO UPDATE SET
      price=excluded.price,
      source_url=COALESCE(excluded.source_url, products.source_url),
      sku=COALESCE(excluded.sku, products.sku),
      brand=COALESCE(excluded.brand, products.brand),
      category=COALESCE(NULLIF(excluded.category, ''), products.category),
      pack=COALESCE(NULLIF(excluded.pack, ''), products.pack),
      image=COALESCE(excluded.image, products.image),
      blurb=COALESCE(excluded.blurb, products.blurb)`);
  let n = 0;
  db.transaction(() => {
    for (const p of list || []) {
      const name = String(p.name || '').trim();
      const price = Number(p.price);
      if (!name || !(price >= 0)) continue;
      up.run({
        store_id: s.id,
        name,
        price,
        source_url: blank(p.url),
        sku: blank(p.sku),
        brand: blank(p.brand),
        category: blank(p.category) || '',
        pack: blank(p.pack) || '',
        image: blank(p.image),
        blurb: blank(p.blurb),
        available: p.available === 0 || p.available === false ? 0 : 1,
      });
      n++;
    }
  })();
  return n;
}

function applyProfiles() {
  const upd = db.prepare('UPDATE stores SET blurb=?, image=? WHERE code=?');
  for (const [code, p] of Object.entries(STORE_PROFILES)) upd.run(p.blurb, p.image, code);
}

export function ensureCatalogue() {
  applyProfiles();
  const v = db.prepare("SELECT value FROM meta WHERE key='catalogue'").get();
  if (v?.value === CATALOGUE_VERSION) return;
  const names = db.prepare('SELECT name FROM products').all().map(r => r.name);
  const legacy = new Set(LEGACY_PRODUCTS);
  if (names.length && names.every(n => legacy.has(n))) db.prepare('DELETE FROM products').run();
  let n = 0;
  for (const [code, items] of Object.entries(FEEDS)) n += importProducts(code, items);
  db.prepare("INSERT INTO meta(key,value) VALUES('catalogue', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(CATALOGUE_VERSION);
  console.log(`Catalogue ${CATALOGUE_VERSION}: ${n} products`);
}

export function seed() {
  if (db.prepare('SELECT COUNT(*) n FROM stores').get().n) return;
  const T = [-29.0594, 30.5931]; // Greytown centre
  const stores = [
    ['KFC Greytown', 'Fast food', 'KFC-GT01', 'Voortrekker St', 10, 22, '#c8102e'],
    ['Hungry Lion', 'Fast food', 'HL-GT02', 'Scott St', 10, 21, '#8a5a00'],
    ['Shoprite Greytown', 'Groceries', 'SR-GT03', 'Bell St', 8, 19, '#e2231a'],
    ['Spar Greytown', 'Groceries', 'SP-GT04', 'Pine St', 7, 20, '#0f6b3d'],
    ['Mama Z Kitchen', 'Fast food', 'MZ-GT05', 'Moor St', 9, 18, '#5a3e85'],
  ];
  stores.forEach((s, i) => {
    const id = db.prepare('INSERT INTO stores(name,category,code,address,lat,lng,open_h,close_h,color) VALUES(?,?,?,?,?,?,?,?,?)')
      .run(s[0], s[1], s[2], s[3], T[0] + (i - 2) * 0.004, T[1] + ((i * 7) % 5 - 2) * 0.004, s[4], s[5], s[6]).lastInsertRowid;
    db.prepare('INSERT INTO users(name,email,pass,role,store_id) VALUES(?,?,?,?,?)')
      .run(s[0] + ' staff', `store${id}@hamba.local`, bcrypt.hashSync('merchant123', 10), 'merchant', id);
  });
  db.prepare('INSERT INTO users(name,email,pass,role) VALUES(?,?,?,?)').run('Hamba Admin', 'admin@hamba.local', bcrypt.hashSync('admin12345', 10), 'admin');
  console.log('Seeded. Admin: admin@hamba.local / admin12345. Merchants: store1@hamba.local ... / merchant123. Change these before going live.');
}
