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
  const first = text(body.first, 80), last = text(body.last, 80), address1 = text(body.address1, 160);
  const city = text(body.city, 80), state = text(body.state, 40), zip = text(body.zip, 20);
  if (!first || !last || !address1 || !city || !state || !zip) return { error: "A complete shipping address is required." };
  if (!Array.isArray(body.items) || !body.items.length || body.items.length > 30) return { error: "The order has no items." };

  const items = [];
  for (const l of body.items) {
    const p = l && catalog.products[l.id];
    const price = p && p.p && p.p[l.size];
    if (typeof price !== "number" || !Number.isInteger(l.qty) || l.qty < 1 || l.qty > 20) return { error: "An item in the order isn't available." };
    items.push({ name: p.n, variant: [p.c, "Size " + l.size].filter(Boolean).join(" · "), qty: l.qty, total: price * l.qty });
  }
  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const coupon = catalog.coupon && body.coupon === catalog.coupon.code ? catalog.coupon : null;
  const discount = coupon ? Math.round(subtotal * coupon.pct) / 100 : 0;
  const net = subtotal - discount;
  const express = body.ship === "express";
  const shipping = express ? catalog.ship.express_rate : net >= catalog.ship.free_over ? 0 : catalog.ship.standard_rate;
  const last4 = /^\d{4}$/.test(body.card_last4) ? body.card_last4 : "";
  const brand = text(body.card_brand, 20);

  return {
    email, first, name: first + " " + last, address1, address2: text(body.address2, 160),
    cityLine: city + ", " + state + " " + zip, country: text(body.country, 60) || "United States",
    items, subtotal, discount, couponCode: coupon ? coupon.code : "", shipping, tax: 0, total: net + shipping,
    payment: last4 ? (brand || "Card") + " ending " + last4 : "Card"
  };
}

function orderNumber(now) {
  const d = now.toISOString().slice(2, 10).replace(/-/g, "");
  return "ATN-" + d + "-" + crypto.randomBytes(2).toString("hex").toUpperCase();
}

function renderEmail(order, number, now) {
  const fill = (tpl, vars) => tpl.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? esc(vars[k]) : ""));
  const block = (tpl, tag, show) =>
    tpl.replace(new RegExp("<!--" + tag + "-->([\\s\\S]*?)<!--/" + tag + "-->"), show ? "$1" : "");
  let html = TEMPLATE.replace(/<!--items-->([\s\S]*?)<!--\/items-->/, (m, row) =>
    order.items.map((i) => fill(row, { item_name: i.name, item_variant: i.variant, item_quantity: i.qty, item_total: money(i.total) })).join("")
  );
  html = block(html, "discount", order.discount > 0);
  html = block(html, "line2", !!order.address2);
  return fill(html, {
    customer_name: order.first.toUpperCase(),
    order_number: number,
    order_date: now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "America/Chicago" }),
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
    order_status_url: SITE_URL() + "/track",
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

async function sendMail({ to, subject, html }) {
  const sender = process.env.MAIL_SENDER || "support@abovethenorm.us";
  const res = await fetch("https://graph.microsoft.com/v1.0/users/" + encodeURIComponent(sender) + "/sendMail", {
    method: "POST",
    headers: { Authorization: "Bearer " + (await graphToken()), "Content-Type": "application/json" },
    body: JSON.stringify({
      message: {
        subject,
        body: { contentType: "HTML", content: html },
        toRecipients: [{ emailAddress: { address: to } }]
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

function sampleOrder(to, first) {
  first = text(first, 80) || "Sample";
  return {
    email: to, first, name: first + " Customer", address1: "6122 Sterling Ave", address2: "",
    cityLine: "Raytown, MO 64133", country: "United States",
    items: [
      { name: "Sample Hoodie", variant: "Black · Size L", qty: 1, total: 75 },
      { name: "Sample Tee", variant: "White · Size M", qty: 2, total: 80 }
    ],
    subtotal: 155, discount: 15.5, couponCode: "ABOVE10", shipping: 0, tax: 0, total: 139.5, payment: "Visa ending 4242"
  };
}

module.exports = { priceOrder, renderEmail, sendConfirmation, sampleOrder };
