import inngest
import inngest.django

from .client import inngest_client
from .functions import daily_github_backup, zernio_sync_all

active_inngest_functions = [
    daily_github_backup,
    zernio_sync_all,
]


scheduler_inngest_view_path = inngest.django.serve(
    inngest_client, active_inngest_functions
)
