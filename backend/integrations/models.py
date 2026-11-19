import hashlib
import secrets

from app.models import TenantModel
from django.conf import settings
from django.db import models


class File(TenantModel):
    name = models.CharField(max_length=255)
    public_url = models.URLField(max_length=500)

    def __str__(self):
        return (
            f"{self.name} ({self.organization.name if self.organization else 'No Org'})"
        )


class APIKey(TenantModel):
    SCOPE_CHOICES = [
        ("apikeys:read", "Read API Keys"),
        ("apikeys:write", "Write API Keys"),
        ("crmconfigurations:read", "Read CRM Configurations"),
        ("crmconfigurations:write", "Write CRM Configurations"),
        ("people:read", "Read People"),
        ("people:write", "Write People"),
        ("companies:read", "Read Companies"),
        ("companies:write", "Write Companies"),
        ("tasks:read", "Read Tasks"),
        ("tasks:write", "Write Tasks"),
        ("activitylogs:read", "Read Activity Logs"),
        ("activitylogs:write", "Write Activity Logs"),
        ("notes:read", "Read Notes"),
        ("notes:write", "Write Notes"),
        ("opportunities:read", "Read Opportunities"),
        ("opportunities:write", "Write Opportunities"),
        ("reports:read", "Read Reports"),
        ("reports:write", "Write Reports"),
        ("dashboardconfig:read", "Read Dashboard Config"),
        ("dashboardconfig:write", "Write Dashboard Config"),
        ("files:read", "Read Files"),
        ("files:write", "Write Files"),
        ("webhooks:read", "Read Webhooks"),
        ("webhooks:write", "Write Webhooks"),
        ("invitations:read", "Read Invitations"),
        ("invitations:write", "Write Invitations"),
        ("syncrecords:read", "Read Sync Records"),
        ("syncrecords:write", "Write Sync Records"),
        ("synclogs:read", "Read Sync Logs"),
        ("synclogs:write", "Write Sync Logs"),
        ("search:only", "Search Only (No listing)"),
        ("interactiontypes:read", "Read Interaction Types"),
        ("interactiontypes:write", "Write Interaction Types"),
        ("interactions:read", "Read Interaction Logs"),
        ("interactions:write", "Write Interaction Logs"),
        ("integration-sessions:read", "Read Integration Sessions"),
        ("integration-sessions:write", "Write Integration Sessions"),
        ("userpreferences:read", "Read User Preferences"),
        ("userpreferences:write", "Write User Preferences"),
        ("integrations:read", "Read Integrations"),
        ("integrations:write", "Write Integrations"),
    ]

    name = models.CharField(max_length=255)
    prefix = models.CharField(max_length=8)
    hashed_key = models.CharField(max_length=128)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="api_keys"
    )
    is_active = models.BooleanField(default=True)
    last_used_at = models.DateTimeField(null=True, blank=True)

    # New Fields
    scopes = models.JSONField(default=list, help_text="List of allowed scopes")
    rate_limit_per_minute = models.IntegerField(
        default=60, help_text="Requests allowed per minute"
    )
    expires_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.name} - {self.prefix}..."

    def save(self, *args, **kwargs):
        if not self.hashed_key:
            raw_key = secrets.token_urlsafe(32)
            self.prefix = raw_key[:8]
            self.hashed_key = hashlib.sha256(raw_key.encode()).hexdigest()
            # Store raw key temporarily so it can be displayed once
            self._raw_key = raw_key

        if not self.organization and self.user:
            self.organization = self.user.organization

        super().save(*args, **kwargs)

    @classmethod
    def create_key(
        cls,
        user,
        name,
        organization=None,
        scopes=None,
        expires_at=None,
        rate_limit_per_minute=60,
    ):
        """
        Creates a new API key with optional scopes, expiration, and rate limit.
        """
        instance = cls(
            name=name,
            user=user,
            organization=organization or user.organization,
            scopes=scopes or [],
            expires_at=expires_at,
            rate_limit_per_minute=rate_limit_per_minute,
        )
        instance.save()
        return instance, getattr(instance, "_raw_key", None)

    def check_key(self, raw_key):
        """
        Verifies a raw key against the stored hash.
        """
        hashed_input = hashlib.sha256(raw_key.encode()).hexdigest()
        return secrets.compare_digest(hashed_input, self.hashed_key)


