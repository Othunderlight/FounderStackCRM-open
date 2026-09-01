import traceback
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status, viewsets
from allauth.socialaccount.models import SocialAccount
from rest_framework_simplejwt.tokens import RefreshToken

from .api.serializers import UserSettingSerializer
from .models import UserSetting, UserPreference
from integrations.permissions import HasAPIKeyScope
from .permissions import HasOrgPermission

User = get_user_model()


class UserPreferenceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, HasAPIKeyScope, HasOrgPermission]
    serializer_class = UserSettingSerializer
    scope_resource = "userpreferences"
    permission_resource = "users"
    allow_without_org_permission = True

    def get_queryset(self):
        return UserSetting.objects.filter(user=self.request.user)

    @action(detail=False, methods=["get", "post", "patch"], url_path="my-preferences")
    def my_preferences(self, request):
        setting, _ = UserSetting.objects.get_or_create(user=request.user)

        if request.method == "GET":
            serializer = UserSettingSerializer(setting)
            return Response(serializer.data)

        data = request.data
        preferences = data.get("preferences")

        if isinstance(preferences, list):
            for pref in preferences:
                name = pref.get("name")
                value = pref.get("value")
                if name:
                    UserPreference.objects.update_or_create(
                        setting=setting, name=name, defaults={"value": str(value)}
                    )
        else:
            name = data.get("name")
            value = data.get("value")
            if name:
                UserPreference.objects.update_or_create(
                    setting=setting, name=name, defaults={"value": str(value)}
                )

        serializer = UserSettingSerializer(setting)
        return Response(serializer.data)


@api_view(['POST'])
@permission_classes([AllowAny])
def google_login(request):
    """
    Google OAuth2 login endpoint.
    
    POST /api/auth/google/
    {
        "access_token": "google_access_token"
    }
    
    Returns JWT tokens (access and refresh) like regular login.
    If user is not found, returns an error (no auto-signup).
    """
    try:
        access_token = request.data.get('access_token')
        
        if not access_token:
            return Response(
                {"detail": "No token provided"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        import requests as http_requests
        
        userinfo_response = http_requests.get(
            'https://www.googleapis.com/oauth2/v2/userinfo',
            headers={'Authorization': f'Bearer {access_token}'},
            timeout=10
        )
        
        if not userinfo_response.ok:
            return Response(
                {"detail": "Invalid or expired access token"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        userinfo = userinfo_response.json()
        email = userinfo.get('email')
        first_name = userinfo.get('given_name', '')
        last_name = userinfo.get('family_name', '')
        google_id = userinfo.get('id')
        verified = userinfo.get('verified_email', False)
        
        if not email:
            return Response(
                {"detail": "Unable to get email from Google."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(google_email=email)
            if first_name and not user.first_name:
                user.first_name = first_name
            if last_name and not user.last_name:
                user.last_name = last_name
            user.save()
        except User.DoesNotExist:
            try:
                user = User.objects.get(email=email)
                if first_name and not user.first_name:
                    user.first_name = first_name
                if last_name and not user.last_name:
                    user.last_name = last_name
                user.save()
            except User.DoesNotExist:
                return Response(
                    {"detail": "No account found with this email. Please create an account first."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        social_account, created = SocialAccount.objects.get_or_create(
            user=user,
            provider='google',
            defaults={
                'uid': google_id,
                'extra_data': userinfo
            }
        )
        if not created:
            social_account.extra_data = userinfo
            social_account.save()
        
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'pk': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
            }
        })
            
    except Exception as e:
        print(f"Google login error: {str(e)}")
        print(traceback.format_exc())
        return Response(
            {"detail": f"Authentication failed: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def link_google(request):
    """
    Link Google account to authenticated user.
    
    POST /api/auth/google/link/
    {
        "access_token": "google_access_token"
    }
    """
    try:
        access_token = request.data.get('access_token')
        
        if not access_token:
            return Response(
                {"detail": "No token provided"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        import requests as http_requests
        
        userinfo_response = http_requests.get(
            'https://www.googleapis.com/oauth2/v2/userinfo',
            headers={'Authorization': f'Bearer {access_token}'},
            timeout=10
        )
        
        if not userinfo_response.ok:
            return Response(
                {"detail": "Invalid or expired access token"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        userinfo = userinfo_response.json()
        google_email = userinfo.get('email')
        google_id = userinfo.get('id')
        
        if not google_email:
            return Response(
                {"detail": "Unable to get email from Google. Make sure you granted email permission."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user = request.user
        
        if user.google_email and user.google_email != google_email:
            return Response(
                {"detail": "You already have a Google account linked. Please disconnect it first."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        existing_linked = SocialAccount.objects.filter(
            provider='google',
            user=user
        ).exists()
        
        if existing_linked:
            return Response(
                {"detail": "You already have a Google account linked."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        other_user = User.objects.filter(email=google_email).exclude(id=user.id).first()
        if other_user:
            return Response(
                {"detail": "This Google email is already associated with another account."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        social_account, created = SocialAccount.objects.get_or_create(
            user=user,
            provider='google',
            defaults={
                'uid': google_id,
                'extra_data': userinfo
            }
        )
        
        if not created:
            return Response(
                {"detail": "This Google account is already linked to another user."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.google_email = google_email
        user.save(update_fields=['google_email'])
        
        return Response({
            "detail": "Google account linked successfully",
            "google_email": google_email
        })
            
    except Exception as e:
        print(f"Google link error: {str(e)}")
        print(traceback.format_exc())
        return Response(
            {"detail": f"Linking failed: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
