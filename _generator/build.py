"""Builds the static Above The Norm site.

    python3 _generator/build.py

Reads data.py (business facts, policies) and products.json (catalog), writes every
HTML page plus assets/js/catalog.js into the site folder. Don't hand-edit the
generated HTML; change the data or templates here and rebuild.
"""
import json
import os
from html import escape as e

from data import BIZ, CATS, COUPON, FAQ, GENDERS, SHIP, UPDATED

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.dirname(HERE)
PRODUCTS = json.load(open(os.path.join(HERE, "products.json"), encoding="utf-8"))
CAT_NAME = dict(CATS)
ADDRESS = f"{BIZ['street']}, {BIZ['city']}, {BIZ['state']} {BIZ['zip']}"


def money(v):
    return f"${v:,.2f}" if v % 1 else f"${v:,.0f}"


def low(p):
    return min(p["prices"].values())


def img(p, i=0):
    if p["images"] and i < len(p["images"]):
        return "assets/img/products/" + p["images"][i]
    return "assets/img/placeholder.svg"


def gender_label(p):
    g = p["gender"]
    return "Unisex" if len(g) == 2 else dict(GENDERS)[g[0]]


# ---------------------------------------------------------------- layout

ICON = {
    "bag": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1 12H6L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
    "menu": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h18M3 12h18M3 17h18"/></svg>',
    "close": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    "lock": '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="1"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
    "truck": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 6h12v10H2zM14 10h4l3 3v3h-7"/><circle cx="6" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/></svg>',
    "shield": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4 6v6c0 4.5 3.4 8.2 8 9 4.6-.8 8-4.5 8-9V6l-8-3Z"/><path d="m9 12 2 2 4-4"/></svg>',
    "instagram": '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6" fill="currentColor"/></svg>',
    "search": '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/></svg>',
    "mail": '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="1"/><path d="m3 7 9 6 9-6"/></svg>',
}


def header(r, active):
    def nav(href, label, key):
        cur = ' aria-current="page"' if key == active else ""
        return f'<a href="{r}{href}"{cur}>{label}</a>'

    cats = nav("shop.html", "Shop All", "shop") + "".join(nav(f"shop.html?c={k}", v, k) for k, v in CATS)
    main = (nav("shop.html", "Shop All", "shop") + nav("shop.html?g=men", "Men", "men")
            + nav("shop.html?g=women", "Women", "women")
            + "".join(nav(f"shop.html?c={k}", v, k) for k, v in CATS)
            + nav("about.html", "About", "about"))
    return f"""
<div class="announce"><div class="announce__track">
  <span><a class="announce__offer" href="{r}shop.html" data-apply-coupon>{COUPON['pct']}% off your first order · code <b>{COUPON['code']}</b></a></span><span aria-hidden="true">✦</span>
  <span>Free U.S. shipping on orders {money(SHIP['free_over'])}+</span><span aria-hidden="true">✦</span>
  <span>Every order ships with tracking</span>
</div></div>
<header class="hdr">
  <div class="hdr__in">
    <button class="hdr__burger" type="button" aria-label="Open menu" data-menu-open>{ICON['menu']}</button>
    <a class="brand" href="{r}index.html" aria-label="{BIZ['brand']} home">
      <img src="{r}assets/img/logo.png" alt="" width="34" height="46">
      <span>Above The Norm<sup>®</sup></span>
    </a>
    <div class="hdr__tools">
      <button class="hdr__tool hdr__search-btn" type="button" aria-label="Search" data-search-open>{ICON['search']}<span>Search</span></button>
      <a class="hdr__tool" href="{r}contact.html">{ICON['mail']}<span>Contact</span></a>
      <a class="hdr__tool hdr__cart" href="{r}cart.html" aria-label="Bag">{ICON['bag']}<span>Bag</span><span class="hdr__count" data-cart-count>0</span></a>
    </div>
  </div>
  <nav class="hdr__nav" aria-label="Main"><div class="hdr__nav-in">{main}</div></nav>
</header>
<div class="search" data-search hidden>
  <div class="search__panel" role="dialog" aria-modal="true" aria-label="Search products">
    <form class="search__form wrap" action="{r}shop.html" role="search">
      {ICON['search']}
      <input type="search" name="q" placeholder="Search tees, hoodies, beanies…" autocomplete="off" aria-label="Search products" data-search-input>
      <button class="search__close" type="button" aria-label="Close search" data-search-close>{ICON['close']}</button>
    </form>
    <div class="search__results wrap" data-search-results></div>
  </div>
</div>
<div class="drawer" data-menu hidden>
  <div class="drawer__panel">
    <button class="drawer__close" type="button" aria-label="Close menu" data-menu-close>{ICON['close']}</button>
    <p class="drawer__label">Shop</p>
    <nav>{nav("shop.html?g=men", "Men", "men")}{nav("shop.html?g=women", "Women", "women")}{cats}</nav>
    <p class="drawer__label">Info</p>
    <nav class="drawer__sm">{nav("about.html", "About", "about")}{nav("contact.html", "Contact", "contact")}<a href="{r}faq.html">FAQ</a><a href="{r}shipping.html">Shipping</a><a href="{r}returns.html">Returns</a></nav>
  </div>
</div>"""


