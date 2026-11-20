"""Business logic for the Zernio integration.

The services keep the local mirror in sync with Zernio and translate Zernio's
webhook payloads into local conversation/message/account rows.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta
from typing import Any

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import F
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime

from integrations.models import (
    ZernioAccount,
    ZernioConversation,
    ZernioDailyMetric,
    ZernioMessage,
    ZernioPost,
    ZernioProfile,
    ZernioWebhookEvent,
)

from .client import ZernioAPIError, ZernioClient, get_zernio_client


# ---------------------------------------------------------------------------
# Small normalisation helpers
# ---------------------------------------------------------------------------
def _parse_dt(value: Any) -> datetime | None:
    if not value:
        return None
    if isinstance(value, datetime):
        parsed = value
    elif isinstance(value, date):
        parsed = datetime.combine(value, datetime.min.time())
    else:
        parsed = parse_datetime(str(value))
        if parsed is None:
            day = parse_date(str(value))
            if day:
                parsed = datetime.combine(day, datetime.min.time())
    if parsed and timezone.is_naive(parsed):
        parsed = timezone.make_aware(parsed, timezone.utc)
    return parsed


def _parse_date(value: Any) -> date | None:
    if not value:
        return None
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, datetime):
        return value.date()
    return parse_date(str(value))


def _first(payload: dict, *keys: str, default=None):
    for key in keys:
        value = payload.get(key)
        if value not in (None, ""):
            return value
    return default


def _remote_account_id(payload: dict) -> str | None:
    return _first(payload, "_id", "accountId", "id")


def _remote_profile_id(payload: dict) -> str | None:
    return _first(payload, "_id", "profileId", "id")


def _find_profile_in_payload(payload: Any) -> dict | None:
    if not isinstance(payload, dict):
        return None
    for key in ("profiles", "profile", "data"):
        value = payload.get(key)
        if isinstance(value, list) and value:
            return value[0] if isinstance(value[0], dict) else None
        if isinstance(value, dict):
            return value
    return None


# ---------------------------------------------------------------------------
# Profiles and accounts
# ---------------------------------------------------------------------------
def ensure_profile(
    organization, client: ZernioClient | None = None
) -> ZernioProfile:
    """Return the organization's profile, creating it on Zernio if needed."""
    client = client or get_zernio_client()
    external_id = str(organization.id)
    profile, _ = ZernioProfile.objects.get_or_create(
        organization=organization,
        defaults={
            "name": organization.name,
            "external_id": external_id,
        },
    )

    update_fields = []
    if profile.name != organization.name:
        profile.name = organization.name
        update_fields.append("name")
    if profile.external_id != external_id:
        profile.external_id = external_id
        update_fields.append("external_id")

    if not profile.profile_id:
        try:
            response = client.create_profile(
                name=organization.name[:255], external_id=external_id
            )
            remote = response.get("profile", response) if isinstance(response, dict) else {}
            profile.profile_id = _remote_profile_id(remote)
        except ZernioAPIError as exc:
            existing_id = None
            if isinstance(exc.details, dict):
                existing_id = exc.details.get("existingProfileId")

            if not existing_id:
                # A retry may hit a name conflict instead of the externalId
                # conflict, so look the customer up explicitly.
                try:
                    listing = client.list_profiles(external_id=external_id)
                    remote = _find_profile_in_payload(listing)
                    if remote:
                        existing_id = _remote_profile_id(remote)
                except ZernioAPIError:
                    pass

            if existing_id:
                profile.profile_id = existing_id
            else:
                raise

    if profile.profile_id:
        profile.status = ZernioProfile.Status.ACTIVE
        update_fields.append("status")
    update_fields.append("updated_at")
    if update_fields:
        profile.save(update_fields=update_fields)
    return profile


