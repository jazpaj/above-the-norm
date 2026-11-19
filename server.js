// Serves the generated static site. Hosts set PORT; no dependencies needed.
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { priceOrder, sendConfirmation, sampleOrder, orderDate, sendMail, notice } = require("./mail/order");

const ROOT = __dirname;
const PORT = process.env.PORT || 3000;
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
  ".mp4": "video/mp4"
};
// Source and config files stay private: only the site itself is served.
const BLOCKED_TOP = new Set(["_generator", "mail", "node_modules", "server.js", "package.json", "package-lock.json", "README.md"]);

function resolve(urlPath) {
  const parts = urlPath.split("/").filter(Boolean);
  if (parts.some((p) => p.startsWith(".") || p.includes("\\"))) return null;
  if (parts.length && BLOCKED_TOP.has(parts[0])) return null;
  const file = path.join(ROOT, ...parts);
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) return null;
  // A folder's index.html wins over a same-named .html file: the host can keep files from an
  // older version of the site after a deploy, and those must never be served in place of a page.
  for (const candidate of [file, path.join(file, "index.html"), file + ".html"]) {
    try {
      if (fs.statSync(candidate).isFile()) return candidate;
    } catch (e) {}
  }
  return null;
}

function send(res, status, file, headOnly, range) {
  const type = TYPES[path.extname(file).toLowerCase()] || "application/octet-stream";
  const size = fs.statSync(file).size;
  // Byte ranges let Safari and iPhones play the lookbook video.
  const m = status === 200 && /^bytes=(\d*)-(\d*)$/.exec(range || "");
  if (m && (m[1] || m[2])) {
    let start = m[1] ? +m[1] : Math.max(0, size - +m[2]), end = m[1] && m[2] ? Math.min(+m[2], size - 1) : size - 1;
    if (start > end || start >= size) {
      res.writeHead(416, { "Content-Range": "bytes */" + size });
      return res.end();
    }
    res.writeHead(206, { "Content-Type": type, "Content-Length": end - start + 1, "Content-Range": "bytes " + start + "-" + end + "/" + size, "Accept-Ranges": "bytes" });
    return headOnly ? res.end() : fs.createReadStream(file, { start, end }).pipe(res);
  }
  res.writeHead(status, { "Content-Type": type, "Content-Length": size, "Accept-Ranges": "bytes" });
  if (headOnly) return res.end();
  fs.createReadStream(file).pipe(res);
}

const CATALOG = JSON.parse(fs.readFileSync(path.join(ROOT, "mail/catalog.json"), "utf8"));

function json(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(data));
}

function readJson(req) {
  return new Promise((done, fail) => {
    let raw = "";
    req.on("data", (c) => {
      raw += c;
      if (raw.length > 32768) { fail(new Error("too large")); req.destroy(); }
    });
    req.on("end", () => {
      try { done(raw ? JSON.parse(raw) : {}); } catch (e) { fail(e); }
    });
    req.on("error", fail);
  });
}

// At most 5 orders (and 5 of each form) per visitor every 10 minutes, so the form can't be used to send mail in bulk.
const recent = new Map();
function tooMany(req, bucket = "order") {
  const ip = req.headers["cf-connecting-ip"] || String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket.remoteAddress;
  const now = Date.now();
  const key = bucket + " " + ip;
  const hits = (recent.get(key) || []).filter((t) => now - t < 600000);
  if (hits.length >= 5) return true;
  hits.push(now);
  recent.set(key, hits);
  return false;
}

function sameOrigin(req) {
  try {
    return new URL(req.headers.origin).host === req.headers.host;
  } catch (e) {
    return false;
  }
}

function tokenOk(req) {
  const want = process.env.SEND_TOKEN || "";
  const hash = (v) => crypto.createHash("sha256").update(String(v)).digest();
  return want.length >= 16 && crypto.timingSafeEqual(hash(want), hash(req.headers["x-send-token"] || ""));
}

// Checkout posts here. ORDERS_LIVE in data.py stays False until a payment gateway approves charges,
// so no customer is told an order is confirmed when nothing was paid.
async function placeOrder(req, res) {
  if (!CATALOG.ordersLive) return json(res, 503, { ok: false, error: "Online orders aren't open yet." });
  if (!sameOrigin(req)) return json(res, 403, { ok: false, error: "Forbidden." });
  if (tooMany(req)) return json(res, 429, { ok: false, error: "Too many attempts. Please try again later." });
  const body = await readJson(req).catch(() => null);
  if (!body || typeof body !== "object") return json(res, 400, { ok: false, error: "That request couldn't be read." });
  const order = priceOrder(body, CATALOG);
  if (order.error) return json(res, 422, { ok: false, error: order.error });
  const { number, alertError } = await sendConfirmation(order);
  json(res, 200, { ok: true, order_number: number, alert_sent: !alertError, total: order.total, order: { ...order, number, date: orderDate(new Date()) } });
}

