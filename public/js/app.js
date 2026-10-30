const $ = s => document.querySelector(s), R = n => 'R' + Number(n).toFixed(2);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const TOWN = { lat: -29.0594, lng: 30.5931 };
const STATUS = { received: 'Order received', preparing: 'Being prepared', ready: 'Ready for the driver', on_the_way: 'On the way', delivered: 'Delivered', cancelled: 'Cancelled' };
const FOOD = {
  'Fast food': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80',
  Groceries: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80',
  default: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80',
};
const HERO_IMG = 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1400&q=80';
const pinSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 22s7-7.2 7-12a7 7 0 1 0-14 0c0 4.8 7 12 7 12Z" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="10" r="2.4" fill="currentColor"/></svg>`;
const cartSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 5h2l1.4 9.2a2 2 0 0 0 2 1.7h8.3a2 2 0 0 0 2-1.6L20 8H7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="10" cy="20" r="1.3" fill="currentColor"/><circle cx="17" cy="20" r="1.3" fill="currentColor"/></svg>`;

const S = { token: localStorage.getItem('t'), user: null, cart: { store: null, items: {} }, cat: 'All', tab: 'orders', dsid: null,
  loc: JSON.parse(localStorage.getItem('loc') || 'null') };

async function api(path, o = {}) {
  const r = await fetch('/api' + path, { method: o.method || 'GET', body: o.body ? JSON.stringify(o.body) : undefined,
    headers: { 'Content-Type': 'application/json', ...(S.token ? { Authorization: 'Bearer ' + S.token } : {}) } });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Something went wrong');
  return d;
}
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2600); }
const cartCount = () => Object.values(S.cart.items).reduce((a, i) => a + i.q, 0);
const cartTotal = () => Object.values(S.cart.items).reduce((a, i) => a + i.q * i.price, 0);
const foodFor = s => FOOD[s.category] || FOOD.default;
const locLabel = () => S.loc?.address || 'Set delivery address';

function nav() {
  const u = S.user, n = cartCount(), total = cartTotal();
  $('#nav').innerHTML = `
    <a class="brand" href="#/" aria-label="Hamba home">
      <span class="brand-mark">H</span>
      <span class="brand-name">hamba</span>
    </a>
    <button class="loc-chip" type="button" data-act="focus-addr" title="Change delivery address">
      ${pinSvg}<span>${esc(locLabel())}${S.loc?.address ? '' : ' <em>· Greytown</em>'}</span>
    </button>
    <div class="nav-right">
      ${u ? '<a href="#/orders">Orders</a>' : ''}
      ${u && u.role !== 'customer' ? `<a href="#/dash">${u.role === 'admin' ? 'Admin' : 'Dashboard'}</a>` : ''}
      <a class="cart-pill" href="#/checkout">${cartSvg}<span class="cart-label">${R(total)} / ${n} item${n === 1 ? '' : 's'}</span>${n ? '<i class="dot" aria-hidden="true"></i>' : ''}</a>
      ${u ? '<button type="button" data-act="out">Sign out</button>' : '<a href="#/login">Sign in</a>'}
    </div>`;
}
const view = html => { $('#view').innerHTML = html; };

const views = {
  async home() { S.stores = await api('/stores'); drawHome(); },

  async store(id) {
    const s = S.cur = await api('/stores/' + id); drawStore();
  },

  async login() { authForm('login'); },
  async register() { authForm('register'); },

  async checkout() {
    if (!cartCount()) return view('<div class="shell pad"><p>Your cart is empty. <a href="#/"><u>Browse stores</u></a></p></div>');
    if (!S.user) { S.next = '#/checkout'; return location.hash = '#/login'; }
    const items = Object.values(S.cart.items);
    view(`<div class="shell"><h2>Checkout</h2><p class="mu">Delivery fee R25.00 · Pay on delivery</p>
      <div class="card">${items.map(i => `<div class="row"><span>${i.q} × ${esc(i.name)}</span><b>${R(i.q * i.price)}</b></div>`).join('')}
      <div class="row"><b>Total</b><b>${R(cartTotal() + 25)}</b></div></div>
      <div class="card"><label>Delivery address<input id="addr" value="${esc(S.loc?.address)}" placeholder="Street, house number, area"></label>
      <p class="mu">${S.loc?.lat ? 'Your GPS pin is attached to this order.' : 'No GPS pin yet. Use location on the home page, or the driver will use your address.'}</p></div>
      <button class="btn p" data-act="place">Place order</button></div>`);
  },

  async orders() {
    if (!S.user) { S.next = '#/orders'; return location.hash = '#/login'; }
    const list = await api('/orders');
    view(`<div class="shell"><h2>My orders</h2>${list.length ? list.map(o => `<a class="row" href="#/order/${o.id}"><span><b>${esc(o.store.name)}</b><br><span class="mu">Order #${o.id} · ${esc(STATUS[o.status])}</span></span><b>${R(o.total)}</b></a>`).join('')
      : '<p class="mu pad">No orders yet. Pick a store and place your first one.</p>'}</div>`);
  },

  async order(id) {
    let o = await api('/orders/' + id);
    view(`<div class="shell"><h2>Order #${o.id}</h2><p class="mu">${esc(o.store.name)} → ${esc(o.address)}</p><h2 id="st" style="font-size:22px"></h2><div class="steps" id="steps"></div>
      <div id="map"></div><div class="card" id="det"></div><div id="act"></div></div>`);
    const map = L.map('map').setView([o.store.lat, o.store.lng], 14);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(map);
    const dest = [o.lat ?? TOWN.lat, o.lng ?? TOWN.lng], src = [o.store.lat, o.store.lng];
    L.marker(src).addTo(map).bindTooltip(o.store.name); L.marker(dest).addTo(map).bindTooltip('You');
    const driver = L.circleMarker(src, { radius: 9, color: '#070708', fillColor: '#b8f54a', fillOpacity: 1, weight: 3 });
    map.fitBounds([src, dest], { padding: [40, 40] });
    const paint = () => {
      const idx = ['received', 'preparing', 'ready', 'on_the_way', 'delivered'].indexOf(o.status);
      $('#st').textContent = STATUS[o.status];
      $('#steps').innerHTML = [0, 1, 2, 3].map(i => `<div class="${i < idx || o.status === 'delivered' ? 'd' : ''}"></div>`).join('');
      if (o.status === 'on_the_way' || o.status === 'delivered') {
        driver.addTo(map).setLatLng([src[0] + (dest[0] - src[0]) * o.progress, src[1] + (dest[1] - src[1]) * o.progress]);
      }
      $('#det').innerHTML = o.items.map(i => `<div class="row"><span>${i.qty} × ${esc(i.name)}</span><span>${R(i.qty * i.price)}</span></div>`).join('') + `<div class="row"><b>Total with delivery</b><b>${R(o.total)}</b></div>`;
      $('#act').innerHTML = o.status === 'received' && S.user.role === 'customer' ? '<button class="btn d" data-act="cancel" data-v="' + o.id + '">Cancel order</button>' : '';
    };
    paint();
    S.poll = setInterval(async () => { try { o = await api('/orders/' + id); paint(); if (['delivered', 'cancelled'].includes(o.status)) clearInterval(S.poll); } catch {} }, 4000);
  },

  async dash() {
    if (!S.user || S.user.role === 'customer') return location.hash = '#/login';
    await drawDash();
    S.poll = setInterval(() => { if (S.tab === 'orders' && !document.activeElement.matches('input,select')) drawDash(); }, 5000);
  },
};

function storeCard(x) {
  return `<a class="sc ${x.open ? '' : 'shut'}" href="#/store/${x.id}">
    <div class="sb" style="background:${esc(x.color)}">
      <img src="${foodFor(x)}" alt="" loading="lazy">
      <div class="shade"></div>
      <span class="mark">${esc(x.name[0])}</span>
      <i class="badge ${x.open ? 'ok' : 'no'}">${x.open ? 'Open' : 'Closed'}</i>
    </div>
    <div class="si">
      <b>${esc(x.name)}</b>
      <span>${esc(x.category)} · ${esc(x.address)}</span>
      <span>25–40 min · R25 delivery</span>
    </div>
  </a>`;
}

function paintGrid() {
  const q = (S.q || '').toLowerCase(), list = S.stores.filter(x => (S.cat === 'All' || x.category === S.cat) && x.name.toLowerCase().includes(q));
  const el = $('#sg'); if (!el) return;
  el.innerHTML = list.length ? list.map(storeCard).join('') : '<p class="mu">No stores match that. Try another name or category.</p>';
}

function drawHome() {
  const cats = ['All', ...new Set(S.stores.map(x => x.category))];
  const catIcon = { All: '◎', 'Fast food': '🍔', Groceries: '🛒' };
  view(`<div class="shell">
    <section class="hero">
      <div class="hero-media">
        <img src="${HERO_IMG}" alt="Fresh pizza ready for delivery">
      </div>
      <div class="hero-copy">
        <div class="hero-kicker"><i></i> Live in Greytown</div>
        <h1>hamba delivers what you’re craving</h1>
        <p>Takeaways and groceries from local shops you know — tracked on the map, paid when it arrives.</p>
        <div class="finder">
          <input id="addr" placeholder="Enter your street address" value="${esc(S.loc?.address)}" aria-label="Delivery address">
          <button class="btn p" data-act="go">Find stores</button>
        </div>
        <div class="hero-actions">
          <button class="link" data-act="gps" type="button">Use my current location</button>
        </div>
      </div>
    </section>

    <div class="cats" role="tablist" aria-label="Categories">
      ${cats.map(c => `<button class="cat ${c === S.cat ? 'on' : ''}" type="button" data-act="cat" data-v="${esc(c)}">
        <span class="cat-ico">${catIcon[c] || '🏪'}</span>${esc(c)}
      </button>`).join('')}
    </div>

    <div class="sec-head">
      <h2>Hungry? Choose from Greytown's best.</h2>
      <div class="sec-nav">
        <button class="icon-btn" type="button" data-act="rail" data-v="-1" aria-label="Scroll left">‹</button>
        <button class="icon-btn" type="button" data-act="rail" data-v="1" aria-label="Scroll right">›</button>
      </div>
    </div>
    <div class="rail" id="rail">${S.stores.map(storeCard).join('')}</div>

    <div class="sec-head" id="stores"><h2>Stores near you</h2></div>
    <div class="filters">
      <input id="q" type="search" placeholder="Search stores" value="${esc(S.q || '')}" aria-label="Search stores">
      <div class="tabs">${cats.map(c => `<button class="${c === S.cat ? 'on' : ''}" data-act="cat" data-v="${esc(c)}">${esc(c)}</button>`).join('')}</div>
    </div>
    <div class="sgrid" id="sg"></div>

    <section class="vals">
      <div class="val"><b>One order at a time</b><p>Your driver collects and delivers a single order, so your food stays hot.</p></div>
      <div class="val"><b>Track every turn</b><p>Follow your order on the map from the kitchen to your gate.</p></div>
      <div class="val"><b>Pay when it arrives</b><p>Cash on delivery today. Card and EFT are coming.</p></div>
    </section>

    <section class="join">
      <a href="mailto:hello@hamba.co.za?subject=List%20my%20shop"><i></i><b>List your shop</b><span>Reach more customers in Greytown and manage orders from your phone.</span></a>
      <a href="mailto:hello@hamba.co.za?subject=Drive%20with%20Hamba"><i></i><b>Drive with Hamba</b><span>Choose your hours and keep every rand of your tips.</span></a>
    </section>
  </div>`);
  paintGrid();
}

function drawStore() {
  const s = S.cur, c = S.cart.store === s.id ? S.cart.items : {};
  view(`<div class="shell">
    <a href="#/" class="mu">← All stores</a>
    <div class="banner" style="background:${esc(s.color)}">
      <img src="${foodFor(s)}" alt="">
      <div class="shade"></div>
      <span>${esc(s.name[0])}</span>
    </div>
    <h2>${esc(s.name)}</h2>
    <p class="mu">${esc(s.address)}, Greytown · Trades ${s.open_h}:00–${s.close_h}:00.
    <b class="${s.open ? 'ok' : 'no'}">${s.open ? 'Open now' : 'Closed right now'}</b></p>
    ${s.products.map(p => `<div class="row"><span><b>${esc(p.name)}</b><br><span class="mu">${p.available ? R(p.price) : 'Sold out'}</span></span>
      <span class="qty"><button data-act="dec" data-v="${p.id}" aria-label="Remove one">−</button><b>${c[p.id]?.q || 0}</b>
      <button data-act="inc" data-v="${p.id}" aria-label="Add one" ${!p.available || !s.open ? 'disabled' : ''}>+</button></span></div>`).join('')}
    ${cartCount() && S.cart.store === s.id ? `<div class="bar"><b>${R(cartTotal())} · ${cartCount()} item${cartCount() === 1 ? '' : 's'}</b><a class="btn p" href="#/checkout">Checkout</a></div>` : ''}
  </div>`);
  nav();
}

function authForm(mode) {
  const reg = mode === 'register';
  view(`<div class="shell"><h2>${reg ? 'Create your account' : 'Sign in'}</h2>
    <p class="mu" style="margin-top:0">${reg ? 'Already have one?' : 'New to Hamba?'}
    <a href="#/${reg ? 'login' : 'register'}"><u>${reg ? 'Sign in' : 'Create an account'}</u></a></p>
    <form data-form="${mode}">${reg ? '<label>Full name<input name="name" autocomplete="name" required></label><label>Cell number<input name="phone" type="tel" autocomplete="tel"></label>' : ''}
    <label>Email<input name="email" type="email" autocomplete="email" required></label>
    <label>Password<input name="password" type="password" minlength="8" autocomplete="${reg ? 'new' : 'current'}-password" required></label>
    <p class="err" id="fe"></p><button class="btn p">${reg ? 'Create account' : 'Sign in'}</button></form></div>`);
}

async function drawDash() {
  const u = S.user, stores = await api('/stores'), sid = S.dsid || (u.role === 'admin' ? stores[0].id : u.store_id);
  const st = await api('/stores/' + sid), orders = (await api('/orders')).filter(o => o.store_id === sid);
  const stats = u.role === 'admin' ? await api('/admin/stats') : null;
  const tabs = [['orders', 'Orders'], ['products', 'Products'], ['hours', 'Hours and status']];
  const body = {
    orders: () => orders.length ? orders.map(o => `<div class="card"><div class="row" style="padding-top:0"><b>#${o.id} · ${esc(o.customer.name)}${o.customer.phone ? ', ' + esc(o.customer.phone) : ''}</b>
      <span class="${o.status === 'cancelled' ? 'no' : 'ok'}"><b>${esc(STATUS[o.status])}</b></span></div>
      <p class="mu">${o.items.map(i => i.qty + ' × ' + esc(i.name)).join(', ')}<br>Deliver to ${esc(o.address)}. Total ${R(o.total)}</p>
      ${['received', 'preparing', 'ready'].includes(o.status) ? `<button class="btn p sm" data-act="adv" data-v="${o.id}">${{ received: 'Accept order', preparing: 'Mark ready', ready: 'Send driver' }[o.status]}</button> <button class="btn d sm" data-act="cancel" data-v="${o.id}">Cancel</button>` : ''}</div>`).join('')
      : '<p class="mu pad">No orders for this store yet.</p>',
    products: () => `<div class="card tbl">${st.products.map(p => `<div class="row"><span>${esc(p.name)}</span><span class="qty">
      <input class="n" type="number" step="0.1" min="0" value="${p.price}" data-chg="price" data-v="${p.id}" aria-label="Price for ${esc(p.name)}">
      <button class="btn sm" data-act="avail" data-v="${p.id}" data-a="${p.available}">${p.available ? 'Mark sold out' : 'Back in stock'}</button>
      <button class="btn sm d" data-act="del" data-v="${p.id}">Remove</button></span></div>`).join('')}
      <form data-form="product" style="grid-template-columns:1fr 110px auto;max-width:none;margin-top:14px"><input name="name" placeholder="New product" required><input name="price" type="number" step="0.1" min="0" placeholder="Price" required><button class="btn p">Add</button></form></div>`,
    hours: () => `<div class="card"><p>Status now: <b class="${st.open ? 'ok' : 'no'}">${st.open ? 'Open' : 'Closed'}</b></p>
      <label style="max-width:260px">Mode<select data-chg="mode"><option value="auto" ${st.mode === 'auto' ? 'selected' : ''}>Follow trading hours</option><option value="open" ${st.mode === 'open' ? 'selected' : ''}>Force open</option><option value="closed" ${st.mode === 'closed' ? 'selected' : ''}>Force closed</option></select></label>
      <p class="qty">Opens <input class="n" type="number" min="0" max="23" value="${st.open_h}" data-chg="open_h"> Closes <input class="n" type="number" min="1" max="24" value="${st.close_h}" data-chg="close_h"></p></div>`,
  };
  view(`<div class="shell"><h2>${u.role === 'admin' ? 'Admin' : 'Store dashboard'}</h2>
    ${stats ? `<div class="stats">${[['Orders today', stats.orders], ['Revenue', R(stats.revenue)], ['Customers', stats.customers], ['Stores', stats.stores]].map(x => `<div class="card"><span class="mu">${x[0]}</span><b>${x[1]}</b></div>`).join('')}</div>
      <label style="max-width:300px;margin-bottom:14px">Store<select data-chg="dsid">${stores.map(x => `<option value="${x.id}" ${x.id === sid ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>` : `<p class="mu">${esc(st.name)}</p>`}
    <div class="tabs">${tabs.map(t => `<button class="${S.tab === t[0] ? 'on' : ''}" data-act="tab" data-v="${t[0]}">${t[1]}</button>`).join('')}</div>${body[S.tab]()}</div>`);
  S.dst = st;
}

