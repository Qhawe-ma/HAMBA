const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const TOWN = { lat: -29.0594, lng: 30.5931 };
const STATUS = { received: 'Order received', preparing: 'Being prepared', ready: 'Ready for the driver', on_the_way: 'On the way', delivered: 'Delivered', cancelled: 'Cancelled' };
const FLOW = ['received', 'preparing', 'ready', 'on_the_way', 'delivered'];
const FLOW_LABEL = ['Received', 'Preparing', 'Ready', 'On the way', 'Delivered'];
const SHOP_TYPES = [
  { name: 'Takeaways', category: 'Fast food', image: '/img/catalog/fried.jpg' },
  { name: 'Groceries', category: 'Groceries', image: '/img/catalog/aisle.jpg' },
];
const AISLE_ORDER = ['Fresh Produce', 'Dairy & Eggs', 'Bakery', 'Meat & Poultry', 'Pantry', 'Beverages', 'Snacks', 'Frozen', 'Household', 'Personal Care', 'Chicken', 'Burgers', 'Meals', 'Sides', 'Drinks', 'Kotas', 'Plates', 'Other'];
const FALLBACK = '/img/catalog/placeholder.svg';

function R(n) {
  const v = Number(n) || 0;
  const sign = v < 0 ? '−' : '';
  return `${sign}R${Math.abs(v).toFixed(2)}`;
}
const hh = h => String(h).padStart(2, '0') + ':00';
function when(s) {
  if (!s) return '';
  const d = new Date(String(s).includes('T') ? s : String(s).replace(' ', 'T') + 'Z');
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Johannesburg' }).format(d);
}
function img(src, alt = '', opts = {}) {
  const lazy = opts.lazy === false ? 'eager' : 'lazy';
  const cls = opts.cls ? ` class="${opts.cls}"` : '';
  return `<img${cls} src="${esc(src || FALLBACK)}" alt="${esc(alt)}" loading="${lazy}" decoding="async" onerror="this.onerror=null;this.src='${FALLBACK}'">`;
}
const pinSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="10" r="2.2" fill="currentColor"/></svg>`;
const searchSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="1.8"/><path d="M16 16.5 20 20.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
const bagSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 8h12l-1 12H7L6 8Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 8V7a3 3 0 0 1 6 0v1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
const menuSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;

function emptyCart() { return { store: null, storeName: '', items: {} }; }
function loadCart() {
  try {
    const c = JSON.parse(localStorage.getItem('cart') || 'null');
    if (c && c.items && typeof c.items === 'object') return { store: c.store ?? null, storeName: c.storeName || '', items: c.items };
  } catch { /* ignore a damaged basket */ }
  return emptyCart();
}
const S = {
  token: localStorage.getItem('t'), user: null, cart: loadCart(),
  tab: 'orders', dsid: null, loc: JSON.parse(localStorage.getItem('loc') || 'null'),
  q: '', storeCat: 'All', storeQ: '', homeFilter: 'All',
};
let current = { name: 'home' };
let renderGen = 0;

async function api(path, o = {}) {
  let r;
  try {
    r = await fetch('/api' + path, {
      method: o.method || 'GET',
      body: o.body ? JSON.stringify(o.body) : undefined,
      headers: { 'Content-Type': 'application/json', ...(S.token ? { Authorization: 'Bearer ' + S.token } : {}) },
    });
  } catch { throw new Error('You appear to be offline. Check your connection and try again.'); }
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Something went wrong');
  return d;
}
function toast(m) {
  const t = $('#toast'); if (!t) return;
  t.textContent = m; t.classList.add('on');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2800);
}
const cartCount = () => Object.values(S.cart.items).reduce((a, i) => a + Number(i.q || 0), 0);
const cartTotal = () => Object.values(S.cart.items).reduce((a, i) => a + Number(i.q || 0) * Number(i.price || 0), 0);
function saveCart() { localStorage.setItem('cart', JSON.stringify(S.cart)); }
function setTitle(t) { document.title = t ? `${t} — Hamba` : 'Hamba — Greytown delivery'; }
function sizeNav() {
  const n = document.getElementById('nav');
  if (n) document.documentElement.style.setProperty('--nav-h', n.offsetHeight + 'px');
}

function nav() {
  const u = S.user, n = cartCount();
  const addr = S.loc?.address || 'Set delivery address';
  $('#nav').innerHTML = `
    <button class="icon-btn" type="button" data-act="menu" aria-label="Open menu">${menuSvg}</button>
    <a class="brand" href="#/" aria-label="Hamba home"><img src="/img/mark.svg" alt="" width="28" height="28"></a>
    <button class="loc" type="button" data-act="focus-addr">${pinSvg}<span>${esc(addr)}</span></button>
    <a class="basket" href="#/checkout" aria-label="Basket, ${n} items">
      ${bagSvg}
      <span><b>${n ? R(cartTotal()) : 'R0.00'}</b><small>${n} item${n === 1 ? '' : 's'}</small></span>
    </a>
    ${u && u.role !== 'customer' ? `<a class="quiet-nav" href="#/dash">${u.role === 'admin' ? 'Admin' : 'Dashboard'}</a>` : ''}
    ${u ? '<button class="quiet-nav" type="button" data-act="out">Sign out</button>' : '<a class="quiet-nav" href="#/login">Sign in</a>'}
  `;
  sizeNav();
  paintSide();
}
function paintSide() {
  const el = document.getElementById('side');
  if (!el) return;
  const shop = ['home', 'browse', 'aisle', 'store', 'find', 'product', 'checkout', 'orders'].includes(current.name);
  document.body.classList.toggle('with-side', shop);
  if (!shop) { el.innerHTML = ''; return; }
  if ((current.name === 'store' || current.name === 'product') && S.cur) {
    const s = S.cur;
    const have = new Set((s.products || []).map(p => p.category || 'Other'));
    const cats = [...AISLE_ORDER.filter(c => have.has(c)), ...[...have].filter(c => !AISLE_ORDER.includes(c)).sort()];
    el.innerHTML = `
      <a class="side-shop" href="#/store/${s.id}">
        ${img(s.image, '', { lazy: false, cls: 'side-thumb' })}
        <span><b>${esc(s.name)}</b><small>${s.open ? esc(s.eta || 'Open') : 'Closed'}</small></span>
      </a>
      <button type="button" class="side-link ${S.storeCat === 'All' ? 'on' : ''}" data-act="scat" data-v="All">All items</button>
      ${cats.map(c => `<button type="button" class="side-link ${S.storeCat === c ? 'on' : ''}" data-act="scat" data-v="${esc(c)}">${esc(c)}</button>`).join('')}
    `;
    return;
  }
  const aisles = S.aisles || [];
  el.innerHTML = `
    <a class="side-link ${current.name === 'home' ? 'on' : ''}" href="#/">All shops</a>
    <a class="side-link ${S.browse === 'Fast food' ? 'on' : ''}" href="#/browse/${encodeURIComponent('Fast food')}">Takeaways</a>
    <a class="side-link ${S.browse === 'Groceries' ? 'on' : ''}" href="#/browse/Groceries">Groceries</a>
    <div class="side-label">Aisles</div>
    ${aisles.map(a => `<a class="side-link ${current.name === 'aisle' && S.aisleName === a.name ? 'on' : ''}" href="#/aisle/${encodeURIComponent(a.name)}">${esc(a.name)}</a>`).join('')}
    <div class="side-label">Account</div>
    <a class="side-link" href="#/orders">Orders</a>
    ${S.user && S.user.role !== 'customer' ? `<a class="side-link" href="#/dash">${S.user.role === 'admin' ? 'Admin' : 'Dashboard'}</a>` : ''}
    ${S.user ? '<button class="side-link" type="button" data-act="out">Sign out</button>' : '<a class="side-link" href="#/login">Sign in</a>'}
    <a class="side-link" href="mailto:hello@hamba.co.za">List your shop</a>
  `;
}

function view(html) {
  const root = document.getElementById('view');
  const ae = document.activeElement;
  const keep = ae && root.contains(ae) && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)
    ? { id: ae.id, start: ae.selectionStart, end: ae.selectionEnd } : null;
  root.innerHTML = html;
  root.removeAttribute('aria-busy');
  if (keep?.id) {
    const el = document.getElementById(keep.id);
    if (el) {
      el.focus();
      if (typeof keep.start === 'number' && el.setSelectionRange) {
        try { el.setSelectionRange(keep.start, keep.end); } catch { /* some inputs reject a range */ }
      }
    }
  }
}
function skeleton() {
  return `<div class="sk sk-title"></div><div class="sk sk-line"></div><div class="grid-products">${Array.from({ length: 8 }, () => '<div class="sk sk-card"></div>').join('')}</div>`;
}
function emptyState({ title, body, href, label }) {
  const action = href ? `<a class="btn primary" href="${href}">${esc(label || 'Continue')}</a>` : '';
  return `<div class="empty"><img src="${FALLBACK}" alt=""><h2>${esc(title)}</h2><p>${esc(body)}</p>${action}</div>`;
}
function errorState(message) {
  return `<div class="empty"><img src="${FALLBACK}" alt=""><h2>Something went wrong</h2><p>${esc(message || 'Please try again.')}</p><button class="btn primary" type="button" data-act="retry">Try again</button></div>`;
}
function crumbs(parts) {
  return `<p class="crumbs">${parts.map((p, i) => i === parts.length - 1 ? `<span>${esc(p.label)}</span>` : `<a href="${p.href}">${esc(p.label)}</a><span aria-hidden="true">/</span>`).join(' ')}</p>`;
}

function qtyOf(storeId, productId) {
  if (Number(S.cart.store) !== Number(storeId)) return 0;
  return S.cart.items[productId]?.q || 0;
}
function qtyControl(p, store, q) {
  const blocked = !Number(p.available) || !store.open;
  if (!q) {
    return `<button class="add" type="button" data-act="inc" data-v="${p.id}" data-store="${store.id}" ${blocked ? 'disabled' : ''} aria-label="Add ${esc(p.name)}">+</button>`;
  }
  return `<span class="stepper">
    <button type="button" data-act="dec" data-v="${p.id}" data-store="${store.id}" aria-label="Remove one ${esc(p.name)}">−</button>
    <b>${q}</b>
    <button type="button" data-act="inc" data-v="${p.id}" data-store="${store.id}" ${blocked || q >= 20 ? 'disabled' : ''} aria-label="Add one ${esc(p.name)}">+</button>
  </span>`;
}
function productCard(p, store, opts = {}) {
  const q = qtyOf(store.id, p.id);
  const href = `#/store/${store.id}/p/${p.id}`;
  const meta = [p.pack, opts.showStore ? (p.store_name || store.name) : ''].filter(Boolean).join(' · ');
  return `<article class="pcard ${Number(p.available) ? '' : 'is-out'}">
    <div class="pcard-media">
      <a href="${href}" tabindex="-1" aria-hidden="true">${img(p.image)}${Number(p.available) ? '' : '<span class="flag">Sold out</span>'}</a>
      <div class="pcard-add">${qtyControl(p, store, q)}</div>
    </div>
    <a class="pcard-name" href="${href}">${esc(p.name)}</a>
    <div class="price">${Number(p.available) ? R(p.price) : 'Sold out'}</div>
    ${meta ? `<p class="pcard-meta">${esc(meta)}</p>` : ''}
  </article>`;
}
function menuRow(p, store) {
  const q = qtyOf(store.id, p.id);
  const href = `#/store/${store.id}/p/${p.id}`;
  const desc = [p.pack, p.blurb].filter(Boolean).join(' · ');
  return `<article class="mrow ${Number(p.available) ? '' : 'is-out'}">
    <div class="mrow-copy">
      <a class="mrow-name" href="${href}">${esc(p.name)}</a>
      <div class="price">${Number(p.available) ? R(p.price) : 'Sold out'}</div>
      ${desc ? `<p class="mrow-desc">${esc(desc)}</p>` : ''}
    </div>
    ${qtyControl(p, store, q)}
  </article>`;
}
function photoTile(p, store) {
  const href = `#/store/${store.id}/p/${p.id}`;
  return `<a class="rcard" href="${href}">
    ${img(p.image, '')}
    <b>${esc(p.name)}</b>
    <span class="price">${R(p.price)}</span>
    ${p.pack ? `<span class="muted">${esc(p.pack)}</span>` : ''}
  </a>`;
}
function storeCard(s) {
  return `<a class="scard${s.open ? '' : ' is-shut'}" href="#/store/${s.id}">
    <span class="scard-media">${img(s.image)}${s.open ? '' : '<span class="closed-tag">Closed</span>'}</span>
    <span class="scard-body">
      <strong>${esc(s.name)}</strong>
      <span>${s.open ? esc(s.eta || '') : 'Closed'} · ${esc(s.address)}</span>
    </span>
  </a>`;
}
function aisleTile(href, image, label) {
  return `<a class="aisle" href="${href}">${img(image, '', { lazy: false })}<span>${esc(label)}</span></a>`;
}
function pickFeatured(list, aisles) {
  const out = [];
  for (const name of (aisles || []).map(a => a.name)) {
    const pool = list.filter(x => x.category === name && x.store_category === 'Groceries' && Number(x.available));
    const p = pool.find(x => x.store_open) || pool[0];
    if (p) out.push(p);
  }
  return out.slice(0, 8);
}
function findListed(id) {
  const pools = [S.cur?.products, S.featured, S.list, S.product ? [S.product] : []];
  for (const pool of pools) {
    const p = pool?.find(x => Number(x.id) === Number(id));
    if (p) return p;
  }
  return null;
}
function storeOf(p, storeId) {
  if (S.cur && Number(S.cur.id) === Number(storeId || p.store_id)) return { id: S.cur.id, name: S.cur.name, open: !!S.cur.open };
  return { id: p.store_id, name: p.store_name, open: !!p.store_open };
}
function drawHome() {
  setTitle('');
  const aisles = S.aisles || [];
  const featured = S.featured || [];
  let shops = S.stores || [];
  if (S.homeFilter === 'Open') shops = shops.filter(s => s.open);
  else if (S.homeFilter === 'Groceries' || S.homeFilter === 'Fast food') shops = shops.filter(s => s.category === S.homeFilter);
  const filters = [['All', 'All'], ['Open', 'Open now'], ['Groceries', 'Groceries'], ['Fast food', 'Takeaways']];
  view(`<form class="finder" role="search" data-form="search">${searchSvg}<input id="q" name="q" type="search" placeholder="Search shops and products" value="${esc(S.q || '')}" aria-label="Search shops and products" autocomplete="off"></form>
    <div class="page-head"><h1>Greytown</h1></div>
    <div class="addr-line">
      <input id="addr" placeholder="Street and house number" value="${esc(S.loc?.address || '')}" aria-label="Delivery address" autocomplete="street-address">
      <button class="linkish" type="button" data-act="gps">Use current location</button>
    </div>
    <div class="aisles">
      ${SHOP_TYPES.map(t => aisleTile(`#/browse/${encodeURIComponent(t.category)}`, t.image, t.name)).join('')}
      ${aisles.map(a => aisleTile(`#/aisle/${encodeURIComponent(a.name)}`, a.image, a.name)).join('')}
    </div>
    <div class="chips" role="tablist">
      ${filters.map(([v, label]) => `<button class="chip ${S.homeFilter === v ? 'on' : ''}" type="button" data-act="hfilter" data-v="${v}">${label}</button>`).join('')}
    </div>
    <h2 class="block-title">${shops.length} near you</h2>
    <div class="grid-stores" id="stores">${shops.length ? shops.map(storeCard).join('') : '<p class="muted">No shops match that filter.</p>'}</div>
    ${featured.length ? `<h2 class="block-title">Popular</h2><div class="rail">${featured.map(p => photoTile(p, storeOf(p))).join('')}</div>` : ''}`);
}

function drawBrowse() {
  const cat = S.browse;
  setTitle(cat);
  const list = (S.stores || []).filter(s => s.category === cat);
  view(`${crumbs([{ href: '#/', label: 'Shops' }, { label: cat || 'Shops' }])}
    <div class="sec-head"><h1>${esc(cat || 'Shops')}</h1></div>
    <div class="grid-stores">${list.length ? list.map(storeCard).join('') : '<p class="muted">No shops in this group yet.</p>'}</div>`);
}

function drawAisle() {
  const name = S.aisleName;
  setTitle(name);
  const list = S.list || [];
  view(`${crumbs([{ href: '#/', label: 'Shops' }, { label: name || 'Aisle' }])}
    <div class="sec-head"><h1>${esc(name || 'Aisle')}</h1></div>
    <p class="muted" style="margin-top:0">${list.length} product${list.length === 1 ? '' : 's'} from groceries in Greytown.</p>
    ${list.length ? `<div class="pgrid">${list.map(p => productCard(p, storeOf(p), { showStore: true })).join('')}</div>` : emptyState({ title: 'Nothing in this aisle', body: 'Try another aisle, or search for the product by name.', href: '#/', label: 'Back to shops' })}`);
}

function drawFind() {
  const q = (S.q || '').trim();
  setTitle(q ? `Search “${q}”` : 'Search');
  const ql = q.toLowerCase();
  const shops = ql ? (S.stores || []).filter(s => `${s.name} ${s.category} ${s.blurb || ''}`.toLowerCase().includes(ql)) : [];
  const products = S.list || [];
  view(`<h1>Search</h1>
    ${q ? '' : '<p class="lede">Search for milk, bread, a kota, or a shop.</p>'}
    ${q && !shops.length && !products.length ? emptyState({ title: 'No matches', body: `Nothing on Hamba matches “${q}”. Try a shorter word.`, href: '#/', label: 'Browse shops' }) : ''}
    ${shops.length ? `<section class="sec"><div class="sec-head"><h2>Shops</h2></div><div class="grid-stores">${shops.map(storeCard).join('')}</div></section>` : ''}
    ${products.length ? `<h2 class="block-title">Products</h2><div class="pgrid">${products.map(p => productCard(p, storeOf(p), { showStore: true })).join('')}</div>` : ''}`);
}

function drawStore() {
  const s = S.cur;
  if (!s) return;
  setTitle(s.name);
  document.body.classList.remove('has-basket');
  const have = new Set(s.products.map(p => p.category || 'Other'));
  const cats = ['All', ...AISLE_ORDER.filter(c => have.has(c)), ...[...have].filter(c => !AISLE_ORDER.includes(c)).sort()];
  const q = (S.storeQ || '').trim().toLowerCase();
  const list = s.products.filter(p => {
    const catOk = S.storeCat === 'All' || (p.category || 'Other') === S.storeCat;
    const blob = `${p.name} ${p.brand || ''} ${p.pack || ''}`.toLowerCase();
    return catOk && (!q || blob.includes(q));
  }).slice().sort((a, b) => Number(b.available) - Number(a.available) || a.name.localeCompare(b.name));
  const store = { id: s.id, name: s.name, open: !!s.open };
  const groups = S.storeCat === 'All' && !q ? cats.filter(c => c !== 'All') : [S.storeCat];
  const grid = groups.map(cat => {
    const items = list.filter(p => (S.storeCat !== 'All' || q) ? true : (p.category || 'Other') === cat);
    if (!items.length) return '';
    const cards = `<div class="mgrid">${items.map(p => menuRow(p, store)).join('')}</div>`;
    return S.storeCat === 'All' && !q ? `<section class="block"><h2 class="block-title">${esc(cat)}</h2>${cards}</section>` : cards;
  }).join('');
  const popular = [];
  for (const cat of cats) {
    if (cat === 'All') continue;
    const hit = s.products.find(p => (p.category || 'Other') === cat && Number(p.available));
    if (hit) popular.push(hit);
    if (popular.length === 8) break;
  }
  view(`<form class="finder" role="search" onsubmit="return false">${searchSvg}<input id="sq" type="search" placeholder="Search ${esc(s.name)}" value="${esc(S.storeQ || '')}" aria-label="Search this shop"></form>
    <div class="shop-head">
      ${img(s.image, '', { lazy: false, cls: 'shop-thumb' })}
      <div>
        <h1>${esc(s.name)}</h1>
        <p class="muted">${esc(s.blurb || '')} ${esc(s.address)} · ${s.open ? esc(s.eta) : 'Closed'} · ${hh(s.open_h)}–${hh(s.close_h)}</p>
        <span class="pill ${s.open ? 'ok' : 'no'}">${s.open ? 'Open now' : 'Closed'}</span>
      </div>
    </div>
    ${s.open ? '' : `<div class="banner-note">${esc(s.name)} is closed right now. You can look around. Orders open again at ${hh(s.open_h)}.</div>`}
    ${popular.length && S.storeCat === 'All' && !q ? `<h2 class="block-title">Popular</h2><div class="rail">${popular.map(p => photoTile(p, store)).join('')}</div>` : ''}
    ${list.length ? grid : '<p class="muted">Nothing in this shop matches.</p>'}`);
  paintSide();
}

function drawProduct() {
  const s = S.cur, p = S.product;
  if (!s || !p) return;
  setTitle(p.name);
  const store = { id: s.id, name: s.name, open: !!s.open };
  const q = qtyOf(s.id, p.id);
  const related = s.products.filter(x => x.category === p.category && x.id !== p.id).slice(0, 4);
  const control = !Number(p.available)
    ? '<p class="banner-note">Sold out.</p>'
    : !s.open
      ? `<p class="banner-note">${esc(s.name)} is closed, so this cannot be added yet.</p>`
      : (q ? qtyControl(p, store, q) : `<button class="btn primary" type="button" data-act="inc" data-v="${p.id}" data-store="${s.id}">Add to basket</button>`);
  view(`<p class="crumbs"><a href="#/store/${s.id}">${esc(s.name)}</a></p>
    <div class="detail">
      <div class="detail-media">${img(p.image, p.name, { lazy: false })}</div>
      <div class="detail-copy">
        <p class="price detail-price">${Number(p.available) ? R(p.price) : 'Sold out'}</p>
        <h1>${esc(p.name)}</h1>
        <p class="muted">${esc([p.pack, p.category].filter(Boolean).join(' · '))}</p>
        <p>${esc(p.blurb || '')}</p>
        <p class="muted">${esc(s.name)} · ${s.open ? esc(s.eta) : 'Closed'} · ${R(s.delivery_fee)} delivery</p>
        <div class="detail-act">${control}</div>
      </div>
    </div>
    ${related.length ? `<h2 class="block-title">More in ${esc(p.category || 'this shop')}</h2><div class="rail">${related.map(x => photoTile(x, store)).join('')}</div>` : ''}`);
}

function drawCheckout() {
  const s = S.checkoutStore;
  const items = Object.values(S.cart.items);
  const fee = s?.delivery_fee ?? 25;
  const sub = cartTotal();
  setTitle('Basket');
  if (!items.length) {
    view(emptyState({ title: 'Your basket is empty', body: 'Add something from a shop in Greytown.', href: '#/', label: 'Browse shops' }));
    return;
  }
  view(`<h1>Basket</h1>
    <p class="muted" style="margin-top:0">From ${esc(s?.name || S.cart.storeName || 'your shop')}. Pay the driver when it arrives.</p>
    ${s && !s.open ? `<div class="banner-note">${esc(s.name)} is closed right now, so this order cannot be placed yet.</div>` : ''}
    <div class="split">
      <div class="panel">
        ${items.map(i => `<div class="line">
          ${img(i.image, '')}
          <div><b>${esc(i.name)}</b><div class="muted">${esc(i.pack || '')}</div><div class="price">${R(i.price)}</div></div>
          <span class="stepper">
            <button type="button" data-act="dec" data-cart="1" data-v="${i.id}" aria-label="Remove one ${esc(i.name)}">−</button>
            <b>${i.q}</b>
            <button type="button" data-act="inc" data-cart="1" data-v="${i.id}" ${i.q >= 20 ? 'disabled' : ''} aria-label="Add one ${esc(i.name)}">+</button>
          </span>
        </div>`).join('')}
      </div>
      <aside class="panel summary">
        <h2>Delivery</h2>
        <div class="totals">
          <div><span>Subtotal</span><span>${R(sub)}</span></div>
          <div><span>Delivery</span><span>${R(fee)}</span></div>
          <div class="grand"><span>Total</span><span>${R(sub + fee)}</span></div>
        </div>
        <label class="field">Delivery address
          <input id="addr" value="${esc(S.loc?.address || '')}" placeholder="Street, house number, area" autocomplete="street-address">
        </label>
        <p class="muted">${S.loc?.lat ? 'A GPS pin is saved with this address.' : 'No GPS pin yet. You can type the address, or use your current location.'}</p>
        <button class="linkish" type="button" data-act="gps">Use current location</button>
        <button class="btn primary block" type="button" data-act="place" ${s && !s.open ? 'disabled' : ''}>Place order</button>
      </aside>
    </div>`);
}

function statusPill(status) {
  const kind = status === 'delivered' ? 'ok' : status === 'cancelled' ? 'no' : 'wait';
  return `<span class="pill ${kind}">${esc(STATUS[status] || status)}</span>`;
}

const views = {
  async home() {
    current.name = 'home';
    const [stores, aisles] = await Promise.all([api('/stores'), api('/aisles')]);
    S.stores = stores;
    S.aisles = aisles;
    S.featured = pickFeatured(await api('/products?limit=400'), aisles);
    drawHome();
  },
  async browse(cat) {
    current.name = 'browse';
    S.browse = cat || '';
    S.stores = await api('/stores');
    drawBrowse();
  },
  async aisle(name) {
    current.name = 'aisle';
    S.aisleName = name || '';
    S.list = name ? await api('/products?category=' + encodeURIComponent(name) + '&limit=300') : [];
    drawAisle();
  },
  async find(q, soft) {
    current.name = 'find';
    S.q = q || '';
    if (!soft) S.stores = await api('/stores');
    const query = S.q.trim();
    const mine = query;
    S.list = query ? await api('/products?q=' + encodeURIComponent(query) + '&limit=60') : [];
    if (S.q.trim() !== mine || current.name !== 'find') return;
    drawFind();
  },
  async store(id) {
    current.name = 'store';
    const s = await api('/stores/' + id);
    if (!S.cur || Number(S.cur.id) !== Number(s.id)) { S.storeCat = 'All'; S.storeQ = ''; }
    S.cur = s;
    drawStore();
  },
  async product(storeId, productId) {
    current.name = 'product';
    const s = await api('/stores/' + storeId);
    S.cur = s;
    const p = s.products.find(x => Number(x.id) === Number(productId));
    if (!p) {
      setTitle('Not found');
      view(emptyState({ title: 'Product not found', body: 'It may have been removed from this shop.', href: `#/store/${storeId}`, label: 'Back to the shop' }));
      return;
    }
    S.product = p;
    drawProduct();
  },
  async login() { current.name = 'login'; authForm('login'); },
  async register() { current.name = 'register'; authForm('register'); },
  async checkout() {
    current.name = 'checkout';
    if (!cartCount()) { drawCheckout(); return; }
    if (!S.user) { S.next = '#/checkout'; location.hash = '#/login'; return; }
    S.checkoutStore = await api('/stores/' + S.cart.store);
    drawCheckout();
  },
  async orders() {
    current.name = 'orders';
    if (!S.user) { S.next = '#/orders'; location.hash = '#/login'; return; }
    const list = await api('/orders');
    setTitle('Orders');
    view(`<h1>Your orders</h1>
      ${list.length ? list.map(o => `<a class="panel" href="#/order/${o.id}" style="display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:12px">
        <span><b>${esc(o.store?.name || 'Shop')}</b><br><span class="muted">#${o.id} · ${esc(when(o.created_at))} · ${esc(STATUS[o.status] || o.status)}</span></span>
        <span><b>${R(o.total)}</b></span>
      </a>`).join('') : emptyState({ title: 'No orders yet', body: 'When you place an order, it will show up here.', href: '#/', label: 'Browse shops' })}`);
  },
  async order(id) {
    current.name = 'order';
    let o = await api('/orders/' + id);
    let photos = {};
    try {
      const s = await api('/stores/' + o.store_id);
      photos = Object.fromEntries(s.products.map(p => [p.name, p.image]));
    } catch { /* the order still renders without photos */ }
    setTitle('Order ' + o.id);
    view(`<div>
      ${crumbs([{ href: '#/orders', label: 'Orders' }, { label: 'Order ' + o.id }])}
      <h1>Order ${o.id}</h1>
      <p class="muted" style="margin-top:0">${esc(o.store?.name || '')} · ${esc(o.address || '')}</p>
      <p id="st" style="font-size:20px;font-weight:700;margin:8px 0"></p>
      <ol class="tracker" id="steps"></ol>
      <div id="map"></div>
      <div class="panel" id="det"></div>
      <div id="act" style="margin-top:12px"></div>
    </div>`);
    const mapEl = document.getElementById('map');
    const map = L.map(mapEl).setView([o.store.lat, o.store.lng], 14);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(map);
    const dest = [o.lat ?? TOWN.lat, o.lng ?? TOWN.lng], src = [o.store.lat, o.store.lng];
    L.marker(src).addTo(map).bindTooltip(o.store.name);
    L.marker(dest).addTo(map).bindTooltip('You');
    const driver = L.circleMarker(src, { radius: 9, color: '#14211C', fillColor: '#0F6E56', fillOpacity: 1, weight: 3 });
    map.fitBounds([src, dest], { padding: [40, 40] });
    const paint = () => {
      if (!$('#st')) return;
      const idx = FLOW.indexOf(o.status);
      $('#st').textContent = STATUS[o.status] || o.status;
      if (o.status === 'cancelled') {
        $('#steps').innerHTML = '';
        if (mapEl) mapEl.hidden = true;
      } else {
        $('#steps').innerHTML = FLOW_LABEL.map((label, i) => `<li class="${i < idx ? 'done' : i === idx ? 'current' : ''}">${label}</li>`).join('');
      }
      if (o.status === 'on_the_way' || o.status === 'delivered') {
        driver.addTo(map).setLatLng([src[0] + (dest[0] - src[0]) * o.progress, src[1] + (dest[1] - src[1]) * o.progress]);
      }
      $('#det').innerHTML = o.items.map(i => `<div class="line">${img(photos[i.name] || '', '')}<div><b>${i.qty} × ${esc(i.name)}</b></div><span>${R(i.qty * i.price)}</span></div>`).join('')
        + `<div class="totals"><div class="grand"><span>Total with delivery</span><b>${R(o.total)}</b></div></div>`;
      $('#act').innerHTML = o.status === 'received' && S.user?.role === 'customer'
        ? `<button class="btn danger" type="button" data-act="cancel" data-v="${o.id}">Cancel order</button>` : '';
    };
    paint();
    S.poll = setInterval(async () => {
      try {
        o = await api('/orders/' + id);
        paint();
        if (['delivered', 'cancelled'].includes(o.status) || !$('#st')) clearInterval(S.poll);
      } catch { /* keep the last status on screen */ }
    }, 4000);
  },
  async dash() {
    current.name = 'dash';
    if (!S.user || S.user.role === 'customer') { location.hash = '#/login'; return; }
    await drawDash();
    S.poll = setInterval(() => {
      if (current.name === 'dash' && S.tab === 'orders' && !document.activeElement?.matches('input,select,textarea')) drawDash();
    }, 5000);
  },
};

