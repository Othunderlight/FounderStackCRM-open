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
from django.contrib.auth import get_user_model
from integrations.models import File
from rest_framework import serializers
from users.models import AppUpdate, Onboarding, Organization

User = get_user_model()


class RoleAwareFieldsMixin:
    hidden_field_entity = None
    hidden_field_aliases = {}

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get("request")
        if not request or not getattr(request, "user", None):
            return data

        entity = self.hidden_field_entity
        if not entity:
            return data

        hidden_fields = request.user.get_hidden_fields(entity)
        if not hidden_fields:
            return data

        for field_name in hidden_fields:
            data.pop(field_name, None)
            for alias in self.hidden_field_aliases.get(field_name, []):
                data.pop(alias, None)

        return data

    def validate(self, attrs):
        attrs = super().validate(attrs)
        request = self.context.get("request")
        if not request or not getattr(request, "user", None):
            return attrs

        entity = self.hidden_field_entity
        if not entity:
            return attrs

        hidden_fields = request.user.get_hidden_fields(entity)
        if not hidden_fields:
            return attrs

        submitted_hidden_fields = sorted(hidden_fields.intersection(set(attrs.keys())))
        if submitted_hidden_fields:
            field_list = ", ".join(submitted_hidden_fields)
            raise serializers.ValidationError(
                {
                    "detail": (
                        f"You cannot create or update hidden field(s): {field_list}."
                    )
                }
            )

        return attrs


class AppUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppUpdate
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class OnboardingSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(write_only=True, required=False)
    last_name = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = Onboarding
        fields = [
            "id",
            "organization",
            "whatsapp_number",
            "linkedin_url",
            "company_name",
            "company_website",
            "clients_count",
            "building_now",
            "referral",
            "subscribe",
            "is_completed",
            "created_at",
            "updated_at",
            "first_name",
            "last_name",
        ]
        read_only_fields = [
            "id",
            "organization",
            "is_completed",
            "created_at",
            "updated_at",
        ]

    def validate_linkedin_url(self, value):
        if value == "":
            return None
        return value

    def validate_company_website(self, value):
        if value == "":
            return None
        return value

    def create(self, validated_data):
        user = self.context["request"].user
        first_name = validated_data.pop("first_name", None)
        last_name = validated_data.pop("last_name", None)

        if first_name is not None:
            user.first_name = first_name
        if last_name is not None:
            user.last_name = last_name
        if first_name is not None or last_name is not None:
            user.save()

        company_name = validated_data.get("company_name")
        organization = user.organization
        if company_name:
            if organization:
                organization.name = company_name
                organization.save()
            else:
                organization = Organization.objects.create(name=company_name)
                user.organization = organization
                user.save()

        onboarding, created = Onboarding.objects.update_or_create(
            user=user, defaults={**validated_data, "organization": organization}
        )
        return onboarding


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    is_onboarding_completed = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "is_active",
            "is_onboarding_completed",
            "must_verify_email",
            "role",
            "permissions",
        ]

    def get_full_name(self, obj):
        name = f"{obj.first_name} {obj.last_name}".strip()
        return name or obj.username

    def get_is_onboarding_completed(self, obj):
        try:
            return obj.onboarding.is_completed
        except:
            return False

    def get_role(self, obj):
        role = obj.org_role
        if not role:
            return None
        return {
            "id": str(role.id),
            "name": role.name,
            "system_key": role.system_key,
        }

    def get_permissions(self, obj):
        permissions = obj.get_org_permissions()
        return sorted(permissions)


class CRMConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = CRMConfiguration
        fields = [
            "id",
            "pipeline_stages",
            "opportunity_stages",
            "lead_types",
            "lead_sources",
            "created_at",
            "updated_at",
            "organization",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "organization"]

    def create(self, validated_data):
        # Ensure organization is attached from user context
        user = self.context["request"].user
        if not user.organization:
            raise serializers.ValidationError("User has no organization")
        config, created = CRMConfiguration.objects.get_or_create(
            organization=user.organization, defaults={**validated_data, "user": user}
        )
        if not created:
            for attr, value in validated_data.items():
                setattr(config, attr, value)
            config.save()
        return config


