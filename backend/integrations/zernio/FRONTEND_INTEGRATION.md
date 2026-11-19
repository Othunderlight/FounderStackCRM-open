# Zernio Integration — Frontend Handoff

Everything the frontend needs to build the Zernio screens. Backend work is done and verified; this document covers auth, flows, endpoints, payloads, and error handling.

---

## 1. Context

Zernio is the messaging/social provider behind the CRM's inbox, publishing, and social analytics.

- **One CRM organization = one Zernio "profile"** (customer). The backend creates it lazily and stores `externalId = organization.id`, so webhook events always route back to the right tenant.
- The backend **mirrors** accounts, conversations, messages, posts, daily metrics, and webhook events locally. The frontend reads from this mirror, not from Zernio directly.
- A single global webhook endpoint receives all customers' events, verifies the HMAC signature, and updates the mirror. **The frontend does not implement webhooks.**
- An Inngest cron (`zernio_sync_all`) refreshes accounts, health, inbox, and analytics every hour at `:15`.

**Base URL:** `http://localhost:8000` locally, or `VITE_API_BASE_URL` in deployed environments.
**Prefix:** `/api/integrations/zernio/`

---

## 2. Authentication

Use the existing frontend auth. `apiFetch` from `lib/api.ts` already attaches the JWT:

```ts
import { apiFetch } from "@/lib/api";

const res = await apiFetch("/api/integrations/zernio/profiles/");
const data = await res.json();
```

Use `apiFetch` for every endpoint below. Do **not** call Zernio directly and do **not** put the Zernio API key in the frontend.

If the frontend ever uses a server-side API key instead of a user JWT, that key needs:

- `integrations:read` — all `GET` requests
- `integrations:write` — all `POST`, `PUT`, `PATCH`, `DELETE` requests

### Organization permissions

Requests are scoped to the signed-in user's organization. Required permission per area:

| Area | Permission |
| --- | --- |
| Profiles, accounts, posts, OAuth apps, webhook events | `config.manage` |
| Conversations / inbox | `agent.use` |
| Analytics | `dashboard.read` |

A user without the permission gets `403` with `detail`.

---

## 3. Standard response conventions

### Pagination

List endpoints are paginated (default 15 per page). Both page-number and limit/offset styles work.

```json
{
  "count": 42,
  "next": "http://localhost:8000/api/...?page=2",
  "previous": null,
  "results": []
}
```

Query params: `?page=2`, or `?limit=25&offset=50`. Use `results` in both cases.

### Errors

Provider and validation errors share this shape:

```json
{
  "detail": "Human-readable message",
  "code": "provider_error_code",
  "status_code": 400,
  "details": {}
}
```

- `400` — validation error or Zernio rejected the request
- `401` — missing/expired JWT (handled by `apiFetch`)
- `403` — missing org permission
- `404` — resource not found or Zernio not connected
- `502` — Zernio is unreachable or returned a bad response

DRF field validation errors may return `{ "field_name": ["message"] }` instead.

---

## 4. Setup flow (connect the first account)

### Step 1 — Ensure the organization profile

```ts
await apiFetch("/api/integrations/zernio/profiles/ensure/", {
  method: "POST",
  body: JSON.stringify({}),
});
```

- Idempotent. Safe to call on page load.
- Returns `201` with the local profile.
- `POST /profiles/` behaves identically.

Key fields:

```json
{
  "id": 1,
  "organization": 7,
  "profile_id": "6afb5a8c17f637004bcc14cd",
  "name": "Acme",
  "external_id": "7",
  "is_default": false,
  "status": "active",
  "accounts_count": 0,
  "conversations_count": 0,
  "last_analytics_sync_at": null,
  "last_inbox_sync_at": null,
  "last_synced_at": null,
  "analytics_data": {}
}
```

`profile_id` is the remote Zernio id. `null` means the remote profile was deleted/disconnected.

### Step 2 — Get a connect URL and redirect

```ts
const res = await apiFetch(
  "/api/integrations/zernio/profiles/connect-url/?platform=instagram" +
    "&redirect_url=" + encodeURIComponent(`${window.location.origin}/settings/integrations`),
);
const { authUrl } = await res.json();
window.location.href = authUrl;
```

