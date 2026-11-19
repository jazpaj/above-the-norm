# Site email

`server.js` sends three kinds of email: the customer's order confirmation and the support "New order" alert
(both designed in `confirmations.mjs`), and plain notices for the newsletter, partner and restock forms.

Email goes out as support@abovethenorm.us, which lives on Google Workspace (the domain's MX points to Google):

1. `GOOGLE_SA_JSON` set: Gmail API with a service account (recommended; no password).
2. else `SMTP_PASS` set: Gmail SMTP with an App Password.
3. else: the old Microsoft 365 account. Its mail to support@ stays inside Microsoft 365 and never reaches Gmail.

## Service account setup (once)

1. console.cloud.google.com, signed in as a Workspace admin: create a project, enable the **Gmail API**.
2. IAM & Admin > Service Accounts > Create. Open it > Keys > Add key > JSON. Copy its **Client ID** (numbers).
3. admin.google.com > Security > Access and data control > API controls > Manage Domain Wide Delegation > Add new:
   that Client ID, scope `https://www.googleapis.com/auth/gmail.send`.
4. On the host set `GOOGLE_SA_JSON` to the whole JSON file contents (or the file base64-encoded).

## Settings on the host (environment variables, never in this repo)

| Name | Value |
|---|---|
| `GOOGLE_SA_JSON` | Service account JSON key (see above) |
| `MAIL_FROM` | Optional. Mailbox the Gmail API sends as. Defaults to support@abovethenorm.us |
| `SMTP_USER` | Google Workspace mailbox to send from. Defaults to support@abovethenorm.us |
| `SMTP_PASS` | A Google App Password for that mailbox (16 letters, spaces removed) |
| `ALERT_TO` | Optional. Where the "New order" alert goes. Defaults to the sending mailbox |
| `SEND_TOKEN` | Long random string that protects the test send |
| `TEST_RECIPIENT` | Where the test email goes |
| `MS_TENANT_ID`, `MS_CLIENT_ID`, `MS_CLIENT_SECRET`, `MAIL_SENDER` | Old Microsoft 365 sender, used only when `SMTP_PASS` isn't set |

## DNS for Google sending

So mail sent through Google isn't marked as spam: the SPF record must include `include:_spf.google.com`, and DKIM
must be turned on in Google Admin (Apps > Google Workspace > Gmail > Authenticate email), then its TXT record added.

## Test send

```bash
curl -X POST https://abovethenorm.us/api/test-email -H "X-Send-Token: YOUR_TOKEN"
```

Add `?first=Jazner` to the address to see the greeting with a given name. Real orders use the first name from checkout.
