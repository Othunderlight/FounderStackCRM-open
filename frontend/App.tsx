import React, { Suspense, lazy, useEffect } from "react";
import {
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import Sidebar from "./components/Sidebar";
import { MobileAppBar } from "./components/mobile/MobileAppBar";
import { MobileNavigationBar } from "./components/mobile/MobileNavigationBar";
import { MobileNavigationDrawer } from "./components/mobile/MobileNavigationDrawer";
import { GlobalConfirmDialog } from "./components/GlobalConfirmDialog";
import { VerificationBanner } from "./components/VerificationBanner";
import { TelegramBanner } from "./components/TelegramBanner";
import { Toaster } from "sonner";
import { useStore } from "./store";
import { useState } from "react";
import { cn } from "./lib/utils";
import posthog from "posthog-js";
import { TranslationProvider } from "./src/i18n/index";

const Home = lazy(() => import("./components/Home"));
const DataTable = lazy(() => import("./components/DataTable"));
const KanbanBoard = lazy(() => import("./components/KanbanBoard"));
const TaskKanban = lazy(() => import("./components/TaskKanban"));
const ContextDrawer = lazy(() => import("./components/ContextDrawer"));
const SettingsLayout = lazy(() => import("./components/Settings"));
const RecordPage = lazy(() => import("./components/RecordPage"));
const SelectionBar = lazy(() => import("./components/SelectionBar"));
const ReportsPage = lazy(() => import("./components/ReportsPage"));
const SharedReportView = lazy(() => import("./components/SharedReportView"));
const CommandMenu = lazy(() => import("./components/CommandMenu"));
const MobileSearch = lazy(() => import("./components/mobile/MobileSearch"));
const NotFoundPage = lazy(async () => {
  const module = await import("./components/not-found");
  return { default: module.NotFoundPage };
});
const InactiveAccountPage = lazy(async () => {
  const module = await import("./components/InactiveAccountPage");
  return { default: module.InactiveAccountPage };
});
const MustVerifyEmailModal = lazy(
  () => import("./components/MustVerifyEmailModal"),
);
const ProModal = lazy(() => import("./components/ProModal"));
const NoOrganizationModal = lazy(
  () => import("./components/NoOrganizationModal"),
);
const NavbarTour = lazy(() => import("./components/NavbarTour"));
const Login02 = lazy(() => import("./src/components/login-02"));
const Signup = lazy(() => import("./src/components/signup"));
const PreSalesDashboard = lazy(() => import("./components/PreSalesDashboard"));
const OnboardingPage = lazy(() => import("./components/OnboardingPage"));
const InviteLandingPage = lazy(async () => {
  const module = await import("./components/InviteLandingPage");
  return { default: module.InviteLandingPage };
});
const VerificationSuccess = lazy(async () => {
  const module = await import("./components/VerificationSuccess");
  return { default: module.VerificationSuccess };
});
const AiAgentPage = lazy(() => import("./components/AiAgentPage"));
const BuildingInPublic = lazy(
  () => import("./src/components/BuildingInPublic"),
);
const McpConnect = lazy(() => import("./src/components/McpConnect"));

const EmptyState = ({ title }: { title: string }) => (
  <div className="flex-1 flex flex-col items-center justify-center text-textSecondary h-full p-4 text-center">
    <div className="w-16 h-16 bg-[#2f2f2f] rounded-full flex items-center justify-center mb-4">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    </div>
    <h3 className="text-lg font-medium text-textPrimary mb-1">{title}</h3>
    <p className="text-sm mb-4">Coming soon, vote at it</p>
    <a
      href="https://roadmap.founderstack.cloud"
      target="_blank"
      rel="noopener noreferrer"
      className="text-accent hover:underline text-sm font-medium"
    >
      Tell us why it's important for you
    </a>
  </div>
);

const RouteFallback = () => (
  <div className="flex flex-1 items-center justify-center bg-background text-sm text-textSecondary">
    Loading...
  </div>
);

const App = () => {
  const {
    people,
    companies,
    tasks,
    opportunities,
    notes,
    activities,
    clearSelection,
    fetchNotes,
    fetchPeople,
    fetchCompanies,
    fetchTasks,
    fetchOpportunities,
    fetchActivities,
    fetchReports,
    accessToken,
    user,
    initViews,
    fetchCurrentUser,
    fetchMyAccess,
    setProModalOpen,
    theme,
    language,
  } = useStore();
  const location = useLocation();
  const navigate = useNavigate();

  // Handle URL triggers (e.g., ?welcome=true)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("welcome") === "true") {
      setProModalOpen(true);

      // Clean up the parameter
      params.delete("welcome");
      const newSearch = params.toString();
      navigate(
        {
          pathname: location.pathname,
          search: newSearch ? `?${newSearch}` : "",
        },
        { replace: true },
      );
    }
  }, [location.search, setProModalOpen, navigate]);

  useEffect(() => {
    initViews();
    if (accessToken) {
      fetchCurrentUser();
      fetchMyAccess();
    }
  }, [initViews, accessToken, fetchCurrentUser, fetchMyAccess]);

  useEffect(() => {
    if (accessToken) {
      fetchNotes();
      fetchPeople();
      fetchCompanies();
      fetchOpportunities();
      fetchActivities();
      fetchReports();
    }
  }, [
    accessToken,
    fetchNotes,
    fetchPeople,
    fetchCompanies,
    fetchTasks,
    fetchOpportunities,
    fetchActivities,
    fetchReports,
  ]);

  useEffect(() => {
    document.body.classList.remove("light", "dark");
    document.body.classList.add(theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    document.body.classList.toggle("rtl", language === "ar");
  }, [language]);

  const assignedTasks = tasks.filter(
    (t) =>
      (user?.username && t.assignee === user.username) || t.assignee === "Me",
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        useStore.getState().toggleSidebar();
      }

      // Shift + P: All People
      if (e.shiftKey && e.key === "P") {
        e.preventDefault();
        navigate("/people/all");
      }
      // Shift + T: All Tasks
      if (e.shiftKey && e.key === "T") {
        e.preventDefault();
        navigate("/tasks/all");
      }
      // Shift + L: All Logs
      if (e.shiftKey && e.key === "L") {
        e.preventDefault();
        navigate("/people/logs");
      }
      // Shift + C: Companies
      if (e.shiftKey && e.key === "C") {
        e.preventDefault();
        navigate("/companies");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  useEffect(() => {
    clearSelection();
  }, [location.pathname]);

  const leadPeople = people.filter((p) => p.leadType !== "Client");
  const clientPeople = people.filter((p) => p.leadType === "Client");

  const isSignInPage =
    location.pathname === "/signin" || location.pathname === "/signup";
  const isOnboardingPage = location.pathname === "/onboarding";
  const isPublicBuildPage = location.pathname === "/public-build";
  const isSharedPage = location.pathname.startsWith("/shared/");
  const isInvitePage = location.pathname.startsWith("/invite/");
  const isMcpPage = location.pathname === "/mcp/connect";

  // Redirect to signin if not authenticated
  useEffect(() => {
    // If it's a public page, don't redirect
    if (
      isSignInPage ||
      isSharedPage ||
      isPublicBuildPage ||
      isInvitePage ||
      isMcpPage
    ) {
      return;
    }

    // Otherwise, redirect if no access token
    if (!accessToken) {
      const returnTo = encodeURIComponent(location.pathname + location.search);
      navigate(`/signin?returnTo=${returnTo}`);
      return;
    }

    // Onboarding redirection logic
    if (user && user.is_onboarding_completed === false && !isOnboardingPage) {
      navigate("/onboarding");
    } else if (
      user &&
      user.is_onboarding_completed === true &&
      isOnboardingPage
    ) {
      navigate("/");
    }
  }, [
    accessToken,
    user,
    isSignInPage,
    isSharedPage,
    isPublicBuildPage,
    isOnboardingPage,
    isInvitePage,
    isMcpPage,
    navigate,
  ]);

  const isUserInactive = user?.is_active === false;
  const isLoadingUser = accessToken && !user;

  const showNav = !isSharedPage &&
    !isSignInPage &&
    !isPublicBuildPage &&
    !isOnboardingPage &&
    !isInvitePage &&
    !isMcpPage &&
    !location.pathname.startsWith('/search') &&
    !isUserInactive &&
    !isLoadingUser;

  const isRTL = language === "ar";

  return (
    <TranslationProvider>
      <div className="flex h-screen bg-background text-textPrimary font-sans overflow-hidden">
        {showNav && (
          <>
            <div
              className={cn(
                "hidden md:block shrink-0",
                isRTL ? "order-1" : "order-2",
              )}
            >
              <Sidebar />
            </div>
            <MobileAppBar />
            <MobileNavigationDrawer />
            <MobileNavigationBar />
          </>
        )}
        <main
          className={cn(
            "flex-1 overflow-hidden relative flex flex-col transition-all duration-300 order-2 rtl:order-1",
            showNav && !location.pathname.startsWith("/search")
              ? "pt-16 pb-20 md:pt-0 md:pb-0"
              : "",
          )}
        >
          {showNav && (
            <>
              <VerificationBanner />
              <TelegramBanner />
            </>
          )}
          <Suspense fallback={<RouteFallback />}>
            {isUserInactive ? (
              <InactiveAccountPage />
            ) : isLoadingUser ? (
              <RouteFallback />
            ) : (
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/search" element={<MobileSearch />} />
                <Route
                  path="/analytics/pre-sales"
                  element={<PreSalesDashboard />}
                />
                <Route
                  path="/people/all"
                  element={
                    <DataTable
                      data={people}
                      type="person"
                      title="All People"
                      viewId="all-people"
                    />
                  }
                />
                <Route
                  path="/people/leads"
                  element={
                    <DataTable
                      data={leadPeople}
                      type="person"
                      title="Leads"
                      viewId="leads"
                    />
                  }
                />
                <Route
                  path="/people/clients"
                  element={
                    <DataTable
                      data={clientPeople}
                      type="person"
                      title="Clients"
                      viewId="clients"
                    />
                  }
                />
                <Route
                  path="/people/logs"
                  element={
                    <DataTable
                      data={activities}
                      type="activity"
                      title="All Logs"
                      viewId="logs-v3"
                    />
                  }
                />
                <Route
                  path="/people/:id"
                  element={<RecordPage type="person" />}
                />

                <Route
                  path="/companies"
                  element={
                    <DataTable
                      data={companies}
                      type="company"
                      title="Companies"
                      viewId="companies"
                    />
                  }
                />
                <Route
                  path="/companies/:id"
                  element={<RecordPage type="company" />}
                />

                <Route path="/ai-agent" element={<AiAgentPage />} />
                <Route path="/public-build" element={<BuildingInPublic />} />

                <Route
                  path="/opportunities"
                  element={<Navigate to="/opportunities/all" replace />}
                />
                <Route
                  path="/opportunities/all"
                  element={
                    <DataTable
                      data={opportunities}
                      type="opportunity"
                      title="All Opportunities"
                      viewId="opportunities"
                    />
                  }
                />
                <Route path="/opportunities/status" element={<KanbanBoard />} />
                <Route
                  path="/opportunities/:id"
                  element={<RecordPage type="opportunity" />}
                />

                <Route
                  path="/tasks"
                  element={<Navigate to="/tasks/all" replace />}
                />
                <Route
                  path="/tasks/all"
                  element={
                    <DataTable
                      data={tasks}
                      type="task"
                      title="All Tasks"
                      viewId="tasks"
                    />
                  }
                />
                <Route path="/tasks/status" element={<TaskKanban />} />
                <Route
                  path="/tasks/assigned"
                  element={
                    <DataTable
                      data={tasks}
                      type="task"
                      title="Assigned to Me"
                      viewId="tasks-assigned"
                    />
                  }
                />

                <Route path="/settings" element={<SettingsLayout />} />
                <Route
                  path="/notes"
                  element={
                    <DataTable
                      data={notes}
                      type="note"
                      title="All Notes"
                      viewId="notes"
                    />
                  }
                />
                <Route path="/reports" element={<ReportsPage />} />
                <Route
                  path="/shared/report/:id"
                  element={<SharedReportView />}
                />
                <Route path="/signin" element={<Login02 />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/mcp/connect" element={<McpConnect />} />

                <Route path="/onboarding" element={<OnboardingPage />} />
                <Route
                  path="/verification-success"
                  element={<VerificationSuccess />}
                />
                <Route path="/invite/:token" element={<InviteLandingPage />} />

                <Route
                  path="/workflows"
                  element={<EmptyState title="Workflows" />}
                />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            )}
          </Suspense>
        </main>
        {!isSignInPage && !isUserInactive && (
          <Suspense fallback={null}>
            <>
              <ContextDrawer />
              <SelectionBar />
              <CommandMenu />
              <GlobalConfirmDialog />
              <MustVerifyEmailModal />
              <ProModal />
              <NoOrganizationModal
                isOpen={
                  !!(user && user.is_onboarding_completed && !user.organization)
                }
              />
              <NavbarTour />
            </>
          </Suspense>
        )}
        <Toaster
          theme={theme}
          position={isRTL ? "bottom-left" : "bottom-right"}
          closeButton
          richColors
        />
      </div>
    </TranslationProvider>
  );
};

export default App;
