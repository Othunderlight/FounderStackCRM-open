# Notion-to-CRM Field Mapping

Complete reference mapping between Notion database properties and FounderStack CRM API fields.

## Overview

When syncing between Notion and FounderStack CRM, use this guide to map fields correctly. The mapping is bidirectional - you can push data from CRM to Notion or pull from Notion to CRM.

**Key Concepts:**
- **Notion Property**: The column name in your Notion database
- **CRM Field**: The field name in the FounderStack API
- **Sync Direction**: Which way the data typically flows
- **Transform**: Any conversion needed between formats

---

## Important: Select Fields Handling

**⚠️ Multi-Select vs Single-Select:**

Notion supports multi-select fields, but FounderStack CRM uses single-select for workflow fields (like stage, status, type). Here's how we handle the sync:

### CRM → Notion (Push)
When syncing from CRM to Notion, we set the select field to contain **only one value** (the CRM value), overwriting any existing multiple selections.

### Notion → CRM (Pull)
When syncing from Notion to CRM, we take the **first selected value** only and ignore any additional selections.

**Example:**
```
Notion Stage field: ["Qualified", "Negotiation", "Custom Stage"]
↓ Sync to CRM
CRM stage field: "Qualified" (first value only)

CRM stage field: "Closed"
↓ Sync to Notion  
Notion Stage field: ["Closed"] (single value, overwrites all)
```

### Recommendation
Configure your Notion select fields as **Single-select** (not Multi-select) for these fields:
- Stage (People, Opportunities)
- Lead Type (People)
- Status (Tasks)
- Type, Channel, Direction (Activities)

This avoids confusion and data loss during sync.

---

## Companies Database

### Field Mapping

| Notion Property | Notion Type | CRM Field | API Endpoint | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Name** | Title | `name` | `POST /api/companies/` | Company name (required) |
| **Domain** | URL | `domain` | `POST /api/companies/` | Website URL |
| **Employees** | Number | `employees` | `POST /api/companies/` | Store as string in CRM |
| **Location** | Text | `location` | `POST /api/companies/` | Office location |
| **LinkedIn** | URL | `linkedin` | `POST /api/companies/` | LinkedIn company page |
| **ARR** | Text | `arr` | `POST /api/companies/` | Annual Recurring Revenue |
| **ICP** | Checkbox | `icp` | `POST /api/companies/` | Boolean: true/false |
| **Owner** | People | `owner` | `POST /api/companies/` | User relation (UUID) |
| **FounderStack ID** | Text | `id` | Response only | CRM UUID (read-only) |
| **Created At** | Created Time | `created_at` | Response only | ISO 8601 timestamp |
| **Updated At** | Last Edited Time | `updated_at` | Response only | ISO 8601 timestamp |

### Relations

| Notion Relation | CRM Related Name | How to Query |
| :--- | :--- | :--- |
| People | `people` | `GET /api/people/?company={company_id}` |
| Opportunities | `opportunities` | `GET /api/opportunities/?company={company_id}` |
| Tasks | `tasks` | `GET /api/tasks/?related_company={company_id}` |
| Notes | `notes` | `GET /api/notes/?related_company={company_id}` |
| Activities | `activities` | `GET /api/activities/?related_company={company_id}` |

### Example: Create Company

```bash
# CRM → Notion
curl -s -X POST "https://your-api.example.com/api/companies/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Acme Corp",
       "domain": "https://acme.com",
       "employees": "500-1000",
       "location": "New York, NY",
       "linkedin": "https://linkedin.com/company/acme",
       "arr": "$10M-$50M",
       "icp": true
     }' | jq .
```

---

## People Database

### Field Mapping

| Notion Property | Notion Type | CRM Field | API Endpoint | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Name** | Title | `name` | `POST /api/people/` | Full name (required) |
| **Email** | Email | `email` | `POST /api/people/` | Contact email |
| **Phone** | Phone | `phone` | `POST /api/people/` | Phone number |
| **Job Title** | Text | `job_title` | `POST /api/people/` | Position |
| **Avatar** | Files & Media | `avatar` | `POST /api/people/` | Image URL |
| **City** | Text | `city` | `POST /api/people/` | Location |
| **LinkedIn** | URL | `linkedin` | `POST /api/people/` | Profile URL |
| **Conversion Rate** | Number (%) | `conversion_rate` | `POST /api/people/` | Integer 0-100 |
| **Stage** | Select | `stage` | `POST /api/people/` | Single-select only. First value used if multi-select. |
| **Lead Type** | Select | `lead_type` | `POST /api/people/` | Single-select only. First value used if multi-select. |
| **Lead Source** | Select | `lead_source` | `POST /api/people/` | `Inbound` or `Outbound`. Single-select only. |
| **Last Action** | Text | `last_action` | `POST /api/people/` | Recent activity summary |
| **Recommended Action** | Text | `recommended_action` | `POST /api/people/` | Suggested next step |
| **Company** | Relation | `company` | `POST /api/people/` | Company UUID |
| **FounderStack ID** | Text | `id` | Response only | CRM UUID |
| **Created By** | Created By | `created_by` | Response only | User who created |
| **Created At** | Created Time | `created_at` | Response only | ISO timestamp |

