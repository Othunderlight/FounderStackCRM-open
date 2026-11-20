import re

import django_filters
from app.models import (
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
from dashboard.models import (
    DashboardConfig,
    InteractionLog,
    InteractionType,
)
from django.db import models
from django.db.models import Case, IntegerField, Q, Value, When
from django_filters import CharFilter, FilterSet
from django_filters.rest_framework import DjangoFilterBackend
from integrations.models import File, ZernioConversation, ZernioMessage
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from users.models import AppUpdate, Onboarding
from users.permissions import HasOrgPermission, user_has_permission
from users.rbac import ensure_user_role_assignment


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def global_search(request):
    """
    Unified cross-model search endpoint for the Command Menu.
    Queries People, Companies, Tasks, and Notes with relevance scoring.

    Query param: q (required) - the search term

    Returns: {
        "results": [
            {"type": "person", "id": "...", "label": "...", "sub_label": "...", "path": "..."},
            {"type": "company", ...},
            {"type": "task", ...},
            {"type": "note", ...},
        ]
    }
    """
    query = request.query_params.get("q", "").strip()
    if not query:
        return Response({"results": []})

    org = request.user.organization
    if not org:
        return Response({"results": []})

    def score_queryset(qs, fields, max_results=8):
        """Annotate queryset with relevance score and order by it."""
        words = query.lower().split()

        # Build relevance annotation: highest tier wins
        whens = []
        for field in fields:
            # Tier 1: Exact match (100)
            whens.append(When(**{f"{field}__iexact": query, "then": Value(100)}))
            # Tier 2: Starts with full query (80)
            whens.append(When(**{f"{field}__istartswith": query, "then": Value(80)}))
            # Tier 3: Contains full query (60)
            whens.append(When(**{f"{field}__icontains": query, "then": Value(60)}))
            # Tier 4: Starts with first word (50)
            if words:
                whens.append(
                    When(
                        **{f"{field}__istartswith": words[0], "then": Value(50)}
                    )
                )
                # Tier 5: Contains first word (40)
                whens.append(
                    When(
                        **{f"{field}__icontains": words[0], "then": Value(40)}
                    )
                )
            # Tier 6: Contains all words (20) — each word must appear
            if len(words) >= 2:
                q_all = Q()
                for w in words:
                    q_all &= Q(**{f"{field}__icontains": w})
                whens.append(When(q_all, then=Value(20)))

        if not whens:
            return qs.none()

        qs_scored = (
            qs.annotate(
                _relevance=Case(*whens, default=Value(0), output_field=IntegerField())
            )
            .filter(_relevance__gt=0)
            .order_by("-_relevance")[:max_results]
        )
        return qs_scored

    type_order = {"person": 0, "company": 1, "task": 2, "note": 3, "activity": 4, "interaction": 5}

    def rerank_results(results, model_type):
        """Apply cross-model reranking: relevance score + type priority boost."""
        scored = []
        for r in results:
            base_score = r.get("_relevance", 0)
            type_boost = type_order.get(model_type, 10) * -1
            final_score = base_score + type_boost
            scored.append((final_score, r))
        scored.sort(key=lambda x: x[0], reverse=True)
        return [r[1] for r in scored]

    # --- People ---
    people = score_queryset(
        Person.objects.filter(organization=org),
        ["name", "email", "job_title", "city"],
    )
    people_results = [
        {
            "type": "person",
            "id": str(p.id),
            "label": p.name or "Unnamed",
            "sub_label": f"{p.job_title or ''} • {p.company.name if p.company else ''}".strip(
                " •"
            ),
            "path": f"/people/{p.id}",
            "_relevance": p._relevance,
        }
        for p in people
    ]

    # --- Companies ---
    companies = score_queryset(
        Company.objects.filter(organization=org),
        ["name", "domain", "location"],
    )
    companies_results = [
        {
            "type": "company",
            "id": str(c.id),
            "label": c.name or "Unnamed",
            "sub_label": f"{c.domain or ''} • {c.location or ''}".strip(" •"),
            "path": f"/companies/{c.id}",
            "_relevance": c._relevance,
        }
        for c in companies
    ]

    # --- Tasks ---
    tasks = score_queryset(
        Task.objects.filter(organization=org),
        ["title", "description"],
    )
    tasks_results = [
        {
            "type": "task",
            "id": str(t.id),
            "label": t.title or "Untitled Task",
            "sub_label": f"Task • {t.status or ''}",
            "path": f"/tasks/{t.id}",
            "_relevance": t._relevance,
        }
        for t in tasks
    ]

    # --- Notes ---
    notes = score_queryset(
        Note.objects.filter(organization=org),
        ["title", "content"],
    )
    notes_results = [
        {
            "type": "note",
            "id": str(n.id),
            "label": n.title or "Untitled Note",
            "sub_label": "Note",
            "path": f"/notes/{n.id}",
            "_relevance": n._relevance,
        }
        for n in notes
    ]

    # --- ActivityLogs ---
    activity_logs = score_queryset(
        ActivityLog.objects.filter(organization=org),
        ["title", "content"],
    )
    activity_logs_results = [
        {
            "type": "activity",
            "id": str(a.id),
            "label": a.title or f"{a.type} activity",
            "sub_label": f"{a.type} • {a.channel or ''}".strip(" •"),
            "path": f"/activities/{a.id}",
            "_relevance": a._relevance,
        }
        for a in activity_logs
    ]

    # --- InteractionLogs ---
    interaction_logs = score_queryset(
        InteractionLog.objects.filter(organization=org),
        ["notes"],
    )
    interaction_logs_results = [
        {
            "type": "interaction",
            "id": str(i.id),
            "label": i.interaction_type.name,
            "sub_label": i.notes[:50] + "..." if i.notes and len(i.notes) > 50 else (i.notes or "Interaction"),
            "path": f"/interactions/{i.id}",
            "_relevance": i._relevance,
        }
        for i in interaction_logs
    ]

    # Rerank all results together by relevance score + type priority
    all_results = (
        rerank_results(people_results, "person") +
        rerank_results(companies_results, "company") +
        rerank_results(tasks_results, "task") +
        rerank_results(notes_results, "note") +
        rerank_results(activity_logs_results, "activity") +
        rerank_results(interaction_logs_results, "interaction")
    )
    
    # Strip _relevance from final output
    final_results = [{k: v for k, v in r.items() if k != "_relevance"} for r in all_results[:20]]
    return Response({"results": final_results})


# ============================================================================
# Custom Filter Classes for Exclusion Operators
# ============================================================================


class FuzzyCharFilter(CharFilter):
    """
    Priority-based relevance filter for a single field.

    Scoring tiers (highest wins):
      100 — exact match
       80 — starts with query
       60 — contains full query
       50 — starts with first word
       40 — contains first word
       20 — contains all words (each must appear)

    Results are annotated with _relevance and ordered by it descending.
    """

    def filter(self, qs, value):
        if not value:
            return qs

        val = value.lower()
        words = val.split()
        field = self.field_name

        whens = [
            When(**{f"{field}__iexact": value, "then": Value(100)}),
            When(**{f"{field}__istartswith": value, "then": Value(80)}),
            When(**{f"{field}__icontains": value, "then": Value(60)}),
        ]

        if words:
            whens.append(
                When(**{f"{field}__istartswith": words[0], "then": Value(50)})
            )
            whens.append(
                When(**{f"{field}__icontains": words[0], "then": Value(40)})
            )

        if len(words) >= 2:
            q_all = Q()
            for w in words:
                q_all &= Q(**{f"{field}__icontains": w})
            whens.append(When(q_all, then=Value(20)))

        qs_scored = (
            qs.annotate(
                _relevance=Case(*whens, default=Value(0), output_field=IntegerField())
            )
            .filter(_relevance__gt=0)
            .order_by("-_relevance")
        )
        return qs_scored


class NotContainsCharFilter(CharFilter):
    """Custom filter that excludes values containing the search term (case-insensitive)."""

    def filter(self, qs, value):
        if value:
            return qs.exclude(**{f"{self.field_name}__icontains": value})
        return qs


class ExcludeExactFilter(CharFilter):
    """Custom filter that excludes exact matches (case-insensitive)."""

    def filter(self, qs, value):
        if value:
            return qs.exclude(**{f"{self.field_name}__iexact": value})
        return qs


class IsEmptyFilter(django_filters.BooleanFilter):
    """
    Custom filter that checks for both NULL and empty string ('').
    Use with ?field__isempty=true or ?field__isempty=false
    For text/char fields only - use RelationIsEmptyFilter for ForeignKey fields.
    """

    def filter(self, qs, value):
        if value is None:
            return qs
        if value:  # isEmpty = true
            return qs.filter(
                Q(**{f"{self.field_name}__isnull": True}) | Q(**{self.field_name: ""})
            )
        else:  # isEmpty = false (isNotEmpty)
            return qs.exclude(
                Q(**{f"{self.field_name}__isnull": True}) | Q(**{self.field_name: ""})
            )


class RelationIsEmptyFilter(django_filters.BooleanFilter):
    """
    Custom filter for ForeignKey/relation fields that only checks for NULL.
    ForeignKey fields can't have empty strings - they're either NULL or have an ID.
    Use with ?field__isempty=true or ?field__isempty=false
    """

    def filter(self, qs, value):
        if value is None:
            return qs
        if value:  # isEmpty = true
            return qs.filter(**{f"{self.field_name}__isnull": True})
        else:  # isEmpty = false (isNotEmpty)
            return qs.filter(**{f"{self.field_name}__isnull": False})


class BaseFlexibleFilterSet(FilterSet):
    """
    Base FilterSet that provides common exclusion filter fields.
    Subclasses should define their Meta.model and add model-specific filters.
    """

    pass


class PersonFilterSet(BaseFlexibleFilterSet):
    """FilterSet for Person with exclusion support."""

    # Fuzzy icontains filters
    name__icontains = FuzzyCharFilter(field_name="name")
    email__icontains = FuzzyCharFilter(field_name="email")
    job_title__icontains = FuzzyCharFilter(field_name="job_title")
    city__icontains = FuzzyCharFilter(field_name="city")
    # stage__icontains = FuzzyCharFilter(field_name="stage")
    # lead_type__icontains = FuzzyCharFilter(field_name="lead_type")
    # last_action__icontains = FuzzyCharFilter(field_name="last_action")

    # Exclusion filters (doesNotContain)
    name__notcontains = NotContainsCharFilter(field_name="name")
    email__notcontains = NotContainsCharFilter(field_name="email")
    job_title__notcontains = NotContainsCharFilter(field_name="job_title")
    city__notcontains = NotContainsCharFilter(field_name="city")
    stage__notcontains = NotContainsCharFilter(field_name="stage")
    lead_type__notcontains = NotContainsCharFilter(field_name="lead_type")
    last_action__notcontains = NotContainsCharFilter(field_name="last_action")
    phone__notcontains = NotContainsCharFilter(field_name="phone")

    # IsEmpty filters (handles both NULL and empty string '')
    name__isempty = IsEmptyFilter(field_name="name")
    email__isempty = IsEmptyFilter(field_name="email")
    phone__isempty = IsEmptyFilter(field_name="phone")
    job_title__isempty = IsEmptyFilter(field_name="job_title")
    city__isempty = IsEmptyFilter(field_name="city")
    linkedin__isempty = IsEmptyFilter(field_name="linkedin")
    stage__isempty = IsEmptyFilter(field_name="stage")
    lead_type__isempty = IsEmptyFilter(field_name="lead_type")
    last_action__isempty = IsEmptyFilter(field_name="last_action")
    recommended_action__isempty = IsEmptyFilter(field_name="recommended_action")

    # Relationship IsEmpty filters (ForeignKey fields - can only be NULL, not empty string)
    company__isempty = RelationIsEmptyFilter(field_name="company")
    created_by__isempty = RelationIsEmptyFilter(field_name="created_by")

    # Exact exclusion filters (isNot)
    stage__exclude = ExcludeExactFilter(field_name="stage")
    lead_type__exclude = ExcludeExactFilter(field_name="lead_type")

    # Base field filters (exact/iexact)
    city = django_filters.CharFilter(field_name="city", lookup_expr="iexact")
    stage = django_filters.CharFilter(field_name="stage", lookup_expr="iexact")
    lead_type = django_filters.CharFilter(field_name="lead_type", lookup_expr="iexact")

    # Use CharFilter for lead_source to avoid strict choice validation
    lead_source = django_filters.CharFilter(
        field_name="lead_source", lookup_expr="iexact"
    )
    lead_source__icontains = django_filters.CharFilter(
        field_name="lead_source", lookup_expr="icontains"
    )

    class Meta:
        model = Person
        fields = {
            # Text fields - exact and icontains for search
            "name": ["iexact", "icontains"],
            "email": ["iexact", "icontains"],
            "phone": ["iexact", "icontains"],
            "job_title": ["iexact", "icontains"],
            "city": ["iexact", "icontains"],
            "linkedin": ["iexact", "icontains"],
            "stage": ["iexact", "icontains"],
            "lead_type": ["iexact", "icontains"],
            "last_action": ["iexact", "icontains"],
            "recommended_action": ["iexact", "icontains"],
            # Numeric fields (no contains - only comparisons)
            "conversion_rate": ["exact", "gt", "lt", "gte", "lte", "isnull"],
            # Relation fields
            "company": ["exact", "isnull"],
            "company__name": ["icontains"],
            "owner": ["exact", "isnull"],
            "owner__first_name": ["exact", "icontains"],
            "created_by": ["exact"],
            "created_by__username": ["exact", "icontains"],
            "created_by__first_name": ["exact", "icontains"],
            # Date fields (exact, before, after)
            "created_at": ["exact", "gt", "lt", "gte", "lte", "date"],
            "updated_at": ["exact", "gt", "lt", "gte", "lte", "date"],
        }


class NumericStringFilter(django_filters.NumberFilter):
    """
    Custom filter for string fields that contain numeric data.
    Casts the field to an integer for comparisons (gt, lt, etc.).
    """

    def filter(self, qs, value):
        if value is None:
            return qs
        # Cast TextField/CharField to Integer for comparison
        from django.db.models.functions import Cast

        # Filter out NULLs before casting to avoid unexpected results in some DBs
        qs = qs.exclude(**{f"{self.field_name}__isnull": True})

        return qs.annotate(
            _num_val=Cast(self.field_name, output_field=IntegerField())
        ).filter(**{"_num_val" + f"__{self.lookup_expr}": value})


class CompanyFilterSet(BaseFlexibleFilterSet):
    """FilterSet for Company with exclusion support."""

    name__notcontains = NotContainsCharFilter(field_name="name")
    domain__notcontains = NotContainsCharFilter(field_name="domain")
    location__notcontains = NotContainsCharFilter(field_name="location")
    icp__exclude = ExcludeExactFilter(field_name="icp")

    # Custom numeric filters for the employees TextField
    employees__gt = NumericStringFilter(field_name="employees", lookup_expr="gt")
    employees__lt = NumericStringFilter(field_name="employees", lookup_expr="lt")
    employees__gte = NumericStringFilter(field_name="employees", lookup_expr="gte")
    employees__lte = NumericStringFilter(field_name="employees", lookup_expr="lte")

    # Base field filters
    location = django_filters.CharFilter(field_name="location", lookup_expr="iexact")

    class Meta:
        model = Company
        fields = {
            "name": ["iexact", "icontains", "isnull"],
            "domain": ["iexact", "icontains", "isnull"],
            "location": ["iexact", "icontains", "isnull"],
            "linkedin": ["iexact", "icontains", "isnull"],
            "arr": ["iexact", "icontains", "isnull"],
            "employees": ["exact", "isnull"],
            "icp": ["exact", "isnull"],
            "owner": ["exact"],
            "owner__first_name": ["exact", "icontains"],
            "created_at": ["gt", "lt", "gte", "lte"],
            "updated_at": ["gt", "lt", "gte", "lte"],
        }


class OpportunityFilterSet(BaseFlexibleFilterSet):
    """FilterSet for Opportunity with exclusion support."""

    name__notcontains = NotContainsCharFilter(field_name="name")
    deal_stage__notcontains = NotContainsCharFilter(field_name="deal_stage")
    deal_stage__exclude = ExcludeExactFilter(field_name="deal_stage")
    deal_stage = django_filters.CharFilter(field_name="deal_stage", lookup_expr="iexact")
    stage = django_filters.CharFilter(field_name="deal_stage", lookup_expr="iexact")
    stage__icontains = django_filters.CharFilter(
        field_name="deal_stage", lookup_expr="icontains"
    )
    stage__notcontains = NotContainsCharFilter(field_name="deal_stage")
    stage__exclude = ExcludeExactFilter(field_name="deal_stage")
    contact = django_filters.UUIDFilter(field_name="primary_contact")
    contact__isnull = django_filters.BooleanFilter(field_name="primary_contact")
    contact__name = django_filters.CharFilter(
        field_name="primary_contact__name", lookup_expr="icontains"
    )

    class Meta:
        model = Opportunity
        fields = {
            "name": ["iexact", "icontains", "isnull"],
            "deal_stage": ["iexact", "icontains", "isnull"],
            "company": ["exact", "isnull"],
            "company__name": ["icontains"],
            "primary_contact": ["exact", "isnull"],
            "primary_contact__name": ["icontains"],
            "owner": ["exact", "isnull"],
            "owner__first_name": ["iexact", "icontains"],
            "created_by": ["exact"],
            "created_by__first_name": ["iexact", "icontains"],
            "value": ["exact", "gt", "lt", "gte", "lte", "isnull"],
            "probability": ["exact", "gt", "lt", "gte", "lte", "isnull"],
            "expected_close_date": ["exact", "gt", "lt", "gte", "lte", "isnull"],
            "created_at": ["gt", "lt", "gte", "lte"],
            "updated_at": ["gt", "lt", "gte", "lte"],
        }


class TaskFilterSet(BaseFlexibleFilterSet):
    """FilterSet for Task with exclusion support."""

    title__notcontains = NotContainsCharFilter(field_name="title")
    description__notcontains = NotContainsCharFilter(field_name="description")
    status__exclude = ExcludeExactFilter(field_name="status")

    relations = django_filters.CharFilter(method="filter_relations")
    relations__icontains = django_filters.CharFilter(method="filter_relations")
    relations__notcontains = django_filters.CharFilter(
        method="filter_relations_exclude"
    )
    relations__exclude = django_filters.CharFilter(method="filter_relations_exclude")

    def filter_relations(self, queryset, name, value):
        from django.db.models import Q

        return queryset.filter(
            Q(related_person__name__icontains=value)
            | Q(related_company__name__icontains=value)
        )

    def filter_relations_exclude(self, queryset, name, value):
        from django.db.models import Q

        if not value:
            return queryset
        return queryset.exclude(
            Q(related_person__name__icontains=value)
            | Q(related_company__name__icontains=value)
        )

    # Use CharFilter for status to avoid strict choice validation
    status = django_filters.CharFilter(field_name="status", lookup_expr="iexact")
    status__icontains = django_filters.CharFilter(
        field_name="status", lookup_expr="icontains"
    )
    status__notcontains = NotContainsCharFilter(field_name="status")
    status__exclude = ExcludeExactFilter(field_name="status")

    class Meta:
        model = Task
        fields = {
            "title": ["iexact", "icontains", "isnull"],
            "description": ["iexact", "icontains", "isnull"],
            "status": ["isnull"],  # status (iexact) and status__icontains handled above
            "assignee": ["exact", "isnull"],
            "created_by": ["exact"],
            "created_by__first_name": ["iexact", "icontains"],
            "related_person": ["exact", "isnull"],
            "related_person__name": ["icontains"],
            "related_company": ["exact", "isnull"],
            "related_company__name": ["icontains"],
            "due_date": ["gt", "lt", "gte", "lte", "isnull"],
            "created_at": ["gt", "lt", "gte", "lte"],
            "updated_at": ["gt", "lt", "gte", "lte"],
        }


class NoteFilterSet(BaseFlexibleFilterSet):
    """FilterSet for Note with exclusion support."""

    title__notcontains = NotContainsCharFilter(field_name="title")
    content__notcontains = NotContainsCharFilter(field_name="content")

    relations = django_filters.CharFilter(method="filter_relations")
    relations__icontains = django_filters.CharFilter(method="filter_relations")
    relations__notcontains = django_filters.CharFilter(
        method="filter_relations_exclude"
    )
    relations__exclude = django_filters.CharFilter(method="filter_relations_exclude")

    def filter_relations(self, queryset, name, value):
        from django.db.models import Q

        return queryset.filter(
            Q(related_person__name__icontains=value)
            | Q(related_company__name__icontains=value)
        )

    def filter_relations_exclude(self, queryset, name, value):
        from django.db.models import Q

        if not value:
            return queryset
        return queryset.exclude(
            Q(related_person__name__icontains=value)
            | Q(related_company__name__icontains=value)
        )

    class Meta:
        model = Note
        fields = {
            "title": ["iexact", "icontains", "isnull"],
            "content": ["iexact", "icontains", "isnull"],
            "related_person": ["exact", "isnull"],
            "related_person__name": ["icontains"],
            "related_company": ["exact", "isnull"],
            "related_company__name": ["icontains"],
            "created_by": ["exact"],
            "created_by__first_name": ["iexact", "icontains"],
            "created_at": ["gt", "lt", "gte", "lte"],
            "updated_at": ["gt", "lt", "gte", "lte"],
        }


class ActivityLogFilterSet(BaseFlexibleFilterSet):
    """FilterSet for ActivityLog with exclusion support."""

    content__notcontains = NotContainsCharFilter(field_name="content")
    title__notcontains = NotContainsCharFilter(field_name="title")
    type__exclude = ExcludeExactFilter(field_name="type")
    channel__exclude = ExcludeExactFilter(field_name="channel")
    direction__exclude = ExcludeExactFilter(field_name="direction")

    relations = django_filters.CharFilter(method="filter_relations")
    relations__icontains = django_filters.CharFilter(method="filter_relations")
    relations__notcontains = django_filters.CharFilter(
        method="filter_relations_exclude"
    )
    relations__exclude = django_filters.CharFilter(method="filter_relations_exclude")

    def filter_relations(self, queryset, name, value):
        from django.db.models import Q

        return queryset.filter(
            Q(related_person__name__icontains=value)
            | Q(related_company__name__icontains=value)
        )

    def filter_relations_exclude(self, queryset, name, value):
        from django.db.models import Q

        if not value:
            return queryset
        return queryset.exclude(
            Q(related_person__name__icontains=value)
            | Q(related_company__name__icontains=value)
        )

    # Use CharFilter for choice-based fields to avoid strict validation
    type = django_filters.CharFilter(field_name="type", lookup_expr="iexact")
    type__icontains = django_filters.CharFilter(
        field_name="type", lookup_expr="icontains"
    )
    type__notcontains = NotContainsCharFilter(field_name="type")
    type__exclude = ExcludeExactFilter(field_name="type")

    channel = django_filters.CharFilter(field_name="channel", lookup_expr="iexact")
    channel__icontains = django_filters.CharFilter(
        field_name="channel", lookup_expr="icontains"
    )
    channel__notcontains = NotContainsCharFilter(field_name="channel")
    channel__exclude = ExcludeExactFilter(field_name="channel")

    direction = django_filters.CharFilter(field_name="direction", lookup_expr="iexact")
    direction__icontains = django_filters.CharFilter(
        field_name="direction", lookup_expr="icontains"
    )
    direction__notcontains = NotContainsCharFilter(field_name="direction")
    direction__exclude = ExcludeExactFilter(field_name="direction")

    class Meta:
        model = ActivityLog
        fields = {
            "title": ["iexact", "icontains", "isnull"],
            "content": ["iexact", "icontains", "isnull"],
            "type": ["isnull"],
            "direction": ["isnull"],
            "channel": ["isnull"],
            "related_person": ["exact", "in", "isnull"],
            "related_person__name": ["icontains"],
            "related_company": ["exact", "isnull"],
            "related_company__name": ["icontains"],
            "user": ["exact"],
            "user__first_name": ["iexact", "icontains"],
            "date": ["gt", "lt", "gte", "lte", "isnull"],
        }


class SyncRecordFilterSet(BaseFlexibleFilterSet):
    """FilterSet for SyncRecord with exclusion support."""

    entity_type__notcontains = NotContainsCharFilter(field_name="entity_type")
    external_id__notcontains = NotContainsCharFilter(field_name="external_id")
    sync_status__exclude = ExcludeExactFilter(field_name="sync_status")

    # Base field filters
    entity_type = django_filters.CharFilter(field_name="entity_type", lookup_expr="iexact")
    sync_status = django_filters.CharFilter(field_name="sync_status", lookup_expr="iexact")

    class Meta:
        model = SyncRecord
        fields = {
            "entity_type": ["exact", "iexact", "icontains", "isnull"],
            "entity_id": ["exact"],
            "external_id": ["exact", "icontains", "isnull"],
            "sync_status": ["exact", "iexact"],
            "last_synced": ["gt", "lt", "gte", "lte", "isnull"],
            "created_at": ["gt", "lt", "gte", "lte"],
            "updated_at": ["gt", "lt", "gte", "lte"],
        }


class InteractionTypeFilterSet(BaseFlexibleFilterSet):
    """FilterSet for InteractionType with exclusion support."""

    name__notcontains = NotContainsCharFilter(field_name="name")
    description__notcontains = NotContainsCharFilter(field_name="description")

    # Base field filters
    name = django_filters.CharFilter(field_name="name", lookup_expr="iexact")

    class Meta:
        model = InteractionType
        fields = {
            "name": ["exact", "iexact", "icontains", "isnull"],
            "description": ["exact", "iexact", "icontains", "isnull"],
            "color": ["exact", "iexact", "icontains", "isnull"],
            "created_at": ["gt", "lt", "gte", "lte"],
            "updated_at": ["gt", "lt", "gte", "lte"],
        }


class InteractionLogFilterSet(BaseFlexibleFilterSet):
    """FilterSet for InteractionLog with exclusion support."""

    notes__notcontains = NotContainsCharFilter(field_name="notes")
    interaction_type__name__notcontains = NotContainsCharFilter(
        field_name="interaction_type__name"
    )
    interaction_type__exclude = ExcludeExactFilter(field_name="interaction_type")

    # Base field filters
    notes = django_filters.CharFilter(field_name="notes", lookup_expr="icontains")

    relations = django_filters.CharFilter(method="filter_relations")
    relations__icontains = django_filters.CharFilter(method="filter_relations")
    relations__notcontains = django_filters.CharFilter(
        method="filter_relations_exclude"
    )
    relations__exclude = django_filters.CharFilter(method="filter_relations_exclude")

    def filter_relations(self, queryset, name, value):
        from django.db.models import Q

        return queryset.filter(
            Q(related_person__name__icontains=value)
            | Q(related_company__name__icontains=value)
        )

    def filter_relations_exclude(self, queryset, name, value):
        from django.db.models import Q

        if not value:
            return queryset
        return queryset.exclude(
            Q(related_person__name__icontains=value)
            | Q(related_company__name__icontains=value)
        )

    class Meta:
        model = InteractionLog
        fields = {
            "activity_log": ["exact", "isnull"],
            "activity_log__channel": ["exact", "iexact", "icontains"],
            "activity_log__direction": ["exact", "iexact", "icontains"],
            "interaction_type": ["exact", "isnull"],
            "interaction_type__name": ["icontains"],
            "notes": ["iexact", "icontains", "isnull"],
            "date": ["exact", "date", "gt", "lt", "gte", "lte", "isnull"],
            "related_person": ["exact", "isnull"],
            "related_person__name": ["icontains"],
            "related_company": ["exact", "isnull"],
            "related_company__name": ["icontains"],
            "created_by": ["exact"],
            "created_by__first_name": ["iexact", "icontains"],
            "created_at": ["gt", "lt", "gte", "lte"],
            "updated_at": ["gt", "lt", "gte", "lte"],
        }


class SyncLogFilterSet(BaseFlexibleFilterSet):
    """FilterSet for SyncLog with exclusion support."""

    entity_type__notcontains = NotContainsCharFilter(field_name="entity_type")
    external_id__notcontains = NotContainsCharFilter(field_name="external_id")
    source__notcontains = NotContainsCharFilter(field_name="source")
    error_message__notcontains = NotContainsCharFilter(field_name="error_message")

    status__exclude = ExcludeExactFilter(field_name="status")

    # Base field filters
    entity_type = django_filters.CharFilter(field_name="entity_type", lookup_expr="iexact")
    status = django_filters.CharFilter(field_name="status", lookup_expr="iexact")
    direction = django_filters.CharFilter(field_name="direction", lookup_expr="iexact")
    external_system = django_filters.CharFilter(field_name="external_system", lookup_expr="iexact")

    class Meta:
        model = SyncLog
        fields = {
            "entity_type": ["exact", "iexact", "icontains"],
            "status": ["exact", "iexact"],
            "direction": ["exact", "iexact"],
            "external_system": ["exact", "iexact"],
            "error_message": ["exact", "icontains"],
            "source": ["exact", "iexact", "icontains"],
            "started_at": ["gt", "lt", "gte", "lte"],
            "completed_at": ["gt", "lt", "gte", "lte", "isnull"],
        }


from django.contrib.auth import get_user_model

from .serializers import (
    ActivityLogContextSerializer,
    ActivityLogSerializer,
    AppUpdateSerializer,
    CompanySerializer,
    CRMConfigurationSerializer,
    CustomViewSerializer,
    FileSerializer,
    InteractionLogSerializer,
    InteractionTypeSerializer,
    NoteContextSerializer,
    NoteSerializer,
    OnboardingSerializer,
    OpportunitySerializer,
    PersonContextSerializer,
    PersonSerializer,
    ReportSerializer,
    SyncLogSerializer,
    SyncRecordSerializer,
    TaskContextSerializer,
    TaskSerializer,
    UserSerializer,
    DashboardConfigSerializer,
)

User = get_user_model()


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def org_users(request):
    """
    Returns all users belonging to the same organization as the current user.
    """
    user = request.user
    if not user.organization:
        return Response([])
    if not user_has_permission(user, "users.manage"):
        return Response(
            {"detail": "You do not have permission to view organization users."},
            status=status.HTTP_403_FORBIDDEN,
        )

    users = User.objects.filter(organization=user.organization)
    serializer = UserSerializer(users, many=True)
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def toggle_user_active(request, pk):
    """
    Activates or deactivates a user in the same organization.
    Requires 'users.manage' permission.
    """
    user = request.user
    if not user.organization:
        return Response(
            {"detail": "User has no organization."}, status=status.HTTP_400_BAD_REQUEST
        )

    if not user_has_permission(user, "users.manage"):
        return Response(
            {"detail": "You do not have permission to manage users."},
            status=status.HTTP_403_FORBIDDEN,
        )

    target_user = User.objects.filter(pk=pk, organization=user.organization).first()
    if not target_user:
        return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    if target_user == user:
        return Response(
            {"detail": "You cannot deactivate yourself."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    target_user.is_active = not target_user.is_active
    target_user.save()

    return Response(
        {
            "id": target_user.id,
            "is_active": target_user.is_active,
            "detail": f"User {'activated' if target_user.is_active else 'deactivated'} successfully.",
        }
    )


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def connection_test(request):
    """
    Simple endpoint to verify that the connection from FastAPI/external service
    to the Django API is working correctly.
    """
    return Response(
        {
            "status": "success",
            "message": "Connection successful",
            "user": request.user.username,
            "authenticated": request.user.is_authenticated,
        }
    )


class TenantMixin:
    """
    Mixin to filter querysets by the user's organization.
    """

    def get_queryset(self):
        user = self.request.user
        if not user.organization:
            return self.queryset.none()
        # All models inheriting from TenantModel have an 'organization' field
        return self.queryset.filter(organization=user.organization)

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization)


class BulkImportMixin:
    @action(detail=False, methods=["post"], url_path="import")
    def import_data(self, request):
        # Support both old format [{}, {}] and new format {"data": [], "auto_create": {}}
        if isinstance(request.data, list):
            data = request.data
            auto_create_config = {}
        else:
            data = request.data.get("data", [])
            auto_create_config = request.data.get("auto_create", {})

        if not isinstance(data, list):
            return Response(
                {"error": "Expected a list of objects"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        org = request.user.organization

        # Pre-process relations if auto_create is enabled
        processed_data = []
        for item in data:
            item_copy = item.copy()

            # Logic for Auto-creating relations (Company, Person)
            # For Company fields - supports both ID and name
            company_fields = ["company", "related_company"]
            for field in company_fields:
                if field in item_copy:
                    val = item_copy[field]
                    if val and isinstance(val, str) and len(val) > 0:
                        # Try to find by ID first, then by Name
                        try:
                            import uuid
                            uuid.UUID(val)
                            # If it's a valid UUID, let DRF handle it
                        except ValueError:
                            # It's a name! Search or create
                            # Always resolve company names during import (auto_create is implied)
                            obj, _ = Company.objects.get_or_create(
                                name=val,
                                organization=org,
                                defaults={
                                    "owner": request.user
                                }
                            )
                            item_copy[field] = str(obj.id)

            # For Person fields - supports both ID and name
            person_fields = ["primary_contact", "related_person", "contact"]
            for field in person_fields:
                if field in item_copy:
                    val = item_copy[field]
                    if val and isinstance(val, str) and len(val) > 0:
                        # Try to find by ID first, then by Name
                        try:
                            import uuid
                            uuid.UUID(val)
                            # If it's a valid UUID, let DRF handle it
                        except ValueError:
                            # It's a name! Search or create
                            # Always resolve person names during import (auto_create is implied)
                            obj, _ = Person.objects.get_or_create(
                                name=val,
                                organization=org,
                                defaults={
                                    "created_by": request.user,
                                    "owner": request.user,
                                },
                            )
                            item_copy[field] = str(obj.id)

            if "contact" in item_copy and "primary_contact" not in item_copy:
                item_copy["primary_contact"] = item_copy.pop("contact")

            processed_data.append(item_copy)

        additional_kwargs = {"organization": org}

        model = self.get_queryset().model
        if hasattr(model, "created_by"):
            additional_kwargs["created_by"] = request.user
        if hasattr(model, "owner"):
            additional_kwargs["owner"] = request.user
        elif hasattr(model, "user") and model == ActivityLog:
            additional_kwargs["user"] = request.user

        serializer = self.get_serializer(data=processed_data, many=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(**additional_kwargs)

        return Response(serializer.data, status=status.HTTP_201_CREATED)


from integrations.permissions import HasAPIKeyScope


class BaseViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, HasAPIKeyScope, HasOrgPermission]


class CRMConfigurationViewSet(
    TenantMixin,
    viewsets.GenericViewSet,
    viewsets.mixins.RetrieveModelMixin,
    viewsets.mixins.UpdateModelMixin,
):
    """
    Singleton-like viewset for the organization's configuration.
    Uses 'current' as the lookup to avoid needing an ID.
    """

    serializer_class = CRMConfigurationSerializer
    permission_classes = [permissions.IsAuthenticated, HasAPIKeyScope, HasOrgPermission]
    queryset = CRMConfiguration.objects.all()
    required_permissions = {
        "mine:get": None,
        "mine:patch": "config.manage",
        "mine:put": "config.manage",
        "update": "config.manage",
        "partial_update": "config.manage",
    }

    def get_object(self):
        user = self.request.user
        if not user.organization:
            # Handle user without organization - maybe raise error or return None
            # For now, let's assume they should have one.
            return None
        obj, created = CRMConfiguration.objects.get_or_create(
            organization=user.organization,
            defaults={"user": user},  # user field might still be useful for 'owned by'
        )
        return obj

    @action(detail=False, methods=["get", "patch", "put"])
    def mine(self, request):
        """
        this is the view in the api for the crm conf you asked for, and here where the delte pacth is happening
        Convenience endpoint to get/update the current organization's config
        at /api/config/mine/
        """
        instance = self.get_object()
        if not instance:
            return Response(
                {"error": "No organization associated with user"}, status=400
            )

        if request.method == "GET":
            serializer = self.get_serializer(instance)
            return Response(serializer.data)

        # Handle Rename Logic for Stages and Lead Types
        if request.method in ["PATCH", "PUT"]:
            rename_stage = request.data.get("rename_stage")
            rename_opportunity_stage = request.data.get("rename_opportunity_stage")
            rename_lead_type = request.data.get("rename_lead_type")
            rename_lead_source = request.data.get("rename_lead_source")

            if rename_stage:
                old_val = rename_stage.get("old")
                new_val = rename_stage.get("new")
                if old_val and new_val and old_val != new_val:
                    from app.models import Person

                    # Update all people in this organization with this stage
                    Person.objects.filter(
                        organization=instance.organization, stage=old_val
                    ).update(stage=new_val)

            if rename_opportunity_stage:
                old_val = rename_opportunity_stage.get("old")
                new_val = rename_opportunity_stage.get("new")
                if old_val and new_val and old_val != new_val:
                    from app.models import Opportunity

                    Opportunity.objects.filter(
                        organization=instance.organization, deal_stage=old_val
                    ).update(deal_stage=new_val)

            if rename_lead_type:
                old_val = rename_lead_type.get("old")
                new_val = rename_lead_type.get("new")
                if old_val and new_val and old_val != new_val:
                    from app.models import Person

                    Person.objects.filter(
                        organization=instance.organization, lead_type=old_val
                    ).update(lead_type=new_val)

            if rename_lead_source:
                old_val = rename_lead_source.get("old")
                new_val = rename_lead_source.get("new")
                if old_val and new_val and old_val != new_val:
                    from app.models import Person

                    Person.objects.filter(
                        organization=instance.organization, lead_source=old_val
                    ).update(lead_source=new_val)

        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class FuzzySearchFilter(filters.SearchFilter):
    """
    Priority-based relevance search across multiple fields.
    Replaces the old character-scatter fuzzy logic with proper relevance scoring.

    Scoring tiers (highest wins):
      100 — exact match on any field
       80 — starts with full query on any field
       60 — contains full query on any field
       50 — starts with first word on any field
       40 — contains first word on any field
       20 — all words appear somewhere in the field

    Results are annotated with _relevance and ordered by it descending.
    """

    def filter_queryset(self, request, queryset, view):
        search_terms = self.get_search_terms(request)
        search_fields = self.get_search_fields(view, request)

        if not search_terms or not search_fields:
            return queryset

        # Join all search terms into one query for scoring
        query = " ".join(search_terms).lower()
        words = query.split()

        whens = []
        for field in search_fields:
            whens.append(When(**{f"{field}__iexact": query, "then": Value(100)}))
            whens.append(When(**{f"{field}__istartswith": query, "then": Value(80)}))
            whens.append(When(**{f"{field}__icontains": query, "then": Value(60)}))

            if words:
                whens.append(
                    When(
                        **{f"{field}__istartswith": words[0], "then": Value(50)}
                    )
                )
                whens.append(
                    When(
                        **{f"{field}__icontains": words[0], "then": Value(40)}
                    )
                )

            if len(words) >= 2:
                q_all = Q()
                for w in words:
                    q_all &= Q(**{f"{field}__icontains": w})
                whens.append(When(q_all, then=Value(20)))

        if not whens:
            return queryset

        return (
            queryset.annotate(
                _relevance=Case(*whens, default=Value(0), output_field=IntegerField())
            )
            .filter(_relevance__gt=0)
            .order_by("-_relevance")
        )


class CompanyViewSet(TenantMixin, BulkImportMixin, BaseViewSet):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    permission_resource = "companies"
    filter_backends = [
        FuzzySearchFilter,
        filters.OrderingFilter,
        DjangoFilterBackend,
    ]
    search_fields = ["name", "domain", "location"]
    ordering_fields = [
        "name",
        "created_at",
        "updated_at",
        "employees",
        "domain",
        "owner__first_name",
        "linkedin",
        "location",
        "arr",
        "icp",
    ]
    filterset_class = CompanyFilterSet

    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.user.organization, owner=self.request.user
        )


class PersonViewSet(TenantMixin, BulkImportMixin, BaseViewSet):
    queryset = Person.objects.all()
    serializer_class = PersonSerializer
    permission_resource = "people"

    def get_queryset(self):
        return super().get_queryset().prefetch_related("identities")
    filter_backends = [
        FuzzySearchFilter,
        filters.OrderingFilter,
        DjangoFilterBackend,
    ]
    search_fields = ["name", "email", "job_title", "city"]
    ordering_fields = [
        "name",
        "created_at",
        "updated_at",
        "conversion_rate",
        "stage",
        "email",
        "city",
        "job_title",
        "lead_type",
        "lead_source",
        "last_action",
        "phone",
        "linkedin",
        "company__name",
        "owner__first_name",
        "created_by__first_name",
    ]
    filterset_class = PersonFilterSet

    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.user.organization,
            created_by=self.request.user,
            owner=serializer.validated_data.get("owner", self.request.user),
        )

    @action(detail=True, methods=["get"])
    def context(self, request, pk=None):
        person = self.get_object()

        # Parse sections from query param
        sections_param = request.query_params.get("sections", "")
        if not sections_param:
            sections = {"general"}
        else:
            sections = set(filter(None, sections_param.split(",")))

        if "all" in sections:
            sections = {"general", "notes", "context", "tasks"}

        response_data = {}

        if "general" in sections:
            serializer = PersonContextSerializer(person)
            response_data.update(serializer.data)

        if "context" in sections:
            activities = ActivityLog.objects.filter(
                organization=request.user.organization, related_person=person
            ).order_by("date")
            response_data["activities"] = ActivityLogContextSerializer(
                activities, many=True
            ).data

        if "tasks" in sections:
            tasks = Task.objects.filter(
                organization=request.user.organization, related_person=person
            )
            response_data["tasks"] = TaskContextSerializer(tasks, many=True).data

        if "notes" in sections:
            notes = Note.objects.filter(
                organization=request.user.organization, related_person=person
            )
            response_data["notes"] = NoteContextSerializer(notes, many=True).data

        return Response(response_data)

    @action(detail=True, methods=["get"], url_path="context/ai")
    def context_ai(self, request, pk=None):
        person = self.get_object()
        sections = {"general", "notes", "context", "tasks", "timeline"}

        response_data = {}

        if "general" in sections:
            serializer = PersonContextSerializer(person)
            general_data = serializer.data
            general_data.pop("avatar", None)
            response_data.update(general_data)

        if "context" in sections:
            timeline = InteractionLog.objects.filter(
                organization=request.user.organization, related_person=person
            )
            linked_activity_ids = set(
                timeline.exclude(activity_log__isnull=True)
                .values_list("activity_log_id", flat=True)
            )

            all_activities = ActivityLog.objects.filter(
                organization=request.user.organization, related_person=person
            ).order_by("date")

            activities_not_linked = all_activities.exclude(id__in=linked_activity_ids)
            activities_linked = all_activities.filter(id__in=linked_activity_ids)

            not_linked_data = ActivityLogContextSerializer(
                activities_not_linked, many=True
            ).data
            linked_data = [
                {
                    "title": act.title,
                    "instruction": "check the detailed activity with the timeline interactions below",
                }
                for act in activities_linked
            ]

            response_data["activities"] = {
                "not_linked_to_timeline_interactions": not_linked_data if not_linked_data else None,
                "linked_to_timeline_interactions": linked_data if linked_data else None,
            }

            timeline = timeline.order_by("-date")
            timeline_data = InteractionLogSerializer(timeline, many=True).data

            activity_log_map = {}
            if linked_activity_ids:
                activity_logs = ActivityLog.objects.filter(id__in=linked_activity_ids)
                for al in activity_logs:
                    activity_log_map[str(al.id)] = {
                        "id": str(al.id),
                        "type": al.type,
                        "channel": al.channel,
                        "direction": al.direction,
                        "title": al.title,
                        "content": al.content,
                    }

            for item in timeline_data:
                item.pop("activity_log", None)
                item.pop("person_name", None)
                item.pop("company_name", None)
                item.pop("organization", None)
                item.pop("related_person", None)
                item.pop("related_company", None)
                item.pop("created_by", None)
                item.pop("created_at", None)
                item.pop("updated_at", None)
                
                type_name = item.pop("interaction_type_name", None)
                type_id = item.pop("interaction_type", None)
                if type_name and type_id:
                    item["interaction_type"] = f"{type_name} - id: {type_id}"
                elif type_name:
                    item["interaction_type"] = type_name
                
                al_id = item.get("activity_log_details", {}).get("id") if item.get("activity_log_details") else None
                if al_id and al_id in activity_log_map:
                    item["activity_log_details"] = activity_log_map[al_id]

            timeline_data_ordered = []
            for item in timeline_data:
                ordered_item = {}
                for key in ["id", "interaction_type", "notes", "date", "created_by_name", "activity_log_details"]:
                    if key in item:
                        ordered_item[key] = item[key]
                for key, value in item.items():
                    if key not in ordered_item:
                        ordered_item[key] = value
                timeline_data_ordered.append(ordered_item)

            response_data["timeline"] = timeline_data_ordered

        if "tasks" in sections:
            tasks = Task.objects.filter(
                organization=request.user.organization, related_person=person
            )
            tasks_data = TaskContextSerializer(tasks, many=True).data
            for task in tasks_data:
                task.pop("updated_at", None)
            response_data["tasks"] = tasks_data if tasks_data else None

        if "notes" in sections:
            notes = Note.objects.filter(
                organization=request.user.organization, related_person=person
            )
            notes_data = NoteSerializer(notes, many=True).data
            for note in notes_data:
                note.pop("organization", None)
                note.pop("related_person", None)
                note.pop("related_company", None)
                note.pop("created_by", None)
                note.pop("updated_at", None)
                note.pop("person_name", None)
            response_data["notes"] = notes_data if notes_data else None

        return Response(response_data)

    @action(detail=True, methods=["get"])
    def timeline(self, request, pk=None):
        """Merged activity + Zernio message timeline for one person.

        Activities stay in ActivityLog. Messages are read from the linked
        Zernio conversations, so nothing is duplicated.
        """
        person = self.get_object()
        org = request.user.organization
        source = request.query_params.get("source", "all")
        conversation_id = request.query_params.get("conversation")

        try:
            limit = int(request.query_params.get("limit", 50))
        except (TypeError, ValueError):
            limit = 50
        limit = max(1, min(limit, 200))

        try:
            offset = int(request.query_params.get("offset", 0))
        except (TypeError, ValueError):
            offset = 0
        offset = max(0, offset)

        items = []

        if source in {"all", "activities"}:
            activities = ActivityLog.objects.filter(
                organization=org, related_person=person
            ).select_related("conversation")
            if conversation_id:
                activities = activities.filter(conversation_id=conversation_id)
            for activity in activities:
                items.append(
                    {
                        "kind": "activity",
                        "id": str(activity.id),
                        "type": activity.type,
                        "channel": activity.channel,
                        "direction": activity.direction,
                        "title": activity.title,
                        "content": activity.content,
                        "date": activity.date.isoformat() if activity.date else None,
                        "conversation": (
                            str(activity.conversation_id)
                            if activity.conversation_id
                            else None
                        ),
                        "conversation_id": (
                            activity.conversation.conversation_id
                            if activity.conversation_id
                            else None
                        ),
                        "platform": (
                            activity.conversation.platform
                            if activity.conversation_id
                            else None
                        ),
                        "message_id": None,
                        "status": None,
                        "attachments": [],
                    }
                )

        if source in {"all", "messages"}:
            conversations = ZernioConversation.objects.filter(
                organization=org, person=person
            )
            if conversation_id:
                conversations = conversations.filter(id=conversation_id)
            messages = ZernioMessage.objects.filter(
                conversation__in=conversations
            ).select_related("conversation")
            for message in messages:
                items.append(
                    {
                        "kind": "message",
                        "id": str(message.id),
                        "type": "msg",
                        "channel": message.conversation.platform,
                        "direction": (
                            "sent"
                            if message.direction == ZernioMessage.Direction.OUTGOING
                            else "received"
                        ),
                        "title": None,
                        "content": message.text,
                        "date": (
                            message.sent_at.isoformat()
                            if message.sent_at
                            else message.created_at.isoformat()
                        ),
                        "conversation": str(message.conversation_id),
                        "conversation_id": message.conversation.conversation_id,
                        "platform": message.conversation.platform,
                        "message_id": message.message_id,
                        "status": message.status,
                        "attachments": message.attachments,
                    }
                )

        items.sort(key=lambda item: item["date"] or "", reverse=True)
        total = len(items)
        page = items[offset : offset + limit]
        return Response(
            {
                "count": total,
                "offset": offset,
                "limit": limit,
                "next": offset + limit if offset + limit < total else None,
                "previous": max(0, offset - limit) if offset > 0 else None,
                "results": page,
            }
        )

    @action(detail=True, methods=["get"])
    def export(self, request, pk=None):
        person = self.get_object()
        scope = request.query_params.get("scope", "partial")

        output = []

        # 1. Person Details (Partial & Full)
        if scope in ["partial", "full"]:
            output.append(f"Name: {person.name}")
            output.append(f"Title: {person.job_title}")
            output.append(f"Email: {person.email}")
            output.append(f"Phone: {person.phone}")
            output.append(
                f"Company: {person.company.name if person.company else 'N/A'}"
            )
            output.append(f"Stage: {person.stage}")
            output.append(f"Lead Type: {person.lead_type}")
            output.append("-" * 20)
            output.append("")

        # 2. Messages/Activities (All scopes)
        activities = ActivityLog.objects.filter(
            organization=request.user.organization, related_person=person
        ).order_by("date")

        if activities.exists():
            output.append("### Conversation History")
            for act in activities:
                # Format: [Date] Sender (Channel): Content
                date_str = (
                    act.date.strftime("%Y-%m-%d %H:%M") if act.date else "Unknown Date"
                )
                sender = "Me" if act.direction == "sent" else (person.name or "User")
                if act.channel == "system":
                    output.append(f"[{date_str}] System: {act.content}")
                else:
                    output.append(
                        f"[{date_str}] {sender} ({act.channel}): {act.content}"
                    )
            output.append("")

        # 3. Tasks & Notes (Full Only)
        if scope == "full":
            tasks = Task.objects.filter(
                organization=request.user.organization, related_person=person
            )
            if tasks.exists():
                output.append("### Tasks")
                for t in tasks:
                    status_icon = "[x]" if t.status == "Done" else "[ ]"
                    output.append(f"{status_icon} {t.title} (Due: {t.due_date})")
                output.append("")

            notes = Note.objects.filter(
                organization=request.user.organization, related_person=person
            )
            if notes.exists():
                output.append("### Notes")
                for n in notes:
                    output.append(f"- {n.title}: {n.content}")
                output.append("")

        return Response({"text": "\n".join(output)})


class OpportunityViewSet(TenantMixin, BulkImportMixin, BaseViewSet):
    queryset = Opportunity.objects.all()
    serializer_class = OpportunitySerializer
    permission_resource = "opportunities"
    filter_backends = [
        FuzzySearchFilter,
        filters.OrderingFilter,
        DjangoFilterBackend,
    ]
    search_fields = ["name", "company__name", "primary_contact__name"]
    ordering_fields = [
        "name",
        "value",
        "deal_stage",
        "probability",
        "expected_close_date",
        "created_at",
        "updated_at",
        "company__name",
        "primary_contact__name",
        "owner__first_name",
    ]
    filterset_class = OpportunityFilterSet

    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.user.organization,
            created_by=self.request.user,
            owner=serializer.validated_data.get("owner", self.request.user),
        )


class TaskViewSet(TenantMixin, BulkImportMixin, BaseViewSet):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    permission_resource = "tasks"
    filter_backends = [
        FuzzySearchFilter,
        filters.OrderingFilter,
        DjangoFilterBackend,
    ]
    search_fields = [
        "title",
        "description",
        "related_person__name",
        "related_company__name",
    ]
    ordering_fields = [
        "title",
        "status",
        "due_date",
        "created_at",
        "updated_at",
        "created_by__first_name",
        "assignee__first_name",
    ]
    filterset_class = TaskFilterSet

    def get_queryset(self):
        queryset = super().get_queryset()
        assignee = self.request.query_params.get("assignee")
        if assignee == "Me":
            if hasattr(self.request.GET, "_mutable"):
                mutable = self.request.GET._mutable
                self.request.GET._mutable = True
                self.request.GET.pop("assignee", None)
                self.request.GET._mutable = mutable
            else:
                self.request.GET = self.request.GET.copy()
                self.request.GET.pop("assignee", None)

            queryset = queryset.filter(assignee=self.request.user)
        return queryset

    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.user.organization, created_by=self.request.user
        )


