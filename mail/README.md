# Order confirmation email

Sends `order-confirmation.html` from the store mailbox through Microsoft Graph. `server.js` calls this.

## Settings on the host (environment variables, never in this repo)

| Name | Value |
|---|---|
| `MS_TENANT_ID` | Directory (tenant) ID of the Entra app |
| `MS_CLIENT_ID` | Application (client) ID of the Entra app |
| `MS_CLIENT_SECRET` | The client secret value |
| `MAIL_SENDER` | Mailbox to send from. Defaults to support@abovethenorm.us |
| `SEND_TOKEN` | Long random string that protects the test send |
| `TEST_RECIPIENT` | Where the test email goes |

## Test send

```bash
curl -X POST https://abovethenorm.us/api/test-email -H "X-Send-Token: YOUR_TOKEN"
```

## Going live

`ORDERS_LIVE` in `_generator/data.py` is off, so checkout sends nothing and `/api/place-order` refuses orders.
Turn it on only after a payment gateway is connected, and call the endpoint only once a charge is approved.
The email says "Total paid", so it must never go out for an unpaid order.

Orders aren't stored. The only record is the copy in the sender's Sent Items.