def _apply_account_payload(
    profile: ZernioProfile, payload: dict, *, defaults: dict | None = None
) -> ZernioAccount | None:
    account_id = _remote_account_id(payload)
    if not account_id:
        return None

    values: dict[str, Any] = {
        "organization": profile.organization,
        "profile": profile,
        "platform": _first(payload, "platform", default="unknown"),
        "username": _first(payload, "username", "handle"),
        "display_name": _first(payload, "displayName", "name"),
        "avatar_url": _first(payload, "avatar", "avatarUrl", "profilePicture"),
        "is_active": bool(_first(payload, "isActive", "active", default=True)),
        "metadata": payload,
        "last_synced_at": timezone.now(),
    }
    if _first(payload, "connectedAt"):
        values["connected_at"] = _parse_dt(payload.get("connectedAt"))
    if defaults:
        values.update(defaults)

    account, _ = ZernioAccount.objects.update_or_create(
        account_id=account_id,
        defaults=values,
    )
    if account.is_active and account.status == ZernioAccount.Status.DISCONNECTED:
        account.status = ZernioAccount.Status.CONNECTED
        account.save(update_fields=["status"])
    return account


def sync_accounts(
    profile: ZernioProfile, client: ZernioClient | None = None
) -> list[ZernioAccount]:
    client = client or get_zernio_client()
    if not profile.profile_id:
        profile = ensure_profile(profile.organization, client=client)

    response = client.list_accounts(profile_id=profile.profile_id)
    accounts = response.get("accounts", response.get("data", []))
    if not isinstance(accounts, list):
        accounts = []

    synced = []
    for payload in accounts:
        if not isinstance(payload, dict):
            continue
        account = _apply_account_payload(profile, payload)
        if account:
            synced.append(account)

    now = timezone.now()
    # Accounts that disappear from the API are marked inactive, not deleted,
    # so their conversations and message history survive.
    ZernioAccount.objects.filter(profile=profile, is_active=True).exclude(
        account_id__in=[account.account_id for account in synced]
    ).update(
        is_active=False,
        status=ZernioAccount.Status.DISCONNECTED,
        disconnected_at=now,
        last_synced_at=now,
    )

    profile.last_synced_at = now
    profile.save(update_fields=["last_synced_at", "updated_at"])
    return synced


def sync_account_health(
    profile: ZernioProfile, client: ZernioClient | None = None
) -> dict:
    client = client or get_zernio_client()
    if not profile.profile_id:
        profile = ensure_profile(profile.organization, client=client)

    response = client.get_accounts_health(profile_id=profile.profile_id)
    rows = response.get("accounts", response.get("data", []))
    if not isinstance(rows, list):
        rows = []

    now = timezone.now()
    status_map = {
        "healthy": ZernioAccount.Status.HEALTHY,
        "warning": ZernioAccount.Status.WARNING,
        "error": ZernioAccount.Status.ERROR,
    }
    for payload in rows:
        if not isinstance(payload, dict):
            continue
        account_id = _remote_account_id(payload)
        if not account_id:
            continue
        updates = {
            "health": payload,
            "status": status_map.get(
                _first(payload, "status", default=""), ZernioAccount.Status.CONNECTED
            ),
            "can_post": bool(_first(payload, "canPost", default=True)),
            "token_valid": bool(_first(payload, "tokenValid", default=True)),
            "needs_reconnect": bool(
                _first(payload, "needsReconnect", default=False)
            ),
            "issues": payload.get("issues", []),
            "last_synced_at": now,
            "updated_at": now,
        }
        if updates["needs_reconnect"]:
            updates["is_active"] = False
            updates["disconnected_at"] = now
        ZernioAccount.objects.filter(
            profile=profile, account_id=account_id
        ).update(**updates)

    return response


def get_connect_url(
    profile: ZernioProfile,
    platform: str,
    *,
    client: ZernioClient | None = None,
    **kwargs,
) -> dict:
    client = client or get_zernio_client()
    if not profile.profile_id:
        profile = ensure_profile(profile.organization, client=client)
    return client.get_connect_url(platform, profile.profile_id, **kwargs)


def disconnect_account(
    account: ZernioAccount, client: ZernioClient | None = None
) -> None:
    client = client or get_zernio_client()
    client.delete_account(account.account_id)
    now = timezone.now()
    account.is_active = False
    account.status = ZernioAccount.Status.DISCONNECTED
    account.disconnected_at = now
    account.save(
        update_fields=[
            "is_active",
            "status",
            "disconnected_at",
            "updated_at",
        ]
    )