class SystemAPIKeyPolicy(models.Model):
    """
    Policy enforced by Super Admin across organizations or globally.
    """

    organization = models.OneToOneField(
        "users.Organization",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        help_text="If null, this is a global policy for all organizations.",
    )
    forbidden_scopes = models.JSONField(
        default=list, blank=True, help_text="Scopes that are forced to be disabled."
    )
    max_rate_limit = models.IntegerField(
        null=True, blank=True, help_text="Absolute cap on rate limit per minute."
    )
    force_search_only = models.BooleanField(
        default=False,
        help_text="If true, forces search:only even if listing is in scopes.",
    )
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"Policy for {self.organization.name if self.organization else 'Global'}"

    class Meta:
        verbose_name = "System API Key Policy"
        verbose_name_plural = "System API Key Policies"


class Webhook(TenantModel):
    url = models.URLField()
    secret = models.CharField(max_length=64, default=secrets.token_hex)
    events = models.JSONField(
        default=list, help_text="List of events to subscribe to, e.g. ['lead.created']"
    )
    is_active = models.BooleanField(default=True)
    description = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f"{self.url} ({self.organization})"


class WebhookDelivery(TenantModel):
    webhook = models.ForeignKey(
        Webhook, on_delete=models.CASCADE, related_name="deliveries"
    )
    event = models.CharField(max_length=100)
    payload = models.JSONField()
    status_code = models.IntegerField(null=True, blank=True)
    response_body = models.TextField(blank=True, null=True)
    success = models.BooleanField(default=False)
    duration_ms = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.event} -> {self.webhook.id} ({'Success' if self.success else 'Failed'})"


class Credential(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="credentials"
    )

    def __str__(self):
        return f"Credentials for {self.user.username}"


class Key(models.Model):
    credential = models.ForeignKey(
        Credential, on_delete=models.CASCADE, related_name="keys"
    )
    name = models.CharField(max_length=255)
    value = models.TextField()

    def __str__(self):
        return f"{self.name}"


class IntegrationSession(TenantModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="integration_sessions",
    )
    key = models.CharField(max_length=255, null=False)
    session = models.CharField(max_length=255, null=False)

    def __str__(self):
        return f"IntegrationSession for {self.user.email} - {self.key}"


class ZernioProfile(TenantModel):
    """A Zernio profile, one per CRM organization (the "customer" in Zernio)."""

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        PENDING = "pending", "Pending"
        DISCONNECTED = "disconnected", "Disconnected"

    organization = models.OneToOneField(
        "users.Organization",
        on_delete=models.CASCADE,
        related_name="zernio_profile",
    )
    profile_id = models.CharField(
        max_length=128,
        blank=True,
        null=True,
        db_index=True,
        help_text="Zernio profile _id. Created lazily on first connect.",
    )
    name = models.CharField(max_length=255)
    external_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        db_index=True,
        help_text="Our stable customer id, sent to Zernio as externalId.",
    )
    is_default = models.BooleanField(default=False)
    status = models.CharField(
        max_length=30, choices=Status.choices, default=Status.PENDING
    )
    metadata = models.JSONField(default=dict, blank=True)
    analytics_data = models.JSONField(
        default=dict, blank=True, help_text="Last dashboard payload fetched from Zernio."
    )
    analytics_cursor = models.CharField(max_length=255, blank=True, null=True)
    last_analytics_sync_at = models.DateTimeField(null=True, blank=True)
    last_inbox_sync_at = models.DateTimeField(null=True, blank=True)
    last_synced_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Zernio Profile"
        verbose_name_plural = "Zernio Profiles"
        ordering = ["name"]

    def __str__(self):
        state = self.profile_id or "not provisioned"
        return f"{self.name} ({state})"


