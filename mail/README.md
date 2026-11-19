# Site email

`server.js` sends three kinds of email: the customer's order confirmation and the support "New order" alert
(both designed in `confirmations.mjs`), and plain notices for the newsletter, partner and restock forms.

Email goes out through **Google Workspace** when `SMTP_PASS` is set, since support@abovethenorm.us lives there
(the domain's MX points to Google). Without `SMTP_PASS` it falls back to the old Microsoft 365 account.

## Settings on the host (environment variables, never in this repo)

| Name | Value |
|---|---|
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
