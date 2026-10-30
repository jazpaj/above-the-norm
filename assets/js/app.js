/* Above The Norm — bag, filters, product page and checkout behaviour */
(function () {
  var ROOT = document.body.dataset.root || "";
  var CAT = window.ATN || { products: {}, ship: {} };
  var KEY = "atn_bag";

  function money(v) {
    return "$" + (v % 1 ? v.toFixed(2) : v.toFixed(0)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  function read() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; }
  }
  function write(bag) {
    try { localStorage.setItem(KEY, JSON.stringify(bag)); } catch (e) {}
    badge();
  }
  function lines() {
    return read().filter(function (l) { return CAT.products[l.id] && CAT.products[l.id].p[l.size] != null; });
  }
  function subtotal(ls) {
    return ls.reduce(function (s, l) { return s + CAT.products[l.id].p[l.size] * l.qty; }, 0);
  }
  /* discount code: one welcome code, stored so it carries from bag to checkout */
  var CKEY = "atn_coupon";
  function store(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function stored(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function coupon() { var c = CAT.coupon; return c && stored(CKEY) === c.code ? c : null; }
  function discount(sub) { var c = coupon(); return c ? Math.round(sub * c.pct) / 100 : 0; }
  function shipping(sub, method) {
    if (method === "express") return CAT.ship.express_rate;
    return sub >= CAT.ship.free_over ? 0 : CAT.ship.standard_rate;
  }
  function badge() {
    var n = lines().reduce(function (s, l) { return s + l.qty; }, 0);
    document.querySelectorAll("[data-cart-count]").forEach(function (el) {
      el.textContent = n;
      if (n) el.removeAttribute("data-zero"); else el.setAttribute("data-zero", "");
    });
  }
  function add(id, size, qty) {
    var bag = read();
    var hit = bag.find(function (l) { return l.id === id && l.size === size; });
    if (hit) hit.qty = Math.min(10, hit.qty + qty); else bag.push({ id: id, size: size, qty: qty });
    write(bag);
  }
  function setQty(i, qty) {
    var bag = lines();
    if (qty < 1) bag.splice(i, 1); else bag[i].qty = Math.min(10, qty);
    write(bag);
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }

  /* mobile menu */
  var drawer = document.querySelector("[data-menu]");
  document.querySelectorAll("[data-menu-open]").forEach(function (b) {
    b.addEventListener("click", function () { drawer.hidden = false; document.body.style.overflow = "hidden"; });
  });
  function closeMenu() { drawer.hidden = true; document.body.style.overflow = ""; }
  if (drawer) {
    drawer.addEventListener("click", function (ev) { if (ev.target === drawer) closeMenu(); });
    drawer.querySelector("[data-menu-close]").addEventListener("click", closeMenu);
    document.addEventListener("keydown", function (ev) { if (ev.key === "Escape" && !drawer.hidden) closeMenu(); });
  }

  /* search */
  var CAT_LABEL = { tops: "Tees & Tops", bottoms: "Pants & Shorts", headwear: "Hats & Caps", accessories: "Extras" };
  // a trailing "s" is dropped so "hoodies" finds "Hoodie" (dropping it only ever widens a substring match)
  function tokens(q) { return q.toLowerCase().split(/\s+/).filter(Boolean).map(function (w) { return w.length > 3 ? w.replace(/s$/, "") : w; }); }
  function matches(text, toks) { return toks.every(function (t) { return text.indexOf(t) > -1; }); }
  var search = document.querySelector("[data-search]");
  if (search) {
    var sInput = search.querySelector("[data-search-input]");
    var sResults = search.querySelector("[data-search-results]");
    var index = Object.keys(CAT.products).map(function (id) {
      var p = CAT.products[id];
      return { id: id, p: p, text: (p.n + " " + p.c + " " + p.k).toLowerCase() };
    });
    function openSearch() { search.hidden = false; document.body.style.overflow = "hidden"; sInput.focus(); render(); }
    function closeSearch() { search.hidden = true; document.body.style.overflow = ""; }
    var sClear = search.querySelector("[data-search-clear]");
    var POPULAR = ["Hoodies", "Tees", "Beanies", "Trucker hats", "Joggers", "Angel", "Black"];
    var CAT_ORDER = ["tops", "bottoms", "headwear", "accessories"];
    function lowPrice(p) { return Math.min.apply(null, Object.keys(p.p).map(function (k) { return p.p[k]; })); }
    function mark(text, toks) {
      var out = esc(text);
      toks.forEach(function (t) {
        var re = new RegExp("(" + t.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&") + ")", "ig");
        out = out.replace(re, "<mark>$1</mark>");
      });
      return out;
    }
    function tile(x) {
      return '<a class="strend" href="' + ROOT + "products/" + x.id + '.html"><span class="strend__img"><img src="' + ROOT + x.p.i + '" alt="" loading="lazy"></span><strong>' +
        esc(x.p.n) + "</strong><span>" + money(lowPrice(x.p)) + "</span></a>";
    }
    function render() {
      var q = sInput.value.trim(), toks = tokens(q);
      sClear.hidden = !q;
      if (!q) {
        var counts = {};
        index.forEach(function (x) { counts[x.p.k] = (counts[x.p.k] || 0) + 1; });
        sResults.innerHTML =
          '<p class="search__label">Popular searches</p><div class="search__chips">' + POPULAR.map(function (w) {
            return '<button type="button" class="schip" data-fill="' + esc(w) + '">' + esc(w) + "</button>";
          }).join("") + "</div>" +
          '<p class="search__label">Shop by category</p><div class="search__cats">' + CAT_ORDER.map(function (k) {
            return '<a class="scat" href="' + ROOT + "shop.html?c=" + k + '">' + esc(CAT_LABEL[k]) + "<span>" + counts[k] + "</span></a>";
          }).join("") + "</div>" +
          '<p class="search__label">Trending now</p><div class="search__trend">' + index.slice(0, 4).map(tile).join("") + "</div>";
        return;
      }
      var hits = index.filter(function (x) { return matches(x.text, toks); });
      if (!hits.length) {
        sResults.innerHTML = '<div class="search__none"><strong>No results for “' + esc(q) + '”</strong><p>Try a broader word, or browse a category.</p><div class="search__cats">' +
          CAT_ORDER.map(function (k) { return '<a class="scat" href="' + ROOT + "shop.html?c=" + k + '">' + esc(CAT_LABEL[k]) + "</a>"; }).join("") + "</div></div>";
        return;
      }
      sResults.innerHTML = '<p class="search__label">Products <span>' + hits.length + "</span></p>" +
        '<div class="search__list">' + hits.slice(0, 6).map(function (x) {
          return '<a class="sres" href="' + ROOT + "products/" + x.id + '.html"><span class="sres__img"><img src="' + ROOT + x.p.i + '" alt="" loading="lazy"></span>' +
            '<span class="sres__txt"><strong>' + mark(x.p.n, toks) + "</strong><span>" + esc([x.p.c, CAT_LABEL[x.p.k]].filter(Boolean).join(" · ")) + "</span></span>" +
            '<span class="sres__price">' + money(lowPrice(x.p)) + "</span></a>";
        }).join("") + "</div>" +
        '<a class="btn search__all" href="' + ROOT + "shop.html?q=" + encodeURIComponent(q) + '">' + (hits.length === 1 ? "See 1 result" : "See all " + hits.length + " results") + "</a>";
    }
    sResults.addEventListener("click", function (ev) {
      var chip = ev.target.closest("[data-fill]");
      if (chip) { sInput.value = chip.dataset.fill; sInput.focus(); render(); }
    });
    sClear.addEventListener("click", function () { sInput.value = ""; sInput.focus(); render(); });
    document.querySelectorAll("[data-search-open]").forEach(function (b) { b.addEventListener("click", openSearch); });
    search.querySelector("[data-search-close]").addEventListener("click", closeSearch);
    search.addEventListener("click", function (ev) { if (ev.target === search) closeSearch(); });
    document.addEventListener("keydown", function (ev) { if (ev.key === "Escape" && !search.hidden) closeSearch(); });
    sInput.addEventListener("input", render);
  }

  /* shop: toolbar (grid view, in stock, filter, sort) + filter sidebar */
  var grid = document.querySelector("[data-grid]");
  if (grid) {
    var shop = document.querySelector("[data-shop]");
    var params = new URLSearchParams(location.search);
    var state = { g: params.get("g") || "all", c: params.get("c") || "all", q: (params.get("q") || "").trim(), sort: "featured",
                  l: params.get("l"), sizes: [], colors: [], stock: false };
    // "l" is the menu label for a sub-category link (e.g. Hoodies); it's dropped once the shopper changes filters.
    function dropLabel() { if (state.l) { state.l = null; state.q = ""; } }
    var qBox = document.querySelector("[data-query]");
    var cards = Array.prototype.slice.call(grid.children);
    var title = document.querySelector("[data-shop-title]");
    var labels = { all: "", men: "Men", women: "Women", tops: "Tees & Tops", bottoms: "Pants & Shorts", headwear: "Hats & Caps", accessories: "Extras" };
    var sortNames = {};
    document.querySelectorAll(".fopts [data-sortopt]").forEach(function (b) { sortNames[b.dataset.sortopt] = b.textContent; });
    function pressed(sel, fn) { document.querySelectorAll(sel).forEach(function (b) { b.setAttribute("aria-pressed", fn(b)); }); }

    function apply(push) {
      var shown = 0, toks = tokens(state.q);
      cards.forEach(function (c) {
        var sz = c.dataset.sizes.split("|");
        var ok = (state.g === "all" || c.dataset.gender.split(" ").indexOf(state.g) > -1) &&
                 (state.c === "all" || c.dataset.cat === state.c) &&
                 (!state.sizes.length || state.sizes.some(function (s) { return sz.indexOf(s) > -1; })) &&
                 (!state.colors.length || state.colors.indexOf(c.dataset.color) > -1) &&
                 (!state.stock || c.dataset.stock === "1") &&
                 matches(c.dataset.text, toks);
        c.hidden = !ok;
        if (ok) shown++;
      });
      var sorted = cards.slice().sort(function (a, b) {
        if (state.sort === "low") return a.dataset.price - b.dataset.price;
        if (state.sort === "high") return b.dataset.price - a.dataset.price;
        if (state.sort === "az") return a.dataset.name < b.dataset.name ? -1 : 1;
        if (state.sort === "za") return a.dataset.name > b.dataset.name ? -1 : 1;
        return a.dataset.order - b.dataset.order;
      });
      sorted.forEach(function (c) { grid.appendChild(c); });
      pressed("[data-g]", function (b) { return b.dataset.g === state.g; });
      pressed("[data-c]", function (b) { return b.dataset.c === state.c; });
      pressed("[data-sortopt]", function (b) { return b.dataset.sortopt === state.sort; });
      pressed("[data-color-f]", function (b) { return state.colors.indexOf(b.dataset.colorF) > -1; });
      document.querySelectorAll("[data-size-f]").forEach(function (i) { i.checked = state.sizes.indexOf(i.value) > -1; });
      document.querySelector("[data-stock-f]").checked = state.stock;
      document.querySelector("[data-sort-label]").textContent = ": " + sortNames[state.sort];
      var n = state.sizes.length + state.colors.length + (state.stock ? 1 : 0) + (state.g !== "all") + (state.c !== "all");
      var nEl = document.querySelector("[data-active-n]"); nEl.hidden = !n; nEl.textContent = n;
      document.querySelector("[data-count]").textContent = shown + (shown === 1 ? " product" : " products");
      document.querySelector("[data-show-n]").textContent = shown;
      document.querySelector("[data-empty]").hidden = shown > 0;
      var t = [labels[state.g], labels[state.c]].filter(Boolean).join(" ");
      title.textContent = state.l ? (state.g !== "all" ? labels[state.g] + "'s " : "") + state.l
        : t ? (state.g !== "all" && state.c !== "all" ? labels[state.g] + "'s " + labels[state.c] : t) : (state.q ? "Search" : "Shop All");
      document.querySelector("[data-crumb]").textContent = (state.g === "all" ? "All" : labels[state.g] + "'s") + " · " + (state.l || (state.c === "all" ? "All products" : labels[state.c]));
      document.title = title.textContent + " | Above The Norm";
      qBox.hidden = !state.q || !!state.l;
      qBox.querySelector("[data-query-text]").textContent = "“" + state.q + "”";
      if (push) {
        var q = new URLSearchParams();
        if (state.g !== "all") q.set("g", state.g);
        if (state.c !== "all") q.set("c", state.c);
        if (state.q) q.set("q", state.q);
        if (state.l) q.set("l", state.l);
        history.replaceState(null, "", location.pathname + (q.toString() ? "?" + q : ""));
      }
      document.querySelectorAll(".hdr__nav a").forEach(function (a) {
        var u = new URL(a.href, location.href);
        if (u.pathname !== location.pathname) return;
        var g = u.searchParams.get("g") || "all", c = u.searchParams.get("c") || "all";
        if (g === state.g && c === state.c) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
      });
    }
    function toggle(list, v) { var i = list.indexOf(v); if (i > -1) list.splice(i, 1); else list.push(v); }
    document.querySelectorAll("[data-g]").forEach(function (b) {
      b.addEventListener("click", function () { dropLabel(); state.g = b.dataset.g; apply(true); });
    });
    document.querySelectorAll("[data-c]").forEach(function (b) {
      b.addEventListener("click", function () { dropLabel(); state.c = b.dataset.c; apply(true); });
    });
    document.querySelectorAll("[data-size-f]").forEach(function (i) {
      i.addEventListener("change", function () { toggle(state.sizes, i.value); apply(false); });
    });
    document.querySelectorAll("[data-color-f]").forEach(function (b) {
      b.addEventListener("click", function () { toggle(state.colors, b.dataset.colorF); apply(false); });
    });
    document.querySelector("[data-stock-f]").addEventListener("change", function (ev) { state.stock = ev.target.checked; apply(false); });

    // sort: from the sidebar list or the toolbar dropdown
    var sortBtn = document.querySelector("[data-sort-toggle]"), sortMenu = document.querySelector("[data-sort-menu]");
    function closeSort() { sortMenu.hidden = true; sortBtn.setAttribute("aria-expanded", "false"); }
    sortBtn.addEventListener("click", function () { var open = sortMenu.hidden; sortMenu.hidden = !open; sortBtn.setAttribute("aria-expanded", open); });
    document.addEventListener("click", function (ev) { if (!ev.target.closest(".sortmenu")) closeSort(); });
    document.querySelectorAll("[data-sortopt]").forEach(function (b) {
      b.addEventListener("click", function () { state.sort = b.dataset.sortopt; closeSort(); apply(false); });
    });

    // filter sidebar: open beside the grid on desktop, a slide-in panel on phones
    var wide = window.matchMedia("(min-width: 1024px)");
    var fBtn = document.querySelector("[data-filter-toggle]");
    function setFilters(open) {
      shop.classList.toggle("is-filtering", open);
      fBtn.setAttribute("aria-expanded", open);
      document.body.style.overflow = open && !wide.matches ? "hidden" : "";
    }
    setFilters(wide.matches);
    fBtn.addEventListener("click", function () { setFilters(!shop.classList.contains("is-filtering")); });
    document.querySelectorAll("[data-filter-close]").forEach(function (b) { b.addEventListener("click", function () { setFilters(false); }); });
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") { closeSort(); if (!wide.matches) setFilters(false); }
    });

    // grid density, remembered per visitor
    function setCols(n) {
      grid.dataset.cols = n;
      pressed("[data-cols]", function (b) { return b.dataset.cols === String(n); });
      store("atn_cols", n);
    }
    document.querySelectorAll("[data-cols]").forEach(function (b) { b.addEventListener("click", function () { setCols(b.dataset.cols); }); });
    setCols(stored("atn_cols") || 4);

    document.querySelectorAll("[data-reset]").forEach(function (b) {
      b.addEventListener("click", function () {
        state.g = state.c = "all"; state.q = ""; state.l = null; state.sizes = []; state.colors = []; state.stock = false; apply(true);
      });
    });
    document.querySelector("[data-clear-q]").addEventListener("click", function () { state.q = ""; apply(true); });
    apply(false);
  }

  /* product page */
  var pdp = document.querySelector("[data-product]");
  if (pdp) {
    var id = pdp.dataset.product;
    var sizeBtns = pdp.querySelectorAll(".size");
    var sizesWrap = pdp.querySelector(".sizes");
    var priceLabel = pdp.querySelector("[data-price-label]");
    var qtyIn = pdp.querySelector("[data-qty-input]");
    var msg = pdp.querySelector("[data-msg]");
    var chosen = sizeBtns.length === 1 ? sizeBtns[0].dataset.size : null;

    sizeBtns.forEach(function (b) {
      b.addEventListener("click", function () {
        chosen = b.dataset.size;
        sizeBtns.forEach(function (x) { x.setAttribute("aria-pressed", x === b); });
        sizesWrap.classList.remove("is-missing");
        priceLabel.textContent = money(+b.dataset.price);
        msg.textContent = ""; msg.className = "pdp__msg";
      });
    });
    pdp.querySelectorAll("[data-qty]").forEach(function (b) {
      b.addEventListener("click", function () {
        qtyIn.value = Math.max(1, Math.min(10, (+qtyIn.value || 1) + +b.dataset.qty));
      });
    });
    pdp.querySelectorAll("[data-thumb]").forEach(function (b) {
      b.addEventListener("click", function () {
        pdp.querySelector("[data-main]").src = b.dataset.thumb;
        pdp.querySelectorAll("[data-thumb]").forEach(function (x) { x.setAttribute("aria-pressed", x === b); });
      });
    });
    pdp.querySelector("[data-add]").addEventListener("click", function () {
      if (!chosen) {
        sizesWrap.classList.add("is-missing");
        msg.className = "pdp__msg is-err";
        msg.textContent = "Please choose a size.";
        return;
      }
      add(id, chosen, Math.max(1, Math.min(10, +qtyIn.value || 1)));
      msg.className = "pdp__msg is-ok";
      msg.innerHTML = "Added to your bag. <a href=\"" + ROOT + "cart.html\">View bag</a>";
      var btn = pdp.querySelector("[data-add]"), label = btn.querySelector("[data-add-label]");
      btn.classList.add("is-added"); label.textContent = "Added ✓";
      clearTimeout(btn._t);
      btn._t = setTimeout(function () { btn.classList.remove("is-added"); label.textContent = "Add to bag"; }, 1600);
    });
  }

  function showDiscount(scope, sub) {
    var d = discount(sub), row = scope.querySelector("[data-disc-row]");
    if (row) {
      row.hidden = !d;
      row.querySelector("[data-disc-code]").textContent = d ? "(" + coupon().code + ")" : "";
      row.querySelector("[data-disc]").textContent = "−" + money(d);
    }
    return d;
  }
  function couponForm(scope, onChange) {
    var f = scope.querySelector("[data-coupon]");
    if (!f) return;
    var msg = f.querySelector("[data-coupon-msg]");
    function paint() {
      var c = coupon();
      f.code.value = c ? c.code : f.code.value;
      f.querySelector("button").textContent = c ? "Remove" : "Apply";
      f.code.readOnly = !!c;
      if (c) { msg.className = "coupon__msg is-ok"; msg.textContent = c.pct + "% off applied to your merchandise subtotal."; }
    }
    f.addEventListener("submit", function (ev) {
      ev.preventDefault();
      if (coupon()) { store(CKEY, null); f.code.value = ""; msg.className = "coupon__msg"; msg.textContent = "Code removed."; }
      else {
        var v = f.code.value.trim().toUpperCase();
        if (!v) { msg.className = "coupon__msg is-err"; msg.textContent = "Enter a discount code."; return; }
        if (!CAT.coupon || v !== CAT.coupon.code) { msg.className = "coupon__msg is-err"; msg.textContent = "That code isn't valid."; return; }
        store(CKEY, v);
      }
      paint();
      onChange();
    });
    paint();
  }

  /* announcement bar offer: following it applies the code to the bag */
  document.querySelectorAll("[data-apply-coupon]").forEach(function (l) {
    l.addEventListener("click", function () { if (CAT.coupon) store(CKEY, CAT.coupon.code); });
  });

  /* cookie banner: asks once, then remembers the choice */
  var cookieBar = document.querySelector("[data-cookies]");
  var cookieWait = [];
  var cookiesChosen = function () { return !!stored("atn_cookies"); };
  if (cookieBar && !cookiesChosen()) {
    cookieBar.hidden = false;
    cookieBar.querySelectorAll("[data-cookies-choice]").forEach(function (b) {
      b.addEventListener("click", function () {
        store("atn_cookies", b.dataset.cookiesChoice);
        cookieBar.hidden = true;
        cookieWait.forEach(function (fn) { fn(); });
      });
    });
  }

  /* welcome pop-up: once per visitor, a few seconds after the first page view (and after the cookie choice) */
  var promo = document.querySelector("[data-promo]");
  if (promo && CAT.coupon && !stored("atn_promo_seen")) {
    var pImg = promo.querySelector("img");
    if (pImg) pImg.loading = "eager"; // fetch the photo now so it's ready when the pop-up opens
    var closePromo = function () { promo.hidden = true; document.body.style.overflow = ""; store("atn_promo_seen", "1"); };
    var openPromo = function (delay) {
      setTimeout(function () {
        if (!document.querySelector(".search:not([hidden]), .drawer:not([hidden])")) { promo.hidden = false; document.body.style.overflow = "hidden"; }
      }, delay);
    };
    if (cookiesChosen() || !cookieBar) openPromo(4000); else cookieWait.push(function () { openPromo(1200); });
    promo.querySelectorAll("[data-promo-close]").forEach(function (b) { b.addEventListener("click", closePromo); });
    promo.addEventListener("click", function (ev) { if (ev.target === promo) closePromo(); });
    document.addEventListener("keydown", function (ev) { if (ev.key === "Escape" && !promo.hidden) closePromo(); });
    promo.querySelector("[data-promo-shop]").addEventListener("click", function () { store(CKEY, CAT.coupon.code); store("atn_promo_seen", "1"); });
    promo.querySelector("[data-promo-copy]").addEventListener("click", function (ev) {
      var b = ev.currentTarget;
      store(CKEY, CAT.coupon.code);
      (navigator.clipboard ? navigator.clipboard.writeText(CAT.coupon.code) : Promise.reject()).catch(function () {});
      b.textContent = "Copied · applied";
    });
  }

  /* bag page */
  var cartEl = document.querySelector("[data-cart]");
  function renderCart() {
    var ls = lines();
    var items = cartEl.querySelector("[data-cart-items]");
    var empty = !ls.length;
    cartEl.querySelector("[data-cart-empty]").hidden = !empty;
    cartEl.querySelector("[data-cart-summary]").hidden = empty;
    items.hidden = empty;
    items.innerHTML = ls.map(function (l, i) {
      var p = CAT.products[l.id];
      var url = ROOT + "products/" + l.id + ".html";
      return '<div class="line"><a class="line__img" href="' + url + '"><img src="' + ROOT + p.i + '" alt=""></a>' +
        '<div><a class="line__name" href="' + url + '">' + esc(p.n) + '</a>' +
        '<p class="line__meta">' + esc([p.c, "Size " + l.size].filter(Boolean).join(" · ")) + " · " + money(p.p[l.size]) + "</p>" +
        '<div class="line__ctrl"><div class="qty"><button type="button" data-i="' + i + '" data-d="-1" aria-label="Decrease quantity">−</button><span>' + l.qty +
        '</span><button type="button" data-i="' + i + '" data-d="1" aria-label="Increase quantity">+</button></div>' +
        '<button type="button" class="line__rm" data-i="' + i + '" data-rm>Remove</button></div></div>' +
        '<span class="line__price">' + money(p.p[l.size] * l.qty) + "</span></div>";
    }).join("");
    var sub = subtotal(ls);
    cartEl.querySelector("[data-sub]").textContent = money(sub);
    var net = sub - showDiscount(cartEl, sub);
    var ship = shipping(net, "standard");
    cartEl.querySelector("[data-ship]").textContent = ship ? money(ship) + " standard" : "Free standard";
    var left = CAT.ship.free_over - net;
    cartEl.querySelector("[data-free-note]").textContent = left > 0 ? "Add " + money(left) + " more for free U.S. shipping." : "Your order ships free.";
  }
  if (cartEl) {
    cartEl.addEventListener("click", function (ev) {
      var b = ev.target.closest("button[data-i]");
      if (!b) return;
      var i = +b.dataset.i, l = lines()[i];
      setQty(i, b.hasAttribute("data-rm") ? 0 : l.qty + +b.dataset.d);
      renderCart();
    });
    couponForm(cartEl, renderCart);
    renderCart();
  }

  /* checkout */
  var co = document.querySelector("[data-checkout-form]");
  if (co) {
    var ls = lines();
    var box = document.querySelector("[data-co-lines]");
    if (!ls.length) {
      box.innerHTML = '<p class="summary__fine">Your bag is empty. <a href="' + ROOT + 'shop.html">Continue shopping</a>.</p>';
      co.querySelector("[data-place]").disabled = true;
    } else {
      box.innerHTML = ls.map(function (l) {
        var p = CAT.products[l.id];
        return '<div class="sline"><img src="' + ROOT + p.i + '" alt=""><span>' + esc(p.n) + "<small>" + esc([p.c, "Size " + l.size, "Qty " + l.qty].filter(Boolean).join(" · ")) +
          "</small></span><span>" + money(p.p[l.size] * l.qty) + "</span></div>";
      }).join("");
    }
    function totals() {
      var sub = subtotal(ls);
      var net = sub - showDiscount(coSum, sub);
      var method = co.querySelector("[name=ship]:checked").value;
      var ship = ls.length ? shipping(net, method) : 0;
      co.querySelector("[data-std-price]").textContent = net >= CAT.ship.free_over ? "Free" : money(CAT.ship.standard_rate);
      document.querySelector("[data-co-sub]").textContent = money(sub);
      document.querySelector("[data-co-ship]").textContent = ship ? money(ship) : "Free";
      document.querySelector("[data-co-total]").textContent = money(net + ship);
    }
    var coSum = document.querySelector(".checkout .summary");
    couponForm(coSum, totals);
    co.querySelectorAll("[name=ship]").forEach(function (r) { r.addEventListener("change", totals); });
    totals();

    /* card fields: format as the shopper types; values stay in the page (no name, never stored) */
    var cc = {};
    co.querySelectorAll("[data-cc]").forEach(function (f) {
      cc[f.dataset.cc] = f;
      f.addEventListener("input", function () { f.classList.remove("is-invalid"); });
    });
    var brandEl = co.querySelector("[data-cc-brand]");
    function ccBrand(n) {
      if (/^4/.test(n)) return "Visa";
      if (/^(5[1-5]|2[2-7])/.test(n)) return "Mastercard";
      if (/^3[47]/.test(n)) return "Amex";
      if (/^(6011|65|64[4-9])/.test(n)) return "Discover";
      return "";
    }
    function luhn(n) {
      var sum = 0, alt = false;
      for (var i = n.length - 1; i >= 0; i--) {
        var d = +n[i];
        if (alt) { d *= 2; if (d > 9) d -= 9; }
        sum += d; alt = !alt;
      }
      return n.length >= 13 && sum % 10 === 0;
    }
    cc.number.addEventListener("input", function () {
      var n = cc.number.value.replace(/\D/g, ""), b = ccBrand(n);
      n = n.slice(0, b === "Amex" ? 15 : 19);
      cc.number.value = b === "Amex" ? n.replace(/^(\d{4})(\d{1,6})?(\d{1,5})?/, function (m, a, c, d) { return [a, c, d].filter(Boolean).join(" "); })
        : n.replace(/(\d{4})(?=\d)/g, "$1 ");
      brandEl.textContent = b;
      cc.cvc.maxLength = b === "Amex" ? 4 : 3;
    });
    cc.exp.addEventListener("input", function (ev) {
      var d = cc.exp.value.replace(/\D/g, "").slice(0, 4);
      if (d.length === 1 && +d > 1) d = "0" + d;
      cc.exp.value = d.length > 2 ? d.slice(0, 2) + " / " + d.slice(2) : (d.length === 2 && ev.inputType !== "deleteContentBackward" ? d + " / " : d);
    });
    cc.cvc.addEventListener("input", function () { cc.cvc.value = cc.cvc.value.replace(/\D/g, "").slice(0, cc.cvc.maxLength); });
    function cardProblem() {
      var n = cc.number.value.replace(/\D/g, ""), b = ccBrand(n);
      if (!b || !luhn(n)) return [cc.number, "Please check your card number. We accept Visa, Mastercard, American Express and Discover."];
      var m = cc.exp.value.match(/^(\d{2}) \/ (\d{2})$/), now = new Date();
      if (!m || +m[1] < 1 || +m[1] > 12 || new Date(2000 + +m[2], +m[1]) <= now) return [cc.exp, "Please check your card's expiry date."];
      if (cc.cvc.value.length !== (b === "Amex" ? 4 : 3)) return [cc.cvc, "Please check your card's security code."];
      return null;
    }

    co.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var msg = co.querySelector("[data-co-msg]");
      var bad = Array.prototype.filter.call(co.querySelectorAll("[required]"), function (f) {
        var ok = f.type === "checkbox" ? f.checked : f.checkValidity();
        f.classList.toggle("is-invalid", !ok);
        return !ok;
      });
      if (bad.length) {
        msg.className = "co__msg is-err";
        msg.textContent = co.agree.checked || bad.length > 1 || bad[0].name !== "agree"
          ? "Please complete the highlighted fields."
          : "Please agree to the Terms of Service and policies to continue.";
        bad[0].focus();
        return;
      }
      var cardBad = cardProblem();
      if (cardBad) {
        cardBad[0].classList.add("is-invalid");
        msg.className = "co__msg is-err"; msg.textContent = cardBad[1]; cardBad[0].focus();
        return;
      }
      // Card payments go live once the payment processor's hosted fields are connected here.
      // Until then nothing is charged or sent, and the card details are wiped from the page.
      Object.keys(cc).forEach(function (k) { cc[k].value = ""; });
      brandEl.textContent = "";
      msg.className = "co__msg is-info";
      msg.innerHTML = "Online card payments are being activated and your card has not been charged. " +
        "To order now, email <a href=\"mailto:" + CAT.email + "\">" + CAT.email + "</a> with the items in your bag and we'll send a secure invoice.";
    });
  }

  /* order tracking: hands the number to the carrier's own tracking page */
  var CARRIERS = {
    usps: { name: "USPS", url: "https://tools.usps.com/go/TrackConfirmAction?tLabels=" },
    ups: { name: "UPS", url: "https://www.ups.com/track?tracknum=" },
    fedex: { name: "FedEx", url: "https://www.fedex.com/fedextrack/?trknbr=" }
  };
  function detectCarrier(n) {
    if (/^1Z[0-9A-Z]{16}$/.test(n)) return "ups";                          // UPS: 1Z + 16
    if (/^96\d{20}$/.test(n) || /^(\d{12}|\d{15})$/.test(n)) return "fedex"; // FedEx Ground 96…, Express 12 / Ground 15
    if (/^(9[2-5]\d{18,20}|420\d{5}(\d{4})?9\d{21})$/.test(n) || /^[A-Z]{2}\d{9}US$/.test(n)) return "usps"; // USPS 20–22, 420+ZIP, intl
    return null;
  }
  var tf = document.querySelector("[data-track-form]");
  if (tf) {
    tf.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var msg = tf.querySelector("[data-track-msg]");
      var num = tf.number.value.replace(/[\s-]/g, "").toUpperCase();
      tf.number.classList.toggle("is-invalid", !num);
      if (!num) { msg.className = "co__msg is-err"; msg.textContent = "Enter the tracking number from your shipping email."; tf.number.focus(); return; }
      var c = tf.carrier.value === "auto" ? detectCarrier(num) : tf.carrier.value;
      if (!c) { msg.className = "co__msg is-err"; msg.textContent = "We couldn't tell which carrier that number belongs to. Please choose USPS, UPS or FedEx above."; tf.carrier.focus(); return; }
      window.open(CARRIERS[c].url + encodeURIComponent(num), "_blank", "noopener");
      msg.className = "co__msg";
      msg.textContent = "Opening " + CARRIERS[c].name + " tracking for " + num + " in a new tab.";
    });
  }
  var th = document.querySelector("[data-track-help]");
  if (th) {
    th.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var msg = th.querySelector("[data-track-help-msg]");
      var bad = Array.prototype.filter.call(th.querySelectorAll("[required]"), function (f) {
        f.classList.toggle("is-invalid", !f.checkValidity());
        return !f.checkValidity();
      });
      if (bad.length) { msg.className = "co__msg is-err"; msg.textContent = "Please enter your order number and email."; bad[0].focus(); return; }
      var body = "Hi, I haven't received tracking for my order yet.\n\nOrder number: " + th.order.value + "\nEmail used at checkout: " + th.email.value;
      location.href = "mailto:" + CAT.email + "?subject=" + encodeURIComponent("Tracking request: order " + th.order.value) + "&body=" + encodeURIComponent(body);
      msg.className = "co__msg";
      msg.textContent = "Your email app should open with your request ready to send. If it doesn't, email us at " + CAT.email + ".";
    });
  }

  /* checkout progress: highlight the step for the section in view; click a step to jump to it */
  var steps = document.querySelector("[data-costeps]");
  if (steps) {
    var stepFor = { 1: "1", 2: "1", 3: "3", 4: "4" };
    var fieldsets = Array.prototype.slice.call(document.querySelectorAll("[data-fs]"));
    var setStep = function (s) {
      var reached = true;
      steps.querySelectorAll("[data-step]").forEach(function (li) {
        li.classList.toggle("is-on", li.dataset.step === s);
        li.classList.toggle("is-done", reached && li.dataset.step !== s);
        if (li.dataset.step === s) reached = false;
      });
    };
    var track = function () {
      var line = innerHeight * 0.4, cur = fieldsets[0];
      fieldsets.forEach(function (fs) { if (fs.getBoundingClientRect().top <= line) cur = fs; });
      setStep(stepFor[cur.dataset.fs]);
    };
    window.addEventListener("scroll", track, { passive: true });
    track();
    steps.querySelectorAll("[data-step]").forEach(function (li) {
      li.addEventListener("click", function () {
        var fs = document.querySelector('[data-fs="' + li.dataset.step + '"]');
        if (fs) window.scrollTo({ top: fs.getBoundingClientRect().top + scrollY - 110, behavior: "smooth" });
      });
    });
  }

  /* contact form: opens the visitor's email app, addressed to support */
  var cf = document.querySelector("[data-contact-form]");
  if (cf) {
    cf.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var msg = cf.querySelector("[data-contact-msg]");
      var bad = Array.prototype.filter.call(cf.querySelectorAll("[required]"), function (f) {
        f.classList.toggle("is-invalid", !f.checkValidity());
        return !f.checkValidity();
      });
      if (bad.length) { msg.className = "co__msg is-err"; msg.textContent = "Please complete the highlighted fields."; bad[0].focus(); return; }
      var body = cf.message.value + "\n\n" + cf.name.value + " (" + cf.email.value + ")" + (cf.order.value ? "\nOrder: " + cf.order.value : "");
      location.href = "mailto:" + CAT.email + "?subject=" + encodeURIComponent(cf.topic.value) + "&body=" + encodeURIComponent(body);
      msg.className = "co__msg";
      msg.textContent = "Your email app should open with your message ready to send. If it doesn't, email us directly at " + CAT.email + ".";
    });
  }

  /* mock-up star ratings: only drawn with ?mockup=1 (kept for the browser session) */
  var mock = /[?&]mockup=1\b/.test(location.search);
  try { if (mock) sessionStorage.setItem("atn_mockup", "1"); else mock = sessionStorage.getItem("atn_mockup") === "1"; } catch (e) {}
  if (mock) {
    var rate = function (id) {
      var h = 5381;
      for (var i = 0; i < id.length; i++) h = ((h * 33) ^ id.charCodeAt(i)) >>> 0;
      return { score: Math.round((3.8 + (h % 1000) / 1000 * 1.2) * 10) / 10, count: 3 + (h >>> 12) % 178 };
    };
    var starEl = function (id, big) {
      var r = rate(id), s = document.createElement("span");
      s.className = "stars" + (big ? " stars--lg" : "");
      s.setAttribute("role", "img");
      s.setAttribute("aria-label", "Rated " + r.score + " out of 5");
      s.innerHTML = '<span class="stars__bar" style="--fill:' + (r.score / 5 * 100) + '%"></span><span>' +
        (big ? "<b>" + r.score + "</b> · " + r.count + " reviews" : "(" + r.count + ")") + "</span>";
      return s;
    };
    document.querySelectorAll(".card").forEach(function (c) {
      var m = c.getAttribute("href").match(/products\/([^/]+)\.html/);
      if (m) c.appendChild(starEl(m[1]));
    });
    var pdpEl = document.querySelector("[data-product]");
    if (pdpEl) { var h1 = pdpEl.querySelector("h1"); if (h1) h1.after(starEl(pdpEl.dataset.product, true)); }
  }

  badge();
})();
