from app.models import TenantModel
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from users.permissions import HasOrgPermission

from .models import (
    APIKey,
    Credential,
    File,
    IntegrationSession,
    Key,
    TenantBackupConfig,
    Webhook,
    WebhookDelivery,
)
from .permissions import HasAPIKeyScope
from .services import build_tenant_backup_data
from .serializers import (
    APIKeySerializer,
    CredentialSerializer,
    IntegrationSessionSerializer,
    KeySerializer,
    TenantBackupConfigSerializer,
    WebhookDeliverySerializer,
    WebhookSerializer,
)


# Local definition of TenantMixin to avoid circular imports
class TenantMixin:
    def get_queryset(self):
        user = self.request.user
        if not user.organization:
            return self.queryset.none()
        return self.queryset.filter(organization=user.organization)

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization)


class APIKeyViewSet(TenantMixin, viewsets.ModelViewSet):
    queryset = APIKey.objects.all()
    serializer_class = APIKeySerializer
    scope_resource = "apikeys"
    permission_classes = [permissions.IsAuthenticated, HasAPIKeyScope, HasOrgPermission]
    required_permissions = {
        "create": None,
        "list": "config.manage",
        "retrieve": "config.manage",
        "update": "config.manage",
        "partial_update": "config.manage",
        "destroy": "config.manage",
        "revoke": "config.manage",
        "reactivate": "config.manage",
    }

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=True, methods=["post"])
    def revoke(self, request, pk=None):
        api_key = self.get_object()
        api_key.is_active = False
        api_key.save()
        return Response({"status": "revoked"})

    @action(detail=True, methods=["post"])
    def reactivate(self, request, pk=None):
        api_key = self.get_object()
        api_key.is_active = True
        api_key.save()
        return Response({"status": "reactivated"})


class WebhookViewSet(TenantMixin, viewsets.ModelViewSet):
    queryset = Webhook.objects.all()
    serializer_class = WebhookSerializer
    scope_resource = "webhooks"
    permission_classes = [permissions.IsAuthenticated, HasAPIKeyScope, HasOrgPermission]
    required_permission = "config.manage"

    @action(detail=True, methods=["get"])
    def deliveries(self, request, pk=None):
        webhook = self.get_object()
        deliveries = webhook.deliveries.all().order_by("-created_at")[:50]
        serializer = WebhookDeliverySerializer(deliveries, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def ping(self, request, pk=None):
        webhook = self.get_object()
        delivery = WebhookDelivery.objects.create(
            organization=webhook.organization,
            webhook=webhook,
            event="ping",
            payload={"message": "This is a test ping"},
            status_code=200,
            success=True,
            response_body="OK",
        )
        return Response({"status": "ping_sent", "delivery_id": delivery.id})


class CredentialViewSet(viewsets.ModelViewSet):
    queryset = Credential.objects.all()
    serializer_class = CredentialSerializer
    permission_classes = [permissions.IsAuthenticated, HasOrgPermission]
    required_permission = "agent.use"

    def get_queryset(self):
        queryset = Credential.objects.none()
        if not self.request.user.is_staff:
            return Credential.objects.filter(user=self.request.user)
        data = self.request.data
        user_id = data.get("user_id")
        email = data.get("email")
        key_value = data.get("key_value")
        if user_id:
            queryset = Credential.objects.filter(user_id=user_id)
        elif email:
            queryset = Credential.objects.filter(user__email=email)
        elif key_value:
            queryset = Credential.objects.filter(keys__value=key_value)
        return queryset

    def update(self, request, *args, **kwargs):
        return Response({"detail": "Update is not allowed."}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

    def partial_update(self, request, *args, **kwargs):
        return Response({"detail": "Update is not allowed."}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

    def destroy(self, request, *args, **kwargs):
        return Response({"detail": "Delete is not allowed."}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def create(self, request, *args, **kwargs):
        if Credential.objects.filter(user=request.user).exists():
            return Response({"detail": "You already have a credential."}, status=status.HTTP_400_BAD_REQUEST)
        return super().create(request, *args, **kwargs)

    @action(detail=False, methods=["get"], url_path="has-credential")
    def has_credential(self, request):
        has_cred = Credential.objects.filter(user=request.user).exists()
        return Response({"has_credential": has_cred})

    @action(detail=True, methods=["post"], url_path="add-keys")
    def add_keys(self, request, pk=None):
        queryset = Credential.objects.filter(user=request.user)
        credential = get_object_or_404(queryset, pk=pk)
        keys_serializer = KeySerializer(data=request.data, many=isinstance(request.data, list))
        if not keys_serializer.is_valid():
            return Response(keys_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        created_keys = []
        data = request.data if isinstance(request.data, list) else [request.data]
        for key_data in data:
            key = Key.objects.create(credential=credential, **key_data)
            created_keys.append(key)
        return Response(KeySerializer(created_keys, many=True).data, status=status.HTTP_201_CREATED)


class IntegrationSessionViewSet(TenantMixin, viewsets.ModelViewSet):
    queryset = IntegrationSession.objects.all()
    serializer_class = IntegrationSessionSerializer
    scope_resource = "integration-sessions"
    permission_classes = [permissions.IsAuthenticated, HasAPIKeyScope, HasOrgPermission]
    required_permission = "agent.use"

    def perform_create(self, serializer):
        serializer.save(user=self.request.user, organization=self.request.user.organization)

    def get_queryset(self):
        queryset = super().get_queryset()
        key = self.request.query_params.get("key")
        if key:
            queryset = queryset.filter(key=key)
        return queryset.order_by("-created_at")

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        key = self.request.query_params.get("key")
        latest = self.request.query_params.get("latest", False)
        if key and latest:
            instance = queryset.first()
            if instance:
                serializer = self.get_serializer(instance)
                return Response(serializer.data)
            else:
                return Response({"detail": "Integration session not found"}, status=status.HTTP_404_NOT_FOUND)
        return super().list(request, *args, **kwargs)


class TenantBackupConfigViewSet(TenantMixin, viewsets.ModelViewSet):
    queryset = TenantBackupConfig.objects.all()
    serializer_class = TenantBackupConfigSerializer
    permission_classes = [permissions.IsAuthenticated, HasOrgPermission]
    required_permission = "config.manage"

    def get_queryset(self):
        qs = super().get_queryset()
        return qs.order_by('-created_at')

    def create(self, request, *args, **kwargs):
        if TenantBackupConfig.objects.filter(organization=request.user.organization).exists():
            return Response(
                {"detail": "Backup config already exists for this organization."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().create(request, *args, **kwargs)

    @action(detail=False, methods=["post"], url_path="preview-backup")
    def preview_backup(self, request):
        config = self.get_queryset().first()
        if not config:
            return Response(
                {"detail": "No backup config found for this organization."},
                status=status.HTTP_404_NOT_FOUND,
            )

        backup_data = build_tenant_backup_data(
            organization=request.user.organization,
            since=None,
        )

        return Response(
            {
                "config_id": str(config.id),
                "last_backup_at": config.last_backup_at,
                "models_included": list(backup_data.get("models", {}).keys()),
                "total_records": sum(len(items) for items in backup_data.get("models", {}).values()),
                "preview_data": backup_data,
            }
        )