async function route() {
  clearInterval(S.poll); nav();
  const [, p, a] = location.hash.slice(1).split('/');
  try { await views[p || 'home'](a); } catch (e) { view(`<div class="shell"><p class="err pad">${esc(e.message)}</p></div>`); }
  nav(); scrollTo(0, 0);
}

function cartChange(id, d) {
  const s = S.cur, p = s.products.find(x => x.id == id);
  if (S.cart.store !== s.id) S.cart = { store: s.id, items: {} };
  const it = S.cart.items[id] || (S.cart.items[id] = { id: p.id, name: p.name, price: p.price, q: 0 });
  it.q = Math.max(0, it.q + d); if (!it.q) delete S.cart.items[id];
  drawStore();
}
function signIn(d) {
  S.token = d.token; S.user = d.user; localStorage.setItem('t', d.token);
  const n = S.next || (d.user.role === 'customer' ? '#/' : '#/dash'); S.next = null; location.hash = n; route();
}

document.addEventListener('click', async e => {
  const b = e.target.closest('[data-act]'); if (!b) return; const a = b.dataset.act, v = b.dataset.v;
  try {
    if (a === 'cat') {
      S.cat = v;
      document.querySelectorAll('[data-act=cat]').forEach(x => x.classList.toggle('on', x.dataset.v === v));
      paintGrid();
      const rail = $('#rail');
      if (rail) rail.innerHTML = S.stores.filter(x => S.cat === 'All' || x.category === S.cat).map(storeCard).join('');
    }
    else if (a === 'rail') {
      const rail = $('#rail'); if (rail) rail.scrollBy({ left: Number(v) * 280, behavior: 'smooth' });
    }
    else if (a === 'focus-addr') {
      location.hash = '#/';
      requestAnimationFrame(() => { const i = $('#addr'); if (i) { i.focus(); i.scrollIntoView({ behavior: 'smooth', block: 'center' }); } });
    }
    else if (a === 'go') { const t = $('#addr').value.trim(); if (t) { S.loc = { ...(S.loc || {}), address: t }; localStorage.setItem('loc', JSON.stringify(S.loc)); nav(); } $('#stores')?.scrollIntoView({ behavior: 'smooth' }); }
    else if (a === 'inc') cartChange(v, 1);
    else if (a === 'dec') cartChange(v, -1);
    else if (a === 'out') { S.token = S.user = null; S.cart = { store: null, items: {} }; localStorage.removeItem('t'); location.hash = '#/'; route(); }
    else if (a === 'gps') {
      if (!navigator.geolocation) return toast('This browser cannot share your location. Type your address instead.');
      b.textContent = 'Finding you...';
      navigator.geolocation.getCurrentPosition(p => {
        S.loc = { address: `My current location (${p.coords.latitude.toFixed(4)}, ${p.coords.longitude.toFixed(4)})`, lat: p.coords.latitude, lng: p.coords.longitude };
        localStorage.setItem('loc', JSON.stringify(S.loc)); if ($('#addr')) $('#addr').value = S.loc.address; b.textContent = 'Location saved'; nav(); toast('Location saved');
      }, () => { b.textContent = 'Use my current location'; toast('Location blocked. Allow it in your browser settings or type your address.'); }, { timeout: 10000, enableHighAccuracy: true });
    }
    else if (a === 'place') {
      const address = $('#addr').value.trim(); if (!address) return toast('Enter a delivery address');
      if (address !== S.loc?.address) S.loc = { address }; localStorage.setItem('loc', JSON.stringify(S.loc));
      const r = await api('/orders', { method: 'POST', body: { store_id: S.cart.store, address, lat: S.loc.lat, lng: S.loc.lng, items: Object.values(S.cart.items).map(i => ({ id: i.id, qty: i.q })) } });
      S.cart = { store: null, items: {} }; location.hash = '#/order/' + r.id;
    }
    else if (a === 'cancel') { await api(`/orders/${v}/cancel`, { method: 'POST' }); toast('Order cancelled'); route(); }
    else if (a === 'adv') { await api(`/orders/${v}/advance`, { method: 'POST' }); drawDash(); }
    else if (a === 'tab') { S.tab = v; drawDash(); }
    else if (a === 'avail') { await api('/products/' + v, { method: 'PATCH', body: { available: b.dataset.a !== '1' } }); drawDash(); }
    else if (a === 'del') { if (confirm('Remove this product?')) { await api('/products/' + v, { method: 'DELETE' }); drawDash(); } }
  } catch (err) { toast(err.message); }
});

