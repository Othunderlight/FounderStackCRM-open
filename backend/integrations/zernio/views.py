from __future__ import annotations

import hashlib
import hmac
import json
import logging
from datetime import date

from django.conf import settings
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Q
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from integrations.models import (
    ZernioAccount,
    ZernioConversation,
    ZernioDailyMetric,
    ZernioPost,
    ZernioProfile,
    ZernioWebhookEvent,
)
from integrations.permissions import HasAPIKeyScope
from users.permissions import HasOrgPermission

from .client import ZernioAPIError, get_zernio_client
from .serializers import (
    ZernioAccountSerializer,
    ZernioConnectSerializer,
    ZernioConversationSerializer,
    ZernioDailyMetricSerializer,
    ZernioMessageSerializer,
    ZernioOAuthAppSerializer,
    ZernioOAuthAppUpdateSerializer,
    ZernioPostSerializer,
    ZernioProfileSerializer,
    ZernioPublishPostSerializer,
    ZernioSendMessageSerializer,
    ZernioWebhookEventSerializer,
    ZernioWelcomeScreenSerializer,
)
from .services import (
    disconnect_account,
    ensure_profile,
    get_connect_url,
    handle_webhook_event,
    mark_conversation_read,
    mark_webhook_failed,
    mark_webhook_processed,
    publish_post,
    resolve_profile_from_event,
    send_message,
    send_typing_indicator,
    sync_account_health,
    sync_accounts,
    sync_analytics,
    sync_analytics_delta,
    sync_conversation_messages,
    sync_conversations,
    sync_posts,
)

logger = logging.getLogger(__name__)


def _error_response(exc: ZernioAPIError) -> Response:
    return Response(
        {
            "detail": exc.message,
            "code": exc.code,
            "status_code": exc.status_code,
            "details": exc.details,
        },
        status=exc.status_code
        if exc.status_code and 400 <= exc.status_code < 600
        else status.HTTP_502_BAD_GATEWAY,
    )


def _profile_for_user(user, *, create: bool = False):
    if not user.organization:
        if create:
            raise ZernioAPIError(
                "You need an organization before connecting Zernio.",
                status_code=400,
                code="no_organization",
            )
        return None
    profile = ZernioProfile.objects.filter(organization=user.organization).first()
    if profile is None and create:
        profile = ensure_profile(user.organization)
    return profile


class ZernioTenantMixin:
    permission_classes = [permissions.IsAuthenticated, HasAPIKeyScope, HasOrgPermission]
    scope_resource = "integrations"

    def get_queryset(self):
        user = self.request.user
        if not user.organization:
            return self.queryset.none()
        return self.queryset.filter(organization=user.organization)


