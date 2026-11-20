import uuid

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils.translation import gettext_lazy as _


class TimeStampedModel(models.Model):
    """
    An abstract base class model that provides self-updating
    'created_at' and 'updated_at' fields.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class TenantModel(TimeStampedModel):
    organization = models.ForeignKey(
        "users.Organization",
        on_delete=models.CASCADE,
        related_name="%(class)ss",
        null=True,
        blank=True,
    )

    class Meta:
        abstract = True


class CRMConfiguration(TenantModel):
    """
    Stores user-specific configurations like custom pipeline stages and lead types.
    """

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="crm_config"
    )
    # Storing lists of strings, e.g. ["Lead", "Qualified", "Custom Stage", ...]
    pipeline_stages = models.JSONField(default=list, blank=True)
    opportunity_stages = models.JSONField(default=list, blank=True)
    lead_types = models.JSONField(default=list, blank=True)
    lead_sources = models.JSONField(default=list, blank=True)

    # Defaults to populate if empty
    DEFAULT_STAGES = [
        {"label": "Lead", "color": "bg-gray-800 text-gray-400"},
        {"label": "Qualified", "color": "bg-indigo-900/40 text-indigo-400"},
        {"label": "Negotiation", "color": "bg-yellow-900/40 text-yellow-400"},
        {"label": "Closed", "color": "bg-green-900/40 text-green-400"},
        {"label": "Lost", "color": "bg-red-900/40 text-red-400"},
    ]
    DEFAULT_LEAD_TYPES = [
        {"label": "Prospect", "color": "bg-blue-900/40 text-blue-400"},
        {"label": "Cold Lead", "color": "bg-cyan-900/40 text-cyan-400"},
        {"label": "Warm Lead", "color": "bg-orange-900/40 text-orange-400"},
        {"label": "Hot Lead", "color": "bg-red-900/40 text-red-500"},
        {"label": "Client", "color": "bg-green-900/40 text-green-400"},
    ]
    DEFAULT_OPPORTUNITY_STAGES = [
        {"label": "Screening", "color": "bg-slate-900/40 text-slate-300"},
        {"label": "Qualified", "color": "bg-blue-900/40 text-blue-400"},
        {"label": "Proposal", "color": "bg-violet-900/40 text-violet-400"},
        {"label": "Negotiation", "color": "bg-amber-900/40 text-amber-400"},
        {"label": "Won", "color": "bg-green-900/40 text-green-400"},
        {"label": "Lost", "color": "bg-red-900/40 text-red-400"},
    ]
    DEFAULT_LEAD_SOURCES = [
        {"label": "Inbound", "color": "bg-green-900/40 text-green-400"},
        {"label": "Outbound", "color": "bg-purple-900/40 text-purple-400"},
    ]

    show_ids_in_admin = models.BooleanField(
        default=True, help_text="Show ID column in Django Admin list views"
    )

    def save(self, *args, **kwargs):
        # Ensure defaults exist on creation if empty
        if not self.pipeline_stages:
            self.pipeline_stages = self.DEFAULT_STAGES
        if not self.opportunity_stages:
            self.opportunity_stages = self.DEFAULT_OPPORTUNITY_STAGES
        if not self.lead_types:
            self.lead_types = self.DEFAULT_LEAD_TYPES
        if not self.lead_sources:
            self.lead_sources = self.DEFAULT_LEAD_SOURCES
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Config for {self.user}"


class Company(TenantModel):
    name = models.CharField(max_length=255)
    domain = models.CharField(max_length=255, blank=True, null=True)
    employees = models.TextField(blank=True, null=True, help_text="Number of employees")
    location = models.CharField(max_length=255, blank=True, null=True)
    linkedin = models.URLField(max_length=500, blank=True, null=True)
    arr = models.CharField(
        max_length=100, blank=True, null=True, help_text="Annual Recurring Revenue"
    )
    icp = models.BooleanField(default=False, help_text="Ideal Customer Profile match")

    # Ownership
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="owned_companies",
    )

    class Meta:
        verbose_name_plural = "Companies"
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class Person(TenantModel):
    # We removed TextChoices to allow dynamic user-defined strings.
    # Frontend will fetch valid options from CRMConfiguration.

    name = models.CharField(max_length=255)
    email = models.EmailField(null=True, blank=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    job_title = models.CharField(max_length=255, blank=True, null=True)
    avatar = models.URLField(blank=True, null=True)
    city = models.CharField(max_length=255, blank=True, null=True)
    linkedin = models.URLField(max_length=500, blank=True, null=True)

    # Metrics / Status
    conversion_rate = models.IntegerField(default=0, help_text="Probability 0-100")
    stage = models.CharField(
        max_length=100,
        default="Lead",
        help_text="Current stage in the pipeline (e.g. Lead, Qualified)",
    )
    lead_type = models.CharField(
        max_length=100,
        default="Prospect",
        help_text="Type of lead (e.g. Prospect, Client)",
    )
    lead_source = models.CharField(
        max_length=50,
        default="Outbound",
        help_text="Source of the lead (e.g. Inbound, Outbound, or custom)",
    )
    last_action = models.TextField(blank=True, null=True)
    recommended_action = models.TextField(blank=True, null=True)

    # Relationships
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="people",
        null=True,  # Allow person without company initially?
        blank=True,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_people",
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="owned_people",
    )

    class Meta:
        verbose_name_plural = "People"
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class PersonIdentity(TenantModel):
    """A platform handle that belongs to a Person.

    One person can have several identities (Instagram, WhatsApp, email, ...).
    The identity is the matching key between an external conversation and a CRM
    contact, so the Person model stays free of platform-specific columns.
    """

    person = models.ForeignKey(
        Person,
        on_delete=models.CASCADE,
        related_name="identities",
    )
    platform = models.CharField(max_length=50, db_index=True)
    external_id = models.CharField(max_length=255, db_index=True)
    username = models.CharField(max_length=255, blank=True, null=True)
    display_name = models.CharField(max_length=255, blank=True, null=True)
    avatar = models.URLField(max_length=500, blank=True, null=True)
    account = models.ForeignKey(
        "integrations.ZernioAccount",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="person_identities",
    )
    metadata = models.JSONField(default=dict, blank=True)
    last_seen_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Person Identity"
        verbose_name_plural = "Person Identities"
        ordering = ["-last_seen_at", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "platform", "account", "external_id"],
                condition=models.Q(account__isnull=False),
                name="uniq_person_identity_account",
            ),
            models.UniqueConstraint(
                fields=["organization", "platform", "external_id"],
                condition=models.Q(account__isnull=True),
                name="uniq_person_identity_no_account",
            ),
        ]
        indexes = [
            models.Index(fields=["organization", "platform", "external_id"]),
            models.Index(fields=["person", "platform"]),
        ]

    def __str__(self):
        handle = self.username or self.external_id
        return f"{self.platform}:{handle}"


class Opportunity(TenantModel):
    # Removed strict choices to allow flexibility if needed,
    # though frontend types currently show strict union.
    # Keeping it flexible in backend is safer for future custom stages.

    name = models.CharField(max_length=255)
    value = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    deal_stage = models.CharField(max_length=100, default="Screening")
    expected_close_date = models.DateField(null=True, blank=True)
    probability = models.IntegerField(
        default=0, validators=[MinValueValidator(0), MaxValueValidator(100)]
    )

    # Relationships
    company = models.ForeignKey(
        Company,
        on_delete=models.SET_NULL,
        related_name="opportunities",
        null=True,
        blank=True,
    )
    primary_contact = models.ForeignKey(
        Person,
        on_delete=models.SET_NULL,
        related_name="opportunities",
        null=True,
        blank=True,
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="owned_opportunities",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_opportunities",
    )

    class Meta:
        verbose_name_plural = "Opportunities"
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class Task(TenantModel):
    class Status(models.TextChoices):
        TODO = "Todo", _("Todo")
        IN_PROGRESS = "In Progress", _("In Progress")
        DONE = "Done", _("Done")

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    status = models.CharField(
        max_length=50, choices=Status.choices, default=Status.TODO
    )
    due_date = models.DateTimeField(blank=True, null=True)

    # Assignments
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="assigned_tasks",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_tasks",
    )

    # Relations (Polymorphic-ish via explicit nullable FKs as per frontend structure)
    related_person = models.ForeignKey(
        Person, on_delete=models.CASCADE, related_name="tasks", null=True, blank=True
    )
    related_company = models.ForeignKey(
        Company, on_delete=models.CASCADE, related_name="tasks", null=True, blank=True
    )

    class Meta:
        ordering = ["due_date", "-created_at"]

    def save(self, *args, **kwargs):
        if self.related_person and not self.related_company:
            self.related_company = self.related_person.company
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title


class Note(TenantModel):
    title = models.CharField(max_length=255, default="Untitled Note")
    content = models.TextField(blank=True)

    # Relations
    related_person = models.ForeignKey(
        Person, on_delete=models.CASCADE, related_name="notes", null=True, blank=True
    )
    related_company = models.ForeignKey(
        Company, on_delete=models.CASCADE, related_name="notes", null=True, blank=True
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_notes",
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class ActivityLog(TenantModel):
    class Type(models.TextChoices):
        EMAIL = "email", _("Email")
        CALL = "call", _("Call")
        MEETING = "meeting", _("Meeting")
        MSG = "msg", _("Message")
        UPDATE = "update", _("Update")

    class Channel(models.TextChoices):
        EMAIL = "email", _("Email")
        LINKEDIN = "linkedin", _("LinkedIn")
        WHATSAPP = "whatsapp", _("WhatsApp")
        SYSTEM = "system", _("System")

    class Direction(models.TextChoices):
        RECEIVED = "received", _("Received")
        SENT = "sent", _("Sent")
        SYSTEM = "system", _("System")

    type = models.CharField(max_length=50, choices=Type.choices)
    channel = models.CharField(
        max_length=50,
        choices=Channel.choices,
        default=Channel.SYSTEM,
        blank=True,
        null=True,
    )
    direction = models.CharField(
        max_length=20,
        choices=Direction.choices,
        default=Direction.SYSTEM,
        blank=True,
        null=True,
    )
    title = models.CharField(max_length=255, blank=True, null=True)
    content = models.TextField()
    date = models.DateTimeField(
        default=models.functions.Now(), help_text="When the activity actually happened"
    )

    # Relations
    related_person = models.ForeignKey(
        Person,
        on_delete=models.CASCADE,
        related_name="activities",
        null=True,
        blank=True,
    )
    related_company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="activities",
        null=True,
        blank=True,
    )
    conversation = models.ForeignKey(
        "integrations.ZernioConversation",
        on_delete=models.SET_NULL,
        related_name="activities",
        null=True,
        blank=True,
        help_text="Linked Zernio conversation when the activity came from a chat",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        help_text="User who performed the activity",
    )

    class Meta:
        verbose_name = "Activity Log"
        ordering = ["-date"]

    def __str__(self):
        return f"{self.type} - {self.date}"


class CustomView(TenantModel):
    class EntityType(models.TextChoices):
        PERSON = "person", _("Person")
        COMPANY = "company", _("Company")
        OPPORTUNITY = "opportunity", _("Opportunity")
        TASK = "task", _("Task")
        NOTE = "note", _("Note")
        ACTIVITY = "activity", _("Activity")

    name = models.CharField(max_length=255)
    entity_type = models.CharField(max_length=50, choices=EntityType.choices)
    is_default = models.BooleanField(default=False)

    # Storing configuration as JSON
    filter_rules = models.JSONField(default=list, blank=True)
    sort_rules = models.JSONField(default=list, blank=True)
    visible_columns = models.JSONField(default=list, blank=True)

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="custom_views"
    )

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.entity_type})"


class Report(TenantModel):
    name = models.CharField(max_length=255)
    is_shared = models.BooleanField(default=False)

    # Report Configuration
    filters = models.JSONField(default=list, blank=True)
    sorts = models.JSONField(default=list, blank=True)

    # Snapshot data
    data = models.JSONField(default=list, blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reports"
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class SyncRecord(TenantModel):
    """
    Tracks synchronization state between CRM entities and external systems (Notion, etc.)
    """

    class EntityType(models.TextChoices):
        COMPANY = "company", _("Company")
        PERSON = "person", _("Person")
        OPPORTUNITY = "opportunity", _("Opportunity")
        TASK = "task", _("Task")
        NOTE = "note", _("Note")
        ACTIVITY = "activity", _("Activity")

    class SyncStatus(models.TextChoices):
        PENDING = "pending", _("Pending")
        SYNCED = "synced", _("Synced")
        ERROR = "error", _("Error")
        SYNCING = "syncing", _("Syncing")

    class Direction(models.TextChoices):
        CRM_TO_EXTERNAL = "crm_to_external", _("CRM to External")
        EXTERNAL_TO_CRM = "external_to_crm", _("External to CRM")

    entity_type = models.CharField(
        max_length=50, choices=EntityType.choices, db_index=True
    )
    entity_id = models.UUIDField(db_index=True, help_text="CRM record UUID")
    external_id = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        db_index=True,
        help_text="External system ID (e.g., Notion page ID)",
    )
    external_system = models.CharField(
        max_length=50,
        default="notion",
        help_text="External system name (notion, hubspot, etc.)",
    )
    sync_status = models.CharField(
        max_length=20,
        choices=SyncStatus.choices,
        default=SyncStatus.PENDING,
        help_text="Current sync state",
    )
    last_synced = models.DateTimeField(
        blank=True, null=True, help_text="Last successful sync timestamp"
    )
    last_sync_direction = models.CharField(
        max_length=20,
        choices=Direction.choices,
        blank=True,
        null=True,
        help_text="Direction of last sync",
    )
    last_sync_error = models.TextField(
        blank=True, null=True, help_text="Error message from last failed sync"
    )
    sync_version = models.IntegerField(
        default=0, help_text="Incremented on each sync for conflict detection"
    )

    class Meta:
        ordering = ["-last_synced", "-created_at"]
        unique_together = [
            ["organization", "entity_type", "entity_id", "external_system"],
            ["organization", "external_id", "external_system"],
        ]
        indexes = [
            models.Index(fields=["organization", "sync_status", "entity_type"]),
            models.Index(fields=["organization", "external_system", "last_synced"]),
        ]

    def __str__(self):
        return f"{self.entity_type}:{self.entity_id} <-> {self.external_system}:{self.external_id or 'unsynced'}"


class SyncLog(TenantModel):
    """
    Audit trail for all sync operations. Tracks every attempt for debugging and monitoring.
    """

    class Status(models.TextChoices):
        SUCCESS = "success", _("Success")
        FAILED = "failed", _("Failed")
        SKIPPED = "skipped", _("Skipped")
        CONFLICT = "conflict", _("Conflict")

    class Direction(models.TextChoices):
        CRM_TO_EXTERNAL = "crm_to_external", _("CRM to External")
        EXTERNAL_TO_CRM = "external_to_crm", _("External to CRM")

    # Link to sync record (optional - may be null if sync record doesn't exist yet)
    sync_record = models.ForeignKey(
        SyncRecord,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="logs",
    )

    # Entity info (denormalized for easier querying)
    entity_type = models.CharField(max_length=50)
    entity_id = models.UUIDField()
    external_system = models.CharField(max_length=50)
    external_id = models.CharField(max_length=100, blank=True, null=True)

    # Sync details
    direction = models.CharField(max_length=20, choices=Direction.choices)
    status = models.CharField(max_length=20, choices=Status.choices)

    # Data tracking
    data_hash = models.CharField(
        max_length=64,
        blank=True,
        null=True,
        help_text="SHA256 hash of data for change detection",
    )
    crm_data_snapshot = models.JSONField(
        default=dict, blank=True, help_text="Snapshot of CRM data at sync time"
    )
    external_data_snapshot = models.JSONField(
        default=dict, blank=True, help_text="Snapshot of external data at sync time"
    )

    # Error tracking
    error_message = models.TextField(blank=True, null=True)
    error_details = models.JSONField(default=dict, blank=True)

    # Performance tracking
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(blank=True, null=True)

    # User/Process tracking
    triggered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="User who triggered this sync (null if automated)",
    )
    source = models.CharField(
        max_length=50,
        default="api",
        help_text="Source of sync: api, webhook, cron, manual",
    )

    class Meta:
        ordering = ["-started_at"]
        indexes = [
            models.Index(
                fields=["organization", "entity_type", "entity_id", "-started_at"]
            ),
            models.Index(fields=["organization", "status", "-started_at"]),
            models.Index(fields=["organization", "external_system", "-started_at"]),
        ]

    def __str__(self):
        return f"{self.entity_type}:{self.entity_id} {self.direction} {self.status} @ {self.started_at}"
