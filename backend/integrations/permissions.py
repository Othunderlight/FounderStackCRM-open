from rest_framework import permissions
from .models import APIKey, SystemAPIKeyPolicy
from django.db.models import Q

class HasAPIKeyScope(permissions.BasePermission):
    """
    Checks if the API Key has the required scope for the action.
    Also handles "search:only" restriction and System Policy overrides.
    """
    
    def has_permission(self, request, view):
        auth = getattr(request, 'auth', None)
        
        # If not using API Key (e.g. JWT/Session), allow standard permission classes to handle it
        if not isinstance(auth, APIKey):
            return True

        # Check for expiration
        from django.utils import timezone
        if auth.expires_at and auth.expires_at < timezone.now():
            return False

        # --- SYSTEM POLICY OVERRIDES ---
        # Fetch policies: either global (org=None) or specific to this org
        policies = SystemAPIKeyPolicy.objects.filter(
            Q(organization=auth.organization) | Q(organization__isnull=True),
            is_active=True
        ).order_by('organization') # Org-specific takes precedence if we process it last
        
        forbidden_scopes = []
        force_search_only = False
        
        for policy in policies:
            forbidden_scopes.extend(policy.forbidden_scopes)
            if policy.force_search_only:
                force_search_only = True

        def normalize_scope_resource(resource_name):
            if not resource_name:
                return "unknown"
            if resource_name in ["person", "people"]:
                return "people"
            if resource_name == "dashboardconfig":
                return "dashboardconfig"
            if resource_name == "integrationsession":
                return "integration-sessions"
            if resource_name == "interactionlog":
                return "interactions"
            if resource_name in ["activitylog", "activities"]:
                return "activitylogs"
            if resource_name == "synclog":
                return "synclogs"
            if resource_name == "syncrecord":
                return "syncrecords"
            if resource_name.endswith("y"):
                return resource_name[:-1] + "ies"
            if resource_name.endswith("log"):
                return resource_name[:-3] + "s"
            if resource_name.endswith("s"):
                return resource_name
            return f"{resource_name}s"

        # Determine required scope based on explicit resource key first, then model.
        model_name = getattr(view, "scope_resource", None)
        if not model_name:
            model_name = getattr(view, "permission_resource", None)
        if not model_name and hasattr(view, "queryset") and view.queryset is not None:
            model_name = view.queryset.model.__name__.lower()
        if not model_name and hasattr(view, "model") and view.model is not None:
            model_name = view.model.__name__.lower()
        model_name = normalize_scope_resource(model_name)

        action = getattr(view, 'action', None)
        if not action:
            # Fallback for simple API views
            if request.method == 'GET': action = 'list'
            else: action = 'create'
        
        # Mapping actions to read/write
        if action in ['list', 'retrieve', 'search', 'context', 'export', 'deliveries', 'mine']:
            required_type = 'read'
        else:
            required_type = 'write'
            
        required_scope = f"{model_name}:{required_type}"

        # Special case: integration-sessions and userpreferences are always allowed (included by default for all keys)
        if model_name in ['integration-sessions', 'userpreferences']:
            # Still check forbidden scopes
            if required_scope in forbidden_scopes:
                return False
            # Skip the scope check
        else:
            # 1. Check if scope is globally forbidden by Super Admin
            if required_scope in forbidden_scopes:
                return False

            # 2. Check if key has the required scope
            if required_scope not in auth.scopes:
                return False

        # 3. Check for search:only restriction (forced by Super Admin or set on Key)
        is_search_only = force_search_only or ('search:only' in auth.scopes)
        
        if is_search_only and action == 'list':
            # If search:only is enforced, check if they are actually searching OR filtering
            # We allow the request if ANY query parameters are present.
            if not request.query_params:
                return False

        return True
