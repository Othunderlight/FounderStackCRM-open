from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import APIKeyViewSet, WebhookViewSet, CredentialViewSet, IntegrationSessionViewSet, TenantBackupConfigViewSet
from .zernio.views import (
    ZernioAccountViewSet,
    ZernioAnalyticsViewSet,
    ZernioConversationViewSet,
    ZernioOAuthAppViewSet,
    ZernioPostViewSet,
    ZernioProfileViewSet,
    ZernioWebhookEventViewSet,
    ZernioWebhookView,
)

router = DefaultRouter()
router.register(r'api-keys', APIKeyViewSet, basename='api-key')
router.register(r'integration-sessions', IntegrationSessionViewSet, basename='integration-session')
router.register(r'webhooks', WebhookViewSet, basename='webhook')
router.register(r'credentials', CredentialViewSet, basename='credential')
router.register(r'tenant-backup-config', TenantBackupConfigViewSet, basename='tenant-backup-config')
router.register(r'zernio/profiles', ZernioProfileViewSet, basename='zernio-profile')
router.register(r'zernio/accounts', ZernioAccountViewSet, basename='zernio-account')
router.register(r'zernio/conversations', ZernioConversationViewSet, basename='zernio-conversation')
router.register(r'zernio/posts', ZernioPostViewSet, basename='zernio-post')
router.register(r'zernio/analytics', ZernioAnalyticsViewSet, basename='zernio-analytics')
router.register(r'zernio/oauth-apps', ZernioOAuthAppViewSet, basename='zernio-oauth-app')
router.register(r'zernio/webhook-events', ZernioWebhookEventViewSet, basename='zernio-webhook-event')

urlpatterns = [
    path('zernio/webhook/', ZernioWebhookView.as_view(), name='zernio-webhook'),
    path('', include(router.urls)),
]
