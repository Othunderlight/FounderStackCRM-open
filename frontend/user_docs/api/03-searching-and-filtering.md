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

### Numeric/Date Filters
*   `__gt`: Greater than
*   `__lt`: Less than
*   `__gte`: Greater than or equal
*   `__lte`: Less than or equal

**Example:**
`GET /api/people/?conversion_rate__lt=30`

### Combining Filters
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
