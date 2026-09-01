# Notes API

Keep track of important information related to people and companies.

## Endpoints
*   `GET /api/notes/`: List/Search notes.
*   `POST /api/notes/`: Create a new note.
*   `POST /api/notes/import/`: Bulk create notes.
*   `GET /api/notes/{id}/`: Retrieve details.
*   `PATCH /api/notes/{id}/`: Update details.
*   `DELETE /api/notes/{id}/`: Delete a note.

## Fields
| Field | Type | Description |
| :--- | :--- | :--- |
| `title` | String | Note title |
| `content` | String | Full note content |
| `related_person` | UUID | Link to a Person |
| `related_company` | UUID | Link to a Company |

## Examples

### Search Notes for a Keyword
```bash
curl -s -G "https://your-api.example.com/api/notes/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     --data-urlencode "search=pricing" | jq .
```

### Create a Note for a Company
```bash
curl -s -X POST "https://your-api.example.com/api/notes/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{
           "title": "Meeting Notes - Q4 Strategy",
           "content": "Discussed expansion into EMEA. Customer is interested in premium tier.",
           "related_company": "COMPANY_UUID"
         }' | jq .
```

### Bulk Create Notes (Simple)
```bash
curl -s -X POST "https://your-api.example.com/api/notes/import/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d "[{\"title\": \"Note 1\", \"content\": \"...\"}, {\"title\": \"Note 2\", \"content\": \"...\"}]" | jq .
```

### Bulk Create with Auto-linking
```bash
curl -s -X POST "https://your-api.example.com/api/notes/import/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{
           "data": [
             { "title": "Meeting with John", "content": "...", "related_person": "John Doe" },
             { "title": "Company update", "content": "...", "related_company": "Acme Corp" }
           ],
           "auto_create": { "related_person": true, "related_company": true }
         }' | jq .
```

### Update Note Content
```bash
curl -s -X PATCH "https://your-api.example.com/api/notes/{id}/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{
           "content": "REVISED: Discussed expansion into EMEA and APAC."
         }' | jq .
```