def footer(r):
    def col(title, links):
        items = "".join(f'<li><a href="{r}{h}">{t}</a></li>' for h, t in links)
        return f'<nav class="ftr__col" aria-label="{title}"><ul>{items}</ul></nav>'
    shop = [("shop.html", "Shop All"), ("shop.html?g=men", "Men"), ("shop.html?g=women", "Women")] + [(f"shop.html?c={k}", v) for k, v in CATS]
    help_ = [("contact.html", "Contact Us"), ("faq.html", "FAQ"), ("size-guide.html", "Size Guide"),
             ("shipping.html", "Shipping Policy"), ("returns.html", "Returns &amp; Refunds")]
    company = [("about.html", "About Us"), ("privacy.html", "Privacy Policy"), ("terms.html", "Terms of Service")]
    phone = f'<li><a href="tel:{BIZ["phone"]}">{BIZ["phone"]}</a></li>' if BIZ["phone"] else ""
    return f"""
<footer class="ftr">
  <div class="ftr__main wrap">
    <div class="ftr__brand">
      <a class="ftr__logo" href="{r}index.html"><img src="{r}assets/img/logo.png" alt="" width="26" height="35"><span>Above The Norm<sup>®</sup></span></a>
      <p>Refuse to be normal.</p>
    </div>
    <div class="ftr__cols">
      {col("Shop", shop)}
      {col("Help", help_)}
      {col("Company", company)}
      <div class="ftr__col ftr__contact"><ul>
        <li><a href="mailto:{BIZ['email']}">{BIZ['email']}</a></li>{phone}
        <li>{BIZ['legal']}<br>{BIZ['street']}<br>{BIZ['city']}, {BIZ['state']} {BIZ['zip']}</li></ul></div>
    </div>
  </div>
  <div class="ftr__bar wrap">
    <a class="ftr__ig" href="{BIZ['instagram']}" rel="noopener" target="_blank" aria-label="Follow us on Instagram">{ICON['instagram']}</a>
    <p>© 2026 {BIZ['legal']}. All rights reserved. ABOVE THE NORM® is a registered trademark, U.S. Reg. No. {BIZ['tm_reg']}.</p>
    <p class="ftr__pay"><span>{ICON['lock']} Secure checkout</span> · Visa · Mastercard · American Express · Discover</p>
  </div>
</footer>"""


def promo(r):
    return f"""<div class="promo" data-promo hidden role="dialog" aria-modal="true" aria-labelledby="promo-title">
  <div class="promo__card">
    <button class="promo__close" type="button" aria-label="Close offer" data-promo-close>{ICON['close']}</button>
    <div class="promo__art" aria-hidden="true"><img src="{r}assets/img/products/{COUPON['image']}" alt="" loading="lazy" width="1000" height="1000"><span>{COUPON['pct']}%</span><small>off your first order</small></div>
    <div class="promo__body">
      <p class="kicker">Welcome offer</p>
      <h2 id="promo-title">Take {COUPON['pct']}% off your first order</h2>
      <p>Use this code in your bag or at checkout.</p>
      <div class="promo__code"><code>{COUPON['code']}</code><button class="btn btn--light" type="button" data-promo-copy>Copy code</button></div>
      <a class="btn btn--block" href="{r}shop.html" data-promo-shop>Shop now</a>
      <button class="promo__no" type="button" data-promo-close>No thanks</button>
      <p class="promo__fine">{e(COUPON['terms'])} See <a href="{r}terms.html">Terms</a>.</p>
    </div>
  </div>
</div>"""


def cookie_bar(r):
    return f"""<div class="cookies" data-cookies hidden role="region" aria-label="Cookie preferences">
  <p>We use cookies to keep your bag and checkout working, and to understand how the site is used. See our <a href="{r}privacy.html#cookies">Privacy Policy</a>.</p>
  <div class="cookies__btns"><button class="btn btn--ghost" type="button" data-cookies-choice="essential">Essential only</button><button class="btn btn--light" type="button" data-cookies-choice="all">Accept all</button></div>
</div>"""


def coupon_box():
    return """<form class="coupon" data-coupon novalidate>
      <label for="coupon-code">Discount code</label>
      <div class="coupon__row"><input id="coupon-code" name="code" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="Enter code"><button class="btn" type="submit">Apply</button></div>
      <p class="coupon__msg" data-coupon-msg role="status"></p>
    </form>"""


def page(path, title, desc, body, active="", cls=""):
    depth = path.count("/")
    r = "../" * depth
    full = f"{title} | {BIZ['brand']}" if title else f"{BIZ['brand']}® | Refuse to Be Normal"
    html = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(full)}</title>
<meta name="description" content="{e(desc)}">
<meta property="og:title" content="{e(full)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:type" content="website">
<link rel="icon" type="image/png" href="{r}assets/img/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=Space+Grotesk:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{r}assets/css/style.css">
</head>
<body class="{cls}" data-root="{r}">
<a class="skip" href="#main">Skip to content</a>
{header(r, active)}
<main id="main">
{body}
</main>
{footer(r)}
{"" if path in ("cart.html", "checkout.html") else promo(r)}
{cookie_bar(r)}
<script src="{r}assets/js/catalog.js"></script>
<script src="{r}assets/js/app.js"></script>
</body>
</html>
"""
    dest = os.path.join(OUT, path)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(dest, "w", encoding="utf-8") as f:
        f.write(html.replace("{R}", r))


# ---------------------------------------------------------------- components

def card(p, r="", order=0):
    second = ""
    if len(p["images"]) > 1:
        second = f'<img class="card__alt" src="{r}{img(p, 1)}" alt="" loading="lazy" width="600" height="600">'
    ph = " is-ph" if p["placeholder"] else ""
    return f"""<a class="card" href="{r}products/{p['id']}.html" data-cat="{p['cat']}" data-gender="{' '.join(p['gender'])}" data-price="{low(p)}" data-order="{order}" data-text="{e((p['name'] + ' ' + p['color'] + ' ' + CAT_NAME[p['cat']] + ' ' + p.get('type', '')).lower())}">
  <div class="card__img{ph}"><img src="{r}{img(p)}" alt="{e(p['name'])}{(' in ' + e(p['color'])) if p['color'] else ''}" loading="lazy" width="600" height="600">{second}</div>
  <div class="card__meta"><span class="card__name">{e(p['name'])}</span><span class="card__price">{money(low(p))}</span></div>
  <span class="card__sub">{e(p['color'] or CAT_NAME[p['cat']])} · {gender_label(p)}</span>
