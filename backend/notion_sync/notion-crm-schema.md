# FounderStack CRM → Notion Database Schema

This document maps the FounderStack CRM data model to Notion database structure. Share this with Notion AI to build your Notion CRM.

---

## Database 1: Companies
**Purpose:** Store company/organization information

| Notion Property | Type | Notes |
|----------------|------|-------|
| Name | Title | Company name |
| Domain | URL | Website domain |
| Employees | Number | Number of employees |
| Location | Text | Office location |
| LinkedIn | URL | LinkedIn company page |
| ARR | Text | Annual Recurring Revenue (e.g., "$1M-$5M") |
| ICP | Checkbox | Ideal Customer Profile match |
| Owner | People | Assigned team member |
| FounderStack ID | Text | CRM UUID (hidden, for sync) |
| Created At | Created Time | Auto-generated |
| Updated At | Last Edited Time | Auto-generated |

**Relations:**
- Has many People (linked to People database)
- Has many Opportunities (linked to Opportunities database)
- Has many Tasks (linked to Tasks database)
- Has many Notes (linked to Notes database)
- Has many Activities (linked to Activity Log database)

---

## Database 2: People (Contacts/Leads)
**Purpose:** Store individual contact information

| Notion Property | Type | Notes |
|----------------|------|-------|
| Name | Title | Full name |
| Email | Email | Contact email |
| Phone | Phone | Phone number |
| Job Title | Text | Position at company |
| Avatar | Files & Media | Profile photo URL |
| City | Text | Location |
| LinkedIn | URL | LinkedIn profile |
| Conversion Rate | Number (%) | Probability 0-100 |
| Stage | Select | Lead, Qualified, Negotiation, Closed, Lost |
| Lead Type | Select | Prospect, Cold Lead, Warm Lead, Hot Lead, Client |
| Lead Source | Select | Inbound, Outbound |
| Last Action | Text | Most recent activity |
| Recommended Action | Text | Suggested next step |
| Company | Relation | → Companies database |
| FounderStack ID | Text | CRM UUID (hidden, for sync) |
| Created By | Created By | Auto-generated |
| Created At | Created Time | Auto-generated |

**Relations:**
- Belongs to Company (Companies database)
- Has many Opportunities (linked to Opportunities database)
- Has many Tasks (linked to Tasks database)
- Has many Notes (linked to Notes database)
- Has many Activities (linked to Activity Log database)

---

## Database 3: Opportunities (Deals)
**Purpose:** Track sales opportunities and deals

| Notion Property | Type | Notes |
|----------------|------|-------|
| Name | Title | Opportunity/deal name |
| Value | Number ($) | Deal value/amount |
| Stage | Select | Screening, Lead, Qualified, Negotiation, Closed, Lost |
| Company | Relation | → Companies database |
| Contact | Relation | → People database (primary contact) |
| FounderStack ID | Text | CRM UUID (hidden, for sync) |
| Created By | Created By | Auto-generated |
| Created At | Created Time | Auto-generated |

---

## Database 4: Tasks
**Purpose:** Track action items and to-dos

| Notion Property | Type | Notes |
|----------------|------|-------|
| Title | Title | Task name |
| Description | Text | Detailed task info |
| Status | Select | Todo, In Progress, Done |
| Due Date | Date | Deadline |
| Assignee | People | Who's responsible |
| Created By | Created By | Auto-generated |
| Related Person | Relation | → People database |
| Related Company | Relation | → Companies database |
| FounderStack ID | Text | CRM UUID (hidden, for sync) |
| Created At | Created Time | Auto-generated |

---

## Database 5: Notes
**Purpose:** Store meeting notes and documentation

| Notion Property | Type | Notes |
|----------------|------|-------|
| Title | Title | Note title (default: "Untitled Note") |
| Content | Text | Full note body |
| Related Person | Relation | → People database |
| Related Company | Relation | → Companies database |
| FounderStack ID | Text | CRM UUID (hidden, for sync) |
| Created By | Created By | Auto-generated |
| Created At | Created Time | Auto-generated |

---

## Database 6: Activity Log
**Purpose:** Timeline of all interactions and activities

| Notion Property | Type | Notes |
|----------------|------|-------|
| Title | Title | Activity title |
| Type | Select | Email, Call, Meeting, Message, Update |
| Channel | Select | Email, LinkedIn, WhatsApp, System |
| Direction | Select | Received, Sent, System |
| Content | Text | Activity details |
| Date | Date | When activity occurred |
| Related Person | Relation | → People database |
| Related Company | Relation | → Companies database |
| User | People | Who performed the activity |
| FounderStack ID | Text | CRMCRM UUID (hidden, for sync) |
| Created At | Created Time | Auto-generated |

---

## Configuration Settings (Not a database)

These are workspace-wide settings that control dropdown options:

**Pipeline Stages (for People.stage and Opportunities.stage):**
1. Lead (gray)
2. Qualified (indigo)
3. Negotiation (yellow)
4. Closed (green)
5. Lost (red)

**Lead Types (for People.lead_type):**
1. Prospect (blue)
2. Cold Lead (cyan)
3. Warm Lead (orange)
4. Hot Lead (red)
5. Client (green)

**Task Status:**
1. Todo
2. In Progress
3. Done

**Activity Types:**
- email, call, meeting, msg, update

---

## Views to Create

For each database, create these standard views:

**Companies:**
- All Companies (table)
- ICP Targets (filtered: ICP = checked)
- By Location (board/group by location)

**People:**
- All Contacts (table)
- By Stage (board/group by stage)
- By Lead Type (board/group by lead type)
- Hot Leads (filtered: Lead Type = Hot Lead)
- My Contacts (filtered: Owner = me)

**Opportunities:**
- Pipeline (board by stage)
- By Value (table, sorted by value desc)
- This Month (filtered by created date)

**Tasks:**
- My Tasks (filtered: Assignee = me, Status ≠ Done)
- By Status (board)
- Overdue (filtered: Due Date < today, Status ≠ Done)
- All Tasks (table)

**Activity Log:**
- Timeline (timeline view by date)
- Recent Activity (table, sorted by date desc)
- By Type (board)

---

## Instructions for Notion AI

"Create a FounderStack CRM workspace with the following databases and relationships. Use the exact field names and property types specified above. Set up the relations between databases so that Companies can see their related People, Opportunities, Tasks, Notes, and Activities. People should show their company and related opportunities. Create the views as specified for easy navigation."
