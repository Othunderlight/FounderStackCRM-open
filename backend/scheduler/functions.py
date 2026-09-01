import logging
from datetime import datetime, timedelta

import inngest
from django.utils import timezone

from .client import inngest_client

logger = logging.getLogger(__name__)


@inngest_client.create_function(
    fn_id="daily_github_backup",
    trigger=inngest.TriggerCron(cron="0 0 * * *"),  # Daily at midnight UTC
)
def daily_github_backup(ctx: inngest.Context):
    """
    Run daily backup of the CRM data for all organizations and push to GitHub.
    """
    try:
        from integrations.models import TenantBackupConfig
        from integrations.services import (
            build_tenant_backup_data,
            push_backup_to_github,
        )

        active_configs = TenantBackupConfig.objects.filter(
            is_active=True
        ).select_related("organization")

        results = []
        logger.info(
            f"🔄 Starting daily GitHub backup for {active_configs.count()} organizations"
        )

        for config in active_configs:
            org = config.organization
            try:
                # Build and push backup
                backup_data = build_tenant_backup_data(org, since=None)
                success, message = push_backup_to_github(config, backup_data)

                status = "success" if success else "failed"
                results.append(
                    {
                        "org_id": str(org.id),
                        "org_name": org.name,
                        "status": status,
                        "result": message,
                    }
                )

                if success:
                    logger.info(f"✅ Backup successful for {org.name}: {message}")
                else:
                    logger.error(f"❌ Backup failed for {org.name}: {message}")

            except Exception as org_e:
                logger.error(f"💥 Critical error backing up {org.name}: {str(org_e)}")
                results.append(
                    {
                        "org_id": str(org.id),
                        "org_name": org.name,
                        "status": "error",
                        "error": str(org_e),
                    }
                )

        return {
            "status": "completed",
            "processed_orgs": len(results),
            "results": results,
        }

    except Exception as e:
        logger.error(f"💥 Error in daily_github_backup scheduler: {str(e)}")
        import traceback

        logger.error(f"💥 Full traceback:\n{traceback.format_exc()}")
        return {"status": "error", "message": str(e)}