function authForm(mode) {
  const reg = mode === 'register';
  setTitle(reg ? 'Create account' : 'Sign in');
  view(`<div class="auth-wrap"><div class="panel auth">
    <h1>${reg ? 'Create your account' : 'Sign in'}</h1>
    <p class="muted" style="margin-top:0">${reg ? 'Already have one?' : 'New to Hamba?'}
      <a href="#/${reg ? 'login' : 'register'}" style="color:var(--primary);font-weight:700">${reg ? 'Sign in' : 'Create an account'}</a></p>
    <form class="stack" data-form="${mode}">
      ${reg ? '<label class="field">Full name<input name="name" autocomplete="name" required></label><label class="field">Cell number<input name="phone" type="tel" autocomplete="tel" inputmode="tel"></label>' : ''}
      <label class="field">Email<input name="email" type="email" autocomplete="email" required></label>
      <label class="field">Password<input name="password" type="password" minlength="8" autocomplete="${reg ? 'new' : 'current'}-password" required></label>
      <p class="err" id="fe"></p>
      <button class="btn primary" type="submit">${reg ? 'Create account' : 'Sign in'}</button>
    </form>
  </div></div>`);
}

async function drawDash() {
  const u = S.user;
  const stores = await api('/stores');
  const sid = S.dsid || (u.role === 'admin' ? stores[0].id : u.store_id);
  const st = await api('/stores/' + sid);
  const orders = (await api('/orders')).filter(o => o.store_id === sid);
  const stats = u.role === 'admin' ? await api('/admin/stats') : null;
  const tabs = [['orders', 'Orders'], ['products', 'Products'], ['hours', 'Hours and status']];
  const body = {
    orders: () => orders.length ? orders.map(o => `<article class="panel order-card">
      <div class="top"><div><b>#${o.id} · ${esc(o.customer?.name || 'Customer')}</b>${o.customer?.phone ? `<div class="muted">${esc(o.customer.phone)}</div>` : ''}</div>${statusPill(o.status)}</div>
      <p class="muted">${o.items.map(i => i.qty + ' × ' + esc(i.name)).join(', ')}</p>
      <p class="muted" style="margin-top:0">Deliver to ${esc(o.address)}. Total ${R(o.total)}</p>
      ${['received', 'preparing', 'ready'].includes(o.status) ? `<div class="actions"><button class="btn primary small" type="button" data-act="adv" data-v="${o.id}">${{ received: 'Accept order', preparing: 'Mark ready', ready: 'Send driver' }[o.status]}</button><button class="btn danger small" type="button" data-act="cancel" data-v="${o.id}">Cancel</button></div>` : ''}
    </article>`).join('') : '<p class="muted">No orders for this shop yet.</p>',
    products: () => `<div class="panel"><p class="muted" style="margin-top:0">${st.products.length} products. Prices are what customers pay.</p>
      ${st.products.map(p => `<div class="prow">
        <div><b>${esc(p.name)}</b><div class="muted">${esc([p.category, p.pack].filter(Boolean).join(' · '))}</div></div>
        <input class="price-input" type="number" step="0.01" min="0" value="${Number(p.price).toFixed(2)}" data-chg="price" data-v="${p.id}" aria-label="Price for ${esc(p.name)}">
        <button class="btn quiet small" type="button" data-act="avail" data-v="${p.id}" data-a="${p.available ? 1 : 0}">${p.available ? 'Mark sold out' : 'Back in stock'}</button>
        <button class="btn danger small" type="button" data-act="del" data-v="${p.id}">Remove</button>
      </div>`).join('')}
      <form class="inline-form" data-form="product">
        <input name="name" placeholder="New product" required aria-label="New product name">
        <input name="price" type="number" step="0.01" min="0" placeholder="Price" required aria-label="Price">
        <input name="category" placeholder="Aisle" aria-label="Aisle">
        <input name="pack" placeholder="Pack size" aria-label="Pack size">
        <button class="btn primary" type="submit">Add</button>
      </form></div>`,
    hours: () => `<div class="panel">
      <p>Status now: <span class="pill ${st.open ? 'ok' : 'no'}">${st.open ? 'Open' : 'Closed'}</span></p>
      <label class="field" style="max-width:280px">Mode
        <select data-chg="mode">
          <option value="auto" ${st.mode === 'auto' ? 'selected' : ''}>Follow trading hours</option>
          <option value="open" ${st.mode === 'open' ? 'selected' : ''}>Force open</option>
          <option value="closed" ${st.mode === 'closed' ? 'selected' : ''}>Force closed</option>
        </select>
      </label>
      <p class="muted">Hours use South African time. Opens ${hh(st.open_h)}, closes ${hh(st.close_h)}.</p>
      <div class="addr-row">
        <label class="field">Opens<input class="price-input" type="number" min="0" max="23" value="${st.open_h}" data-chg="open_h" aria-label="Opening hour"></label>
        <label class="field">Closes<input class="price-input" type="number" min="1" max="24" value="${st.close_h}" data-chg="close_h" aria-label="Closing hour"></label>
      </div>
    </div>`,
  };
  setTitle(u.role === 'admin' ? 'Admin' : 'Dashboard');
  view(`<h1>${u.role === 'admin' ? 'Admin' : 'Shop dashboard'}</h1>
    ${stats ? `<div class="stats">${[['Orders today', stats.orders], ['Revenue', R(stats.revenue)], ['Customers', stats.customers], ['Shops', stats.stores]].map(x => `<div class="stat"><span>${x[0]}</span><b>${x[1]}</b></div>`).join('')}</div>
      <label class="field" style="max-width:320px;margin-bottom:8px">Shop<select data-chg="dsid">${stores.map(x => `<option value="${x.id}" ${Number(x.id) === Number(sid) ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>` : `<p class="muted" style="margin-top:0">${esc(st.name)}</p>`}
    <div class="tabs" role="tablist">${tabs.map(t => `<button class="chip ${S.tab === t[0] ? 'on' : ''}" type="button" role="tab" aria-selected="${S.tab === t[0]}" data-act="tab" data-v="${t[0]}">${t[1]}</button>`).join('')}</div>
    ${body[S.tab]()}`);
  S.dst = st;
}

function refresh() {
  saveCart();
  nav();
  if (current.name === 'home') drawHome();
  else if (current.name === 'store') drawStore();
  else if (current.name === 'product') drawProduct();
  else if (current.name === 'aisle') drawAisle();
  else if (current.name === 'find') drawFind();
  else if (current.name === 'checkout') drawCheckout();
  else if (current.name === 'browse') drawBrowse();
}
function writeQty(store, product, qty) {
  if (Number(S.cart.store) !== Number(store.id)) S.cart = { store: Number(store.id), storeName: store.name, items: {} };
  if (qty <= 0) delete S.cart.items[product.id];
  else S.cart.items[product.id] = {
    id: product.id, name: product.name, price: product.price, q: qty,
    pack: product.pack || '', image: product.image || '', brand: product.brand || '',
  };
  if (!cartCount()) S.cart = emptyCart();
  refresh();
}
function changeQty(store, product, delta) {
  const same = Number(S.cart.store) === Number(store.id);
  const cur = same ? (S.cart.items[product.id]?.q || 0) : 0;
  const next = cur + delta;
  if (delta > 0) {
    if (!store.open) return toast(`${store.name} is closed right now`);
    if (!Number(product.available)) return toast('That item is sold out');
    if (next > 20) return toast('That is the most you can add of one item');
  }
  if (next < 0) return;
  if (!same && cartCount() && next > 0) {
    S.pending = { store, product, qty: next };
    $('#confirm-copy').textContent = `Your basket is from ${S.cart.storeName || 'another shop'}. Hamba collects from one shop at a time, so this will clear it.`;
    $('#confirm').showModal();
    return;
  }
  writeQty(store, product, next);
}
function adjustCartLine(id, delta) {
  const it = S.cart.items[id];
  if (!it) return;
  const q = it.q + delta;
  if (q > 20) return toast('That is the most you can add of one item');
  if (q <= 0) delete S.cart.items[id];
  else it.q = q;
  if (!cartCount()) S.cart = emptyCart();
  refresh();
}

function parts() { return location.hash.replace(/^#/, '').split('/').filter(Boolean); }
async function render() {
  const p = parts();
  const head = p[0] || 'home';
  current = { name: head };
  document.body.classList.remove('has-basket');
  if (head === 'store' && p[2] === 'p') return views.product(p[1], p[3]);
  if (head === 'aisle') return views.aisle(decodeURIComponent(p.slice(1).join('/')));
  if (head === 'browse') return views.browse(decodeURIComponent(p.slice(1).join('/')));
  if (head === 'find') return views.find(decodeURIComponent(p.slice(1).join('/')));
  if (!views[head]) {
    setTitle('Not found');
    view(emptyState({ title: 'Page not found', body: 'That link does not go anywhere on Hamba.', href: '#/', label: 'Back to shops' }));
    return;
  }
  return views[head](p[1]);
}
async function route() {
  const my = ++renderGen;
  clearInterval(S.poll);
  const timer = setTimeout(() => {
    if (my !== renderGen) return;
    view(skeleton());
    document.getElementById('view').setAttribute('aria-busy', 'true');
  }, 160);
  try { await render(); }
  catch (e) { if (my === renderGen) view(errorState(e.message)); }
  clearTimeout(timer);
  if (my !== renderGen) return;
  document.body.classList.remove('side-open');
  nav();
  scrollTo(0, 0);
  if (S.focusAddr) {
    S.focusAddr = false;
    const i = document.getElementById('addr');
    if (i) { i.focus(); i.scrollIntoView({ block: 'center' }); }
  }
}
function signIn(d) {
  S.token = d.token; S.user = d.user; localStorage.setItem('t', d.token);
  const n = S.next || (d.user.role === 'customer' ? '#/' : '#/dash');
  S.next = null;
  if (location.hash === n) route();
  else location.hash = n;
}

document.addEventListener('click', async e => {
  if (e.target.closest('#side')) document.body.classList.remove('side-open');
  const b = e.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act, v = b.dataset.v;
  try {
    if (a === 'scat') {
      S.storeCat = v;
      current.name = 'store';
      if (S.cur) history.replaceState(null, '', '#/store/' + S.cur.id);
      drawStore();
    }
    else if (a === 'hfilter') { S.homeFilter = v; drawHome(); }
    else if (a === 'menu') document.body.classList.toggle('side-open');
    else if (a === 'menu-close') document.body.classList.remove('side-open');
    else if (a === 'focus-addr') {
      const home = location.hash === '' || location.hash === '#' || location.hash === '#/';
      S.focusAddr = true;
      if (home) {
        S.focusAddr = false;
        const i = document.getElementById('addr');
        if (i) { i.focus(); i.scrollIntoView({ block: 'center' }); }
      } else location.hash = '#/';
    }
    else if (a === 'go') {
      const t = ($('#addr')?.value || '').trim();
      if (t) { S.loc = { ...(S.loc || {}), address: t }; localStorage.setItem('loc', JSON.stringify(S.loc)); nav(); }
      else toast('Enter a delivery address');
      document.getElementById('stores')?.scrollIntoView({ behavior: 'smooth' });
    }
    else if (a === 'inc' || a === 'dec') {
      const delta = a === 'inc' ? 1 : -1;
      if (b.dataset.cart) { adjustCartLine(v, delta); return; }
      const p = findListed(v);
      if (!p) return;
      changeQty(storeOf(p, b.dataset.store || p.store_id), p, delta);
    }
    else if (a === 'switch-ok') {
      const pending = S.pending;
      S.pending = null;
      $('#confirm').close();
      if (pending) writeQty(pending.store, pending.product, pending.qty);
    }
    else if (a === 'switch-no') { S.pending = null; $('#confirm').close(); }
    else if (a === 'out') {
      S.token = S.user = null;
      S.cart = emptyCart();
      localStorage.removeItem('t');
      localStorage.removeItem('cart');
      if (location.hash === '' || location.hash === '#' || location.hash === '#/') route();
      else location.hash = '#/';
    }
    else if (a === 'gps') {
      if (!navigator.geolocation) return toast('This browser cannot share your location. Type your address instead.');
      const label = b.textContent;
      b.textContent = 'Finding you…';
      navigator.geolocation.getCurrentPosition(p => {
        S.loc = { address: `My current location (${p.coords.latitude.toFixed(4)}, ${p.coords.longitude.toFixed(4)})`, lat: p.coords.latitude, lng: p.coords.longitude };
        localStorage.setItem('loc', JSON.stringify(S.loc));
        const field = document.getElementById('addr');
        if (field) field.value = S.loc.address;
        b.textContent = 'Location saved';
        nav();
        toast('Location saved');
      }, () => { b.textContent = label; toast('Location blocked. Allow it in your browser, or type your address.'); }, { timeout: 10000, enableHighAccuracy: true });
    }
    else if (a === 'place') {
      const address = ($('#addr')?.value || '').trim();
      if (!address) return toast('Enter a delivery address');
      if (address !== S.loc?.address) S.loc = { ...(S.loc || {}), address };
      localStorage.setItem('loc', JSON.stringify(S.loc));
      b.disabled = true; b.textContent = 'Placing order…';
      try {
        const r = await api('/orders', { method: 'POST', body: {
          store_id: S.cart.store, address, lat: S.loc.lat, lng: S.loc.lng,
          items: Object.values(S.cart.items).map(i => ({ id: i.id, qty: i.q })),
        } });
        S.cart = emptyCart(); saveCart();
        location.hash = '#/order/' + r.id;
      } catch (err) { b.disabled = false; b.textContent = 'Place order'; toast(err.message); }
    }
    else if (a === 'cancel') { await api(`/orders/${v}/cancel`, { method: 'POST' }); toast('Order cancelled'); route(); }
    else if (a === 'adv') { await api(`/orders/${v}/advance`, { method: 'POST' }); drawDash(); }
    else if (a === 'tab') { S.tab = v; drawDash(); }
    else if (a === 'avail') { await api('/products/' + v, { method: 'PATCH', body: { available: b.dataset.a !== '1' } }); drawDash(); }
    else if (a === 'del') { if (confirm('Remove this product?')) { await api('/products/' + v, { method: 'DELETE' }); drawDash(); } }
    else if (a === 'retry') route();
  } catch (err) { toast(err.message); }
});

document.addEventListener('change', async e => {
  const t = e.target;
  if (t.id === 'addr') {
    S.loc = { ...(S.loc || {}), address: t.value.trim() };
    localStorage.setItem('loc', JSON.stringify(S.loc));
    nav();
    return;
  }
  const k = t.dataset.chg; if (!k) return;
  try {
    if (k === 'dsid') { S.dsid = +t.value; return drawDash(); }
    if (k === 'price') await api('/products/' + t.dataset.v, { method: 'PATCH', body: { price: t.value } });
    else await api('/stores/' + S.dst.id, { method: 'PATCH', body: { [k]: k === 'mode' ? t.value : +t.value } });
    toast('Saved');
    drawDash();
  } catch (err) { toast(err.message); }
});

document.addEventListener('submit', async e => {
  const f = e.target.closest('[data-form]'); if (!f) return;
  e.preventDefault();
  if (f.dataset.busy) return;
  f.dataset.busy = '1';
  const d = Object.fromEntries(new FormData(f)), m = f.dataset.form;
  try {
    if (m === 'search') {
      S.q = (d.q || '').trim();
      const next = '#/find/' + encodeURIComponent(S.q);
      if (location.hash === next) { if (current.name === 'find') views.find(S.q, true); }
      else location.hash = next;
    } else if (m === 'login' || m === 'register') signIn(await api('/auth/' + m, { method: 'POST', body: d }));
    else if (m === 'product') { await api(`/stores/${S.dst.id}/products`, { method: 'POST', body: d }); toast('Product added'); drawDash(); }
  } catch (err) {
    const el = $('#fe'); if (el) el.textContent = err.message; else toast(err.message);
  } finally { delete f.dataset.busy; }
});

document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'addr') {
    S.loc = { ...(S.loc || {}), address: t.value.trim() };
    localStorage.setItem('loc', JSON.stringify(S.loc));
    const label = document.querySelector('#nav .loc span');
    if (label) label.innerHTML = `<small>Deliver to</small>${esc(S.loc.address || 'Set your address')}`;
  } else if (t.id === 'q' && current.name === 'find') {
    S.q = t.value;
    history.replaceState(null, '', '#/find/' + encodeURIComponent(S.q));
    clearTimeout(S.qt);
    S.qt = setTimeout(() => { if (current.name === 'find') views.find(S.q, true); }, 180);
  } else if (t.id === 'sq') {
    S.storeQ = t.value;
    drawStore();
  }
});

document.getElementById('confirm').addEventListener('close', () => { S.pending = null; });
window.addEventListener('resize', sizeNav);
window.addEventListener('hashchange', route);
(async () => {
  if (S.token) { try { S.user = await api('/auth/me'); } catch { S.token = null; localStorage.removeItem('t'); } }
  route();
})();
