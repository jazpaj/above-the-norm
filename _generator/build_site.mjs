// Builds the storefront from _generator/products.json and _generator/site/.
// Run from the project folder:  node _generator/build_site.mjs
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { commercePolicy, store } from './site/commerce-config.mjs';
import { renderPolicy } from './site/policies.mjs';

const root = new URL('../', import.meta.url);
const gen = new URL('./', import.meta.url);
const site = 'https://abovethenorm.us';
const CARE = "Turn inside out and machine wash cold. Hang to dry, or use the dryer's lowest heat.";

// Our product list is the only catalog source.
const source = JSON.parse(await readFile(new URL('products.json', gen), 'utf8'));
const products = source.map(p => ({
  id: p.id, name: p.name, category: p.cat, gender: p.gender.join(' '), color: p.color || '',
  price: Math.min(...Object.values(p.prices)), stock: p.in_stock, variants: p.prices, images: p.images,
  search: [p.name, p.color, p.cat, p.type].join(' ').toLowerCase(),
  notes: ['tops', 'bottoms'].includes(p.cat) && !p.details.some(d => d.startsWith('Care')) ? [...p.details, CARE] : p.details,
  unavailable: []
}));

const visualRows = (await readFile(new URL('site/product-visuals.txt', gen), 'utf8')).trim().split('\n').map(line => line.split('\t'));
const visualCopy = Object.fromEntries(visualRows.filter(([id]) => products.some(p => p.id === id)));
const missing = products.filter(p => !visualCopy[p.id]).map(p => p.id);
if (missing.length) throw Error('Add a description to site/product-visuals.txt for: ' + missing.join(', '));
const stockImages = new Set(await readdir(new URL('assets/products/', root)));
for (const p of products) {
  if (!Object.keys(p.variants).length || !p.images.length || p.images.some(i => !stockImages.has(i))) throw Error('Incomplete product data for ' + p.id);
}

await writeFile(new URL('assets/catalog.js', root), 'window.ATN_CATALOG = ' + JSON.stringify(products) + ';\n');
await writeFile(new URL('assets/product-copy.js', root), 'window.ATN_VISUAL_COPY = ' + JSON.stringify(visualCopy) + ';\n');
await writeFile(new URL('assets/commerce-config.js', root), 'window.ATN_COMMERCE_POLICY = ' + JSON.stringify(commercePolicy) + ';\n');
await writeFile(new URL('assets/store-state.js', root), 'window.ATN_STORE_STATE = ' + JSON.stringify({ checkout: store.ordersLive, stock: {} }) + ';\n');

// Server-side copy used to price orders. Kept out of the public folder.
await writeFile(new URL('mail/catalog.json', root), JSON.stringify({
  ordersLive: store.ordersLive, email: store.email,
  ship: { standard_rate: commercePolicy.shipping.standard.rate / 100, free_over: commercePolicy.shipping.standard.freeAt / 100, express_rate: commercePolicy.shipping.express.rate / 100 },
  coupon: { code: commercePolicy.welcome.code, pct: commercePolicy.welcome.percent },
  products: Object.fromEntries(products.map(p => [p.id, { n: p.name, c: p.color, p: p.variants, i: 'assets/products/' + p.images[0] }]))
}) + '\n');

// Cache-busting: the host caches assets for a month, so each file URL carries a hash of its contents.
let template = await readFile(new URL('site/template.html', gen), 'utf8');
template = template.replace('/api/store-state.js', '/assets/store-state.js');
const assetRefs = [...template.matchAll(/(?:src|href)="\/(assets\/[^"?]+\.(?:js|css))"/g)].map(m => m[1]);
for (const ref of new Set(assetRefs)) {
  const hash = createHash('md5').update(await readFile(new URL(ref, root))).digest('hex').slice(0, 10);
  template = template.replaceAll('"/' + ref + '"', '"/' + ref + '?v=' + hash + '"');
}

const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const businessDetails = `
  <section class="policy-business" aria-labelledby="policy-business-title">
    <h2 id="policy-business-title">Business information</h2>
    <address>
      <strong>Above The Norm LLC</strong>
      <p>6122 Sterling Ave<br>Raytown, MO 64133<br>United States</p>
      <a href="mailto:${store.email}">${store.email}</a>
    </address>
    <p><a href="/trademark/">Above The Norm® · U.S. Trademark Reg. No. 6,698,259</a></p>
  </section>`;

const trademarkPage = (await readFile(new URL('site/trademark.html', gen), 'utf8')).trim();
const pages = JSON.parse(await readFile(new URL('site/pages.json', gen), 'utf8'));
pages.push(...products.map(p => ['products/' + p.id, p.name + (p.color ? ' | ' + p.color : ''), visualCopy[p.id], 'products/' + p.images[0], p]));

// Product folders are regenerated each build so removed products don't linger.
await rm(new URL('products/', root), { recursive: true, force: true });
for (const [route, label, description, image, product] of pages) {
  const pageTitle = escape(label + ' | Above The Norm®');
  const pageDesc = escape(description);
  const canonical = site + (route ? '/' + route + '/' : '/');
  const cover = site + '/assets/' + image;
  const brand = product ? '<p class="eyebrow"><a href="/trademark/">Above The Norm® · U.S. Reg. No. 6,698,259</a></p>' : '';
  const fallback = !route ? null : route === 'trademark' ? trademarkPage
    : renderPolicy(route, businessDetails) || `<main id="main-content" class="fallback"><section class="page-intro content-width${route.startsWith('checkout') ? ' compact-intro' : ''}">${brand}<h1>${escape(product?.name ?? label)}</h1><p>${pageDesc}</p></section></main>`;
  const schema = product ? `\n  <script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@type': 'Product', name: product.name, description, sku: product.id,
    image: product.images.map(picture => site + '/assets/products/' + picture),
    brand: { '@type': 'Brand', name: 'Above The Norm' }, url: canonical
  }).replaceAll('<', '\\u003c')}</script>` : '';
  let html = template
    .replace(/<link rel="canonical"[^>]*>\s*/, '')
    .replace(/(<meta (?:name="description"|property="og:description") content=")[^"]+/g, (_, start) => start + pageDesc)
    .replace(/(<meta property="og:image" content=")[^"]+/, (_, start) => start + cover)
    .replace('</head>', () => `  <link rel="canonical" href="${canonical}">${schema}\n</head>`);
  if (route) {
    html = html
      .replace(/<title>[^<]+<\/title>/, () => `<title>${pageTitle}</title>`)
      .replace(/(<meta property="og:title" content=")[^"]+/, (_, start) => start + pageTitle)
      .replace(/<main id="main-content">[\s\S]*?<\/main>/, () => fallback);
  }
  const dir = new URL((route ? route + '/' : ''), root);
  await mkdir(dir, { recursive: true });
  await writeFile(new URL('index.html', dir), html);
}

const sitemap = pages.filter(([route]) => !route.startsWith('checkout')).map(([route]) => site + (route ? '/' + route + '/' : '/'));
await writeFile(new URL('sitemap.xml', root), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + sitemap.map(url => '<url><loc>' + escape(url) + '</loc></url>').join('\n') + '\n</urlset>\n');
await writeFile(new URL('robots.txt', root), 'User-agent: *\nAllow: /\nDisallow: /checkout/\nSitemap: ' + site + '/sitemap.xml\n');
console.log('Built ' + products.length + ' products and ' + pages.length + ' pages. Orders ' + (store.ordersLive ? 'ON' : 'off') + '.');
