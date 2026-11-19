'use strict';

const PRODUCTS = window.ATN_CATALOG || [];
const productIndex = new Map(PRODUCTS.map(product => [product.id, product]));
const categories = {
  tops: 'Tees & tops',
  bottoms: 'Pants & shorts',
  headwear: 'Hats & caps',
  accessories: 'Accessories'
};
const support = 'support@abovethenorm.us';
const brand = 'https://www.abovethenorm.co';
const post = id => 'https://x.com/abovethenormal/status/' + id;
const complex = 'https://www.complex.com/shop/brands/above%20the%20norm';
const voyage = 'https://voyagela.com/interview/meet-norm-valleylos-angeles/';
const canvas = 'https://canvasrebel.com/meet-rj-token-harris/';
const tyrel = 'https://www.tyrelhunt.com/tyrelhunt/2020/06/22/5-upcoming-streetwear-designers-you-should-check-out';

const releases = [
  {
    id: 'planet-hollywood', name: 'Planet Hollywood', date: '2026', type: 'Capsule',
    summary: 'The original storefront introduced the drop with five new garments.',
    copy: ['The Planet Hollywood capsule appeared on the original Above The Norm storefront in 2026. The store announced five new garments and displayed the Planet Hollywood Tee alongside Hazard and Too Cool pieces in its new arrivals.'],
    media: [['planet-tee-front.png', 'Front artwork on the red Planet Hollywood Tee'], ['planet-tee-back.png', 'Back artwork on the red Planet Hollywood Tee']],
    sources: [['Original ATN storefront', brand + '/']],
    products: ['biohazard-tee', 'too-cool-tee']
  },
  {
    id: 'in-the-clouds', name: 'In the Clouds', date: '2026', type: 'Campaign',
    summary: 'Five official lookbook frames from Los Angeles, with the original campaign credits.',
    copy: ['The In the Clouds lookbook was photographed in Los Angeles in 2026. ATN’s original lookbook credits Token and Liv for creative direction, with portraits and illustrated scenes across five frames.'],
    media: cloudLookbook,
    credit: cloudCredit,
    sources: [['Full ATN lookbook','/lookbook/'],['Original credits',originalLookbook]]
  },
  {
    id: 'the-rebirth', name: 'The Rebirth', date: 'July 11, 2025', type: 'Capsule',
    summary: 'Seven pieces released exclusively through Complex Shop.',
    copy: ['ATN announced a seven-piece capsule through Complex Shop on July 11, 2025. The launch sheet shows graphic tees, two hoodies, a brown jersey and camouflage bottoms.'],
    media: [
      ['rebirth1.webp', 'The Rebirth launch sheet showing the seven Above The Norm pieces'],
      ['rebirth2.webp', 'Official Above The Norm imagery from The Rebirth announcement'],
      ['rebirth3.webp', 'Official Above The Norm release artwork from The Rebirth announcement']
    ],
    sources: [['Original announcement on X', post('1943823123151040970')], ['ATN on Complex Shop', complex]]
  },
  {
    id: 'fly-testimony', name: 'Fly Testimony', date: 'February 12, 2025', type: 'Jersey release',
    summary: 'A mesh football jersey with screen-printed numbers and a customizable name.',
    copy: ['ATN announced the Fly Testimony Jersey for February 12. The 220 gsm mesh jersey was shown with screen-printed team graphics, an embroidered collar logo, woven tags and an optional custom name on the back.'],
    media: [['fly1.jpg', 'Official Fly Testimony Jersey release photo'], ['fly2.jpg', 'Second view of the Fly Testimony Jersey'], ['fly3.jpg', 'Detail view from the Fly Testimony Jersey release'], ['fly4.jpg', 'Additional Fly Testimony release photography']],
    sources: [['Original jersey announcement on X', post('1889452079753880052')]]
  },
  {
    id: 'sent-from-above', name: 'Sent From Above', date: 'June 2024', type: 'Capsule',
    summary: 'The Most High and Guardian Angel tees, photographed in Los Angeles.',
    copy: ['The Sent From Above capsule includes the Most High tee, a concert-tee-inspired graphic with a crowd gathered at a portal. ATN shared the Most High and Guardian Angel campaigns in June 2024. The original posts credit Token for creative direction and styling, Garrett for photography and Liliana for styling assistance.'],
    media: [['guardian1.webp', 'Guardian Angel Tee beneath Los Angeles palm trees'], ['mosthigh1.webp', 'Most High Tee photographed against a sunset'], ['guardian2.webp', 'Guardian Angel campaign alternate view'], ['mosthigh2.webp', 'Most High campaign alternate view']],
    sources: [['Most High campaign on X', post('1803835269940154544')], ['Guardian Angel campaign on X', post('1805063770793996718')], ['Capsule listing at Zumiez', 'https://www.zumiez.com/above-the-norm-most-high-white-t-shirt.html']],
    products: ['guardian-angel-tee', 'most-high-tee', 'sent-from-above-hoodie-black', 'sent-from-above-trucker-hat-black']
  },
  {
    id: 'phone-home', name: 'Phone Home', date: '2014', type: 'First collection',
    summary: 'The first garments Token released under the Above The Norm name.',
    copy: ['In a 2020 interview with Voyage LA, Token recalled hearing the phrase “above the norm” in Mac Miller’s “The Star Room” in 2013. He used it as the name for his first clothing collection, Phone Home, the following year.'],
    media: [],
    sources: [['Token’s Voyage LA interview', voyage]]
  },
  ...additionalReleases
];

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
const h = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
}[char]));
const usd = new Intl.NumberFormat('en-US', {style:'currency', currency:'USD', trailingZeroDisplay:'stripIfInteger'});
const money = value => usd.format(value);
const itemPath = product => '/products/' + encodeURIComponent(product.id) + '/';
const imagePath = file => '/assets/products/' + encodeURIComponent(file);
const storeState = window.ATN_STORE_STATE || {checkout:false,stock:{}};
const isAvailable = (product, size) => Object.hasOwn(product.variants,size)
  && (storeState.stock[JSON.stringify([product.id,size])] ?? (product.stock && !(product.unavailable||[]).includes(size)));
