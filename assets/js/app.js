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

  /* shop filters */
  var grid = document.querySelector("[data-grid]");
  if (grid) {
    var params = new URLSearchParams(location.search);
    var state = { g: params.get("g") || "all", c: params.get("c") || "all", sort: "featured" };
    var cards = Array.prototype.slice.call(grid.children);
    var title = document.querySelector("[data-shop-title]");
    var labels = { all: "", men: "Men", women: "Women", tops: "Tops", bottoms: "Bottoms", headwear: "Headwear", accessories: "Accessories" };

    function apply(push) {
      var shown = 0;
      cards.forEach(function (c) {
        var ok = (state.g === "all" || c.dataset.gender.split(" ").indexOf(state.g) > -1) &&
                 (state.c === "all" || c.dataset.cat === state.c);
        c.hidden = !ok;
        if (ok) shown++;
      });
      var sorted = cards.slice().sort(function (a, b) {
        if (state.sort === "low") return a.dataset.price - b.dataset.price;
        if (state.sort === "high") return b.dataset.price - a.dataset.price;
        return a.dataset.order - b.dataset.order;
      });
      sorted.forEach(function (c) { grid.appendChild(c); });
      document.querySelectorAll("[data-g]").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.g === state.g); });
      document.querySelectorAll("[data-c]").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.c === state.c); });
      document.querySelector("[data-count]").textContent = shown + (shown === 1 ? " product" : " products");
      document.querySelector("[data-empty]").hidden = shown > 0;
      var t = [labels[state.g], labels[state.c]].filter(Boolean).join(" ");
      title.textContent = t ? (state.g !== "all" && state.c !== "all" ? labels[state.g] + "'s " + labels[state.c] : t) : "Shop All";
      document.title = title.textContent + " | Above The Norm";
      if (push) {
        var q = new URLSearchParams();
        if (state.g !== "all") q.set("g", state.g);
        if (state.c !== "all") q.set("c", state.c);
        history.replaceState(null, "", location.pathname + (q.toString() ? "?" + q : ""));
      }
      document.querySelectorAll(".hdr__nav a").forEach(function (a) {
        var u = new URL(a.href, location.href);
        if (u.pathname !== location.pathname) return;
        var g = u.searchParams.get("g") || "all", c = u.searchParams.get("c") || "all";
        if (g === state.g && c === state.c) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
      });
    }
    document.querySelectorAll("[data-g]").forEach(function (b) {
      b.addEventListener("click", function () { state.g = b.dataset.g; apply(true); });
    });
    document.querySelectorAll("[data-c]").forEach(function (b) {
      b.addEventListener("click", function () { state.c = b.dataset.c; apply(true); });
    });
    document.querySelector("[data-sort]").addEventListener("change", function (ev) { state.sort = ev.target.value; apply(false); });
    document.querySelector("[data-reset]").addEventListener("click", function () { state.g = state.c = "all"; apply(true); });
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
    var ship = shipping(sub, "standard");
    cartEl.querySelector("[data-ship]").textContent = ship ? money(ship) + " standard" : "Free standard";
    var left = CAT.ship.free_over - sub;
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
      var method = co.querySelector("[name=ship]:checked").value;
      var ship = ls.length ? shipping(sub, method) : 0;
      co.querySelector("[data-std-price]").textContent = sub >= CAT.ship.free_over ? "Free" : money(CAT.ship.standard_rate);
      document.querySelector("[data-co-sub]").textContent = money(sub);
      document.querySelector("[data-co-ship]").textContent = ship ? money(ship) : "Free";
      document.querySelector("[data-co-total]").textContent = money(sub + ship);
    }
    co.querySelectorAll("[name=ship]").forEach(function (r) { r.addEventListener("change", totals); });
    totals();

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
      // Card payments go live once the payment processor's hosted fields are connected here.
      msg.className = "co__msg is-info";
      msg.innerHTML = "Online card payments are being activated and your card has not been charged. " +
        "To order now, email <a href=\"mailto:" + CAT.email + "\">" + CAT.email + "</a> with the items in your bag and we'll send a secure invoice.";
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

  badge();
})();
