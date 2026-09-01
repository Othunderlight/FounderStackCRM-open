# Searching and Filtering

The API provides powerful, flexible ways to find exactly the data you need.

## Case Insensitivity
All text-based searches and filters are **case-insensitive**. Searching for "Ahmad" is the same as searching for "ahmed".

## Global Search
Use the `search` parameter to perform a "fuzzy" match across multiple fields (Name, Email, Job Title, etc.).

**Example:**
`GET /api/people/?search=ahmed`
*Matches: "Ahmed Hassan", "Ahmad Al-Farsi", etc.*

## Advanced Filters
You can filter by specific fields using suffixes.

### Partial Match (`__icontains`)
`GET /api/people/?name__icontains=adm`
*Matches: "Admin", "Ahmad", "Roadman"*

### Exclusion Filters
*   `__notcontains`: Excludes records where the field contains the value.
*   `__exclude`: Excludes records where the field exactly matches the value.

**Example:**
`GET /api/people/?stage__exclude=Lost` (Shows everyone except those in 'Lost' stage)
`GET /api/companies/?name__notcontains=test`

### Numeric/Date Filters
*   `__gt`: Greater than
*   `__lt`: Less than
*   `__gte`: Greater than or equal
*   `__lte`: Less than or equal

**Note on Numeric Strings:** Fields like `Company.employees` are stored as text but support these numeric filters via automatic casting.

**Example:**
`GET /api/people/?conversion_rate__lt=30`
`GET /api/companies/?employees__gt=100`

### Date Specific Lookups
For `DateTimeField` fields, you can use `__date` to compare against a simple date string (`YYYY-MM-DD`).

**Example:**
`GET /api/interactions/?date__date=2024-04-26`

### Empty / Not Empty (`__isempty`)
Check if a field is empty (null or empty string) or not.

*   `__isempty=true`: Field is NULL or empty string.
*   `__isempty=false`: Field has a value.

**Example:**
`GET /api/people/?email__isempty=true` (Find people without email addresses)

### Relationship Filters (`relations`)
For tasks, notes, and activities, you can filter across *both* related person and related company names simultaneously.

*   `relations__icontains`: Match if either related name contains the value.
*   `relations__notcontains`: Exclude if either related name contains the value.
*   `relations__exclude`: Exclude if either related name exactly matches the value.

**Example:**
`GET /api/tasks/?relations__icontains=Acme`

## Combining Filters
You can chain as many filters as you want.

**Example: Complex Search**
Find people named "Ahmed" with a conversion rate less than 30% located in Dubai.
```bash
curl -s -G "https://your-api.example.com/api/people/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     --data-urlencode "name__icontains=ahmed" \
     --data-urlencode "conversion_rate__lt=30" \
     --data-urlencode "city=Dubai" | jq .
```

## Search-Only Mode
If your API Key is restricted to "Search Only", you **must** provide at least one query parameter. A bare request to list all records will return a `403 Forbidden`.
