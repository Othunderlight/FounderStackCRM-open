# Companies API

Manage organizations and companies.

## Endpoints
*   `GET /api/companies/`: List/Search companies.
*   `POST /api/companies/`: Create a new company.
*   `POST /api/companies/import/`: Bulk create companies.
*   `GET /api/companies/{id}/`: Retrieve details.
*   `PATCH /api/companies/{id}/`: Update details.
*   `DELETE /api/companies/{id}/`: Delete a company.

## Fields
| Field | Type | Description |
| :--- | :--- | :--- |
| `name` | String | Company Name |
| `domain` | String | e.g. "google.com" |
| `location` | String | Office location |
| `employees` | String | Number of employees. Supports numeric filters (`gt`, `lt`, etc.). |
| `icp` | Boolean | Match for Ideal Customer Profile |

## Examples

### List/Search Companies
```bash
# Filter by location
curl -s -G "https://your-api.example.com/api/companies/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     --data-urlencode "location__icontains=dubai" | jq .

# Filter by number of employees (numeric filtering on string field)
curl -s -G "https://your-api.example.com/api/companies/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     --data-urlencode "employees__gt=100" | jq .
```

### Create a New Company
```bash
curl -s -X POST "https://your-api.example.com/api/companies/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{
           "name": "Acme Corp",
           "domain": "acme.com",
           "location": "New York",
           "icp": true
         }' | jq .
```

### Bulk Create Companies (Simple)
```bash
curl -s -X POST "https://your-api.example.com/api/companies/import/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d "[{\"name\": \"Acme Corp\", \"domain\": \"acme.com\"}, {\"name\": \"Globex\", \"domain\": \"globex.com\"}]" | jq .
```

### Retrieve Company Details
```bash
curl -s -G "https://your-api.example.com/api/companies/{id}/" \
     -H "Authorization: Api-Key YOUR_KEY" | jq .
```

### Update Company Details (PATCH)
```bash
curl -s -X PATCH "https://your-api.example.com/api/companies/{id}/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{
           "employees": "500-1000",
           "arr": "$10M"
         }' | jq .
```