</a>"""


def section_head(kicker, title, link=None):
    a = f'<a class="link-arrow" href="{link[0]}">{link[1]} →</a>' if link else ""
    return f'<div class="sec-head"><div><p class="kicker">{kicker}</p><h2>{title}</h2></div>{a}</div>'


ASSURE = [
    ("lock", "Secure checkout", "Encrypted payment processing. We never store your full card number.", "privacy.html"),
    ("truck", f"Ships in {SHIP['processing_short']}", "Small-run production, then tracked delivery anywhere in the U.S.", "shipping.html"),
    ("shield", "Arrives right or we fix it", f"Damaged, defective or wrong item? Tell us within {SHIP['claim_days']} days.", "returns.html"),
    ("mail", "Real people, real replies", f"Email {BIZ['email']}. We answer within 1–2 business days.", "contact.html"),
]


def assurances(r=""):
    items = "".join(
        f'<a class="assure__item" href="{r}{href}">{ICON[ic]}<strong>{t}</strong><span>{d}</span></a>'
        for ic, t, d, href in ASSURE)
    return f'<section class="assure"><div class="wrap assure__grid">{items}</div></section>'


# ---------------------------------------------------------------- pages

def build_home():
    real = [p for p in PRODUCTS if not p["placeholder"]]
    by_id = {p["id"]: p for p in PRODUCTS}
    hero = by_id.get("path-to-ascension-hoodie", real[0])
    picks = ["no-ceilings-tee", "sent-from-above-hoodie-black", "lord-protect-me-tee", "crash-landing-hoodie-yellow",
             "retired-hoop-dream-sweats-black", "badge-logo-dad-hat-blue", "nn-cult-crewneck", "logo-pearl-necklace"]
    arrivals = "".join(card(by_id[h], order=i) for i, h in enumerate(picks) if h in by_id)
    men_img = by_id.get("levitate-above-the-norm-hoodie-white", real[1])
    wom_img = by_id.get("your-desires-tee", real[2])

    def count(cat):
        return sum(1 for p in PRODUCTS if p["cat"] == cat)

    cat_img = {"tops": "norm-the-alien-crewneck-blue", "bottoms": "logo-flared-track-pants",
               "headwear": "atn-hazard-dad-hat", "accessories": "motel-atn-key-fob"}
    cats = "".join(f"""<a class="cat" href="shop.html?c={k}">
  <span class="cat__num">0{i + 1}</span>
  <div class="cat__img"><img src="{img(by_id[cat_img[k]])}" alt="" loading="lazy" width="600" height="600"></div>
  <span class="cat__name">{v}</span><span class="cat__count">{count(k)} pieces</span>
</a>""" for i, (k, v) in enumerate(CATS))

    spot = by_id.get("trippy-mind-hoodie") or by_id.get("black-jesus-hoodie-black") or real[3]
    spot = by_id.get("not-your-average-work-shirt-sky-blue", spot)
    spot_rows = "".join(f"<li>{e(d)}</li>" for d in spot["details"][:5])

    body = f"""
<section class="hero">
  <div class="hero__stars" aria-hidden="true"></div>
  <div class="wrap hero__grid">
    <div class="hero__copy">
      <p class="kicker kicker--light">Collection {UPDATED[-4:]} · Est. {BIZ['founded']}</p>
      <h1 class="hero__title"><span>Refuse</span><span>to be</span><span class="hero__strike">normal.</span></h1>
      <p class="hero__lede">Independent streetwear about angels, outsiders and everything that doesn't fit the mold. Printed in small runs, made to be worn hard.</p>
      <div class="hero__cta">
        <a class="btn btn--light" href="shop.html">Shop the collection</a>
        <a class="btn btn--ghost" href="about.html">Our story</a>
      </div>
    </div>
    <a class="hero__piece" href="products/{hero['id']}.html">
      <span class="hero__beam" aria-hidden="true"></span>
      <img src="{img(hero)}" alt="{e(hero['name'])}" width="700" height="700">
      <span class="hero__tag"><em>Now showing</em>{e(hero['name'])} · {money(low(hero))}</span>
    </a>
  </div>
</section>

<div class="ticker" aria-hidden="true"><div class="ticker__track">
  {"".join('<span>Above The Norm®</span><span>✦</span><span>Sent from above</span><span>✦</span><span>Not normal since ' + str(BIZ['founded']) + '</span><span>✦</span>' for _ in range(4))}
</div></div>

<section class="wrap split-tiles">
  <a class="gtile gtile--dark" href="shop.html?g=men">
    <img src="{img(men_img)}" alt="" loading="lazy" width="700" height="700">
    <div><p class="kicker kicker--light">Shop</p><h2>Men</h2><span class="link-arrow">{sum('men' in p['gender'] for p in PRODUCTS)} pieces →</span></div>
  </a>
  <a class="gtile" href="shop.html?g=women">
    <img src="{img(wom_img)}" alt="" loading="lazy" width="700" height="700">
    <div><p class="kicker">Shop</p><h2>Women</h2><span class="link-arrow">{sum('women' in p['gender'] for p in PRODUCTS)} pieces →</span></div>
  </a>
</section>

<section class="wrap block">
  {section_head("Just landed", "New arrivals", ("shop.html", "View all"))}
  <div class="grid">{arrivals}</div>
</section>

<section class="manifesto">
  <div class="wrap manifesto__grid">
    <p class="manifesto__quote">“For the ones who were never <em>built to blend in.</em>”</p>
    <div class="manifesto__cols">
      <div><span>01</span><h3>Designed, not templated</h3><p>Every graphic starts as an original illustration. No stock art, no generic designs with a logo slapped on.</p></div>
      <div><span>02</span><h3>Small runs</h3><p>We produce in limited quantities so pieces stay special and nothing ends up in a landfill sale bin.</p></div>
      <div><span>03</span><h3>Heavy and built to last</h3><p>Heavyweight cottons, puff and screen prints, sewn-in labels. Clothes that get better with every wash.</p></div>
    </div>
  </div>
</section>

<section class="wrap block">
  {section_head("Browse", "Shop by category")}
  <div class="cats">{cats}</div>
</section>

<section class="wrap spot">
  <div class="spot__img"><img src="{img(spot)}" alt="{e(spot['name'])}" loading="lazy" width="700" height="700"></div>
  <div class="spot__body">
    <p class="kicker">Spec sheet</p>
    <h2>{e(spot['name'])}</h2>
    <p class="spot__price">{money(low(spot))}</p>
    <ul class="spec">{spot_rows}</ul>
    <a class="btn" href="products/{spot['id']}.html">View the piece</a>
  </div>
</section>

{assurances()}
"""
    page("index.html", "", "Above The Norm® is independent streetwear from Above The Norm LLC: graphic tees, hoodies, sweats, headwear and accessories for men and women, in small runs since 2019.", body, cls="home")


def build_shop():
    cards = "".join(card(p, order=i) for i, p in enumerate(PRODUCTS))
    gchips = '<button type="button" class="chip" data-g="all" aria-pressed="true">All</button>' + "".join(
        f'<button type="button" class="chip" data-g="{k}" aria-pressed="false">{v}</button>' for k, v in GENDERS)
    cchips = '<button type="button" class="chip" data-c="all" aria-pressed="true">All</button>' + "".join(
        f'<button type="button" class="chip" data-c="{k}" aria-pressed="false">{v}</button>' for k, v in CATS)
    body = f"""
