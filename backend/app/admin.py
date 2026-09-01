from django.contrib import admin

from .models import (
    ActivityLog,
    Company,
    CRMConfiguration,
    CustomView,
    Note,
    Opportunity,
    Person,
    Report,
    SyncLog,
    SyncRecord,
    Task,
)


class IDDisplayMixin:
    def get_list_display(self, request):
        list_display = super().get_list_display(request)
        list_display = list(list_display)

        show_ids = True
        try:
            config = CRMConfiguration.objects.get(user=request.user)
            show_ids = config.show_ids_in_admin
        except CRMConfiguration.DoesNotExist:
            pass

        if show_ids:
            if "id" not in list_display:
                list_display.insert(0, "id")
        else:
            if "id" in list_display:
                list_display.remove("id")
        return tuple(list_display)


@admin.register(CRMConfiguration)
class CRMConfigurationAdmin(IDDisplayMixin, admin.ModelAdmin):
    list_display = ("organization", "user", "created_at", "show_ids_in_admin")
    list_filter = ("organization",)
    search_fields = ("user__username", "user__email")


@admin.register(Company)
class CompanyAdmin(IDDisplayMixin, admin.ModelAdmin):
    list_display = ("name", "organization", "domain", "owner", "created_at")
    list_filter = ("organization",)
    search_fields = ("name", "domain")


@admin.register(Person)
class PersonAdmin(IDDisplayMixin, admin.ModelAdmin):
    list_display = (
        "name",
        "organization",
        "email",
        "stage",
        "owner",
        "company",
        "created_at",
    )
    list_filter = ("organization", "stage", "lead_type", "owner")
    search_fields = ("name", "email")


@admin.register(Opportunity)
class OpportunityAdmin(IDDisplayMixin, admin.ModelAdmin):
    list_display = (
        "name",
        "organization",
        "value",
        "deal_stage",
        "owner",
        "company",
        "primary_contact",
    )
    list_filter = ("organization", "deal_stage", "owner")
    search_fields = ("name",)


@admin.register(Task)
class TaskAdmin(IDDisplayMixin, admin.ModelAdmin):
    list_display = ("title", "organization", "status", "due_date", "assignee")
    list_filter = ("organization", "status")
    search_fields = ("title",)


@admin.register(Note)
class NoteAdmin(IDDisplayMixin, admin.ModelAdmin):
    list_display = (
        "title",
        "organization",
        "related_person",
        "related_company",
        "created_at",
    )
    list_filter = ("organization",)
    search_fields = ("title", "content")


@admin.register(ActivityLog)
class ActivityLogAdmin(IDDisplayMixin, admin.ModelAdmin):
    list_display = (
        "type",
        "organization",
        "channel",
        "direction",
        "title",
        "date",
        "user",
    )
    list_filter = ("organization", "type", "channel", "direction")


@admin.register(CustomView)
class CustomViewAdmin(IDDisplayMixin, admin.ModelAdmin):
    list_display = ("name", "organization", "entity_type", "user", "is_default")
    list_filter = ("organization", "entity_type")


@admin.register(Report)
class ReportAdmin(IDDisplayMixin, admin.ModelAdmin):
    list_display = ("name", "organization", "is_shared", "created_by", "created_at")
    list_filter = ("organization", "is_shared")


@admin.register(SyncRecord)
class SyncRecordAdmin(IDDisplayMixin, admin.ModelAdmin):
    list_display = (
        "entity_type",
        "entity_id",
        "external_system",
        "sync_status",
        "last_synced",
        "organization",
    )
    list_filter = (
        "entity_type",
        "external_system",
        "sync_status",
        "organization",
        "last_sync_direction",
    )
    search_fields = ("entity_id", "external_id")
    readonly_fields = ("sync_version", "created_at", "updated_at")
    date_hierarchy = "last_synced"


@admin.register(SyncLog)
class SyncLogAdmin(IDDisplayMixin, admin.ModelAdmin):
    list_display = (
        "entity_type",
        "status",
        "direction",
        "external_system",
        "started_at",
        "duration_display",
    )
    list_filter = ("status", "direction", "external_system", "source")
    search_fields = ("entity_id", "error_message")
    readonly_fields = ("started_at", "created_at")
    date_hierarchy = "started_at"

    def duration_display(self, obj):
        if obj.started_at and obj.completed_at:
            duration = (obj.completed_at - obj.started_at).total_seconds()
            return f"{duration:.2f}s"
        return "-"

    duration_display.short_description = "Duration"