const productInStock = product => Object.keys(product.variants).some(size=>isAvailable(product,size));
const departmentNames = {men:'Men',women:'Women',unisex:'Unisex'};
const department = product => product.gender === 'men women' ? 'unisex' : product.gender;
const audience = product => departmentNames[department(product)];
const cardPrice = product => new Set(Object.values(product.variants)).size > 1 ? 'From ' + money(product.price) : money(product.price);

function card(product) {
  const [main, alt] = product.images;
  return `<a class="product-card" href="${itemPath(product)}">
    <div class="card-image"><img src="${imagePath(main)}" alt="${h(product.name)}${product.color ? ' in ' + h(product.color) : ''}" width="600" height="600" loading="lazy">${alt ? `<img class="alternate" src="${imagePath(alt)}" alt="" width="600" height="600" loading="lazy">` : ''}${productInStock(product) ? '' : '<span class="sold-tag">Sold out</span>'}</div>
    <div class="card-meta"><span class="card-name">${h(product.name)}</span><span class="card-price">${cardPrice(product)}</span></div>
    <p class="card-sub">${h(product.color || categories[product.category])} · ${audience(product)}</p>
  </a>`;
}

function hydrateFeatured() {
  const ids = ['my-mama-says-tee','sent-from-above-hoodie-black','retired-hoop-dream-sweats-black','badge-logo-dad-hat-blue'];
  $('#featured-products').innerHTML = ids.map(id => productIndex.get(id)).filter(Boolean).map(card).join('');
  $('[data-catalog-count]').textContent = PRODUCTS.length;
}

function words(query) {
  return query.toLowerCase().trim().split(/\s+/).filter(Boolean).map(word => word.length > 3 ? word.replace(/s$/, '') : word);
}

function searchMatches(product, tokens) {
  const searchable = (product.search + ' ' + product.name + ' ' + categories[product.category] + ' ' + audience(product)).toLowerCase();
  return tokens.every(word => searchable.includes(word));
}