Query params:

| Param | Required | Notes |
| --- | --- | --- |
| `platform` | yes | Zernio platform slug, e.g. `instagram` |
| `redirect_url` | no | Where Zernio sends the user when done |
| `headless` | no | `true` to draw platform selection yourself |
| `welcome` | no | `true` for the branded pre-connect screen |
| `oauth_app_id` | no | White-label OAuth app id |
| `brand_name`, `logo_url`, `primary_color`, `welcome_theme` | no | Branding overrides |

Response:

```json
{ "authUrl": "https://www.instagram.com/oauth/authorize?...", "state": "..." }
```

### Step 3 — Sync the new account

When the user returns from Zernio:

```ts
await apiFetch("/api/integrations/zernio/accounts/sync/", { method: "POST" });
```

Or sync everything at once:

```ts
await apiFetch("/api/integrations/zernio/profiles/sync/", {
  method: "POST",
  body: JSON.stringify({ health: true, inbox: true, analytics: true }),
});
```

### Step 4 — Read accounts

```ts
const res = await apiFetch("/api/integrations/zernio/accounts/?active=true");
const { results } = await res.json();
```

Account shape:

```json
{
  "id": 3,
  "profile": 1,
  "profile_id": "6afb5a8c17f637004bcc14cd",
  "account_id": "6afb5b62d753c1192795e786",
  "platform": "instagram",
  "username": "acme",
  "display_name": "Acme",
  "avatar_url": "https://...",
  "is_active": true,
  "status": "connected",
  "can_post": true,
  "token_valid": true,
  "needs_reconnect": false,
  "issues": [],
  "health": {},
  "connected_at": "2026-11-19T15:00:00Z",
  "last_synced_at": "2026-11-19T15:15:00Z"
}
```

If `needs_reconnect` is `true`, show a reconnect CTA:

```ts
const res = await apiFetch(
  `/api/integrations/zernio/accounts/${account.id}/reconnect/`,
  {
    method: "POST",
    body: JSON.stringify({ redirect_url: `${window.location.origin}/settings/integrations` }),
  },
);
const { authUrl } = await res.json();
window.location.href = authUrl;
```

To disconnect: `DELETE /accounts/{id}/`.

> **Important for existing Zernio accounts:** a Zernio profile connected manually (e.g. named "Default") has `externalId: null`, so its events cannot be attributed to a CRM organization. Either set that profile's `externalId` to the organization UUID in Zernio, or connect accounts through the flow above so they belong to the profile created by `profiles/ensure/`.

---

## 5. Inbox / DMs

### Sync conversations

```ts
await apiFetch("/api/integrations/zernio/conversations/sync/", {
  method: "POST",
  body: JSON.stringify({ limit: 50 }), // optional: status: "active"
});
```

Returns `{ synced, results }`.

### List conversations

```ts
const res = await apiFetch(
  "/api/integrations/zernio/conversations/?unread=true&search=jane",
);
const { results, count } = await res.json();
```

Filters: `status`, `platform`, `account` (local account id), `unread=true|false`, `search` (name, username, last message text).

Conversation shape:

```json
{
  "id": 11,
  "profile": 1,
  "account": { "...": "nested ZernioAccount" },
  "conversation_id": "6aff123fc03e927f9bc82466",
  "platform": "instagram",
  "participant_id": "...",
  "participant_name": "Jane",
  "participant_username": "jane_doe",
  "participant_avatar": "https://...",
  "status": "active",
  "last_message_text": "Hi, is this still available?",
  "last_message_at": "2026-11-19T14:00:03Z",
  "unread_count": 1,
  "last_message": { "...": "nested ZernioMessage or null" }
}
```

### Read messages

```ts
const res = await apiFetch(
  `/api/integrations/zernio/conversations/${id}/messages/?limit=50`,
);
const { results } = await res.json();
```

`GET` returns paginated messages in chronological order. Message shape:

```json
{
  "id": 42,
  "conversation": 11,
  "message_id": "6aff16960413d9a678f8a578",
  "direction": "incoming",
  "text": "Hi, is this still available?",
  "sender": { "id": "...", "name": "Jane", "username": "jane_doe" },
  "attachments": [],
  "status": "delivered",
  "error_message": null,
  "idempotency_key": null,
  "sent_at": "2026-11-19T14:00:03Z"
}
```

