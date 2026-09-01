from django.urls import include, path
from rest_framework.routers import DefaultRouter
from users.api.views import (
    InvitationViewSet,
    RoleTemplateViewSet,
    VerificationViewSet,
    check_staff,
)
from users.views import UserPreferenceViewSet

from .views import (
    ActivityLogViewSet,
    AppUpdateViewSet,
    CompanyViewSet,
    CRMConfigurationViewSet,
    CustomViewViewSet,
    DashboardConfigViewSet,
    FileViewSet,
    InteractionLogViewSet,
    InteractionTypeViewSet,
    NoteViewSet,
    OnboardingViewSet,
    OpportunityViewSet,
    PersonViewSet,
    ReportViewSet,
    SyncLogViewSet,
    SyncRecordViewSet,
    TaskViewSet,
    connection_test,
    global_search,
    org_users,
    toggle_user_active,
)

router = DefaultRouter()
router.register(r"config", CRMConfigurationViewSet, basename="config")
router.register(r"companies", CompanyViewSet, basename="company")
router.register(r"people", PersonViewSet, basename="person")
router.register(r"opportunities", OpportunityViewSet, basename="opportunity")
router.register(r"tasks", TaskViewSet, basename="task")
router.register(r"notes", NoteViewSet, basename="note")
router.register(r"activities", ActivityLogViewSet, basename="activity")
router.register(r"views", CustomViewViewSet, basename="view")
router.register(r"reports", ReportViewSet, basename="report")
router.register(r"files", FileViewSet, basename="file")
router.register(r"onboarding", OnboardingViewSet, basename="onboarding")
router.register(r"app-updates", AppUpdateViewSet, basename="app-update")
router.register(r"invitations", InvitationViewSet, basename="invitation")
router.register(r"roles", RoleTemplateViewSet, basename="role")
router.register(r"verification", VerificationViewSet, basename="verification")
router.register(r"user-preferences", UserPreferenceViewSet, basename="user-preference")

router.register(r"sync-records", SyncRecordViewSet, basename="sync-record")
router.register(r"sync-logs", SyncLogViewSet, basename="sync-log")
router.register(
    r"interaction-types", InteractionTypeViewSet, basename="interaction-type"
)
router.register(r"interactions", InteractionLogViewSet, basename="interaction")
router.register(
    r"dashboard-configs", DashboardConfigViewSet, basename="dashboard-config"
)

urlpatterns = [
    path("connection-test/", connection_test, name="connection-test"),
    path("org-users/", org_users, name="org-users"),
    path(
        "org-users/<int:pk>/toggle-active/",
        toggle_user_active,
        name="toggle-user-active",
    ),
    path("search/", global_search, name="global-search"),
    path("users/is-staff/", check_staff, name="check-staff"),
    path("", include(router.urls)),
]
