import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

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
`);

// Store hours are always read in South African time, wherever the server runs.
export function isOpen(s, now = new Date()) {
  if (s.mode === 'open') return true;
  if (s.mode === 'closed') return false;
  const h = Number(new Intl.DateTimeFormat('en-ZA', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Africa/Johannesburg' }).format(now));
  return h >= s.open_h && h < s.close_h;
}

export function seed() {
  if (db.prepare('SELECT COUNT(*) n FROM stores').get().n) return;
  const T = [-29.0594, 30.5931]; // Greytown centre
  const stores = [
    ['KFC Greytown', 'Fast food', 'KFC-GT01', 'Voortrekker St', 10, 22, '#c8102e', [['Streetwise 2', 54.9], ['Zinger Burger', 64.9], ['Bucket for 4', 229.9], ['Large chips', 29.9]]],
    ['Hungry Lion', 'Fast food', 'HL-GT02', 'Scott St', 10, 21, '#8a5a00', [['6 Pc Meal', 89.9], ['Lion Burger', 49.9], ['Pap & Wors', 44.9]]],
    ['Shoprite Greytown', 'Groceries', 'SR-GT03', 'Bell St', 8, 19, '#e2231a', [['Maize meal 10kg', 119.9], ['Full cream milk 2L', 38.9], ['Eggs 18s', 64.9], ['Brown bread', 17.9]]],
    ['Spar Greytown', 'Groceries', 'SP-GT04', 'Pine St', 7, 20, '#0f6b3d', [['Rice 2kg', 42.9], ['Sunflower oil 2L', 74.9], ['Chicken pieces 2kg', 99.9]]],
    ['Mama Z Kitchen', 'Fast food', 'MZ-GT05', 'Moor St', 9, 18, '#5a3e85', [['Kota', 35], ['Beef stew & rice', 60]]],
  ];
  stores.forEach((s, i) => {
    const id = db.prepare('INSERT INTO stores(name,category,code,address,lat,lng,open_h,close_h,color) VALUES(?,?,?,?,?,?,?,?,?)')
      .run(s[0], s[1], s[2], s[3], T[0] + (i - 2) * 0.004, T[1] + ((i * 7) % 5 - 2) * 0.004, s[4], s[5], s[6]).lastInsertRowid;
    s[7].forEach(p => db.prepare('INSERT INTO products(store_id,name,price) VALUES(?,?,?)').run(id, p[0], p[1]));
    db.prepare('INSERT INTO users(name,email,pass,role,store_id) VALUES(?,?,?,?,?)')
      .run(s[0] + ' staff', `store${id}@hamba.local`, bcrypt.hashSync('merchant123', 10), 'merchant', id);
  });
  db.prepare('INSERT INTO users(name,email,pass,role) VALUES(?,?,?,?)').run('Hamba Admin', 'admin@hamba.local', bcrypt.hashSync('admin12345', 10), 'admin');
  console.log('Seeded. Admin: admin@hamba.local / admin12345. Merchants: store1@hamba.local ... / merchant123. Change these before going live.');
}
