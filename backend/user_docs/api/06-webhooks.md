# Webhooks

Webhooks allow your own applications to receive real-time notifications when data changes in the CRM.

## Supported Events
*   `lead.created`: Triggered when a new person is added.
*   `opportunity.won`: Triggered when a deal is closed.
*   `*`: Subscribe to all events.

## Payload Security (HMAC)
Every webhook request is signed with your **Webhook Secret**. You should verify this signature to ensure the data came from us.

**Headers provided:**
*   `X-Hub-Signature`: `sha256=<signature>`
*   `X-Event-Name`: The event type.

## How to Verify
1. Take the raw JSON body of the request.
2. Calculate an HMAC-SHA256 hash of the body using your `webhook_secret`.
3. Compare your hash to the one provided in `X-Hub-Signature`.