class NoteViewSet(TenantMixin, BulkImportMixin, BaseViewSet):
    queryset = Note.objects.all()
    serializer_class = NoteSerializer
    permission_resource = "notes"
    filter_backends = [
        FuzzySearchFilter,
        filters.OrderingFilter,
        DjangoFilterBackend,
    ]
    search_fields = ["title", "content"]
    ordering_fields = ["title", "created_at", "updated_at", "content", "created_by__first_name"]
    filterset_class = NoteFilterSet

    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.user.organization, created_by=self.request.user
        )


class ActivityLogViewSet(TenantMixin, BulkImportMixin, BaseViewSet):
    queryset = ActivityLog.objects.all()
    serializer_class = ActivityLogSerializer
    permission_resource = "activities"
    scope_resource = "activitylogs"
    filter_backends = [
        FuzzySearchFilter,
        filters.OrderingFilter,
        DjangoFilterBackend,
    ]
    search_fields = [
        "title",
        "content",
        "related_person__name",
        "related_company__name",
    ]
    ordering_fields = [
        "date",
        "updated_at",
        "type",
        "channel",
        "direction",
        "content",
        "related_person__name",
        "related_person__last_action",
        "related_person__conversion_rate",
        "related_person__stage",
        "related_person__lead_type",
        "related_person__lead_source",
        "related_person__phone",
        "related_person__email",
    ]
    filterset_class = ActivityLogFilterSet

    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.user.organization, user=self.request.user
        )


