from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import APIKeyViewSet, WebhookViewSet, CredentialViewSet, IntegrationSessionViewSet, TenantBackupConfigViewSet

router = DefaultRouter()
router.register(r'api-keys', APIKeyViewSet, basename='api-key')
router.register(r'integration-sessions', IntegrationSessionViewSet, basename='integration-session')
router.register(r'webhooks', WebhookViewSet, basename='webhook')
router.register(r'credentials', CredentialViewSet, basename='credential')
router.register(r'tenant-backup-config', TenantBackupConfigViewSet, basename='tenant-backup-config')

urlpatterns = [
    path('', include(router.urls)),
]
