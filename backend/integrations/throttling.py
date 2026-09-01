from rest_framework.throttling import SimpleRateThrottle
from .models import APIKey

class APIKeyRateThrottle(SimpleRateThrottle):
    scope = 'api_key'

    def get_cache_key(self, request, view):
        # We only apply this if authenticated via APIKey
        auth = getattr(request, 'auth', None)
        if isinstance(auth, APIKey):
            return self.cache_format % {
                'scope': self.scope,
                'ident': auth.prefix
            }
        return None

    def get_rate(self):
        # This is called once per request to determine the limit
        return None 

    def allow_request(self, request, view):
        auth = getattr(request, 'auth', None)
        if not isinstance(auth, APIKey):
            return True # Let other throttles handle it

        # Use the rate from the API key instance
        rate_limit = auth.rate_limit_per_minute

        # Check for System Policy Overrides
        from django.db.models import Q
        from .models import SystemAPIKeyPolicy
        
        policies = SystemAPIKeyPolicy.objects.filter(
            Q(organization=auth.organization) | Q(organization__isnull=True),
            is_active=True
        )
        for policy in policies:
            if policy.max_rate_limit is not None:
                rate_limit = min(rate_limit, policy.max_rate_limit)

        self.num_requests = rate_limit
        self.duration = 60 # per minute
        
        self.key = self.get_cache_key(request, view)
        self.history = self.cache.get(self.key, [])
        self.now = self.timer()

        while self.history and self.history[-1] <= self.now - self.duration:
            self.history.pop()
        
        if len(self.history) >= self.num_requests:
            return self.throttle_failure()
            
        return self.throttle_success()
