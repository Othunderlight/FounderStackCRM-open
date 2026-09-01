import json
import pytz
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model

from integrations.models import CronJob, APIKey
from users.models import Organization, UserPreference, UserSetting
from scheduler.functions import execute_cron_job

User = get_user_model()

class CronJobTest(TestCase):
    def setUp(self):
        self.org = Organization.objects.create(name="Test Org")
        self.user = User.objects.create_user(username="testuser", password="password", organization=self.org)
        
        # Create User Preferences
        self.setting, _ = UserSetting.objects.get_or_create(user=self.user)
        self.tz_pref = UserPreference.objects.create(setting=self.setting, name="TIMEZONE_IANA", value="America/New_York")

        # Create SYSTEM_CRON_API_KEY
        APIKey.objects.create(
            user=self.user,
            name="SYSTEM_CRON_API_KEY",
            organization=self.org,
            hashed_key="dummy_hash"
        )

        # Mock send_sync globally for all tests in this class to avoid real network calls
        self.patcher = patch("scheduler.client.inngest_client.send_sync")
        self.mock_send_sync = self.patcher.start()

        # Mock settings.SYSTEM_CRON_API_KEY
        self.settings_patcher = patch("django.conf.settings.SYSTEM_CRON_API_KEY", "test_raw_key")
        self.settings_patcher.start()

    def tearDown(self):
        self.patcher.stop()
        self.settings_patcher.stop()

    def test_signal_triggers_inngest_event(self):
        """Verify that creating a CronJob triggers an Inngest event."""
        cron = CronJob.objects.create(
            organization=self.org,
            user=self.user,
            name="Daily Report",
            schedule={"expr": "0 9 * * *"}, # 9 AM
            repeat={"times": None, "completed": 0}
        )
        
        self.mock_send_sync.assert_called_once()
        event = self.mock_send_sync.call_args[0][0]
        self.assertEqual(event.name, "cron/job.execute")
        self.assertEqual(event.data["job_id"], str(cron.id))

    def test_resume_triggers_inngest_event(self):
        """Verify that resuming a CronJob triggers an Inngest event."""
        cron = CronJob.objects.create(
            organization=self.org,
            user=self.user,
            name="Daily Report",
            schedule={"expr": "0 9 * * *"},
            enabled=False,
            state="paused"
        )
        self.mock_send_sync.reset_mock()
        
        # Resume
        cron.enabled = True
        cron.state = "scheduled"
        cron.next_run_at = None
        cron.save()
        
        self.mock_send_sync.assert_called_once()

    @patch("httpx.Client.post")
    def test_execute_cron_job_logic(self, mock_post):
        """Test the internal logic of the execute_cron_job function."""
        # Mock successful response
        mock_post.return_value = MagicMock(status_code=200, json=lambda: {"status": "success"})
        
        cron = CronJob.objects.create(
            organization=self.org,
            user=self.user,
            name="Timed Job",
            schedule={"expr": "0 17 * * *"}, # 5 PM
            repeat={"times": 1, "completed": 0}
        )
        
        # Mock Inngest Context and Steps
        ctx = MagicMock()
        ctx.event.data = {"job_id": str(cron.id)}
        
        # Mock step.run to just execute the lambda/function passed to it
        ctx.step.run.side_effect = lambda id, fn: fn()
        # Mock step.sleep_until and step.send_event
        ctx.step.sleep_until = MagicMock()
        ctx.step.send_event = MagicMock()

        # Use _handler to access the original function
        result = execute_cron_job._handler(ctx)
        
        self.assertEqual(result["status"], "success")
        
        # Refresh cron from DB
        cron.refresh_from_db()
        self.assertEqual(cron.repeat["completed"], 1)
        self.assertEqual(cron.state, "completed")
        self.assertIsNotNone(cron.last_run_at)
        
        # Verify it calculated next_run_at using NY timezone (from preferences)
        # 5 PM in NY
        ny_tz = pytz.timezone("America/New_York")
        # Django stores in UTC, so we convert back to NY to check the hour
        localized_next_run = cron.next_run_at.astimezone(ny_tz)
        self.assertEqual(localized_next_run.hour, 17)
        self.assertEqual(localized_next_run.minute, 0)

    def test_execute_cron_job_skips_if_disabled(self):
        """Verify it skips execution if job is disabled during wait."""
        cron = CronJob.objects.create(
            organization=self.org,
            user=self.user,
            name="Disabled Job",
            schedule={"expr": "* * * * *"},
            enabled=False
        )
        
        ctx = MagicMock()
        ctx.event.data = {"job_id": str(cron.id)}
        ctx.step.run.side_effect = lambda id, fn: fn()
        
        result = execute_cron_job._handler(ctx)
        self.assertEqual(result["status"], "skipped")
        self.assertEqual(result["reason"], "disabled")

    @patch("httpx.Client.post")
    def test_execute_cron_job_handles_repeat_limit(self, mock_post):
        """Verify it stops after reaching repeat limits."""
        # Mock successful response
        mock_post.return_value = MagicMock(status_code=200, json=lambda: {"status": "success"})

        cron = CronJob.objects.create(
            organization=self.org,
            user=self.user,
            name="Limited Job",
            schedule={"expr": "* * * * *"},
            repeat={"times": 2, "completed": 1}
        )
        
        ctx = MagicMock()
        ctx.event.data = {"job_id": str(cron.id)}
        ctx.step.run.side_effect = lambda id, fn: fn()
        
        # Run 2nd time
        result = execute_cron_job._handler(ctx)
        self.assertEqual(result["status"], "success")
        
        cron.refresh_from_db()
        self.assertEqual(cron.state, "completed")
        self.assertEqual(cron.repeat["completed"], 2)
        
        # Run 3rd time (should skip)
        result = execute_cron_job._handler(ctx)
        self.assertEqual(result["status"], "skipped")
        self.assertEqual(result["reason"], "completed")

    @patch("httpx.Client.post")
    def test_execute_cron_job_pauses_on_failure(self, mock_post):
        """Verify it pauses the job if the webhook fails and there are more runs."""
        # Mock failed response
        mock_post.return_value = MagicMock(status_code=500, text="Internal Server Error")

        cron = CronJob.objects.create(
            organization=self.org,
            user=self.user,
            name="Failing Job",
            schedule={"expr": "* * * * *"},
            repeat={"times": None, "completed": 0} # Infinite
        )
        
        ctx = MagicMock()
        ctx.event.data = {"job_id": str(cron.id)}
        ctx.step.run.side_effect = lambda id, fn: fn()
        
        result = execute_cron_job._handler(ctx)
        self.assertEqual(result["status"], "failed")
        
        cron.refresh_from_db()
        self.assertFalse(cron.enabled)
        self.assertEqual(cron.state, "paused")
        self.assertEqual(cron.paused_reason, "an error happened, see the last_error for detials")
        self.assertIn("AI Service returned 500", cron.last_error)
