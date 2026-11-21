# Zernio → CRM People Sync — Frontend Handoff

This document covers the new **conversation → person** linking, the merged
person timeline, and the changes to the activity log and conversation widgets.

Backend base URL: `/api`. All endpoints use the existing `apiFetch` helper and
JWT auth from `lib/api.ts`.

---

## 1. What changed

### New models

| Model | Purpose |
| --- | --- |
| `PersonIdentity` | One row per platform handle. Links a `Person` to an Instagram/WhatsApp/email identity. |
| `ZernioConversation.person` | Direct FK from a conversation to the CRM person. |
| `ZernioConversation.identity` | FK to the matching `PersonIdentity`. |
| `ActivityLog.conversation` | Optional FK from an activity to the Zernio conversation. |

### New endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/integrations/zernio/conversations/import-people/` | Manually link conversations to people. Creates people when missing. |
| `GET` | `/api/people/{id}/timeline/` | Merged activity + message timeline for one person. |

### Edited endpoints

| Endpoint | Change |
| --- | --- |
| `GET /api/people/` and `GET /api/people/{id}/` | Adds `identities[]` to the person payload. |
| `GET /api/integrations/zernio/conversations/` | Adds `person`, `identity`, `person_name`; adds `?person=<uuid>` and `?linked=true\|false` filters. |
| `GET /api/integrations/zernio/conversations/{id}/` | Same new fields. |
| `GET /api/activities/` and `GET /api/people/{id}/context/` | Adds `conversation` to activity rows. |
| `POST /api/integrations/zernio/accounts/sync/` | Now also mirrors the inbox. Returns `conversations` and, on partial failure, `inbox_error`. Pass `{"inbox": false}` to sync accounts only. |
| `POST /api/integrations/zernio/profiles/sync/` | Already mirrored the inbox; now uses the same 100-row pages and write-skipping as the other sync paths. |

### Sync button behavior

The Settings **Sync** button calls `POST /api/integrations/zernio/accounts/sync/`.
It now:

1. Refreshes accounts and account health.
2. Paginates the full Zernio inbox (100 per page) and upserts conversations.
3. Returns:

```json
{
  "synced": 1,
  "results": [ ...accounts... ],
  "conversations": 780,
  "inbox_error": null
}
```

After a Sync, run the import to link any newly mirrored conversations. If the
webhook was down, this is the recovery path: **Sync → Import**. The hourly
Inngest job (`zernio_sync_all`) does the same sync automatically when it is
running.

A full inbox pass currently takes about 5–7 seconds for 780 conversations.
Unchanged rows are not rewritten.

---

## 2. Manual import button

The frontend needs one button: **Import conversations to people**.

### Request

```ts
POST /api/integrations/zernio/conversations/import-people/
Content-Type: application/json

{
  "create_missing": true,
  "update_existing": true,
  "dry_run": false,
  "limit": null,
  "conversation_ids": null
}
```

| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| `create_missing` | boolean | `true` | Create a new `Person` when no match exists. |
| `update_existing` | boolean | `true` | Refresh linked identities/people from the latest conversation data. |
| `dry_run` | boolean | `false` | Counts what would happen and rolls back. |
| `limit` | integer | `null` | Link at most N conversations. |
| `conversation_ids` | string[] | `null` | Link only these conversation UUIDs. |

### Response

```json
{
  "total": 739,
  "linked": 739,
  "already_linked": 0,
  "updated": 0,
  "created_people": 739,
  "skipped": 0,
  "errors": [],
  "dry_run": false,
  "finished_at": "2026-11-20T11:51:01.669858+00:00"
}
```

The endpoint is idempotent. Re-running skips conversations that already have a
person and returns them in `already_linked`. With `update_existing: true`, it
also repairs identities and person names that Zernio resolved after the first
import, and reports them in `updated`.

### Suggested UI

1. Button opens a confirmation dialog:
   - "This will link CRM people to every conversation that is not linked yet."
   - Show a "Preview" action that calls the endpoint with `dry_run: true`.
2. Show the preview counts: `total`, `linked`, `created_people`, `updated`.
3. Confirm calls the endpoint with `dry_run: false`.
4. Show a toast: "Linked 739 conversations, created 739 people, updated 4."
5. Refresh the people list and the inbox.

### TypeScript