class CompanySerializer(RoleAwareFieldsMixin, serializers.ModelSerializer):
    hidden_field_entity = "company"
    hidden_field_aliases = {
        "owner": ["owner_details", "created_by_name"],
    }
    owner_details = UserSerializer(source="owner", read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Company
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at", "owner", "organization"]

    def get_created_by_name(self, obj):
        if not obj.owner:
            return "Unknown"
        name = f"{obj.owner.first_name} {obj.owner.last_name}".strip()
        return name or obj.owner.username


class PersonSerializer(RoleAwareFieldsMixin, serializers.ModelSerializer):
    hidden_field_entity = "person"
    hidden_field_aliases = {
        "company": ["company_name"],
        "owner": ["owner_name", "owner_details"],
        "created_by": ["created_by_name"],
    }
    company_name = serializers.CharField(source="company.name", read_only=True)
    created_by_name = serializers.SerializerMethodField()
    owner_details = UserSerializer(source="owner", read_only=True)
    owner_name = serializers.SerializerMethodField()

    class Meta:
        model = Person
        fields = [
            "id",
            "name",
            "email",
            "phone",
            "job_title",
            "avatar",
            "city",
            "linkedin",
            "conversion_rate",
            "stage",
            "lead_type",
            "lead_source",
            "last_action",
            "recommended_action",
            "company",
            "owner",
            "created_by",
            "company_name",
            "owner_details",
            "owner_name",
            "created_by_name",
            "created_at",
            "updated_at",
            "organization",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "created_by",
            "organization",
        ]

    def get_created_by_name(self, obj):
        if not obj.created_by:
            return "Unknown"
        name = f"{obj.created_by.first_name} {obj.created_by.last_name}".strip()
        return name or obj.created_by.username

    def get_owner_name(self, obj):
        if not obj.owner:
            return "Unknown"
        name = f"{obj.owner.first_name} {obj.owner.last_name}".strip()
        return name or obj.owner.username

    def validate_owner(self, value):
        request = self.context.get("request")
        if request and value and value.organization_id != request.user.organization_id:
            raise serializers.ValidationError(
                "Owner must belong to the same organization."
            )
        return value


class OpportunitySerializer(RoleAwareFieldsMixin, serializers.ModelSerializer):
    hidden_field_entity = "opportunity"
    hidden_field_aliases = {
        "company": ["company_name"],
        "primary_contact": ["primary_contact_name"],
        "owner": ["owner_name", "owner_details"],
        "created_by": ["created_by_name"],
    }
    company_name = serializers.CharField(source="company.name", read_only=True)
    primary_contact_name = serializers.CharField(
        source="primary_contact.name", read_only=True
    )
    created_by_name = serializers.SerializerMethodField()
    owner_details = UserSerializer(source="owner", read_only=True)
    owner_name = serializers.SerializerMethodField()

    class Meta:
        model = Opportunity
        fields = "__all__"
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "created_by",
            "organization",
        ]

    def get_created_by_name(self, obj):
        if not obj.created_by:
            return "Unknown"
        name = f"{obj.created_by.first_name} {obj.created_by.last_name}".strip()
        return name or obj.created_by.username

    def get_owner_name(self, obj):
        if not obj.owner:
            return "Unknown"
        name = f"{obj.owner.first_name} {obj.owner.last_name}".strip()
        return name or obj.owner.username

    def validate_owner(self, value):
        request = self.context.get("request")
        if request and value and value.organization_id != request.user.organization_id:
            raise serializers.ValidationError(
                "Owner must belong to the same organization."
            )
        return value

    def validate_company(self, value):
        request = self.context.get("request")
        if request and value and value.organization_id != request.user.organization_id:
            raise serializers.ValidationError(
                "Company must belong to the same organization."
            )
        return value

    def validate_primary_contact(self, value):
        request = self.context.get("request")
        if request and value and value.organization_id != request.user.organization_id:
            raise serializers.ValidationError(
                "Primary contact must belong to the same organization."
            )
        return value

    def validate_probability(self, value):
        if value < 0 or value > 100:
            raise serializers.ValidationError("Probability must be between 0 and 100.")
        return value

    def validate(self, attrs):
        attrs = super().validate(attrs)
        company = attrs.get("company")
        primary_contact = attrs.get("primary_contact")

        if self.instance:
            company = company if "company" in attrs else self.instance.company
            primary_contact = (
                primary_contact
                if "primary_contact" in attrs
                else self.instance.primary_contact
            )

        if primary_contact and company and primary_contact.company_id:
            if primary_contact.company_id != company.id:
                raise serializers.ValidationError(
                    {
                        "primary_contact": (
                            "Primary contact must belong to the same company as the opportunity."
                        )
                    }
                )

        return attrs