// Sends a sample email to TEST_RECIPIENT only. Needs the X-Send-Token header.
async function testEmail(req, res) {
  if (!tokenOk(req)) return json(res, 403, { ok: false, error: "Forbidden." });
  const to = process.env.TEST_RECIPIENT;
  if (!to) return json(res, 500, { ok: false, error: "TEST_RECIPIENT isn't set." });
  const sent = await sendConfirmation(sampleOrder(to, new URL(req.url, "http://x").searchParams.get("first")));
  json(res, 200, { ok: true, to, order_number: sent.number, alert_to: process.env.ALERT_TO || process.env.MAIL_SENDER || "support@abovethenorm.us", alert_error: sent.alertError || null });
}

// Site forms: each one emails the details to the support inbox through the same Microsoft account.
const clean = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
function form(bucket, handler) {
  return async (req, res) => {
    if (!sameOrigin(req)) return json(res, 403, { error: "Forbidden." });
    if (tooMany(req, bucket)) return json(res, 429, { error: "Too many attempts. Please try again later." });
    const body = await readJson(req).catch(() => null);
    if (!body || typeof body !== "object") return json(res, 400, { error: "That request couldn't be read." });
    return handler(body, res);
  };
}
const newsletter = form("newsletter", async (b, res) => {
  const email = clean(b.email, 254);
  if (!validEmail(email) || b.consent !== true) return json(res, 422, { error: "Enter a valid email address." });
  await sendMail(notice("New email list signup", [["Email", email], ["Consent", "Agreed to ATN marketing emails"]]));
  json(res, 200, { ok: true, code: CATALOG.coupon.code, percent: CATALOG.coupon.pct });
});
const partner = form("partner", async (b, res) => {
  const f = { name: clean(b.name, 100), company: clean(b.company, 160), email: clean(b.email, 254), website: clean(b.website, 255), kind: clean(b.kind, 60), message: clean(b.message, 3000) };
  if (!f.name || !f.company || !validEmail(f.email) || !f.kind || !f.message) return json(res, 422, { error: "Please complete every required field." });
  await sendMail({ ...notice("Partnership inquiry: " + f.company, [["Name", f.name], ["Company", f.company], ["Email", f.email], ["Website", f.website], ["Interested in", f.kind], ["Message", f.message]]), replyTo: f.email });
  json(res, 200, { received: true });
});
const restock = form("restock", async (b, res) => {
  const p = CATALOG.products[b.productId], email = clean(b.email, 254), size = clean(b.size, 10);
  if (!p || !(size in p.p) || !validEmail(email) || b.consent !== true) return json(res, 422, { error: "Enter a valid email address." });
  await sendMail({ ...notice("Restock alert request: " + p.n, [["Product", p.n + (p.c ? " (" + p.c + ")" : "")], ["Size", size], ["Email", email]]), replyTo: email });
  json(res, 200, { received: true });
});

const API = { "/api/place-order": placeOrder, "/api/test-email": testEmail, "/api/newsletter": newsletter, "/api/partner-inquiries": partner, "/api/restock": restock };

// Addresses from the previous version of the site, sent to their new pages.
const MOVED = { "/about": "/story/", "/faq": "/help/", "/cart": "/shop/", "/order-confirmed": "/checkout/complete/" };

http
  .createServer((req, res) => {
    const api = API[req.url.split("?")[0]];
    if (api) {
      if (req.method !== "POST") {
        res.writeHead(405, { Allow: "POST" });
        return res.end();
      }
      return api(req, res).catch((err) => {
        console.error(req.url, err.message);
        if (!res.headersSent) json(res, 502, { ok: false, error: "We couldn't complete that. Please try again." });
      });
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { Allow: "GET, HEAD" });
      return res.end();
    }
    let urlPath;
    try {
      urlPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    } catch (e) {
      res.writeHead(400);
      return res.end();
    }
    const headOnly = req.method === "HEAD";
    const search = new URL(req.url, "http://localhost").search;
    const redirect = (to) => { res.writeHead(301, { Location: encodeURI(to) + search }); res.end(); };
    // One address per page, ending in a slash: /shop, /shop.html and /shop/index.html -> /shop/
    const bare = "/" + urlPath.split("/").filter(Boolean).join("/").replace(/\.html$/, "").replace(/(^|\/)index$/, "$1");
    if (MOVED[bare.replace(/\/$/, "")]) return redirect(MOVED[bare.replace(/\/$/, "")]);
    const file = resolve(urlPath) || (urlPath.endsWith(".html") ? resolve(bare) : null);
    if (file && file.endsWith(".html")) {
      const want = bare === "/" ? "/" : bare.replace(/\/$/, "") + "/";
      if (want !== urlPath) return redirect(want);
    }
    if (file) return send(res, 200, file, headOnly, req.headers.range);
    // Unknown pages get the site shell, which shows a "not found" message.
    send(res, 404, path.join(ROOT, "index.html"), headOnly);
  })
  .listen(PORT, () => console.log("Above The Norm running on port " + PORT));
