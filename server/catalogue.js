/**
 * Seed catalogue for Hamba.
 *
 * This is the stand-in for a supplier product feed. importProducts() accepts
 * the same item shape, so a real feed can replace this file without a schema change:
 *
 *   { sku, name, brand, category, pack, price, image, blurb, url, available }
 *
 * name and price are required. image may be a site path or an absolute URL.
 * available: 0 marks the row sold out on first insert (later stock edits are kept).
 *
 * Photos under /img/catalog are generic Unsplash photographs (Unsplash License),
 * not retailer or manufacturer pack shots. Brand names are descriptive only.
 * Do not scrape Shoprite or copy their product images.
 */

export const CATALOGUE_VERSION = '1';

export const AISLES = [
  { name: 'Fresh Produce', image: '/img/catalog/tomato.jpg' },
  { name: 'Dairy & Eggs', image: '/img/catalog/milk.jpg' },
  { name: 'Bakery', image: '/img/catalog/bread.jpg' },
  { name: 'Meat & Poultry', image: '/img/catalog/steak.jpg' },
  { name: 'Pantry', image: '/img/catalog/maize.jpg' },
  { name: 'Beverages', image: '/img/catalog/juice.jpg' },
  { name: 'Snacks', image: '/img/catalog/chocolate.jpg' },
  { name: 'Frozen', image: '/img/catalog/nuggets.jpg' },
  { name: 'Household', image: '/img/catalog/clean.jpg' },
  { name: 'Personal Care', image: '/img/catalog/soap.jpg' },
];

export const STORE_PROFILES = {
  'KFC-GT01': { blurb: 'Chicken, burgers and buckets.', image: '/img/catalog/fried.jpg' },
  'HL-GT02': { blurb: 'Chicken, pap and chips.', image: '/img/catalog/chicken.jpg' },
  'SR-GT03': { blurb: 'Groceries, household and frozen.', image: '/img/catalog/aisle.jpg' },
  'SP-GT04': { blurb: 'Groceries and fresh food.', image: '/img/catalog/greens.jpg' },
  'MZ-GT05': { blurb: 'Kotas, stews and plates.', image: '/img/catalog/kota.jpg' },
};

const HINT = {
  'Fresh Produce': 'Fresh stock. Weight and ripeness vary.',
  'Dairy & Eggs': 'Keep refrigerated.',
  'Bakery': 'Baked for the day.',
  'Meat & Poultry': 'Keep refrigerated. Cook thoroughly.',
  'Pantry': 'Store in a cool, dry cupboard.',
  Beverages: 'Serve cold.',
  Snacks: 'Keep the pack sealed.',
  Frozen: 'Keep frozen. Do not refreeze once thawed.',
  Household: 'Use as directed on the pack.',
  'Personal Care': 'For external use.',
  Chicken: 'Prepared to order.',
  Burgers: 'Prepared to order.',
  Meals: 'Prepared to order.',
  Sides: 'Prepared to order.',
  Drinks: 'Served cold.',
  Kotas: 'Made to order.',
  Plates: 'Made to order.',
};

function g(sku, name, brand, category, pack, price, image, available) {
  const item = {
    sku, name, brand, category, pack, price,
    image: `/img/catalog/${image}.jpg`,
    blurb: HINT[category] || '',
  };
  if (available === 0) item.available = 0;
  return item;
}

