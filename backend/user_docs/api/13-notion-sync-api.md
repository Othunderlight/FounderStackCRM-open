# Sync API

Manage synchronization between FounderStack CRM and external systems (Notion, HubSpot, etc.) using Sync Records and Sync Logs.

## Overview

The sync system uses two models:
- **SyncRecord** - Tracks current sync state for each entity
- **SyncLog** - Audit trail of all sync attempts

This design allows:
- ✅ Sync to multiple external systems (Notion, HubSpot, Salesforce, etc.)
- ✅ Better audit trail and debugging
- ✅ Conflict resolution using `last_synced` timestamps
- ✅ Clean separation between entity data and sync metadata

## SyncRecord Model

Stores the current sync state for each entity-external_system pair.

### Fields

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Unique sync record ID |
| `entity_type` | String | Type: `company`, `person`, `opportunity`, `task`, `note`, `activity` |
| `entity_id` | UUID | The CRM entity UUID |
| `external_id` | String | External system ID (e.g., Notion page ID) |
| `external_system` | String | System name: `notion`, `hubspot`, etc. |
| `sync_status` | String | `pending`, `syncing`, `synced`, `error` |
| `last_synced` | DateTime | Last successful sync timestamp |
| `last_sync_direction` | String | `crm_to_external` or `external_to_crm` |
| `last_sync_error` | Text | Error message from last failed sync |
| `sync_version` | Integer | Incremented on each sync for conflict detection |
| `created_at` | DateTime | When sync record was created |
| `updated_at` | DateTime | When sync record was last updated |

### Sync Status Values

| Status | Description |
| :--- | :--- |
| `pending` | Entity is queued for sync |
| `syncing` | Sync is currently in progress |
| `synced` | Successfully synced |
| `error` | Last sync attempt failed |

---

## SyncLog Model

Audit trail of all sync operations. Every sync attempt creates a log entry.

### Fields

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Unique log entry ID |
| `sync_record` | UUID | Reference to SyncRecord (can be null) |
| `entity_type` | String | Entity type being synced |
| `entity_id` | UUID | Entity UUID |
| `external_system` | String | Target system |
| `external_id` | String | External system ID |
| `direction` | String | `crm_to_external` or `external_to_crm` |
| `status` | String | `success`, `failed`, `skipped`, `conflict` |
| `data_hash` | String | SHA256 hash of data for change detection |
| `crm_data_snapshot` | JSON | CRM data at time of sync |
| `external_data_snapshot` | JSON | External data at time of sync |
| `error_message` | Text | Error description |
| `error_details` | JSON | Detailed error info |
| `started_at` | DateTime | When sync started |
| `completed_at` | DateTime | When sync completed |
| `triggered_by` | UUID | User who triggered (null = automated) |
| `source` | String | `api`, `webhook`, `cron`, `manual` |

---

## API Endpoints

### Sync Records

#### List Sync Records

```bash
GET /api/sync-records/
```

**Query Parameters:**

| Parameter | Description | Example |
| :--- | :--- | :--- |
| `entity_type` | Filter by entity type | `?entity_type=company` |
| `entity_id` | Filter by entity UUID | `?entity_id=550e8400-e29b-41d4-a716-446655440000` |
| `external_system` | Filter by system | `?external_system=notion` |
| `sync_status` | Filter by status | `?sync_status=pending` |
| `external_id` | Find by external ID | `?external_id=abc-123` |
| `last_synced__gt` | Synced after date | `?last_synced__gt=2024-01-01T00:00:00Z` |
| `ordering` | Sort order | `?ordering=-last_synced` (most recent first) |

**Example:**

```bash
# Get all unsynced companies for Notion
curl -s -G "https://your-api.example.com/api/sync-records/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     --data-urlencode "entity_type=company" \
     --data-urlencode "external_system=notion" \
     --data-urlencode "sync_status=pending" | jq .
```