const initialShopSize = 32;
function renderShop(main) {
  const url = new URL(location.href);
  const options = Object.entries(categories);
  const sizes = [...new Set(PRODUCTS.flatMap(p => Object.keys(p.variants)))];
  main.innerHTML = `<section class="shop-intro content-width"><h1 id="shop-title">Shop.</h1></section>
    <section class="shop content-width" aria-label="Product catalog">
      <div class="fit-tabs" role="group" aria-label="Shop by gender">${[['','All'],['men','Men'],['women','Women'],['unisex','Unisex']].map(([value,label])=>`<button type="button" data-fit="${value}" aria-pressed="false">${label}</button>`).join('')}</div>
      <div class="shop-controls"><div class="shop-categories" role="group" aria-label="Category">${[['','All pieces'],...options].map(([value,label])=>`<button type="button" data-category="${value}" aria-pressed="false">${h(label)}</button>`).join('')}</div>
      <div class="filter-bar">
        <label class="sr-only" for="catalog-query">Search products</label><input type="search" id="catalog-query" placeholder="Search the catalog">
        <label>Size <select id="catalog-size"><option value="">All sizes</option>${sizes.map(size=>`<option>${h(size)}</option>`).join('')}</select></label>
        <label>Sort <select id="sort"><option value="featured">Featured</option><option value="low">Price low to high</option><option value="high">Price high to low</option><option value="az">Name A–Z</option></select></label>
        <label><input type="checkbox" id="available"> In stock</label><button type="button" class="text-button" id="clear-filters">Clear filters</button>
      </div></div>
      <p class="list-feedback" id="result-count" aria-live="polite"></p><div id="products" class="product-grid"></div>
      <div class="more-results"><button type="button" id="load-more" class="button outline">Show more pieces</button></div>
    </section>`;
  const query = $('#catalog-query');
  const size = $('#catalog-size');
  const sort = $('#sort');
  const inStock = $('#available');
  const more = $('#load-more');
  const categoryButtons = $$('[data-category]');
  const fitButtons = $$('[data-fit]');
  let category = Object.hasOwn(categories, url.searchParams.get('category')) ? url.searchParams.get('category') : '';
  let limit = initialShopSize;
  query.value = url.searchParams.get('q') || '';
  let fit = ['men','women','unisex'].includes(url.searchParams.get('fit')) ? url.searchParams.get('fit') : '';
  size.value = sizes.includes(url.searchParams.get('size')) ? url.searchParams.get('size') : '';
  sort.value = ['low','high','az'].includes(url.searchParams.get('sort')) ? url.searchParams.get('sort') : 'featured';
  inStock.checked = url.searchParams.get('stock') === '1';

  function display(reset) {
    if (reset) limit = initialShopSize;
    const tokens = words(query.value);
    let results = PRODUCTS.filter(product => {
      const fitMatches = !fit || department(product) === fit;
      const sizeMatches = !size.value || Object.hasOwn(product.variants,size.value);
      const available = !inStock.checked || (size.value ? isAvailable(product,size.value) : productInStock(product));
      return (!category || product.category === category) && fitMatches && sizeMatches && available && searchMatches(product,tokens);
    });
    const price = product => size.value ? product.variants[size.value] : product.price;
    const compare = {low:(a,b)=>price(a)-price(b), high:(a,b)=>price(b)-price(a), az:(a,b)=>a.name.localeCompare(b.name)}[sort.value];
    if (compare) results.sort(compare);
    categoryButtons.forEach(button => button.setAttribute('aria-pressed', button.dataset.category === category));
    fitButtons.forEach(button => button.setAttribute('aria-pressed', button.dataset.fit === fit));
    $('#shop-title').textContent = {men:'Men.',women:'Women.',unisex:'Unisex.'}[fit] || 'Shop.';
    const shown = Math.min(limit,results.length);
    $('#result-count').textContent = results.length ? `Showing ${shown} of ${results.length} ${results.length === 1 ? 'product' : 'products'}` : '0 products';
    const target = $('#products');
    const cards = results.slice(0,shown);
    if (reset) target.innerHTML = cards.length ? cards.map(card).join('') : '<p class="no-results">No pieces match these filters. Try a different search or clear the filters.</p>';
    else target.insertAdjacentHTML('beforeend',cards.slice(target.children.length).map(card).join(''));
    more.hidden = shown === results.length;
    const next = new URLSearchParams();
    if (category) next.set('category',category);
    if (query.value.trim()) next.set('q',query.value.trim());
    if (fit) next.set('fit',fit);
    if (size.value) next.set('size',size.value);
    if (sort.value !== 'featured') next.set('sort',sort.value);
    if (inStock.checked) next.set('stock','1');
    history.replaceState(null,'',location.pathname + (next.size ? '?' + next : ''));
  }

  categoryButtons.forEach(button => button.addEventListener('click',()=>{category=button.dataset.category;display(true);}));
  fitButtons.forEach(button=>button.addEventListener('click',()=>{fit=button.dataset.fit;display(true);}));
  query.addEventListener('input',()=>display(true));
  [size,sort,inStock].forEach(control=>control.addEventListener('change',()=>display(true)));
  $('#clear-filters').addEventListener('click',()=>{
    category='';query.value='';fit='';size.value='';sort.value='featured';inStock.checked=false;display(true);
  });
  more.addEventListener('click',()=>{
    const firstNew = $('#products').children.length;
    limit += initialShopSize;
    display(false);
    $('#products').children[firstNew]?.focus({preventScroll:true});
  });
  display(true);
}

