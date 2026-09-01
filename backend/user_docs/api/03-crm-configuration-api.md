# CRM Configuration API

Manage your organization's lead pipeline settings and opportunity pipeline settings.

## Endpoints
*   `GET /api/config/mine/`: Retrieve your organization's configuration.
*   `PATCH /api/config/mine/`: Update configuration.

## Fields
| Field | Type | Description |
| :--- | :--- | :--- |
| `pipeline_stages` | Array | Lead stages used by `Person.stage`. |
| `opportunity_stages` | Array | Deal stages used by `Opportunity.deal_stage`. |
| `lead_types` | Array | List of lead type objects with `label` and `color`. |
| `lead_sources` | Array | List of lead source objects with `label` and `color`. |

## Default Values

**Pipeline Stages:**
```json
[
  {"label": "Lead", "color": "bg-gray-800 text-gray-400"},
  {"label": "Qualified", "color": "bg-indigo-900/40 text-indigo-400"},
  {"label": "Negotiation", "color": "bg-yellow-900/40 text-yellow-400"},
  {"label": "Closed", "color": "bg-green-900/40 text-green-400"},
  {"label": "Lost", "color": "bg-red-900/40 text-red-400"}
]
```

**Lead Types:**
```json
[
  {"label": "Prospect", "color": "bg-blue-900/40 text-blue-400"},
  {"label": "Cold Lead", "color": "bg-cyan-900/40 text-cyan-400"},
  {"label": "Warm Lead", "color": "bg-orange-900/40 text-orange-400"},
  {"label": "Hot Lead", "color": "bg-red-900/40 text-red-500"},
  {"label": "Client", "color": "bg-green-900/40 text-green-400"}
]
```

**Opportunity Stages:**
```json
[
  {"label": "Screening", "color": "bg-slate-900/40 text-slate-300"},
  {"label": "Qualified", "color": "bg-blue-900/40 text-blue-400"},
  {"label": "Proposal", "color": "bg-violet-900/40 text-violet-400"},
  {"label": "Negotiation", "color": "bg-amber-900/40 text-amber-400"},
  {"label": "Won", "color": "bg-green-900/40 text-green-400"},
  {"label": "Lost", "color": "bg-red-900/40 text-red-400"}
]
```

## Examples

### Get Your Configuration
```bash
curl -s -G "https://your-api.example.com/api/config/mine/" \
     -H "Authorization: Api-Key YOUR_KEY" | jq .
```

### Update Pipeline Stages
```bash
curl -s -X PATCH "https://your-api.example.com/api/config/mine/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{
           "pipeline_stages": [
             {"label": "Lead", "color": "bg-gray-800 text-gray-400"},
             {"label": "Qualified", "color": "bg-indigo-900/40 text-indigo-400"},
             {"label": "Proposal", "color": "bg-purple-900/40 text-purple-400"},
             {"label": "Closed", "color": "bg-green-900/40 text-green-400"},
             {"label": "Lost", "color": "bg-red-900/40 text-red-400"}
           ]
         }' | jq .
```

### Update Lead Types
```bash
curl -s -X PATCH "https://your-api.example.com/api/config/mine/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{
           "lead_types": [
             {"label": "Prospect", "color": "bg-blue-900/40 text-blue-400"},
             {"label": "Partner", "color": "bg-teal-900/40 text-teal-400"},
             {"label": "Client", "color": "bg-green-900/40 text-green-400"}
           ]
         }' | jq .
```

### Rename a Stage (Bulk Update)
When renaming a lead stage, all `Person.stage` records with the old stage name will be updated automatically.

```bash
curl -s -X PATCH "https://your-api.example.com/api/config/mine/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{
           "rename_stage": {
             "old": "Negotiation",
             "new": "Proposal"
           }
         }' | jq .
```

### Update Opportunity Stages
```bash
curl -s -X PATCH "https://your-api.example.com/api/config/mine/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{
           "opportunity_stages": [
             {"label": "Screening", "color": "bg-slate-900/40 text-slate-300"},
             {"label": "Qualified", "color": "bg-blue-900/40 text-blue-400"},
             {"label": "Proposal", "color": "bg-violet-900/40 text-violet-400"},
             {"label": "Negotiation", "color": "bg-amber-900/40 text-amber-400"},
             {"label": "Won", "color": "bg-green-900/40 text-green-400"},
             {"label": "Lost", "color": "bg-red-900/40 text-red-400"}
           ]
         }' | jq .
```

### Rename an Opportunity Stage (Bulk Update)
When renaming an opportunity stage, all `Opportunity.deal_stage` records with the old value will be updated automatically.

```bash
curl -s -X PATCH "https://your-api.example.com/api/config/mine/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{
           "rename_opportunity_stage": {
             "old": "Negotiation",
             "new": "Proposal"
           }
         }' | jq .
```

### Rename a Lead Type (Bulk Update)
When renaming a lead type, all People with the old lead type will be updated automatically.

```bash
curl -s -X PATCH "https://your-api.example.com/api/config/mine/" \
     -H "Authorization: Api-Key YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{
           "rename_lead_type": {
             "old": "Cold Lead",
             "new": "New Lead"
           }
         }' | jq .
```
