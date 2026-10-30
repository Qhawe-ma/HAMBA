# Hamba

Delivery app for Greytown: food and groceries from local and national stores, with customer accounts, a merchant dashboard, an admin panel, GPS and live order tracking.

## Run it

```bash
npm install
cp .env.example .env      # then set JWT_SECRET
export $(cat .env | xargs) && npm start
```

Open http://localhost:3000. Needs Node 18 or newer.

Seeded accounts (change them before going live):

| Role | Email | Password |
|---|---|---|
| Admin | admin@hamba.local | admin12345 |
| Merchant | store1@hamba.local to store5@hamba.local | merchant123 |
| Customer | create one on the Create account page | |

## Structure

```
hamba/
  server/
    db.js        SQLite schema, opening-hours logic, seed data
    auth.js      register, login, JWT, role guard
    index.js     stores, products, orders, admin API, serves /public
  public/
    index.html   app shell
    css/app.css  styles
    js/app.js    customer app, sign-in, merchant and admin dashboard
  scraper/
    scrape.js    product importer (respects robots.txt)
    sites.example.json
```

## What works

- Customer accounts (register, sign in, orders history), passwords hashed with bcrypt
- Store list with category filter, trading hours and open/closed in South African time
- Menus, cart, checkout with typed address or **Use my current location** (browser GPS)
- Order flow: received, preparing, ready, on the way, delivered, with a live map (OpenStreetMap) that polls every 4 seconds
- Merchant dashboard: accept orders, move them along, edit prices, sold-out toggles, add and remove products, hours and force open/closed
- Admin: everything above for any store, plus totals
- Server calculates prices itself, so customers cannot change them

## Products from real sites

Copy `scraper/sites.example.json` to `scraper/sites.json`, fill in the page URL and the CSS selectors for each item, name and price, then run `npm run scrape`. It respects robots.txt and waits between requests. Only scrape sites that allow it or have given you permission. KFC, Hungry Lion and Shoprite have no public product feeds, so for them agree a feed or enter products in the dashboard. Pages that build their menu with JavaScript need a headless browser (Playwright) instead of this scraper.

## Not built yet

- Online payments (add Yoco, Ozow or PayFast in `POST /api/orders`; orders are cash on delivery for now)
- Real driver app: the dot on the map is simulated over 90 seconds from the shop to the customer. Production needs a driver app posting GPS to the server
- Push or WhatsApp notifications, password reset by email, rate limiting
- Android and iOS: wrap this web app with Capacitor (`npx cap add android ios`) or rebuild the screens in React Native, using this API unchanged

## Going live

Use a VPS or Railway, Fly.io or Render with a persistent disk for `hamba.db` (or move to Postgres). Set `JWT_SECRET` and `NODE_ENV=production`, serve over HTTPS (GPS only works on HTTPS), and add a POPIA privacy policy before taking real customers.