function renderProduct(main, product) {
  const sizes = Object.keys(product.variants);
  const inStock = productInStock(product);
  let selected = sizes.length === 1 && isAvailable(product,sizes[0]) ? sizes[0] : '';
  const story = releases.find(release=>release.products?.includes(product.id));
  const fitsProductDepartment = item => item && productInStock(item) && item.id!==product.id && department(item)===department(product);
  const archivePairs = (story?.products || []).map(id=>productIndex.get(id)).filter(fitsProductDepartment);
  const related = PRODUCTS.filter(item=>fitsProductDepartment(item) && item.category!==product.category);
  const coordinated = ['tops','bottoms','headwear','accessories'].filter(key=>key!==product.category).map(key=>{
    const shelf=related.filter(item=>item.category===key);
    return shelf.find(item=>item.color===product.color) || shelf[0];
  }).filter(Boolean);
  const pairings = [...new Map([...archivePairs,...coordinated].map(item=>[item.id,item])).values()].slice(0,4);
  const photoAlt=product.name+(product.color?' in '+product.color:'');
  const visual=window.ATN_VISUAL_COPY[product.id];
  const care=product.notes.filter(note=>/^care:|wash|dry clean/i.test(note));
  const fit=product.notes.filter(note=>!care.includes(note) && (/^(fit:|order your usual|go up|pre-shrunk|relaxed fit|fitted|true to size)|fits? (?:true|slim|large)|baggy fit|model (?:is|wears)|\b\d+(?:\.\d+)?[ -]inch(?:es)?\s+(?:inseam|waist|width|length)|\b\d+\s*[×x]\s*\d+\s+inches/i.test(note)));
  const construction=product.notes.filter(note=>!care.includes(note) && !fit.includes(note));
  main.innerHTML = `<div class="content-width">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><a href="/shop/?category=${product.category}">${h(categories[product.category])}</a><span aria-hidden="true">/</span><span aria-current="page">${h(product.name)}</span></nav>
    <section class="product-layout">
      <div class="product-gallery"><figure class="product-main-image"><button type="button" class="photo-zoom" id="open-photo" aria-label="Enlarge photo of ${h(photoAlt)}"><img id="main-photo" src="${imagePath(product.images[0])}" alt="${h(photoAlt)}" width="900" height="900" fetchpriority="high"><span>Enlarge photo</span></button></figure>
        <div class="thumbs" role="group" aria-label="Product gallery">${product.images.map((photo,index)=>`<button type="button" data-photo="${h(photo)}" aria-pressed="${index===0}" aria-label="View photo ${index+1}"><img src="${imagePath(photo)}" width="66" height="66" alt=""></button>`).join('')}</div></div>
      <div class="product-info"><p class="eyebrow">${h(categories[product.category])} · ${audience(product)}</p><h1>${h(product.name)}</h1>
        <p class="product-trademark"><a href="/trademark/">Above The Norm® · U.S. Reg. No. 6,698,259</a></p>
        <div class="price-row"><p class="product-price" id="product-price" aria-live="polite">${selected ? money(product.variants[selected]) : cardPrice(product)}</p>${product.color ? `<p class="product-color">${h(product.color)}</p>` : ''}</div>
        <p class="product-description">${h(visual)}</p>
        ${story ? `<a class="product-story" href="/archive/${story.id}/">Explore ${h(story.name)} in the archive</a>` : ''}
        <div class="variant-head"><span id="size-heading">Select size</span><button type="button" class="text-button" id="show-size-chart" aria-haspopup="dialog" aria-controls="size-chart-dialog">Size chart</button></div>
        <div class="variants" role="group" aria-labelledby="size-heading">${sizes.map(size=>`<button type="button" data-size="${h(size)}" aria-pressed="${selected===size}" ${isAvailable(product,size) ? '' : `disabled aria-label="${h(size)} unavailable"`}>${h(size)}</button>`).join('')}</div>
        ${fit.length ? `<div class="product-fit"><h2>Fit &amp; measurements</h2><ul>${fit.map(note=>`<li>${h(note.replace(/^Fit:\s*/i,''))}</li>`).join('')}</ul></div>` : ''}
        <form class="purchase-row" id="purchase-form"><div class="qty"><button type="button" data-qty="-1" aria-label="Decrease quantity">−</button><input id="quantity" aria-label="Quantity" type="number" value="1" min="1" max="10" inputmode="numeric" required><button type="button" data-qty="1" aria-label="Increase quantity">+</button></div>
          <button class="button dark" id="add-button" ${inStock ? '' : 'disabled'}>${inStock ? 'Add to bag' : 'Sold out'}</button></form>
        ${restockForm(product,sizes)}
        <p id="product-message" class="product-message" role="status"></p><p class="ship-note">Ships in ${shippingPolicy.processing}. Free standard U.S. shipping at ${money(shippingPolicy.standard.freeAt/100)} after discounts.</p>
        ${construction.length ? `<details open><summary>Materials &amp; construction</summary><ul>${construction.map(note=>`<li>${h(note)}</li>`).join('')}</ul></details>` : ''}
        ${care.length ? `<details><summary>Care</summary><ul>${care.map(note=>`<li>${h(note.replace(/^Care:\s*/i,''))}</li>`).join('')}</ul></details>` : ''}
        <details><summary>Shipping &amp; returns</summary><p>Standard U.S. shipping is ${money(shippingPolicy.standard.rate/100)} below the free-shipping threshold. Express is ${money(shippingPolicy.express.rate/100)}. Report damage, defects or a wrong item within seven days of delivery. <a href="/shipping/">Shipping information</a> · <a href="/returns/">Returns &amp; refunds</a></p></details>
      </div>
    </section>
    <section class="related" aria-labelledby="related-title"><div class="section-head"><h2 id="related-title">Complete the look.</h2><a class="button outline" href="/shop/">Shop all pieces</a></div><div class="product-grid">${pairings.map(card).join('')}</div></section>
  </div>`;
  const thumbnails = $$('[data-photo]');
  $('#open-photo').addEventListener('click',()=>{
    const current=$('#main-photo');
    const zoom=$('#zoom-image');
    zoom.src=current.src;
    zoom.alt=current.alt;
    openDialog('zoom');
  });
  thumbnails.forEach(button=>button.addEventListener('click',()=>{
    $('#main-photo').src=imagePath(button.dataset.photo);
    thumbnails.forEach(other=>other.setAttribute('aria-pressed',String(other===button)));
  }));
  const choices = $$('[data-size]');
  const quantity = $('#quantity');
  const message = $('#product-message');
  $('#show-size-chart').addEventListener('click',()=>showProductSizeChart(product,sizes,fit));
  connectRestockForm(product);
  choices.forEach(button=>button.addEventListener('click',()=>{
    selected=button.dataset.size;
    choices.forEach(other=>other.setAttribute('aria-pressed',String(other===button)));
    $('#product-price').textContent=money(product.variants[selected]);
    message.textContent='';
  }));
  $$('[data-qty]').forEach(button=>button.addEventListener('click',()=>{quantity.value=Math.max(1,Math.min(10,(Number(quantity.value)||1)+Number(button.dataset.qty)));}));
  $('#purchase-form').addEventListener('submit',event=>{
    event.preventDefault();
    if (!isAvailable(product,selected)) {
      message.textContent='Choose an available size to add this piece.';
      choices.find(button=>!button.disabled)?.focus();
      return;
    }
    changeBag(product.id,selected,Number(quantity.value));
    message.textContent='';
    openDialog('bag');
  });
}

