from django.core.management.base import BaseCommand

from app.models import (
    ActivityLog,
    Company,
    Note,
    Opportunity,
    Person,
    Report,
    Task,
)
from dashboard.models import InteractionLog, InteractionType


class Command(BaseCommand):
    help = "Clear CRM data: people, companies, activities, notes, reports, tasks, opportunities, interaction types, and interaction logs"

    def handle(self, *args, **options):
        models = [
            ("InteractionLog", InteractionLog),
            ("ActivityLog", ActivityLog),
            ("Opportunity", Opportunity),
            ("Task", Task),
            ("Note", Note),
            ("InteractionType", InteractionType),
            ("Report", Report),
            ("Person", Person),
            ("Company", Company),
        ]

        for name, model in models:
            count = model.objects.count()
            if count > 0:
                model.objects.all().delete()
                self.stdout.write(f"Deleted {count} {name}(s)")
            else:
                self.stdout.write(f"No {name}(s) to delete")
