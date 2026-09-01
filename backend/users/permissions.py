from rest_framework import permissions


ACTION_PERMISSION_MAP = {
    "list": "read",
    "retrieve": "read",
    "context": "read",
    "context_ai": "read",
    "export": "read",
    "shared": "read",
    "mine": "read",
    "by_chart": "read",
    "create": "write",
    "update": "write",
    "partial_update": "write",
    "destroy": "write",
    "import_data": "write",
}


def get_required_permission(view, request):
    if getattr(view, "allow_without_org_permission", False):
        return None

    explicit_map = getattr(view, "required_permissions", None) or {}
    action = getattr(view, "action", None)
    method_key = f"{action}:{request.method.lower()}" if action else None
    if method_key in explicit_map:
        return explicit_map[method_key]
    if action in explicit_map:
        return explicit_map[action]

    resource = getattr(view, "permission_resource", None)
    if resource and action in ACTION_PERMISSION_MAP:
        return f"{resource}.{ACTION_PERMISSION_MAP[action]}"

    return getattr(view, "required_permission", None)


def user_has_permission(user, permission_key):
    if not permission_key:
        return True
    if not user or not user.is_authenticated:
        return False
    return user.has_org_permission(permission_key)


class HasOrgPermission(permissions.BasePermission):
    message = "You do not have permission to perform this action in this organization."

    def has_permission(self, request, view):
        auth = getattr(request, "auth", None)
        if auth is not None:
            try:
                from integrations.models import APIKey

                if isinstance(auth, APIKey):
                    return True
            except Exception:
                pass

        permission_key = get_required_permission(view, request)
        return user_has_permission(request.user, permission_key)