function archiveCard(release) {
  const cover = release.media[0];
  return `<a class="archive-card ${cover ? '' : 'early'}" href="/archive/${release.id}/">
      <img ${['the-rebirth','planet-hollywood'].includes(release.id) ? 'class="art-graphic"' : ''} src="/assets/${cover ? cover[0] : 'atn-mark.png'}" alt="${cover ? h(cover[1]) : ''}" width="720" height="460" loading="lazy">
      <div class="archive-detail-body"><p class="eyebrow">${h(release.date)} · ${h(release.type)}</p><h2>${h(release.name)}</h2><p>${h(release.summary)}</p></div>
    </a>`;
}

function pageIntro(kicker, title, description, compact = false) {
  return `<header class="page-intro content-width${compact?' compact-intro':''}">${kicker ? `<p class="eyebrow">${h(kicker)}</p>` : ''}<h1>${h(title)}</h1>${description ? `<p>${h(description)}</p>` : ''}</header>`;
}

function renderArchive(main) {
  main.innerHTML = pageIntro('', 'The archive.', '') +
    `<div class="archive content-width"><div class="archive-grid">${releases.map(archiveCard).join('')}</div></div>`;
}

function renderLookbook(main) {
  main.innerHTML=pageIntro('Los Angeles · 2026','In the Clouds.','')+
    `<article class="content-width lookbook-page">
      <section class="reel" id="lookbook-edit" aria-labelledby="lookbook-edit-title">
        <video controls playsinline preload="none" poster="/assets/${cloudLookbook[1][0]}" aria-labelledby="lookbook-edit-title" width="576" height="720">
          <source src="/assets/editorial/in-the-clouds-edit.mp4" type="video/mp4">
          <p><a href="/assets/editorial/in-the-clouds-edit.mp4">Play the In the Clouds video</a></p>
        </video>
        <div class="reel-copy"><h2 id="lookbook-edit-title">The lookbook edit.</h2><p>Five looks from ATN’s Los Angeles campaign, cut from the original photography.</p><a href="#lookbook-credits">Campaign credits</a></div>
      </section>
      <div class="lookbook-editorial">${cloudLookbook.map(([file,alt],index)=>`<figure><img src="/assets/${file}" alt="${h(alt)}" width="880" height="1100" ${index===0?'fetchpriority="high"':'loading="lazy"'}></figure>`).join('')}</div>
      <section class="lookbook-credits" id="lookbook-credits" aria-labelledby="credits-title">
        <h2 id="credits-title">Campaign credits.</h2>
        <dl><div><dt>Photography</dt><dd>Austin “Irrelevant” Smith</dd></div><div><dt>Graphics</dt><dd>Liv</dd></div><div><dt>Models</dt><dd>Derek and Gage</dd></div><div><dt>Creative direction</dt><dd>Token and Liv</dd></div><div><dt>Styling</dt><dd>Token and Liliana</dd></div></dl>
      </section>
      <div class="help-actions"><a class="button dark" href="/archive/">Explore the archive</a><a class="button outline" href="/shop/">Shop ATN</a></div>
    </article>`;
  if (location.hash === '#lookbook-edit') $('#lookbook-edit').scrollIntoView();
}

function renderRelease(main, release) {
  const related = (release.products || []).map(id=>productIndex.get(id)).filter(Boolean);
  main.innerHTML = pageIntro(release.date + ' · ' + release.type, release.name, release.summary) +
    `<article class="archive-detail content-width">
      <nav class="crumbs" aria-label="Breadcrumb"><a href="/archive/">Capsule archive</a><span aria-hidden="true">/</span><span aria-current="page">${h(release.name)}</span></nav>
      <div class="article-copy">${release.copy.map(paragraph=>`<p>${h(paragraph)}</p>`).join('')}</div>
      ${release.media.length ? `<div class="archive-media">${release.media.map(([src,alt,wide],i)=>`<figure class="${wide || (release.id==='the-rebirth' && i===0) ? 'wide' : ''}"><img src="/assets/${src}" alt="${h(alt)}" width="1080" height="1080" loading="lazy"></figure>`).join('')}</div>` : ''}
      ${release.credit ? `<p class="photo-credit">${h(release.credit)}</p>` : ''}
      ${release.sources.length ? `<p class="archive-sources">Sources: ${release.sources.map(([label,href])=>href.startsWith('/') ? `<a href="${h(href)}">${h(label)}</a>` : h(label)).join(' · ')}</p>` : ''}
      ${related.length ? `<section class="article-related"><h2>Shop related pieces.</h2><div class="product-grid">${related.map(card).join('')}</div></section>` : ''}
    </article>`;
}

