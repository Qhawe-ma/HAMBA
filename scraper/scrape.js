// Usage: copy sites.example.json to sites.json, set real URLs and CSS selectors, then: npm run scrape
// Respects robots.txt, waits between requests and identifies itself. Only scrape sites whose terms allow it,
// or that have given you permission. Pages that build their menu with JavaScript need a headless browser instead.
import fs from 'fs';
import * as cheerio from 'cheerio';
import { seed } from '../server/db.js';
import { importProducts } from '../server/index.js';

const UA = 'HambaBot/1.0 (+contact: you@yourdomain.co.za)';
const sites = JSON.parse(fs.readFileSync(new URL('./sites.json', import.meta.url)));
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function allowed(url) {
  const u = new URL(url);
  try {
    const txt = await (await fetch(u.origin + '/robots.txt', { headers: { 'User-Agent': UA } })).text();
    let applies = false;
    for (const line of txt.split('\n')) {
      const [k, ...v] = line.split(':'); const val = v.join(':').trim();
      if (/user-agent/i.test(k)) applies = val === '*' || /hamba/i.test(val);
      if (applies && /disallow/i.test(k) && val && u.pathname.startsWith(val)) return false;
    }
  } catch { /* no robots.txt means no restriction */ }
  return true;
}

seed();
for (const s of sites) {
  if (!(await allowed(s.url))) { console.log('Skipped (robots.txt disallows):', s.url); continue; }
  const html = await (await fetch(s.url, { headers: { 'User-Agent': UA } })).text();
  const $ = cheerio.load(html), found = [];
  $(s.item).each((_, el) => {
    const name = $(el).find(s.name).first().text().trim();
    const price = parseFloat($(el).find(s.price).first().text().replace(/[^\d.,]/g, '').replace(',', '.'));
    if (name && price > 0) found.push({ name, price, url: s.url });
  });
  console.log(`${s.store_code}: ${found.length} products found`, found.length ? `-> imported ${importProducts(s.store_code, found)}` : '(check your selectors)');
  await sleep(2000);
}
process.exit(0);
