from django.test import TestCase
from django.contrib.auth import get_user_model
from users.models import Organization, RoleTemplate, UserRoleAssignment
from integrations.models import APIKey, SystemAPIKeyPolicy, Webhook
from app.models import Person, Company, Task
from rest_framework.test import APIClient
from django.utils import timezone

User = get_user_model()

class FinalAPIKeySecurityTest(TestCase):
    def setUp(self):
        self.org = Organization.objects.create(name="Test Org")
        self.user = User.objects.create_user(username="testuser", password="password", organization=self.org)
        self.client = APIClient()
        
        # Create some data
        self.person = Person.objects.create(name="Ahmed Al-Farsi", organization=self.org, conversion_rate=10)
        self.person2 = Person.objects.create(name="John Doe", organization=self.org, conversion_rate=50)
        self.company = Company.objects.create(name="Quantum Capital", organization=self.org)
        
        # Create a standard API Key with specific scopes
        self.api_key_instance, self.raw_key = APIKey.create_key(
            user=self.user, 
            name="Test Key", 
            organization=self.org
        )
        self.api_key_instance.scopes = ['people:read', 'companies:read']
        self.api_key_instance.save()

    def set_auth(self, key=None):
        self.client.credentials(HTTP_AUTHORIZATION=f'Api-Key {key or self.raw_key}')

    def test_basic_scope_permission(self):
        """Verify that a key with people:read can access people but not tasks."""
        self.set_auth()
        
        # Allowed
        res = self.client.get('/api/people/')
        self.assertEqual(res.status_code, 200)
        
        # Denied (Task scope missing)
        res = self.client.get('/api/tasks/')
        self.assertEqual(res.status_code, 403)

    def test_search_only_with_filters(self):
        """Verify search:only allows filtered requests but blocks listing."""
        self.api_key_instance.scopes = ['people:read', 'search:only']
        self.api_key_instance.save()
        self.set_auth()
        
        # 1. Bare list should fail
        res = self.client.get('/api/people/')
        self.assertEqual(res.status_code, 403)
        
        # 2. List with search should pass
        res = self.client.get('/api/people/?search=Ahmed')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data['results']), 1)
        
        # 3. List with specific filter should pass
        res = self.client.get('/api/people/?name__icontains=John')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data['results']), 1)

    def test_fuzzy_filtering_and_case_insensitivity(self):
        """Verify that __icontains and global search are working."""
        self.set_auth()
        
        # Case insensitive partial match
        res = self.client.get('/api/people/?name__icontains=ahmed')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['results'][0]['name'], "Ahmed Al-Farsi")
        
        # Range filter
        res = self.client.get('/api/people/?conversion_rate__gt=40')
        self.assertEqual(len(res.data['results']), 1)
        self.assertEqual(res.data['results'][0]['name'], "John Doe")

    def test_system_policy_scope_forbidden(self):
        """Verify System Policy overrides user scopes by forbidding them."""
        SystemAPIKeyPolicy.objects.create(
            forbidden_scopes=['companies:read'],
            is_active=True
        )
        self.set_auth()
        
        # Should be denied even though the key HAS the scope
        res = self.client.get('/api/companies/')
        self.assertEqual(res.status_code, 403)

    def test_system_policy_rate_limit_ceiling(self):
        """Verify System Policy enforces a lower rate limit ceiling."""
        self.api_key_instance.rate_limit_per_minute = 100
        self.api_key_instance.save()
        
        # Super admin says NO, only 1 per minute for everyone
        SystemAPIKeyPolicy.objects.create(
            max_rate_limit=1,
            is_active=True
        )
        self.set_auth()
        
        # Request 1: OK
        self.assertEqual(self.client.get('/api/people/').status_code, 200)
        # Request 2: Throttled
        self.assertEqual(self.client.get('/api/people/').status_code, 429)

    def test_system_policy_force_search_only(self):
        """Verify System Policy can force search:only globally."""
        SystemAPIKeyPolicy.objects.create(
            force_search_only=True,
            is_active=True
        )
        self.set_auth()
        
        # Even though key DOES NOT have search:only, policy forces it
        res = self.client.get('/api/people/')
        self.assertEqual(res.status_code, 403)
        
        # Providing filter bypasses the forced restriction
        res = self.client.get('/api/people/?q=test')
        self.assertEqual(res.status_code, 200)

    def test_api_key_expiration(self):
        """Verify that expired keys are rejected."""
        self.api_key_instance.expires_at = timezone.now() - timezone.timedelta(days=1)
        self.api_key_instance.save()
        self.set_auth()
        
        res = self.client.get('/api/people/')
        self.assertEqual(res.status_code, 403)

    def test_dashboardconfig_scope_resource_is_respected(self):
        self.api_key_instance.scopes = ['dashboardconfig:write']
        self.api_key_instance.save()
        self.set_auth()

        res = self.client.post(
            '/api/dashboard-configs/by-chart/funnel-chart/',
            {'config': {'mode': 'compact'}},
            format='json',
        )
        self.assertEqual(res.status_code, 200)

    def test_files_scope_resource_is_respected(self):
        self.api_key_instance.scopes = ['files:read']
        self.api_key_instance.save()
        self.set_auth()

        res = self.client.get('/api/files/')
        self.assertEqual(res.status_code, 200)