function renderStory(main) {
  main.innerHTML = pageIntro('First collection · 2014', 'Our story.', '') +
    `<div class="story-page content-width">
      <section class="story-layout">
        <div class="article-copy"><h2>From Kansas City<br>to Los Angeles.</h2>
          <p>RJ “Token” Harris grew up in Kansas City, Missouri. He heard the phrase “above the norm” in Mac Miller’s “The Star Room” while in college in 2013. The following year he used it for his first collection, Phone Home.</p>
          <p>Token moved to Los Angeles in 2018. He spent years learning how to take a graphic from sketch to print, working with local screen printers and developing his own cut-and-sew tee. His designs build a backstory around Norm, the brand’s alien mascot.</p>
          <p>In 2021, ATN landed its first exclusive deal with Zumiez. Token later directed campaigns including <a href="/archive/sent-from-above/">Sent From Above</a> and co-directed <a href="/lookbook/">In the Clouds</a> with Liv.</p>
          <nav class="article-sources" aria-label="Founder coverage"><a href="/press/#canvasrebel">CanvasRebel profile</a><a href="/press/#voyage-la">Voyage LA profile</a></nav>
        </div>
        <figure class="founder-portrait"><img src="/assets/press-voyage.jpg" alt="Portrait of Above The Norm founder RJ “Token” Harris wearing dark sunglasses" width="768" height="1152"><figcaption>RJ “Token” Harris. Photography by Austin “Irrelevant” Smith for Voyage LA, 2020.</figcaption></figure>
      </section>
      <section class="timeline" aria-labelledby="timeline-title"><h2 id="timeline-title" class="sr-only">Above The Norm timeline</h2>
        <div><strong>2013</strong><p>Token hears the phrase that becomes the brand name.</p></div>
        <div><strong>2014</strong><p>Token releases his first garments through <a href="/archive/phone-home/">Phone Home</a>, as recounted in his Voyage LA interview.</p></div>
        <div><strong>2017</strong><p><a href="/press/#complex-shop">Complex Shop’s brand profile</a> lists this as ATN’s founding year.</p></div>
        <div><strong>2018</strong><p>Token moves to Los Angeles.</p></div>
        <div><strong>2020</strong><p>Voyage LA and Tyrel Hunt profile Token and the label.</p></div>
        <div><strong>2021–22</strong><p>ATN lands its first exclusive deal with Zumiez and follows it with a second collection. <a href="/archive/zumiez-early-releases/">Explore the early retail years</a>.</p></div>
        <div><strong>2024</strong><p>ATN shares the <a href="/archive/sent-from-above/">Sent From Above</a> campaign, including its Guardian Angel and Most High graphics.</p></div>
        <div><strong>2025</strong><p>The seven-piece <a href="/archive/the-rebirth/">Rebirth</a> capsule launches through Complex Shop.</p></div>
        <div><strong>2026</strong><p><a href="/archive/planet-hollywood/">Planet Hollywood</a> and <a href="/lookbook/">In the Clouds</a> join the ATN catalog and campaign archive.</p></div>
      </section>
    </div>`;
}

function renderPress(main){
  const features=[
    ['canvasrebel','CanvasRebel','November 2022','press-canvas.jpg','Photo by Austin “Irrelevant” Smith. Edit by Travis Baker.',
      'Token described learning to source garments and finding printers who could translate his drawings into clothing. He also recalled the first ATN release at Zumiez in 2021, which reached more than 30 stores at the time.', '/archive/zumiez-early-releases/','The Zumiez years'],
    ['voyage-la','Voyage LA','August 2020','press-voyage.jpg','Photo by Austin “Irrelevant” Smith.',
      'The interview traces the brand from Kansas City to Los Angeles. Token remembers hearing “above the norm” on a Mac Miller track in college and making his first pieces under the name Phone Home in 2014.', '/story/','Meet Token'],
    ['complex-shop','Complex Shop','2025','editorial/complex-wide.webp','Above The Norm campaign via Complex Shop.',
      'Complex Shop profiled ATN and carried the seven-piece Rebirth capsule. The release included graphic tees, hoodies, a jersey and camouflage bottoms.', '/archive/the-rebirth/','Explore The Rebirth']
  ];
  main.innerHTML=pageIntro('','Press.','')+`<div class="press-page content-width">${features.map(([id,title,date,img,credit,copy,url,link])=>`<article class="press-feature" id="${id}"><figure><img src="/assets/${img}" alt="${h(title)} coverage of Above The Norm" loading="lazy"><figcaption>${h(credit)}</figcaption></figure><div class="article-copy"><p class="eyebrow">${h(date)}</p><h2>${h(title)}</h2><p>${h(copy)}</p><a href="${url}">${h(link)}</a></div></article>`).join('')}</div>`;
  const anchor=location.hash.slice(1);
  if(anchor) document.getElementById(anchor)?.scrollIntoView();
}

const key = 'atn-storefront-bag-v1';
const shippingKey = 'atn-bag-shipping';
const offerKey = 'atn-apply-welcome';
const newsletterKey = 'atn-newsletter-joined';
const seenKey = 'atn-newsletter-seen';
const welcome = window.ATN_COMMERCE_POLICY.welcome;
function localPreference(key,value){
  try {
    if(value!==undefined) localStorage.setItem(key,value);
    return localStorage.getItem(key);
  } catch { return null; }
}
let offerApplied=localPreference(offerKey)==='1';
let shippingMethod=localPreference(shippingKey)==='express'?'express':'standard';
function setWelcomeOffer(applied){
  offerApplied=applied;
  localPreference(offerKey,applied?'1':'0');
  renderBag();
}
function readBag() {
  try {
    const data = JSON.parse(localStorage.getItem(key) || '[]');
    if (!Array.isArray(data)) return [];
    return data.filter(line=>{
      const product = line && productIndex.get(line.id);
      return product && Object.hasOwn(product.variants,line.size) && Number.isInteger(line.quantity) && line.quantity>0 && line.quantity<=10;
    });
  } catch {
    return [];
  }
}
let bag = readBag();

