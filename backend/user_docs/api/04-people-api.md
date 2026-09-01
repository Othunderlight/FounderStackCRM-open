# People API

Manage your leads and contacts.

## Endpoints
*   `GET /api/people/`: List/Search people.
*   `POST /api/people/`: Create a new person.
*   `POST /api/people/import/`: Bulk create people.
*   `GET /api/people/{id}/`: Retrieve details.
*   `GET /api/people/{id}/context/`: Retrieve related tasks, notes, and activities.
*   `PATCH /api/people/{id}/`: Update details.
*   `DELETE /api/people/{id}/`: Delete a person.

## Create/Update Fields
| Field | Type | Required |
| :--- | :--- | :--- |
| `name` | String | Yes |
| `email` | String | No |
| `phone` | String | No |
| `job_title` | String | No |
| `city` | String | No |
| `stage` | String | No (Default: "Lead") |
| `lead_type` | String | No (Default: "Prospect") |
| `lead_source` | String | No (Default: "Outbound") |
| `conversion_rate` | Integer | No (0-100) |
| `company` | UUID | No |
| `owner` | UUID | No. User responsible for this lead/contact. Defaults to current user on create. |

## Examples

### List/Search People
```bash
curl -s -G "https://your-api.example.com/api/people/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     --data-urlencode "search=ahmed" | jq .
```

### Create a New Person
```bash
curl -s -X POST "https://your-api.example.com/api/people/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{
           "name": "Ahmed Ali",
           "email": "ahmed@example.com",
           "stage": "Qualified",
           "conversion_rate": 80,
           "owner": "USER_UUID"
         }' | jq .
```

### Bulk Create People (Simple)
```bash
curl -s -X POST "https://your-api.example.com/api/people/import/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d "[{\"name\": \"Person A\", \"email\": \"a@example.com\"}, {\"name\": \"Person B\", \"email\": \"b@example.com\"}]" | jq .
```

### Bulk Create with Auto-linking (Company)
Link people to companies by **name** instead of UUID. If the company doesn't exist, it will be created.

```bash
curl -s -X POST "https://your-api.example.com/api/people/import/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{
           "data": [
             { "name": "John Doe", "email": "john@acme.com", "company": "Acme Corp" },
             { "name": "Jane Smith", "email": "jane@globex.com", "company": "Globex" }
           ],
           "auto_create": { "company": true }
         }' | jq .
```

### Retrieve Person Details
```bash
curl -s -G "https://your-api.example.com/api/people/{id}/" \
     -H "Authorization: Api-Key YOUR_KEY" | jq .
```

### Update Person Details (PATCH)
```bash
curl -s -X PATCH "https://your-api.example.com/api/people/{id}/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{
           "job_title": "Product Manager",
           "city": "Dubai"
         }' | jq .
```

### Delete a Person
```bash
curl -s -X DELETE "https://your-api.example.com/api/people/{id}/" \
     -H "Authorization: Api-Key YOUR_KEY" | jq .
```

### Get Person Context (Timeline View)
Retrieves a person with their related activities, tasks, and notes - a complete timeline view.

```bash
curl -s -G "https://your-api.example.com/api/people/{id}/context/" \
     -H "Authorization: Api-Key YOUR_KEY" | jq .
```

### Get Person With Filters
Filter the context by section:

```bash
# Get only activities
curl -s -G "https://your-api.example.com/api/people/{id}/context/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     --data-urlencode "sections=activities" | jq .

# Get only tasks
curl -s -G "https://your-api.example.com/api/people/{id}/context/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     --data-urlencode "sections=tasks" | jq .

# Get only notes
curl -s -G "https://your-api.example.com/api/people/{id}/context/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     --data-urlencode "sections=notes" | jq .
```

### Get Person AI Context
Returns a person with their complete context optimized for AI processing. Includes all sections (general, activities, tasks, notes, timeline) always - no filtering needed.

```bash
curl -s -G "https://your-api.example.com/api/people/{id}/context/ai/" \
     -H "Authorization: Api-Key YOUR_KEY" | jq .
```

**Response Structure:**
| Field | Description |
| :--- | :--- |
| `id` | Person ID |
| `name` | Person name |
| `email` | Email address |
| `phone` | Phone number |
| `job_title` | Job title |
| `city` | City |
| `linkedin` | LinkedIn URL |
| `conversion_rate` | Conversion rate (0-100) |
| `stage` | Stage (Lead, Qualified, Negotiation, etc.) |
| `lead_type` | Lead type |
| `lead_source` | Lead source |
| `last_action` | Last action taken |
| `recommended_action` | AI recommended next action |
| `company` | Associated company object |
| `activities` | Object containing: <br> - `not_linked_to_timeline_interactions`: ActivityLogs not linked to timeline <br> - `linked_to_timeline_interactions`: Titles of activities linked to timeline with instruction |
| `tasks` | Array of tasks (null if empty) |
| `notes` | Array of notes (null if empty) |
| `timeline` | Array of interaction logs (null if empty). Each item includes: id, interaction_type (with name and id), notes, date, created_by_name, activity_log_details |