### Select Options Mapping

**Stage Values (People):**
| Notion Option | CRM Value |
| :--- | :--- |
| Lead | `"Lead"` |
| Qualified | `"Qualified"` |
| Negotiation | `"Negotiation"` |
| Closed | `"Closed"` |
| Lost | `"Lost"` |

**Lead Type Values:**
| Notion Option | CRM Value |
| :--- | :--- |
| Prospect | `"Prospect"` |
| Cold Lead | `"Cold Lead"` |
| Warm Lead | `"Warm Lead"` |
| Hot Lead | `"Hot Lead"` |
| Client | `"Client"` |

**Lead Source Values:**
| Notion Option | CRM Value |
| :--- | :--- |
| Inbound | `"Inbound"` |
| Outbound | `"Outbound"` |

### Example: Create Person

```bash
curl -s -X POST "https://your-api.example.com/api/people/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Jane Smith",
       "email": "jane@example.com",
       "phone": "+1-555-0123",
       "job_title": "VP of Sales",
       "city": "San Francisco",
       "linkedin": "https://linkedin.com/in/janesmith",
       "conversion_rate": 75,
       "stage": "Qualified",
       "lead_type": "Hot Lead",
       "lead_source": "Inbound",
       "company": "550e8400-e29b-41d4-a716-446655440000"
     }' | jq .
```

---

## Opportunities Database

### Field Mapping

| Notion Property | Notion Type | CRM Field | API Endpoint | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Name** | Title | `name` | `POST /api/opportunities/` | Deal name (required) |
| **Value** | Number ($) | `value` | `POST /api/opportunities/` | Decimal amount |
| **Deal Stage** | Select | `deal_stage` | `POST /api/opportunities/` | Single-select only. First value used if multi-select. |
| **Expected Close Date** | Date | `expected_close_date` | `POST /api/opportunities/` | `YYYY-MM-DD` format |
| **Probability** | Number | `probability` | `POST /api/opportunities/` | Integer 0-100 |
| **Company** | Relation | `company` | `POST /api/opportunities/` | Company UUID |
| **Primary Contact** | Relation | `primary_contact` | `POST /api/opportunities/` | Person UUID |
| **Owner** | People | `owner` | `POST /api/opportunities/` | User UUID |
| **FounderStack ID** | Text | `id` | Response only | CRM UUID |
| **Created By** | Created By | `created_by` | Response only | User who created |
| **Created At** | Created Time | `created_at` | Response only | ISO timestamp |

### Stage Values

| Notion Option | CRM Value | Usage |
| :--- | :--- | :--- |
| Screening | `"Screening"` | Initial qualification |
| Qualified | `"Qualified"` | Sales qualified |
| Proposal | `"Proposal"` | Commercial proposal sent |
| Negotiation | `"Negotiation"` | Active deal |
| Won | `"Won"` | Won deal |
| Lost | `"Lost"` | Lost deal |

### Example: Create Opportunity

```bash
curl -s -X POST "https://your-api.example.com/api/opportunities/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Enterprise License Deal",
       "value": "50000.00",
       "deal_stage": "Negotiation",
       "expected_close_date": "2026-05-30",
       "probability": 80,
       "company": "550e8400-e29b-41d4-a716-446655440000",
       "primary_contact": "660e8400-e29b-41d4-a716-446655440001"
     }' | jq .
```

---

## Tasks Database

### Field Mapping

| Notion Property | Notion Type | CRM Field | API Endpoint | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Title** | Title | `title` | `POST /api/tasks/` | Task name (required) |
| **Description** | Text | `description` | `POST /api/tasks/` | Detailed info |
| **Status** | Select | `status` | `POST /api/tasks/` | Single-select only. First value used if multi-select. |
| **Due Date** | Date | `due_date` | `POST /api/tasks/` | ISO 8601 format |
| **Assignee** | People | `assignee` | `POST /api/tasks/` | User UUID |
| **Created By** | Created By | `created_by` | Response only | User who created |
| **Related Person** | Relation | `related_person` | `POST /api/tasks/` | Person UUID |
| **Related Company** | Relation | `related_company` | `POST /api/tasks/` | Company UUID |
| **FounderStack ID** | Text | `id` | Response only | CRM UUID |
| **Created At** | Created Time | `created_at` | Response only | ISO timestamp |

