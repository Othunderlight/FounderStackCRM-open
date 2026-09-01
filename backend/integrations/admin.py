from django import forms
from django.contrib import admin, messages

from .models import (
    APIKey,
    Credential,
    File,
    Key,
    SystemAPIKeyPolicy,
    TenantBackupConfig,
    Webhook,
    WebhookDelivery,
)


class APIKeyAdminForm(forms.ModelForm):
    scopes = forms.MultipleChoiceField(
        choices=APIKey.SCOPE_CHOICES,
        widget=forms.CheckboxSelectMultiple,
        required=False,
    )

    class Meta:
        model = APIKey
        fields = "__all__"


@admin.register(APIKey)
class APIKeyAdmin(admin.ModelAdmin):
    form = APIKeyAdminForm
    list_display = (
        "name",
        "prefix",
        "user",
        "organization",
        "created_at",
        "is_active",
        "rate_limit_per_minute",
    )
    list_filter = ("organization", "is_active", "created_at")
    search_fields = ("name", "prefix", "user__username", "organization__name")
    readonly_fields = ("hashed_key", "prefix", "created_at", "last_used_at")
    fieldsets = (
        (None, {"fields": ("name", "user", "organization", "is_active")}),
        (
            "Security & Limits",
            {
                "fields": (
                    "scopes",
                    "rate_limit_per_minute",
                    "expires_at",
                    "prefix",
                    "hashed_key",
                )
            },
        ),
        ("Usage Info", {"fields": ("created_at", "last_used_at")}),
    )

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        if hasattr(obj, "_raw_key"):
            self.message_user(
                request,
                f"API Key created successfully! Copy this key now, you won't see it again: {obj._raw_key}",
                level=messages.SUCCESS,
            )


class SystemAPIKeyPolicyAdminForm(forms.ModelForm):
    forbidden_scopes = forms.MultipleChoiceField(
        choices=APIKey.SCOPE_CHOICES,
        widget=forms.CheckboxSelectMultiple,
        required=False,
    )

    class Meta:
        model = SystemAPIKeyPolicy
        fields = "__all__"


@admin.register(SystemAPIKeyPolicy)
class SystemAPIKeyPolicyAdmin(admin.ModelAdmin):
    form = SystemAPIKeyPolicyAdminForm
    list_display = ("organization", "max_rate_limit", "force_search_only", "is_active")
    list_filter = ("is_active",)


@admin.register(Webhook)
class WebhookAdmin(admin.ModelAdmin):
    list_display = ("url", "organization", "is_active", "created_at")
    list_filter = ("organization", "is_active", "created_at")
    search_fields = ("url", "organization__name")


@admin.register(WebhookDelivery)
class WebhookDeliveryAdmin(admin.ModelAdmin):
    list_display = ("webhook", "event", "status_code", "success", "created_at")
    list_filter = ("success", "event", "created_at")
    readonly_fields = (
        "webhook",
        "event",
        "payload",
        "status_code",
        "response_body",
        "success",
        "duration_ms",
        "created_at",
    )


@admin.register(File)
class FileAdmin(admin.ModelAdmin):
    list_display = ("name", "public_url", "organization", "created_at")
    list_filter = ("organization", "created_at")


class KeyInline(admin.TabularInline):
    model = Key
    extra = 1


@admin.register(Credential)
class CredentialAdmin(admin.ModelAdmin):
    list_display = ("user",)
    search_fields = ("user__username",)
    inlines = [KeyInline]


@admin.register(TenantBackupConfig)
class TenantBackupConfigAdmin(admin.ModelAdmin):
    list_display = (
        "organization",
        "github_username",
        "repo_name",
        "branch_name",
        "is_active",
        "last_backup_at",
        "updated_at",
    )
    list_filter = ("organization", "is_active", "updated_at")
    search_fields = ("organization__name", "github_username", "repo_name")
    readonly_fields = ("created_at", "updated_at", "last_backup_at")