```ts
type ImportPeopleResult = {
  total: number;
  linked: number;
  already_linked: number;
  updated: number;
  created_people: number;
  skipped: number;
  errors: { conversation_id: string; error: string }[];
  dry_run: boolean;
  finished_at: string;
};

export async function importConversationsToPeople(options?: {
  createMissing?: boolean;
  updateExisting?: boolean;
  dryRun?: boolean;
  limit?: number;
  conversationIds?: string[];
}) {
  const res = await apiFetch(
    "/api/integrations/zernio/conversations/import-people/",
    {
      method: "POST",
      body: JSON.stringify({
        create_missing: options?.createMissing ?? true,
        update_existing: options?.updateExisting ?? true,
        dry_run: options?.dryRun ?? false,
        limit: options?.limit ?? null,
        conversation_ids: options?.conversationIds ?? null,
      }),
    }
  );
  return (await res.json()) as ImportPeopleResult;
}
```

---

## 3. Person payload changes

`GET /api/people/{id}/` now includes `identities`:

```json
{
  "id": "89e10dcd-b750-4b51-b0ca-db3005e6e079",
  "name": "hala53545",
  "email": null,
  "phone": null,
  "avatar": null,
  "lead_source": "Instagram",
  "identities": [
    {
      "id": "3280a71a-a202-4b0f-a6fe-379d145077d8",
      "person": "89e10dcd-b750-4b51-b0ca-db3005e6e079",
      "platform": "instagram",
      "external_id": "1537427531563902",
      "username": "1537427531563902",
      "display_name": "hala53545",
      "avatar": null,
      "account": "c29ebb07-d3e8-4aea-a1ea-a1a58561ea08",
      "metadata": { "conversation_id": "1537427531563902" },
      "last_seen_at": "2026-11-20T14:34:17.753000+03:00",
      "created_at": "2026-11-20T14:51:01.663214+03:00",
      "updated_at": "2026-11-20T14:51:01.663224+03:00"
    }
  ]
}
```

Use `identities` to show platform badges or "Instagram: @handle" on the person
profile. The person list also returns identities because the queryset is
prefetched.

### Person ordering and `created_at`

`GET /api/people/` defaults to `-created_at` (newest first). When the import
creates a person, `created_at` is stamped with the conversation's
`last_message_at`, so the list reads as "who did I talk to most recently".
Existing people keep their original `created_at`; syncs and re-imports never
change it.

Do not label `Person.created_at` as "Added to CRM" for imported people — it
represents their last conversation time at import. `PersonIdentity.created_at`
is still the real record-creation timestamp.

---

## 4. Conversation widget

### List conversations for one person

```ts
GET /api/integrations/zernio/conversations/?person=<person-uuid>
```

Other filters still work: `?unread=true`, `?search=`, `?platform=instagram`,
`?account=<local-account-id>`, `?linked=false`.

A conversation row now includes:

```json
{
  "id": "1af0fcc9-1083-4061-9c1e-0b8930ff986b",
  "conversation_id": "1537427531563902",
  "person": "89e10dcd-b750-4b51-b0ca-db3005e6e079",
  "identity": "3280a71a-a202-4b0f-a6fe-379d145077d8",
  "person_name": "hala53545",
  "platform": "instagram",
  "participant_name": "hala53545",
  "last_message_text": "…",
  "last_message_at": "2026-11-20T11:34:17.753000+00:00",
  "unread_count": 1,
  "last_message": { "...": "nested ZernioMessage or null" }
}
```

### Load messages

```ts
GET /api/integrations/zernio/conversations/{conversationId}/messages/?limit=50
```

- Returns `{ count, next, previous, results }`.
- Messages are chronological (oldest first).
- By default the endpoint refreshes from Zernio first and stores the result.
  Add `?refresh=false` to read only the local mirror.
- Each message has `direction` (`incoming` / `outgoing`), `text`, `sent_at`,
  `attachments`, and `status`.

### Send a message

```ts
POST /api/integrations/zernio/conversations/{conversationId}/messages/
{
  "message": "Hello!",
  "idempotency_key": "optional-uuid"
}
```

---

## 5. Activity log widget

The existing activity widget keeps working. The only change is the new optional
`conversation` field on activity rows.

```json
{
  "id": "…",
  "type": "call",
  "channel": "system",
  "direction": "sent",
  "title": "Follow-up call",
  "content": "Discussed pricing.",
  "date": "2026-11-20T12:00:00Z",
  "conversation": null,
  "related_person": "89e10dcd-b750-4b51-b0ca-db3005e6e079"
}
```

- If `conversation` is set, the activity belongs to a chat thread. You can
  deep-link to the conversation widget with that UUID.
- Messages are **not** copied into `ActivityLog`. To show chat messages in the
  activity widget, use the merged timeline endpoint below.

### Merged timeline endpoint

```ts
GET /api/people/{personId}/timeline/?limit=50&offset=0
```

Optional filters:

