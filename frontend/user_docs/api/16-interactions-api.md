# Interactions API

Track detailed interactions with people and companies using customizable interaction types.

## Endpoints
*   `GET /api/interaction-types/`: List interaction types.
*   `POST /api/interaction-types/`: Create a new interaction type.
*   `GET /api/interaction-types/{id}/`: Retrieve interaction type details.
*   `PATCH /api/interaction-types/{id}/`: Update interaction type.
*   `DELETE /api/interaction-types/{id}/`: Delete interaction type.
*   `GET /api/interactions/`: List/search interactions.
*   `POST /api/interactions/`: Create a new interaction log.
*   `GET /api/interactions/{id}/`: Retrieve interaction details.
*   `PATCH /api/interactions/{id}/`: Update interaction.
*   `DELETE /api/interactions/{id}/`: Delete interaction.
*   `POST /api/interactions/import/`: Bulk create interactions.

## Interaction Type Fields
| Field | Type | Description |
| :--- | :--- | :--- |
| `name` | String | Name of the interaction type (Required, unique per org) |
| `description` | String | Description of what this interaction type represents |
| `color` | String | Hex color code for UI (e.g., "#FF5733") |
| `icon` | String | Lucide icon name for UI (e.g., "phone", "mail", "calendar") |

## Interaction Log Fields
| Field | Type | Description |
| :--- | :--- | :--- |
| `interaction_type` | UUID | Link to an InteractionType (Required) |
| `notes` | String | Additional details about the interaction |
| `date` | ISO Date | When the interaction occurred |
| `related_person` | UUID | Link to a Person |
| `related_company` | UUID | Link to a Company |
| `activity_log` | UUID | Optional link to an ActivityLog for detailed communication info |
| `created_by` | UUID | User who created the interaction (read-only) |

## Examples

### Create an Interaction Type
```bash
curl -s -X POST "https://your-api.example.com/api/interaction-types/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{
           "name": "Discovery Call",
           "description": "Initial call to understand customer needs",
           "color": "#4CAF50",
           "icon": "phone"
         }' | jq .
```

### Log an Interaction
```bash
curl -s -X POST "https://your-api.example.com/api/interactions/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{
           "interaction_type": "INTERACTION_TYPE_UUID",
           "notes": "Discussed pricing options. Customer interested in enterprise plan.",
           "related_person": "PERSON_UUID",
           "related_company": "COMPANY_UUID"
         }' | jq .
```

### Link Interaction to Activity Log
```bash
curl -s -X POST "https://your-api.example.com/api/interactions/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{
           "interaction_type": "INTERACTION_TYPE_UUID",
           "notes": "Follow-up after meeting",
           "related_person": "PERSON_UUID",
           "activity_log": "ACTIVITY_LOG_UUID"
         }' | jq .
```

### List Interactions for a Person
```bash
curl -s -G "https://your-api.example.com/api/interactions/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     --data-urlencode "related_person=PERSON_UUID" | jq .
```

### Bulk Create Interactions
```bash
curl -s -X POST "https://your-api.example.com/api/interactions/import/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d "[{\"interaction_type\": \"TYPE_UUID\", \"notes\": \"Intro\", \"related_person\": \"PERSON_UUID_1\"}, {\"interaction_type\": \"TYPE_UUID\", \"notes\": \"Follow-up\", \"related_person\": \"PERSON_UUID_2\"}]" | jq .
```

### Filter Interactions
```bash
# Filter by interaction type
curl -s -G "https://your-api.example.com/api/interactions/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     --data-urlencode "interaction_type=INTERACTION_TYPE_UUID" | jq .

# Filter by date range
curl -s -G "https://your-api.example.com/api/interactions/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     --data-urlencode "date__gte=2024-01-01" | jq .
```