class SyncRecordViewSet(TenantMixin, BaseViewSet):
    """
    API endpoint for managing sync records.
    Tracks synchronization state between CRM entities and external systems (Notion, HubSpot, etc.)

    Permissions: Any authenticated user in the organization can access sync records.
    This allows transparency for users and access for automation systems.
    """

    queryset = SyncRecord.objects.all()
    serializer_class = SyncRecordSerializer
    permission_resource = "sync"
    scope_resource = "syncrecord"
    filter_backends = [
        filters.OrderingFilter,
        DjangoFilterBackend,
    ]
    ordering_fields = [
        "created_at",
        "updated_at",
        "last_synced",
        "entity_type",
        "sync_status",
    ]
    filterset_class = SyncRecordFilterSet


class SyncLogViewSet(TenantMixin, BaseViewSet):
    """
    API endpoint for sync logs (audit trail).
    Provides read-only access to sync operation history for debugging and monitoring.
    """

    queryset = SyncLog.objects.all()
    serializer_class = SyncLogSerializer
    permission_resource = "sync"
    scope_resource = "synclog"
    required_permissions = {
        "list": "sync.read",
        "retrieve": "sync.read",
    }
    filter_backends = [
        filters.OrderingFilter,
        DjangoFilterBackend,
    ]
    ordering_fields = ["created_at", "status", "started_at", "completed_at"]
    filterset_class = SyncLogFilterSet


