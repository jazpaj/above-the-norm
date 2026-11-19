// Sends as support@abovethenorm.us through the Gmail API with a Google service account
// (domain-wide delegation, scope gmail.send). No password and no dependencies.
// Setting: GOOGLE_SA_JSON = the service account's JSON key, pasted as-is or base64-encoded.
const crypto = require("crypto");
const { buildMessage } = require("./smtp");

const b64url = (buf) => Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

function serviceAccount() {
  const raw = (process.env.GOOGLE_SA_JSON || "").trim();
  if (!raw) return null;
  const key = JSON.parse(raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8"));
  if (!key.client_email || !key.private_key) throw new Error("GOOGLE_SA_JSON is missing client_email or private_key");
  // Hosts sometimes store the key's line breaks as the two characters "\n".
  return { email: key.client_email, privateKey: key.private_key.replace(/\\n/g, "\n") };
}

let cached = null;
async function accessToken(sa, user) {
  if (cached && cached.user === user && cached.expires > Date.now()) return cached.value;
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify({
    iss: sa.email, sub: user, scope: "https://www.googleapis.com/auth/gmail.send",
    aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600
  }));
  const signature = b64url(crypto.createSign("RSA-SHA256").update(head + "." + claims).sign(sa.privateKey));
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: head + "." + claims + "." + signature })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) throw new Error("Google sign-in failed: " + (data.error_description || data.error || res.status));
  cached = { user, value: data.access_token, expires: Date.now() + (data.expires_in - 120) * 1000 };
  return cached.value;
}

async function sendGmail(mail) {
  const sa = serviceAccount();
  const user = process.env.MAIL_FROM || "support@abovethenorm.us";
  const raw = buildMessage({ ...mail, from: user, fromName: "Above The Norm" });
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/" + encodeURIComponent(user) + "/messages/send", {
    method: "POST",
    headers: { Authorization: "Bearer " + (await accessToken(sa, user)), "Content-Type": "application/json" },
    body: JSON.stringify({ raw: b64url(raw) })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error("Gmail send failed: " + ((data.error && data.error.message) || res.status));
  }
}

module.exports = { sendGmail, serviceAccount };