**Response:**

```json
{
  "count": 25,
  "next": "https://your-api.example.com/api/sync-records/?page=2",
  "previous": null,
  "results": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440000",
      "entity_type": "company",
      "entity_type_display": "Company",
      "entity_id": "550e8400-e29b-41d4-a716-446655440000",
      "external_id": null,
      "external_system": "notion",
      "sync_status": "pending",
      "sync_status_display": "Pending",
      "last_synced": null,
      "last_sync_direction": null,
      "direction_display": null,
      "last_sync_error": null,
      "sync_version": 0,
      "created_at": "2024-02-10T10:00:00Z",
      "updated_at": "2024-02-10T10:00:00Z",
      "organization": "990e8400-e29b-41d4-a716-446655440001"
    }
  ]
}
```

#### Create Sync Record

```bash
POST /api/sync-records/
```

Create a sync record to track an entity that needs to be synced.

**Request Body:**

```json
{
  "entity_type": "company",
  "entity_id": "550e8400-e29b-41d4-a716-446655440000",
  "external_system": "notion",
  "sync_status": "pending"
}
```

**Example:**

```bash
curl -s -X POST "https://your-api.example.com/api/sync-records/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "entity_type": "company",
       "entity_id": "550e8400-e29b-41d4-a716-446655440000",
       "external_system": "notion",
       "sync_status": "pending"
     }' | jq .
```

#### Update Sync Record

```bash
PATCH /api/sync-records/{id}/
```

Update sync status after successful or failed sync.

**Request Body (After Successful Sync):**

```json
{
  "external_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "sync_status": "synced",
  "last_sync_direction": "crm_to_external"
}
```

**Request Body (After Failed Sync):**

```json
{
  "sync_status": "error",
  "last_sync_error": "Notion API rate limit exceeded"
}
```

**Example:**

```bash
# Mark as successfully synced to Notion
curl -s -X PATCH "https://your-api.example.com/api/sync-records/880e8400-e29b-41d4-a716-446655440000/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "external_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
       "sync_status": "synced",
       "last_sync_direction": "crm_to_external"
     }' | jq .
```

#### Delete Sync Record

```bash
DELETE /api/sync-records/{id}/
```

Remove a sync record (e.g., when entity is deleted or you want to force re-sync).

---

### Sync Logs

#### List Sync Logs

```bash
GET /api/sync-logs/
```

**Query Parameters:**

| Parameter | Description | Example |
| :--- | :--- | :--- |
| `entity_type` | Filter by entity type | `?entity_type=company` |
| `entity_id` | Filter by entity UUID | `?entity_id=xxx` |
| `external_system` | Filter by system | `?external_system=notion` |
| `status` | Filter by status | `?status=failed` |
| `direction` | Filter by direction | `?direction=crm_to_external` |
| `source` | Filter by source | `?source=cron` |
| `started_at__gt` | Started after date | `?started_at__gt=2024-01-01` |
| `ordering` | Sort order | `?ordering=-started_at` |

**Example - Get Failed Syncs:**

```bash
curl -s -G "https://your-api.example.com/api/sync-logs/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     --data-urlencode "status=failed" \
     --data-urlencode "external_system=notion" \
     --data-urlencode "ordering=-started_at" | jq .
```

**Response:**

```json
{
  "count": 5,
  "results": [
    {
      "id": "990e8400-e29b-41d4-a716-446655440000",
      "sync_record": "880e8400-e29b-41d4-a716-446655440000",
      "entity_type": "company",
      "entity_id": "550e8400-e29b-41d4-a716-446655440000",
      "external_system": "notion",
      "external_id": null,
      "direction": "crm_to_external",
      "direction_display": "CRM to External",
      "status": "failed",
      "status_display": "Failed",
      "data_hash": "sha256:abc123...",
      "error_message": "Notion API returned 429 - Rate limit exceeded",
      "error_details": {
        "status_code": 429,
        "retry_after": 60
      },
      "started_at": "2024-02-10T14:30:00Z",
      "completed_at": "2024-02-10T14:30:05Z",
      "duration_seconds": 5.23,
      "triggered_by": null,
      "triggered_by_name": "System",
      "source": "cron",
      "created_at": "2024-02-10T14:30:05Z"
    }
  ]
}
```

