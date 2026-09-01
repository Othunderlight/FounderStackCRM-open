from app.admin import IDDisplayMixin
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import (
    AppUpdate,
    CustomUser,
    Invitation,
    Onboarding,
    Organization,
    RoleTemplate,
    UserRoleAssignment,
    UserSetting,
    UserPreference,
)


class UserPreferenceInline(admin.TabularInline):
    model = UserPreference
    extra = 1


@admin.register(UserSetting)
class UserSettingAdmin(IDDisplayMixin, admin.ModelAdmin):
    list_display = ("user",)
    search_fields = ("user__username", "user__email")
    inlines = [UserPreferenceInline]


@admin.register(AppUpdate)
class AppUpdateAdmin(IDDisplayMixin, admin.ModelAdmin):
    list_display = ["title", "icon", "order", "created_at"]
    list_editable = ["order"]
    search_fields = ["title", "description"]

    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        form.base_fields[
            "icon"
        ].help_text = 'Choose an icon from <a href="https://lucide.dev/icons/" target="_blank">Lucide Icons</a>.'
        return form


@admin.register(Organization)
class OrganizationAdmin(IDDisplayMixin, admin.ModelAdmin):
    list_display = ["name", "created_at", "updated_at"]
    search_fields = ["name"]


@admin.register(Onboarding)
class OnboardingAdmin(IDDisplayMixin, admin.ModelAdmin):
    list_display = [
        "user",
        "company_name",
        "organization",
        "subscribe",
        "is_completed",
        "created_at",
    ]
    list_filter = ["is_completed", "subscribe", "clients_count"]
    search_fields = [
        "user__username",
        "company_name",
        "whatsapp_number",
        "linkedin_url",
    ]
    fieldsets = (
        (None, {"fields": ("user", "organization", "is_completed")}),
        ("Contact Info", {"fields": ("whatsapp_number", "linkedin_url", "subscribe")}),
        (
            "Company Details",
            {
                "fields": (
                    "company_name",
                    "company_website",
                    "clients_count",
                    "building_now",
                    "referral",
                )
            },
        ),
    )


@admin.register(Invitation)
class InvitationAdmin(IDDisplayMixin, admin.ModelAdmin):
    list_display = ["inviter", "type", "organization", "role", "is_used", "created_at"]
    list_filter = ["type", "organization", "is_used"]
    search_fields = ["inviter__username", "inviter__email", "token"]


@admin.register(RoleTemplate)
class RoleTemplateAdmin(IDDisplayMixin, admin.ModelAdmin):
    list_display = ["name", "organization", "system_key", "is_system", "created_at"]
    list_filter = ["organization", "is_system", "system_key"]
    search_fields = ["name", "organization__name"]


@admin.register(UserRoleAssignment)
class UserRoleAssignmentAdmin(IDDisplayMixin, admin.ModelAdmin):
    list_display = ["user", "organization", "role", "assigned_by", "created_at"]
    list_filter = ["organization", "role"]
    search_fields = ["user__username", "user__email", "role__name"]


class CustomUserAdmin(UserAdmin):
    model = CustomUser
    list_display = [
        "username",
        "email",
        "organization",
        "must_verify_email",
        "google_email",
        "verification_resend_count",
        "is_staff",
    ]
    list_filter = ["organization", "must_verify_email", "is_staff", "is_superuser"]
    fieldsets = UserAdmin.fieldsets + (
        (
            "Organization Info",
            {
                "fields": (
                    "organization",
                    "must_verify_email",
                    "verification_resend_count",
                    "last_verification_resend_at",
                )
            },
        ),
        (
            "Google Integration",
            {
                "fields": (
                    "google_email",
                )
            },
        ),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        (
            "Organization Info",
            {
                "fields": (
                    "organization",
                    "must_verify_email",
                    "verification_resend_count",
                    "last_verification_resend_at",
                )
            },
        ),
        (
            "Google Integration",
            {
                "fields": (
                    "google_email",
                )
            },
        ),
    )
    search_fields = ["username", "email", "first_name", "last_name", "google_email"]


admin.site.register(CustomUser, CustomUserAdmin)