function saveBag() {
  try { localStorage.setItem(key,JSON.stringify(bag)); } catch {}
  renderBag();
}

function changeBag(id,size,delta) {
  const existing = bag.findIndex(line=>line.id===id && line.size===size);
  if (existing>=0) {
    const quantity = Math.min(10,bag[existing].quantity+delta);
    if (quantity<=0) bag.splice(existing,1);
    else bag[existing].quantity=quantity;
  } else if (delta>0) {
    bag.push({id,size,quantity:Math.min(10,delta)});
  }
  saveBag();
}

function renderBag() {
  refreshCheckout();
  const count = bag.reduce((sum,line)=>sum+line.quantity,0);
  const countLabel = $('[data-bag-count]');
  countLabel.textContent = count;
  countLabel.parentElement.setAttribute('aria-label',`Bag, ${count} ${count===1 ? 'item' : 'items'}`);
  const node = $('#bag-content');
  if (!bag.length) {
    node.innerHTML = `<div class="bag-empty"><p>Your bag is empty.</p>${offerApplied?'<p>The welcome offer is ready for your first order.</p>':''}<a class="button dark" href="/shop/">Shop the collection</a></div>`;
    return;
  }
  const {subtotal,savings,net:merchandise}=bagTotals();
  node.innerHTML = bag.map((line,index)=>{
    const p=productIndex.get(line.id);
    return `<div class="bag-line">
      <a href="${itemPath(p)}" aria-label="${h(p.name)}"><img src="${imagePath(p.images[0])}" alt="" height="68" width="68"></a>
      <div><a href="${itemPath(p)}"><strong>${h(p.name)}</strong></a><small>${h(p.color ? p.color + ' · ' : '')}${h(line.size)}${isAvailable(p,line.size)?'':' · Unavailable'}</small>
      <div class="qty"><button type="button" data-change="${index}" data-delta="-1" aria-label="Decrease quantity of ${h(p.name)}">−</button><span>${line.quantity}</span><button type="button" data-change="${index}" data-delta="1" aria-label="Increase quantity of ${h(p.name)}" ${line.quantity>=10 || !isAvailable(p,line.size)?'disabled':''}>+</button></div>
      <button type="button" class="text-button" data-remove="${index}">Remove</button></div><strong>${money(p.variants[line.size]*line.quantity)}</strong>
    </div>`;
  }).join('') + `<div class="bag-total"><span>Merchandise subtotal</span><span>${money(subtotal/100)}</span></div>
    ${savings ? `<div class="bag-total bag-discount"><span class="bag-discount-code">${welcome.code} · ${welcome.percent}% off</span><span>−${money(savings/100)}</span></div><div class="bag-total bag-discount"><span>Merchandise after discount</span><span>${money(merchandise/100)}</span></div><button type="button" class="text-button" data-welcome-offer="remove">Remove discount</button>` :
      localPreference(newsletterKey)==='1' ? '<button type="button" class="text-button" data-welcome-offer="apply">Apply my 10% welcome discount</button>' : ''}
    <a class="button dark bag-submit" href="/checkout/">Checkout</a>`;
}

$('#bag-content').addEventListener('click',event=>{
  const discountButton=event.target.closest('button[data-welcome-offer]');
  if(discountButton){
    setWelcomeOffer(discountButton.dataset.welcomeOffer==='apply');
    $('#bag-content .bag-submit')?.focus();
    return;
  }
  const button=event.target.closest('button[data-change],button[data-remove]');
  if (!button) return;
  if (button.hasAttribute('data-remove')) bag.splice(Number(button.dataset.remove),1);
  else {
    const line=bag[Number(button.dataset.change)];
    if (line) {
      const position=button.dataset.change;
      const direction=button.dataset.delta;
      changeBag(line.id,line.size,Number(direction));
      const replacement=$(`[data-change="${position}"][data-delta="${direction}"]:not(:disabled)`) || $('#bag-content .bag-submit') || $('#bag-content a');
      replacement?.focus();
      return;
    }
  }
  saveBag();
  ($('#bag-content .bag-submit') || $('#bag-content a'))?.focus();
});
window.addEventListener('storage',event=>{
  if([key,offerKey,shippingKey,null].includes(event.key)){
    bag=readBag();
    offerApplied=localPreference(offerKey)==='1';
    shippingMethod=localPreference(shippingKey)==='express'?'express':'standard';
    renderBag();
  }
});