#### Create Sync Log

```bash
POST /api/sync-logs/
```

Log a sync attempt. Usually called by your sync automation.

**Request Body:**

```json
{
  "sync_record": "880e8400-e29b-41d4-a716-446655440000",
  "entity_type": "company",
  "entity_id": "550e8400-e29b-41d4-a716-446655440000",
  "external_system": "notion",
  "external_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "direction": "crm_to_external",
  "status": "success",
  "data_hash": "sha256:hash-of-data",
  "crm_data_snapshot": {
    "name": "Acme Corp",
    "domain": "acme.com"
  },
  "external_data_snapshot": {
    "notion_page_id": "a1b2c3d4..."
  },
  "source": "api"
}
```

**Example:**

```bash
curl -s -X POST "https://your-api.example.com/api/sync-logs/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "sync_record": "880e8400-e29b-41d4-a716-446655440000",
       "entity_type": "company",
       "entity_id": "550e8400-e29b-41d4-a716-446655440000",
       "external_system": "notion",
       "external_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
       "direction": "crm_to_external",
       "status": "success",
       "source": "cron"
     }' | jq .
```

---

## Two-Way Sync Workflow

### 1. Detect Changes in Notion

```bash
# Query Notion for recently updated pages
# GET https://api.notion.com/v1/databases/{database_id}/query
# Filter: last_edited_time > {last_sync_timestamp}
```

### 2. Match or Create in CRM

```bash
# Check if FounderStack ID exists in the Notion page
# If yes: Update existing CRM record
# If no: Create new CRM record

# Example: Create new company from Notion
curl -s -X POST "https://your-api.example.com/api/companies/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "New Company from Notion",
       "domain": "newco.com"
     }' | jq .
```

### 3. Create Sync Record for New Entities

```bash
# After creating in CRM, create sync record
curl -s -X POST "https://your-api.example.com/api/sync-records/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "entity_type": "company",
       "entity_id": "NEW_CRM_UUID",
       "external_id": "NOTION_PAGE_ID",
       "external_system": "notion",
       "sync_status": "synced",
       "last_sync_direction": "external_to_crm"
     }' | jq .
```

### 4. Update Notion with CRM UUID

```bash
# Update the Notion page to add FounderStack ID
# PATCH https://api.notion.com/v1/pages/{page_id}
# Body: {"properties": {"FounderStack ID": {"rich_text": [{"text": {"content": "NEW_CRM_UUID"}}]}}}
```

### 5. Detect Changes in CRM

```bash
# Get recently updated CRM records
curl -s -G "https://your-api.example.com/api/companies/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     --data-urlencode "updated_at__gt=2024-02-10T00:00:00Z" | jq .
```

### 6. Get Sync Records for These Entities

```bash
# Find sync records to get Notion page IDs
curl -s -G "https://your-api.example.com/api/sync-records/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     --data-urlencode "entity_type=company" \
     --data-urlencode "entity_id=CRM_UUID" \
     --data-urlencode "external_system=notion" | jq .
```

### 7. Update Notion Pages

```bash
# Update Notion page with CRM data
# PATCH https://api.notion.com/v1/pages/{page_id}
```

### 8. Update Sync Record

```bash
# Mark as synced
curl -s -X PATCH "https://your-api.example.com/api/sync-records/SYNC_RECORD_ID/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "sync_status": "synced",
       "last_sync_direction": "crm_to_external"
     }' | jq .
```

### 9. Log the Sync

