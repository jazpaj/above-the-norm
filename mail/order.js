// Order confirmation email: prices the order on the server, fills the template, sends through Microsoft Graph.
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const TEMPLATE = fs.readFileSync(path.join(__dirname, "order-confirmation.html"), "utf8");
const SITE_URL = () => (process.env.SITE_URL || "https://abovethenorm.us").replace(/\/$/, "");
const money = (v) => "$" + v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const esc = (v) =>
  String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const text = (v, max) => (typeof v === "string" ? v.replace(/[\r\n\t]+/g, " ").trim().slice(0, max) : "");

// Never trusts prices or totals from the browser: everything is worked out from the catalog.
function priceOrder(body, catalog) {
  const email = text(body.email, 200);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "A valid email is required." };
  const ship = body.shippingAddress && typeof body.shippingAddress === "object" ? body.shippingAddress : {};
  const name = text(body.name, 150), first = name.split(" ")[0], phone = text(body.phone, 40);
  const address1 = text(ship.line1, 200), city = text(ship.city, 100), state = text(ship.state, 40), zip = text(ship.postalCode, 10);
  if (!name || !address1 || !city || !state || !zip) return { error: "A complete shipping address is required." };
  if (body.acceptedTerms !== true) return { error: "Please accept the Terms of Service." };
  if (!Array.isArray(body.items) || !body.items.length || body.items.length > 30) return { error: "The order has no items." };

  const items = [];
  for (const l of body.items) {
    const p = l && catalog.products[l.id];
    const price = p && p.p && p.p[l.size];
    const qty = l && l.quantity;
    if (typeof price !== "number" || !Number.isInteger(qty) || qty < 1 || qty > 20) return { error: "An item in the order isn't available." };
    items.push({ id: l.id, image: p.i, name: p.n, variant: [p.c, "Size " + l.size].filter(Boolean).join(" · "), qty, total: price * qty });
  }
  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const coupon = catalog.coupon && body.welcome === true ? catalog.coupon : null;
  const discount = coupon ? Math.round(subtotal * coupon.pct) / 100 : 0;
  const net = subtotal - discount;
  const express = body.shipping === "express";
  const shipping = express ? catalog.ship.express_rate : net >= catalog.ship.free_over ? 0 : catalog.ship.standard_rate;

  return {
    email, first, name, phone, address1, address2: text(ship.line2, 200),
    cityLine: city + ", " + state + " " + zip, country: "United States",
    items, subtotal, discount, couponCode: coupon ? coupon.code : "", shipping, tax: 0, total: net + shipping, ship: express ? "express" : "standard",
    payment: "Card"
  };
}

// The email's own JPEG if there is one, since Outlook on Windows can't show the site's WebP photos.
function itemImage(item) {
  const thumb = "assets/img/email/products/" + item.id + ".jpg";
  return SITE_URL() + "/" + (fs.existsSync(path.join(__dirname, "..", thumb)) ? thumb : item.image);
}

const orderDate = (now) => now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "America/Chicago" });

function orderNumber(now) {
  const d = now.toISOString().slice(2, 10).replace(/-/g, "");
  return "ATN-" + d + "-" + crypto.randomBytes(2).toString("hex").toUpperCase();
}

function renderEmail(order, number, now) {
  const fill = (tpl, vars) => tpl.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? esc(vars[k]) : ""));
  const block = (tpl, tag, show) =>
    tpl.replace(new RegExp("<!--" + tag + "-->([\\s\\S]*?)<!--/" + tag + "-->"), show ? "$1" : "");
  let html = TEMPLATE.replace(/<!--items-->([\s\S]*?)<!--\/items-->/, (m, row) =>
    order.items.map((i) => fill(row, { item_image: itemImage(i), item_name: i.name, item_variant: i.variant, item_quantity: i.qty, item_total: money(i.total) })).join("")
  );
  html = block(html, "discount", order.discount > 0);
  html = block(html, "line2", !!order.address2);
  return fill(html, {
    customer_name: order.first.toUpperCase(),
    order_number: number,
    order_date: orderDate(now),
    subtotal: money(order.subtotal),
    discount: money(order.discount),
    coupon_code: order.couponCode,
    shipping_cost: order.shipping ? money(order.shipping) : "Free",
    tax_amount: money(order.tax),
    order_total: money(order.total),
    shipping_name: order.name,
    shipping_address_line1: order.address1,
    shipping_address_line2: order.address2,
    shipping_city_state_zip: order.cityLine,
    shipping_country: order.country,
    payment_method: order.payment,
    order_status_url: SITE_URL() + "/track/",
    current_year: now.getFullYear()
  });
}