`direction`: `incoming` | `outgoing`
`status`: `pending` | `sent` | `delivered` | `read` | `failed`

### Send a message

```ts
await apiFetch(
  `/api/integrations/zernio/conversations/${id}/messages/`,
  {
    method: "POST",
    body: JSON.stringify({
      message: "Yes, it is available.",
      idempotency_key: crypto.randomUUID(),
    }),
  },
);
```

Body:

| Field | Required | Notes |
| --- | --- | --- |
| `message` | yes | Text |
| `account_id` | no | Remote `account_id` or local numeric id. Defaults to the conversation's account |
| `idempotency_key` | no | Recommended; generate once per send and reuse on retry |
| `attachments` | no | Array of provider attachment objects |

Returns `201` with the stored message.

### Other conversation actions

| Action | Endpoint |
| --- | --- |
| Mark read | `POST /conversations/{id}/read/` |
| Typing indicator | `POST /conversations/{id}/typing/` |
| Backfill older messages | `POST /conversations/{id}/backfill/` with `{ "limit": 100 }` |

For live updates, poll `GET /conversations/?unread=true` and the messages endpoint, or re-run `conversations/sync/`. The backend webhook receiver keeps the mirror current.

---

## 6. Publishing

### Publish now

```ts
await apiFetch("/api/integrations/zernio/posts/publish/", {
  method: "POST",
  body: JSON.stringify({
    content: "Launch day!",
    account_ids: [3, 4], // local account ids; backend resolves platform + remote id
    publish_now: true,
  }),
});
```

### Schedule

```ts
await apiFetch("/api/integrations/zernio/posts/publish/", {
  method: "POST",
  body: JSON.stringify({
    content: "Tomorrow's post",
    account_ids: [3],
    publish_now: false,
    scheduled_for: "2026-11-20T09:00:00Z",
  }),
});
```

Body:

| Field | Required | Notes |
| --- | --- | --- |
| `content` | yes | Post text |
| `account_ids` | one of `account_ids` / `platforms` | Local numeric account ids; only active accounts are accepted |
| `platforms` | one of `account_ids` / `platforms` | Raw Zernio array: `[{ "platform": "instagram", "accountId": "..." }]` |
| `publish_now` | no | Defaults `true` |
| `scheduled_for` | required when `publish_now: false` | ISO 8601 datetime |
| `extra` | no | Extra provider fields merged into the request |

Returns `201` with a local post.

### List and sync posts

```ts
const res = await apiFetch("/api/integrations/zernio/posts/?status=published");
await apiFetch("/api/integrations/zernio/posts/sync/", {
  method: "POST",
  body: JSON.stringify({ window_days: 90 }),
});
```

Post shape:

```json
{
  "id": 8,
  "profile": 1,
  "post_id": "6afb...",
  "content": "Launch day!",
  "status": "published",
  "platforms": [{ "platform": "instagram", "status": "published" }],
  "platform_post_urls": ["https://www.instagram.com/p/..."],
  "analytics": { "likes": 12, "comments": 2, "impressions": 400 },
  "published_at": "2026-11-19T15:00:00Z",
  "scheduled_for": null
}
```

To import an existing external post: `POST /posts/sync-external/` with `{ "account_id": "...", "url": "https://..." }` (returns `202`).

---

## 7. Analytics

### Dashboard

```ts
const res = await apiFetch(
  "/api/integrations/zernio/analytics/?days=30",
);
const { data, last_synced_at } = await res.json();
```

- Uses cached `analytics_data` unless `refresh=true` or no cache exists.
- Params: `days`, `fromDate`, `toDate`, `compare` (default `previous_period`), `topPosts`, `recentPosts`, `platform`, `refresh`.
- `data` is the Zernio dashboard payload: `overview`, `posts`, `pagination`, etc.
- Returns `404` if the org has no Zernio profile yet.

### Daily metrics

```ts
await apiFetch("/api/integrations/zernio/analytics/daily/?fromDate=2026-11-01&toDate=2026-11-19");
```

Returns `{ data: [{ date, metrics, platform_breakdown, raw }], last_synced_at }`.