class ZernioAccount(TenantModel):
    """A social/messaging account connected to a Zernio profile."""

    class Status(models.TextChoices):
        CONNECTED = "connected", "Connected"
        HEALTHY = "healthy", "Healthy"
        WARNING = "warning", "Warning"
        ERROR = "error", "Error"
        DISCONNECTED = "disconnected", "Disconnected"

    profile = models.ForeignKey(
        ZernioProfile, on_delete=models.CASCADE, related_name="accounts"
    )
    account_id = models.CharField(max_length=128, unique=True, db_index=True)
    platform = models.CharField(max_length=50, db_index=True)
    username = models.CharField(max_length=255, blank=True, null=True)
    display_name = models.CharField(max_length=255, blank=True, null=True)
    avatar_url = models.URLField(max_length=500, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    status = models.CharField(
        max_length=30, choices=Status.choices, default=Status.CONNECTED
    )
    can_post = models.BooleanField(default=True)
    token_valid = models.BooleanField(default=True)
    needs_reconnect = models.BooleanField(default=False)
    issues = models.JSONField(default=list, blank=True)
    health = models.JSONField(default=dict, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    connected_at = models.DateTimeField(null=True, blank=True)
    disconnected_at = models.DateTimeField(null=True, blank=True)
    last_synced_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Zernio Account"
        verbose_name_plural = "Zernio Accounts"
        ordering = ["platform", "username"]

    def __str__(self):
        return f"{self.platform}:{self.username or self.account_id}"


class ZernioConversation(TenantModel):
    """An inbox conversation aggregated from one of the customer's accounts."""

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        ARCHIVED = "archived", "Archived"
        CLOSED = "closed", "Closed"

    profile = models.ForeignKey(
        ZernioProfile, on_delete=models.CASCADE, related_name="conversations"
    )
    account = models.ForeignKey(
        ZernioAccount,
        on_delete=models.SET_NULL,
        related_name="conversations",
        null=True,
        blank=True,
    )
    conversation_id = models.CharField(max_length=128, unique=True, db_index=True)
    platform = models.CharField(max_length=50, blank=True, null=True, db_index=True)
    participant_id = models.CharField(max_length=255, blank=True, null=True)
    participant_name = models.CharField(max_length=255, blank=True, null=True)
    participant_username = models.CharField(max_length=255, blank=True, null=True)
    participant_avatar = models.URLField(max_length=500, blank=True, null=True)
    status = models.CharField(
        max_length=30, choices=Status.choices, default=Status.ACTIVE
    )
    last_message_text = models.TextField(blank=True, null=True)
    last_message_at = models.DateTimeField(null=True, blank=True, db_index=True)
    unread_count = models.PositiveIntegerField(default=0)
    metadata = models.JSONField(default=dict, blank=True)
    last_synced_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Zernio Conversation"
        verbose_name_plural = "Zernio Conversations"
        ordering = ["-last_message_at", "-updated_at"]

    def __str__(self):
        return f"{self.participant_name or self.conversation_id} ({self.platform})"


class ZernioMessage(TenantModel):
    """A message inside a Zernio conversation."""

    class Direction(models.TextChoices):
        INCOMING = "incoming", "Incoming"
        OUTGOING = "outgoing", "Outgoing"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        SENT = "sent", "Sent"
        DELIVERED = "delivered", "Delivered"
        READ = "read", "Read"
        FAILED = "failed", "Failed"

    conversation = models.ForeignKey(
        ZernioConversation, on_delete=models.CASCADE, related_name="messages"
    )
    message_id = models.CharField(
        max_length=255, unique=True, null=True, blank=True, db_index=True
    )
    direction = models.CharField(
        max_length=20, choices=Direction.choices, default=Direction.INCOMING
    )
    text = models.TextField(blank=True, null=True)
    sender = models.JSONField(default=dict, blank=True)
    attachments = models.JSONField(default=list, blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.SENT
    )
    error_message = models.TextField(blank=True, null=True)
    idempotency_key = models.CharField(max_length=255, blank=True, null=True)
    sent_at = models.DateTimeField(null=True, blank=True, db_index=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = "Zernio Message"
        verbose_name_plural = "Zernio Messages"
        ordering = ["sent_at", "created_at"]

    def __str__(self):
        return f"{self.direction} message in {self.conversation_id}"


class ZernioPost(TenantModel):
    """A post published through Zernio, including its latest analytics."""

    profile = models.ForeignKey(
        ZernioProfile, on_delete=models.CASCADE, related_name="posts"
    )
    post_id = models.CharField(max_length=128, unique=True, db_index=True)
    content = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=50, blank=True, null=True, db_index=True)
    platforms = models.JSONField(default=list, blank=True)
    platform_post_urls = models.JSONField(default=list, blank=True)
    analytics = models.JSONField(default=dict, blank=True)
    published_at = models.DateTimeField(null=True, blank=True, db_index=True)
    scheduled_for = models.DateTimeField(null=True, blank=True)
    last_synced_at = models.DateTimeField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = "Zernio Post"
        verbose_name_plural = "Zernio Posts"
        ordering = ["-published_at", "-created_at"]

    def __str__(self):
        return f"{self.post_id} ({self.status or 'unknown'})"


class ZernioDailyMetric(TenantModel):
    """One day of aggregated metrics for a profile."""

    profile = models.ForeignKey(
        ZernioProfile, on_delete=models.CASCADE, related_name="daily_metrics"
    )
    date = models.DateField(db_index=True)
    metrics = models.JSONField(default=dict, blank=True)
    platform_breakdown = models.JSONField(default=list, blank=True)
    raw = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = "Zernio Daily Metric"
        verbose_name_plural = "Zernio Daily Metrics"
        ordering = ["-date"]
        constraints = [
            models.UniqueConstraint(
                fields=["profile", "date"], name="unique_zernio_metric_per_profile_day"
            )
        ]

    def __str__(self):
        return f"{self.profile_id} {self.date}"


class ZernioWebhookEvent(TenantModel):
    """Inbound webhook audit log and idempotency record."""

    class Status(models.TextChoices):
        RECEIVED = "received", "Received"
        PROCESSED = "processed", "Processed"
        IGNORED = "ignored", "Ignored"
        FAILED = "failed", "Failed"

    event_id = models.CharField(max_length=255, unique=True, db_index=True)
    event = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    organization = models.ForeignKey(
        "users.Organization",
        on_delete=models.SET_NULL,
        related_name="zernio_webhook_events",
        null=True,
        blank=True,
    )
    profile = models.ForeignKey(
        ZernioProfile,
        on_delete=models.SET_NULL,
        related_name="webhook_events",
        null=True,
        blank=True,
    )
    account_id = models.CharField(max_length=128, blank=True, null=True)
    payload = models.JSONField(default=dict, blank=True)
    status = models.CharField(
        max_length=30, choices=Status.choices, default=Status.RECEIVED
    )
    error = models.TextField(blank=True, null=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Zernio Webhook Event"
        verbose_name_plural = "Zernio Webhook Events"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.event or 'event'} ({self.status})"


class TenantBackupConfig(TenantModel):
    github_username = models.CharField(max_length=100)
    github_access_token = models.CharField(max_length=255, help_text="Store encrypted token")
    repo_name = models.CharField(max_length=200, help_text="Repository name or full repo path")
    branch_name = models.CharField(max_length=100, default="main")
    last_backup_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Tenant Backup Config"
        verbose_name_plural = "Tenant Backup Configs"

    def __str__(self):
        org_name = self.organization.name if self.organization else "No Org"
        return f"{org_name} -> {self.github_username}/{self.repo_name}"
