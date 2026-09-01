from users.models import RoleTemplate, UserRoleAssignment


OWNER_SYSTEM_KEYS = {RoleTemplate.SYSTEM_OWNER, RoleTemplate.SYSTEM_ADMIN}


def ensure_org_roles(organization):
    if not organization:
        return {}
    return RoleTemplate.ensure_defaults_for_organization(organization)


def get_default_role_for_user(user):
    if not user or not user.organization_id:
        return None

    roles = ensure_org_roles(user.organization)

    if user.is_superuser:
        return roles.get(RoleTemplate.SYSTEM_OWNER)
    if user.is_staff:
        return roles.get(RoleTemplate.SYSTEM_ADMIN)

    has_existing_owner = UserRoleAssignment.objects.filter(
        organization=user.organization,
        role__system_key__in=OWNER_SYSTEM_KEYS,
    ).exists()
    if not has_existing_owner:
        return roles.get(RoleTemplate.SYSTEM_OWNER)

    return roles.get(RoleTemplate.SYSTEM_MEMBER)


def ensure_user_role_assignment(user, assigned_by=None):
    if not user or not user.organization_id:
        return None

    role = get_default_role_for_user(user)
    if not role:
        return None

    assignment, created = UserRoleAssignment.objects.get_or_create(
        organization=user.organization,
        user=user,
        defaults={
            "role": role,
            "assigned_by": assigned_by,
        },
    )

    if not created:
        update_fields = []
        if assignment.role.organization_id != user.organization_id:
            assignment.role = role
            update_fields.append("role")
        if assigned_by and assignment.assigned_by_id is None:
            assignment.assigned_by = assigned_by
            update_fields.append("assigned_by")
        if update_fields:
            assignment.save(update_fields=update_fields + ["updated_at"])

    return assignment