<section class="page-hero wrap">
  <p class="kicker">The collection</p>
  <h1 data-shop-title>Shop All</h1>
  <p class="page-hero__lede">Tees, hoodies, sweats, headwear and accessories. Filter by who it's for and what it is.</p>
</section>
<section class="wrap shop">
  <div class="filters" role="group" aria-label="Filter products">
    <div class="filters__row"><span class="filters__label">Shop for</span><div class="chips">{gchips}</div></div>
    <div class="filters__row"><span class="filters__label">Category</span><div class="chips">{cchips}</div></div>
    <div class="filters__row filters__row--end">
      <span class="filters__count" data-count>{len(PRODUCTS)} products</span>
      <label class="sort">Sort
        <select data-sort>
          <option value="featured">Featured</option>
          <option value="low">Price: low to high</option>
          <option value="high">Price: high to low</option>
        </select>
      </label>
    </div>
  </div>
  <div class="grid" data-grid>{cards}</div>
  <p class="shop__query" data-query hidden>Showing results for <strong data-query-text></strong> · <button type="button" class="link-btn" data-clear-q>Clear search</button></p>
  <p class="empty" data-empty hidden>Nothing matches those filters yet. <button type="button" class="link-btn" data-reset>Clear filters</button></p>
</section>
"""
    page("shop.html", "Shop All", "Shop the full Above The Norm collection for men and women: tops, bottoms, headwear and accessories.", body, active="shop")


def build_products():
    for p in PRODUCTS:
        r = "../"
        gallery = p["images"] or [None]
        main = f'<img src="{r}{img(p)}" alt="{e(p["name"])}" width="900" height="900" data-main>'
        thumbs = ""
        if len(p["images"]) > 1:
            thumbs = '<div class="pdp__thumbs">' + "".join(
                f'<button type="button" class="pdp__thumb" data-thumb="{r}{img(p, i)}" aria-label="View image {i + 1}"{" aria-pressed=\"true\"" if i == 0 else ""}><img src="{r}{img(p, i)}" alt="" width="120" height="120" loading="lazy"></button>'
                for i in range(len(gallery))) + "</div>"
        one = len(p["sizes"]) == 1
        sizes = "".join(
            f'<button type="button" class="size" data-size="{e(s)}" data-price="{v}" aria-pressed="{"true" if one else "false"}">{e(s)}</button>'
            for s, v in p["prices"].items())
        details = "".join(f"<li>{e(d)}</li>" for d in p["details"]) or "<li>Full product details coming soon.</li>"
        related = [q for q in PRODUCTS if q["cat"] == p["cat"] and q["id"] != p["id"] and not q["placeholder"]][:4]
        if len(related) < 4:
            related += [q for q in PRODUCTS if q["cat"] == p["cat"] and q["id"] != p["id"] and q not in related][:4 - len(related)]
        rel = "".join(card(q, r) for q in related)
        size_note = ('<a class="pdp__guide" href="../size-guide.html">Size guide</a>'
                     if p["cat"] in ("tops", "bottoms") else "")
        body = f"""
<nav class="crumbs wrap" aria-label="Breadcrumb"><a href="../index.html">Home</a><span>/</span><a href="../shop.html?c={p['cat']}">{CAT_NAME[p['cat']]}</a><span>/</span><span aria-current="page">{e(p['name'])}</span></nav>
<section class="wrap pdp" data-product="{p['id']}">
  <div class="pdp__gallery"><div class="pdp__main{' is-ph' if p['placeholder'] else ''}">{main}</div>{thumbs}</div>
  <div class="pdp__info">
    <p class="kicker">{CAT_NAME[p['cat']]} · {gender_label(p)}</p>
    <h1>{e(p['name'])}</h1>
    <p class="pdp__price" data-price-label>{money(low(p))}</p>
    {f'<p class="pdp__color">Color: <strong>{e(p["color"])}</strong></p>' if p['color'] else ''}
    <div class="pdp__sizes-head"><span>{'Size: One Size' if one else 'Select size'}</span>{size_note}</div>
    <div class="sizes" role="group" aria-label="Size">{sizes}</div>
    <div class="pdp__buy">
      <div class="qty"><button type="button" data-qty="-1" aria-label="Decrease quantity">−</button><input type="number" value="1" min="1" max="10" aria-label="Quantity" data-qty-input><button type="button" data-qty="1" aria-label="Increase quantity">+</button></div>
      <button type="button" class="btn btn--block" data-add {'disabled' if not p['in_stock'] else ''}>{'Add to bag' if p['in_stock'] else 'Sold out'}</button>
    </div>
    <p class="pdp__msg" data-msg role="status"></p>
    <ul class="pdp__facts">
      <li>{ICON['truck']} Ships in {SHIP['processing_short']} · free U.S. shipping on orders {money(SHIP['free_over'])}+</li>
      <li>{ICON['lock']} Secure, encrypted checkout</li>
    </ul>
    <details class="acc" open><summary>Details &amp; care</summary><ul>{details}<li>Wash cold, inside out. Air dry or tumble dry low.</li></ul></details>
    <details class="acc"><summary>Shipping</summary><p>Orders are produced and dispatched within {SHIP['processing']}. Standard U.S. delivery takes {SHIP['standard_time']} and costs {money(SHIP['standard_rate'])}, free on orders of {money(SHIP['free_over'])} or more. <a href="../shipping.html">Full shipping policy</a>.</p></details>
    <details class="acc"><summary>Returns &amp; refunds</summary><p>All sales are final. If your item arrives damaged, defective or isn't what you ordered, email us within {SHIP['claim_days']} days of delivery for a replacement or full refund. <a href="../returns.html">Returns &amp; refunds policy</a>.</p></details>
  </div>
</section>
<section class="wrap block">
  {section_head("You may also like", "More " + CAT_NAME[p['cat']].lower(), ("../shop.html?c=" + p['cat'], "View all"))}
  <div class="grid">{rel}</div>