# ---------------------------------------------------------------------------
# Inbox
# ---------------------------------------------------------------------------
def _conversation_identity(payload: dict, platform: str | None = None) -> str | None:
    """Return the id the inbox API expects for a conversation.

    List rows expose the API id as ``id``. Webhooks expose Zernio's internal id
    as ``id`` and the API id as ``platformConversationId``. WhatsApp is the one
    documented exception: its API id is the internal id.
    """
    platform_id = _first(payload, "platformConversationId")
    internal_id = _first(payload, "id", "conversationId", "_id")
    resolved_platform = platform or _first(payload, "platform")
    if str(resolved_platform).lower() == "whatsapp":
        chosen = internal_id or platform_id
    else:
        chosen = platform_id or internal_id
    return str(chosen) if chosen else None


def _ensure_conversation(
    profile: ZernioProfile,
    payload: dict,
    *,
    account_id: str | None = None,
    platform: str | None = None,
    participant: dict | None = None,
    last_message: str | None = None,
    last_message_at: Any = None,
) -> ZernioConversation | None:
    remote_platform = platform or _first(payload, "platform")
    conversation_id = _conversation_identity(payload, remote_platform)
    if not conversation_id:
        return None

    account = None
    account_id = account_id or _first(payload, "accountId")
    if account_id:
        account = ZernioAccount.objects.filter(
            profile=profile, account_id=account_id
        ).first()

    participant = participant or payload.get("participant") or payload.get("sender") or {}
    if not isinstance(participant, dict):
        participant = {}

    existing = ZernioConversation.objects.filter(
        conversation_id=conversation_id
    ).first()
    if existing is None:
        # Self-heal rows created before webhook ids were canonicalized.
        existing = (
            ZernioConversation.objects.filter(
                profile=profile,
                metadata__platformConversationId=conversation_id,
            )
            .exclude(conversation_id=conversation_id)
            .first()
        )

    values: dict[str, Any] = {
        "organization": profile.organization,
        "profile": profile,
        "conversation_id": conversation_id,
        "last_synced_at": timezone.now(),
        "metadata": {**(existing.metadata if existing else {}), **payload},
    }

    if account:
        values["account"] = account
    elif existing is None:
        values["account"] = None

    if remote_platform:
        values["platform"] = remote_platform

    raw_status = _first(payload, "status", "state")
    if raw_status is None and existing is None:
        raw_status = "active"
    if raw_status is not None:
        status = str(raw_status).lower()
        if status not in dict(ZernioConversation.Status.choices):
            status = ZernioConversation.Status.ACTIVE
        values["status"] = status

    participant_name = _first(
        payload, "participantName", "name", "displayName"
    ) or _first(participant, "name", "displayName", "username")
    participant_username = _first(payload, "participantUsername") or _first(
        participant, "username", "handle"
    )
    participant_id = _first(payload, "participantId") or _first(
        participant, "id", "userId"
    )
    participant_avatar = _first(payload, "participantAvatar", "avatar") or _first(
        participant, "avatar", "avatarUrl", "profilePicture"
    )

    if participant_name:
        values["participant_name"] = participant_name
    if participant_username:
        values["participant_username"] = participant_username
    if participant_id:
        values["participant_id"] = str(participant_id)
    if participant_avatar:
        values["participant_avatar"] = participant_avatar

    if last_message is not None:
        values["last_message_text"] = last_message
    elif _first(payload, "lastMessage"):
        values["last_message_text"] = _first(payload, "lastMessage")

    parsed_last_message_at = _parse_dt(
        last_message_at
        or _first(payload, "lastMessageAt", "updatedTime", "updatedAt", "createdAt")
    )
    if parsed_last_message_at:
        values["last_message_at"] = parsed_last_message_at

    if existing:
        for key, value in values.items():
            setattr(existing, key, value)
        existing.save()
        return existing

    return ZernioConversation.objects.create(**values)