class APIKeyManagementRBACPermissionTest(TestCase):
    def setUp(self):
        self.org = Organization.objects.create(name="RBAC Org")
        self.owner = User.objects.create_user(
            username="owner",
            password="password",
            email="owner@example.com",
            organization=self.org,
        )
        self.member = User.objects.create_user(
            username="member",
            password="password",
            email="member@example.com",
            organization=self.org,
        )
        self.client = APIClient()

    def test_member_cannot_list_but_can_create_api_keys(self):
        self.client.force_authenticate(user=self.member)

        list_response = self.client.get("/api/integrations/api-keys/")
        self.assertEqual(list_response.status_code, 403)

        create_response = self.client.post(
            "/api/integrations/api-keys/",
            {"name": "Member Key"},
            format="json",
        )
        self.assertEqual(create_response.status_code, 201)
        self.assertEqual(APIKey.objects.filter(organization=self.org, user=self.member).count(), 1)

    def test_owner_can_list_and_create_api_keys(self):
        self.client.force_authenticate(user=self.owner)

        list_response = self.client.get("/api/integrations/api-keys/")
        self.assertEqual(list_response.status_code, 200)

        create_response = self.client.post(
            "/api/integrations/api-keys/",
            {"name": "Owner Key"},
            format="json",
        )
        self.assertEqual(create_response.status_code, 201)
        self.assertEqual(APIKey.objects.filter(organization=self.org).count(), 1)


class WebhookRBACPermissionTest(TestCase):
    def setUp(self):
        self.org = Organization.objects.create(name="Webhook Org")
        self.owner = User.objects.create_user(
            username="owner",
            password="password",
            email="owner@example.com",
            organization=self.org,
        )
        self.member = User.objects.create_user(
            username="member",
            password="password",
            email="member@example.com",
            organization=self.org,
        )
        self.client = APIClient()

    def test_member_cannot_manage_webhooks(self):
        self.client.force_authenticate(user=self.member)
        response = self.client.post(
            "/api/integrations/webhooks/",
            {"url": "https://example.com/hook", "events": ["lead.created"]},
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_owner_can_manage_webhooks(self):
        self.client.force_authenticate(user=self.owner)
        create_response = self.client.post(
            "/api/integrations/webhooks/",
            {"url": "https://example.com/hook", "events": ["lead.created"]},
            format="json",
        )
        self.assertEqual(create_response.status_code, 201)
        self.assertEqual(Webhook.objects.filter(organization=self.org).count(), 1)


class AgentUseRBACPermissionTest(TestCase):
    def setUp(self):
        self.org = Organization.objects.create(name="Agent Org")
        self.member = User.objects.create_user(
            username="member",
            password="password",
            email="member@example.com",
            organization=self.org,
        )
        self.restricted_user = User.objects.create_user(
            username="restricted",
            password="password",
            email="restricted@example.com",
            organization=self.org,
        )
        restricted_role = RoleTemplate.objects.create(
            organization=self.org,
            name="No Agent Access",
            permissions=["people.read"],
            hidden_fields={},
        )
        UserRoleAssignment.objects.update_or_create(
            organization=self.org,
            user=self.restricted_user,
            defaults={"role": restricted_role},
        )
        self.client = APIClient()

    def test_default_member_can_use_agent_endpoints(self):
        self.client.force_authenticate(user=self.member)

        has_credential_response = self.client.get("/api/integrations/credentials/has-credential/")
        self.assertEqual(has_credential_response.status_code, 200)

        create_credential_response = self.client.post(
            "/api/integrations/credentials/",
            {"keys_data": [{"name": "telegram_bot_token", "value": "abc123"}]},
            format="json",
        )
        self.assertEqual(create_credential_response.status_code, 201)

        create_session_response = self.client.post(
            "/api/integrations/integration-sessions/",
            {"key": "telegram", "session": "session-1"},
            format="json",
        )
        self.assertEqual(create_session_response.status_code, 201)

    def test_user_without_agent_use_cannot_read_or_write_agent_endpoints(self):
        self.client.force_authenticate(user=self.restricted_user)

        has_credential_response = self.client.get("/api/integrations/credentials/has-credential/")
        self.assertEqual(has_credential_response.status_code, 403)

        create_credential_response = self.client.post(
            "/api/integrations/credentials/",
            {"keys_data": [{"name": "telegram_bot_token", "value": "abc123"}]},
            format="json",
        )
        self.assertEqual(create_credential_response.status_code, 403)

        list_sessions_response = self.client.get("/api/integrations/integration-sessions/")
        self.assertEqual(list_sessions_response.status_code, 403)

        create_session_response = self.client.post(
            "/api/integrations/integration-sessions/",
            {"key": "telegram", "session": "session-1"},
            format="json",
        )
        self.assertEqual(create_session_response.status_code, 403)
