from app.admin import IDDisplayMixin
from django.contrib import admin

from .models import (
    DashboardConfig,
    InteractionLog,
    InteractionType,
)


@admin.register(InteractionType)
class InteractionTypeAdmin(IDDisplayMixin, admin.ModelAdmin):
    list_display = ("name", "organization", "description", "color", "created_at")
    list_filter = ("organization",)
    search_fields = ("name", "description")
    ordering = ["name"]


@admin.register(InteractionLog)
class InteractionLogAdmin(IDDisplayMixin, admin.ModelAdmin):
    list_display = (
        "interaction_type",
        "organization",
        "related_person",
        "related_company",
        "activity_log",
        "date",
        "created_by",
    )
    list_filter = ("organization", "interaction_type")
    search_fields = (
        "notes",
        "interaction_type__name",
        "related_person__name",
        "related_company__name",
    )
    ordering = ["-date"]
    date_hierarchy = "date"


@admin.register(DashboardConfig)
class DashboardConfigAdmin(IDDisplayMixin, admin.ModelAdmin):
    list_display = ("chart_id", "organization", "user", "created_at")
    list_filter = ("organization",)
    search_fields = ("chart_id", "user__username")
    ordering = ["chart_id"]
