import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models


DEFAULT_ROLE_DEFINITIONS = {
    "owner": {
        "name": "Owner",
        "permissions": ["*"],
        "hidden_fields": {},
    },
    "admin": {
        "name": "Admin",
        "permissions": [
            "users.manage",
            "roles.manage",
            "config.manage",
            "people.read",
            "people.write",
            "companies.read",
            "companies.write",
            "opportunities.read",
            "opportunities.write",
            "tasks.read",
            "tasks.write",
            "notes.read",
            "notes.write",
            "activities.read",
            "activities.write",
            "interactions.read",
            "interactions.write",
            "reports.read",
            "reports.write",
            "exports.read",
            "dashboard.read",
            "dashboard.write",
            "agent.use",
            "files.read",
            "files.write",
            "sync.read",
            "sync.write",
        ],
        "hidden_fields": {},
    },
    "manager": {
        "name": "Manager",
        "permissions": [
            "people.read",
            "people.write",
            "companies.read",
            "companies.write",
            "opportunities.read",
            "opportunities.write",
            "tasks.read",
            "tasks.write",
            "notes.read",
            "notes.write",
            "activities.read",
            "activities.write",
            "interactions.read",
            "interactions.write",
            "reports.read",
            "dashboard.read",
            "dashboard.write",
            "agent.use",
            "files.read",
            "sync.read",
        ],
        "hidden_fields": {},
    },
    "member": {
        "name": "Member",
        "permissions": [
            "people.read",
            "people.write",
            "companies.read",
            "companies.write",
            "opportunities.read",
            "opportunities.write",
            "tasks.read",
            "tasks.write",
            "notes.read",
            "notes.write",
            "activities.read",
            "activities.write",
            "interactions.read",
            "interactions.write",
            "reports.read",
            "dashboard.read",
            "dashboard.write",
            "agent.use",
            "files.read",
            "sync.read",
        ],
        "hidden_fields": {},
    },
}


class Organization(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class CustomUser(AbstractUser):
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="users",
        null=True,
        blank=True,
    )
    must_verify_email = models.BooleanField(default=False)
    verification_resend_count = models.IntegerField(default=0)
    last_verification_resend_at = models.DateTimeField(null=True, blank=True)
    google_email = models.EmailField(null=True, blank=True)

    def __str__(self):
        return self.username

    @property
    def org_role_assignment(self):
        if not self.organization_id:
            return None
        return (
            self.role_assignments.select_related("role")
            .filter(organization_id=self.organization_id)
            .first()
        )

    @property
    def org_role(self):
        assignment = self.org_role_assignment
        return assignment.role if assignment else None

    def get_org_permissions(self):
        if self.is_superuser or self.is_staff:
            return {"*"}
        role = self.org_role
        if not role:
            return set()
        return set(role.permissions or [])

    def has_org_permission(self, permission_key):
        permissions = self.get_org_permissions()
        return "*" in permissions or permission_key in permissions

    def get_hidden_fields(self, entity_type):
        role = self.org_role
        if not role:
            return set()
        hidden_fields = role.hidden_fields or {}
        return set(hidden_fields.get(entity_type, []))


class RoleTemplate(models.Model):
    SYSTEM_OWNER = "owner"
    SYSTEM_ADMIN = "admin"
    SYSTEM_MANAGER = "manager"
    SYSTEM_MEMBER = "member"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="roles"
    )
    name = models.CharField(max_length=255)
    system_key = models.CharField(max_length=50, blank=True, null=True)
    permissions = models.JSONField(default=list, blank=True)
    hidden_fields = models.JSONField(default=dict, blank=True)
    is_system = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "name"], name="unique_role_name_per_org"
            ),
            models.UniqueConstraint(
                fields=["organization", "system_key"],
                condition=models.Q(system_key__isnull=False),
                name="unique_role_system_key_per_org",
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.organization.name})"

    @classmethod
    def ensure_defaults_for_organization(cls, organization):
        roles = {}
        for system_key, definition in DEFAULT_ROLE_DEFINITIONS.items():
            role, _ = cls.objects.get_or_create(
                organization=organization,
                system_key=system_key,
                defaults={
                    "name": definition["name"],
                    "permissions": definition["permissions"],
                    "hidden_fields": definition["hidden_fields"],
                    "is_system": True,
                },
            )
            roles[system_key] = role
        return roles


