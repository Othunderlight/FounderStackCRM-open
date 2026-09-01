# Opportunity Model Update For Frontend

This document summarizes the opportunity model changes that were implemented in the backend so the frontend can update its forms, lists, filters, and detail pages.

## What Changed

### Opportunity field renames
* `stage` is now `deal_stage`
* `contact` is now `primary_contact`

### New opportunity fields
* `expected_close_date`
* `probability`
* `owner`

### New person field
* `owner`

### New CRM configuration field
* `opportunity_stages`

## Final Opportunity Shape

### Request fields
* `name`
* `value`
* `deal_stage`
* `expected_close_date`
* `probability`
* `company`
* `primary_contact`
* `owner`

### Response extras
* `company_name`
* `primary_contact_name`
* `owner_name`
* `owner_details`
* `created_by_name`

## Important Rules

* Every opportunity must have a `company`
* `primary_contact` is optional
* If `primary_contact` has a company, it must match the opportunity `company`
* `owner` must be a user in the same organization
* `probability` must be between `0` and `100`

## Lead vs Opportunity

Lead data still stays on `Person`:

* `stage`
* `lead_type`
* `lead_source`

This was kept intentionally so other apps do not break.

Opportunity pipeline data now lives on `Opportunity`:

* `deal_stage`
* `expected_close_date`
* `probability`
* `owner`

## CRM Configuration

### Existing lead config stays unchanged
* `pipeline_stages` still maps to `Person.stage`
* `lead_types` stays unchanged
* `lead_sources` stays unchanged

### New config for opportunities
* `opportunity_stages` maps to `Opportunity.deal_stage`

### Rename actions
* `rename_stage` updates `Person.stage`
* `rename_opportunity_stage` updates `Opportunity.deal_stage`

## Frontend Update Checklist

* Replace all opportunity form/state keys from `stage` to `deal_stage`
* Replace all opportunity relation keys from `contact` to `primary_contact`
* Add inputs for `expected_close_date`, `probability`, and `owner`
* Use `opportunity_stages` from CRM config for opportunity stage dropdowns
* Keep using `pipeline_stages` only for people/leads
* Update list filters and table columns to use `deal_stage` and `primary_contact`
* Update any PATCH requests that mark a deal as won/lost to send `deal_stage`

## Example Create Payload

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

## Example Opportunity Card Fields

Recommended minimal card/list fields:

* `name`
* `company_name`
* `primary_contact_name`
* `deal_stage`
* `value`
* `probability`
* `expected_close_date`
* `owner_name`
