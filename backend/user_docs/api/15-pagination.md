# Pagination

All list endpoints return paginated results. The API supports **two pagination modes** to accommodate different use cases.

## Overview

| Mode | Best For | Syntax |
| :--- | :--- | :--- |
| **Page-based** | Frontend UI, browsing data | `?page=1&page_size=15` |
| **Offset-based** | Sync operations, programmatic access | `?limit=15&offset=0` |

The API automatically detects which mode you're using based on the query parameters.

---

## Page-Based Pagination

The default mode. Ideal for frontend applications displaying data in pages.

### Parameters

| Parameter | Description | Default | Max |
| :--- | :--- | :--- | :--- |
| `page` | Page number (1-indexed) | `1` | - |
| `page_size` | Records per page | `15` | `1000` |

### Example

```bash
curl -s -G "https://your-api.example.com/api/people/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     --data-urlencode "page=1" \
     --data-urlencode "page_size=15" | jq .
```

### Response

```json
{
  "count": 36,
  "next": "https://your-api.example.com/api/people/?page=2&page_size=15",
  "previous": null,
  "results": [
    { "id": "uuid-1", "name": "Ahmed Hassan", ... },
    { "id": "uuid-2", "name": "Sara Ali", ... }
  ]
}
```

---

## Offset-Based Pagination

Ideal for sync operations, background jobs, and programmatic access where you need precise control over which records to fetch.

### Understanding Offset (Python Analogy)

Think of offset pagination like array slicing in Python:

```python
records = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

records[0:3]   # [0, 1, 2]     → offset=0, limit=3
records[3:6]   # [3, 4, 5]     → offset=3, limit=3
records[5:8]   # [5, 6, 7]     → offset=5, limit=3
```

API equivalent:

| Python Slice | API Request | Records Returned |
| :--- | :--- | :--- |
| `list[0:3]` | `?limit=3&offset=0` | Records 1, 2, 3 |
| `list[3:6]` | `?limit=3&offset=3` | Records 4, 5, 6 |
| `list[5:8]` | `?limit=3&offset=5` | Records 6, 7, 8 |

### Parameters

| Parameter | Description | Default | Max |
| :--- | :--- | :--- | :--- |
| `limit` | Number of records to return | `15` | `1000` |
| `offset` | Starting position (0-indexed) | `0` | - |

### Examples

**Fetch the first 50 records:**
```bash
curl -s -G "https://your-api.example.com/api/people/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     --data-urlencode "limit=50" \
     --data-urlencode "offset=0" | jq .
```

**Fetch exactly the 11th record:**
```bash
curl -s -G "https://your-api.example.com/api/people/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     --data-urlencode "limit=1" \
     --data-urlencode "offset=10" | jq .
```

**Fetch records 100-150:**
```bash
curl -s -G "https://your-api.example.com/api/people/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     --data-urlencode "limit=51" \
     --data-urlencode "offset=99" | jq .
```

### Response

```json
{
  "count": 36,
  "next": "https://your-api.example.com/api/people/?limit=15&offset=15",
  "previous": null,
  "results": [
    { "id": "uuid-1", "name": "Ahmed Hassan", ... },
    { "id": "uuid-2", "name": "Sara Ali", ... }
  ]
}
```

---

## When to Use Each Mode

### Use Page-Based When:
- Building a frontend UI with pagination controls
- Users browse data page by page
- You want simple "next page" / "previous page" navigation

### Use Offset-Based When:
- Syncing data to external systems (Notion, HubSpot, etc.)
- Running background jobs that process records in batches
- You need to fetch a specific record by position
- Resuming an interrupted sync operation

---

## Sync Workflow Example

Here's a typical pattern for syncing all records to an external system:

```bash
#!/bin/bash

API_KEY="YOUR_API_KEY"
LIMIT=50
OFFSET=0

while true; do
  echo "Fetching records $OFFSET to $((OFFSET + LIMIT))..."
  
  RESPONSE=$(curl -s -G "https://your-api.example.com/api/people/" \
    -H "Authorization: Api-Key $API_KEY" \
    --data-urlencode "limit=$LIMIT" \
    --data-urlencode "offset=$OFFSET")
  
  COUNT=$(echo "$RESPONSE" | jq '.count')
  RESULTS=$(echo "$RESPONSE" | jq '.results')
  
  # Check if no more records
  if [ "$(echo "$RESULTS" | jq 'length')" -eq 0 ]; then
    echo "Sync complete! Total records: $COUNT"
    break
  fi
  
  # Process each record
  echo "$RESULTS" | jq -c '.[]' | while read person; do
    PERSON_ID=$(echo "$person" | jq -r '.id')
    PERSON_NAME=$(echo "$person" | jq -r '.name')
    
    echo "Syncing: $PERSON_NAME ($PERSON_ID)"
    
    # Sync to external system...
    # POST to Notion, HubSpot, etc.
    
    # Respect rate limits
    sleep 0.5
  done
  
  # Move to next batch
  OFFSET=$((OFFSET + LIMIT))
done
```

---

## Getting Just the Count

If you only need the total number of records without fetching data:

```bash
curl -s -G "https://your-api.example.com/api/people/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     --data-urlencode "limit=1" | jq '.count'
```

Returns: `36`

---

## Default Ordering

Records are ordered by creation date (newest first) unless you specify otherwise:

```bash
# Order by name ascending
curl -s -G "https://your-api.example.com/api/people/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     --data-urlencode "ordering=name"

# Order by creation date ascending (oldest first)
curl -s -G "https://your-api.example.com/api/people/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     --data-urlencode "ordering=created_at"
```

---

## Common Pitfalls

### Mixing Parameters

Don't mix page-based and offset-based parameters:

❌ **Wrong:**
```
?page=2&limit=10&offset=20
```

✅ **Correct - Use one mode:**
```
?page=2&page_size=10
# OR
?limit=10&offset=20
```

### Off-By-One Errors

Remember that `offset` is 0-indexed:

| To Get | Offset |
| :--- | :--- |
| 1st record | `offset=0` |
| 10th record | `offset=9` |
| 100th record | `offset=99` |

### Data Changes During Pagination

If records are added/deleted while paginating, you might:
- Miss new records (they appear at the top)
- See duplicates (records shift positions)

**Solution:** Use a timestamp filter for reliable syncs:

```bash
# Only fetch records created before sync started
curl -s -G "https://your-api.example.com/api/people/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     --data-urlencode "created_at__lt=2024-02-10T10:00:00Z" \
     --data-urlencode "limit=50" \
     --data-urlencode "offset=0"
```