const shoprite = [
  g('SR-BANANA', 'Bananas', '', 'Fresh Produce', 'per kg', 19.99, 'banana'),
  g('SR-APPLE', 'Apples', '', 'Fresh Produce', 'per kg', 24.99, 'apple'),
  g('SR-TOMATO', 'Tomatoes', '', 'Fresh Produce', 'per kg', 22.99, 'tomato'),
  g('SR-POTATO', 'Potatoes', '', 'Fresh Produce', '2 kg', 39.99, 'potato'),
  g('SR-ONION', 'Onions', '', 'Fresh Produce', '1 kg', 18.99, 'onion'),
  g('SR-CARROT', 'Carrots', '', 'Fresh Produce', '1 kg', 16.99, 'carrot'),
  g('SR-SPINACH', 'Spinach', '', 'Fresh Produce', 'bunch', 14.99, 'greens'),
  g('SR-AVO', 'Avocados', '', 'Fresh Produce', 'pack of 2', 29.99, 'avocado', 0),
  g('SR-ORANGE', 'Oranges', '', 'Fresh Produce', 'per kg', 19.99, 'citrus'),
  g('SR-GRAPE', 'Grapes', '', 'Fresh Produce', 'per kg', 44.99, 'grapes'),
  g('SR-LETTUCE', 'Lettuce', '', 'Fresh Produce', 'each', 16.99, 'lettuce'),
  g('SR-PEPPER', 'Green peppers', '', 'Fresh Produce', 'pack of 2', 15.99, 'pepper'),
  g('SR-SPROUT', 'Brussels sprouts', '', 'Fresh Produce', '400 g', 32.99, 'cabbage'),
  g('SR-PUMPKIN', 'Pumpkin', '', 'Fresh Produce', 'each', 18.99, 'squash'),

  g('SR-MILK-FC', 'Clover full cream milk', 'Clover', 'Dairy & Eggs', '2 L', 36.99, 'milk'),
  g('SR-MILK-LF', 'Clover low fat milk', 'Clover', 'Dairy & Eggs', '2 L', 36.99, 'milk'),
  g('SR-MAAS', 'Inkomazi maas', 'Inkomazi', 'Dairy & Eggs', '2 L', 28.99, 'milk'),
  g('SR-EGGS-18', 'Large eggs 18s', '', 'Dairy & Eggs', '18 eggs', 64.99, 'eggs'),
  g('SR-EGGS-6', 'Large eggs 6s', '', 'Dairy & Eggs', '6 eggs', 24.99, 'eggs'),
  g('SR-YOG', 'Clover strawberry yoghurt', 'Clover', 'Dairy & Eggs', '6 × 100 g', 28.99, 'yoghurt'),
  g('SR-CHEDDAR', 'Cheddar cheese', '', 'Dairy & Eggs', '400 g', 79.99, 'cheese'),
  g('SR-BUTTER', 'Butter', '', 'Dairy & Eggs', '500 g', 69.99, 'butter'),
  g('SR-BACON', 'Streaky bacon', '', 'Dairy & Eggs', '200 g', 46.99, 'bacon'),

  g('SR-BREAD-BR', 'Sasko premium brown bread', 'Sasko', 'Bakery', '700 g', 17.99, 'bread'),
  g('SR-BREAD-WH', 'Albany superior white bread', 'Albany', 'Bakery', '700 g', 18.99, 'bread'),
  g('SR-PIE', 'Steak pie', '', 'Bakery', 'each', 18.99, 'pie'),

  g('SR-CHICKEN', 'Whole chicken', '', 'Meat & Poultry', 'per kg', 79.99, 'chickenraw'),
  g('SR-BRAAI', 'Chicken braai pack', '', 'Meat & Poultry', '1.5 kg', 94.99, 'chickenraw'),
  g('SR-MINCE', 'Lean beef mince', '', 'Meat & Poultry', '500 g', 62.99, 'mince'),
  g('SR-STEAK', 'Rump steak', '', 'Meat & Poultry', 'per kg', 169.99, 'steak'),
  g('SR-WORS', 'Boerewors', '', 'Meat & Poultry', '500 g', 54.99, 'braai'),
  g('SR-SALMON', 'Salmon portions', '', 'Meat & Poultry', '400 g', 89.99, 'fish'),

  g('SR-IWISA-10', 'Iwisa super maize meal 10 kg', 'Iwisa', 'Pantry', '10 kg', 129.99, 'maize'),
  g('SR-IWISA-5', 'Iwisa super maize meal 5 kg', 'Iwisa', 'Pantry', '5 kg', 74.99, 'maize'),
  g('SR-STAR', 'White Star maize meal', 'White Star', 'Pantry', '2.5 kg', 42.99, 'maize'),
  g('SR-SPEKKO', 'Spekko long grain rice', 'Spekko', 'Pantry', '2 kg', 46.99, 'rice'),
  g('SR-TASTIC', 'Tastic rice', 'Tastic', 'Pantry', '2 kg', 52.99, 'rice'),
  g('SR-SAMP', 'Samp', '', 'Pantry', '2 kg', 34.99, 'samp'),
  g('SR-PASTA', 'Spaghetti', "Fatti's & Moni's", 'Pantry', '500 g', 19.99, 'pasta'),
  g('SR-OIL-SUN', 'Sunflower oil', 'Excella', 'Pantry', '2 L', 72.99, 'oil'),
  g('SR-OIL-OL', 'Olive oil', '', 'Pantry', '750 ml', 89.99, 'oil'),
  g('SR-FLOUR-C', 'Cake flour', 'Snowflake', 'Pantry', '2.5 kg', 44.99, 'flour'),
  g('SR-FLOUR-B', 'Bread flour', 'Snowflake', 'Pantry', '2.5 kg', 46.99, 'flour'),
  g('SR-CHICK', 'Chickpeas', 'Koo', 'Pantry', '410 g', 16.99, 'beans'),
  g('SR-SAUCE', 'Tomato sauce', 'All Gold', 'Pantry', '700 ml', 34.99, 'sauce'),
  g('SR-CHAK', 'Chakalaka mild', 'Koo', 'Pantry', '410 g', 22.99, 'sauce'),
  g('SR-CURRY', 'Curry powder', '', 'Pantry', '100 g', 18.99, 'spice'),
  g('SR-CSPICE', 'Chicken spice', '', 'Pantry', '100 g', 21.99, 'spice'),
  g('SR-COFFEE-G', 'Ground coffee', 'Jacobs', 'Pantry', '250 g', 109.99, 'coffee'),
  g('SR-COFFEE-B', 'Coffee beans', '', 'Pantry', '250 g', 99.99, 'coffee'),
  g('SR-ROOIBOS', 'Rooibos tea', 'Freshpak', 'Pantry', '80 tags', 48.99, 'tea'),
  g('SR-BRAN', 'Bran flakes', '', 'Pantry', '500 g', 49.99, 'cereal'),

  g('SR-COLA-2', 'Cola 2 L', '', 'Beverages', '2 L', 24.99, 'soda'),
  g('SR-COLA-6', 'Cola 6 × 330 ml', '', 'Beverages', '6 × 330 ml', 54.99, 'soda'),
  g('SR-CREME', 'Creme soda', '', 'Beverages', '2 L', 18.99, 'soda'),
  g('SR-OJ', 'Orange juice', 'Ceres', 'Beverages', '1 L', 28.99, 'juice'),
  g('SR-MANGO', 'Mango juice', 'Liqui Fruit', 'Beverages', '1 L', 26.99, 'juice'),
  g('SR-ICED', 'Iced tea lemon', '', 'Beverages', '1.5 L', 22.99, 'tea'),
  g('SR-WATER', 'Still water', '', 'Beverages', '6 × 500 ml', 29.99, 'water'),

  g('SR-COOKIE', 'Chocolate chip cookies', '', 'Snacks', '200 g', 24.99, 'biscuits'),
  g('SR-BROWNIE', 'Chocolate brownies', '', 'Snacks', '6 pack', 39.99, 'chocolate'),

  g('SR-BROC', 'Frozen broccoli', '', 'Frozen', '1 kg', 39.99, 'frozen'),
  g('SR-NUG', 'Chicken nuggets', '', 'Frozen', '400 g', 54.99, 'nuggets'),
  g('SR-ICE', 'Vanilla ice cream', '', 'Frozen', '2 L', 49.99, 'icecream'),
  g('SR-FCHIPS', 'Straight-cut chips', '', 'Frozen', '1 kg', 46.99, 'fries'),

  g('SR-CLEAN', 'All-purpose cleaner', '', 'Household', '750 ml', 28.99, 'clean'),
  g('SR-DISH', 'Dishwashing liquid', '', 'Household', '750 ml', 32.99, 'clean'),
  g('SR-BAR', 'Laundry bar', '', 'Household', '500 g', 16.99, 'soap'),
  g('SR-PAPER', 'Toilet paper', '', 'Household', '9 rolls', 64.99, 'paper'),

  g('SR-SOAP', 'Bath soap', '', 'Personal Care', '3 × 175 g', 24.99, 'soap'),
  g('SR-HAND', 'Hand soap', '', 'Personal Care', '500 ml', 22.99, 'soap'),
];