class CustomViewViewSet(TenantMixin, BaseViewSet):
    queryset = CustomView.objects.all()
    serializer_class = CustomViewSerializer
    allow_without_org_permission = True

    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.user.organization, user=self.request.user
        )


class AppUpdateViewSet(BaseViewSet):
    queryset = AppUpdate.objects.all()
    serializer_class = AppUpdateSerializer
    allow_without_org_permission = True


class ReportViewSet(TenantMixin, BaseViewSet):
    queryset = Report.objects.all()
    serializer_class = ReportSerializer
    permission_resource = "reports"
    required_permissions = {
        "shared": "reports.read",
        "export": "exports.read",
    }

    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.user.organization, created_by=self.request.user
        )

    @action(
        detail=True,
        methods=["get"],
        permission_classes=[permissions.AllowAny],
        url_path="shared",
    )
    def shared(self, request, pk=None):
        try:
            # Shared reports can be accessed by anyone with the link
            # but we still want to ensure it's shared.
            report = Report.objects.get(pk=pk, is_shared=True)
        except Report.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        serializer = self.get_serializer(report)
        return Response(serializer.data)


class InteractionTypeViewSet(TenantMixin, BulkImportMixin, BaseViewSet):
    queryset = InteractionType.objects.all()
    serializer_class = InteractionTypeSerializer
    required_permissions = {
        "list": None,
        "retrieve": None,
        "create": "config.manage",
        "update": "config.manage",
        "partial_update": "config.manage",
        "destroy": "config.manage",
        "import_data": "config.manage",
    }
    filter_backends = [
        FuzzySearchFilter,
        filters.OrderingFilter,
        DjangoFilterBackend,
    ]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at", "updated_at"]
    filterset_class = InteractionTypeFilterSet