| Query | Values | Notes |
| --- | --- | --- |
| `source` | `all`, `activities`, `messages` | Default `all`. |
| `conversation` | conversation UUID | Only items from that thread. |
| `limit` | 1–200 | Default `50`. |
| `offset` | integer | Default `0`. |

Response:

```json
{
  "count": 2,
  "offset": 0,
  "limit": 50,
  "next": null,
  "previous": null,
  "results": [
    {
      "kind": "message",
      "id": "65f699d7-50ac-4171-a078-e868c86016b7",
      "type": "msg",
      "channel": "instagram",
      "direction": "sent",
      "title": null,
      "content": "…",
      "date": "2026-11-20T11:34:17.753000+00:00",
      "conversation": "1af0fcc9-1083-4061-9c1e-0b8930ff986b",
      "conversation_id": "1537427531563902",
      "platform": "instagram",
      "message_id": "6b003039e8ca59d48d24f05f",
      "status": "sent",
      "attachments": []
    },
    {
      "kind": "activity",
      "id": "…",
      "type": "call",
      "channel": "system",
      "direction": "sent",
      "title": "Follow-up call",
      "content": "Discussed pricing.",
      "date": "2026-11-20T12:00:00+00:00",
      "conversation": null,
      "conversation_id": null,
      "platform": null,
      "message_id": null,
      "status": null,
      "attachments": []
    }
  ]
}
```

Both kinds share the same shape. Use `kind` to render a chat bubble
(`message`) or an activity card (`activity`). Sort order is newest first.

### TypeScript

```ts
type TimelineItem = {
  kind: "activity" | "message";
  id: string;
  type: string;
  channel: string | null;
  direction: "sent" | "received" | "system";
  title: string | null;
  content: string | null;
  date: string;
  conversation: string | null;
  conversation_id: string | null;
  platform: string | null;
  message_id: string | null;
  status: string | null;
  attachments: unknown[];
};

export async function getPersonTimeline(
  personId: string,
  params?: { source?: "all" | "activities" | "messages"; limit?: number; offset?: number }
) {
  const qs = new URLSearchParams();
  if (params?.source) qs.set("source", params.source);
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  const res = await apiFetch(`/api/people/${personId}/timeline/?${qs.toString()}`);
  return (await res.json()) as {
    count: number;
    offset: number;
    limit: number;
    next: number | null;
    previous: number | null;
    results: TimelineItem[];
  };
}
```

---

## 6. Suggested UI mapping

| Widget | Data source | Notes |
| --- | --- | --- |
| Person profile | `GET /api/people/{id}/` | Show `identities[]` as platform badges. |
| Conversation widget | `GET /api/integrations/zernio/conversations/?person={id}` | List threads. |
| Chat pane | `GET /api/integrations/zernio/conversations/{id}/messages/` | Load on open. |
| Activity log widget | `GET /api/people/{id}/timeline/` | Merged activities + messages. |
| Manual import | `POST /api/integrations/zernio/conversations/import-people/` | One button. |
| Inbox (org-wide) | `GET /api/integrations/zernio/conversations/` | Existing screen. |

---

## 7. Permissions

| Endpoint | Required permission |
| --- | --- |
| `import-people` | `people.write` |
| `person timeline` | `people.read` |
| conversation list/messages | `agent.use` |
| activities list | `activities.read` |

API keys need the matching scopes (`people:read`, `people:write`,
`integrations:read`, `integrations:write`).

---

## 8. Verification

```bash
# Dry run: counts only, no writes
curl -X POST http://localhost:8000/api/integrations/zernio/conversations/import-people/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"dry_run": true}'

# Real import
curl -X POST http://localhost:8000/api/integrations/zernio/conversations/import-people/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"create_missing": true, "update_existing": true}'

# Merge messages stored under both the Zernio internal id and platform id
python manage.py zernio_dedupe_messages --dry-run
python manage.py zernio_dedupe_messages
```

---

## 9. Answers to the frontend questions

**1. Does `POST /conversations/{id}/messages/` update `last_message_text`,
`last_message_at`, and `unread_count` synchronously?**

`last_message_text` and `last_message_at` are updated synchronously when the
provider accepts the send. `unread_count` is not changed for an outgoing
message. The response returns the new message, not the conversation, so an
optimistic update is fine; refresh the conversation list when the view regains
focus or after the `message.sent` webhook lands.

**2. Is it intentional that `people.read` alone exposes conversation content?**

No. This was a gap and is fixed. `GET /api/people/{id}/timeline/` now requires
`people.read`, but message items additionally require `agent.use`:

- `source=all` without `agent.use`: returns activities only.
- `source=messages` without `agent.use`: returns `403` with
  `code: "messages_permission_denied"`.
- `source=activities`: always allowed with `people.read`.

Conversation list and message endpoints continue to require `agent.use`.

**3. How do we get the number of unlinked conversations efficiently?**

Use the list endpoint and read `count`:

```ts
GET /api/integrations/zernio/conversations/?linked=false&limit=1
```

The `count` is computed on the filtered queryset, so `limit=1` keeps the payload
small. `?linked=true` returns the linked count.

**4. What happens to `GET messages` when the account needs reconnect or the
token is invalid?**

The endpoint attempts to refresh from Zernio, catches provider errors, and
still returns the local mirror. It logs a warning. To skip the provider call
entirely use `?refresh=false`. Sending a message will still fail with the
provider's error until the account is reconnected. The account payload exposes
`needs_reconnect`, `token_valid`, and `status` so the UI can prompt a reconnect.

---

## 10. Email to the frontend team

> **Subject: Zernio → CRM people sync is ready**
>
> Hi team,
>
> The backend now links Zernio conversations to CRM people, and we fixed the
> message duplication and name-sync issues. Here is what you need to build.
>
> **1. The Sync button now mirrors the inbox**
>
> `POST /api/integrations/zernio/accounts/sync/` now returns
> `{ synced, results, conversations, inbox_error }`. After a webhook outage the
> recovery path is **Sync → Import**: Sync pulls the conversations Zernio
> accumulated while the webhook was down, then Import links them to people.
> A full pass over ~780 conversations takes about 5–7 seconds. Show
> `conversations` in the success toast and `inbox_error` as a warning.
>
> **2. Manual import button**
>
> Endpoint: `POST /api/integrations/zernio/conversations/import-people/`
>
> Body: `{ "create_missing": true, "update_existing": true, "dry_run": false }`
>
> It links every unlinked conversation to a person and creates people when
> missing. It is idempotent. `update_existing: true` also repairs names that
> Zernio resolved after the first import. Call it once with `dry_run: true` to
> preview counts, then again with `dry_run: false` to apply. Show `total`,
> `linked`, `created_people`, and `updated` in a toast.
>
> **3. Person payload**
>
> `GET /api/people/{id}/` now returns `identities[]` — the Instagram/WhatsApp
> handles linked to that person. Use them for platform badges.
>
> **4. Conversation widget**
>
> List a person's threads with
> `GET /api/integrations/zernio/conversations/?person={personId}`.
> Load messages with
> `GET /api/integrations/zernio/conversations/{conversationId}/messages/`.
> Messages are chronological and refresh from Zernio by default. Add
> `?refresh=false` to read the local mirror only (useful when the account needs
> reconnect).
>
> **5. Activity log widget**
>
> The existing `/api/activities/` endpoint is unchanged. Activity rows now have
> an optional `conversation` field. For a merged timeline of activities and
> chat messages, use `GET /api/people/{id}/timeline/`. Both item kinds share
> the same shape; use `kind` to choose the renderer.
>
> Message items in the timeline require `agent.use` in addition to
> `people.read`. Without `agent.use`, `source=all` returns activities only and
> `source=messages` returns `403` with `code: "messages_permission_denied"`.
>
> **6. Unlinked count**
>
> `GET /api/integrations/zernio/conversations/?linked=false&limit=1` returns the
> number of unlinked conversations in `count`. Use `linked=true` for the linked
> count.
>
> **7. Sending messages**
>
> `POST /conversations/{id}/messages/` returns provider errors with a structured
> body. A `403` with `code: "platform_api_error"` is usually a Meta restriction,
> such as the 24-hour reply window. Show `detail` to the user; do not treat it as
> an expired session. The body also includes `platform` and `platformError`.
>
> **8. No duplication**
>
> Messages are not copied into `ActivityLog`. The timeline endpoint reads them
> from the linked conversations. The activity log stays for calls, meetings,
> and manual notes. Duplicate chat messages created by the old webhook/API id
> mismatch were merged; new messages are deduplicated on the platform message
> id.
>
> **9. People list order**
>
> `GET /api/people/` defaults to `-created_at`. When the import creates a
> person, `created_at` is set to the conversation's last message time, so the
> list is "most recent conversation first". Do not display `created_at` as
> "Added to CRM" for imported people.
>
> Full request/response shapes and TypeScript examples are in
> `backend/integrations/zernio/FRONTEND_PEOPLE_SYNC.md`.
>
> The auto-import-on-webhook flow is not part of this change. For now the
> import is manual, from the button.
>
> Thanks!