</section>
"""
        desc = f"{p['name']}{(' in ' + p['color']) if p['color'] else ''} by Above The Norm. {money(low(p))}. " + "; ".join(p["details"][:3])
        page(f"products/{p['id']}.html", p["name"], desc[:300], body, active=p["cat"])


def build_cart():
    body = f"""
<section class="page-hero wrap"><p class="kicker">Your bag</p><h1>Bag</h1></section>
<section class="wrap cart" data-cart>
  <div class="cart__items" data-cart-items></div>
  <aside class="summary" data-cart-summary>
    <h2>Order summary</h2>
    {coupon_box()}
    <dl><div><dt>Subtotal</dt><dd data-sub>$0</dd></div>
    <div class="summary__disc" data-disc-row hidden><dt>Discount <span data-disc-code></span></dt><dd data-disc>−$0</dd></div>
    <div><dt>Shipping</dt><dd data-ship>Calculated at checkout</dd></div></dl>
    <p class="summary__note" data-free-note></p>
    <a class="btn btn--block" href="checkout.html" data-checkout>Checkout</a>
    <p class="summary__fine">Prices in USD. Sales tax, where applicable, is shown before payment. By checking out you agree to our <a href="terms.html">Terms of Service</a> and <a href="returns.html">Returns &amp; Refunds Policy</a>.</p>
  </aside>
  <div class="cart__empty" data-cart-empty hidden><p>Your bag is empty.</p><a class="btn" href="shop.html">Continue shopping</a></div>
</section>
"""
    page("cart.html", "Bag", "Review the items in your Above The Norm bag.", body)


def build_checkout():
    states = ("AA AE AP AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY "
              "NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY").split()
    opts = "".join(f"<option>{s}</option>" for s in states)
    body = f"""
<section class="page-hero wrap"><p class="kicker">Secure checkout</p><h1>Checkout</h1></section>
<section class="wrap checkout">
  <form class="co" data-checkout-form novalidate>
    <fieldset><legend>1. Contact</legend>
      <label>Email<input type="email" name="email" autocomplete="email" required></label>
      <label>Phone<input type="tel" name="phone" autocomplete="tel" required></label>
    </fieldset>
    <fieldset><legend>2. Shipping address</legend>
      <div class="co__two"><label>First name<input name="first" autocomplete="given-name" required></label><label>Last name<input name="last" autocomplete="family-name" required></label></div>
      <label>Address<input name="address1" autocomplete="address-line1" required></label>
      <label>Apartment, suite, etc. (optional)<input name="address2" autocomplete="address-line2"></label>
      <div class="co__three"><label>City<input name="city" autocomplete="address-level2" required></label>
      <label>State<select name="state" autocomplete="address-level1" required><option value="">Select</option>{opts}</select></label>
      <label>ZIP code<input name="zip" autocomplete="postal-code" inputmode="numeric" pattern="[0-9]{{5}}(-[0-9]{{4}})?" required></label></div>
      <label>Country<input name="country" value="United States" readonly></label>
    </fieldset>
    <fieldset><legend>3. Delivery</legend>
      <label class="radio"><input type="radio" name="ship" value="standard" checked><span><strong>Standard</strong> {SHIP['standard_time']}</span><em data-std-price>{money(SHIP['standard_rate'])}</em></label>
      <label class="radio"><input type="radio" name="ship" value="express"><span><strong>Express</strong> {SHIP['express_time']}</span><em>{money(SHIP['express_rate'])}</em></label>
      <p class="co__note">All orders are produced and dispatched within {SHIP['processing']} before transit.</p>
    </fieldset>
    <fieldset><legend>4. Payment</legend>
      <div class="co__pay">{ICON['lock']}<div><strong>Card payment</strong><p>Card details are entered in a secure, encrypted form provided by our payment processor. {BIZ['brand']} never sees or stores your full card number.</p></div></div>
      <div class="co__card" data-card-fields aria-label="Card fields">
        <label>Card number<input disabled placeholder="•••• •••• •••• ••••"></label>
        <div class="co__two"><label>Expiry<input disabled placeholder="MM / YY"></label><label>CVC<input disabled placeholder="•••"></label></div>
      </div>
    </fieldset>
    <label class="check"><input type="checkbox" name="agree" required><span>I have read and agree to the <a href="terms.html" target="_blank">Terms of Service</a>, <a href="returns.html" target="_blank">Returns &amp; Refunds Policy</a> (all sales final, except damaged, defective or incorrect items) and <a href="privacy.html" target="_blank">Privacy Policy</a>.</span></label>
    <button class="btn btn--block" type="submit" data-place>Place order</button>
    <p class="co__msg" data-co-msg role="status"></p>
  </form>
  <aside class="summary">
    <h2>Order summary</h2>
    <div class="summary__lines" data-co-lines></div>
    {coupon_box()}
    <dl><div><dt>Subtotal</dt><dd data-co-sub>$0</dd></div>
    <div class="summary__disc" data-disc-row hidden><dt>Discount <span data-disc-code></span></dt><dd data-disc>−$0</dd></div>
    <div><dt>Shipping</dt><dd data-co-ship>$0</dd></div>
    <div><dt>Sales tax</dt><dd>Calculated before payment</dd></div>
    <div class="summary__total"><dt>Total (USD)</dt><dd data-co-total>$0</dd></div></dl>
    <p class="summary__fine">Questions before you buy? Email <a href="mailto:{BIZ['email']}">{BIZ['email']}</a>.</p>
  </aside>
</section>
"""
    page("checkout.html", "Checkout", "Secure checkout for Above The Norm orders.", body)


def prose(path, title, kicker, desc, html, side=True):
    links = [("shipping.html", "Shipping Policy"), ("returns.html", "Returns & Refunds"), ("privacy.html", "Privacy Policy"),
             ("terms.html", "Terms of Service"), ("faq.html", "FAQ"), ("size-guide.html", "Size Guide"), ("contact.html", "Contact Us")]
    nav = "".join(f'<a href="{h}"{" aria-current=\"page\"" if h == path else ""}>{e(t)}</a>' for h, t in links)
    aside = f'<aside class="doc__nav"><p class="kicker">Customer care</p><nav>{nav}</nav></aside>' if side else ""
    body = f"""