### Followers

```ts
await apiFetch("/api/integrations/zernio/analytics/followers/?granularity=daily");
```

### Incremental refresh

```ts
await apiFetch("/api/integrations/zernio/analytics/delta/", { method: "POST" });
```

---

## 8. White-label OAuth apps (optional)

Only needed if the platform connects accounts through the CRM's own OAuth apps.

| Action | Endpoint |
| --- | --- |
| List | `GET /oauth-apps/` |
| Create | `POST /oauth-apps/` |
| Update | `PATCH /oauth-apps/{id}/` |
| Delete | `DELETE /oauth-apps/{id}/?confirm=true` |
| Test | `POST /oauth-apps/{id}/test/` |

Create body:

```json
{
  "platform": "instagram",
  "label": "Acme Instagram",
  "client_id": "...",
  "client_secret": "...",
  "scope_areas": ["publishing", "analytics"],
  "meta_app_id": "...",
  "meta_app_secret": "...",
  "slack_signing_secret": "...",
  "webhook_url": "https://...",
  "shared_webhook_url": "https://..."
}
```

Secrets are write-only and never returned. Pass `oauth_app_id` to `connect-url` to use an app.

When using your own OAuth apps, the platform's redirect URI must exactly match the one Zernio shows for that app (see the Zernio white-label guide).

---

## 9. Webhook audit (support/debug screen)

Read-only, useful for admin/support views.

```ts
await apiFetch("/api/integrations/zernio/webhook-events/?status=failed");
```

Filters: `event`, `status` (`received`, `processed`, `ignored`, `failed`).

Fields: `event_id`, `event`, `organization`, `profile`, `account_id`, `payload`, `status`, `error`, `processed_at`.

The public webhook endpoint itself is backend-only:

```
POST /api/integrations/zernio/webhook/
Header: X-Zernio-Signature: <hex HMAC-SHA256 of raw body>
```

Handled events: `account.connected`, `account.disconnected`, `conversation.started`, `message.received`, `message.sent`, `message.delivered`, `message.read`, `message.failed`. Other events are stored and marked processed without mirror changes. Delivery is at-least-once; the backend deduplicates on the event `id`.

---

## 10. Endpoint cheat sheet

All paths below are relative to `/api/integrations/zernio/`.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `profiles/` | Org profile + counts |
| `POST` | `profiles/` or `profiles/ensure/` | Create/provision profile |
| `POST` | `profiles/sync/` | Sync accounts, health, inbox, analytics |
| `GET` | `profiles/{id}/health/` | Provider account health |
| `GET` | `profiles/connect-url/` | Get `authUrl` for a platform |
| `DELETE` | `profiles/{id}/` | Delete remote profile and unlink |
| `GET/PUT` | `profiles/welcome-screen/` | Branded connect screen |
| `GET` | `accounts/` | List accounts (`platform`, `active`, `needs_reconnect`) |
| `GET` | `accounts/{id}/` | Account detail |
| `POST` | `accounts/sync/` | Refresh accounts + health |
| `GET` | `accounts/health/` | Health for all accounts |
| `POST` | `accounts/{id}/reconnect/` | New `authUrl` for that account |
| `DELETE` | `accounts/{id}/` | Disconnect |
| `GET` | `conversations/` | Inbox list |
| `POST` | `conversations/sync/` | Refresh inbox |
| `GET` | `conversations/{id}/` | Conversation detail |
| `GET/POST` | `conversations/{id}/messages/` | Read / send messages |
| `POST` | `conversations/{id}/backfill/` | Fetch older messages |
| `POST` | `conversations/{id}/read/` | Mark read |
| `POST` | `conversations/{id}/typing/` | Typing indicator |
| `GET` | `posts/` | List posts (`status`) |
| `POST` | `posts/publish/` | Publish or schedule |
| `POST` | `posts/sync/` | Refresh posts |
| `POST` | `posts/sync-external/` | Import an existing post |
| `GET` | `analytics/` | Dashboard (cached unless `refresh=true`) |
| `GET` | `analytics/daily/` | Daily metric rows |
| `GET` | `analytics/followers/` | Follower stats |
| `POST` | `analytics/delta/` | Incremental analytics refresh |
| `GET/POST` | `oauth-apps/` | List / create white-label apps |
| `PATCH/DELETE` | `oauth-apps/{id}/` | Update / delete |
| `POST` | `oauth-apps/{id}/test/` | Validate credentials |
| `GET` | `webhook-events/` | Audit log |

