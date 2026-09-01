# Activities API

Track every interaction with your leads and companies, including emails, calls, and meetings.

## Endpoints
*   `GET /api/activities/`: List/Search activities.
*   `POST /api/activities/`: Create a new activity log.
*   `POST /api/activities/import/`: Bulk create activities.
*   `GET /api/activities/{id}/`: Retrieve details.

## Fields
| Field | Type | Description |
| :--- | :--- | :--- |
| `type` | String | Activity type: "email", "call", "meeting", "msg", "update" |
| `channel` | String | Communication channel: "email", "linkedin", "whatsapp", "system" |
| `direction` | String | Direction: "sent", "received", "system" |
| `title` | String | Brief summary of the activity |
| `content` | String | Detailed description or body of the message |
| `date` | ISO Date | When the activity occurred |
| `related_person` | UUID | Link to a Person |
| `related_company` | UUID | Link to a Company |
| `user` | UUID | User who created the activity |

## Examples

### List Recent Activities for a Person
```bash
curl -s -G "https://your-api.example.com/api/activities/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     --data-urlencode "related_person=PERSON_UUID" | jq .
```

### Log a Call
```bash
curl -s -X POST "https://your-api.example.com/api/activities/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{
           "type": "call",
           "title": "Introductory Call",
           "content": "Had a great 15-minute intro call. They are interested in a demo next week.",
           "related_person": "PERSON_UUID"
         }' | jq .
```

### Bulk Create Activities (Simple)
```bash
curl -s -X POST "https://your-api.example.com/api/activities/import/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d "[{\"type\": \"email\", \"title\": \"Follow up\", \"related_person\": \"UUID_1\"}, {\"type\": \"call\", \"title\": \"Discovery\", \"related_person\": \"UUID_2\"}]" | jq .
```

### Bulk Create with Auto-linking
```bash
curl -s -X POST "https://your-api.example.com/api/activities/import/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{
           "data": [
             { "type": "meeting", "title": "Strategy Session", "related_person": "John Doe" },
             { "type": "call", "title": "Check-in", "related_company": "Acme Corp" }
           ],
           "auto_create": { "related_person": true, "related_company": true }
         }' | jq .
```

### Filter Activities
```bash
# Filter by type
curl -s -G "https://your-api.example.com/api/activities/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     --data-urlencode "type=meeting" | jq .

# Filter by channel and direction
curl -s -G "https://your-api.example.com/api/activities/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     --data-urlencode "channel=linkedin" \
     --data-urlencode "direction=sent" | jq .

# Filter by person or company
curl -s -G "https://your-api.example.com/api/activities/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     --data-urlencode "related_person=PERSON_UUID" | jq .
```