class UserRoleAssignment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="role_assignments"
    )
    user = models.ForeignKey(
        CustomUser, on_delete=models.CASCADE, related_name="role_assignments"
    )
    role = models.ForeignKey(
        RoleTemplate, on_delete=models.CASCADE, related_name="user_assignments"
    )
    assigned_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        related_name="assigned_roles",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "user"],
                name="unique_role_assignment_per_user_org",
            )
        ]
        indexes = [
            models.Index(fields=["organization", "user"]),
        ]

    def __str__(self):
        return f"{self.user.username} -> {self.role.name}"

    def save(self, *args, **kwargs):
        if self.user.organization_id and self.organization_id != self.user.organization_id:
            raise ValueError("User assignment organization must match user organization.")
        if self.role.organization_id != self.organization_id:
            raise ValueError("Assigned role must belong to the same organization.")
        super().save(*args, **kwargs)


class Onboarding(models.Model):
    user = models.OneToOneField(
        CustomUser, on_delete=models.CASCADE, related_name="onboarding"
    )
    organization = models.ForeignKey(
        Organization, on_delete=models.SET_NULL, null=True, blank=True
    )
    whatsapp_number = models.CharField(max_length=20, blank=True, null=True)
    linkedin_url = models.URLField(max_length=500, blank=True, null=True)
    company_name = models.CharField(max_length=255, blank=True, null=True)
    company_website = models.URLField(max_length=500, blank=True, null=True)
    clients_count = models.CharField(max_length=50, blank=True, null=True)
    building_now = models.CharField(max_length=500, blank=True, null=True)
    referral = models.JSONField(default=list, blank=True)
    subscribe = models.BooleanField(default=True)
    is_completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Onboarding for {self.user.username}"


class AppUpdate(models.Model):
    title = models.CharField(max_length=255)
    icon = models.CharField(max_length=50, default="Sparkles")
    description = models.TextField()
    image_text = models.CharField(max_length=100, blank=True, null=True)
    primary_action_label = models.CharField(max_length=100)
    primary_action_link = models.CharField(max_length=255)
    primary_action_is_internal = models.BooleanField(default=True)
    secondary_action_label = models.CharField(max_length=100, blank=True, null=True)
    secondary_action_link = models.CharField(max_length=255, blank=True, null=True)
    secondary_action_is_internal = models.BooleanField(default=True)
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order", "created_at"]

    def __str__(self):
        return self.title


class Invitation(models.Model):
    TEAM = "TEAM"
    EXTERNAL = "EXTERNAL"
    TYPE_CHOICES = [
        (TEAM, "Team Mate"),
        (EXTERNAL, "External User"),
    ]

    inviter = models.ForeignKey(
        CustomUser, on_delete=models.CASCADE, related_name="sent_invitations"
    )
    token = models.CharField(max_length=64, unique=True, default=uuid.uuid4)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default=EXTERNAL)
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="invitations",
        null=True,
        blank=True,
    )
    role = models.ForeignKey(
        RoleTemplate,
        on_delete=models.SET_NULL,
        related_name="invitations",
        null=True,
        blank=True,
    )
    email = models.EmailField(blank=True, null=True)
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.type} Invitation from {self.inviter.username}"


class UserSetting(models.Model):
    user = models.ForeignKey(
        "users.CustomUser", on_delete=models.CASCADE, related_name="user_settings"
    )

    def __str__(self):
        return f"Settings for {self.user.username}"


class UserPreference(models.Model):
    setting = models.ForeignKey(
        UserSetting, on_delete=models.CASCADE, related_name="preferences"
    )
    name = models.CharField(max_length=255)
    value = models.TextField()

    class Meta:
        unique_together = ["setting", "name"]

    def __str__(self):
        return f"{self.name}"
