from django.db.models.signals import post_save
from django.dispatch import receiver
from django.apps import apps
from django.contrib.auth import get_user_model
from .models import Onboarding, Organization
from .rbac import ensure_org_roles, ensure_user_role_assignment

User = get_user_model()


@receiver(post_save, sender=Organization)
def ensure_roles_for_organization(sender, instance, created, **kwargs):
    if created:
        ensure_org_roles(instance)


@receiver(post_save, sender=User)
def ensure_role_for_user(sender, instance, created, **kwargs):
    if instance.organization_id:
        ensure_user_role_assignment(instance)

@receiver(post_save, sender=Onboarding)
def create_lead_from_onboarding(sender, instance, created, **kwargs):
    """
    Creates a new Lead (Person) in the Admin's CRM when a user completes onboarding.
    """
    if instance.is_completed:
        # Avoid circular imports by loading models dynamically
        Person = apps.get_model('app', 'Person')
        Company = apps.get_model('app', 'Company')
        Note = apps.get_model('app', 'Note')
        
        # Get the admin user's organization
        # We look for a staff user who has an organization assigned
        admin_user = User.objects.filter(is_staff=True, organization__isnull=False).first()
        
        if not admin_user:
            return

        admin_org = admin_user.organization
        user_email = instance.user.email

        # Check if Lead (Person) already exists to avoid duplicates
        if Person.objects.filter(organization=admin_org, email=user_email).exists():
            return

        # Handle Company creation if provided
        company = None
        if instance.company_name:
            # Check if company exists or create it
            company, _ = Company.objects.get_or_create(
                organization=admin_org,
                name=instance.company_name,
                defaults={
                    'domain': instance.company_website,
                    'owner': admin_user
                }
            )

        # Create the Person (Lead)
        person = Person.objects.create(
            organization=admin_org,
            name=instance.user.get_full_name() or instance.user.username,
            email=user_email,
            phone=instance.whatsapp_number,
            linkedin=instance.linkedin_url,
            job_title="Founder", # Defaulting to Founder
            company=company,
            stage="Qualified",
            lead_type="Warm Lead",
            created_by=admin_user
        )
        
        # Create a Note with extra onboarding details
        details_parts = []
        if instance.building_now:
            details_parts.append(f"Building: {instance.building_now}")
        if instance.clients_count:
            details_parts.append(f"Clients: {instance.clients_count}")
        if instance.referral:
            details_parts.append(f"Referral: {instance.referral}")
            
        if details_parts:
            Note.objects.create(
                organization=admin_org,
                title="Onboarding Info",
                content="\n".join(details_parts),
                related_person=person,
                created_by=admin_user
            )

        # PART 2: Populate the NEW USER'S CRM with a placeholder (Omar Gatara)
        user_org = instance.organization or instance.user.organization
        if user_org:
            # Create Founder Stack company in user's CRM
            fs_company, _ = Company.objects.get_or_create(
                organization=user_org,
                name="Founder Stack",
                defaults={
                    'domain': "founderstack.cloud",
                    'linkedin': "https://www.linkedin.com/company/the-solo-founder-stack/",
                    'owner': instance.user
                }
            )

            # Create Omar as a Person in user's CRM
            Person.objects.get_or_create(
                organization=user_org,
                email="omar@founderstack.cloud",
                defaults={
                    'name': "Omar Gatara",
                    'phone': "+963939676801",
                    'linkedin': "https://linkedin.com/in/omar-gatara",
                    'job_title': "Founder",
                    'company': fs_company,
                    'stage': "Qualified",
                    'lead_type': "Warm Lead",
                    'created_by': instance.user
                }
            )