class ZernioProfileViewSet(ZernioTenantMixin, viewsets.ModelViewSet):
    queryset = ZernioProfile.objects.select_related("organization").all()
    serializer_class = ZernioProfileSerializer
    required_permissions = {
        "list": "config.manage",
        "retrieve": "config.manage",
        "create": "config.manage",
        "ensure": "config.manage",
        "sync": "config.manage",
        "health": "config.manage",
        "connect_url": "config.manage",
        "welcome_screen": "config.manage",
        "destroy": "config.manage",
    }

    def create(self, request, *args, **kwargs):
        return self._ensure(request)

    @action(detail=False, methods=["post"], url_path="ensure")
    def ensure(self, request):
        return self._ensure(request)

    def _ensure(self, request):
        if not request.user.organization:
            return Response(
                {"detail": "You need an organization before connecting Zernio."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            profile = ensure_profile(request.user.organization)
        except ZernioAPIError as exc:
            return _error_response(exc)
        return Response(
            self.get_serializer(profile).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["post"], url_path="sync")
    def sync(self, request):
        try:
            profile = _profile_for_user(request.user, create=True)
        except ZernioAPIError as exc:
            return _error_response(exc)

        result = {}
        try:
            result["accounts"] = len(sync_accounts(profile))
        except ZernioAPIError as exc:
            return _error_response(exc)

        if request.data.get("health", True):
            try:
                sync_account_health(profile)
            except ZernioAPIError as exc:
                result["health_error"] = exc.message

        if request.data.get("inbox", True):
            try:
                result["conversations"] = len(
                    sync_conversations(
                        profile,
                        status=request.data.get("status") or None,
                        limit=int(request.data.get("limit", 50)),
                    )
                )
            except ZernioAPIError as exc:
                result["inbox_error"] = exc.message

        if request.data.get("analytics", False):
            try:
                sync_analytics(profile)
                result["analytics"] = "synced"
            except ZernioAPIError as exc:
                result["analytics_error"] = exc.message

        profile.refresh_from_db()
        return Response(
            {
                "profile": self.get_serializer(profile).data,
                "synced": result,
            }
        )

    @action(detail=True, methods=["get"], url_path="health")
    def health(self, request, pk=None):
        profile = self.get_object()
        if not profile.profile_id:
            return Response(
                {"detail": "Profile is not provisioned on Zernio yet."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            payload = sync_account_health(profile)
        except ZernioAPIError as exc:
            return _error_response(exc)
        return Response(payload)

    @action(detail=False, methods=["get"], url_path="connect-url")
    def connect_url(self, request):
        serializer = ZernioConnectSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        try:
            profile = _profile_for_user(request.user, create=True)
            payload = get_connect_url(
                profile,
                serializer.validated_data["platform"],
                **serializer.to_api_params(),
            )
        except ZernioAPIError as exc:
            return _error_response(exc)
        return Response(payload)

    @action(detail=False, methods=["get", "put"], url_path="welcome-screen")
    def welcome_screen(self, request):
        try:
            client = get_zernio_client()
            if request.method.lower() == "put":
                serializer = ZernioWelcomeScreenSerializer(data=request.data)
                serializer.is_valid(raise_exception=True)
                payload = {
                    key: value
                    for key, value in serializer.to_api_payload().items()
                    if value is not None
                }
                return Response(client.update_welcome_screen(payload))
            return Response(client.get_welcome_screen())
        except ZernioAPIError as exc:
            return _error_response(exc)

    def destroy(self, request, *args, **kwargs):
        profile = self.get_object()
        try:
            if profile.profile_id:
                get_zernio_client().delete_profile(profile.profile_id)
        except ZernioAPIError as exc:
            return _error_response(exc)
        profile.profile_id = None
        profile.status = ZernioProfile.Status.DISCONNECTED
        profile.save(update_fields=["profile_id", "status", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class ZernioAccountViewSet(
    ZernioTenantMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    queryset = ZernioAccount.objects.select_related("profile").all()
    serializer_class = ZernioAccountSerializer
    required_permissions = {
        "list": "config.manage",
        "retrieve": "config.manage",
        "sync": "config.manage",
        "health": "config.manage",
        "reconnect": "config.manage",
        "destroy": "config.manage",
    }

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params
        if params.get("platform"):
            queryset = queryset.filter(platform=params["platform"])
        if params.get("active") in {"true", "false"}:
            queryset = queryset.filter(is_active=params["active"] == "true")
        if params.get("needs_reconnect") in {"true", "false"}:
            queryset = queryset.filter(
                needs_reconnect=params["needs_reconnect"] == "true"
            )
        return queryset

    @action(detail=False, methods=["post"], url_path="sync")
    def sync(self, request):
        try:
            profile = _profile_for_user(request.user, create=True)
            accounts = sync_accounts(profile)
            sync_account_health(profile)
        except ZernioAPIError as exc:
            return _error_response(exc)
        return Response(
            {
                "synced": len(accounts),
                "results": self.get_serializer(accounts, many=True).data,
            }
        )

    @action(detail=False, methods=["get"], url_path="health")
    def health(self, request):
        try:
            profile = _profile_for_user(request.user, create=True)
            payload = sync_account_health(profile)
        except ZernioAPIError as exc:
            return _error_response(exc)
        return Response(payload)

    @action(detail=True, methods=["post"], url_path="reconnect")
    def reconnect(self, request, pk=None):
        account = self.get_object()
        if not account.profile.profile_id:
            return Response(
                {"detail": "Profile is not provisioned on Zernio yet."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            payload = get_connect_url(
                account.profile,
                account.platform,
                redirect_url=request.data.get("redirect_url"),
                welcome=request.data.get("welcome"),
            )
        except ZernioAPIError as exc:
            return _error_response(exc)
        return Response(payload)

    def destroy(self, request, *args, **kwargs):
        account = self.get_object()
        try:
            disconnect_account(account)
        except ZernioAPIError as exc:
            return _error_response(exc)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ZernioConversationViewSet(ZernioTenantMixin, viewsets.ReadOnlyModelViewSet):
    queryset = ZernioConversation.objects.select_related(
        "profile", "account"
    ).all()
    serializer_class = ZernioConversationSerializer
    required_permissions = {
        "list": "agent.use",
        "retrieve": "agent.use",
        "sync": "agent.use",
        "messages": "agent.use",
        "backfill": "agent.use",
        "read": "agent.use",
        "typing": "agent.use",
    }

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params
        if params.get("status"):
            queryset = queryset.filter(status=params["status"])
        if params.get("platform"):
            queryset = queryset.filter(platform=params["platform"])
        if params.get("account"):
            queryset = queryset.filter(account_id=params["account"])
        if params.get("unread") in {"true", "false"}:
            if params["unread"] == "true":
                queryset = queryset.filter(unread_count__gt=0)
            else:
                queryset = queryset.filter(unread_count=0)
        search = params.get("search")
        if search:
            queryset = queryset.filter(
                Q(participant_name__icontains=search)
                | Q(participant_username__icontains=search)
                | Q(last_message_text__icontains=search)
            )
        return queryset

    @action(detail=False, methods=["post"], url_path="sync")
    def sync(self, request):
        try:
            profile = _profile_for_user(request.user, create=True)
            conversations = sync_conversations(
                profile,
                status=request.data.get("status") or None,
                limit=int(request.data.get("limit", 50)),
            )
        except ZernioAPIError as exc:
            return _error_response(exc)
        return Response(
            {
                "synced": len(conversations),
                "results": self.get_serializer(conversations, many=True).data,
            }
        )

    @action(detail=True, methods=["get", "post"], url_path="messages")
    def messages(self, request, pk=None):
        conversation = self.get_object()

        if request.method.lower() == "get":
            refresh = request.query_params.get("refresh", "true").lower() not in {
                "0",
                "false",
                "no",
            }
            if refresh:
                try:
                    sync_limit = int(request.query_params.get("sync_limit", 50))
                except (TypeError, ValueError):
                    sync_limit = 50
                try:
                    sync_conversation_messages(
                        conversation,
                        limit=max(1, min(sync_limit, 100)),
                    )
                except ZernioAPIError as exc:
                    # Still return whatever is already mirrored.
                    logger.warning(
                        "Failed to refresh messages for conversation %s: %s",
                        conversation.conversation_id,
                        exc.message,
                    )
            queryset = conversation.messages.all().order_by("sent_at", "created_at")
            page = self.paginate_queryset(queryset)
            if page is not None:
                return self.get_paginated_response(
                    ZernioMessageSerializer(page, many=True).data
                )
            return Response(ZernioMessageSerializer(queryset, many=True).data)

        serializer = ZernioSendMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        account = None
        account_id = data.get("account_id")
        if account_id:
            account = ZernioAccount.objects.filter(
                profile=conversation.profile, account_id=account_id
            ).first()
            if account is None:
                try:
                    account = ZernioAccount.objects.filter(
                        profile=conversation.profile, id=account_id
                    ).first()
                except (DjangoValidationError, ValueError):
                    account = None
            if account is None:
                return Response(
                    {"detail": "Account not found in this conversation's profile."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        try:
            message = send_message(
                conversation,
                data["message"],
                account=account,
                idempotency_key=data.get("idempotency_key") or None,
                attachments=data.get("attachments"),
            )
        except ZernioAPIError as exc:
            return _error_response(exc)
        return Response(
            ZernioMessageSerializer(message).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="backfill")
    def backfill(self, request, pk=None):
        conversation = self.get_object()
        try:
            messages = sync_conversation_messages(
                conversation, limit=request.data.get("limit")
            )
        except ZernioAPIError as exc:
            return _error_response(exc)
        return Response(
            {
                "synced": len(messages),
                "results": ZernioMessageSerializer(messages, many=True).data,
            }
        )

    @action(detail=True, methods=["post"], url_path="read")
    def read(self, request, pk=None):
        conversation = self.get_object()
        try:
            mark_conversation_read(conversation)
        except ZernioAPIError as exc:
            return _error_response(exc)
        return Response({"status": "read", "unread_count": 0})

    @action(detail=True, methods=["post"], url_path="typing")
    def typing(self, request, pk=None):
        conversation = self.get_object()
        try:
            send_typing_indicator(conversation)
        except ZernioAPIError as exc:
            return _error_response(exc)
        return Response({"status": "typing_sent"})


class ZernioPostViewSet(ZernioTenantMixin, viewsets.ReadOnlyModelViewSet):
    queryset = ZernioPost.objects.select_related("profile").all()
    serializer_class = ZernioPostSerializer
    required_permissions = {
        "list": "config.manage",
        "retrieve": "config.manage",
        "publish": "config.manage",
        "sync": "config.manage",
        "sync_external": "config.manage",
    }

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params
        if params.get("status"):
            queryset = queryset.filter(status=params["status"])
        return queryset

    @action(detail=False, methods=["post"], url_path="publish")
    def publish(self, request):
        serializer = ZernioPublishPostSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            profile = _profile_for_user(request.user, create=True)
        except ZernioAPIError as exc:
            return _error_response(exc)

        platforms = data.get("platforms") or []
        if not platforms:
            try:
                accounts = ZernioAccount.objects.filter(
                    profile=profile, id__in=data["account_ids"], is_active=True
                )
            except (DjangoValidationError, ValueError):
                accounts = ZernioAccount.objects.none()
            if not accounts.exists():
                return Response(
                    {"detail": "No active accounts matched account_ids."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            platforms = [
                {"platform": account.platform, "accountId": account.account_id}
                for account in accounts
            ]

        try:
            post = publish_post(
                profile,
                data["content"],
                platforms,
                publish_now=data.get("publish_now", True),
                scheduled_for=data.get("scheduled_for"),
                extra=data.get("extra"),
            )
        except ZernioAPIError as exc:
            return _error_response(exc)

        if post is None:
            return Response(
                {"detail": "Zernio accepted the request but returned no post id."},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        return Response(
            self.get_serializer(post).data, status=status.HTTP_201_CREATED
        )

    @action(detail=False, methods=["post"], url_path="sync")
    def sync(self, request):
        try:
            profile = _profile_for_user(request.user, create=True)
            posts = sync_posts(
                profile,
                window_days=int(request.data.get("window_days", 90)),
            )
        except ZernioAPIError as exc:
            return _error_response(exc)
        return Response({"synced": len(posts)})

    @action(detail=False, methods=["post"], url_path="sync-external")
    def sync_external(self, request):
        account_id = request.data.get("account_id")
        url = request.data.get("url")
        if not account_id or not url:
            return Response(
                {"detail": "account_id and url are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            payload = get_zernio_client().sync_external_post(account_id, url)
        except ZernioAPIError as exc:
            return _error_response(exc)
        return Response(payload, status=status.HTTP_202_ACCEPTED)


class ZernioAnalyticsViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, HasAPIKeyScope, HasOrgPermission]
    scope_resource = "integrations"
    required_permissions = {
        "list": "dashboard.read",
        "daily": "dashboard.read",
        "followers": "dashboard.read",
        "delta": "dashboard.read",
    }

    def _profile(self, request, *, create=False):
        return _profile_for_user(request.user, create=create)

    @staticmethod
    def _date_param(params, key):
        value = params.get(key)
        if not value:
            return None
        try:
            return date.fromisoformat(value)
        except ValueError:
            return None

    def list(self, request):
        profile = self._profile(request)
        if profile is None:
            return Response(
                {"detail": "Zernio is not connected for this organization."},
                status=status.HTTP_404_NOT_FOUND,
            )

        refresh = request.query_params.get("refresh") in {"1", "true", "yes"}
        if refresh or not profile.analytics_data:
            try:
                data = sync_analytics(
                    profile,
                    days=int(request.query_params.get("days", 30)),
                    from_date=self._date_param(request.query_params, "fromDate"),
                    to_date=self._date_param(request.query_params, "toDate"),
                    compare=request.query_params.get(
                        "compare", "previous_period"
                    ),
                    top_posts=int(request.query_params.get("topPosts", 5)),
                    recent_posts=int(request.query_params.get("recentPosts", 10)),
                    platform=request.query_params.get("platform") or None,
                )
            except ZernioAPIError as exc:
                return _error_response(exc)
        else:
            data = profile.analytics_data

        return Response(
            {
                "data": data,
                "last_synced_at": profile.last_analytics_sync_at,
            }
        )

    @action(detail=False, methods=["get"], url_path="daily")
    def daily(self, request):
        profile = self._profile(request)
        if profile is None:
            return Response(
                {"detail": "Zernio is not connected for this organization."},
                status=status.HTTP_404_NOT_FOUND,
            )
        queryset = ZernioDailyMetric.objects.filter(profile=profile)
        from_date = self._date_param(request.query_params, "fromDate")
        to_date = self._date_param(request.query_params, "toDate")
        if from_date:
            queryset = queryset.filter(date__gte=from_date)
        if to_date:
            queryset = queryset.filter(date__lte=to_date)
        return Response(
            {
                "data": ZernioDailyMetricSerializer(
                    queryset.order_by("date"), many=True
                ).data,
                "last_synced_at": profile.last_analytics_sync_at,
            }
        )

    @action(detail=False, methods=["get"], url_path="followers")
    def followers(self, request):
        profile = self._profile(request)
        if profile is None or not profile.profile_id:
            return Response(
                {"detail": "Zernio is not connected for this organization."},
                status=status.HTTP_404_NOT_FOUND,
            )
        params = {
            "profileId": profile.profile_id,
            "granularity": request.query_params.get("granularity", "daily"),
            "fromDate": request.query_params.get("fromDate"),
            "toDate": request.query_params.get("toDate"),
        }
        try:
            payload = get_zernio_client().get_follower_stats(
                **{key: value for key, value in params.items() if value}
            )
        except ZernioAPIError as exc:
            return _error_response(exc)
        return Response(payload)

    @action(detail=False, methods=["post"], url_path="delta")
    def delta(self, request):
        try:
            profile = self._profile(request, create=True)
            payload = sync_analytics_delta(profile)
        except ZernioAPIError as exc:
            return _error_response(exc)
        return Response(payload)


class ZernioOAuthAppViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, HasAPIKeyScope, HasOrgPermission]
    scope_resource = "integrations"
    required_permissions = {
        "list": "config.manage",
        "create": "config.manage",
        "partial_update": "config.manage",
        "destroy": "config.manage",
        "test": "config.manage",
    }

    def list(self, request):
        try:
            payload = get_zernio_client().list_oauth_apps()
        except ZernioAPIError as exc:
            return _error_response(exc)
        return Response(payload)

    def create(self, request):
        serializer = ZernioOAuthAppSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            payload = get_zernio_client().create_oauth_app(
                serializer.to_api_payload()
            )
        except ZernioAPIError as exc:
            return _error_response(exc)
        return Response(payload, status=status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None):
        serializer = ZernioOAuthAppUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            payload = get_zernio_client().update_oauth_app(
                pk, serializer.to_api_payload()
            )
        except ZernioAPIError as exc:
            return _error_response(exc)
        return Response(payload)

    def destroy(self, request, pk=None):
        confirm = request.query_params.get("confirm") in {"1", "true", "yes"}
        try:
            payload = get_zernio_client().delete_oauth_app(pk, confirm=confirm)
        except ZernioAPIError as exc:
            return _error_response(exc)
        return Response(payload)

    @action(detail=True, methods=["post"], url_path="test")
    def test(self, request, pk=None):
        try:
            payload = get_zernio_client().test_oauth_app(pk)
        except ZernioAPIError as exc:
            return _error_response(exc)
        return Response(payload)


class ZernioWebhookEventViewSet(ZernioTenantMixin, viewsets.ReadOnlyModelViewSet):
    queryset = ZernioWebhookEvent.objects.select_related("profile").all()
    serializer_class = ZernioWebhookEventSerializer
    required_permissions = {
        "list": "config.manage",
        "retrieve": "config.manage",
    }

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params
        if params.get("event"):
            queryset = queryset.filter(event=params["event"])
        if params.get("status"):
            queryset = queryset.filter(status=params["status"])
        return queryset


class ZernioWebhookView(APIView):
    """Public webhook endpoint. Authenticated by the HMAC signature only."""

    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        secret = getattr(settings, "ZERNIO_WEBHOOK_SECRET", "")
        if not secret:
            return Response(
                {"detail": "ZERNIO_WEBHOOK_SECRET is not configured."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        raw_body = request.body
        signature = request.headers.get("X-Zernio-Signature", "")
        computed = hmac.new(
            secret.encode("utf-8"), raw_body, hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(computed, signature):
            return Response(
                {"detail": "Invalid signature."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            payload = json.loads(raw_body.decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            return Response(
                {"detail": "Invalid JSON body."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not isinstance(payload, dict):
            return Response(
                {"detail": "Webhook body must be a JSON object."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        event_id = payload.get("id") or hashlib.sha256(raw_body).hexdigest()
        event_id = str(event_id)
        profile, _ = resolve_profile_from_event(payload)
        account = payload.get("account") or {}
        account_id = None
        if isinstance(account, dict):
            account_id = account.get("accountId") or account.get("id")

        event, created = ZernioWebhookEvent.objects.get_or_create(
            event_id=event_id,
            defaults={
                "organization": profile.organization if profile else None,
                "profile": profile,
                "event": str(payload.get("event") or "")[:100],
                "account_id": account_id,
                "payload": payload,
            },
        )

        if not created and event.status == ZernioWebhookEvent.Status.PROCESSED:
            return Response({"ok": True, "duplicate": True})

        try:
            handle_webhook_event(payload, profile=profile)
        except Exception as exc:  # noqa: BLE001 - webhook must be robust
            logger.exception("Failed to process Zernio webhook %s", event_id)
            mark_webhook_failed(event, str(exc))
            return Response(
                {"detail": "Webhook processing failed."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        event.organization = profile.organization if profile else event.organization
        event.profile = profile or event.profile
        event.account_id = account_id or event.account_id
        event.save(
            update_fields=[
                "organization",
                "profile",
                "account_id",
                "updated_at",
            ]
        )
        mark_webhook_processed(event)
        return Response({"ok": True})
