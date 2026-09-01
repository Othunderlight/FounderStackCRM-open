import uuid
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import get_user_model

from allauth.account.models import EmailAddress
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from dj_rest_auth.views import PasswordChangeView

from ..models import Invitation, RoleTemplate, UserRoleAssignment
from ..permissions import HasOrgPermission
from ..rbac import ensure_org_roles, ensure_user_role_assignment
from .serializers import (
    AssignUserRoleSerializer,
    InvitationSerializer,
    RoleTemplateSerializer,
    UserRoleAssignmentSerializer,
)

User = get_user_model()


class CustomPasswordChangeView(PasswordChangeView):
    def post(self, request, *args, **kwargs):
        user = request.user
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')
        new_password1 = request.data.get('new_password1', new_password)
        new_password2 = request.data.get('new_password2', new_password)

        if not old_password:
            return Response(
                {'detail': 'Current password is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not user.check_password(old_password):
            return Response(
                {'detail': 'Current password is incorrect.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not new_password1 or not new_password2:
            return Response(
                {'detail': 'New password is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if new_password1 != new_password2:
            return Response(
                {'detail': 'New passwords do not match.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(new_password1)
        user.save()

        return Response({'detail': 'Password changed successfully.'})


class InvitationViewSet(
    viewsets.GenericViewSet, mixins.CreateModelMixin, mixins.RetrieveModelMixin
):
    queryset = Invitation.objects.all()
    serializer_class = InvitationSerializer
    lookup_field = "token"
    permission_classes = [IsAuthenticated, HasOrgPermission]
    required_permissions = {
        "create": "users.manage",
    }

    def check_permissions(self, request):
        if self.action == "create":
            invitation_type = request.data.get("type", "")
            if invitation_type == Invitation.EXTERNAL:
                return  # Skip permission check for EXTERNAL
        return super().check_permissions(request)

    def get_permissions(self):
        if self.action in ["retrieve", "get_info"]:
            return [AllowAny()]
        return super().get_permissions()

    def create(self, request, *args, **kwargs):
        # Custom create to handle the "Link Generation" logic simply
        # We might want to return an existing valid invite if one exists for reusable links
        # But for now, let's just create a new one as per plan "generate a link".
        return super().create(request, *args, **kwargs)

    @action(detail=False, methods=["get"], url_path="info/(?P<token>[^/.]+)")
    def get_info(self, request, token=None):
        try:
            invite = Invitation.objects.get(token=token)
            serializer = self.get_serializer(invite)
            return Response(serializer.data)
        except Invitation.DoesNotExist:
            return Response(
                {"error": "Invalid invite token"}, status=status.HTTP_404_NOT_FOUND
            )


class VerificationViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["post"], url_path="resend-email")
    def resend_email(self, request):
        user = request.user
        email_address = EmailAddress.objects.filter(user=user, primary=True).first()

        if not email_address:
            # Fallback to any email if primary is not set
            email_address = EmailAddress.objects.filter(user=user).first()

        if not email_address:
            return Response(
                {"error": "No email found for this user"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if email_address.verified:
            return Response(
                {"message": "Email already verified"}, status=status.HTTP_200_OK
            )

        # Rate limiting logic
        count = user.verification_resend_count
        last_at = user.last_verification_resend_at
        now = timezone.now()

        if count >= 4:
            return Response(
                {"error": "Maximum resend attempts reached. Please contact support."},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        if count == 2:  # 3rd try
            if last_at and now < last_at + timedelta(minutes=5):
                diff = (last_at + timedelta(minutes=5) - now)
                seconds = int(diff.total_seconds())
                return Response(
                    {"error": f"Please wait {seconds} seconds before trying again."},
                    status=status.HTTP_429_TOO_MANY_REQUESTS
                )
        
        if count == 3:  # 4th try
            if last_at and now < last_at + timedelta(days=1):
                diff = (last_at + timedelta(days=1) - now)
                hours = int(diff.total_seconds() // 3600)
                minutes = int((diff.total_seconds() % 3600) // 60)
                return Response(
                    {"error": f"Please wait {hours} hours and {minutes} minutes before trying again."},
                    status=status.HTTP_429_TOO_MANY_REQUESTS
                )

        try:
            email_address.send_confirmation(request, signup=False)
            user.verification_resend_count += 1
            user.last_verification_resend_at = now
            user.save()
            return Response(
                {"message": "Verification email sent"}, status=status.HTTP_200_OK
            )
        except Exception:
            return Response(
                {"error": "Failed to send email. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class RoleTemplateViewSet(viewsets.ModelViewSet):
    serializer_class = RoleTemplateSerializer
    permission_classes = [IsAuthenticated, HasOrgPermission]
    required_permissions = {
        "list": "roles.manage",
        "retrieve": "roles.manage",
        "create": "roles.manage",
        "update": "roles.manage",
        "partial_update": "roles.manage",
        "destroy": "roles.manage",
        "assign": "roles.manage",
    }

    def get_queryset(self):
        user = self.request.user
        if not user.organization_id:
            return RoleTemplate.objects.none()
        ensure_org_roles(user.organization)
        return RoleTemplate.objects.filter(organization=user.organization)

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization)

    def perform_destroy(self, instance):
        if instance.is_system:
            raise ValidationError("System roles cannot be deleted.")
        super().perform_destroy(instance)

    @action(detail=False, methods=["post"], url_path="assign")
    def assign(self, request):
        serializer = AssignUserRoleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        org = request.user.organization
        user = User.objects.filter(id=serializer.validated_data["user_id"], organization=org).first()
        if not user:
            return Response({"detail": "User not found in this organization."}, status=status.HTTP_404_NOT_FOUND)

        role = RoleTemplate.objects.filter(
            id=serializer.validated_data["role_id"],
            organization=org,
        ).first()
        if not role:
            return Response({"detail": "Role not found in this organization."}, status=status.HTTP_404_NOT_FOUND)

        assignment, _ = UserRoleAssignment.objects.update_or_create(
            organization=org,
            user=user,
            defaults={
                "role": role,
                "assigned_by": request.user,
            },
        )
        return Response(UserRoleAssignmentSerializer(assignment).data)

    @action(detail=False, methods=["get"], url_path="my-permissions")
    def my_permissions(self, request):
        ensure_user_role_assignment(request.user)
        role = request.user.org_role
        return Response(
            {
                "role": {
                    "id": str(role.id) if role else None,
                    "name": role.name if role else None,
                    "system_key": role.system_key if role else None,
                }
                if role
                else None,
                "permissions": sorted(request.user.get_org_permissions()),
                "hidden_fields": role.hidden_fields if role else {},
            }
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_staff(request):
    return Response({
        "is_staff": request.user.is_staff,
    })
