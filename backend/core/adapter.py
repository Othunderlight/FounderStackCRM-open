import requests
from allauth.account.adapter import DefaultAccountAdapter
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from allauth.core.exceptions import ImmediateHttpResponse
from django.conf import settings
from django.contrib import messages
from django.shortcuts import redirect
from django.contrib.auth import get_user_model
from django.http import HttpResponse

User = get_user_model()


class CustomEmailAdapter(DefaultAccountAdapter):
    def get_email_verification_redirect_url(self, email_address):
        """
        Forces redirect to the frontend success page after email confirmation,
        bypassing any default Django login redirects.
        Uses the hash router format /#/ as requested.
        """
        frontend_url = getattr(settings, "FRONTEND_URL").rstrip("/")
        return f"{frontend_url}/#/verification-success"

        def send_mail(self, template_prefix, email, context):
            """
            Overrides the default send_mail to offload email sending to FastAPI/Inngest.
            """
            msg = self.render_mail(template_prefix, email, context)
            
            # Prefer HTML body if available in msg.alternatives
            html_body = None
            if hasattr(msg, 'alternatives') and msg.alternatives:
                for alt in msg.alternatives:
                    if alt[1] == 'text/html':
                        html_body = alt[0]
                        break
    
            # Prepare payload for FastAPI
            payload = {
                "to": email,
                "subject": msg.subject,
                "body": html_body if html_body else msg.body,
            }
            fastapi_url = getattr(settings, "FASTAPI_URL")
        trigger_url = f"{fastapi_url}/trigger/send-email"

        try:
            # We don't wait for a long timeout, but we want to ensure it's queued
            response = requests.post(trigger_url, json=payload, timeout=5)
            response.raise_for_status()
        except Exception as e:
            # Fallback to local sending if FastAPI is down, or just log the error
            # In a production environment, you might want a more robust fallback
            print(f"Error offloading email to FastAPI: {e}")
            # If you want to fallback to Django's default behavior:
            # super().send_mail(template_prefix, email, context)
            # For now, let's just log it.
            # Note: If this fails, the user won't get the verification email.


class CustomSocialAccountAdapter(DefaultSocialAccountAdapter):
    def pre_social_login(self, request, sociallogin):
        """
        Prevent automatic user creation via Google login.
        Only allow linking Google account to existing users.
        """
        if sociallogin.account.provider != 'google':
            return

        google_email = sociallogin.account.extra_data.get('email')
        if not google_email:
            messages.error(request, 'Unable to retrieve email from Google account.')
            raise ImmediateHttpResponse(redirect('account_settings'))

        if request.user.is_authenticated:
            if request.user.google_email:
                messages.error(request, 'You already have a Google account linked. Please disconnect it first.')
                raise ImmediateHttpResponse(redirect('account_settings'))
            
            request.user.google_email = google_email
            request.user.save()
            
            messages.success(request, f'Google account {google_email} has been successfully linked to your account.')
            raise ImmediateHttpResponse(redirect('account_settings'))
        
        messages.error(
            request,
            'No account found linked to this Google email. Please login with your email and password first, then link your Google account in settings.'
        )
        raise ImmediateHttpResponse(redirect('login'))

    def save_user(self, request, sociallogin, form=None):
        """
        Prevent automatic user creation via Google login.
        """
        if sociallogin.account.provider == 'google':
            messages.error(
                request,
                'Account creation via Google is not allowed. Please create an account first.'
            )
            raise ImmediateHttpResponse(redirect('login'))
        
        return super().save_user(request, sociallogin, form)