const searchInput = $('#site-search');
const searchFitInput = $('#search-form input[name="fit"]');
function showSuggestions() {
  const tokens=words(searchInput.value);
  const region=$('#search-results');
  if (!tokens.length) { region.innerHTML=''; return; }
  const fit=searchFitInput.value;
  const results=PRODUCTS.filter(p=>(!fit || department(p)===fit) && searchMatches(p,tokens));
  region.innerHTML = results.length ?
    `<p class="search-total">${results.length} ${results.length===1?'match':'matches'}</p>`+results.slice(0,5).map(p=>`<a class="search-row" href="${itemPath(p)}"><img src="${imagePath(p.images[0])}" alt="" width="68" height="68"><span><strong>${h(p.name)}</strong><small>${h(p.color || categories[p.category])}</small></span><strong>${cardPrice(p)}</strong></a>`).join('') :
    '<p class="search-total">No matches. Try a different keyword.</p>';
}
searchInput.addEventListener('input',showSuggestions);
const panels = Object.fromEntries(['search','bag','menu','zoom','newsletter','size-chart'].map(name=>[name,$('#'+name+'-dialog')]));
function openDialog(name) {
  const next = panels[name];
  Object.values(panels).forEach(dialog=>{if(dialog!==next && dialog.open) dialog.close();});
  if (!next.open) next.showModal();
  if (name==='search'){
    const fit=/^\/shop\/?$/.test(location.pathname)?new URLSearchParams(location.search).get('fit'):'';
    searchFitInput.value=Object.hasOwn(departmentNames,fit)?fit:'';
    searchFitInput.disabled=!searchFitInput.value;
    showSuggestions();
    searchInput.focus();
  }
}
$$('[data-open]').forEach(button=>button.addEventListener('click',()=>openDialog(button.dataset.open)));
$$('[data-close]').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
Object.values(panels).forEach(dialog=>dialog.addEventListener('click',event=>{
  if (event.target!==dialog) return;
  const box=dialog.getBoundingClientRect();
  if (event.clientX<box.left || event.clientX>box.right || event.clientY<box.top || event.clientY>box.bottom) dialog.close();
}));

const newsletterForm=$('#newsletter-form');
const newsletterStatus=$('#newsletter-status');
const useWelcome=$('#use-welcome');
function showWelcome(){
  newsletterForm.hidden=true;
  newsletterStatus.textContent=`You’re on the list. Use ${welcome.code} for ${welcome.percent}% off your first order.`;
  useWelcome.hidden=false;
}
if(localPreference(newsletterKey)==='1')showWelcome();
panels.newsletter.addEventListener('close',()=>localPreference(seenKey,String(Date.now())));
newsletterForm.addEventListener('submit',async event=>{
  event.preventDefault();
  const button=$('button',newsletterForm);
  const email=new FormData(newsletterForm).get('email');
  button.disabled=true;
  newsletterStatus.textContent='Joining the list…';
  try{
    const result=await fetch('/api/newsletter',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,consent:true})});
    const data=await result.json();
    if(!result.ok)throw Error(data.error||'Try again in a moment.');
    if(data.code!==welcome.code || data.percent!==welcome.percent)throw Error('Could not confirm your offer. Try again.');
    localPreference(newsletterKey,'1');
    newsletterForm.reset();
    showWelcome();
    useWelcome.focus();
  }catch(error){
    newsletterStatus.textContent=error instanceof SyntaxError ? 'Signup is temporarily unavailable. Try again in a moment.' : error.message;
  }finally{
    button.disabled=false;
  }
});
useWelcome.addEventListener('click',()=>{
  setWelcomeOffer(true);
  if(bag.length)openDialog('bag');
  else {
    newsletterStatus.textContent=`${welcome.code} is ready for your first order.`;
    useWelcome.hidden=true;
    $('.close',panels.newsletter).focus();
  }
});

function renderNotFound(main) {
  main.innerHTML = pageIntro('Above The Norm', 'Page not found.', 'Explore the catalog to find your next piece.') + '<div class="help-page content-width"><a class="button dark" href="/shop/">Back to the shop</a></div>';
}

const main = $('#main-content');
const [route,slug] = location.pathname.split('/').filter(Boolean);
const activeNav = route === 'products' ? 'shop' : route;
if (activeNav && ['shop','archive','story','lookbook','partners'].includes(activeNav)) $(`[data-nav="${activeNav}"]`)?.setAttribute('aria-current','page');
if (!route || route==='index.html') {
  hydrateFeatured();
  if(localPreference(newsletterKey)!=='1' && Date.now()-Number(localPreference(seenKey))>7*86400000){
    setTimeout(()=>{
      if(!document.hidden && !document.querySelector('dialog[open]'))openDialog('newsletter');
    },1000);
  }
}
else if (route==='shop' && !slug) renderShop(main);
else if (route==='products' && productIndex.has(slug)) renderProduct(main,productIndex.get(slug));
else if (route==='archive' && !slug) renderArchive(main);
else if (route==='archive' && releases.some(r=>r.id===slug)) renderRelease(main,releases.find(r=>r.id===slug));
else if (route==='story' && !slug) renderStory(main);
else if (route==='lookbook' && !slug) renderLookbook(main);
else if (route==='press' && !slug) renderPress(main);
else if (route==='help' && !slug) renderHelp(main);
else if (route==='partners' && !slug) renderPartners(main);
else if (route==='checkout' && !slug) renderCheckout(main);
else if (route==='checkout' && slug==='complete') renderOrderStatus(main);
else if (!slug && Object.hasOwn(customerPages,route)) renderCustomerPage(main,route);
else if (!main.hasAttribute('data-static-page')) renderNotFound(main);
renderBag();