function sparPrice(price) {
  const bumped = Math.round(price * 106) / 100;
  const nice = Math.floor(bumped) + 0.99;
  return nice > price ? Number(nice.toFixed(2)) : Number((Math.floor(price) + 1.99).toFixed(2));
}

const SPAR_NAMES = [
  'Bananas', 'Tomatoes', 'Potatoes', 'Onions', 'Apples', 'Avocados',
  'Clover full cream milk', 'Large eggs 18s', 'Cheddar cheese', 'Butter',
  'Sasko premium brown bread', 'Albany superior white bread',
  'Chicken braai pack', 'Lean beef mince', 'Boerewors',
  'Iwisa super maize meal 10 kg', 'Spekko long grain rice', 'Sunflower oil', 'Spaghetti', 'Tomato sauce',
  'Cola 2 L', 'Orange juice', 'Still water', 'Rooibos tea',
  'Chocolate chip cookies', 'Vanilla ice cream', 'Toilet paper', 'Bath soap',
];

// Maize meal and cola appear twice (different packs). Pick the everyday pack.
function sparPick(name) {
  const matches = shoprite.filter(i => i.name === name);
  if (matches.length !== 1) throw new Error('Spar list needs exactly one of ' + name);
  return matches[0];
}

const spar = SPAR_NAMES.map(name => {
  const src = sparPick(name);
  return { ...src, sku: 'SP-' + src.sku.slice(3), price: sparPrice(src.price), available: 1 };
}).concat([
  g('SP-HB-BREAD', 'Spar fresh brown bread', 'Spar', 'Bakery', '700 g', 19.99, 'bread'),
  g('SP-HB-MILK', 'Spar full cream milk', 'Spar', 'Dairy & Eggs', '2 L', 37.99, 'milk'),
  g('SP-HB-EGGS', 'Spar free range eggs', 'Spar', 'Dairy & Eggs', '6 eggs', 34.99, 'eggs'),
  g('SP-HB-CHICK', 'Spar chicken braai pack', 'Spar', 'Meat & Poultry', '1.5 kg', 104.99, 'chickenraw'),
  g('SP-HB-OIL', 'Spar olive oil', 'Spar', 'Pantry', '1 L', 99.99, 'oil'),
  g('SP-HB-WATER', 'Spar still water', 'Spar', 'Beverages', '6 × 500 ml', 26.99, 'water'),
  g('SP-HB-PIE', 'Spar steak pie', 'Spar', 'Bakery', 'each', 22.99, 'pie'),
]);