let cachedToken = null;
async function graphToken() {
  if (cachedToken && cachedToken.expires > Date.now()) return cachedToken.value;
  const { MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET } = process.env;
  if (!MS_TENANT_ID || !MS_CLIENT_ID || !MS_CLIENT_SECRET) throw new Error("Microsoft Graph settings are missing");
  const res = await fetch("https://login.microsoftonline.com/" + encodeURIComponent(MS_TENANT_ID) + "/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: MS_CLIENT_ID,
      client_secret: MS_CLIENT_SECRET,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials"
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) throw new Error("Graph sign-in failed: " + (data.error_description || data.error || res.status));
  cachedToken = { value: data.access_token, expires: Date.now() + (data.expires_in - 120) * 1000 };
  return cachedToken.value;
}

async function sendMail({ to, subject, html, replyTo }) {
  const sender = process.env.MAIL_SENDER || "support@abovethenorm.us";
  const res = await fetch("https://graph.microsoft.com/v1.0/users/" + encodeURIComponent(sender) + "/sendMail", {
    method: "POST",
    headers: { Authorization: "Bearer " + (await graphToken()), "Content-Type": "application/json" },
    body: JSON.stringify({
      message: {
        subject,
        body: { contentType: "HTML", content: html },
        toRecipients: [{ emailAddress: { address: to } }],
        ...(replyTo ? { replyTo: [{ emailAddress: { address: replyTo } }] } : {})
      },
      saveToSentItems: true
    })
  });
  if (res.status !== 202) {
    const data = await res.json().catch(() => ({}));
    throw new Error("Graph send failed: " + ((data.error && data.error.message) || res.status));
  }
}

async function sendConfirmation(order) {
  const now = new Date();
  const number = orderNumber(now);
  await sendMail({
    to: order.email,
    subject: "Your Above The Norm order #" + number + " is confirmed",
    html: renderEmail(order, number, now)
  });
  return number;
}

// A plain email to the support inbox for site forms (newsletter, partners, restock alerts).
function notice(subject, rows) {
  const to = process.env.MAIL_SENDER || "support@abovethenorm.us";
  const body = rows.filter((r) => r[1]).map(([k, v]) =>
    '<tr><td style="padding:6px 16px 6px 0;color:#52514a;vertical-align:top;white-space:nowrap;">' + esc(k) + '</td><td style="padding:6px 0;white-space:pre-wrap;">' + esc(v) + "</td></tr>").join("");
  return { to, subject, html: '<div style="font:15px/1.5 Arial,sans-serif;color:#161614;"><p><strong>' + esc(subject) + '</strong></p><table role="presentation" cellspacing="0" cellpadding="0">' + body + "</table><p style=\"color:#52514a;font-size:12px;\">Sent from the form on abovethenorm.us.</p></div>" };
}

function sampleOrder(to, first) {
  first = text(first, 80) || "Sample";
  return {
    email: to, first, name: first + " Customer", address1: "6122 Sterling Ave", address2: "",
    cityLine: "Raytown, MO 64133", country: "United States",
    items: [
      { id: "atn-angels-hoodie-sky-blue", image: "assets/products/atn-angels-hoodie-sky-blue-1.webp", name: "ATN Angels Hoodie", variant: "Sky Blue · Size L", qty: 1, total: 75 },
      { id: "sent-from-above-hoodie-black", image: "assets/products/sent-from-above-hoodie-black-1.webp", name: "Sent From Above Hoodie", variant: "Black · Size M", qty: 1, total: 75 }
    ],
    subtotal: 150, discount: 15, couponCode: "ABOVE10", shipping: 0, tax: 0, total: 135, payment: "Visa ending 4242"
  };
}

module.exports = { priceOrder, renderEmail, sendConfirmation, sampleOrder, orderDate, sendMail, notice };