class TaskSerializer(serializers.ModelSerializer):
    assignee_details = UserSerializer(source="assignee", read_only=True)
    created_by_details = UserSerializer(source="created_by", read_only=True)
    created_by_name = serializers.SerializerMethodField()
    person_name = serializers.CharField(source="related_person.name", read_only=True)
    company_name = serializers.CharField(source="related_company.name", read_only=True)

    class Meta:
        model = Task
        fields = "__all__"
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "created_by",
            "organization",
        ]

    def get_created_by_name(self, obj):
        if not obj.created_by:
            return "Unknown"
        name = f"{obj.created_by.first_name} {obj.created_by.last_name}".strip()
        return name or obj.created_by.username


class NoteSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    person_name = serializers.CharField(source="related_person.name", read_only=True)
    company_name = serializers.CharField(source="related_company.name", read_only=True)

    class Meta:
        model = Note
        fields = "__all__"
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "created_by",
            "organization",
        ]

    def get_created_by_name(self, obj):
        if not obj.created_by:
            return "Unknown"
        name = f"{obj.created_by.first_name} {obj.created_by.last_name}".strip()
        return name or obj.created_by.username


class ActivityLogSerializer(RoleAwareFieldsMixin, serializers.ModelSerializer):
    hidden_field_entity = "person"
    hidden_field_aliases = {
        "email": ["person_email"],
        "phone": ["person_phone"],
        "stage": ["person_stage"],
        "lead_type": ["person_lead_type"],
        "lead_source": ["person_lead_source"],
        "conversion_rate": ["person_conversion_rate"],
        "last_action": ["person_last_action"],
    }
    user_details = UserSerializer(source="user", read_only=True)
    user_name = serializers.SerializerMethodField()
    person_name = serializers.CharField(source="related_person.name", read_only=True)
    company_name = serializers.CharField(source="related_company.name", read_only=True)
    person_email = serializers.CharField(source="related_person.email", read_only=True)
    person_phone = serializers.CharField(source="related_person.phone", read_only=True)
    person_stage = serializers.CharField(source="related_person.stage", read_only=True)
    person_lead_type = serializers.CharField(
        source="related_person.lead_type", read_only=True
    )
    person_lead_source = serializers.CharField(
        source="related_person.lead_source", read_only=True
    )
    person_conversion_rate = serializers.IntegerField(
        source="related_person.conversion_rate", read_only=True
    )
    person_last_action = serializers.CharField(
        source="related_person.last_action", read_only=True
    )

    class Meta:
        model = ActivityLog
        fields = "__all__"
        read_only_fields = ["id", "user", "organization"]

    def get_user_name(self, obj):
        if not obj.user:
            return "System"
        name = f"{obj.user.first_name} {obj.user.last_name}".strip()
        return name or obj.user.username


class CustomViewSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomView
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at", "user", "organization"]


class ReportSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Report
        fields = "__all__"
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "created_by",
            "organization",
        ]

    def get_created_by_name(self, obj):
        if not obj.created_by:
            return "Unknown"
        name = f"{obj.created_by.first_name} {obj.created_by.last_name}".strip()
        return name or obj.created_by.username


# Lightweight serializers for context endpoint
class CompanyContextSerializer(RoleAwareFieldsMixin, serializers.ModelSerializer):
    hidden_field_entity = "company"
    class Meta:
        model = Company
        fields = [
            "id",
            "name",
            "domain",
            "employees",
            "location",
            "linkedin",
            "arr",
            "icp",
        ]


