// Serves the generated static site. Hosts set PORT; no dependencies needed.
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { priceOrder, sendConfirmation, sampleOrder } = require("./mail/order");

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
  ".xml": "application/xml"
};
// Source and config files stay private: only the site itself is served.
const BLOCKED_TOP = new Set(["_generator", "mail", "node_modules", "server.js", "package.json", "package-lock.json"]);

function resolve(urlPath) {
  const parts = urlPath.split("/").filter(Boolean);
  if (parts.some((p) => p.startsWith(".") || p.includes("\\"))) return null;
  if (parts.length && BLOCKED_TOP.has(parts[0])) return null;
  const file = path.join(ROOT, ...parts);
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) return null;
  for (const candidate of [file, file + ".html", path.join(file, "index.html")]) {
    try {
      if (fs.statSync(candidate).isFile()) return candidate;
    } catch (e) {}
  }
  return null;
}

function send(res, status, file, headOnly) {
  res.writeHead(status, {
    "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream"
  });
  if (headOnly) return res.end();
  fs.createReadStream(file).pipe(res);
}

const CATALOG = JSON.parse(fs.readFileSync(path.join(ROOT, "assets/js/catalog.js"), "utf8").match(/window\.ATN = (\{.*\});/)[1]);

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

// At most 5 orders per visitor every 10 minutes, so the form can't be used to send mail in bulk.
const recent = new Map();
function tooMany(req) {
  const ip = req.headers["cf-connecting-ip"] || String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket.remoteAddress;
  const now = Date.now();
  const hits = (recent.get(ip) || []).filter((t) => now - t < 600000);
  if (hits.length >= 5) return true;
  hits.push(now);
  recent.set(ip, hits);
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
  json(res, 200, { ok: true, order_number: await sendConfirmation(order), total: order.total });
}

// Sends a sample email to TEST_RECIPIENT only. Needs the X-Send-Token header.
async function testEmail(req, res) {
  if (!tokenOk(req)) return json(res, 403, { ok: false, error: "Forbidden." });
  const to = process.env.TEST_RECIPIENT;
  if (!to) return json(res, 500, { ok: false, error: "TEST_RECIPIENT isn't set." });
  json(res, 200, { ok: true, to, order_number: await sendConfirmation(sampleOrder(to)) });
}

const API = { "/api/place-order": placeOrder, "/api/test-email": testEmail };

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
    const file = resolve(urlPath);
    const headOnly = req.method === "HEAD";
    if (file && file.endsWith(".html")) {
      // One address per page: /shop.html, /shop/ -> /shop and /index.html -> /
      const clean = "/" + urlPath.split("/").filter(Boolean).join("/").replace(/\.html$/, "").replace(/(^|\/)index$/, "$1");
      if (clean !== urlPath) {
        res.writeHead(301, { Location: encodeURI(clean) + new URL(req.url, "http://localhost").search });
        return res.end();
      }
    }
    if (file) return send(res, 200, file, headOnly);
    send(res, 404, path.join(ROOT, "404.html"), headOnly);
  })
  .listen(PORT, () => console.log("Above The Norm running on port " + PORT));
