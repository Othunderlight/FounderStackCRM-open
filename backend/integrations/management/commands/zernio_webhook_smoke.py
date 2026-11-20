"""Send a signed Zernio webhook to the local receiver to verify the wiring.

Usage:
    python manage.py zernio_webhook_smoke
    python manage.py zernio_webhook_smoke --url https://<tunnel>/api/integrations/zernio/webhook/
    python manage.py zernio_webhook_smoke --replay
"""

from __future__ import annotations

import hashlib
import hmac
import json
import urllib.error
import urllib.request
import uuid

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from integrations.models import ZernioAccount, ZernioProfile

DEFAULT_PATH = "/api/integrations/zernio/webhook/"


class Command(BaseCommand):
    help = "Send a signed Zernio webhook payload to verify the receiver."

    def add_arguments(self, parser):
        parser.add_argument(
            "--url",
            default=f"http://127.0.0.1:8000{DEFAULT_PATH}",
            help="Receiver URL. Defaults to the local dev server.",
        )
        parser.add_argument(
            "--event",
            default="message.received",
            help="Webhook event name. Defaults to message.received.",
        )
        parser.add_argument(
            "--profile-id",
            default=None,
            help="Remote Zernio profile id. Defaults to the first active profile.",
        )
        parser.add_argument(
            "--external-id",
            default=None,
            help="Profile externalId. Defaults to the profile's organization id.",
        )
        parser.add_argument(
            "--account-id",
            default=None,
            help="Remote Zernio account id. Defaults to the first active account.",
        )
        parser.add_argument(
            "--conversation-id",
            default=None,
            help="Platform conversation id. Defaults to a generated test id.",
        )
        parser.add_argument(
            "--replay",
            action="store_true",
            help="Send the same event twice to verify deduplication.",
        )
        parser.add_argument(
            "--cleanup",
            action="store_true",
            help="Delete the smoke conversation and event rows after sending.",
        )

    def handle(self, *args, **options):
        secret = getattr(settings, "ZERNIO_WEBHOOK_SECRET", "")
        if not secret:
            raise CommandError(
                "ZERNIO_WEBHOOK_SECRET is empty. Set it in .env and reload the server."
            )

        profile = None
        if options["profile_id"]:
            profile = ZernioProfile.objects.filter(
                profile_id=options["profile_id"]
            ).first()
        if profile is None:
            profile = ZernioProfile.objects.filter(
                profile_id__isnull=False
            ).order_by("id").first()

        account = None
        if options["account_id"]:
            account = ZernioAccount.objects.filter(
                account_id=options["account_id"]
            ).first()
        if account is None and profile is not None:
            account = ZernioAccount.objects.filter(
                profile=profile, is_active=True
            ).order_by("id").first()

        profile_id = options["profile_id"] or (
            profile.profile_id if profile else "test-profile"
        )
        external_id = options["external_id"] or (
            str(profile.organization_id) if profile else "test-organization"
        )
        account_id = options["account_id"] or (
            account.account_id if account else "test-account"
        )
        platform = account.platform if account else "instagram"
        conversation_id = options["conversation_id"] or f"smoke-{uuid.uuid4().hex[:12]}"

        event_id = f"smoke-{uuid.uuid4()}"
        payload = {
            "id": event_id,
            "event": options["event"],
            "timestamp": timezone.now().isoformat(),
            "profiles": [{"id": profile_id, "externalId": external_id}],
            "account": {
                "accountId": account_id,
                "id": account_id,
                "platform": platform,
            },
            "conversation": {
                "id": conversation_id,
                "platformConversationId": conversation_id,
                "participantId": conversation_id,
                "participantName": "Smoke Test",
                "status": "active",
            },
            "message": {
                "id": f"smoke-{uuid.uuid4().hex[:12]}",
                "conversationId": conversation_id,
                "platform": platform,
                "direction": "incoming",
                "text": f"Smoke test {timezone.now().isoformat()}",
                "sender": {
                    "id": conversation_id,
                    "name": "Smoke Test",
                },
            },
        }

        self.stdout.write(f"Event id: {event_id}")
        self.stdout.write(f"URL: {options['url']}")
        self._send(options["url"], secret, payload, label="delivery")
        if options["replay"]:
            self._send(options["url"], secret, payload, label="replay")
        if options["cleanup"]:
            self._cleanup(event_id, conversation_id)

    def _cleanup(self, event_id, conversation_id):
        from integrations.models import ZernioConversation, ZernioMessage, ZernioWebhookEvent

        ZernioMessage.objects.filter(conversation__conversation_id=conversation_id).delete()
        ZernioConversation.objects.filter(conversation_id=conversation_id).delete()
        ZernioWebhookEvent.objects.filter(event_id=event_id).delete()
        self.stdout.write(self.style.SUCCESS("cleanup: removed smoke conversation and event"))

    def _send(self, url, secret, payload, *, label):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        signature = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
        request = urllib.request.Request(
            url,
            data=body,
            method="POST",
            headers={
                "Content-Type": "application/json",
                "X-Zernio-Signature": signature,
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=20) as response:
                text = response.read().decode("utf-8", "replace")
                self.stdout.write(
                    self.style.SUCCESS(f"{label}: HTTP {response.status} {text}")
                )
        except urllib.error.HTTPError as exc:
            text = exc.read().decode("utf-8", "replace")
            self.stdout.write(
                self.style.ERROR(f"{label}: HTTP {exc.code} {text}")
            )
        except urllib.error.URLError as exc:
            raise CommandError(f"{label}: could not reach {url}: {exc.reason}")