---

## 11. Suggested UI mapping

| Screen | Data source |
| --- | --- |
| Integrations settings | `profiles/`, `accounts/`, `connect-url/` |
| Accounts list + health badges | `accounts/`, `accounts/health/` |
| Inbox list | `conversations/?unread=true` |
| Chat pane | `conversations/{id}/messages/` |
| Composer | `POST conversations/{id}/messages/`, `typing/` |
| Publishing composer | `accounts/` + `posts/publish/` |
| Posts history | `posts/` |
| Analytics dashboard | `analytics/`, `analytics/daily/` |
| Admin/support webhook log | `webhook-events/` |

---

## 12. Verification status (backend, Nov 19 2026)

Already verified:

- `GET /profiles` against the live Zernio API with the configured key returned `200`.
- Signed webhook delivery works locally and through ngrok: `200 {"ok": true}`.
- Replaying the same event id returns `200 {"ok": true, "duplicate": true}`.
- A real Zernio `message.sent` webhook was received and processed.
- Events are persisted in `ZernioWebhookEvent` with status `processed`.

Local webhook test (repeatable):

```bash
cd backend
.venv/bin/python /tmp/opencode/zernio_webhook_test.py
```

Or with curl, where `$SECRET` is `ZERNIO_WEBHOOK_SECRET` and `$BODY` is the compact JSON:

```bash
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $2}')
curl -X POST "https://secure-marmot-poorly.ngrok-free.app/api/integrations/zernio/webhook/" \
  -H "Content-Type: application/json" \
  -H "X-Zernio-Signature: $SIG" \
  -d "$BODY"
```

Expected: `{"ok": true}`.

Inspect received events:

```bash
cd backend
source .venv/bin/activate
export DJANGO_DEBUG=True
python manage.py shell -c "
from integrations.models import ZernioWebhookEvent
for e in ZernioWebhookEvent.objects.order_by('-created_at')[:5]:
    print(e.event_id, e.event, e.status, e.processed_at)
"
```

### Environment notes

- The ngrok URL is temporary. If it changes, update the webhook URL in Zernio.
- `ALLOWED_HOSTS` now includes `.ngrok-free.app` and related wildcards for testing.
- `.env` is authoritative in development (`read_env(..., overwrite=True)`), so edits apply after a dev-server reload.
- `ZERNIO_WEBHOOK_SECRET` is configured and verified.
- If an existing Zernio profile is reused, set its `externalId` to the organization UUID so events map to the tenant.

---

## 13. Quick copy-paste API client

```ts
import { apiFetch } from "@/lib/api";

const ZERNIO = "/api/integrations/zernio";

async function zernio<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(`${ZERNIO}${path}`, init);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || `Zernio request failed (${res.status})`);
  }
  return res.json();
}

export const zernioApi = {
  ensureProfile: () => zernio("/profiles/ensure/", { method: "POST" }),
  accounts: () => zernio<{ results: ZernioAccount[] }>("/accounts/?active=true"),
  connectUrl: (platform: string, redirectUrl?: string) => {
    const params = new URLSearchParams({ platform });
    if (redirectUrl) params.set("redirect_url", redirectUrl);
    return zernio<{ authUrl: string }>(`/profiles/connect-url/?${params}`);
  },
  conversations: (query = "") =>
    zernio<{ results: ZernioConversation[] }>(`/conversations/${query}`),
  messages: (id: number) =>
    zernio<{ results: ZernioMessage[] }>(`/conversations/${id}/messages/`),
  sendMessage: (id: number, message: string, idempotencyKey: string) =>
    zernio<ZernioMessage>(`/conversations/${id}/messages/`, {
      method: "POST",
      body: JSON.stringify({ message, idempotency_key: idempotencyKey }),
    }),
  publish: (body: {
    content: string;
    account_ids: number[];
    publish_now?: boolean;
    scheduled_for?: string;
  }) =>
    zernio<ZernioPost>("/posts/publish/", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};
```
