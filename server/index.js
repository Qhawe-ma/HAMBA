import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { db, isOpen, seed } from './db.js';
import { router as authRouter, auth } from './auth.js';

const app = express();
const FEE = 25, TRIP_MS = 90_000, FLOW = ['received', 'preparing', 'ready', 'on_the_way'];
app.use(express.json({ limit: '1mb' }));
app.use('/api/auth', authRouter);

const withOpen = s => ({ ...s, open: isOpen(s) });
const ownsStore = (u, sid) => u.role === 'admin' || (u.role === 'merchant' && u.store_id === Number(sid));
const canSee = (u, o) => u.role === 'admin' || o.user_id === u.id || (u.role === 'merchant' && u.store_id === o.store_id);
const fail = (res, code, error) => res.status(code).json({ error });

// ---- Stores and products ----
app.get('/api/stores', (_q, res) => res.json(db.prepare('SELECT * FROM stores').all().map(withOpen)));

app.get('/api/stores/:id', (req, res) => {
  const s = db.prepare('SELECT * FROM stores WHERE id=?').get(req.params.id);
  if (!s) return fail(res, 404, 'Store not found');
  res.json({ ...withOpen(s), products: db.prepare('SELECT * FROM products WHERE store_id=? ORDER BY name').all(s.id) });
});

app.patch('/api/stores/:id', auth(['merchant', 'admin']), (req, res) => {
  if (!ownsStore(req.user, req.params.id)) return fail(res, 403, 'Not your store');
  const { mode, open_h, close_h } = req.body;
  if (mode && !['auto', 'open', 'closed'].includes(mode)) return fail(res, 400, 'Invalid mode');
  const s = db.prepare('SELECT * FROM stores WHERE id=?').get(req.params.id);
  db.prepare('UPDATE stores SET mode=?, open_h=?, close_h=? WHERE id=?')
    .run(mode ?? s.mode, Number.isInteger(open_h) ? open_h : s.open_h, Number.isInteger(close_h) ? close_h : s.close_h, s.id);
  res.json({ ok: true });
});

app.post('/api/stores/:id/products', auth(['merchant', 'admin']), (req, res) => {
  if (!ownsStore(req.user, req.params.id)) return fail(res, 403, 'Not your store');
  const price = Number(req.body.price);
  if (!req.body.name?.trim() || !(price >= 0)) return fail(res, 400, 'Enter a name and a price');
  try {
    const r = db.prepare('INSERT INTO products(store_id,name,price) VALUES(?,?,?)').run(req.params.id, req.body.name.trim(), price);
    res.status(201).json({ id: r.lastInsertRowid });
  } catch { fail(res, 409, 'That product already exists'); }
});

function productFor(req, res) {
  const p = db.prepare('SELECT * FROM products WHERE id=?').get(req.params.id);
  if (!p) { fail(res, 404, 'Product not found'); return null; }
  if (!ownsStore(req.user, p.store_id)) { fail(res, 403, 'Not your store'); return null; }
  return p;
}
app.patch('/api/products/:id', auth(['merchant', 'admin']), (req, res) => {
  const p = productFor(req, res); if (!p) return;
  const price = req.body.price !== undefined ? Number(req.body.price) : p.price;
  if (!(price >= 0)) return fail(res, 400, 'Invalid price');
  db.prepare('UPDATE products SET name=?, price=?, available=? WHERE id=?')
    .run(req.body.name ?? p.name, price, req.body.available !== undefined ? (req.body.available ? 1 : 0) : p.available, p.id);
  res.json({ ok: true });
});
app.delete('/api/products/:id', auth(['merchant', 'admin']), (req, res) => {
  const p = productFor(req, res); if (!p) return;
  db.prepare('DELETE FROM products WHERE id=?').run(p.id); res.json({ ok: true });
});

// ---- Orders ----
app.post('/api/orders', auth(), (req, res) => {
  const { store_id, items, address, lat, lng } = req.body;
  const s = db.prepare('SELECT * FROM stores WHERE id=?').get(store_id);
  if (!s) return fail(res, 404, 'Store not found');
  if (!isOpen(s)) return fail(res, 409, `${s.name} is closed right now`);
  if (!address?.trim() || !Array.isArray(items) || !items.length) return fail(res, 400, 'Add items and a delivery address');
  let sub = 0; const lines = [];
  for (const it of items) {
    const p = db.prepare('SELECT * FROM products WHERE id=? AND store_id=?').get(it.id, s.id);
    if (!p || !p.available) return fail(res, 400, `${p ? p.name : 'An item'} is not available`);
    const qty = Math.min(20, Math.max(1, parseInt(it.qty) || 1));
    sub += p.price * qty; lines.push([p.name, p.price, qty]);
  }
  const id = db.transaction(() => {
    const oid = db.prepare('INSERT INTO orders(user_id,store_id,total,status,address,lat,lng) VALUES(?,?,?,?,?,?,?)')
      .run(req.user.id, s.id, +(sub + FEE).toFixed(2), 'received', address.trim(), lat ?? null, lng ?? null).lastInsertRowid;
    lines.forEach(l => db.prepare('INSERT INTO order_items VALUES(?,?,?,?)').run(oid, ...l));
    return oid;
  })();
  res.status(201).json({ id });
});

