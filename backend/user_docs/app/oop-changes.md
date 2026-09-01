# Opportunity And Pipeline Changes

This document is the frontend handoff for the opportunity and pipeline changes that were implemented in the backend.

Send this file together with the referenced docs below.

## Files To Read With This Document

Frontend team should review these files together:

- `user_docs/app/oop-changes.md`
- `user_docs/app/rbac.md`
- `user_docs/api/09-opportunities-api.md`
- `user_docs/api/03-crm-configuration-api.md`
- `user_docs/api/04-people-api.md`
- `user_docs/api/API_FILTERING_SORTING_DOCUMENTATION.md`
- `user_docs/api/12-querying-relationships.md`
- `user_docs/api/17-opportunity-model-update-frontend.md`

For RBAC and hidden-field behavior, also review:

- `docs/internal/rbac-api-reference.md`
- `docs/internal/rbac-hidden-fields-extension.md`
- `docs/internal/rbac-hidden-fields-ui-contract.md`

## Why We Changed This

We split the system more clearly between:

- leads
- contacts
- opportunities

The important business decision is:

- `Person` remains the lead/contact record
- `Opportunity` is the deal record

So a person can start as a lead, move through lead stages, and later be linked to one or more opportunities.

## Final System Decisions

### 1. Person stays the lead record

We intentionally kept these fields on `Person`:

- `stage`
- `lead_type`
- `lead_source`

This was kept to avoid breaking other apps and because the agreed workflow is:

- every new person starts as a lead
- later that lead can be converted into one or more opportunities

So in frontend terms:

- `Person.stage` is the lead stage
- `Person.lead_type` is the lead classification
- `Person.lead_source` is where the lead came from

### 2. Opportunity is the deal record

Opportunity now represents the actual revenue/deal object.

The final opportunity shape is:

- `name`
- `value`
- `deal_stage`
- `expected_close_date`
- `probability`
- `company`
- `primary_contact`
- `owner`
- `created_by`

### 3. Lead stages and opportunity stages are separate

This is important.

The system now treats these as two different pipelines:

- lead stages for `Person.stage`
- opportunity stages for `Opportunity.deal_stage`

Backend config now has:

- `pipeline_stages` for leads
- `opportunity_stages` for opportunities
- `lead_types`
- `lead_sources`

Frontend must not use the same stage list for both people and opportunities anymore.

## Final Relationship Rules

These are the rules the frontend should assume:

- one person can have zero, one, or many opportunities
- one company can have zero, one, or many opportunities
- an opportunity belongs to one company
- an opportunity may have one primary contact

Important implementation rule:

- the API requires `company` for opportunities
- `primary_contact` is optional
- if `primary_contact` has a company, it must match the opportunity `company`

## Field Changes The Frontend Must Apply

### Opportunity field rename

Old:

- `stage`
- `contact`

New:

- `deal_stage`
- `primary_contact`

This is the main contract change.

Every frontend opportunity screen must be updated to use the new field names.

### New opportunity fields

Frontend must support:

- `expected_close_date`
- `probability`
- `owner`

### New person field

Frontend should support:

- `owner`

This is the person/lead owner, separate from `created_by`.

## API Contract Summary

### Opportunity create/update payload

Use this shape:

```json
{
  "name": "Enterprise Expansion",
  "value": "25000.00",
  "deal_stage": "Proposal",
  "expected_close_date": "2026-05-30",
  "probability": 70,
  "company": "COMPANY_UUID",
  "primary_contact": "PERSON_UUID",
  "owner": "USER_UUID"
}
```

### Opportunity response extras

The API also returns these helper fields:

- `company_name`
- `primary_contact_name`
- `owner_name`
- `owner_details`
- `created_by_name`

### Opportunity validation rules

Frontend should enforce these before submit when possible:

- `company` is required
- `probability` must be between `0` and `100`
- `owner` must be a user in the same organization
- `primary_contact` is optional
- if a contact is selected and belongs to a company, that company must match the selected opportunity company

## CRM Configuration Changes

### What stays the same

Keep using:

- `pipeline_stages` for lead stages
- `lead_types`
- `lead_sources`

### What is new

Use:

- `opportunity_stages` for opportunity stage dropdowns and filters

### Rename operations

