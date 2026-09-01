from rest_framework import serializers
from ..models import (
    Invitation,
    Onboarding,
    RoleTemplate,
    UserPreference,
    UserRoleAssignment,
    UserSetting,
)


class UserPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPreference
        fields = ["name", "value"]


class UserSettingSerializer(serializers.ModelSerializer):
    preferences = UserPreferenceSerializer(many=True, read_only=True)

    class Meta:
        model = UserSetting
        fields = ["preferences"]
        read_only_fields = ["preferences"]


class InvitationSerializer(serializers.ModelSerializer):
    inviter_name = serializers.CharField(source='inviter.get_full_name', read_only=True)
    inviter_username = serializers.CharField(source='inviter.username', read_only=True)
    role_details = serializers.SerializerMethodField()

    class Meta:
        model = Invitation
        fields = ['id', 'token', 'type', 'organization', 'role', 'role_details', 'email', 'inviter_name', 'inviter_username', 'created_at']
        read_only_fields = ['id', 'token', 'inviter', 'created_at']

    def get_role_details(self, obj):
        if not obj.role:
            return None
        return {
            "id": str(obj.role.id),
            "name": obj.role.name,
            "system_key": obj.role.system_key,
        }

    def validate(self, attrs):
        request = self.context.get("request")
        inviter = getattr(request, "user", None)
        role = attrs.get("role")

        if attrs.get("type") == Invitation.TEAM:
            org = inviter.organization if inviter else None
            if not org:
                raise serializers.ValidationError("Inviter must belong to an organization.")
            attrs["organization"] = org
            if role and role.organization_id != org.id:
                raise serializers.ValidationError("Selected role must belong to the same organization.")
        else:
            attrs["organization"] = None
            attrs["role"] = None

        return attrs

    def create(self, validated_data):
        # Allow passing token manually if needed, or generate it
        # Actually model has default=uuid.uuid4 but that's a function reference, 
        # Django executes it on save. 
        # We need to ensure we assign the request.user as inviter.
        request = self.context.get('request')
        inviter = request.user
        
        # If type is TEAM, ensure organization is set to inviter's organization
        if validated_data.get('type') == Invitation.TEAM:
            org = inviter.organization
            if not org:
                # Try to find it from onboarding as fallback
                from ..models import Onboarding
                onboarding = Onboarding.objects.filter(user=inviter).first()
                if onboarding and onboarding.organization:
                    org = onboarding.organization
                    # Sync back to user model
                    inviter.organization = org
                    inviter.save()
            
            if org:
                validated_data['organization'] = org
        
        return Invitation.objects.create(inviter=inviter, **validated_data)

from dj_rest_auth.registration.serializers import RegisterSerializer
from dj_rest_auth.serializers import UserDetailsSerializer
from django.db import transaction
from allauth.account.models import EmailAddress
from django.contrib.auth import get_user_model
from ..rbac import ensure_user_role_assignment

User = get_user_model()

class CustomRegisterSerializer(RegisterSerializer):
    invite_token = serializers.CharField(required=False, allow_blank=True)

    def get_cleaned_data(self):
        data = super().get_cleaned_data()
        data['invite_token'] = self.validated_data.get('invite_token', '')
        return data

    def custom_signup(self, request, user):
        invite_token = self.validated_data.get('invite_token')
        
        if invite_token:
            try:
                invitation = Invitation.objects.select_related('organization').get(token=invite_token, is_used=False)
                
                # Bind user to organization if it's a TEAM invite
                if invitation.type == Invitation.TEAM and invitation.organization:
                    user.organization = invitation.organization
                    user.save()
                    if invitation.role:
                        UserRoleAssignment.objects.update_or_create(
                            organization=invitation.organization,
                            user=user,
                            defaults={"role": invitation.role, "assigned_by": invitation.inviter},
                        )
                    else:
                        ensure_user_role_assignment(user, assigned_by=invitation.inviter)
                
                # Mark invitation as used
                invitation.is_used = True
                invitation.save()
            except Invitation.DoesNotExist:
                pass

class CustomUserDetailsSerializer(UserDetailsSerializer):
    organization = serializers.SerializerMethodField()
    is_verified = serializers.SerializerMethodField()
    is_onboarding_completed = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = (
            'pk', 
            'username', 
            'email', 
            'first_name', 
            'last_name',
            'is_active',
            'organization', 
            'is_verified', 
            'is_onboarding_completed',
            'role',
            'permissions',
            'must_verify_email', 
            'verification_resend_count', 
            'last_verification_resend_at',
            'google_email'
        )
        
    def get_organization(self, obj):
        if obj.organization:
            return {
                'id': str(obj.organization.id),
                'name': obj.organization.name
            }
        return None

    def get_is_verified(self, obj):
        return EmailAddress.objects.filter(user=obj, verified=True).exists()

    def get_is_onboarding_completed(self, obj):
        return hasattr(obj, 'onboarding') and obj.onboarding.is_completed

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
        return sorted(obj.get_org_permissions())


class RoleTemplateSerializer(serializers.ModelSerializer):
    assigned_users_count = serializers.SerializerMethodField()

    class Meta:
        model = RoleTemplate
        fields = [
            "id",
            "name",
            "system_key",
            "permissions",
            "hidden_fields",
            "is_system",
            "assigned_users_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "system_key", "is_system", "created_at", "updated_at"]

    def get_assigned_users_count(self, obj):
        return obj.user_assignments.count()


class UserRoleAssignmentSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(read_only=True)
    role_details = RoleTemplateSerializer(source="role", read_only=True)

    class Meta:
        model = UserRoleAssignment
        fields = [
            "id",
            "organization",
            "user",
            "role",
            "role_details",
            "assigned_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "organization", "user", "assigned_by", "created_at", "updated_at"]


class AssignUserRoleSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    role_id = serializers.UUIDField()
