# Connect himgiriladders.in enquiries

The website currently exposes phone and WhatsApp links, not an enquiry form or a lead API. Those conversations cannot be imported through a website webhook alone. Add an enquiry form in the website project and deliver its submissions from the website's server (never from browser code).

## Receiver
- Publish this warehouse app before configuring production delivery.
- POST JSON to `https://himgiri-stockflow-planner.lovable.app/api/public/leads`.
- Save the same strong shared secret as `WEBSITE_LEADS_SIGNING_SECRET` in both projects using their secure secret forms. Never expose the secret in the browser.
- The receiver is disabled with HTTP 503 until the secret is configured.

## Payload and signing
Fields: `external_id` (stable unique submission ID, 1–160 characters), `name` (1–120), `email` (valid email, at most 255) and/or `phone` (5–40), optional `product` (at most 200), optional `message` (at most 4000). Source is assigned by the receiver. Extra fields are rejected. Body limit: 32 KiB.

Send `Content-Type: application/json`, `x-lead-timestamp` (10-digit Unix timestamp in seconds) and `x-lead-signature` (lowercase hex HMAC-SHA256 of `timestamp + "." + raw JSON body`, signed with the shared secret). Deliver within five minutes. Sign exactly the same bytes you send.

Persist submissions on the website before delivery. Retry transient 5xx failures with a fresh timestamp/signature and the same external_id; duplicate deliveries do not create duplicate leads or overwrite an existing lead. Fix 4xx input/signature errors rather than retrying blindly. Never log contact details or secrets. Protect the website form against spam and rate-limit it before signing.

The warehouse returns only `{ "ok": true }`, never customer records. Active warehouse managers can view the latest 200 enquiries on `/leads`; other users cannot read them. The inbox refreshes every minute. Existing leads require an authorized export or API from the website; none were imported.