def _apply_message(
    conversation: ZernioConversation,
    payload: dict,
    *,
    direction: str | None = None,
    status: str | None = None,
    sent_at: Any = None,
    text: str | None = None,
) -> tuple[ZernioMessage, bool]:
    message_id = _first(payload, "id", "messageId", "_id")
    existing = (
        ZernioMessage.objects.filter(message_id=str(message_id)).first()
        if message_id
        else None
    )

    raw_direction = direction or _first(payload, "direction")
    if raw_direction is None and existing is None:
        raw_direction = "incoming"
    if raw_direction is not None:
        raw_direction = str(raw_direction).lower()
        if raw_direction not in dict(ZernioMessage.Direction.choices):
            raw_direction = ZernioMessage.Direction.INCOMING

    raw_status = status or _first(payload, "status")
    if raw_status is None and existing is None:
        raw_status = "sent"
    if raw_status is not None:
        raw_status = str(raw_status).lower()
        if raw_status not in dict(ZernioMessage.Status.choices):
            raw_status = ZernioMessage.Status.SENT

    message_text = text
    if message_text is None:
        message_text = _first(payload, "text", "message", "body", "content")

    values: dict[str, Any] = {
        "organization": conversation.organization,
        "conversation": conversation,
        "metadata": {**(existing.metadata if existing else {}), **payload},
    }

    if raw_direction is not None:
        values["direction"] = raw_direction
    if raw_status is not None:
        values["status"] = raw_status
    if message_text is not None:
        values["text"] = message_text

    if "sender" in payload:
        sender = payload.get("sender") or {}
        values["sender"] = sender if isinstance(sender, dict) else {"id": str(sender)}
    elif existing is None:
        values["sender"] = {}

    if "attachments" in payload:
        values["attachments"] = payload.get("attachments") or []
    elif existing is None:
        values["attachments"] = []

    if _first(payload, "error", "errorMessage"):
        values["error_message"] = _first(payload, "error", "errorMessage")

    parsed_sent_at = _parse_dt(
        sent_at
        or _first(payload, "sentAt", "createdAt", "timestamp", "updatedTime")
    )
    if parsed_sent_at:
        values["sent_at"] = parsed_sent_at
    elif existing is None:
        values["sent_at"] = timezone.now()

    if existing:
        for key, value in values.items():
            setattr(existing, key, value)
        existing.save()
        return existing, False

    if not message_id:
        message_id = f"local-{uuid.uuid4().hex}"
        values["message_id"] = message_id
    else:
        values["message_id"] = str(message_id)
    return ZernioMessage.objects.create(**values), True


def _touch_conversation_from_message(
    conversation: ZernioConversation, message: ZernioMessage
) -> None:
    if message.text is not None:
        conversation.last_message_text = message.text
    sent_at = message.sent_at or timezone.now()
    if conversation.last_message_at is None or sent_at >= conversation.last_message_at:
        conversation.last_message_at = sent_at
    conversation.save(
        update_fields=["last_message_text", "last_message_at", "updated_at"]
    )


def sync_conversations(
    profile: ZernioProfile,
    *,
    client: ZernioClient | None = None,
    status: str | None = None,
    limit: int = 50,
    max_pages: int = 20,
) -> list[ZernioConversation]:
    client = client or get_zernio_client()
    if not profile.profile_id:
        profile = ensure_profile(profile.organization, client=client)

    synced = []
    cursor = None
    page = 0
    while page < max_pages:
        params: dict[str, Any] = {
            "profileId": profile.profile_id,
            "status": status,
            "limit": limit,
            "cursor": cursor,
        }
        response = client.list_inbox_conversations(**params)
        rows = response.get("data", response.get("conversations", []))
        if not isinstance(rows, list):
            rows = []

        for payload in rows:
            if not isinstance(payload, dict):
                continue
            conversation = _ensure_conversation(profile, payload)
            if conversation:
                synced.append(conversation)

        pagination = response.get("pagination", {}) if isinstance(response, dict) else {}
        cursor = pagination.get("nextCursor")
        page += 1
        if not cursor:
            break

    profile.last_inbox_sync_at = timezone.now()
    profile.save(update_fields=["last_inbox_sync_at", "updated_at"])
    return synced


