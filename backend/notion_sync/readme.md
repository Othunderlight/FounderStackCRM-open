Updated models.py with:
- sync_id (CharField) - stores Notion's page ID with db_index for fast lookups
- sync_status (CharField with choices: pending/synced/error) - tracks sync state
Added to 6 models: Company, Person, Opportunity, Task, Note, ActivityLog
Updated Notion schema with:
- External ID text field on all 6 databases to store Django's UUID
Sync workflow:
1. Create record in Django → sync_status = "pending"
2. Push to Notion → store returned sync_id
3. sync_status = "synced"
4. If error → sync_status = "error"
Query patterns you'll use:
# Get records needing sync
pending = Person.objects.filter(sync_status='pending')
# Find by Notion ID
record = Company.objects.filter(sync_id='abc-123').first()
# Check if synced
if person.sync_status == 'synced':
    # Update Notion page
You'll also need to create Django migrations now!