### Status Values

| Notion Option | CRM Value |
| :--- | :--- |
| Todo | `"Todo"` |
| In Progress | `"In Progress"` |
| Done | `"Done"` |

### Example: Create Task

```bash
curl -s -X POST "https://your-api.example.com/api/tasks/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "title": "Follow up on proposal",
       "description": "Send pricing details and schedule demo",
       "status": "Todo",
       "due_date": "2024-02-15T17:00:00Z",
       "assignee": "770e8400-e29b-41d4-a716-446655440002",
       "related_person": "660e8400-e29b-41d4-a716-446655440001",
       "related_company": "550e8400-e29b-41d4-a716-446655440000"
     }' | jq .
```

---

## Notes Database

### Field Mapping

| Notion Property | Notion Type | CRM Field | API Endpoint | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Title** | Title | `title` | `POST /api/notes/` | Note title |
| **Content** | Text | `content` | `POST /api/notes/` | Full note body |
| **Related Person** | Relation | `related_person` | `POST /api/notes/` | Person UUID |
| **Related Company** | Relation | `related_company` | `POST /api/notes/` | Company UUID |
| **Created By** | Created By | `created_by` | Response only | User who created |
| **FounderStack ID** | Text | `id` | Response only | CRM UUID |
| **Created At** | Created Time | `created_at` | Response only | ISO timestamp |

### Example: Create Note

```bash
curl -s -X POST "https://your-api.example.com/api/notes/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "title": "Discovery Call Notes",
       "content": "Key points discussed:\n- Current workflow issues\n- Budget: $50k\n- Timeline: Q2 2024",
       "related_person": "660e8400-e29b-41d4-a716-446655440001",
       "related_company": "550e8400-e29b-41d4-a716-446655440000"
     }' | jq .
```

---

## Activity Log Database

### Field Mapping

| Notion Property | Notion Type | CRM Field | API Endpoint | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Title** | Title | `title` | `POST /api/activities/` | Activity title |
| **Type** | Select | `type` | `POST /api/activities/` | Single-select only. First value used if multi-select. |
| **Channel** | Select | `channel` | `POST /api/activities/` | Single-select only. First value used if multi-select. |
| **Direction** | Select | `direction` | `POST /api/activities/` | Single-select only. First value used if multi-select. |
| **Content** | Text | `content` | `POST /api/activities/` | Activity details (required) |
| **Date** | Date | `date` | `POST /api/activities/` | When it occurred |
| **Related Person** | Relation | `related_person` | `POST /api/activities/` | Person UUID |
| **Related Company** | Relation | `related_company` | `POST /api/activities/` | Company UUID |
| **User** | People | `user` | Response only | Who performed it |
| **FounderStack ID** | Text | `id` | Response only | CRM UUID |
| **Created At** | Created Time | `created_at` | Response only | ISO timestamp |

### Activity Type Values

| Notion Option | CRM Value | Description |
| :--- | :--- | :--- |
| Email | `"email"` | Email sent/received |
| Call | `"call"` | Phone call |
| Meeting | `"meeting"` | In-person or virtual meeting |
| Update | `"update"` | Record update |
| Message | `"msg"` | LinkedIn/WhatsApp/etc message |

### Channel Values

| Notion Option | CRM Value |
| :--- | :--- |
| Email | `"email"` |
| LinkedIn | `"linkedin"` |
| WhatsApp | `"whatsapp"` |
| System | `"system"` |

### Direction Values

| Notion Option | CRM Value |
| :--- | :--- |
| Sent | `"sent"` |
| Received | `"received"` |
| System | `"system"` |

### Example: Log Activity

```bash
# Log a call that happened
curl -s -X POST "https://your-api.example.com/api/activities/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "title": "Discovery Call",
       "type": "call",
       "channel": "email",
       "direction": "sent",
       "content": "Discussed product features and pricing. Client interested in enterprise plan.",
       "date": "2024-02-10T14:30:00Z",
       "related_person": "660e8400-e29b-41d4-a716-446655440001",
       "related_company": "550e8400-e29b-41d4-a716-446655440000"
     }' | jq .
```

---

## Sync Tracking

Sync state is tracked separately using the **SyncRecord** and **SyncLog** APIs. See `13-notion-sync-api.md` for details on:

- Creating/updating sync records
- Tracking sync status (pending, syncing, synced, error)
- Viewing sync logs and audit trail
- Managing two-way sync

**Key Point:** The sync fields (`sync_id`, `sync_status`, `last_synced`) are NOT stored on the main entities (Company, Person, etc.). They are stored in the separate `SyncRecord` model, which enables:
- Multiple external system syncs (Notion, HubSpot, etc.)
- Better audit trail
- Easier conflict resolution
- Cleaner entity models