def sync_conversation_messages(
    conversation: ZernioConversation,
    *,
    client: ZernioClient | None = None,
    limit: int | None = None,
) -> list[ZernioMessage]:
    client = client or get_zernio_client()
    account_id = (
        conversation.account.account_id
        if conversation.account
        else conversation.metadata.get("accountId")
    )
    params: dict[str, Any] = {}
    if account_id:
        params["accountId"] = account_id
    if limit:
        params["limit"] = limit
    response = client.get_inbox_conversation_messages(
        conversation.conversation_id, **params
    )

    rows = response.get("data", response.get("messages", []))
    if isinstance(rows, dict):
        rows = rows.get("messages", [])
    if not isinstance(rows, list):
        rows = []

    saved = []
    for payload in rows:
        if not isinstance(payload, dict):
            continue
        message, _ = _apply_message(conversation, payload)
        saved.append(message)

    if saved:
        latest = max(
            (item for item in saved if item.sent_at),
            key=lambda item: item.sent_at,
            default=None,
        )
        if latest:
            conversation.last_message_text = latest.text
            if (
                conversation.last_message_at is None
                or latest.sent_at >= conversation.last_message_at
            ):
                conversation.last_message_at = latest.sent_at
        conversation.last_synced_at = timezone.now()
        conversation.save(
            update_fields=[
                "last_message_text",
                "last_message_at",
                "last_synced_at",
                "updated_at",
            ]
        )
    return saved


def send_message(
    conversation: ZernioConversation,
    text: str,
    *,
    account: ZernioAccount | None = None,
    idempotency_key: str | None = None,
    attachments: list[Any] | None = None,
    client: ZernioClient | None = None,
) -> ZernioMessage:
    client = client or get_zernio_client()
    account = account or conversation.account
    if not isinstance(account, ZernioAccount):
        account = (
            ZernioAccount.objects.filter(
                profile=conversation.profile, is_active=True
            )
            .order_by("platform")
            .first()
        )
    if account is None:
        raise ZernioAPIError(
            "Conversation has no connected account to send from.",
            status_code=400,
            code="no_account",
        )

    idempotency_key = idempotency_key or str(uuid.uuid4())
    response = client.send_inbox_message(
        conversation.conversation_id,
        account.account_id,
        text,
        idempotency_key=idempotency_key,
        attachments=attachments,
    )
    data = response.get("data", response)
    message_id = _first(data, "messageId", "id", "message_id")

    message, _ = ZernioMessage.objects.update_or_create(
        message_id=str(message_id) if message_id else f"local-{idempotency_key}",
        defaults={
            "organization": conversation.organization,
            "conversation": conversation,
            "direction": ZernioMessage.Direction.OUTGOING,
            "text": text,
            "sender": {"accountId": account.account_id},
            "attachments": attachments or [],
            "status": ZernioMessage.Status.SENT,
            "idempotency_key": idempotency_key,
            "sent_at": timezone.now(),
            "metadata": data if isinstance(data, dict) else {},
        },
    )
    _touch_conversation_from_message(conversation, message)
    return message


def mark_conversation_read(
    conversation: ZernioConversation, *, client: ZernioClient | None = None
) -> None:
    client = client or get_zernio_client()
    account = conversation.account
    if account:
        client.mark_conversation_read(
            conversation.conversation_id, account.account_id
        )
    conversation.unread_count = 0
    conversation.save(update_fields=["unread_count", "updated_at"])


def send_typing_indicator(
    conversation: ZernioConversation, *, client: ZernioClient | None = None
) -> None:
    client = client or get_zernio_client()
    if conversation.account:
        client.send_typing_indicator(
            conversation.conversation_id, conversation.account.account_id
        )


# ---------------------------------------------------------------------------
# Publishing and analytics
# ---------------------------------------------------------------------------
def publish_post(
    profile: ZernioProfile,
    content: str,
    platforms: list[dict[str, Any]],
    *,
    publish_now: bool = True,
    scheduled_for: Any = None,
    extra: dict[str, Any] | None = None,
    client: ZernioClient | None = None,
) -> ZernioPost | None:
    client = client or get_zernio_client()
    if not profile.profile_id:
        profile = ensure_profile(profile.organization, client=client)

    response = client.create_post(
        content,
        platforms,
        publish_now=publish_now,
        scheduled_for=(
            scheduled_for.isoformat()
            if hasattr(scheduled_for, "isoformat")
            else scheduled_for
        ),
        **(extra or {}),
    )
    post_payload = response.get("post", response)
    if not isinstance(post_payload, dict):
        post_payload = {}
    post_id = _first(post_payload, "_id", "id", "postId")
    if not post_id:
        return None

    post, _ = ZernioPost.objects.update_or_create(
        post_id=str(post_id),
        defaults={
            "organization": profile.organization,
            "profile": profile,
            "content": content,
            "status": _first(post_payload, "status", default="scheduled"),
            "platforms": post_payload.get("platforms", platforms),
            "analytics": post_payload.get("analytics", {}),
            "published_at": (
                _parse_dt(post_payload.get("publishedAt"))
                if post_payload.get("publishedAt")
                else (timezone.now() if publish_now else None)
            ),
            "scheduled_for": _parse_dt(scheduled_for) if scheduled_for else None,
            "last_synced_at": timezone.now(),
            "metadata": post_payload,
        },
    )
    return post