const kfc = [
  g('KFC-SW2', 'Streetwise 2', 'KFC', 'Chicken', '2 pieces and chips', 64.9, 'fried'),
  g('KFC-SW3', 'Streetwise 3', 'KFC', 'Chicken', '3 pieces and chips', 84.9, 'fried'),
  g('KFC-WINGS', 'Dunked wings', 'KFC', 'Chicken', '6 pieces', 76.9, 'chicken'),
  g('KFC-ZINGER', 'Zinger burger', 'KFC', 'Burgers', 'each', 69.9, 'burger'),
  g('KFC-COLONEL', 'Colonel burger', 'KFC', 'Burgers', 'each', 59.9, 'burger'),
  g('KFC-TWISTER', 'Twister', 'KFC', 'Burgers', 'each', 49.9, 'fried'),
  g('KFC-B6', 'Bucket for 6', 'KFC', 'Meals', '6 pieces', 129.9, 'chicken'),
  g('KFC-B15', 'Bucket for 15', 'KFC', 'Meals', '15 pieces', 259.9, 'chicken'),
  g('KFC-CHIPS-L', 'Large chips', 'KFC', 'Sides', 'large', 32.9, 'fries'),
  g('KFC-CHIPS-R', 'Regular chips', 'KFC', 'Sides', 'regular', 22.9, 'fries'),
  g('KFC-LOAF', 'Mini loaf', 'KFC', 'Sides', 'each', 14.9, 'bread'),
  g('KFC-COLA-S', 'Cola 440 ml', 'KFC', 'Drinks', '440 ml', 18.9, 'soda'),
  g('KFC-COLA-2', 'Cola 2 L', 'KFC', 'Drinks', '2 L', 28.9, 'soda'),
];

