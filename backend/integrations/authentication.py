from django.utils import timezone
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from .models import APIKey

class APIKeyAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return None

        # Expecting "Api-Key <key>"
        try:
            prefix, key = auth_header.split()
        except ValueError:
            return None
        
        if prefix.lower() != 'api-key':
            return None

        # Key format: prefix (8 chars) + secret (32+ chars)
        # Actually our raw_key is just the 32 chars urlsafe.
        # But we stored prefix separately.
        # To optimize lookup, we can try to extract prefix from the incoming key if we designed it that way.
        # But in my create_key, I just did: raw_key = secrets.token_urlsafe(32); prefix = raw_key[:8]
        # So yes, the first 8 chars of the provided key ARE the prefix.
        
        if len(key) < 8:
            raise AuthenticationFailed('Invalid API Key format')

        key_prefix = key[:8]
        
        try:
            api_key = APIKey.objects.get(prefix=key_prefix, is_active=True)
        except APIKey.DoesNotExist:
            raise AuthenticationFailed('Invalid API Key')

        if not api_key.check_key(key):
            raise AuthenticationFailed('Invalid API Key')
            
        # Update usage stats
        api_key.last_used_at = timezone.now()
        api_key.save(update_fields=['last_used_at'])

        return (api_key.user, api_key)