class PersonContextSerializer(RoleAwareFieldsMixin, serializers.ModelSerializer):
    hidden_field_entity = "person"
    company = CompanyContextSerializer(read_only=True)

    class Meta:
        model = Person
        fields = [
            "id",
            "name",
            "email",
            "phone",
            "job_title",
            "avatar",
            "city",
            "linkedin",
            "conversion_rate",
            "stage",
            "lead_type",
            "lead_source",
            "last_action",
            "recommended_action",
            "company",
        ]


class ActivityLogContextSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivityLog
        fields = ["id", "type", "channel", "direction", "title", "content", "date"]


class TaskContextSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            "id",
            "created_by_name",
            "created_at",
            "updated_at",
            "title",
            "description",
            "status",
            "due_date",
        ]

    def get_created_by_name(self, obj):
        if not obj.created_by:
            return "Unknown"
        name = f"{obj.created_by.first_name} {obj.created_by.last_name}".strip()
        return name or obj.created_by.username


class NoteContextSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Note
        fields = [
            "id",
            "created_by_name",
            "created_at",
            "updated_at",
            "title",
            "content",
        ]

    def get_created_by_name(self, obj):
        if not obj.created_by:
            return "Unknown"
        name = f"{obj.created_by.first_name} {obj.created_by.last_name}".strip()
        return name or obj.created_by.username


class FileSerializer(serializers.ModelSerializer):
    class Meta:
        model = File
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at", "organization"]


class SyncRecordSerializer(serializers.ModelSerializer):
    """Serializer for sync records - tracks entity sync state with external systems"""

    entity_type_display = serializers.CharField(
        source="get_entity_type_display", read_only=True
    )
    sync_status_display = serializers.CharField(
        source="get_sync_status_display", read_only=True
    )
    direction_display = serializers.CharField(
        source="get_last_sync_direction_display", read_only=True
    )

    class Meta:
        model = SyncRecord
        fields = [
            "id",
            "entity_type",
            "entity_type_display",
            "entity_id",
            "external_id",
            "external_system",
            "sync_status",
            "sync_status_display",
            "last_synced",
            "last_sync_direction",
            "direction_display",
            "last_sync_error",
            "sync_version",
            "created_at",
            "updated_at",
            "organization",
        ]
        read_only_fields = [
            "id",
            "sync_version",
            "created_at",
            "updated_at",
            "organization",
        ]


class SyncRecordCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating sync records"""

    class Meta:
        model = SyncRecord
        fields = [
            "entity_type",
            "entity_id",
            "external_id",
            "external_system",
            "sync_status",
            "last_sync_direction",
        ]

    def validate(self, data):
        # Validate entity exists
        entity_type = data.get("entity_type")
        entity_id = data.get("entity_id")

        # Use model's actual choices for validation
        valid_entity_types = [choice[0] for choice in SyncRecord.EntityType.choices]
        if entity_type not in valid_entity_types:
            raise serializers.ValidationError(
                f"Invalid entity_type: {entity_type}. Valid types: {valid_entity_types}"
            )

        model_map = {
            "company": Company,
            "person": Person,
            "opportunity": Opportunity,
            "task": Task,
            "note": Note,
            "activity": ActivityLog,
        }

        model_class = model_map[entity_type]
        try:
            model_class.objects.get(id=entity_id)
        except model_class.DoesNotExist:
            raise serializers.ValidationError(
                f"{entity_type} with id {entity_id} does not exist"
            )

        # Validate sync_status if provided
        sync_status = data.get("sync_status")
        if sync_status:
            valid_statuses = [choice[0] for choice in SyncRecord.SyncStatus.choices]
            if sync_status not in valid_statuses:
                raise serializers.ValidationError(
                    f"Invalid sync_status: {sync_status}. Must be one of: {valid_statuses}"
                )

        # Validate last_sync_direction if provided
        sync_direction = data.get("last_sync_direction")
        if sync_direction:
            valid_directions = [choice[0] for choice in SyncRecord.Direction.choices]
            if sync_direction not in valid_directions:
                raise serializers.ValidationError(
                    f"Invalid last_sync_direction: {sync_direction}. Must be one of: {valid_directions}"
                )

        return data


class SyncLogSerializer(serializers.ModelSerializer):
    """Serializer for sync logs - audit trail of all sync operations"""

    status_display = serializers.CharField(source="get_status_display", read_only=True)
    direction_display = serializers.CharField(
        source="get_direction_display", read_only=True
    )
    duration_seconds = serializers.SerializerMethodField()
    triggered_by_name = serializers.SerializerMethodField()

    class Meta:
        model = SyncLog
        fields = [
            "id",
            "sync_record",
            "entity_type",
            "entity_id",
            "external_system",
            "external_id",
            "direction",
            "direction_display",
            "status",
            "status_display",
            "data_hash",
            "error_message",
            "error_details",
            "started_at",
            "completed_at",
            "duration_seconds",
            "triggered_by",
            "triggered_by_name",
            "source",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_duration_seconds(self, obj):
        if obj.started_at and obj.completed_at:
            return (obj.completed_at - obj.started_at).total_seconds()
        return None

    def get_triggered_by_name(self, obj):
        if obj.triggered_by:
            name = f"{obj.triggered_by.first_name} {obj.triggered_by.last_name}".strip()
            return name or obj.triggered_by.username
        return "System"


class InteractionTypeSerializer(serializers.ModelSerializer):
    """Serializer for InteractionType - predefined interaction categories"""

    class Meta:
        model = InteractionType
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at", "organization"]

    def validate_name(self, value):
        """Check for duplicate name within the same organization."""
        org = self.context["request"].user.organization
        qs = InteractionType.objects.filter(organization=org, name__iexact=value)
        # Exclude current instance when updating
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                "This name is already exists. Please choose a different name for your interaction type."
            )
        return value


class InteractionLogSerializer(serializers.ModelSerializer):
    """Serializer for InteractionLog - tracks specific interactions with people/companies"""

    interaction_type_name = serializers.CharField(
        source="interaction_type.name", read_only=True
    )
    created_by_name = serializers.SerializerMethodField()
    person_name = serializers.CharField(source="related_person.name", read_only=True)
    company_name = serializers.CharField(source="related_company.name", read_only=True)
    activity_log_details = serializers.SerializerMethodField()

    class Meta:
        model = InteractionLog
        fields = "__all__"

    def get_activity_log_details(self, obj):
        if not obj.activity_log:
            return None
        return {
            "id": str(obj.activity_log.id),
            "title": obj.activity_log.title,
            "type": obj.activity_log.type,
            "channel": obj.activity_log.channel,
        }
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "created_by",
            "organization",
        ]

    def get_created_by_name(self, obj):
        if not obj.created_by:
            return "Unknown"
        name = f"{obj.created_by.first_name} {obj.created_by.last_name}".strip()
        return name or obj.created_by.username


class SyncLogCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating sync log entries"""

    class Meta:
        model = SyncLog
        fields = [
            "sync_record",
            "entity_type",
            "entity_id",
            "external_system",
            "external_id",
            "direction",
            "status",
            "data_hash",
            "crm_data_snapshot",
            "external_data_snapshot",
            "error_message",
            "error_details",
            "completed_at",
            "source",
        ]
        read_only_fields = ["started_at"]  # Auto-set on creation

    # Activity log fields
    activity_log_title = serializers.CharField(
        source="activity_log.title", read_only=True
    )
    activity_log_type = serializers.CharField(
        source="activity_log.type", read_only=True
    )
    activity_log_channel = serializers.CharField(
        source="activity_log.channel", read_only=True
    )
    activity_log_direction = serializers.CharField(
        source="activity_log.direction", read_only=True
    )


class DashboardConfigSerializer(serializers.ModelSerializer):
    """Serializer for DashboardConfig - flexible chart configurations"""

    class Meta:
        model = DashboardConfig
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at", "organization", "user"]
