from rest_framework import serializers
from .models import APIKey, Webhook, WebhookDelivery, Credential, Key, IntegrationSession, TenantBackupConfig


class KeySerializer(serializers.ModelSerializer):
    class Meta:
        model = Key
        fields = ['id', 'name', 'value']


class CredentialSerializer(serializers.ModelSerializer):
    keys = KeySerializer(many=True, read_only=True)
    keys_data = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=False
    )
    user = serializers.SerializerMethodField()

    class Meta:
        model = Credential
        fields = ['id', 'user', 'keys', 'keys_data']
        read_only_fields = ['id', 'user', 'keys']

    def get_user(self, obj):
        return {
            'id': obj.user.id,
            'email': obj.user.email,
            'first_name': obj.user.first_name,
            'last_name': obj.user.last_name,
            'organization': {
                'id': str(obj.user.organization.id) if obj.user.organization else None,
                'name': obj.user.organization.name if obj.user.organization else None
            }
        }

    def create(self, validated_data):
        keys_data = validated_data.pop('keys_data', [])
        credential = Credential.objects.create(**validated_data)
        for key_data in keys_data:
            Key.objects.create(credential=credential, **key_data)
        return credential

class APIKeySerializer(serializers.ModelSerializer):
    key = serializers.CharField(read_only=True) # Return the raw key only on creation
    scopes = serializers.ListField(
        child=serializers.ChoiceField(choices=APIKey.SCOPE_CHOICES),
        required=False,
        default=list
    )
    
    class Meta:
        model = APIKey
        fields = ['id', 'name', 'prefix', 'created_at', 'last_used_at', 'is_active', 'key', 'scopes', 'expires_at', 'rate_limit_per_minute']
        read_only_fields = ['id', 'prefix', 'created_at', 'last_used_at', 'key']

    def create(self, validated_data):
        user = self.context['request'].user
        scopes = validated_data.pop('scopes', [])
        # Always include integration-sessions scopes by default
        default_scopes = ['integration-sessions:read', 'integration-sessions:write']
        for scope in default_scopes:
            if scope not in scopes:
                scopes.append(scope)
        expires_at = validated_data.pop('expires_at', None)
        rate_limit = validated_data.pop('rate_limit_per_minute', 60)

        # We need to call the class method
        instance, raw_key = APIKey.create_key(
            user=user,
            name=validated_data['name'],
            organization=user.organization,
            scopes=scopes,
            expires_at=expires_at,
            rate_limit_per_minute=rate_limit
        )
        # Attach raw_key to instance so serializer can return it
        instance.key = raw_key
        return instance

class WebhookSerializer(serializers.ModelSerializer):
    class Meta:
        model = Webhook
        fields = ['id', 'url', 'secret', 'events', 'is_active', 'description', 'created_at', 'updated_at']
        read_only_fields = ['id', 'secret', 'created_at', 'updated_at']

class WebhookDeliverySerializer(serializers.ModelSerializer):
    class Meta:
        model = WebhookDelivery
        fields = ['id', 'event', 'payload', 'status_code', 'response_body', 'success', 'duration_ms', 'created_at']
        read_only_fields = fields


class IntegrationSessionSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()

    class Meta:
        model = IntegrationSession
        fields = ['id', 'user', 'key', 'session', 'created_at', 'updated_at']
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']

    def get_user(self, obj):
        return {
            'id': obj.user.id,
            'email': obj.user.email,
            'first_name': obj.user.first_name,
            'last_name': obj.user.last_name,
            'organization': {
                'id': str(obj.user.organization.id) if obj.user.organization else None,
                'name': obj.user.organization.name if obj.user.organization else None
            }
        }


class TenantBackupConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = TenantBackupConfig
        fields = [
            'id',
            'organization',
            'github_username',
            'github_access_token',
            'repo_name',
            'branch_name',
            'last_backup_at',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'organization', 'last_backup_at', 'created_at', 'updated_at']
        extra_kwargs = {
            'github_access_token': {'write_only': True}
        }
