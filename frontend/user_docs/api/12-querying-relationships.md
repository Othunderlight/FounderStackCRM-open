# Querying Related Data

The CRM API makes it easy to find data related to a specific Person or Company. There are two main ways to do this: using specific resource filters or using the integrated "Context" endpoint.

## 1. Using the Context API (Recommended)
If you want to get everything related to a Person (tasks, notes, activities) in a single request, use the `/context/` endpoint.

**Endpoint:** `GET /api/people/{id}/context/`

### Query Parameters
| Parameter | Description |
| :--- |
| `sections` | Comma-separated list of sections to include: `general`, `notes`, `context` (activities), `tasks`. Use `all` to include everything. |

### Example: Get Everything for a Person
```bash
curl -s -G "https://your-api.example.com/api/people/{PERSON_ID}/context/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     --data-urlencode "sections=all" | jq .
```

### Response Structure
The response will contain the full set of fields for each resource, identical to their primary endpoints:
*   **general**: Full Person object (including `email`, `phone`, `lead_source`, `created_by_name`, etc.)
*   **tasks**: Array of full Task objects.
*   **notes**: Array of full Note objects.
*   **activities**: Array of full Activity Log objects.

---

## 2. Using Resource Filters
You can also query each resource type individually using the `related_person` or `primary_contact` filters.

### Query Tasks for a Person
`GET /api/tasks/?related_person={PERSON_ID}`

### Query Notes for a Person
`GET /api/notes/?related_person={PERSON_ID}`

### Query Activities (Logs) for a Person
`GET /api/activities/?related_person={PERSON_ID}`

### Query Opportunities for a Person
Note: Opportunities use the field `primary_contact` instead of `related_person`.
`GET /api/opportunities/?primary_contact={PERSON_ID}`

---

## 3. Finding the Company
To find which company a person belongs to, check the `company` field in the Person's details.

**Example:**
1. Get person: `GET /api/people/{PERSON_ID}/`
2. Look for the `"company"` field in the JSON response (it will be the Company ID).
3. Get company details: `GET /api/companies/{COMPANY_ID}/`

---

## 4. Querying by Company
Similarly, you can query items related to a Company:

*   **People in a Company:** `GET /api/people/?company={COMPANY_ID}`
*   **Tasks for a Company:** `GET /api/tasks/?related_company={COMPANY_ID}`
*   **Notes for a Company:** `GET /api/notes/?related_company={COMPANY_ID}`
*   **Activities for a Company:** `GET /api/activities/?related_company={COMPANY_ID}`
*   **Opportunities for a Company:** `GET /api/opportunities/?company={COMPANY_ID}`
