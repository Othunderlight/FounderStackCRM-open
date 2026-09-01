# API Filtering & Sorting Documentation

This document provides complete documentation for the backend API filtering, sorting, and pagination capabilities. Use this as a reference for frontend implementation.

---

## Table of Contents

1. [Overview](#overview)
2. [Base URL & Authentication](#base-url--authentication)
3. [API Endpoints](#api-endpoints)
4. [Pagination](#pagination)
5. [Search](#search)
6. [Sorting (Ordering)](#sorting-ordering)
7. [Filtering](#filtering)
8. [Per-Endpoint Documentation](#per-endpoint-documentation)
9. [Combining Filters](#combining-filters)
10. [Special Features](#special-features)
11. [Cheat Sheet](#cheat-sheet)

---

## Overview

The API is built with **Django REST Framework (DRF)** and provides:

- **django-filter** for advanced filtering via FilterSets
- **Custom FuzzySearchFilter** for relevance-based search
- **DRF's OrderingFilter** for sorting
- **HybridPagination** supporting both page-based and offset-based pagination

---

## Base URL & Authentication

**Base URL:** `/api/`

All endpoints require authentication via:
- **JWT Token** in the `Authorization` header: `Bearer <token>`
- **Session Authentication** for browser-based access

---

## API Endpoints

| Endpoint | HTTP Methods | Description |
|----------|--------------|-------------|
| `/api/connection-test/` | GET | Test API connectivity |
| `/api/org-users/` | GET | Get users in the same organization |
| `/api/search/` | GET | Global cross-model search |
| `/api/companies/` | GET, POST, PUT, PATCH, DELETE | Company management |
| `/api/people/` | GET, POST, PUT, PATCH, DELETE | Person/Contact management |
| `/api/opportunities/` | GET, POST, PUT, PATCH, DELETE | Opportunity management |
| `/api/tasks/` | GET, POST, PUT, PATCH, DELETE | Task management |
| `/api/notes/` | GET, POST, PUT, PATCH, DELETE | Note management |
| `/api/activities/` | GET, POST, PUT, PATCH, DELETE | Activity log management |
| `/api/views/` | GET, POST, PUT, PATCH, DELETE | Custom saved views |
| `/api/reports/` | GET, POST, PUT, PATCH, DELETE | Report management |
| `/api/files/` | GET, POST, PUT, PATCH, DELETE | File management |
| `/api/interaction-types/` | GET, POST, PUT, PATCH, DELETE | Interaction type categories |
| `/api/interactions/` | GET, POST, PUT, PATCH, DELETE | Interaction log entries |
| `/api/sync-records/` | GET, POST, PUT, PATCH, DELETE | Sync state tracking |
| `/api/sync-logs/` | GET, POST, PUT, PATCH, DELETE | Sync audit logs |
| `/api/dashboard-configs/` | GET, POST, PUT, PATCH, DELETE | Dashboard chart configs |
| `/api/config/` | GET, PATCH | CRM configuration (org-level) |
| `/api/config/mine/` | GET, PATCH | Current org config (convenience) |

---

## Pagination

The API supports **two pagination modes**:

### Mode 1: Page-based (default)

```
GET /api/people/?page=1
GET /api/people/?page=2
```

### Mode 2: Offset/Limit (triggered when `limit` or `offset` is present)

```
GET /api/people/?limit=20&offset=0
GET /api/people/?limit=20&offset=20
```

### Pagination Parameters

| Parameter | Description | Default | Max |
|-----------|-------------|---------|-----|
| `page` | Page number (for page mode) | 1 | - |
| `page_size` | Items per page (for page mode) | 15 | 1000 |
| `limit` | Number of items (for offset mode) | 15 | 1000 |
| `offset` | Starting position (for offset mode) | 0 | - |

### Response Format

```json
{
  "count": 156,
  "next": "http://api.example.com/api/people/?limit=15&offset=30",
  "previous": "http://api.example.com/api/people/?limit=15&offset=0",
  "results": [
    { /* object data */ }
  ]
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `count` | integer | Total number of matching records |
| `next` | string/null | URL to next page, or null if no more |
| `previous` | string/null | URL to previous page, or null if first page |
| `results` | array | Array of matching objects |

---

## Search

### Global Search

**Endpoint:** `GET /api/search/`

| Parameter | Required | Description |
|-----------|----------|-------------|
| `q` | Yes | Search query string |

**Example:**
```
GET /api/search/?q=acme
```

**Response:**
```json
{
  "results": [
    {
      "type": "person",
      "id": "uuid-here",
      "label": "John Doe",
      "sub_label": "CEO at Acme Corp",
      "path": "/people/uuid-here"
    },
    {
      "type": "company",
      "id": "uuid-here",
      "label": "Acme Corporation",
      "sub_label": "acme.com",
      "path": "/companies/uuid-here"
    }
  ]
}
```

**Note:** Searches across People, Companies, Tasks, and Notes with relevance scoring.

---

### Per-Endpoint Search

Each ViewSet supports fuzzy search using the `search` query parameter:

```
GET /api/people/?search=john
GET /api/companies/?search=acme
```

#### Fuzzy Search Priority Scoring

| Score | Match Type |
|-------|------------|
| 100 | Exact match on any field |
| 80 | Starts with full query |
| 60 | Contains full query |
| 50 | Starts with first word |
| 40 | Contains first word |
| 20 | All words appear somewhere |

#### Search Fields by Endpoint

| Endpoint | Search Fields |
|----------|---------------|
| `/api/companies/` | name, domain, location |
| `/api/people/` | name, email, job_title, city |
| `/api/opportunities/` | name, company__name, primary_contact__name |
| `/api/tasks/` | title, description, related_person__name, related_company__name |
| `/api/notes/` | title, content |
| `/api/activities/` | title, content, related_person__name, related_company__name |
| `/api/files/` | name, public_url |
| `/api/interactions/` | notes, interaction_type__name, related_person__name, related_company__name |

---

## Sorting (Ordering)

Use the `ordering` query parameter:

```
GET /api/people/?ordering=name
GET /api/people/?ordering=-created_at
```

Prefix with `-` for descending order (no prefix = ascending).

### Ordering Fields by Endpoint

| Endpoint | Sortable Fields |
|----------|-----------------|
| `/api/companies/` | name, created_at, employees |
| `/api/people/` | name, created_at, conversion_rate, stage |
| `/api/opportunities/` | name, value, deal_stage, probability, expected_close_date, created_at |
| `/api/tasks/` | title, status, due_date, created_at |
| `/api/notes/` | title, created_at |
| `/api/activities/` | date, type |
| `/api/sync-records/` | created_at, updated_at, last_synced, entity_type, sync_status |
| `/api/sync-logs/` | created_at, status, started_at, completed_at |
| `/api/interaction-types/` | name, created_at |
| `/api/interactions/` | date, interaction_type |
| `/api/files/` | name, created_at |

---

## Filtering

### Filter Parameter Format

Filters are applied using the format: `field__lookup=value`

```
GET /api/people/?name__icontains=john&stage=Lead
```

### Standard Lookup Expressions

| Lookup | Description | Example |
|--------|-------------|---------|
| `exact` | Exact match | `?id=uuid` |
| `iexact` | Case-insensitive exact | `?stage__iexact=lead` |
| `icontains` | Case-insensitive contains | `?name__icontains=john` |
| `gt` | Greater than | `?value__gt=1000` |
| `gte` | Greater than or equal | `?value__gte=1000` |
| `lt` | Less than | `?value__lt=100` |
| `lte` | Less than or equal | `?value__lte=100` |
| `isnull` | Check for NULL | `?company__isnull=true` |
| `date` | Date comparison | `?created_at__date=2024-01-15` |

### Custom Filter Types

#### Exclusion Filters (NOT Contains)
Format: `field__notcontains=value`

```
GET /api/people/?name__notcontains=former
GET /api/companies/?domain__notcontains=temp
```

#### Exact Exclusion (NOT Equals)
Format: `field__exclude=value`

```
GET /api/people/?stage__exclude=Lead
GET /api/tasks/?status__exclude=Done
```

#### Is Empty / Is Not Empty
Format: `field__isempty=true` or `field__isempty=false`

```
GET /api/people/?email__isempty=true      // People without email
GET /api/people/?company__isempty=false  // People with company assigned
```

#### Relations Filter
Format: `relations__icontains=value` (searches both person and company names)

```
GET /api/tasks/?relations__icontains=acme
GET /api/notes/?relations__icontains=john
```

#### Relations Exclusion
Format: `relations__notcontains=value` or `relations__exclude=value`

```
GET /api/tasks/?relations__notcontains=acme
```

---

## Per-Endpoint Documentation

### `/api/people/` (PersonViewSet)

#### Available Filter Parameters

| Parameter | Type | Lookups Available |
|-----------|------|-------------------|
| `id` | UUID | exact |
| `name` | string | iexact, icontains, notcontains, isempty |
| `email` | string | iexact, icontains, notcontains, isempty |
| `phone` | string | iexact, icontains, notcontains, isempty |
| `job_title` | string | iexact, icontains, notcontains, isempty |
| `city` | string | iexact, icontains, notcontains, isempty |
| `linkedin` | URL | iexact, icontains, isempty |
| `stage` | string | iexact, icontains, notcontains, exclude, isempty |
| `lead_type` | string | iexact, icontains, notcontains, exclude, isempty |
| `lead_source` | string | iexact, icontains |
| `last_action` | string | iexact, icontains, notcontains, isempty |
| `recommended_action` | string | iexact, icontains, isempty |
| `conversion_rate` | integer | exact, gt, lt, gte, lte, isnull |
| `company` | UUID | exact, isnull |
| `company__name` | string | icontains |
| `created_by` | UUID | exact |
| `created_by__username` | string | exact, icontains |
| `created_by__first_name` | string | exact, icontains |
| `created_at` | datetime | exact, gt, lt, gte, lte, date |
| `updated_at` | datetime | exact, gt, lt, gte, lte, date |

#### Search Fields
`name`, `email`, `job_title`, `city`

#### Sortable Fields
`name`, `created_at`, `conversion_rate`, `stage`

#### Example Requests
```
GET /api/people/?stage=Lead&lead_type=Prospect
GET /api/people/?name__icontains=john&city=NYC
GET /api/people/?conversion_rate__gte=50&conversion_rate__lte=100
GET /api/people/?company__isnull=false&stage__exclude=Lost
```

---

### `/api/companies/` (CompanyViewSet)

#### Available Filter Parameters

| Parameter | Type | Lookups Available |
|-----------|------|-------------------|
| `id` | UUID | exact |
| `name` | string | iexact, icontains, notcontains, isnull |
| `domain` | string | iexact, icontains, notcontains, isnull |
| `location` | string | iexact, icontains, notcontains, isnull |
| `linkedin` | URL | iexact, icontains, isnull |
| `arr` | string | iexact, icontains, isnull |
| `employees` | integer | exact, gt, lt, gte, lte, isnull |
| `icp` | boolean | exact, exclude |
| `owner` | UUID | exact |
| `owner__first_name` | string | exact, icontains |
| `created_at` | datetime | gt, lt, gte, lte |
| `updated_at` | datetime | gt, lt, gte, lte |

#### Search Fields
`name`, `domain`, `location`

#### Sortable Fields
`name`, `created_at`, `employees`

#### Example Requests
```
GET /api/companies/?icp=true
GET /api/companies/?location__icontains=california
GET /api/companies/?employees__gte=100&employees__lte=500
```

---

### `/api/opportunities/` (OpportunityViewSet)

#### Available Filter Parameters

| Parameter | Type | Lookups Available |
|-----------|------|-------------------|
| `id` | UUID | exact |
| `name` | string | iexact, icontains, notcontains, isnull |
| `deal_stage` | string | iexact, icontains, notcontains, exclude, isnull |
| `value` | decimal | exact, gt, lt, gte, lte, isnull |
| `probability` | integer | exact, gt, lt, gte, lte, isnull |
| `expected_close_date` | date | exact, gt, lt, gte, lte, isnull |
| `company` | UUID | exact, isnull |
| `company__name` | string | icontains |
| `primary_contact` | UUID | exact, isnull |
| `primary_contact__name` | string | icontains |
| `owner` | UUID | exact, isnull |
| `owner__first_name` | string | iexact, icontains |
| `created_by` | UUID | exact |
| `created_by__first_name` | string | iexact, icontains |
| `created_at` | datetime | gt, lt, gte, lte |
| `updated_at` | datetime | gt, lt, gte, lte |

#### Search Fields
`name`, `company__name`, `primary_contact__name`

#### Sortable Fields
`name`, `value`, `deal_stage`, `probability`, `expected_close_date`, `created_at`

#### Example Requests
```
GET /api/opportunities/?deal_stage=Negotiation
GET /api/opportunities/?value__gte=10000
GET /api/opportunities/?company__name__icontains=acme
```

---

### `/api/tasks/` (TaskViewSet)

#### Available Filter Parameters

| Parameter | Type | Lookups Available |
|-----------|------|-------------------|
| `id` | UUID | exact |
| `title` | string | iexact, icontains, notcontains, isnull |
| `description` | string | iexact, icontains, notcontains, isnull |
| `status` | string | iexact, icontains, notcontains, exclude, isnull |
| `assignee` | UUID | exact, isnull |
| `created_by` | UUID | exact |
| `created_by__first_name` | string | iexact, icontains |
| `related_person` | UUID | exact, isnull |
| `related_person__name` | string | icontains |
| `related_company` | UUID | exact, isnull |
| `related_company__name` | string | icontains |
| `due_date` | datetime | gt, lt, gte, lte, isnull |
| `created_at` | datetime | gt, lt, gte, lte |
| `updated_at` | datetime | gt, lt, gte, lte |
| `relations` | string | icontains, notcontains, exclude |

#### Search Fields
`title`, `description`, `related_person__name`, `related_company__name`

#### Sortable Fields
`title`, `status`, `due_date`, `created_at`

#### Special Parameters

| Parameter | Description |
|-----------|-------------|
| `assignee=Me` | Returns tasks assigned to current user |

#### Example Requests
```
GET /api/tasks/?status=Todo
GET /api/tasks/?assignee=Me&status=Todo
GET /api/tasks/?due_date__gte=2024-01-01&due_date__lte=2024-12-31
GET /api/tasks/?relations__icontains=acme
```

---

### `/api/notes/` (NoteViewSet)

#### Available Filter Parameters

| Parameter | Type | Lookups Available |
|-----------|------|-------------------|
| `id` | UUID | exact |
| `title` | string | iexact, icontains, notcontains, isnull |
| `content` | string | iexact, icontains, notcontains, isnull |
| `related_person` | UUID | exact, isnull |
| `related_person__name` | string | icontains |
| `related_company` | UUID | exact, isnull |
| `related_company__name` | string | icontains |
| `created_by` | UUID | exact |
| `created_by__first_name` | string | iexact, icontains |
| `created_at` | datetime | gt, lt, gte, lte |
| `updated_at` | datetime | gt, lt, gte, lte |
| `relations` | string | icontains, notcontains, exclude |

#### Search Fields
`title`, `content`

#### Sortable Fields
`title`, `created_at`

#### Example Requests
```
GET /api/notes/?relations__icontains=acme
GET /api/notes/?created_by__first_name__icontains=john
```

---

### `/api/activities/` (ActivityLogViewSet)

#### Available Filter Parameters

| Parameter | Type | Lookups Available |
|-----------|------|-------------------|
| `id` | UUID | exact |
| `title` | string | iexact, icontains, notcontains, isnull |
| `content` | string | iexact, icontains, notcontains, isnull |
| `type` | string | iexact, icontains, notcontains, exclude, isnull |
| `direction` | string | iexact, icontains, notcontains, exclude, isnull |
| `channel` | string | iexact, icontains, notcontains, exclude, isnull |
| `related_person` | UUID | exact, in, isnull |
| `related_person__name` | string | icontains |
| `related_company` | UUID | exact, isnull |
| `related_company__name` | string | icontains |
| `user` | UUID | exact |
| `user__first_name` | string | iexact, icontains |
| `date` | datetime | gt, lt, gte, lte, isnull |
| `relations` | string | icontains, notcontains, exclude |

#### Search Fields
`title`, `content`, `related_person__name`, `related_company__name`

#### Sortable Fields
`date`, `type`

#### Example Requests
```
GET /api/activities/?type=email&channel=linkedin
GET /api/activities/?date__gte=2024-01-01&date__lte=2024-12-31
```

---

### `/api/interactions/` (InteractionLogViewSet)

#### Available Filter Parameters

| Parameter | Type | Lookups Available |
|-----------|------|-------------------|
| `id` | UUID | exact |
| `notes` | string | iexact, icontains, notcontains, isnull |
| `interaction_type` | UUID | exact, isnull |
| `interaction_type__name` | string | icontains, notcontains, exclude |
| `activity_log` | UUID | exact, isnull |
| `activity_log__channel` | string | exact, iexact, icontains |
| `activity_log__direction` | string | exact, iexact, icontains |
| `date` | datetime | exact, date, gt, lt, gte, lte, isnull |
| `related_person` | UUID | exact, isnull |
| `related_person__name` | string | icontains |
| `related_company` | UUID | exact, isnull |
| `related_company__name` | string | icontains |
| `created_by` | UUID | exact |
| `created_by__first_name` | string | iexact, icontains |
| `created_at` | datetime | gt, lt, gte, lte |
| `updated_at` | datetime | gt, lt, gte, lte |
| `relations` | string | icontains, notcontains, exclude |

#### Search Fields
`notes`, `interaction_type__name`, `related_person__name`, `related_company__name`

#### Sortable Fields
`date`, `interaction_type`

#### Special Parameters

| Parameter | Description |
|-----------|-------------|
| `distinct=true` | Returns count of distinct entities |

#### Example Response with distinct
```json
{
  "count": 42,
  "results": [],
  "next": null,
  "previous": null
}
```

---

### `/api/sync-records/` (SyncRecordViewSet)

#### Available Filter Parameters

| Parameter | Type | Lookups Available |
|-----------|------|-------------------|
| `entity_type` | string | exact, iexact, icontains, notcontains, isnull |
| `entity_id` | UUID | exact |
| `external_id` | string | exact, icontains, notcontains, isnull |
| `sync_status` | string | exact, iexact, exclude |
| `last_synced` | datetime | gt, lt, gte, lte, isnull |
| `created_at` | datetime | gt, lt, gte, lte |
| `updated_at` | datetime | gt, lt, gte, lte |

#### Sortable Fields
`created_at`, `updated_at`, `last_synced`, `entity_type`, `sync_status`

#### Example Requests
```
GET /api/sync-records/?sync_status=pending
GET /api/sync-records/?entity_type=person&sync_status=error
```

---

### `/api/sync-logs/` (SyncLogViewSet)

#### Available Filter Parameters

| Parameter | Type | Lookups Available |
|-----------|------|-------------------|
| `entity_type` | string | exact, iexact, icontains |
| `entity_id` | UUID | exact |
| `status` | string | exact, iexact, exclude |
| `direction` | string | exact, iexact |
| `external_system` | string | exact, iexact |
| `error_message` | string | exact, icontains |
| `source` | string | exact, iexact, icontains, notcontains |
| `started_at` | datetime | gt, lt, gte, lte |
| `completed_at` | datetime | gt, lt, gte, lte, isnull |

#### Sortable Fields
`created_at`, `status`, `started_at`, `completed_at`

---

### `/api/interaction-types/` (InteractionTypeViewSet)

#### Available Filter Parameters

| Parameter | Type | Lookups Available |
|-----------|------|-------------------|
| `id` | UUID | exact |
| `name` | string | exact, iexact, icontains, notcontains, isnull |
| `description` | string | exact, iexact, icontains, notcontains, isnull |
| `color` | string | exact, iexact, icontains, isnull |
| `created_at` | datetime | gt, lt, gte, lte |
| `updated_at` | datetime | gt, lt, gte, lte |

#### Sortable Fields
`name`, `created_at`

---

## Combining Filters

All filter parameters can be combined in a single request:

### Example Combined Requests

```
# People: search + filter + sort + paginate
GET /api/people/?search=john&stage=Lead&ordering=-created_at&page_size=20

# Tasks: filter by assignee + status + date range
GET /api/tasks/?assignee=Me&status=Todo&due_date__gte=2024-01-01

# Activities: filter by type + date range + sort
GET /api/activities/?type=email&date__gte=2024-01-01&ordering=-date

# Companies: multiple filters
GET /api/companies/?icp=true&employees__gte=100&location__icontains=california

# Opportunities: deal stage + value range
GET /api/opportunities/?deal_stage__exclude=Lost&value__gte=10000&ordering=-value
```

---

## Special Features

### Bulk Import

Each major entity supports bulk import via POST:

**Endpoint:** `POST /api/{entity}/import/`

**Request Format:**
```json
{
  "data": [
    { "name": "John", "email": "john@example.com" },
    { "name": "Jane", "email": "jane@example.com" }
  ],
  "auto_create": {
    "company": true,
    "related_person": true
  }
}
```

**Note:** Auto-create will resolve company/person names to IDs or create them if they don't exist.

---

### Person Context Endpoint

**URL:** `GET /api/people/{id}/context/`

**Query Parameters:**

| Parameter | Description | Default |
|-----------|-------------|---------|
| `sections` | Comma-separated list: general, notes, context, tasks, all | general |

**Example:**
```
GET /api/people/{id}/context/?sections=general,notes,tasks
```

---

### Person Export Endpoint

**URL:** `GET /api/people/{id}/export/`

**Query Parameters:**

| Parameter | Values | Default |
|-----------|--------|---------|
| `scope` | partial, full | partial |

---

## Cheat Sheet

### Pagination
| Mode | Parameters | Example |
|------|------------|---------|
| Page-based | `page`, `page_size` | `?page=1&page_size=20` |
| Offset/Limit | `limit`, `offset` | `?limit=20&offset=0` |

### Search
| Type | Parameter | Example |
|------|-----------|---------|
| Global search | `q` | `?q=term` |
| Per-entity search | `search` | `?search=term` |

### Sorting
| Order | Format | Example |
|-------|--------|---------|
| Ascending | `ordering=field` | `?ordering=name` |
| Descending | `ordering=-field` | `?ordering=-created_at` |

### Common Filters
| Filter | Description | Example |
|--------|-------------|---------|
| `__icontains` | Contains (case-insensitive) | `?field__icontains=value` |
| `__notcontains` | Exclude matches | `?field__notcontains=value` |
| `__exact` | Equals | `?field__exact=value` |
| `__exclude` | Not equals | `?field__exclude=value` |
| `__gt` | Greater than | `?field__gt=value` |
| `__gte` | Greater than or equal | `?field__gte=value` |
| `__lt` | Less than | `?field__lt=value` |
| `__lte` | Less than or equal | `?field__lte=value` |
| `__isempty=true` | Is empty | `?field__isempty=true` |
| `__isempty=false` | Is not empty | `?field__isempty=false` |
| `__isnull=true` | Is NULL | `?field__isnull=true` |
| `__isnull=false` | Is not NULL | `?field__isnull=false` |

---

## Response Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 204 | No Content (successful delete) |
| 400 | Bad Request (invalid parameters) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 500 | Internal Server Error |

---

## Error Response Format

```json
{
  "detail": "Error message description",
  "field_name": ["Error for this field"]
}
```