const lion = [
  g('HL-6', '6 piece meal', 'Hungry Lion', 'Meals', '6 pieces and chips', 99.9, 'chicken'),
  g('HL-4', '4 piece meal', 'Hungry Lion', 'Meals', '4 pieces and chips', 79.9, 'chicken'),
  g('HL-QTR', 'Quarter chicken and chips', 'Hungry Lion', 'Chicken', 'quarter and chips', 44.9, 'fried'),
  g('HL-FULL', 'Full chicken', 'Hungry Lion', 'Chicken', 'whole', 114.9, 'chicken'),
  g('HL-WINGS', 'Wings', 'Hungry Lion', 'Chicken', '6 pieces', 59.9, 'chicken'),
  g('HL-BURGER', 'Lion burger', 'Hungry Lion', 'Burgers', 'each', 49.9, 'burger'),
  g('HL-RUSSIAN', 'Russian and chips', 'Hungry Lion', 'Meals', 'each', 36.9, 'fries'),
  g('HL-PAP-W', 'Pap and wors', 'Hungry Lion', 'Plates', 'plate', 46.9, 'braai'),
  g('HL-PAP-C', 'Pap and chicken', 'Hungry Lion', 'Plates', 'plate', 54.9, 'chicken'),
  g('HL-CHIPS', 'Chips', 'Hungry Lion', 'Sides', 'regular', 22.9, 'fries'),
  g('HL-COLA', 'Cola', 'Hungry Lion', 'Drinks', '2 L', 24.9, 'soda'),
];

const mama = [
  g('MZ-KOTA', 'Kota cheese and chips', 'Mama Z', 'Kotas', 'each', 35, 'kota'),
  g('MZ-KOTA-S', 'Kota special', 'Mama Z', 'Kotas', 'egg, atchar and russian', 48, 'kota'),
  g('MZ-VET', 'Vetkoek with mince', 'Mama Z', 'Kotas', 'each', 18, 'bread'),
  g('MZ-STEW', 'Beef stew and rice', 'Mama Z', 'Plates', 'plate', 62, 'stew'),
  g('MZ-CURRY', 'Chicken curry and rice', 'Mama Z', 'Plates', 'plate', 58, 'riceplate'),
  g('MZ-PAP', 'Pap and wors', 'Mama Z', 'Plates', 'plate', 42, 'braai'),
  g('MZ-PAP-C', 'Pap, chakalaka and wors', 'Mama Z', 'Plates', 'plate', 48, 'braai'),
  g('MZ-SAMP', 'Samp and beans', 'Mama Z', 'Plates', 'with stew', 55, 'rice'),
  g('MZ-MAGEU', 'Mageu', 'Mama Z', 'Drinks', '500 ml', 16, 'milk'),
  g('MZ-COLA', 'Cola', 'Mama Z', 'Drinks', '440 ml', 16, 'soda'),
  g('MZ-TEA', 'Rooibos tea', 'Mama Z', 'Drinks', 'mug', 8, 'tea'),
];

function assertFeed(code, list) {
  const names = new Set();
  for (const item of list) {
    if (!item.name || !(Number(item.price) >= 0)) throw new Error(`Bad product in ${code}: ${item.name}`);
    if (names.has(item.name)) throw new Error(`Duplicate product name in ${code}: ${item.name}`);
    names.add(item.name);
  }
}

export const FEEDS = {
  'SR-GT03': shoprite,
  'SP-GT04': spar,
  'KFC-GT01': kfc,
  'HL-GT02': lion,
  'MZ-GT05': mama,
};

for (const [code, list] of Object.entries(FEEDS)) assertFeed(code, list);

// Original placeholder menu. Replaced once, only when a database still has nothing else.
export const LEGACY_PRODUCTS = [
  'Streetwise 2', 'Zinger Burger', 'Bucket for 4', 'Large chips',
  '6 Pc Meal', 'Lion Burger', 'Pap & Wors',
  'Maize meal 10kg', 'Full cream milk 2L', 'Eggs 18s', 'Brown bread',
  'Rice 2kg', 'Sunflower oil 2L', 'Chicken pieces 2kg',
  'Kota', 'Beef stew & rice',
];