def _apply_post_payload(profile: ZernioProfile, payload: dict) -> ZernioPost | None:
    post_id = _first(payload, "_id", "id", "postId")
    if not post_id:
        return None

    existing = ZernioPost.objects.filter(post_id=str(post_id)).first()

    platform_urls = []
    for platform_row in payload.get("platforms", []) or []:
        if isinstance(platform_row, dict) and platform_row.get("platformPostUrl"):
            platform_urls.append(platform_row["platformPostUrl"])
    if payload.get("platformPostUrl"):
        platform_urls.append(payload["platformPostUrl"])

    values: dict[str, Any] = {
        "organization": profile.organization,
        "profile": profile,
        "last_synced_at": timezone.now(),
        "metadata": {**(existing.metadata if existing else {}), **payload},
    }
    content = _first(payload, "content", "text", "caption")
    if content is not None:
        values["content"] = content
    if payload.get("status") is not None:
        values["status"] = payload["status"]
    if "platforms" in payload:
        values["platforms"] = payload.get("platforms") or []
    if platform_urls:
        values["platform_post_urls"] = platform_urls
    if "analytics" in payload:
        values["analytics"] = payload.get("analytics") or {}
    if payload.get("publishedAt"):
        values["published_at"] = _parse_dt(payload.get("publishedAt"))
    if payload.get("scheduledFor"):
        values["scheduled_for"] = _parse_dt(payload.get("scheduledFor"))

    if existing:
        for key, value in values.items():
            setattr(existing, key, value)
        existing.save()
        return existing
    return ZernioPost.objects.create(post_id=str(post_id), **values)


def sync_posts(
    profile: ZernioProfile,
    *,
    client: ZernioClient | None = None,
    window_days: int = 90,
    max_pages: int = 50,
) -> list[ZernioPost]:
    client = client or get_zernio_client()
    if not profile.profile_id:
        profile = ensure_profile(profile.organization, client=client)

    from_date = (date.today() - timedelta(days=window_days)).isoformat()
    rows = client._request_all_pages(
        "/analytics",
        params={"profileId": profile.profile_id, "fromDate": from_date},
        pages_key="pages",
        data_key="posts",
        limit=50,
        max_pages=max_pages,
    )

    saved = []
    for payload in rows:
        if isinstance(payload, dict):
            post = _apply_post_payload(profile, payload)
            if post:
                saved.append(post)
    return saved


def sync_analytics(
    profile: ZernioProfile,
    *,
    client: ZernioClient | None = None,
    days: int = 30,
    from_date: date | None = None,
    to_date: date | None = None,
    compare: str | None = "previous_period",
    top_posts: int = 5,
    recent_posts: int = 10,
    platform: str | None = None,
    include_posts: bool = True,
) -> dict:
    client = client or get_zernio_client()
    if not profile.profile_id:
        profile = ensure_profile(profile.organization, client=client)

    to_date = to_date or date.today()
    from_date = from_date or (to_date - timedelta(days=days - 1))

    dashboard = client.get_analytics_dashboard(
        profileId=profile.profile_id,
        fromDate=from_date.isoformat(),
        toDate=to_date.isoformat(),
        compare=compare,
        topPosts=top_posts,
        recentPosts=recent_posts,
        platform=platform,
    )

    try:
        daily_payload = client.get_daily_metrics(
            profileId=profile.profile_id,
            fromDate=from_date.isoformat(),
            toDate=to_date.isoformat(),
            attribution="received",
        )
    except ZernioAPIError:
        # The dashboard is still useful if daily metrics are temporarily
        # unavailable; the next scheduled pass fills them in.
        daily_payload = {}
    daily_rows = daily_payload.get("dailyData", [])
    for row in daily_rows if isinstance(daily_rows, list) else []:
        day = _parse_date(row.get("date")) if isinstance(row, dict) else None
        if not day:
            continue
        ZernioDailyMetric.objects.update_or_create(
            profile=profile,
            date=day,
            defaults={
                "organization": profile.organization,
                "metrics": row.get("metrics", {}),
                "platform_breakdown": daily_payload.get("platformBreakdown", []),
                "raw": row,
            },
        )

    if include_posts:
        try:
            sync_posts(profile, client=client, window_days=days)
        except ZernioAPIError:
            # A dashboard without posts is still useful; the upsert is retried
            # on the next scheduled pass.
            pass

    profile.analytics_data = dashboard
    profile.last_analytics_sync_at = timezone.now()
    profile.save(
        update_fields=[
            "analytics_data",
            "last_analytics_sync_at",
            "updated_at",
        ]
    )
    return dashboard