function hydrate(o) {
  o.progress = o.status === 'delivered' ? 1 : 0;
  if (o.status === 'on_the_way') {
    const p = (Date.now() - o.dispatched_at) / TRIP_MS;
    if (p >= 1) { db.prepare("UPDATE orders SET status='delivered' WHERE id=?").run(o.id); o.status = 'delivered'; o.progress = 1; }
    else o.progress = Math.max(0, p);
  }
  return { ...o, store: db.prepare('SELECT name,lat,lng,address FROM stores WHERE id=?').get(o.store_id),
    items: db.prepare('SELECT name,price,qty FROM order_items WHERE order_id=?').all(o.id),
    customer: db.prepare('SELECT name,phone FROM users WHERE id=?').get(o.user_id) };
}

app.get('/api/orders', auth(), (req, res) => {
  const u = req.user;
  const rows = u.role === 'admin' ? db.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 100').all()
    : u.role === 'merchant' ? db.prepare('SELECT * FROM orders WHERE store_id=? ORDER BY id DESC LIMIT 100').all(u.store_id)
    : db.prepare('SELECT * FROM orders WHERE user_id=? ORDER BY id DESC').all(u.id);
  res.json(rows.map(hydrate));
});

app.get('/api/orders/:id', auth(), (req, res) => {
  const o = db.prepare('SELECT * FROM orders WHERE id=?').get(req.params.id);
  if (!o || !canSee(req.user, o)) return fail(res, 404, 'Order not found');
  res.json(hydrate(o));
});

app.post('/api/orders/:id/advance', auth(['merchant', 'admin']), (req, res) => {
  const o = db.prepare('SELECT * FROM orders WHERE id=?').get(req.params.id);
  if (!o || !ownsStore(req.user, o.store_id)) return fail(res, 404, 'Order not found');
  const i = FLOW.indexOf(o.status);
  if (i < 0 || i === FLOW.length - 1) return fail(res, 409, 'This order cannot move forward');
  const next = FLOW[i + 1];
  db.prepare('UPDATE orders SET status=?, dispatched_at=? WHERE id=?').run(next, next === 'on_the_way' ? Date.now() : o.dispatched_at, o.id);
  res.json({ status: next });
});

app.post('/api/orders/:id/cancel', auth(), (req, res) => {
  const o = db.prepare('SELECT * FROM orders WHERE id=?').get(req.params.id);
  if (!o || !canSee(req.user, o)) return fail(res, 404, 'Order not found');
  const limit = req.user.role === 'customer' ? ['received'] : ['received', 'preparing', 'ready'];
  if (!limit.includes(o.status)) return fail(res, 409, 'This order can no longer be cancelled');
  db.prepare("UPDATE orders SET status='cancelled' WHERE id=?").run(o.id); res.json({ ok: true });
});

// ---- Admin ----
app.get('/api/admin/stats', auth(['admin']), (_q, res) => res.json({
  orders: db.prepare("SELECT COUNT(*) n FROM orders WHERE date(created_at)=date('now')").get().n,
  revenue: db.prepare("SELECT COALESCE(SUM(total),0) n FROM orders WHERE status!='cancelled'").get().n,
  customers: db.prepare("SELECT COUNT(*) n FROM users WHERE role='customer'").get().n,
  stores: db.prepare('SELECT COUNT(*) n FROM stores').get().n }));

// Used by scraper/scrape.js and the admin import: upserts products by store code.
export function importProducts(code, list) {
  const s = db.prepare('SELECT id FROM stores WHERE code=?').get(code);
  if (!s) throw new Error('Unknown store code ' + code);
  const up = db.prepare(`INSERT INTO products(store_id,name,price,source_url) VALUES(?,?,?,?)
    ON CONFLICT(store_id,name) DO UPDATE SET price=excluded.price, source_url=excluded.source_url`);
  db.transaction(() => list.forEach(p => up.run(s.id, p.name, p.price, p.url || null)))();
  return list.length;
}
app.post('/api/admin/import', auth(['admin']), (req, res) => {
  try { res.json({ imported: importProducts(req.body.store_code, req.body.products || []) }); }
  catch (e) { fail(res, 400, e.message); }
});

app.use(express.static(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public')));
app.use((err, _q, res, _n) => { console.error(err); fail(res, 500, 'Something went wrong on our side'); });

if (process.argv[1].endsWith('index.js')) {
  seed();
  app.listen(process.env.PORT || 3000, () => console.log('Hamba running on http://localhost:' + (process.env.PORT || 3000)));
}