Config rename actions now work like this:

- `rename_stage` updates lead stages on `Person.stage`
- `rename_opportunity_stage` updates deal stages on `Opportunity.deal_stage`

Frontend should not assume renaming lead stages also renames opportunity stages.

## Required Frontend Changes

### Opportunity pages and forms

Update all opportunity screens:

- create form
- edit form
- detail page or drawer
- list page
- filters
- saved views
- kanban/pipeline board
- summary cards

Required changes:

- replace every use of `stage` with `deal_stage`
- replace every use of `contact` with `primary_contact`
- add `expected_close_date`
- add `probability`
- add `owner`
- use `opportunity_stages` instead of `pipeline_stages`

### Person pages and forms

Keep the existing lead fields on people:

- `stage`
- `lead_type`
- `lead_source`

Add support for:

- `owner`

Do not rename `Person.stage` in frontend code. It must stay as-is.

### Shared selectors and state

Update any shared types, DTOs, form schemas, table columns, Zustand/Redux stores, query keys, and frontend mappers that still use:

- `stage` for opportunities
- `contact` for opportunities

These need to become:

- `deal_stage`
- `primary_contact`

### Filtering and sorting

Opportunity filters and sorting now use:

- `deal_stage`
- `primary_contact`
- `probability`
- `expected_close_date`

Do not keep using old opportunity filter keys like:

- `stage`
- `contact`

## Suggested UX Structure

### People

Treat People as leads/contacts.

Recommended visible fields:

- name
- company
- stage
- lead_type
- lead_source
- owner
- last_action

### Opportunities

Treat Opportunities as deals.

Recommended visible fields:

- name
- company_name
- primary_contact_name
- deal_stage
- value
- probability
- expected_close_date
- owner_name

## Lead To Opportunity Flow

Recommended frontend behavior:

1. user creates or manages a lead in People
2. lead continues using `Person.stage`, `lead_type`, and `lead_source`
3. when ready, user creates an Opportunity linked to:
   - `company`
   - optional `primary_contact`
   - `owner`
4. opportunity then moves through `deal_stage`

The frontend should not try to replace the person lead stage with the opportunity deal stage.

They are separate concepts now.

## RBAC And Hidden Fields

The RBAC docs listed above must be followed.

Important current behavior:

- hidden fields are omitted from normal API payloads
- hidden fields are blocked on write
- frontend must not send hidden fields in create or edit payloads

Currently supported hidden-field entities include:

- `person`
- `company`
- `opportunity`

Opportunity hidden fields now work in the backend.

That means the frontend should support hiding fields like:

- `value`
- `deal_stage`
- `probability`
- `expected_close_date`
- `primary_contact`
- `owner`
- `company`

Also note:

- if a base field is hidden, related alias fields may also disappear from responses
- examples include `owner_name`, `owner_details`, `primary_contact_name`, and `company_name`

Frontend must treat missing fields as intentional and valid.

## API Keys And Permissions

User RBAC and API-key scopes are separate.

### User RBAC

The app UI should continue using role permissions such as:

- `people.read`
- `people.write`
- `opportunities.read`
- `opportunities.write`

### API key scopes

Programmatic access uses simple scopes such as:

- `people:read`
- `people:write`
- `companies:read`
- `opportunities:read`
- `opportunities:write`

This matters mainly for any frontend screens that help users generate or explain API keys.

## Frontend Checklist

Complete all of the following:

1. update opportunity types/interfaces from `stage` to `deal_stage`
2. update opportunity relation types/interfaces from `contact` to `primary_contact`
3. add `expected_close_date`, `probability`, and `owner` to opportunity forms and views
4. add `owner` to person forms and views where needed
5. use `opportunity_stages` for opportunity stage selectors
6. keep using `pipeline_stages` for people lead-stage selectors
7. update filters, sorting, saved views, and boards to use new opportunity field names
8. update role/hidden-field UI to support `opportunity`
9. remove hidden opportunity fields from columns, forms, details, filters, and client-built summaries
10. handle omitted alias fields safely when hidden fields are active

## Final Notes

The most important rule is this:

- `Person.stage` is for leads
- `Opportunity.deal_stage` is for deals

If the frontend follows that rule consistently, the rest of the implementation should stay clear.
