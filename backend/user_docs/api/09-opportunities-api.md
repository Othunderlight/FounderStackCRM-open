# Opportunities API

Track deals and sales opportunities.

## Endpoints
*   `GET /api/opportunities/`: List/Search opportunities.
*   `POST /api/opportunities/`: Create a new opportunity.
*   `POST /api/opportunities/import/`: Bulk create opportunities.
*   `GET /api/opportunities/{id}/`: Retrieve details.
*   `PATCH /api/opportunities/{id}/`: Update details.
*   `DELETE /api/opportunities/{id}/`: Delete an opportunity.

## Fields
| Field | Type | Description |
| :--- | :--- | :--- |
| `name` | String | Opportunity name (Required) |
| `value` | Decimal | Monetary value of the deal |
| `deal_stage` | String | Deal stage, e.g. "Screening", "Negotiation", "Won", "Lost" |
| `expected_close_date` | Date | Expected close date in `YYYY-MM-DD` format |
| `probability` | Integer | Win probability from `0` to `100` |
| `company` | UUID | Link to the Company. Required for every opportunity. |
| `primary_contact` | UUID | Link to the primary contact (Person) |
| `owner` | UUID | User responsible for the opportunity |
| `created_by` | UUID | User who created the opportunity (read-only) |

## Response Extras
The opportunity serializer also returns:

* `company_name`
* `primary_contact_name`
* `owner_name`
* `owner_details`
* `created_by_name`

## Examples

### List Large Opportunities
```bash
curl -s -G "https://your-api.example.com/api/opportunities/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     --data-urlencode "value__gt=50000" | jq .
```

### Create a New Deal
```bash
curl -s -X POST "https://your-api.example.com/api/opportunities/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{
           "name": "Enterprise License Agreement",
           "value": 120000,
           "deal_stage": "Negotiation",
           "expected_close_date": "2026-05-30",
           "probability": 75,
           "company": "COMPANY_UUID",
           "primary_contact": "PERSON_UUID",
           "owner": "USER_UUID"
         }' | jq .
```

### Bulk Create Opportunities (Simple)
```bash
curl -s -X POST "https://your-api.example.com/api/opportunities/import/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d "[{\"name\": \"Deal A\", \"value\": 1000}, {\"name\": \"Deal B\", \"value\": 5000}]" | jq .
```

### Bulk Create with Auto-linking
```bash
curl -s -X POST "https://your-api.example.com/api/opportunities/import/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{
           "data": [
             {
               "name": "Expansion",
               "company": "Acme Corp",
               "primary_contact": "John Doe",
               "deal_stage": "Proposal"
             },
             { "name": "Renewal", "company": "Globex" }
           ],
           "auto_create": { "company": true, "primary_contact": true }
         }' | jq .
```

### Change Deal Stage
```bash
curl -s -X PATCH "https://your-api.example.com/api/opportunities/{id}/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{
           "deal_stage": "Won",
           "probability": 100
         }' | jq .
```

## Notes
* `deal_stage` replaces the old `stage` field for opportunities.
* `primary_contact` replaces the old `contact` field for opportunities.
* `company` is required by the API even though older records may still exist without one.