document.addEventListener('change', async e => {
  const t = e.target;
  if (t.id === 'addr') { S.loc = { ...(S.loc || {}), address: t.value.trim() }; localStorage.setItem('loc', JSON.stringify(S.loc)); nav(); return; }
  const k = t.dataset.chg; if (!k) return;
  try {
    if (k === 'dsid') { S.dsid = +t.value; return drawDash(); }
    if (k === 'price') await api('/products/' + t.dataset.v, { method: 'PATCH', body: { price: t.value } });
    else await api('/stores/' + S.dst.id, { method: 'PATCH', body: { [k]: k === 'mode' ? t.value : +t.value } });
    toast('Saved'); drawDash();
  } catch (err) { toast(err.message); }
});

document.addEventListener('submit', async e => {
  const f = e.target.closest('[data-form]'); if (!f) return; e.preventDefault();
  const d = Object.fromEntries(new FormData(f)), m = f.dataset.form;
  try {
    if (m === 'login' || m === 'register') signIn(await api('/auth/' + m, { method: 'POST', body: d }));
    else if (m === 'product') { await api(`/stores/${S.dst.id}/products`, { method: 'POST', body: d }); toast('Product added'); drawDash(); }
  } catch (err) { const el = $('#fe'); if (el) el.textContent = err.message; else toast(err.message); }
});

document.addEventListener('input', e => { if (e.target.id === 'q') { S.q = e.target.value; paintGrid(); } });
window.addEventListener('scroll', () => $('#nav')?.classList.toggle('scrolled', scrollY > 8), { passive: true });
window.addEventListener('hashchange', route);
(async () => { if (S.token) { try { S.user = await api('/auth/me'); } catch { S.token = null; localStorage.removeItem('t'); } } route(); })();
