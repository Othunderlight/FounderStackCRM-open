"""Link Zernio conversations to CRM people.

The conversation's ``participant_id`` is the platform handle. We store it as a
``PersonIdentity`` so one Person can own several handles across platforms and
accounts. The conversation keeps a direct ``person`` FK for fast reads.
"""

from __future__ import annotations

import logging
from typing import Any

from django.db import transaction
from django.utils import timezone

from app.models import Person, PersonIdentity
from integrations.models import ZernioConversation

logger = logging.getLogger(__name__)

# Platforms whose external id is globally unique, so the same handle can be
# matched across connected accounts. Instagram/Facebook ids are scoped to the
# account, so those need an exact account match.
GLOBAL_ID_PLATFORMS = {"whatsapp", "telegram", "email", "sms", "phone"}


def _clean(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _is_real_username(value: str | None) -> bool:
    """Instagram sometimes returns the numeric id as the username."""
    if not value:
        return False
    return not value.isdigit()


def _find_identity(conversation: ZernioConversation) -> PersonIdentity | None:
    organization = conversation.organization
    platform = _clean(conversation.platform)
    external_id = _clean(conversation.participant_id)
    if not organization or not platform or not external_id:
        return None

    exact = PersonIdentity.objects.filter(
        organization=organization,
        platform=platform,
        account=conversation.account,
        external_id=external_id,
    ).first()
    if exact:
        return exact

    if platform.lower() in GLOBAL_ID_PLATFORMS:
        return (
            PersonIdentity.objects.filter(
                organization=organization,
                platform=platform,
                external_id=external_id,
            )
            .order_by("created_at")
            .first()
        )

    username = _clean(conversation.participant_username)
    if _is_real_username(username):
        return (
            PersonIdentity.objects.filter(
                organization=organization,
                platform=platform,
                username__iexact=username,
            )
            .order_by("created_at")
            .first()
        )
    return None


def _create_person(conversation: ZernioConversation) -> Person:
    platform = _clean(conversation.platform) or "inbound"
    name = (
        _clean(conversation.participant_name)
        or _clean(conversation.participant_username)
        or f"{platform.title()} contact"
    )
    return Person.objects.create(
        organization=conversation.organization,
        name=name,
        avatar=_clean(conversation.participant_avatar),
        lead_source=platform.title(),
    )


def link_conversation_to_person(
    conversation: ZernioConversation,
    *,
    create_missing: bool = True,
) -> tuple[PersonIdentity | None, bool]:
    """Link one conversation to a Person. Returns ``(identity, person_created)``."""
    organization = conversation.organization
    platform = _clean(conversation.platform)
    external_id = _clean(conversation.participant_id)
    if not organization or not platform or not external_id:
        return None, False

    identity = _find_identity(conversation)
    person_created = False

    if identity is None:
        if not create_missing:
            return None, False
        person = _create_person(conversation)
        person_created = True
        identity = PersonIdentity.objects.create(
            organization=organization,
            person=person,
            platform=platform,
            external_id=external_id,
            username=_clean(conversation.participant_username),
            display_name=_clean(conversation.participant_name),
            avatar=_clean(conversation.participant_avatar),
            account=conversation.account,
            metadata={"conversation_id": conversation.conversation_id},
            last_seen_at=conversation.last_message_at,
        )
    else:
        updates: list[str] = []
        if _clean(conversation.participant_avatar) and not identity.avatar:
            identity.avatar = _clean(conversation.participant_avatar)
            updates.append("avatar")
        if _clean(conversation.participant_name) and not identity.display_name:
            identity.display_name = _clean(conversation.participant_name)
            updates.append("display_name")
        if _clean(conversation.participant_username) and not identity.username:
            identity.username = _clean(conversation.participant_username)
            updates.append("username")
        if conversation.last_message_at and (
            identity.last_seen_at is None
            or conversation.last_message_at > identity.last_seen_at
        ):
            identity.last_seen_at = conversation.last_message_at
            updates.append("last_seen_at")
        if updates:
            identity.save(update_fields=[*updates, "updated_at"])

    changed = False
    if conversation.person_id != identity.person_id:
        conversation.person = identity.person
        changed = True
    if conversation.identity_id != identity.id:
        conversation.identity = identity
        changed = True
    if changed:
        conversation.save(update_fields=["person", "identity", "updated_at"])

    return identity, person_created


def import_conversations_to_people(
    profile,
    *,
    create_missing: bool = True,
    conversation_ids: list[str] | None = None,
    limit: int | None = None,
    dry_run: bool = False,
) -> dict[str, Any]:
    """Import conversations into People. Safe to run repeatedly."""
    queryset = ZernioConversation.objects.filter(profile=profile).select_related(
        "account", "organization", "person", "identity"
    )
    if conversation_ids:
        queryset = queryset.filter(id__in=conversation_ids)
    if limit:
        queryset = queryset[: int(limit)]

    summary: dict[str, Any] = {
        "total": 0,
        "linked": 0,
        "already_linked": 0,
        "created_people": 0,
        "skipped": 0,
        "errors": [],
        "dry_run": dry_run,
    }

    with transaction.atomic():
        for conversation in queryset:
            summary["total"] += 1
            if conversation.person_id and conversation.identity_id:
                summary["already_linked"] += 1
                continue
            try:
                with transaction.atomic():
                    identity, person_created = link_conversation_to_person(
                        conversation, create_missing=create_missing
                    )
                if identity is None:
                    summary["skipped"] += 1
                else:
                    summary["linked"] += 1
                    if person_created:
                        summary["created_people"] += 1
            except Exception as exc:  # noqa: BLE001 - report per-row failures
                logger.exception(
                    "Failed to link conversation %s", conversation.conversation_id
                )
                summary["errors"].append(
                    {
                        "conversation_id": conversation.conversation_id,
                        "error": str(exc),
                    }
                )
        if dry_run:
            transaction.set_rollback(True)

    summary["finished_at"] = timezone.now().isoformat()
    return summary
