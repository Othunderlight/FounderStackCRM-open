from rest_framework import serializers

from integrations.models import (
    ZernioAccount,
    ZernioConversation,
    ZernioDailyMetric,
    ZernioMessage,
    ZernioPost,
    ZernioProfile,
    ZernioWebhookEvent,
)


class ZernioProfileSerializer(serializers.ModelSerializer):
    accounts_count = serializers.SerializerMethodField()
    conversations_count = serializers.SerializerMethodField()

    class Meta:
        model = ZernioProfile
        fields = [
            "id",
            "organization",
            "profile_id",
            "name",
            "external_id",
            "is_default",
            "status",
            "metadata",
            "analytics_data",
            "analytics_cursor",
            "last_analytics_sync_at",
            "last_inbox_sync_at",
            "last_synced_at",
            "accounts_count",
            "conversations_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_accounts_count(self, obj):
        return obj.accounts.count()

    def get_conversations_count(self, obj):
        return obj.conversations.count()


class ZernioAccountSerializer(serializers.ModelSerializer):
    profile_id = serializers.CharField(source="profile.profile_id", read_only=True)

    class Meta:
        model = ZernioAccount
        fields = [
            "id",
            "profile",
            "profile_id",
            "account_id",
            "platform",
            "username",
            "display_name",
            "avatar_url",
            "is_active",
            "status",
            "can_post",
            "token_valid",
            "needs_reconnect",
            "issues",
            "health",
            "metadata",
            "connected_at",
            "disconnected_at",
            "last_synced_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class ZernioMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ZernioMessage
        fields = [
            "id",
            "conversation",
            "message_id",
            "direction",
            "text",
            "sender",
            "attachments",
            "status",
            "error_message",
            "idempotency_key",
            "sent_at",
            "metadata",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class ZernioConversationSerializer(serializers.ModelSerializer):
    account = ZernioAccountSerializer(read_only=True)
    last_message = serializers.SerializerMethodField()
    person_name = serializers.CharField(source="person.name", read_only=True, default=None)

    class Meta:
        model = ZernioConversation
        fields = [
            "id",
            "profile",
            "account",
            "person",
            "identity",
            "person_name",
            "conversation_id",
            "platform",
            "participant_id",
            "participant_name",
            "participant_username",
            "participant_avatar",
            "status",
            "last_message_text",
            "last_message_at",
            "unread_count",
            "metadata",
            "last_synced_at",
            "last_message",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_last_message(self, obj):
        prefetched = getattr(obj, "prefetched_messages", None)
        message = prefetched[0] if prefetched else obj.messages.order_by("-sent_at").first()
        return ZernioMessageSerializer(message).data if message else None


class ZernioPostSerializer(serializers.ModelSerializer):
    class Meta:
        model = ZernioPost
        fields = [
            "id",
            "profile",
            "post_id",
            "content",
            "status",
            "platforms",
            "platform_post_urls",
            "analytics",
            "published_at",
            "scheduled_for",
            "last_synced_at",
            "metadata",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class ZernioDailyMetricSerializer(serializers.ModelSerializer):
    class Meta:
        model = ZernioDailyMetric
        fields = [
            "id",
            "profile",
            "date",
            "metrics",
            "platform_breakdown",
            "raw",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class ZernioWebhookEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = ZernioWebhookEvent
        fields = [
            "id",
            "event_id",
            "event",
            "organization",
            "profile",
            "account_id",
            "payload",
            "status",
            "error",
            "processed_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class ZernioConnectSerializer(serializers.Serializer):
    platform = serializers.CharField(max_length=50)
    redirect_url = serializers.URLField(required=False, allow_blank=True)
    headless = serializers.BooleanField(required=False)
    welcome = serializers.BooleanField(required=False)
    oauth_app_id = serializers.CharField(required=False, allow_blank=True)
    brand_name = serializers.CharField(required=False, allow_blank=True)
    logo_url = serializers.URLField(required=False, allow_blank=True)
    primary_color = serializers.CharField(required=False, allow_blank=True)
    welcome_theme = serializers.JSONField(required=False)
    extra = serializers.JSONField(required=False)

    def to_api_params(self):
        data = self.validated_data
        params = {
            "redirect_url": data.get("redirect_url") or None,
            "headless": data.get("headless"),
            "welcome": data.get("welcome"),
            "oauth_app_id": data.get("oauth_app_id") or None,
            "brandName": data.get("brand_name") or None,
            "logoUrl": data.get("logo_url") or None,
            "primaryColor": data.get("primary_color") or None,
            "welcomeTheme": data.get("welcome_theme"),
        }
        params.update(data.get("extra") or {})
        return {key: value for key, value in params.items() if value is not None}


class ZernioSendMessageSerializer(serializers.Serializer):
    message = serializers.CharField()
    account_id = serializers.CharField(required=False, allow_blank=True)
    idempotency_key = serializers.CharField(required=False, allow_blank=True)
    attachments = serializers.ListField(
        child=serializers.JSONField(), required=False
    )


class ZernioPublishPostSerializer(serializers.Serializer):
    content = serializers.CharField()
    platforms = serializers.ListField(
        child=serializers.JSONField(), required=False
    )
    account_ids = serializers.ListField(
        child=serializers.CharField(), required=False
    )
    publish_now = serializers.BooleanField(required=False, default=True)
    scheduled_for = serializers.DateTimeField(required=False)
    extra = serializers.JSONField(required=False)

    def validate(self, attrs):
        if not attrs.get("platforms") and not attrs.get("account_ids"):
            raise serializers.ValidationError(
                "Provide either platforms or account_ids."
            )
        if attrs.get("publish_now") is False and not attrs.get("scheduled_for"):
            raise serializers.ValidationError(
                "scheduled_for is required when publish_now is false."
            )
        return attrs


class ZernioWelcomeScreenSerializer(serializers.Serializer):
    show_by_default = serializers.BooleanField(required=False)
    brand_name = serializers.CharField(required=False, allow_blank=True)
    logo_url = serializers.URLField(required=False, allow_blank=True)
    theme = serializers.JSONField(required=False)

    def to_api_payload(self):
        data = self.validated_data
        return {
            "showByDefault": data.get("show_by_default"),
            "brandName": data.get("brand_name"),
            "logoUrl": data.get("logo_url"),
            "theme": data.get("theme"),
        }


class ZernioOAuthAppSerializer(serializers.Serializer):
    platform = serializers.CharField(max_length=50)
    label = serializers.CharField(max_length=255)
    client_id = serializers.CharField()
    client_secret = serializers.CharField(write_only=True)
    scope_areas = serializers.ListField(
        child=serializers.CharField(), required=False
    )
    meta_app_id = serializers.CharField(required=False, allow_blank=True)
    meta_app_secret = serializers.CharField(
        required=False, allow_blank=True, write_only=True
    )
    slack_signing_secret = serializers.CharField(
        required=False, allow_blank=True, write_only=True
    )
    webhook_url = serializers.URLField(required=False, allow_blank=True)
    shared_webhook_url = serializers.URLField(required=False, allow_blank=True)

    def to_api_payload(self):
        data = self.validated_data
        payload = {
            "platform": data["platform"],
            "label": data["label"],
            "clientId": data["client_id"],
            "clientSecret": data["client_secret"],
            "scopeAreas": data.get("scope_areas"),
            "metaAppId": data.get("meta_app_id"),
            "metaAppSecret": data.get("meta_app_secret"),
            "slackSigningSecret": data.get("slack_signing_secret"),
            "webhookUrl": data.get("webhook_url"),
            "sharedWebhookUrl": data.get("shared_webhook_url"),
        }
        return {key: value for key, value in payload.items() if value not in (None, "")}


class ZernioOAuthAppUpdateSerializer(serializers.Serializer):
    label = serializers.CharField(max_length=255, required=False)
    client_secret = serializers.CharField(
        required=False, allow_blank=True, write_only=True
    )
    scope_areas = serializers.ListField(
        child=serializers.CharField(), required=False
    )
    meta_app_id = serializers.CharField(required=False, allow_blank=True)
    meta_app_secret = serializers.CharField(
        required=False, allow_blank=True, write_only=True
    )
    slack_signing_secret = serializers.CharField(
        required=False, allow_blank=True, write_only=True
    )
    webhook_url = serializers.URLField(required=False, allow_blank=True)
    shared_webhook_url = serializers.URLField(required=False, allow_blank=True)

    def to_api_payload(self):
        data = self.validated_data
        payload = {
            "label": data.get("label"),
            "clientSecret": data.get("client_secret"),
            "scopeAreas": data.get("scope_areas"),
            "metaAppId": data.get("meta_app_id"),
            "metaAppSecret": data.get("meta_app_secret"),
            "slackSigningSecret": data.get("slack_signing_secret"),
            "webhookUrl": data.get("webhook_url"),
            "sharedWebhookUrl": data.get("shared_webhook_url"),
        }
        return {key: value for key, value in payload.items() if value not in (None, "")}
