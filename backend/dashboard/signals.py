from django.db.models.signals import post_delete
from django.dispatch import receiver

from .models import DashboardConfig, InteractionType


def remove_id_from_config(config, deleted_id):
    """
    Recursively remove a deleted ID from anywhere in the JSON config.
    Searches all arrays and removes matching IDs while preserving structure.
    """
    if isinstance(config, dict):
        return {k: remove_id_from_config(v, deleted_id) for k, v in config.items()}
    elif isinstance(config, list):
        return [
            remove_id_from_config(item, deleted_id)
            if isinstance(item, (dict, list))
            else item
            for item in config
            if item != deleted_id
        ]
    return config


@receiver(post_delete, sender=InteractionType)
def cleanup_dashboard_configs_on_interaction_type_delete(sender, instance, **kwargs):
    """
    When an InteractionType is deleted, remove all references to it
    from DashboardConfig records in the same organization.
    """
    deleted_id = str(instance.id)
    org = instance.organization

    configs = DashboardConfig.objects.filter(organization=org)
    for config in configs:
        if not config.config:
            continue

        original_config_str = str(config.config)
        cleaned_config = remove_id_from_config(config.config, deleted_id)

        if str(cleaned_config) != original_config_str:
            config.config = cleaned_config
            config.save(update_fields=["config", "updated_at"])
