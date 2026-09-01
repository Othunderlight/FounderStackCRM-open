from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
from users.api.views import CustomPasswordChangeView
from users.views import google_login, link_google

from .views import health_check

from .views import health_check
from users.views import google_login, link_google
from users.api.views import CustomPasswordChangeView
from scheduler.views import scheduler_inngest_view_path

urlpatterns = [
    # Admin
    path("admin/", include("admin_honeypot.urls")),
    path("fdudminramo/", admin.site.urls),
    # Apps
    path("app/", include("app.urls")),
    path("users/", include("users.urls")),
    # API Auth
    path("api/auth/password/change/", CustomPasswordChangeView.as_view(), name="password_change"),
    path("api/auth/", include("dj_rest_auth.urls")),
    path("api/auth/registration/", include("dj_rest_auth.registration.urls")),
    path("api/auth/google/", google_login, name="google_login"),
    path("api/auth/google/link/", link_google, name="google_link"),
    path("accounts/", include("allauth.urls")),  # For social auth, etc.
    # API Schema
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/schema/swagger-ui/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path(
        "api/schema/redoc/",
        SpectacularRedocView.as_view(url_name="schema"),
        name="redoc",
    ),
    # Other
    path("is_healthy/", health_check, name="health_check"),
    path("api/integrations/", include("integrations.urls")),
    path("api/", include("api.urls")),
]

urlpatterns += [scheduler_inngest_view_path]