class InteractionLogViewSet(TenantMixin, BulkImportMixin, BaseViewSet):
    queryset = InteractionLog.objects.all()
    serializer_class = InteractionLogSerializer
    permission_resource = "interactions"
    filter_backends = [
        FuzzySearchFilter,
        filters.OrderingFilter,
        DjangoFilterBackend,
    ]
    search_fields = [
        "notes",
        "interaction_type__name",
        "related_person__name",
        "related_company__name",
    ]
    ordering_fields = ["date", "updated_at", "interaction_type"]
    filterset_class = InteractionLogFilterSet

    def list(self, request, *args, **kwargs):
        """Override list to support 'distinct' query parameter for unique counting."""
        distinct = request.query_params.get('distinct', 'false').lower() == 'true'
        
        if distinct:
            queryset = self.filter_queryset(self.get_queryset())
            # Count distinct related entities (persons or companies)
            distinct_count = queryset.aggregate(
                count=models.Count(
                    models.Case(
                        models.When(related_person__isnull=False, then='related_person'),
                        models.When(related_company__isnull=False, then='related_company'),
                    ),
                    distinct=True
                )
            )['count']
            return Response({'count': distinct_count, 'results': [], 'next': None, 'previous': None})
        
        return super().list(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.user.organization, created_by=self.request.user
        )