<section class="page-hero wrap"><p class="kicker">{kicker}</p><h1>{title}</h1></section>
<section class="wrap doc{' doc--side' if side else ''}">{aside}<div class="doc__body">{html}</div></section>
"""
    page(path, title, desc, body, active=path.split(".")[0])


def company_block():
    phone = f"<br>Phone: {BIZ['phone']}" if BIZ["phone"] else ""
    return (f"<p><strong>{BIZ['legal']}</strong><br>{BIZ['street']}<br>{BIZ['city']}, {BIZ['state']} {BIZ['zip']}<br>"
            f"{BIZ['country']}<br>Email: <a href=\"mailto:{BIZ['email']}\">{BIZ['email']}</a>{phone}</p>")


def business_info():
    rows = [
        ("Business name", BIZ["legal"]),
        ("Address", f"{ADDRESS}, {BIZ['country']}"),
        ("Email", f'<a href="mailto:{BIZ["email"]}">{BIZ["email"]}</a>'),
    ]
    if BIZ["phone"]:
        rows.append(("Phone", f'<a href="tel:{BIZ["phone"]}">{BIZ["phone"]}</a>'))
    body = "".join(f"<tr><th scope=\"row\">{k}</th><td>{v}</td></tr>" for k, v in rows)
    return f'<table class="tbl tbl--info"><tbody>{body}</tbody></table>'


def build_policies():
    s = SHIP
    upd = f'<p class="doc__upd">Last updated: {UPDATED}</p>'
    prose("shipping.html", "Shipping Policy", "Customer care", "How and when Above The Norm orders are produced, shipped and delivered.", f"""{upd}
<p>This policy explains how orders placed on this website are processed and delivered by {BIZ['legal']} ("Above The Norm", "we", "us").</p>
<h2>Processing time</h2>
<p>Our pieces are printed and finished in small runs. Orders are produced, packed and dispatched within <strong>{s['processing']}</strong> of purchase (excluding weekends and U.S. federal holidays). Processing time for each item is also shown on its product page.</p>
<h2>Shipping rates and delivery times</h2>
<table class="tbl"><thead><tr><th>Method</th><th>Cost</th><th>Transit time</th></tr></thead><tbody>
<tr><td>Standard</td><td>{money(s['standard_rate'])}, free on orders of {money(s['free_over'])} or more (after discounts)</td><td>{s['standard_time']}</td></tr>
<tr><td>Express</td><td>{money(s['express_rate'])}</td><td>{s['express_time']}</td></tr>
</tbody></table>
<p>The shipping cost for your order is always shown at checkout before you pay.</p>
<h2>Where we ship</h2>
<p>We currently ship to addresses in all 50 U.S. states, Washington D.C. and APO/FPO addresses. We do not currently ship internationally. If you're outside the U.S., email us before ordering.</p>
<h2>Order confirmation and tracking</h2>
<p>You'll receive an order confirmation email right after purchase, and a second email with your tracking number when your order is handed to the carrier.</p>
<h2>Delays, lost and stolen packages</h2>
<p>Carrier delays are rare but can happen, especially around holidays. If your tracking hasn't updated for 7 days, or your package is marked delivered but you can't find it, email us at <a href="mailto:{BIZ['email']}">{BIZ['email']}</a> and we'll open a claim with the carrier and work with you on a replacement or refund.</p>
<h2>Incorrect addresses</h2>
<p>Please double-check your shipping address at checkout. If you notice a mistake, email us within {s['cancel_hours']} hours. Packages returned to us because of an incorrect address can be reshipped once the customer covers the new shipping cost.</p>
<h2>Contact</h2>{company_block()}""")

    prose("returns.html", "Returns & Refunds", "Customer care", "Above The Norm returns, refunds, cancellations and damaged-item policy.", f"""{upd}
