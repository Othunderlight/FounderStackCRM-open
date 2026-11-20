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

---

## 2. Manual import button

The frontend needs one button: **Import conversations to people**.

### Request

```ts
POST /api/integrations/zernio/conversations/import-people/
Content-Type: application/json

{
  "create_missing": true,
  "dry_run": false,
  "limit": null,
  "conversation_ids": null
}
```

| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| `create_missing` | boolean | `true` | Create a new `Person` when no match exists. |
| `dry_run` | boolean | `false` | Counts what would happen and rolls back. |
| `limit` | integer | `null` | Link at most N conversations. |
| `conversation_ids` | string[] | `null` | Link only these conversation UUIDs. |

### Response

```json
{
  "total": 739,
  "linked": 739,
  "already_linked": 0,
  "created_people": 739,
  "skipped": 0,
  "errors": [],
  "dry_run": false,
  "finished_at": "2026-11-20T11:51:01.669858+00:00"
}
```

The endpoint is idempotent. Re-running skips conversations that already have a
person and returns them in `already_linked`.

### Suggested UI

1. Button opens a confirmation dialog:
   - "This will create a CRM person for every Instagram conversation that is not linked yet."
   - Show a "Preview" action that calls the endpoint with `dry_run: true`.
2. Show the preview counts: `total`, `linked`, `created_people`.
3. Confirm calls the endpoint with `dry_run: false`.
4. Show a toast: "Linked 739 conversations, created 739 people."
5. Refresh the people list and the inbox.

### TypeScript

```ts
type ImportPeopleResult = {
  total: number;
  linked: number;
  already_linked: number;
  created_people: number;
  skipped: number;
  errors: { conversation_id: string; error: string }[];
  dry_run: boolean;
  finished_at: string;
};

export async function importConversationsToPeople(options?: {
  createMissing?: boolean;
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
  -d '{"create_missing": true}'
```

---

## 9. Email to the frontend team

> **Subject: Zernio → CRM people sync is ready**
>
> Hi team,
>
> The backend now links Zernio conversations to CRM people. Here is what you
> need to build.
>
> **1. New manual import button**
>
> Endpoint: `POST /api/integrations/zernio/conversations/import-people/`
>
> Body: `{ "create_missing": true, "dry_run": false }`
>
> It links every unlinked conversation to a person and creates people when
> missing. It is idempotent. Call it once with `dry_run: true` to preview
> counts, then again with `dry_run: false` to apply. Show the returned
> `total`, `linked`, and `created_people` in a toast.
>
> **2. Person payload**
>
> `GET /api/people/{id}/` now returns `identities[]` — the Instagram/WhatsApp
> handles linked to that person. Use them for platform badges.
>
> **3. Conversation widget**
>
> List a person's threads with
> `GET /api/integrations/zernio/conversations/?person={personId}`.
> Load messages with
> `GET /api/integrations/zernio/conversations/{conversationId}/messages/`.
> Messages are chronological and refresh from Zernio by default.
>
> **4. Activity log widget**
>
> The existing `/api/activities/` endpoint is unchanged. Activity rows now have
> an optional `conversation` field. For a merged timeline of activities and
> chat messages, use `GET /api/people/{id}/timeline/`. Both item kinds share
> the same shape; use `kind` to choose the renderer.
>
> **5. No duplication**
>
> Messages are not copied into `ActivityLog`. The timeline endpoint reads them
> from the linked conversations. The activity log stays for calls, meetings,
> and manual notes.
>
> Full request/response shapes and TypeScript examples are in
> `backend/integrations/zernio/FRONTEND_PEOPLE_SYNC.md`.
>
> The auto-import-on-webhook flow is not part of this change. For now the
> import is manual, from the button.
>
> Thanks!
