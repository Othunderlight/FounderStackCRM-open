from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from app.models import CRMConfiguration, Company, Opportunity, Person
from dashboard.models import DashboardConfig, InteractionType
from users.models import Organization, RoleTemplate, UserRoleAssignment

User = get_user_model()


class RolePermissionTests(APITestCase):
    def setUp(self):
        self.org = Organization.objects.create(name="Acme")
        self.other_org = Organization.objects.create(name="Other Org")
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
        self.other_user = User.objects.create_user(
            username="other",
            password="password",
            email="other@example.com",
            organization=self.other_org,
        )
        self.company = Company.objects.create(
            organization=self.org,
            name="Acme Corp",
            owner=self.owner,
        )
        self.person = Person.objects.create(
            organization=self.org,
            name="Hidden Contact",
            email="contact@example.com",
            phone="+1234567",
            company=self.company,
            created_by=self.owner,
            owner=self.owner,
        )

    def test_org_users_requires_manage_users_permission(self):
        self.client.force_authenticate(user=self.member)
        response = self.client.get("/api/org-users/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(user=self.owner)
        response = self.client.get("/api/org-users/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_invitation_creation_requires_manage_users_permission(self):
        self.client.force_authenticate(user=self.member)
        response = self.client.post(
            "/api/invitations/",
            {"type": "TEAM", "email": "new@example.com"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_crm_configuration_update_requires_config_manage_permission(self):
        CRMConfiguration.objects.get_or_create(
            organization=self.org,
            defaults={"user": self.owner},
        )

        self.client.force_authenticate(user=self.member)
        read_response = self.client.get("/api/config/mine/")
        self.assertEqual(read_response.status_code, status.HTTP_200_OK)

        response = self.client.patch(
            "/api/config/mine/",
            {"lead_sources": [{"label": "Referral", "color": "blue"}]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(user=self.owner)
        response = self.client.patch(
            "/api/config/mine/",
            {"lead_sources": [{"label": "Referral", "color": "blue"}]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_hidden_fields_are_removed_from_person_responses(self):
        restricted_role = RoleTemplate.objects.create(
            organization=self.org,
            name="Restricted Member",
            permissions=["people.read"],
            hidden_fields={"person": ["email", "phone"]},
        )
        UserRoleAssignment.objects.update_or_create(
            organization=self.org,
            user=self.member,
            defaults={"role": restricted_role},
        )

        self.client.force_authenticate(user=self.member)
        response = self.client.get("/api/people/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        person = response.data["results"][0]
        self.assertNotIn("email", person)
        self.assertNotIn("phone", person)

    def test_hidden_fields_cannot_be_updated_by_restricted_role(self):
        restricted_role = RoleTemplate.objects.create(
            organization=self.org,
            name="Restricted Editor",
            permissions=["people.read", "people.write"],
            hidden_fields={"person": ["email", "phone"]},
        )
        UserRoleAssignment.objects.update_or_create(
            organization=self.org,
            user=self.member,
            defaults={"role": restricted_role},
        )

        self.client.force_authenticate(user=self.member)
        response = self.client.patch(
            f"/api/people/{self.person.id}/",
            {"email": "new@example.com"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.person.refresh_from_db()
        self.assertEqual(self.person.email, "contact@example.com")

    def test_hidden_opportunity_fields_are_removed_from_responses(self):
        opportunity = Opportunity.objects.create(
            organization=self.org,
            name="Hidden Deal",
            value="10000.00",
            deal_stage="Proposal",
            company=self.company,
            primary_contact=self.person,
            created_by=self.owner,
            owner=self.owner,
        )
        restricted_role = RoleTemplate.objects.create(
            organization=self.org,
            name="Opportunity Restricted",
            permissions=["opportunities.read"],
            hidden_fields={"opportunity": ["value", "owner", "primary_contact"]},
        )
        UserRoleAssignment.objects.update_or_create(
            organization=self.org,
            user=self.member,
            defaults={"role": restricted_role},
        )

        self.client.force_authenticate(user=self.member)
        response = self.client.get(f"/api/opportunities/{opportunity.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn("value", response.data)
        self.assertNotIn("owner", response.data)
        self.assertNotIn("owner_name", response.data)
        self.assertNotIn("owner_details", response.data)
        self.assertNotIn("primary_contact", response.data)
        self.assertNotIn("primary_contact_name", response.data)

    def test_role_assignment_endpoint_updates_member_role(self):
        manager_role = RoleTemplate.objects.get(
            organization=self.org,
            system_key=RoleTemplate.SYSTEM_MANAGER,
        )

        self.client.force_authenticate(user=self.owner)
        response = self.client.post(
            "/api/roles/assign/",
            {"user_id": str(self.member.id), "role_id": str(manager_role.id)},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        assignment = UserRoleAssignment.objects.get(
            organization=self.org,
            user=self.member,
        )
        self.assertEqual(assignment.role_id, manager_role.id)

    def test_interaction_types_are_readable_but_require_config_manage_to_write(self):
        InteractionType.objects.create(
            organization=self.org,
            name="Call",
        )

        self.client.force_authenticate(user=self.member)
        read_response = self.client.get("/api/interaction-types/")
        self.assertEqual(read_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(read_response.data["results"]), 1)

        create_response = self.client.post(
            "/api/interaction-types/",
            {"name": "Meeting"},
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(user=self.owner)
        owner_create_response = self.client.post(
            "/api/interaction-types/",
            {"name": "Meeting"},
            format="json",
        )
        self.assertEqual(owner_create_response.status_code, status.HTTP_201_CREATED)

    def test_dashboard_config_by_chart_respects_read_and_write_permissions(self):
        restricted_role = RoleTemplate.objects.create(
            organization=self.org,
            name="Dashboard Reader",
            permissions=["dashboard.read"],
            hidden_fields={},
        )
        UserRoleAssignment.objects.update_or_create(
            organization=self.org,
            user=self.member,
            defaults={"role": restricted_role},
        )
        DashboardConfig.objects.create(
            organization=self.org,
            user=self.member,
            chart_id="funnel-chart",
            config={"mode": "compact"},
        )

        self.client.force_authenticate(user=self.member)
        read_response = self.client.get("/api/dashboard-configs/by-chart/funnel-chart/")
        self.assertEqual(read_response.status_code, status.HTTP_200_OK)
        self.assertEqual(read_response.data["config"], {"mode": "compact"})

        write_response = self.client.post(
            "/api/dashboard-configs/by-chart/funnel-chart/",
            {"config": {"mode": "expanded"}},
            format="json",
        )
        self.assertEqual(write_response.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(user=self.owner)
        owner_write_response = self.client.post(
            "/api/dashboard-configs/by-chart/funnel-chart/",
            {"config": {"mode": "expanded"}},
            format="json",
        )
        self.assertEqual(owner_write_response.status_code, status.HTTP_200_OK)

    def test_opportunity_create_supports_new_fields(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.post(
            "/api/opportunities/",
            {
                "name": "Expansion Deal",
                "value": "25000.00",
                "deal_stage": "Proposal",
                "expected_close_date": "2026-05-15",
                "probability": 65,
                "company": str(self.company.id),
                "primary_contact": str(self.person.id),
                "owner": str(self.member.id),
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        opportunity = Opportunity.objects.get(id=response.data["id"])
        self.assertEqual(opportunity.deal_stage, "Proposal")
        self.assertEqual(opportunity.owner_id, self.member.id)
        self.assertEqual(opportunity.primary_contact_id, self.person.id)
        self.assertEqual(str(opportunity.expected_close_date), "2026-05-15")

    def test_opportunity_owner_must_be_in_same_org(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.post(
            "/api/opportunities/",
            {
                "name": "Invalid Owner Deal",
                "value": "1000.00",
                "deal_stage": "Screening",
                "company": str(self.company.id),
                "owner": str(self.other_user.id),
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("owner", response.data)

    def test_config_can_rename_opportunity_stage_without_touching_people_stage(self):
        config, _ = CRMConfiguration.objects.get_or_create(
            organization=self.org,
            defaults={"user": self.owner},
        )
        opportunity = Opportunity.objects.create(
            organization=self.org,
            name="Renewal",
            value="5000.00",
            deal_stage="Negotiation",
            company=self.company,
            primary_contact=self.person,
            created_by=self.owner,
            owner=self.owner,
        )
        self.person.stage = "Negotiation"
        self.person.save(update_fields=["stage"])

        self.client.force_authenticate(user=self.owner)
        response = self.client.patch(
            "/api/config/mine/",
            {
                "rename_opportunity_stage": {
                    "old": "Negotiation",
                    "new": "Proposal",
                }
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        config.refresh_from_db()
        opportunity.refresh_from_db()
        self.person.refresh_from_db()
        self.assertEqual(opportunity.deal_stage, "Proposal")
        self.assertEqual(self.person.stage, "Negotiation")