<p>Because every piece is made in limited runs, <strong>all sales are final</strong>. We do not accept returns or exchanges for change of mind or sizing, so please check the <a href="size-guide.html">size guide</a> before ordering. We stand behind every order, though, and the exceptions below always apply.</p>
<h2>Damaged, defective or incorrect items</h2>
<p>If your order arrives damaged, has a manufacturing defect, or isn't the item, size or color you ordered, email <a href="mailto:{BIZ['email']}">{BIZ['email']}</a> within <strong>{s['claim_days']} days of delivery</strong> with:</p>
<ul><li>your order number,</li><li>a description of the issue, and</li><li>a photo of the item and its packaging.</li></ul>
<p>Once we confirm the issue, we'll send a replacement at no cost or, if a replacement isn't available, issue a full refund including original shipping. We may ask you to return the item; if so, we'll email you a prepaid return label.</p>
<h2>Cancellations</h2>
<p>You can cancel an order within <strong>{s['cancel_hours']} hours</strong> of placing it, as long as production hasn't started, by emailing us with your order number. Cancelled orders are refunded in full.</p>
<h2>Lost packages</h2>
<p>If a package is lost in transit, see our <a href="shipping.html">Shipping Policy</a>. We'll file a carrier claim and send a replacement or refund once the carrier confirms the loss.</p>
<h2>How refunds are issued</h2>
<p>Approved refunds go back to the original payment method. We process them within 3 business days of approval; your bank or card issuer may take 5 to 10 business days to post the credit.</p>
<h2>Questions</h2>
<p>If you have any questions about an item before ordering, please contact us. We're happy to help with fit and sizing.</p>{company_block()}""")

    prose("privacy.html", "Privacy Policy", "Legal", "How Above The Norm LLC collects, uses and protects your personal information.", f"""{upd}
<p>{BIZ['legal']} ("we", "us"), operates this website. This policy describes what personal information we collect, how we use it, and the choices you have.</p>
<h2>Information we collect</h2>
<ul>
<li><strong>Order information:</strong> name, email, phone number, shipping and billing address, and the items you purchase.</li>
<li><strong>Payment information:</strong> card details are entered directly into our payment processor's secure form and processed by them. We do not receive or store your full card number or security code.</li>
<li><strong>Communications:</strong> anything you send us by email or through our contact form.</li>
<li><strong>Device and usage data:</strong> basic information such as browser type, pages viewed and referring site, collected through cookies and similar technologies.</li>
</ul>
<h2>How we use it</h2>
<ul><li>To process, ship and support your orders, including sending order confirmations and tracking.</li>
<li>To respond to your questions and requests.</li>
<li>To prevent fraud and keep the site secure.</li>
<li>To send marketing emails, only if you've opted in. You can unsubscribe at any time.</li>
<li>To comply with legal, tax and accounting obligations.</li></ul>
<h2>How we share it</h2>
<p>We do not sell your personal information. We share it only with service providers who help us run the store, such as our payment processor, shipping carriers, website hosting and email providers, and only as needed for them to perform those services. We may also disclose information if required by law.</p>
<h2 id="cookies">Cookies</h2>
<p>We use essential cookies and browser storage to keep items in your bag and make checkout work. These are always on. With your permission, we may also use analytics cookies to understand how the site is used. When you first visit, a banner lets you choose "Accept all" or "Essential only", and your choice is saved in your browser. You can change it by clearing your browser's site data, or block or delete cookies in your browser settings; some features may not work without them.</p>
<h2>Data security and retention</h2>
<p>This site is served over an encrypted (HTTPS) connection and payments are handled by a PCI-DSS compliant processor. We keep order records for as long as needed for tax and accounting purposes, and other information only as long as it's useful for the purposes above.</p>
<h2>Your rights</h2>
<p>You can ask us to access, correct or delete the personal information we hold about you, or to stop sending you marketing emails, by emailing <a href="mailto:{BIZ['email']}">{BIZ['email']}</a>. Depending on where you live (for example, California), you may have additional rights under local law, and we will honor them. We will not discriminate against you for exercising these rights.</p>
<h2>Children</h2>
<p>This site is not directed to children under 13, and we do not knowingly collect their personal information.</p>
<h2>Changes</h2>
<p>We may update this policy from time to time. The date at the top shows when it was last changed.</p>
<h2>Contact</h2>{company_block()}""")

    prose("terms.html", "Terms of Service", "Legal", "The terms that govern use of the Above The Norm website and purchases from Above The Norm LLC.", f"""{upd}
<p>These Terms of Service ("Terms") govern your use of this website and any purchase you make from {BIZ['legal']} ("Above The Norm", "we", "us"). By using the site or placing an order, you agree to these Terms.</p>
<h2>1. Eligibility</h2>
<p>You must be at least 18 years old, or the age of majority where you live, or have the consent of a parent or guardian, to place an order.</p>
<h2>2. Products and pricing</h2>
<p>We try to describe and photograph every product accurately, but colors may vary slightly between screens. All prices are in U.S. dollars and do not include shipping or applicable sales tax, which are shown at checkout before you pay. We may change prices at any time, but changes won't affect orders already placed.</p>
<p><strong>Discount codes.</strong> Promotional codes, including our welcome code {COUPON['code']}, give the stated discount on the merchandise subtotal only, not on shipping or tax. One code per order. Codes can't be combined, exchanged for cash or applied to past orders, and may be withdrawn at any time. If an order using a code is refunded, the refund is the amount you actually paid.</p>
<h2>3. Orders</h2>
<p>Your order is an offer to buy. We accept it when we email you an order confirmation. We may refuse or cancel an order, for example if a product is unavailable, there's an obvious pricing error, or we suspect fraud. If we cancel after you've been charged, we'll refund you in full.</p>
<h2>4. Payment</h2>
<p>We accept major credit and debit cards. Payment is taken at the time of order through our third-party payment processor. You confirm that you are authorized to use the payment method you provide.</p>
<h2>5. Shipping, returns and refunds</h2>
<p>Shipping is governed by our <a href="shipping.html">Shipping Policy</a>, and returns, cancellations and refunds by our <a href="returns.html">Returns &amp; Refunds Policy</a>. Both are part of these Terms. Title and risk of loss pass to you when the order is delivered to your shipping address.</p>
<h2>6. Intellectual property</h2>
<p>ABOVE THE NORM® is a registered trademark of {BIZ['legal']} (U.S. Reg. No. {BIZ['tm_reg']}). All designs, graphics, photos, text and logos on this site belong to us or our licensors and may not be copied, reproduced or used without written permission.</p>
<h2>7. Acceptable use</h2>
<p>You agree not to misuse the site, including by attempting to gain unauthorized access, interfering with its operation, or using it for any unlawful purpose.</p>
<h2>8. Disclaimers and limitation of liability</h2>
<p>The site is provided "as is". To the fullest extent permitted by law, our total liability for any claim relating to a product or order is limited to the amount you paid for that order. Nothing in these Terms limits any rights you have under consumer protection laws that cannot be waived.</p>
<h2>9. Governing law</h2>
<p>These Terms are governed by the laws of the State of Missouri, without regard to its conflict-of-law rules. Any dispute will be handled in the state or federal courts located in Jackson County, Missouri.</p>
<h2>10. Changes</h2>
<p>We may update these Terms from time to time. The version posted at the time of your order applies to that order.</p>
<h2>11. Contact</h2>{company_block()}""")

    faq = "".join(f'<details class="acc"><summary>{e(q)}</summary><p>{e(a)}</p></details>' for q, a in FAQ)
    prose("faq.html", "FAQ", "Customer care", "Answers to common questions about Above The Norm orders, shipping, sizing and returns.",
          f'{faq}<p class="doc__after">Still need help? <a href="contact.html">Contact us</a>.</p>')

    tops = [("S", 20, 28, 8.5), ("M", 21, 29, 9), ("L", 22, 30, 9.5), ("XL", 23.5, 31, 10), ("2XL", 25, 32, 10.5)]
    bottoms = [("S", "28–30", 30, 41), ("M", "31–33", 31, 42), ("L", "34–36", 32, 43), ("XL", "37–39", 32, 44), ("2XL", "40–42", 33, 45)]
    trows = "".join(f"<tr><td>{a}</td><td>{b}</td><td>{c}</td><td>{d}</td></tr>" for a, b, c, d in tops)
    brows = "".join(f"<tr><td>{a}</td><td>{b}</td><td>{c}</td><td>{d}</td></tr>" for a, b, c, d in bottoms)
    prose("size-guide.html", "Size Guide", "Customer care", "Above The Norm size chart for tops and bottoms.", f"""
<p>All measurements are in inches and taken with the garment laid flat. Our tops run boxy with dropped shoulders: take your usual size for our intended fit, or size up for an oversized look. Women's fitted styles (baby tees, tanks, leggings) run one size smaller, so size up if you're between sizes.</p>
<h2>Tops: tees, long sleeves, crewnecks, hoodies</h2>
<table class="tbl"><thead><tr><th>Size</th><th>Chest (pit to pit)</th><th>Body length</th><th>Sleeve</th></tr></thead><tbody>{trows}</tbody></table>
<h2>Bottoms: joggers, sweats, shorts</h2>
<table class="tbl"><thead><tr><th>Size</th><th>Waist</th><th>Inseam (pants)</th><th>Hip</th></tr></thead><tbody>{brows}</tbody></table>
<h2>How to measure</h2>
<p>Lay a shirt that fits you well flat and measure straight across from armpit to armpit, then from the highest point of the shoulder to the hem. Compare with the chart above.</p>
<p>Not sure? Email <a href="mailto:{BIZ['email']}">{BIZ['email']}</a> with your height and usual size and we'll recommend one.</p>""")