class DashboardConfigViewSet(TenantMixin, BaseViewSet):
    """ViewSet for DashboardConfig - flexible chart configurations"""

    queryset = DashboardConfig.objects.all()
    serializer_class = DashboardConfigSerializer
    lookup_field = "chart_id"
    scope_resource = "dashboardconfig"
    permission_resource = "dashboard"
    required_permissions = {
        "by_chart:get": "dashboard.read",
        "by_chart:post": "dashboard.write",
    }

    def get_queryset(self):
        return super().get_queryset().filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.user.organization, user=self.request.user
        )

    @action(
        detail=False, methods=["get", "post"], url_path="by-chart/(?P<chart_id>[^/.]+)"
    )
    def by_chart(self, request, chart_id=None):
        """Get or create/update config by chart_id for current user"""
        user = request.user
        org = user.organization
        if not org:
            return Response({"error": "No organization"}, status=400)

        if request.method == "GET":
            config = DashboardConfig.objects.filter(
                organization=org, user=user, chart_id=chart_id
            ).first()
            if not config:
                return Response({"chart_id": chart_id, "config": {}})
            serializer = self.get_serializer(config)
            return Response(serializer.data)

        elif request.method == "POST":
            config_data = request.data.get("config", {})
            obj, created = DashboardConfig.objects.update_or_create(
                organization=org,
                user=user,
                chart_id=chart_id,
                defaults={"config": config_data},
            )
            serializer = self.get_serializer(obj)
            return Response(serializer.data)


