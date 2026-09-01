from django.test import TestCase
from django.contrib.auth import get_user_model
from django.apps import apps
from .models import Onboarding, Organization

User = get_user_model()

class OnboardingSignalTest(TestCase):
    def setUp(self):
        # Create Admin Organization
        self.admin_org = Organization.objects.create(name="Admin Org")
        
        # Create Admin User
        self.admin_user = User.objects.create_user(
            username="admin",
            password="password",
            email="admin@example.com",
            is_staff=True,
            organization=self.admin_org
        )
        
        # Create Standard User (Lead)
        self.user = User.objects.create_user(
            username="newuser",
            password="password",
            email="newuser@example.com"
        )

        def test_create_lead_signal(self):

            # Create User Organization

            user_org = Organization.objects.create(name="User Org")

            self.user.organization = user_org

            self.user.save()

    

            # Create Onboarding record

            onboarding = Onboarding.objects.create(

                user=self.user,

                organization=user_org,

                whatsapp_number="+1234567890",

                linkedin_url="https://linkedin.com/in/newuser",

                company_name="New Startup",

                is_completed=False

            )

            

            # Verify no Person exists yet

            Person = apps.get_model('app', 'Person')

            self.assertEqual(Person.objects.count(), 0)

            

            # Trigger Signal

            onboarding.is_completed = True

            onboarding.save()

            

            # 1. Verify Lead created in ADMIN CRM

            admin_person = Person.objects.get(organization=self.admin_org, email="newuser@example.com")

            self.assertEqual(admin_person.name, "newuser")

            

            # 2. Verify Placeholder created in USER CRM

            user_person = Person.objects.get(organization=user_org, email="omar@founderstack.cloud")

            self.assertEqual(user_person.name, "Omar Gatara")

            

            Company = apps.get_model('app', 'Company')

            user_company = Company.objects.get(organization=user_org, name="Founder Stack")

            self.assertEqual(user_person.company, user_company)

    
        
        
from rest_framework import status
from rest_framework.test import APITestCase
from django.urls import reverse

class StaffCheckTest(APITestCase):
    def setUp(self):
        self.staff_user = User.objects.create_user(
            username='staffuser_test',
            password='password',
            is_staff=True
        )
        self.regular_user = User.objects.create_user(
            username='regularuser_test',
            password='password',
            is_staff=False
        )
        self.url = reverse('check-staff')

    def test_staff_user_check(self):
        self.client.force_authenticate(user=self.staff_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['is_staff'])

    def test_regular_user_check(self):
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['is_staff'])

    def test_unauthenticated_check(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