---

## Common Transformations

### Date/Time Formats

| Notion | CRM API | Example |
| :--- | :--- | :--- |
| Created Time | ISO 8601 | `2024-02-10T14:30:00Z` |
| Date | ISO 8601 | `2024-02-10T00:00:00Z` or `2024-02-10` |
| Last Edited Time | ISO 8601 | `2024-02-10T15:45:30Z` |

### Number Formats

| Notion | CRM API | Example |
| :--- | :--- | :--- |
| Number ($) | Decimal string | `"50000.00"` |
| Number (%) | Integer | `75` (for 75%) |
| Number | String or Integer | `"500-1000"` or `500` |

### Relation Handling

When syncing relations between Notion and CRM:

```python
# Notion → CRM: Extract UUID from relation
crm_company_id = notion_company_relation["id"]

# CRM → Notion: Create relation property
notion_relation = {
    "relation": [{"id": notion_page_id}]
}
```

---

## Validation Rules

### Required Fields

| Entity | Required Fields |
| :--- | :--- |
| Companies | `name` |
| People | `name` |
| Opportunities | `name` |
| Tasks | `title` |
| Notes | None (title defaults to "Untitled Note") |
| Activities | `content` |

### Field Constraints

| Field | Constraint |
| :--- | :--- |
| `conversion_rate` | Integer 0-100 |
| `stage` | Must be valid pipeline stage |
| `deal_stage` | Must be valid opportunity stage |
| `lead_type` | Must be valid lead type |
| `lead_source` | `"Inbound"` or `"Outbound"` |
| `status` | `"Todo"`, `"In Progress"`, or `"Done"` |
| `type` | Must be valid activity type |
| `channel` | `"email"`, `"linkedin"`, `"whatsapp"`, `"system"` |
| `direction` | `"sent"`, `"received"`, `"system"` |

---

## Quick Reference: API Endpoints

### Companies
- `GET /api/companies/` - List/search
- `POST /api/companies/` - Create
- `GET /api/companies/{id}/` - Retrieve
- `PATCH /api/companies/{id}/` - Update

### People
- `GET /api/people/` - List/search
- `POST /api/people/` - Create
- `GET /api/people/{id}/` - Retrieve
- `GET /api/people/{id}/context/` - Get related data
- `PATCH /api/people/{id}/` - Update

### Opportunities
- `GET /api/opportunities/` - List/search
- `POST /api/opportunities/` - Create
- `GET /api/opportunities/{id}/` - Retrieve
- `PATCH /api/opportunities/{id}/` - Update

### Tasks
- `GET /api/tasks/` - List/search
- `POST /api/tasks/` - Create
- `GET /api/tasks/{id}/` - Retrieve
- `PATCH /api/tasks/{id}/` - Update

### Notes
- `GET /api/notes/` - List/search
- `POST /api/notes/` - Create
- `GET /api/notes/{id}/` - Retrieve
- `PATCH /api/notes/{id}/` - Update

### Activities
- `GET /api/activities/` - List/search
- `POST /api/activities/` - Create
- `GET /api/activities/{id}/` - Retrieve
- `PATCH /api/activities/{id}/` - Update

### Sync Records
- `GET /api/sync-records/` - List sync records
- `POST /api/sync-records/` - Create sync record
- `GET /api/sync-records/{id}/` - Retrieve sync record
- `PATCH /api/sync-records/{id}/` - Update sync record

### Sync Logs
- `GET /api/sync-logs/` - List sync logs (audit trail)
- `POST /api/sync-logs/` - Create sync log entry

---

## Best Practices

1. **Store Notion Page ID in SyncRecord** - After creating in Notion, create/update a SyncRecord with the `external_id`
2. **Use SyncLog for audit trail** - Log every sync attempt with status, errors, and data snapshots
3. **Handle date formats** carefully - Notion uses ISO 8601
4. **Validate select options** before syncing - invalid values will cause errors
5. **Check SyncRecord status** before bulk operations to avoid duplicates
6. **Query by `last_synced`** to find records needing sync or recently updated

---

## Troubleshooting

### Common Issues

**Issue:** "Invalid stage value" error  
**Fix:** Ensure `deal_stage` matches one of your configured `opportunity_stages`

**Issue:** Relations not syncing  
**Fix:** Verify UUID format and that related records exist in both systems

**Issue:** Dates showing wrong in Notion  
**Fix:** Ensure ISO 8601 format with timezone (e.g., `2024-02-10T14:30:00Z`)

**Issue:** Can't find sync record  
**Fix:** Query `/api/sync-records/?entity_type=company&entity_id=xxx&external_system=notion`

**Issue:** Sync conflicts  
**Fix:** Check `sync_version` and `last_synced` to determine which system has latest data
