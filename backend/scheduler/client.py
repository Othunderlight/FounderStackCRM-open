import logging

import inngest
from environ import Env

env = Env()

inngest_client = inngest.Inngest(
    app_id="founderstack_crm",
    signing_key=env("INNGEST_SIGNING_KEY"),
    event_key=env("INNGEST_EVENT_KEY"),
    logger=logging.getLogger("gunicorn"),
    is_production=True,  # Add this to force production mode
)
