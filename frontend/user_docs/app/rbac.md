# Roles and Permissions

This CRM now supports workspace roles and role-based permissions.

Before this update, everyone in a workspace mostly had the same level of access.
Now, workspace owners and admins can decide:

- who can manage members
- who can manage roles
- who can change workspace configuration
- which CRM areas a role can read or edit
- which fields should stay hidden for specific roles

The goal is simple: give each teammate the access they need, without overcomplicating daily work.

## What Changed

Each user in a workspace now has a role.

A role controls:

- what actions the user can perform
- what sections of the CRM they can read
- what sections of the CRM they can edit
- which fields are hidden from them

You can manage this from:

- `Settings > Members`
- `Settings > Roles`

## Default Roles

Every workspace starts with 4 default roles:

### Owner

The highest level of access in the workspace.

Owners can:

- manage members
- assign roles
- create and edit roles
- update workspace configuration
- read and edit all CRM data
- see all fields

Best for:

- founder
- business owner
- main workspace administrator

### Admin

Admins can manage the workspace almost like an owner.

Admins can:

- manage members
- assign roles
- create and edit roles
- update workspace configuration
- read and edit all CRM data
- see all fields unless a custom admin-like role is created with hidden fields

Best for:

- operations lead
- head of sales
- team administrator

### Manager

Managers can work across the CRM, but they do not manage the workspace itself by default.

Managers can:

- read and edit CRM records
- work with people, companies, opportunities, tasks, notes, activities, and interactions
- view reports, dashboard data, files, and sync information

Managers cannot, by default:

- manage members
- manage roles
- change workspace configuration

Best for:

- team lead
- department manager
- senior salesperson

### Member

Members can do normal day-to-day CRM work.

Members can:

- read and edit CRM records
- work on leads, companies, opportunities, tasks, notes, and activity
- view reports and dashboard data

Members cannot, by default:

- manage members
- manage roles
- change workspace configuration

Best for:

- sales reps
- support team members
- regular contributors

## Custom Roles

In addition to the default roles, admins and owners can create custom roles.

A custom role lets you decide:

- the role name
- which permissions it should have
- which fields should be hidden

Examples:

- `Sales Rep`
- `Support Agent`
- `Analyst`
- `Read-Only Finance`

## What Permissions Can Control

Permissions are grouped in a practical way.

They can control access to:

- member management
- role management
- workspace configuration
- interaction types
- api keys
- people
- companies
- opportunities
- tasks
- notes
- activities
- interactions
- reports
- exports
- dashboards
- files
- sync data
- agent (credentials and integration sessions)

For most CRM sections, access is split into:

- `read`
- `write`

That means you can give someone permission to only view something, or to both view and edit it.

The **agent** permission is different. It is one combined switch that controls both reading and writing:

- if a role has `agent.use`: the user can read and write credentials and integration sessions
- if a role does not have `agent.use`: the user cannot access those endpoints at all

This is useful for controlling who can set up external integrations like Telegram bots.

## Hidden Fields

Roles can also hide specific fields.

This is useful when some users should work in the CRM but should not see sensitive details.

Examples of fields that can be hidden:

- person email
- person phone
- job title
- city
- LinkedIn
- conversion rate
- stage
- lead type
- lead source
- last action
- recommended action
- company domain
- employee count
- company ARR
- ICP flag
- opportunity value
- opportunity deal stage
- opportunity expected close date
- opportunity probability
- opportunity primary contact
- opportunity owner

Important:

- hidden fields are not just visually hidden in the UI
- they are removed from the response for users with that role
- this means the restriction is enforced by the system, not only by the frontend


### Managing external integrations

Use the agent permission to control who can set up and manage external integrations (like Telegram bots).

- Owner: can create and manage credentials and integration sessions
- Admin: can create and manage credentials and integration sessions
- Manager: can create and manage credentials and integration sessions
- Member: can create and manage credentials and integration sessions

All default roles include this permission by default.

### API Keys

API keys let programs access your CRM programmatically. Each user can create their own API key from the API Keys settings page.

API keys use their own scope system.

This is separate from user roles.

For example:

- a user role may allow someone to work with opportunities in the app
- an API key still needs the correct API scope such as `opportunities:read` or `opportunities:write`

**How permissions work:**

| Action | Who can do it |
|--------|---------------|
| Create an API key | Anyone in the workspace |
| View the API keys list | Only Owner and Admin |
| View a specific API key | Only Owner and Admin |
| Edit or delete an API key | Only Owner and Admin |
| Revoke or reactivate an API key | Only Owner and Admin |

**Why this matters:**

- Anyone can create an API key for their own use
- Only workspace admins and owners can see or manage all keys
- This prevents accidental exposure of keys to people who should not see them
- Each API key can be limited to simple per-model scopes like `people:read`, `companies:write`, or `opportunities:read`

If you need programmatic access, create a key. If you need to manage keys for your team, you need Admin or Owner access.

### Workspace Configuration

The workspace configuration permission controls settings that affect the whole workspace:

- CRM configuration (custom fields, pipelines, stages)
- Interaction types (call, meeting, email)
- API keys (view and manage)
- Other workspace-wide settings

**How it works:**

| Action | Who can do it |
|--------|---------------|
| View CRM configuration | Anyone in the workspace |
| View interaction types | Anyone in the workspace |
| Add or edit interaction types | Only Owner and Admin |
| Add or edit CRM custom fields | Only Owner and Admin |
| View or manage API keys | Only Owner and Admin |

This applies to most workspace-wide settings. If a setting is not listed here, check the specific section.


## Member Management

From `Settings > Members`, admins and owners can:

- see all members in the current workspace
- invite a new member by email
- generate an invite link
- choose the role before sending the invite
- change a user’s role later

If a user is invited with a role, they will join the workspace with that role already assigned.

## Role Management

From `Settings > Roles`, admins and owners can:

- see all available roles
- review how many users are assigned to each role
- create a new custom role
- edit a role’s permissions
- configure hidden fields for that role

The default system roles are meant to be your starting point.
If your team grows, you can create more specific roles without changing the whole setup.

## Recommended Simple Setup

If you want to keep things easy, use this approach:

- `Owner`: for the founder or main decision-maker
- `Admin`: for the person running the workspace
- `Manager`: for team leads
- `Member`: for most users

Only create custom roles if you have a clear need, such as:

- support should not see sales-sensitive fields
- analysts should read data but not edit records
- part-time contributors should have limited access

## Common Questions

### Can everyone manage members?

No.
Only roles with member-management permission can do that.
By default, that is Owner and Admin.

### Can everyone create or edit roles?

No.
Only roles with role-management permission can do that.
By default, that is Owner and Admin.

### Can I hide sensitive fields from some users?

Yes.
Use role hidden fields in `Settings > Roles`.

### Do hidden fields apply only in the interface?

No.
They are enforced by the backend as well.

### Can I invite someone directly into a specific role?

Yes.
When inviting a team member, you can choose the role first.

### Can I change a member’s role later?

Yes.
Go to `Settings > Members` and update the role there.

## Best Practices

- Keep the number of roles small at first
- Start with the default roles before creating custom ones
- Only hide fields when there is a real business reason
- Review roles whenever a person changes responsibilities
- Use Manager for team leads instead of giving everyone Admin

## Summary

This update gives your workspace better control without changing how the CRM feels day to day.

You can now:

- assign roles to workspace members
- control who can manage the workspace
- control who can read or edit CRM areas
- hide sensitive fields for specific roles
- invite users directly into the right role

If your team just wants a simple setup, use the default roles and only add custom roles when needed.
