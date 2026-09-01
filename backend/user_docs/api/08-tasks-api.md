# Tasks API

Manage tasks for your team and link them to people or companies.

## Endpoints
*   `GET /api/tasks/`: List/Search tasks.
*   `POST /api/tasks/`: Create a new task.
*   `POST /api/tasks/import/`: Bulk create tasks.
*   `GET /api/tasks/{id}/`: Retrieve details.
*   `PATCH /api/tasks/{id}/`: Update details.
*   `DELETE /api/tasks/{id}/`: Delete a task.

## Fields
| Field | Type | Description |
| :--- | :--- | :--- |
| `title` | String | Task title (Required) |
| `description` | String | Detailed description |
| `status` | String | "Todo", "In Progress", or "Done" |
| `due_date` | ISO Date | e.g. "2023-12-31T23:59:59Z" |
| `assignee` | UUID | User ID assigned to the task |
| `related_person` | UUID | Link to a Person |
| `related_company` | UUID | Link to a Company |

## Examples

### List All Pending Tasks
```bash
curl -s -G "https://your-api.example.com/api/tasks/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     --data-urlencode "status=Todo" | jq .
```

### Create a Task for a Person
```bash
curl -s -X POST "https://your-api.example.com/api/tasks/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{ "title": "Follow up call", "description": "Discuss the new proposal", "status": "Todo", "related_person": "PERSON_UUID", "due_date": "2026-02-10T10:00:00Z" }' | jq .
```

### Bulk Create Tasks (Simple)
```bash
curl -s -X POST "https://your-api.example.com/api/tasks/import/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d "[{\"title\": \"Task 1\", \"related_person\": \"UUID_1\"}, {\"title\": \"Task 2\", \"related_person\": \"UUID_2\"}]" | jq .
```

### Bulk Create with Auto-linking
This allows you to link tasks to people or companies by **name** instead of UUID. If the person doesn't exist, they will be created.

```bash
curl -s -X POST "https://your-api.example.com/api/tasks/import/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{
           "data": [
             { "title": "Call John Doe", "related_person": "John Doe" },
             { "title": "Email Jane Smith", "related_person": "Jane Smith" }
           ],
           "auto_create": { "related_person": true }
         }' | jq .
```

### Update Task Status
Status options: `Todo`, `In Progress`, `Done`
```bash
curl -s -X PATCH "https://your-api.example.com/api/tasks/{id}/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{ "status": "Done" }' | jq .
```

### Update Task Title
```bash
curl -s -X PATCH "https://your-api.example.com/api/tasks/{id}/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{ "title": "New title" }' | jq .
```

### Update Task Description
```bash
curl -s -X PATCH "https://your-api.example.com/api/tasks/{id}/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{ "description": "New description" }' | jq .
```

### Update Task Due Date
```bash
curl -s -X PATCH "https://your-api.example.com/api/tasks/{id}/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{ "due_date": "2026-03-15T10:00:00Z" }' | jq .
```

### Update Task Assignee (by UUID)
```bash
curl -s -X PATCH "https://your-api.example.com/api/tasks/{id}/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{ "assignee": "USER_UUID" }' | jq .
```

### Update Task Related Person (by UUID)
```bash
curl -s -X PATCH "https://your-api.example.com/api/tasks/{id}/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{ "related_person": "PERSON_UUID" }' | jq .
```

### Update Task Related Company (by UUID)
```bash
curl -s -X PATCH "https://your-api.example.com/api/tasks/{id}/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{ "related_company": "COMPANY_UUID" }' | jq .
```

### Filter Tasks by Person Name
```bash
curl -s -G "https://your-api.example.com/api/tasks/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     --data-urlencode "related_person__name__icontains=John" | jq .
```

### Filter Tasks by Company Name
```bash
curl -s -G "https://your-api.example.com/api/tasks/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     --data-urlencode "related_company__name__icontains=Acme" | jq .
```

### Search Tasks by Person OR Company Name (Fuzzy Search)
```bash
curl -s -G "https://your-api.example.com/api/tasks/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     --data-urlencode "search=John" | jq .
```

**Note:** The `search` param uses **fuzzy/vowel-insensitive search** - "ahmad" will match "Ahmed", "acme" will match "Acme Corp". The filter params (`related_person__name__icontains`, `related_company__name__icontains`, `relations`) use standard case-insensitive substring matching only.

### Filter Tasks by Title
```bash
curl -s -G "https://your-api.example.com/api/tasks/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     --data-urlencode "title__icontains=follow" | jq .
```

### Filter Tasks by Description
```bash
curl -s -G "https://your-api.example.com/api/tasks/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     --data-urlencode "description__icontains=proposal" | jq .
```

### Filter Tasks by Due Date
```bash
# Tasks due after a date
curl -s -G "https://your-api.example.com/api/tasks/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     --data-urlencode "due_date__gt=2024-01-01T00:00:00Z" | jq .

# Tasks due before a date
curl -s -G "https://your-api.example.com/api/tasks/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     --data-urlencode "due_date__lt=2024-12-31T23:59:59Z" | jq .
```

### Filter Tasks by Assignee
```bash
# By user UUID
curl -s -G "https://your-api.example.com/api/tasks/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     --data-urlencode "assignee=USER_UUID" | jq .

# Unassigned tasks only
curl -s -G "https://your-api.example.com/api/tasks/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     --data-urlencode "assignee__isnull=true" | jq .
```