class FileViewSet(TenantMixin, BulkImportMixin, BaseViewSet):
    queryset = File.objects.all()
    serializer_class = FileSerializer
    scope_resource = "files"
    permission_resource = "files"
    required_permissions = {
        "for_org": "files.read",
    }
    filter_backends = [
        FuzzySearchFilter,
        filters.OrderingFilter,
        DjangoFilterBackend,
    ]
    search_fields = ["name", "public_url"]
    ordering_fields = ["name", "created_at", "updated_at"]

    @action(detail=False, methods=["get"], url_path="for-org/(?P<org_id>[^/.]+)")
    def for_org(self, request, org_id=None):
        # Allow system user or staff to fetch files for any org
        # For now, let's just filter by org_id and assume the request is authorized
        files = File.objects.filter(organization_id=org_id)
        serializer = self.get_serializer(files, many=True)
        return Response(serializer.data)


class OnboardingViewSet(BaseViewSet):
    queryset = Onboarding.objects.all()
    serializer_class = OnboardingSerializer
    allow_without_org_permission = True

    def get_queryset(self):
        ensure_user_role_assignment(self.request.user)
        return self.queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["post"])
    def complete(self, request):
        onboarding, created = Onboarding.objects.get_or_create(user=request.user)
        onboarding.is_completed = True
        # Ensure organization is synced from user
        if request.user.organization:
            onboarding.organization = request.user.organization
        onboarding.save()
        return Response({"status": "onboarding completed"})
