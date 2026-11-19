// Minimal SMTP sender for Google Workspace (smtp.gmail.com, port 465 over TLS). No dependencies.
// Settings: SMTP_USER (the mailbox, e.g. support@abovethenorm.us) and SMTP_PASS (a Google App Password).
const tls = require("tls");
const net = require("net");
const crypto = require("crypto");

const b64 = (s) => Buffer.from(s, "utf8").toString("base64");
const wrap = (s) => s.replace(/.{1,76}/g, "$&\r\n");
// Encodes a header value when it has non-ASCII characters (names, em dashes, the ® mark).
const word = (s) => (/^[\x20-\x7e]*$/.test(s) ? s : "=?UTF-8?B?" + b64(s) + "?=");
const clean = (s) => String(s).replace(/[\r\n]+/g, " ");

function buildMessage({ from, fromName, to, replyTo, subject, html, text }) {
  const boundary = "atn-" + crypto.randomBytes(12).toString("hex");
  const domain = from.split("@")[1];
  const head = [
    "From: " + word(clean(fromName)) + " <" + from + ">",
    "To: <" + to + ">",
    replyTo ? "Reply-To: <" + replyTo + ">" : "",
    "Subject: " + word(clean(subject)),
    "Date: " + new Date().toUTCString().replace("GMT", "+0000"),
    "Message-ID: <" + crypto.randomUUID() + "@" + domain + ">",
    "MIME-Version: 1.0",
    'Content-Type: multipart/alternative; boundary="' + boundary + '"'
  ].filter(Boolean);
  const part = (type, body) => ["--" + boundary, "Content-Type: " + type + "; charset=UTF-8", "Content-Transfer-Encoding: base64", "", wrap(b64(body))].join("\r\n");
  const plain = text || html.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/[ \t]+/g, " ").trim();
  return head.join("\r\n") + "\r\n\r\n" + part("text/plain", plain) + "\r\n" + part("text/html", html) + "\r\n--" + boundary + "--\r\n";
}

function session(socket) {
  let buf = "", waiting = null, failed = null;
  const done = /(?:^|\r\n)\d{3} [^\r\n]*\r\n$/; // last line "NNN text" (space, not dash) ends a reply
  const flush = () => {
    if (!waiting) return;
    if (failed) { const w = waiting; waiting = null; return w(null); }
    if (done.test(buf)) { const w = waiting, r = buf; waiting = null; buf = ""; w(r); }
  };
  socket.setEncoding("utf8");
  socket.on("data", (d) => { buf += d; flush(); });
  socket.on("error", (e) => { failed = e; flush(); });
  socket.on("close", () => { failed = failed || new Error("closed"); flush(); });
  const reply = () => new Promise((res) => { waiting = res; flush(); });
  return async (line, expect) => {
    if (line != null) socket.write(line + "\r\n");
    const r = await reply();
    if (!r) throw new Error("SMTP connection failed: " + failed.message);
    const code = +r.match(/(\d{3}) [^\r\n]*\r\n$/)[1];
    if (!expect.includes(code)) throw new Error("SMTP " + (line ? line.split(" ")[0] : "greeting") + " failed: " + r.trim().split("\r\n").pop());
    return r;
  };
}

async function sendSmtp(mail, opts = {}) {
  const user = process.env.SMTP_USER || "support@abovethenorm.us";
  const host = opts.host || process.env.SMTP_HOST || "smtp.gmail.com";
  const port = +(opts.port || process.env.SMTP_PORT || 465);
  const socket = opts.plain ? net.connect(port, host) : tls.connect({ host, port, servername: host });
  socket.setTimeout(20000, () => socket.destroy(new Error("timed out")));
  const cmd = session(socket);
  try {
    await cmd(null, [220]);
    await cmd("EHLO abovethenorm.us", [250]);
    await cmd("AUTH PLAIN " + b64("\0" + user + "\0" + process.env.SMTP_PASS), [235]);
    await cmd("MAIL FROM:<" + user + ">", [250]);
    await cmd("RCPT TO:<" + mail.to + ">", [250, 251]);
    await cmd("DATA", [354]);
    const body = buildMessage({ ...mail, from: user, fromName: "Above The Norm" }).replace(/^\./gm, "..");
    await cmd(body + "\r\n.", [250]);
    await cmd("QUIT", [221]).catch(() => {});
  } finally {
    socket.end();
  }
}

module.exports = { sendSmtp, buildMessage };
