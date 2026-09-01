from django.core.management.base import BaseCommand, CommandError
from users.models import Organization
from integrations.models import TenantBackupConfig
from integrations.services import build_tenant_backup_data, push_backup_to_github

class Command(BaseCommand):
    help = 'Runs a GitHub backup for a specific organization'

    def add_arguments(self, parser):
        parser.add_argument('org_id', type=str, help='The ID (UUID) of the organization to backup')

    def handle(self, *args, **options):
        org_id = options['org_id']

        try:
            org = Organization.objects.get(id=org_id)
        except Organization.DoesNotExist:
            raise CommandError(f'Organization with ID {org_id} does not exist')
        except Exception as e:
            raise CommandError(f'Error fetching organization: {str(e)}')

        try:
            config = TenantBackupConfig.objects.get(organization=org, is_active=True)
        except TenantBackupConfig.DoesNotExist:
            raise CommandError(f'No active backup configuration found for organization {org.name}')

        self.stdout.write(self.style.NOTICE(f'Starting Git-native backup for {org.name}...'))

        # We always do a full state backup so Git can track the diff correctly
        backup_data = build_tenant_backup_data(org, since=None)

        success, result = push_backup_to_github(config, backup_data)

        if success:
            self.stdout.write(self.style.SUCCESS(f'Backup process completed for {org.name}!'))
            self.stdout.write(f'Result: {result}')
        else:
            self.stdout.write(self.style.ERROR(f'Failed to push backup to GitHub: {result}'))