def build_about():
    body = f"""
<section class="about-hero">
  <div class="wrap about-hero__grid">
    <div><p class="kicker kicker--light">About us</p><h1>Above the norm, <em>on purpose.</em></h1></div>
    <img src="assets/img/logo.png" alt="Above The Norm logo" width="320" height="430">
  </div>
</section>
<section class="wrap doc"><div class="doc__body doc__body--wide">
<p class="lede">Above The Norm started in {BIZ['founded']} with one idea: the people who don't fit in are usually the ones worth paying attention to.</p>
<p>We make streetwear for outsiders, believers, late-night thinkers and anyone who's ever been told to just be normal. Our graphics pull from angels and aliens, old Hollywood, church flyers and back-yard UFO sightings, and turn them into pieces you'll want to wear until they fall apart.</p>
<h2>How we make things</h2>
<p>Every design is drawn in-house. We print in small runs on heavyweight blanks, with screen printing, puff print and embroidery, and add our own sewn-in labels. Producing in limited quantities means less waste, and it's why orders ship within {SHIP['processing_short']}: your piece is finished for you, not pulled from a warehouse of overstock.</p>
<h2>Who we are</h2>
<p>Above The Norm is a registered trademark of {BIZ['legal']} (U.S. Reg. No. {BIZ['tm_reg']}). We're an independent, owner-operated brand: no investors, no licensing deals, just a small team and a community we call the #ATNFAMILY.</p>
<div class="facts">
  <div><strong>{BIZ['founded']}</strong><span>First pieces released</span></div>
  <div><strong>®</strong><span>Federally registered trademark</span></div>
  <div><strong>Small runs</strong><span>Limited production, less waste</span></div>
</div>
<h2>Business information</h2>
{business_info()}
<p><a class="btn" href="shop.html">Shop the collection</a></p>
</div></section>
{assurances()}
"""
    page("about.html", "About Us", "The story behind Above The Norm®, independent streetwear from Above The Norm LLC since 2019.", body, active="about")


def build_contact():
    phone = f'<li><strong>Phone</strong><a href="tel:{BIZ["phone"]}">{BIZ["phone"]}</a></li>' if BIZ["phone"] else ""
    body = f"""
<section class="page-hero wrap"><p class="kicker">Customer care</p><h1>Contact us</h1><p class="page-hero__lede">Questions about sizing, an order or a collaboration? We reply within 1–2 business days.</p></section>
<section class="wrap contact">
  <ul class="contact__info">
    <li><strong>Email</strong><a href="mailto:{BIZ['email']}">{BIZ['email']}</a></li>{phone}
    <li><strong>Hours</strong>{BIZ['hours']}</li>
    <li><strong>Mailing address</strong>{BIZ['legal']}<br>{BIZ['street']}<br>{BIZ['city']}, {BIZ['state']} {BIZ['zip']}<br>{BIZ['country']}</li>
    <li><strong>Social</strong><a href="{BIZ['instagram']}" target="_blank" rel="noopener">Instagram @abovethenorm.us</a></li>
    <li class="contact__note">Online store only. This address is for correspondence and isn't open to the public.</li>
  </ul>
  <form class="co contact__form" data-contact-form novalidate>
    <div class="co__two"><label>Name<input name="name" autocomplete="name" required></label><label>Email<input type="email" name="email" autocomplete="email" required></label></div>
    <label>Order number (optional)<input name="order"></label>
    <label>Topic<select name="topic"><option>Order question</option><option>Sizing</option><option>Damaged or incorrect item</option><option>Cancellation</option><option>Wholesale or collaboration</option><option>Other</option></select></label>
    <label>Message<textarea name="message" rows="6" required></textarea></label>
    <button class="btn" type="submit">Send message</button>
    <p class="co__msg" data-contact-msg role="status"></p>
  </form>
</section>
<section class="wrap doc"><div class="doc__body doc__body--wide"><h2>Business information</h2>{business_info()}</div></section>
"""
    page("contact.html", "Contact Us", f"Contact Above The Norm LLC customer care at {BIZ['email']}.", body, active="contact")


def build_404():
    body = """<section class="page-hero wrap notfound"><p class="kicker">404</p><h1>Lost in orbit.</h1><p class="page-hero__lede">That page doesn't exist, or it was beamed up.</p><a class="btn" href="{R}shop.html">Back to the shop</a></section>"""
    page("404.html", "Page not found", "Page not found.", body)


def build_catalog_js():
    slim = {p["id"]: {"n": p["name"], "c": p["color"], "p": p["prices"], "i": img(p), "k": p["cat"]} for p in PRODUCTS}
    js = ("// Generated by _generator/build.py. Do not edit.\n"
          f"window.ATN = {json.dumps({'products': slim, 'ship': SHIP, 'email': BIZ['email'], 'coupon': {'code': COUPON['code'], 'pct': COUPON['pct']}}, ensure_ascii=False, separators=(',', ':'))};\n")
    with open(os.path.join(OUT, "assets/js/catalog.js"), "w", encoding="utf-8") as f:
        f.write(js)


if __name__ == "__main__":
    build_catalog_js()
    build_home()
    build_shop()
    build_products()
    build_cart()
    build_checkout()
    build_policies()
    build_about()
    build_contact()
    build_404()
    print(f"Built {len(PRODUCTS)} product pages + 13 site pages into {OUT}")