```bash
# Create sync log entry
curl -s -X POST "https://your-api.example.com/api/sync-logs/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "sync_record": "SYNC_RECORD_ID",
       "entity_type": "company",
       "entity_id": "CRM_UUID",
       "external_system": "notion",
       "external_id": "NOTION_PAGE_ID",
       "direction": "crm_to_external",
       "status": "success",
       "source": "cron"
     }' | jq .
```

---

## Example: Complete Sync Script

```bash
#!/bin/bash

API_KEY="YOUR_API_KEY"
NOTION_TOKEN="YOUR_NOTION_TOKEN"
NOTION_COMPANY_DB="YOUR_NOTION_DB_ID"

# 1. Get pending companies from CRM
echo "Fetching pending companies..."
PENDING=$(curl -s -G "https://your-api.example.com/api/sync-records/" \
  -H "Authorization: Api-Key $API_KEY" \
  --data-urlencode "entity_type=company" \
  --data-urlencode "external_system=notion" \
  --data-urlencode "sync_status=pending")

# 2. Process each pending company
echo "$PENDING" | jq -c '.results[]' | while read sync_record; do
  ENTITY_ID=$(echo "$sync_record" | jq -r '.entity_id')
  SYNC_ID=$(echo "$sync_record" | jq -r '.id')
  
  # Get company details
  COMPANY=$(curl -s "https://your-api.example.com/api/companies/$ENTITY_ID/" \
    -H "Authorization: Api-Key $API_KEY")
  
  NAME=$(echo "$COMPANY" | jq -r '.name')
  echo "Syncing: $NAME"
  
  # Create in Notion
  NOTION_RESPONSE=$(curl -s -X POST "https://api.notion.com/v1/pages" \
    -H "Authorization: Bearer $NOTION_TOKEN" \
    -H "Notion-Version: 2022-06-28" \
    -H "Content-Type: application/json" \
    -d "{
      \"parent\": {\"database_id\": \"$NOTION_COMPANY_DB\"},
      \"properties\": {
        \"Name\": {\"title\": [{\"text\": {\"content\": \"$NAME\"}}]},
        \"FounderStack ID\": {\"rich_text\": [{\"text\": {\"content\": \"$ENTITY_ID\"}}]}
      }
    }")
  
  NOTION_PAGE_ID=$(echo "$NOTION_RESPONSE" | jq -r '.id')
  
  if [ "$NOTION_PAGE_ID" != "null" ]; then
    # Update sync record
    curl -s -X PATCH "https://your-api.example.com/api/sync-records/$SYNC_ID/" \
      -H "Authorization: Api-Key $API_KEY" \
      -H "Content-Type: application/json" \
      -d "{
        \"external_id\": \"$NOTION_PAGE_ID\",
        \"sync_status\": \"synced\",
        \"last_sync_direction\": \"crm_to_external\"
      }" > /dev/null
    
    # Log success
    curl -s -X POST "https://your-api.example.com/api/sync-logs/" \
      -H "Authorization: Api-Key $API_KEY" \
      -H "Content-Type: application/json" \
      -d "{
        \"sync_record\": \"$SYNC_ID\",
        \"entity_type\": \"company\",
        \"entity_id\": \"$ENTITY_ID\",
        \"external_system\": \"notion\",
        \"external_id\": \"$NOTION_PAGE_ID\",
        \"direction\": \"crm_to_external\",
        \"status\": \"success\",
        \"source\": \"script\"
      }" > /dev/null
    
    echo "✓ Synced successfully"
  else
    ERROR=$(echo "$NOTION_RESPONSE" | jq -r '.message')
    echo "✗ Failed: $ERROR"
    
    # Update sync record with error
    curl -s -X PATCH "https://your-api.example.com/api/sync-records/$SYNC_ID/" \
      -H "Authorization: Api-Key $API_KEY" \
      -H "Content-Type: application/json" \
      -d "{
        \"sync_status\": \"error\",
        \"last_sync_error\": \"$ERROR\"
      }" > /dev/null
  fi
done

echo "Sync complete!"
```

