// Order confirmation email: prices the order on the server, fills the template, sends through Microsoft Graph.
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

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
    items.push({ id: l.id, image: p.i, name: p.n, color: p.c, size: l.size, variant: [p.c, "Size " + l.size].filter(Boolean).join(" · "), qty, unit: price, total: price * qty });
  }
  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const coupon = catalog.coupon && body.welcome === true ? catalog.coupon : null;
  const discount = coupon ? Math.round(subtotal * coupon.pct) / 100 : 0;
  const net = subtotal - discount;
  const express = body.shipping === "express";
  const shipping = express ? catalog.ship.express_rate : net >= catalog.ship.free_over ? 0 : catalog.ship.standard_rate;

  return {
    email, first, name, phone, address1, address2: text(ship.line2, 200),
    city, state, zip, cityLine: city + ", " + state + " " + zip, country: "United States",
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

// The email design lives in confirmations.mjs (an ES module, loaded once on first use).
let design = null;
const cents = (v) => Math.round(v * 100);

async function renderEmail(order, number, now) {
  design = design || (await import("./confirmations.mjs"));
  return design.orderConfirmation({
    // "received": no payment gateway is connected yet, so the email never says the order was paid.
    // Switch to status "paid" with payment details once the gateway confirms the charge.
    reference: number, status: "received", currency: "USD", placedAt: now.toISOString(),
    customer: { name: order.first, email: order.email, phone: order.phone || undefined },
    items: order.items.map((i) => ({ name: i.name, color: i.color || undefined, size: i.size, quantity: i.qty, unitAmount: cents(i.unit), imageUrl: itemImage(i) })),
    totals: { subtotal: cents(order.subtotal), discount: cents(order.discount), discountCode: order.couponCode || undefined, shipping: cents(order.shipping), tax: cents(order.tax), total: cents(order.total) },
    payment: {},
    shipping: {
      method: order.ship === "express" ? "U.S. Express" : "U.S. Standard", status: "Preparing your order",
      processingWindow: "7–14 business days",
      transitWindow: (order.ship === "express" ? "1–3" : "3–7") + " working days after dispatch",
      address: { name: order.name, line1: order.address1, line2: order.address2 || undefined, city: order.city, region: order.state, postalCode: order.zip, country: order.country }
    }
  }, { origin: SITE_URL(), logoUrl: SITE_URL() + "/assets/atn-mark.png", timeZone: "America/Chicago" });
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

async function sendMail({ to, subject, html, replyTo, bcc }) {
  const sender = process.env.MAIL_SENDER || "support@abovethenorm.us";
  const res = await fetch("https://graph.microsoft.com/v1.0/users/" + encodeURIComponent(sender) + "/sendMail", {
    method: "POST",
    headers: { Authorization: "Bearer " + (await graphToken()), "Content-Type": "application/json" },
    body: JSON.stringify({
      message: {
        subject,
        body: { contentType: "HTML", content: html },
        toRecipients: [{ emailAddress: { address: to } }],
        ...(replyTo ? { replyTo: [{ emailAddress: { address: replyTo } }] } : {}),
        ...(bcc ? { bccRecipients: [{ emailAddress: { address: bcc } }] } : {})
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
  const mail = await renderEmail(order, number, now);
  // Support gets a hidden copy of every confirmation, so each order also lands in its inbox.
  const support = process.env.MAIL_SENDER || "support@abovethenorm.us";
  await sendMail({ to: order.email, subject: mail.subject, html: mail.html, bcc: order.email.toLowerCase() === support.toLowerCase() ? undefined : support });
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
    email: to, first, name: first + " Customer", phone: "", address1: "6122 Sterling Ave", address2: "",
    city: "Raytown", state: "MO", zip: "64133", cityLine: "Raytown, MO 64133", country: "United States",
    items: [
      { id: "atn-angels-hoodie-sky-blue", image: "assets/products/atn-angels-hoodie-sky-blue-1.webp", name: "ATN Angels Hoodie", color: "Sky Blue", size: "L", qty: 1, unit: 75, total: 75 },
      { id: "sent-from-above-hoodie-black", image: "assets/products/sent-from-above-hoodie-black-1.webp", name: "Sent From Above Hoodie", color: "Black", size: "M", qty: 1, unit: 75, total: 75 }
    ],
    subtotal: 150, discount: 15, couponCode: "ABOVE10", shipping: 0, tax: 0, total: 135, ship: "standard"
  };
}

module.exports = { priceOrder, renderEmail, sendConfirmation, sampleOrder, orderDate, sendMail, notice };