def sync_analytics_delta(
    profile: ZernioProfile, *, client: ZernioClient | None = None
) -> dict:
    client = client or get_zernio_client()
    if not profile.profile_id:
        profile = ensure_profile(profile.organization, client=client)

    response = client.get_analytics_delta(profile.analytics_cursor)
    next_cursor = response.get("nextCursor")
    if next_cursor:
        profile.analytics_cursor = next_cursor
        profile.last_analytics_sync_at = timezone.now()
        profile.save(
            update_fields=[
                "analytics_cursor",
                "last_analytics_sync_at",
                "updated_at",
            ]
        )
    return response


# ---------------------------------------------------------------------------
# Webhooks
# ---------------------------------------------------------------------------
def resolve_profile_from_event(
    payload: dict,
) -> tuple[ZernioProfile | None, str | None]:
    """Find the local profile/customer an event belongs to."""
    profiles = payload.get("profiles")
    profile_payload = None
    if isinstance(profiles, list) and profiles:
        profile_payload = profiles[0] if isinstance(profiles[0], dict) else None

    remote_profile_id = None
    external_id = None
    if profile_payload:
        remote_profile_id = _first(profile_payload, "id", "_id")
        external_id = profile_payload.get("externalId")

    account = payload.get("account") or {}
    if isinstance(account, dict):
        remote_profile_id = remote_profile_id or account.get("profileId")
        account_id = _remote_account_id(account)

    local = None
    if remote_profile_id:
        local = ZernioProfile.objects.filter(profile_id=remote_profile_id).first()
    if not local and external_id:
        local = ZernioProfile.objects.filter(external_id=str(external_id)).first()
        if not local:
            # externalId is the organization UUID for profiles we created.
            from users.models import Organization

            try:
                organization = Organization.objects.filter(
                    pk=str(external_id)
                ).first()
            except (DjangoValidationError, ValueError, TypeError):
                organization = None
            if organization:
                local = ZernioProfile.objects.filter(
                    organization=organization
                ).first()
    if not local and isinstance(account, dict):
        account_id = _remote_account_id(account)
        if account_id:
            account_obj = (
                ZernioAccount.objects.select_related("profile")
                .filter(account_id=account_id)
                .first()
            )
            if account_obj:
                local = account_obj.profile
                remote_profile_id = remote_profile_id or account_obj.profile.profile_id

    return local, remote_profile_id or (account.get("profileId") if isinstance(account, dict) else None)