---

## Best Practices

### 1. Always Create Sync Records
Before syncing any entity, ensure a SyncRecord exists:

```bash
# Check if sync record exists
curl -s -G "https://your-api.example.com/api/sync-records/" \
  -H "Authorization: Api-Key YOUR_KEY" \
  --data-urlencode "entity_type=company" \
  --data-urlencode "entity_id=ENTITY_UUID" \
  --data-urlencode "external_system=notion"

# If not found, create one
curl -s -X POST "https://your-api.example.com/api/sync-records/" \
  -H "Authorization: Api-Key YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "entity_type": "company",
    "entity_id": "ENTITY_UUID",
    "external_system": "notion",
    "sync_status": "pending"
  }'
```

### 2. Update Sync Status Immediately
Always update the SyncRecord status after attempting a sync:
- On success: `sync_status: synced`, `external_id: xxx`
- On failure: `sync_status: error`, `last_sync_error: message`

### 3. Log Every Attempt
Even failed attempts should create SyncLog entries for debugging.

### 4. Handle Conflicts
Use `last_synced` and `sync_version` to detect and resolve conflicts:

```bash
# Get entity with sync info
curl -s -G "https://your-api.example.com/api/sync-records/" \
  -H "Authorization: Api-Key YOUR_KEY" \
  --data-urlencode "entity_id=ENTITY_UUID"

# Compare timestamps with Notion's last_edited_time
# If CRM updated_at > last_synced and Notion updated more recently → CONFLICT
```

### 5. Use Data Hashes
Store SHA256 hashes in SyncLog to detect if data actually changed:

```python
import hashlib
data_string = json.dumps(crm_data, sort_keys=True)
data_hash = hashlib.sha256(data_string.encode()).hexdigest()

# Compare with previous sync log hash
# If same, skip sync (no changes)
```

---

## Error Handling

### Common Errors

**SyncRecord Already Exists:**
```json
{
  "detail": "Sync record with this organization, entity type, entity id, and external system already exists."
}
```
**Fix:** Use `GET /api/sync-records/?entity_id=xxx` to find existing record and update it instead.

**Entity Not Found:**
```json
{
  "detail": "company with id xxx does not exist"
}
```
**Fix:** Verify the entity_id exists in CRM before creating sync record.

**Invalid Sync Status:**
```json
{
  "sync_status": ["\"invalid_status\" is not a valid choice."]
}
```
**Fix:** Use valid status: `pending`, `syncing`, `synced`, `error`

---

## Monitoring

### Check Sync Health

```bash
# Count pending syncs
curl -s -G "https://your-api.example.com/api/sync-records/" \
  -H "Authorization: Api-Key YOUR_KEY" \
  --data-urlencode "sync_status=pending" | jq '.count'

# Count recent failures
curl -s -G "https://your-api.example.com/api/sync-logs/" \
  -H "Authorization: Api-Key YOUR_KEY" \
  --data-urlencode "status=failed" \
  --data-urlencode "started_at__gt=2024-02-10T00:00:00Z" | jq '.count'

# Get latest failed syncs with details
curl -s -G "https://your-api.example.com/api/sync-logs/" \
  -H "Authorization: Api-Key YOUR_KEY" \
  --data-urlencode "status=failed" \
  --data-urlencode "ordering=-started_at" \
  --data-urlencode "page_size=10" | jq '.results[] | {entity_type, entity_id, error_message, started_at}'
```

### View Sync Statistics

```bash
# All sync records by status
curl -s -G "https://your-api.example.com/api/sync-records/" \
  -H "Authorization: Api-Key YOUR_KEY" \
  --data-urlencode "external_system=notion" | jq '.results | group_by(.sync_status) | map({status: .[0].sync_status, count: length})'
```
