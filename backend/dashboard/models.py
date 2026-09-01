from app.models import ActivityLog, Company, Person, TenantModel
from django.conf import settings
from django.db import models


class InteractionType(TenantModel):
    """
    Predefined interaction categories for tracking communication with people/companies.
    """

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    color = models.CharField(
        max_length=50, blank=True, null=True, help_text="Hex color code for UI"
    )
    icon = models.CharField(
        max_length=100, blank=True, null=True, help_text="Lucide icon name"
    )

    class Meta:
        verbose_name_plural = "Interaction Types"
        ordering = ["name"]
        unique_together = [["organization", "name"]]
        indexes = [
            models.Index(fields=["organization", "name"]),
        ]

    def __str__(self):
        return self.name


class InteractionLog(TenantModel):
    """
    Tracks specific interactions with people/companies.
    """

    interaction_type = models.ForeignKey(
        InteractionType, on_delete=models.CASCADE, related_name="interactions"
    )
    notes = models.TextField(
        blank=True, null=True, help_text="Additional details about the interaction"
    )
    date = models.DateTimeField(
        default=models.functions.Now(),
        help_text="When the interaction actually happened",
    )

    # Relations
    related_person = models.ForeignKey(
        Person,
        on_delete=models.CASCADE,
        related_name="interactions",
        null=True,
        blank=True,
    )
    related_company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="interactions",
        null=True,
        blank=True,
    )
    activity_log = models.ForeignKey(
        ActivityLog,
        on_delete=models.SET_NULL,
        related_name="interaction_logs",
        null=True,
        blank=True,
        help_text="Linked activity log for detailed communication information",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_interactions",
    )

    class Meta:
        verbose_name = "Interaction Log"
        ordering = ["-date"]
        indexes = [
            models.Index(fields=["organization", "interaction_type", "-date"]),
            models.Index(fields=["organization", "related_person", "-date"]),
            models.Index(fields=["organization", "related_company", "-date"]),
            models.Index(fields=["organization", "created_by", "-date"]),
        ]

    def save(self, *args, **kwargs):
        if self.related_person and not self.related_company:
            self.related_company = self.related_person.company
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.interaction_type.name} - {self.date}"


class DashboardConfig(TenantModel):
    """
    Stores flexible configuration for dashboard charts/widgets.
    """

    chart_id = models.CharField(
        max_length=100, help_text="Unique identifier for the chart (e.g., 'funnel-chart')"
    )
    config = models.JSONField(
        default=dict, help_text="JSON object containing chart-specific settings"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="dashboard_configs",
    )

    class Meta:
        verbose_name = "Dashboard Configuration"
        unique_together = [["organization", "chart_id", "user"]]
        indexes = [
            models.Index(fields=["organization", "chart_id", "user"]),
        ]

    def __str__(self):
        return f"{self.chart_id} - {self.user.username}"
