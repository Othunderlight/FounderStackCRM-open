"""Merge Zernio messages that were stored twice under two different ids.

Webhooks expose Zernio's internal message id as ``id`` and the platform id as
``platformMessageId``. The inbox API only exposes the platform id as ``id``.
Before the id canonicalisation fix, the same message could be stored twice:
once from a webhook (internal id) and once from the inbox API (platform id).

This command keeps the row whose ``message_id`` is the platform id and merges
the webhook-only fields into it. If no canonical row exists, the webhook row is
renamed to the platform id.

Usage:
    python manage.py zernio_dedupe_messages --dry-run
    python manage.py zernio_dedupe_messages
    python manage.py zernio_dedupe_messages --conversation <uuid-or-platform-id>
"""

from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db import transaction

from integrations.models import ZernioMessage

FILL_FIELDS = (
    "text",
    "sender",
    "attachments",
    "status",
    "error_message",
    "idempotency_key",
    "sent_at",
    "direction",
)


def _is_empty(value) -> bool:
    if value is None:
        return True
    if isinstance(value, str):
        return not value.strip()
    if isinstance(value, (dict, list, tuple, set)):
        return not value
    return False


class Command(BaseCommand):
    help = "Merge duplicate Zernio messages created by webhook/API id mismatch."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report what would change without writing.",
        )
        parser.add_argument(
            "--conversation",
            default=None,
            help="Limit to one conversation (UUID or platform conversation id).",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        conversation_ref = options["conversation"]

        queryset = ZernioMessage.objects.select_related("conversation").all()
        if conversation_ref:
            queryset = queryset.filter(conversation_id=conversation_ref)
            if not queryset.exists():
                queryset = ZernioMessage.objects.select_related(
                    "conversation"
                ).filter(conversation__conversation_id=conversation_ref)

        merged = 0
        renamed = 0
        skipped = 0

        for message in queryset.iterator():
            metadata = message.metadata or {}
            platform_id = metadata.get("platformMessageId")
            if not platform_id or str(platform_id) == str(message.message_id):
                continue

            canonical = (
                ZernioMessage.objects.filter(message_id=str(platform_id))
                .exclude(pk=message.pk)
                .first()
            )
            if canonical is None:
                self.stdout.write(
                    f"rename {message.message_id} -> {platform_id} "
                    f"({message.conversation_id})"
                )
                if not dry_run:
                    with transaction.atomic():
                        message.message_id = str(platform_id)
                        message.save(update_fields=["message_id", "updated_at"])
                renamed += 1
                continue

            if canonical.conversation_id != message.conversation_id:
                # Same platform id in a different conversation is unexpected.
                # Leave it alone instead of deleting a message we cannot place.
                self.stdout.write(
                    self.style.WARNING(
                        f"skip {message.message_id}: canonical row belongs to "
                        f"another conversation"
                    )
                )
                skipped += 1
                continue

            self.stdout.write(
                f"merge {message.message_id} into {canonical.message_id} "
                f"({message.conversation_id})"
            )
            if not dry_run:
                with transaction.atomic():
                    changed = []
                    for field in FILL_FIELDS:
                        if _is_empty(getattr(canonical, field)) and not _is_empty(
                            getattr(message, field)
                        ):
                            setattr(canonical, field, getattr(message, field))
                            changed.append(field)
                    merged_metadata = {
                        **(message.metadata or {}),
                        **(canonical.metadata or {}),
                    }
                    if merged_metadata != (canonical.metadata or {}):
                        canonical.metadata = merged_metadata
                        changed.append("metadata")
                    if changed:
                        canonical.save(update_fields=[*changed, "updated_at"])
                    message.delete()
            merged += 1

        verb = "Would merge" if dry_run else "Merged"
        self.stdout.write(
            self.style.SUCCESS(
                f"{verb} {merged} duplicate(s), renamed {renamed} row(s), "
                f"skipped {skipped}."
            )
        )
