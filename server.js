// Serves the generated static site. Hosts set PORT; no dependencies needed.
const http = require("http");
const fs = require("fs");
const path = require("path");

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
const BLOCKED_TOP = new Set(["_generator", "node_modules", "server.js", "package.json", "package-lock.json"]);

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

http
  .createServer((req, res) => {
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