def handle_webhook_event(
    payload: dict,
    *,
    profile: ZernioProfile | None = None,
) -> None:
    """Apply one Zernio webhook payload to the local mirror."""
    event_name = _first(payload, "event", default="")
    if profile is None:
        profile, _ = resolve_profile_from_event(payload)

    if profile is None:
        # Global events (verification, phone stock, test events) carry no
        # profile and need no inbox state.
        return

    account_payload = payload.get("account") or {}
    if not isinstance(account_payload, dict):
        account_payload = {}
    account_id = _remote_account_id(account_payload)
    platform = _first(account_payload, "platform")

    with transaction.atomic():
        if event_name == "account.connected":
            _apply_account_payload(
                profile,
                account_payload,
                defaults={
                    "is_active": True,
                    "status": ZernioAccount.Status.CONNECTED,
                    "disconnected_at": None,
                },
            )
            return

        if event_name == "account.disconnected":
            account = None
            if account_id:
                account = ZernioAccount.objects.filter(
                    profile=profile, account_id=account_id
                ).first()
            if account:
                account.is_active = False
                account.status = ZernioAccount.Status.DISCONNECTED
                account.disconnected_at = timezone.now()
                account.save(
                    update_fields=[
                        "is_active",
                        "status",
                        "disconnected_at",
                        "updated_at",
                    ]
                )
            return

        if event_name == "conversation.started":
            conversation_payload = payload.get("conversation") or {}
            _ensure_conversation(
                profile,
                conversation_payload,
                account_id=account_id,
                platform=platform,
            )
            return

        if event_name in {
            "message.received",
            "message.sent",
            "message.delivered",
            "message.read",
            "message.failed",
        }:
            message_payload = payload.get("message") or {}
            if not isinstance(message_payload, dict):
                message_payload = {}
            conversation_payload = payload.get("conversation") or {}
            if not isinstance(conversation_payload, dict):
                conversation_payload = {}
            conversation_ref = (
                _first(message_payload, "conversationId", "conversation_id")
                or _first(conversation_payload, "id", "conversationId")
            )
            if conversation_ref:
                conversation_payload = {
                    **conversation_payload,
                    "id": conversation_ref,
                }

            sender = message_payload.get("sender") or {}
            conversation = _ensure_conversation(
                profile,
                conversation_payload,
                account_id=account_id,
                platform=platform or _first(message_payload, "platform"),
                participant=sender if isinstance(sender, dict) else None,
                last_message=_first(message_payload, "text", "message", "body"),
                last_message_at=_first(
                    payload, "timestamp"
                )
                or _first(message_payload, "createdAt", "timestamp", "sentAt"),
            )
            if conversation is None:
                return

            if event_name == "message.received":
                message, created = _apply_message(
                    conversation,
                    message_payload,
                    direction=ZernioMessage.Direction.INCOMING,
                    status=ZernioMessage.Status.SENT,
                    sent_at=_first(payload, "timestamp"),
                )
                _touch_conversation_from_message(conversation, message)
                if created:
                    ZernioConversation.objects.filter(pk=conversation.pk).update(
                        unread_count=F("unread_count") + 1
                    )
                return

            if event_name == "message.failed":
                message, _ = _apply_message(
                    conversation,
                    message_payload,
                    direction=ZernioMessage.Direction.OUTGOING,
                    status=ZernioMessage.Status.FAILED,
                    sent_at=_first(payload, "timestamp"),
                )
                message.error_message = (
                    _first(message_payload, "error", "errorMessage")
                    or "Message delivery failed"
                )
                message.save(update_fields=["error_message", "updated_at"])
                return

            status_map = {
                "message.sent": ZernioMessage.Status.SENT,
                "message.delivered": ZernioMessage.Status.DELIVERED,
                "message.read": ZernioMessage.Status.READ,
            }
            message, created = _apply_message(
                conversation,
                message_payload,
                direction=_first(
                    message_payload, "direction", default="outgoing"
                ),
                status=status_map[event_name],
                sent_at=_first(payload, "timestamp"),
            )
            if event_name == "message.sent":
                _touch_conversation_from_message(conversation, message)
            if event_name == "message.read":
                conversation.unread_count = 0
                conversation.save(update_fields=["unread_count", "updated_at"])
            return

        if event_name.startswith("post."):
            post_payload = payload.get("post") or {}
            if isinstance(post_payload, dict):
                _apply_post_payload(profile, post_payload)
            return

        # analytics.synced, usage events and anything new only need to be
        # recorded here. Workers pick them up on their next pass.
        return


def mark_webhook_processed(event: ZernioWebhookEvent) -> None:
    event.status = ZernioWebhookEvent.Status.PROCESSED
    event.processed_at = timezone.now()
    event.error = None
    event.save(update_fields=["status", "processed_at", "error", "updated_at"])


def mark_webhook_failed(event: ZernioWebhookEvent, error: str) -> None:
    event.status = ZernioWebhookEvent.Status.FAILED
    event.error = error
    event.processed_at = timezone.now()
    event.save(update_fields=["status", "error", "processed_at", "updated_at"])
