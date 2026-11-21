"""Backfill ``Person.created_at`` from the linked Zernio conversation.

New people created by ``import-people`` are stamped with the conversation's
last message time, so the CRM people list reflects "who did I talk to most
recently". People imported before that change still carry the import timestamp.
This command repairs them once.

By default it only touches people with ``created_by`` unset (the import never
sets it) that are linked to at least one conversation. Pass ``--include-manual``
to also update people that have a creator assigned.

Usage:
    python manage.py zernio_backfill_person_created_at --dry-run
    python manage.py zernio_backfill_person_created_at
    python manage.py zernio_backfill_person_created_at --organization <uuid>
"""

from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db.models import Max

from app.models import Person
from integrations.models import ZernioConversation


class Command(BaseCommand):
    help = (
        "Set Person.created_at to the latest linked Zernio conversation's "
        "last_message_at."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report what would change without writing.",
        )
        parser.add_argument(
            "--organization",
            default=None,
            help="Limit to one organization UUID.",
        )
        parser.add_argument(
            "--include-manual",
            action="store_true",
            help="Also update people that have a creator assigned.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        organization_id = options["organization"]
        include_manual = options["include_manual"]

        conversations = ZernioConversation.objects.filter(
            person__isnull=False, last_message_at__isnull=False
        )
        if organization_id:
            conversations = conversations.filter(organization_id=organization_id)

        latest_by_person = (
            conversations.values("person_id")
            .annotate(latest=Max("last_message_at"))
            .order_by()
        )

        people = Person.objects.in_bulk(
            [row["person_id"] for row in latest_by_person]
        )

        updated = 0
        unchanged = 0
        skipped = 0
        for row in latest_by_person:
            person = people.get(row["person_id"])
            latest = row["latest"]
            if person is None or latest is None:
                skipped += 1
                continue
            if person.created_by_id and not include_manual:
                skipped += 1
                continue
            if person.created_at and abs(
                (person.created_at - latest).total_seconds()
            ) < 1:
                unchanged += 1
                continue

            self.stdout.write(
                f"{'would set' if dry_run else 'set'} {person.name}: "
                f"{person.created_at.isoformat() if person.created_at else None} "
                f"-> {latest.isoformat()}"
            )
            if not dry_run:
                Person.objects.filter(pk=person.pk).update(created_at=latest)
            updated += 1

        verb = "Would update" if dry_run else "Updated"
        self.stdout.write(
            self.style.SUCCESS(
                f"{verb} {updated} person(s), {unchanged} already correct, "
                f"{skipped} skipped."
            )
        )
