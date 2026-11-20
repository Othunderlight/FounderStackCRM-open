import React, { useState, useEffect, useCallback, useMemo } from "react";
import MobileSettings from "./mobile/MobileSettings";
import {
  User,
  Settings,
  Upload,
  Trash2,
  Lock,
  ChevronRight,
  ChevronDown,
  Share2,
  Shield,
  AlertTriangle,
  CreditCard,
  Key,
  Link as LinkIcon,
  Linkedin,
  Zap,
  Globe,
  Layout,
  Palette,
  Moon,
  Monitor,
  Type,
  Hash,
  List,
  Tag,
  ArrowUpCircle,
  Users,
  ShieldCheck,
  Mail,
  Calendar,
  Check,
  X,
  Pencil,
  Plus,
  Search,
  ExternalLink,
  RefreshCw,
  Smartphone,
  LogOut,
  Rocket,
  MessageSquare,
  HelpCircle,
  FlaskConical as Beaker,
  CheckCircle2,
  PieChart,
  GitBranch,
  Database,
  Command,
  Building as Building2,
  Target,
  LayoutDashboard,
  FileText,
  MoreHorizontal,
  Ban,
  KeyRound,
  Bot,
  AtSign,
  Facebook,
  Gamepad2,
  Instagram,
  Loader2,
  Music2,
  Pin,
  Slack,
  Unplug,
  Wifi,
  WifiOff,
  Youtube,
  Twitter,
  type LucideIcon,
} from "lucide-react";
import {
  googleLogin,
  linkGoogle,
  getOrgUsers,
  getRoles,
  createRole,
  updateRole,
  createInvitation,
  assignRole,
  toggleUserActive,
  getMyRolePermissions,
  getAPIKeys,
  createAPIKey,
  revokeAPIKey,
  reactivateAPIKey,
  deleteAPIKey,
  hasCredential,
  createCredential,
  apiFetch,
  changePassword,
} from "../lib/api";
import { useStore } from "../store";
import { useTranslation } from "../src/i18n";
import { cn } from "../lib/utils";
import { settingsTheme } from "../lib/theme";
import { ConnectTelegramModal } from "./ConnectTelegramModal";
import {
  ZernioError,
  ensureZernioProfile,
  getZernioProfile,
  listZernioAccounts,
  syncZernioAccounts,
  getZernioConnectUrl,
  reconnectZernioAccount,
  disconnectZernioAccount,
} from "../lib/zernio";
import type { ZernioAccount, ZernioProfile } from "../lib/zernio";
import { MessageCircle } from 'lucide-react';

type RoleSummary = {
  id: string;
  name: string;
  system_key?: string | null;
  permissions: string[];
  hidden_fields: Record<string, string[]>;
  is_system: boolean;
  assigned_users_count?: number;
};

type MemberSummary = {
  id: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  email: string;
  is_active: boolean;
  role?: {
    id: string;
    name: string;
    system_key?: string | null;
  } | null;
};

type MyPermissionsPayload = {
  role: {
    id: string;
    name: string;
    system_key?: string | null;
  } | null;
  permissions: string[];
  hidden_fields: Record<string, string[]>;
};

const ROLE_PERMISSION_GROUPS = [
  {
    label: "Workspace control",
    permissions: ["users.manage", "roles.manage", "config.manage"],
  },
  {
    label: "External integrations",
    permissions: ["agent.use"],
  },
  {
    label: "CRM records",
    permissions: [
      "people.read",
      "people.write",
      "companies.read",
      "companies.write",
      "opportunities.read",
      "opportunities.write",
      "tasks.read",
      "tasks.write",
      "notes.read",
      "notes.write",
      "activities.read",
      "activities.write",
      "interactions.read",
      "interactions.write",
    ],
  },
  {
    label: "Analytics and exports",
    permissions: [
      "reports.read",
      "reports.write",
      "exports.read",
      "dashboard.read",
      "dashboard.write",
      "files.read",
      "files.write",
      "sync.read",
      "sync.write",
    ],
  },
];

const HIDDEN_FIELD_OPTIONS: Record<string, string[]> = {
  person: [
    "email",
    "phone",
    "job_title",
    "city",
    "linkedin",
    "conversion_rate",
    "stage",
    "lead_type",
    "lead_source",
    "last_action",
    "recommended_action",
    "owner",
  ],
  company: ["domain", "employees", "location", "linkedin", "arr", "icp"],
  opportunity: [
    "name",
    "deal_stage",
    "value",
    "probability",
    "expected_close_date",
    "primary_contact",
    "owner",
  ],
};

const SYSTEM_ROLE_ACCENTS: Record<string, string> = {
  owner: "text-amber-500",
  admin: "text-blue-500",
  manager: "text-emerald-500",
  member: "text-zinc-500",
};

const getMemberName = (member: MemberSummary) => {
  const fullName =
    `${member.first_name || ""} ${member.last_name || ""}`.trim();
  return fullName || member.username || member.email.split("@")[0];
};

// --- Toast Component ---
const Toast = ({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) => (
  <div
    className={cn(
      "fixed bottom-6 right-6 text-textPrimary px-4 py-3 rounded-md shadow-2xl border border-green-500/50 flex items-center gap-3 animate-in slide-in-from-bottom-5 z-50",
      settingsTheme.surface,
    )}
  >
    <div className="bg-green-500/20 text-green-500 p-1 rounded-full">
      <Check size={14} />
    </div>
    <span className="text-sm font-medium">{message}</span>
  </div>
);

const ComingSoonLayer = () => {
  const { t } = useTranslation();
  return (
    <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
      <div
        className={cn(
          "border border-border p-6 rounded-xl shadow-2xl flex flex-col items-center text-center max-w-xs animate-in zoom-in-95 duration-200",
          settingsTheme.dialog,
        )}
      >
        <AlertTriangle size={24} className="text-yellow-500 mb-2" />
        <span className="text-sm font-bold text-textPrimary mb-1">
          {t("settings.comingSoon")}
        </span>
        <a
          href="https://roadmap.founderstack.cloud"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline text-xs font-medium"
          onClick={(e) => e.stopPropagation()}
        >
          {t("settings.tellUsWhy")}
        </a>
      </div>
    </div>
  );
};

// --- Settings Layout & Main Component ---
import { toast } from "sonner";

import { useNavigate } from "react-router-dom";

const SettingsLayout = () => {
  const { logout } = useStore();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Profile");
  const [advancedMode, setAdvancedMode] = useState(false);
  const [isAccountsExpanded, setIsAccountsExpanded] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [myAccess, setMyAccess] = useState<MyPermissionsPayload | null>(null);
  const [isAccessLoaded, setIsAccessLoaded] = useState(false);

  // Map URL hash fragments to tab names
  const tabMapping: { [key: string]: string } = {
    profile: "Profile",
    accounts: "Accounts",
    emails: "Emails",
    calendars: "Calendars",
    general: "General",
    "data-model": "Data model",
    members: "Members",
    roles: "Roles",
    domains: "Domains",
    billing: "Billing",
    security: "Security",
    api: "APIs & Webhooks",
    "api-webhooks": "APIs & Webhooks",
    webhooks: "APIs & Webhooks",
    integrations: "Integrations",
    agents: "Agents",
    releases: "Releases",
    support: "Support",
    documentation: "Documentation",
  };

  // Read URL hash on mount to set initial tab and fetch permissions
  useEffect(() => {
    const hash = window.location.hash;
    const parts = hash.split("#");
    // Check if there's a section hash after the route (e.g., #/settings#api)
    if (parts.length > 2) {
      const section = parts[2].toLowerCase();
      if (tabMapping[section]) {
        setActiveTab(tabMapping[section]);
      }
    }

    const fetchAccess = async () => {
      try {
        const response = await getMyRolePermissions();
        if (response.ok) {
          setMyAccess(await response.json());
        }
      } catch (err) {
        console.error("Failed to fetch permissions:", err);
      } finally {
        setIsAccessLoaded(true);
      }
    };
    fetchAccess();
  }, []);

  const canManageUsers =
    !!myAccess?.permissions?.includes("*") ||
    !!myAccess?.permissions?.includes("users.manage");
  const canManageRoles =
    !!myAccess?.permissions?.includes("*") ||
    !!myAccess?.permissions?.includes("roles.manage");
  const canManageConfig =
    !!myAccess?.permissions?.includes("*") ||
    !!myAccess?.permissions?.includes("config.manage");
  const canUseAgents =
    !!myAccess?.permissions?.includes("*") ||
    !!myAccess?.permissions?.includes("agent.use");

  // Handle tab changes - update URL hash
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // Find the hash key for this tab
    const hashKey = Object.keys(tabMapping).find(
      (key) => tabMapping[key] === tab,
    );
    if (hashKey) {
      // Update URL without full navigation
      const baseRoute = window.location.hash.split("#").slice(0, 2).join("#");
      window.location.hash = `${baseRoute}#${hashKey}`;
    }
  };

  // Wrapper for backward compatibility
  const setActiveTabWrapper = (tab: string) => {
    handleTabChange(tab);
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const renderContent = () => {
    switch (activeTab) {
      case "Profile":
        return <ProfileView showToast={showToast} />;
      /*
      case "Experience":
        return <ExperienceView />;
      */
      case "Accounts":
        return (
          <AccountsView
            setActiveTab={setActiveTabWrapper}
            canManageConfig={canManageConfig}
            accessReady={isAccessLoaded}
          />
        );
      case "Emails":
        return <EmailsView />;
      case "Calendars":
        return <CalendarsView />;

      case "General":
        return <GeneralWorkspaceView />;
      case "Data model":
        return <DataModelView />;
      case "Members":
        return <MembersView initialAccess={myAccess} />;
      case "Roles":
        return <RolesView initialAccess={myAccess} />;
      case "Domains":
        return <DomainsView />;
      case "Billing":
        return <BillingView />;
      case "Security":
        return <SecurityView />;
      case "APIs & Webhooks":
        return <ApiWebhookView canManageConfig={canManageConfig} />;
      case "Integrations":
        return canUseAgents ? (
          <IntegrationsView />
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <p className="text-textSecondary">Access denied</p>
          </div>
        );
      case "Agents":
        return canUseAgents ? (
          <AgentsView />
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <p className="text-textSecondary">Access denied</p>
          </div>
        );

      case "Releases":
        return <ReleasesView />;
      case "Support":
        return <SupportView />;
      case "Documentation":
        return <DocumentationView />;
      default:
        return <ProfileView showToast={showToast} />;
    }
  };

  const getTabTranslation = (tab: string) => {
    if (tab === "Members" && !canManageUsers) {
      return t("settings.yourAccessAndRole");
    }

    const keyMap: { [key: string]: any } = {
      Profile: t("settings.profile"),
      Accounts: t("settings.accounts"),
      Emails: t("settings.emails"),
      Calendars: t("settings.calendars"),
      General: t("settings.general"),
      "Data model": t("settings.dataModel"),
      Members: t("settings.members"),
      Roles: t("settings.roles"),
      Domains: t("settings.domains"),
      Billing: t("settings.billing"),
      Security: t("settings.security"),
      "APIs & Webhooks": t("settings.apiWebhooks"),
      Integrations: t("settings.integrations"),
      Agents: t("settings.agents"),
      Releases: t("settings.releases"),
      Support: t("settings.support"),
      Documentation: t("settings.documentation"),
    };
    return keyMap[tab] || tab;
  };

  // Determine section for breadcrumb
  const section = [
    "Profile",
    "Experience",
    "Accounts",
    "Emails",
    "Calendars",
  ].includes(activeTab)
    ? "User"
    : "Workspace";

  const displaySection =
    section === "User" ? t("settings.user") : t("settings.workspace");

  return (
    <>
      {/* Mobile Settings */}
      <div className="md:hidden h-full">
        <MobileSettings />
      </div>

      {/* Desktop Settings */}
      <div
        className={cn(
          "hidden md:flex h-full text-textPrimary relative",
          settingsTheme.bg,
        )}
      >
        {/* Sidebar */}
        <div className="w-[240px] flex flex-col border-r border-border py-6 overflow-y-auto">
          <div className="flex-1 px-4 space-y-8">
            {/* User Section */}
            <div>
              <div
                className={cn(
                  "px-2 mb-2 flex items-center gap-2",
                  settingsTheme.text.secondary,
                )}
              >
                <User size={14} />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  {t("settings.user")}
                </span>
              </div>
              <div className="space-y-0.5">
                <SidebarItem
                  label="Profile"
                  displayLabel={t("settings.profile")}
                  activeTab={activeTab}
                  onClick={handleTabChange}
                />
                {/*
              <SidebarItem
                label="Experience"
                displayLabel={t("settings.experience")}
                activeTab={activeTab}
                onClick={handleTabChange}
              />
              */}

                <div>
                  <div
                    className={cn(
                      "flex items-center justify-between px-3 py-1.5 ml-3 rounded-sm cursor-pointer text-[13px] font-medium transition-colors",
                      settingsTheme.navActiveText,
                      !(
                        activeTab === "Accounts" ||
                        activeTab === "Emails" ||
                        activeTab === "Calendars"
                      ) && cn("hover:text-textPrimary", settingsTheme.hover),
                    )}
                    onClick={() => {
                      handleTabChange("Accounts");
                      setIsAccountsExpanded(!isAccountsExpanded);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span>{t("settings.accounts")}</span>
                    </div>
                    {isAccountsExpanded ? (
                      <ChevronDown size={14} />
                    ) : (
                      <ChevronRight size={14} />
                    )}
                  </div>

                  {isAccountsExpanded && (
                    <div className="rtl:ml-0 rtl:mr-6 rtl:pl-0 rtl:pr-2 rtl:border-l-0 rtl:border-r ml-6 mt-1 space-y-0.5 border-l border-border pl-2">
                      <SidebarItem
                        label="Emails"
                        displayLabel={t("settings.emails")}
                        activeTab={activeTab}
                        onClick={handleTabChange}
                        nested
                      />
                      <SidebarItem
                        label="Calendars"
                        displayLabel={t("settings.calendars")}
                        activeTab={activeTab}
                        onClick={handleTabChange}
                        nested
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Workspace Section */}
            <div>
              <div
                className={cn(
                  "px-2 mb-2 flex items-center gap-2",
                  settingsTheme.text.secondary,
                )}
              >
                <Settings size={14} />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  {t("settings.workspace")}
                </span>
              </div>
              <div className="space-y-0.5">
                <SidebarItem
                  label="General"
                  displayLabel={t("settings.general")}
                  activeTab={activeTab}
                  onClick={handleTabChange}
                />
                <SidebarItem
                  label="Data model"
                  displayLabel={t("settings.dataModel")}
                  activeTab={activeTab}
                  onClick={handleTabChange}
                />
                <SidebarItem
                  label="Members"
                  displayLabel={
                    canManageUsers
                      ? t("settings.members")
                      : t("settings.yourAccessAndRole")
                  }
                  activeTab={activeTab}
                  onClick={handleTabChange}
                />
                {canManageRoles && (
                  <SidebarItem
                    label="Roles"
                    displayLabel={t("settings.roles")}
                    activeTab={activeTab}
                    onClick={handleTabChange}
                  />
                )}
                <SidebarItem
                  label="Domains"
                  displayLabel={t("settings.domains")}
                  activeTab={activeTab}
                  onClick={handleTabChange}
                />
                <SidebarItem
                  label="Billing"
                  displayLabel={t("settings.billing")}
                  activeTab={activeTab}
                  onClick={handleTabChange}
                />
                <SidebarItem
                  label="Security"
                  displayLabel={t("settings.security")}
                  activeTab={activeTab}
                  onClick={handleTabChange}
                />
                {canManageConfig && (
                  <SidebarItem
                    label="APIs & Webhooks"
                    displayLabel={t("settings.apiWebhooks")}
                    activeTab={activeTab}
                    onClick={handleTabChange}
                  />
                )}
                {canUseAgents && (
                  <SidebarItem
                    label="Integrations"
                    displayLabel={t("settings.integrations")}
                    activeTab={activeTab}
                    onClick={handleTabChange}
                  />
                )}
                {canUseAgents && (
                  <SidebarItem
                    label="Agents"
                    displayLabel={t("settings.agents")}
                    activeTab={activeTab}
                    onClick={handleTabChange}
                  />
                )}
              </div>
            </div>

            {/* Other Section */}
            <div>
              <div
                className={cn(
                  "px-2 mb-2 flex items-center gap-2",
                  settingsTheme.text.secondary,
                )}
              >
                <MoreHorizontal size={14} />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  {t("settings.other")}
                </span>
              </div>
              <div className="space-y-0.5">
                <SidebarItem
                  label="Releases"
                  displayLabel={t("settings.releases")}
                  icon={<Rocket size={14} />}
                  activeTab={activeTab}
                  onClick={handleTabChange}
                />
                <SidebarItem
                  label="Support"
                  displayLabel={t("settings.support")}
                  icon={<MessageSquare size={14} />}
                  activeTab={activeTab}
                  onClick={handleTabChange}
                />
                <SidebarItem
                  label="Documentation"
                  displayLabel={t("settings.documentation")}
                  icon={<HelpCircle size={14} />}
                  activeTab={activeTab}
                  onClick={handleTabChange}
                />
                <div
                  onClick={() => {
                    logout();
                    navigate("/signin");
                  }}
                  className="px-3 py-1.5 ml-3 rounded-sm cursor-pointer text-[13px] font-medium text-textSecondary hover:text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                >
                  <LogOut size={14} />
                  <span>{t("settings.logout")}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Advanced Toggle */}
          <div className="px-6 mt-4 pt-4 flex items-center gap-3">
            <div
              className={cn(
                "w-9 h-5 rounded-full p-1 cursor-pointer transition-colors relative",
                advancedMode ? "bg-accent" : settingsTheme.switchOff,
              )}
              onClick={() => setAdvancedMode(!advancedMode)}
            >
              <div
                className={`w-3 h-3 bg-white rounded-full shadow-sm transform transition-transform duration-200 ${advancedMode ? "translate-x-4" : "translate-x-0"}`}
              />
            </div>
            <span className="text-xs text-textSecondary font-medium">
              {t("settings.advanced")}
            </span>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="px-12 py-10">
            <div className="text-sm text-textSecondary mb-2 font-medium">
              {displaySection} / {getTabTranslation(activeTab)}
            </div>
            <h1 className="text-2xl font-bold text-textPrimary mb-10">
              {getTabTranslation(activeTab)}
            </h1>
            <div
              className={cn(
                ["Data model", "Members", "Roles", "APIs & Webhooks", "Integrations", "Agents"].includes(
                  activeTab,
                )
                  ? "max-w-6xl"
                  : "max-w-3xl",
              )}
            >
              {renderContent()}
            </div>
          </div>
        </div>

        {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      </div>
    </>
  );
};

const SidebarItem = ({
  label,
  displayLabel,
  activeTab,
  onClick,
  nested = false,
  icon,
}: {
  label: string;
  displayLabel: string;
  activeTab: string;
  onClick: (t: string) => void;
  nested?: boolean;
  icon?: React.ReactNode;
}) => (
  <div
    onClick={() => onClick(label)}
    className={cn(
      "px-3 py-1.5 rounded-sm cursor-pointer text-[13px] font-medium transition-colors flex items-center gap-2",
      !nested ? "ml-3" : "",
      activeTab === label ? "bg-settings-hover" : "hover:bg-settings-hover",
    )}
  >
    {icon}
    <span>{displayLabel}</span>
  </div>
);

// --- Views ---

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from "./ui/empty";

const ProfileView = ({ showToast }: { showToast: (msg: string) => void }) => {
  const { t } = useTranslation();
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const { user, setUser } = useStore();
  const [email, setEmail] = useState(user?.email || "");
  const [firstName, setFirstName] = useState(
    user?.first_name || user?.name?.split(" ")[0] || "",
  );
  const [lastName, setLastName] = useState(
    user?.last_name || user?.name?.split(" ")[1] || "",
  );

  // Change Password Modal State
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChanging, setIsChanging] = useState(false);

  // Google Connection State
  const [isGoogleConnecting, setIsGoogleConnecting] = useState(false);

  // Profile Saving State
  const [isSaving, setIsSaving] = useState(false);

  // Track unsaved changes
  const hasNameChanges =
    firstName !== (user?.first_name || user?.name?.split(" ")[0] || "") ||
    lastName !== (user?.last_name || user?.name?.split(" ")[1] || "");

  const isGoogleConnected = !!user?.google_email;

  useEffect(() => {
    if (user) {
      setEmail(user.email);
      setFirstName(user.first_name || user.name?.split(" ")[0] || "");
      setLastName(user.last_name || user.name?.split(" ")[1] || "");
    }
  }, [user]);

  const saveProfile = async () => {
    setIsSaving(true);
    try {
      const response = await apiFetch("/api/auth/user/", {
        method: "PATCH",
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setUser({
          ...user!,
          first_name: data.first_name,
          last_name: data.last_name,
          name: `${data.first_name} ${data.last_name}`.trim() || data.username,
        });
        showToast(t("settings.profileUpdated"));
      } else {
        const data = await response.json();
        showToast(data.detail || t("settings.profileUpdateFailed"));
      }
    } catch (err) {
      console.error("Profile save error:", err);
      showToast(t("settings.profileUpdateFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveEmail = async () => {
    if (email === user?.email) {
      setIsEditingEmail(false);
      return;
    }

    setIsSaving(true);
    try {
      const response = await apiFetch("/api/auth/user/", {
        method: "PATCH",
        body: JSON.stringify({
          email: email,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setUser({
          ...user!,
          email: data.email,
        });
        setIsEditingEmail(false);
        showToast(t("settings.emailUpdated"));
      } else {
        const data = await response.json();
        showToast(
          data.detail || data.email?.[0] || t("settings.emailUpdateFailed"),
        );
      }
    } catch (err) {
      console.error("Email save error:", err);
      showToast(t("settings.emailUpdateFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleGoogleConnect = async (tokenResponse: any) => {
    setIsGoogleConnecting(true);
    try {
      const response = await linkGoogle(tokenResponse.access_token);
      const data = await response.json();
      if (response.ok) {
        toast.success(t("settings.googleConnectedSuccess"));
        // Refresh user data
        window.location.reload();
      } else {
        toast.error(
          t("settings.googleConnectFailed") +
            ": " +
            (data.detail || "Unknown error"),
        );
      }
    } catch (err) {
      console.error("Connection error:", err);
      toast.error(t("settings.googleConnectFailed"));
    } finally {
      setIsGoogleConnecting(false);
    }
  };

  const connectGoogle = () => {
    if (!window.google) {
      toast.error(t("settings.googleScriptNotLoaded"));
      return;
    }

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id:
        "198767020240-o0k158mj259jtlopenmqede9eso2kmqt.apps.googleusercontent.com",
      scope: "email profile openid",
      callback: handleGoogleConnect,
    });
    client.requestAccessToken();
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    setIsChanging(true);
    try {
      const response = await changePassword({
        old_password: oldPassword,
        new_password: newPassword,
      });

      if (response.ok) {
        toast.success(t("settings.passwordChangedSuccess"));
        setIsChangePasswordOpen(false);
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const data = await response.json();
        toast.error(data.detail || t("settings.passwordChangeFailed"));
      }
    } catch (err) {
      toast.error(t("settings.passwordChangeFailed"));
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div className="space-y-10">
      {/* Name */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-textPrimary block">
            {t("dataTable.name")}
          </label>
          <div className="flex items-center gap-3">
            {hasNameChanges && (
              <span className="text-xs text-textSecondary italic">
                Unsaved changes
              </span>
            )}
            <Button
              size="sm"
              onClick={saveProfile}
              disabled={isSaving || !hasNameChanges}
              className="h-7 text-xs"
            >
              {isSaving ? t("common.loading") : t("common.save")}
            </Button>
          </div>
        </div>
        <div className="flex gap-6">
          <div className="flex-1 space-y-2">
            <Label className="text-xs text-textSecondary font-medium">
              {t("settings.firstName")}
            </Label>
            <Input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={cn(
                "border-border focus:border-accent transition-colors",
                settingsTheme.card,
              )}
              placeholder={t("settings.firstName")}
            />
          </div>
          <div className="flex-1 space-y-2">
            <Label className="text-xs text-textSecondary font-medium">
              {t("settings.lastName")}
            </Label>
            <Input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={cn(
                "border-border focus:border-accent transition-colors",
                settingsTheme.card,
              )}
              placeholder={t("settings.lastName")}
            />
          </div>
        </div>
      </div>

      {/* Email */}
      <div className="space-y-4">
        <label className="text-sm font-semibold text-textPrimary block">
          {t("dataTable.email")}
        </label>
        <div className="space-y-2">
          <p className="text-xs text-textSecondary font-medium">
            {t("settings.emailDesc")}
          </p>
          <div className="relative group max-w-md">
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!isEditingEmail}
              className={cn(
                "pr-10",
                !isEditingEmail
                  ? cn(
                      settingsTheme.text.secondary,
                      settingsTheme.card,
                      "border-transparent cursor-default disabled:opacity-100",
                    )
                  : cn(settingsTheme.text.primary, "border-accent"),
              )}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              {isEditingEmail ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleSaveEmail}
                    disabled={isSaving}
                    className="p-1 hover:bg-green-900/50 text-green-500 rounded disabled:opacity-50"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => setIsEditingEmail(false)}
                    className="p-1 hover:bg-red-900/50 text-red-500 rounded"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsEditingEmail(true)}
                  className={cn(
                    "p-1.5 rounded opacity-0 group-hover:opacity-100 transition-all",
                    settingsTheme.text.secondary,
                    "hover:text-textPrimary",
                    settingsTheme.hoverAlt,
                  )}
                >
                  <Pencil size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="space-y-4 pt-8 border-t border-border">
        <div>
          <h3 className="text-sm font-semibold text-textPrimary">
            {t("settings.security")}
          </h3>
          <p className="text-xs text-textSecondary mt-1">
            {t("settings.securityDesc")}
          </p>
        </div>
        <Button
          onClick={() => setIsChangePasswordOpen(true)}
          variant="outline"
          className={cn("text-sm font-medium", settingsTheme.button.outline)}
        >
          {t("settings.changePassword")}
        </Button>
      </div>

      {/* Google Connection */}
      <div className="space-y-4 pt-8 border-t border-border">
        <div>
          <h3 className="text-sm font-semibold text-textPrimary">
            {t("settings.connectedAccounts")}
          </h3>
          <p className="text-xs text-textSecondary mt-1">
            {t("settings.connectedAccountsDesc")}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {isGoogleConnected ? (
            <div
              className={cn(
                "flex items-center gap-3 p-3 border border-green-500/30 rounded-lg",
                settingsTheme.card,
              )}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <div>
                <div className="text-sm font-medium text-textPrimary">
                  {t("settings.googleConnected")}
                </div>
                <div className="text-xs text-textSecondary">
                  {user?.google_email}
                </div>
              </div>
              <Check size={16} className="text-green-500 ml-auto" />
            </div>
          ) : (
            <button
              onClick={connectGoogle}
              disabled={isGoogleConnecting}
              className={cn(
                "flex items-center gap-3 p-3 border border-border rounded-lg transition-all duration-200 cursor-pointer",
                settingsTheme.card,
                "hover:border-settings-button-primary/50 hover:shadow-sm hover:scale-[1.02]",
              )}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="text-sm font-medium">
                {isGoogleConnecting
                  ? t("common.loading")
                  : t("settings.connectGoogle")}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Change Password Modal */}
      <Dialog
        open={isChangePasswordOpen}
        onOpenChange={setIsChangePasswordOpen}
      >
        <DialogContent
          className={cn(
            "border-border text-settings-text-primary sm:max-w-[425px]",
            settingsTheme.dialog,
          )}
        >
          <form onSubmit={handleChangePassword}>
            <DialogHeader>
              <DialogTitle>{t("settings.changePassword")}</DialogTitle>
              <DialogDescription className={settingsTheme.text.secondary}>
                {t("settings.securityDesc")}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="old">{t("settings.currentPassword")}</Label>
                <Input
                  id="old"
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className={cn(
                    settingsTheme.border.primary,
                    settingsTheme.inputAlt,
                  )}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new">{t("settings.newPassword")}</Label>
                <Input
                  id="new"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={cn(
                    settingsTheme.border.primary,
                    settingsTheme.inputAlt,
                  )}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirm">
                  {t("settings.confirmNewPassword")}
                </Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={cn(
                    settingsTheme.border.primary,
                    settingsTheme.inputAlt,
                  )}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                className={settingsTheme.button.ghost}
                onClick={() => setIsChangePasswordOpen(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={isChanging}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isChanging
                  ? t("settings.updatingPassword")
                  : t("settings.updatePassword")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const ExperienceView = () => {
  const { t } = useTranslation();
  return (
    <div className="space-y-10 relative group">
      <ComingSoonLayer />
      {/* Appearance */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-textPrimary">
          {t("settings.appearance")}
        </h3>
        <div className="grid grid-cols-3 gap-4">
          {["Light", "Dark", "System settings"].map((mode, i) => (
            <div
              key={mode}
              className={`cursor-pointer group ${i === 2 ? "ring-2 ring-accent rounded-lg" : ""}`}
            >
              <div
                className={cn(
                  "border border-border rounded-lg aspect-video mb-2 flex items-center justify-center group-hover:border-textSecondary transition-colors relative overflow-hidden",
                  settingsTheme.surface,
                )}
              >
                {i === 0 && (
                  <div className="w-full h-full bg-white flex items-center justify-center">
                    <div className="w-1/2 h-1/2 bg-white shadow-md rounded"></div>
                  </div>
                )}
                {i === 1 && (
                  <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                    <div className="w-1/2 h-1/2 bg-gray-700 shadow-md border border-gray-600 rounded"></div>
                  </div>
                )}
                {i === 2 && (
                  <div className="w-full h-full bg-gradient-to-br from-[#222] to-[#444] flex items-center justify-center">
                    <div className="text-xs font-medium">Aa</div>
                  </div>
                )}

                {i === 2 && (
                  <div className="absolute bottom-2 right-2 bg-accent text-white rounded-full p-0.5">
                    <Check size={12} />
                  </div>
                )}
              </div>
              <div className="text-xs font-medium text-center text-textSecondary group-hover:text-textPrimary">
                {mode === "Light"
                  ? t("sidebar.light")
                  : mode === "Dark"
                    ? t("sidebar.dark")
                    : t("sidebar.system")}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Language */}
      <div className="space-y-4">
        <label className="text-sm font-semibold text-textPrimary block">
          {t("settings.language")}
        </label>
        <p className="text-xs text-textSecondary -mt-3 mb-2">
          {t("settings.selectLanguage")}
        </p>
        <select className="settings-input w-full appearance-none">
          <option>English</option>
          <option>العربية</option>
        </select>
      </div>
    </div>
  );
};

const ZERNIO_PENDING_KEY = "zernio:connect:pending";
const ZERNIO_PENDING_TTL_MS = 20 * 60 * 1000;

const ZERNIO_PLATFORMS: {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  bg: string;
}[] = [
  {
    id: "instagram",
    label: "Instagram",
    icon: Instagram,
    color: "text-pink-500",
    bg: "bg-pink-500/10",
  },
  {
    id: "facebook",
    label: "Facebook",
    icon: Facebook,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    icon: Linkedin,
    color: "text-sky-400",
    bg: "bg-sky-500/10",
  },
  {
    id: "twitter",
    label: "X",
    icon: Twitter,
    color: "text-textPrimary",
    bg: "bg-zinc-500/10",
  },
  {
    id: "tiktok",
    label: "TikTok",
    icon: Music2,
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
  },
  {
    id: "youtube",
    label: "YouTube",
    icon: Youtube,
    color: "text-red-500",
    bg: "bg-red-500/10",
  },
  {
    id: "threads",
    label: "Threads",
    icon: AtSign,
    color: "text-textPrimary",
    bg: "bg-zinc-500/10",
  },
  {
    id: "pinterest",
    label: "Pinterest",
    icon: Pin,
    color: "text-rose-500",
    bg: "bg-rose-500/10",
  },
  {
    id: "reddit",
    label: "Reddit",
    icon: MessageCircle,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
  {
    id: "discord",
    label: "Discord",
    icon: Gamepad2,
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
  },
  {
    id: "slack",
    label: "Slack",
    icon: Slack,
    color: "text-fuchsia-500",
    bg: "bg-fuchsia-500/10",
  },
  {
    id: "googlebusiness",
    label: "Google Business",
    icon: Building2,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
];

const getZernioPlatform = (slug: string) =>
  ZERNIO_PLATFORMS.find((platform) => platform.id === slug);

const zernioErrorMessage = (error: unknown) => {
  if (error instanceof ZernioError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
};

// apiFetch already toasts API failures, so avoid a second identical toast.
const notifyZernioError = (error: unknown) => {
  if (error instanceof ZernioError && error.status !== 404) return;
  toast.error(zernioErrorMessage(error));
};

const formatRelativeTime = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const formatter = new Intl.RelativeTimeFormat(undefined, {
    numeric: "auto",
  });
  const minutes = Math.round((date.getTime() - Date.now()) / 60000);

  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, "hour");
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return formatter.format(days, "day");
  return date.toLocaleDateString();
};

const getZernioStatus = (account: ZernioAccount) => {
  if (account.needs_reconnect) {
    return {
      label: "Reconnect needed",
      dot: "bg-amber-500",
      text: "text-amber-500",
    };
  }

  switch (account.status) {
    case "healthy":
      return {
        label: "Healthy",
        dot: "bg-emerald-500",
        text: "text-emerald-500",
      };
    case "warning":
      return {
        label: "Warning",
        dot: "bg-amber-500",
        text: "text-amber-500",
      };
    case "error":
      return {
        label: "Error",
        dot: "bg-red-500",
        text: "text-red-500",
      };
    case "disconnected":
      return {
        label: "Disconnected",
        dot: "bg-zinc-500",
        text: "text-textSecondary",
      };
    default:
      return {
        label: "Connected",
        dot: "bg-emerald-500",
        text: "text-emerald-500",
      };
  }
};

const ZernioAccountAvatar = ({ account }: { account: ZernioAccount }) => {
  const platform = getZernioPlatform(account.platform);
  const Icon = platform?.icon || Globe;

  return (
    <div
      className={cn(
        "relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-border",
        platform?.bg || settingsTheme.quaternaryBg,
      )}
    >
      <Icon size={16} className={platform?.color || "text-textSecondary"} />
      {account.avatar_url && (
        <img
          src={account.avatar_url}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      )}
    </div>
  );
};

const ZernioAccountsSection = ({
  canManageConfig,
  accessReady,
}: {
  canManageConfig?: boolean;
  accessReady?: boolean;
}) => {
  const [profile, setProfile] = useState<ZernioProfile | null>(null);
  const [accounts, setAccounts] = useState<ZernioAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(
    null,
  );
  const [reconnectingId, setReconnectingId] = useState<number | null>(null);
  const [disconnectTarget, setDisconnectTarget] =
    useState<ZernioAccount | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const redirectUrl = `${window.location.origin}/?zernio=connected#/settings#accounts`;

  const refresh = useCallback(async () => {
    if (!canManageConfig) return false;

    try {
      const [nextProfile, nextAccounts] = await Promise.all([
        getZernioProfile(),
        listZernioAccounts(),
      ]);
      setProfile(nextProfile);
      setAccounts(nextAccounts);
      setError(null);
      return true;
    } catch (err) {
      setError(zernioErrorMessage(err));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [canManageConfig]);

  useEffect(() => {
    if (!accessReady) return;
    if (!canManageConfig) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const load = async () => {
      const params = new URLSearchParams(window.location.search);
      const pendingRaw = sessionStorage.getItem(ZERNIO_PENDING_KEY);
      const connectedPlatform = params.get("connected");
      const oauthError = params.get("error");
      const oauthErrorMessage = params.get("error_message");
      const returnedPlatform =
        connectedPlatform || params.get("platform") || null;
      const returnedUsername = params.get("username");
      const cameFromZernio =
        params.has("zernio") ||
        params.has("connected") ||
        params.has("error");

      let pending: {
        platform?: string;
        accountId?: number;
        accountIds?: number[];
        startedAt?: number;
      } | null = null;
      let syncedAccounts: ZernioAccount[] | null = null;

      if (cameFromZernio) {
        const nextUrl = new URL(window.location.href);
        nextUrl.search = "";
        window.history.replaceState({}, "", nextUrl.toString());
      }

      if (pendingRaw) {
        sessionStorage.removeItem(ZERNIO_PENDING_KEY);
        try {
          pending = JSON.parse(pendingRaw);
        } catch {
          pending = null;
        }

        if (
          pending?.startedAt &&
          Date.now() - pending.startedAt > ZERNIO_PENDING_TTL_MS
        ) {
          pending = null;
        }
      }

      const hasFailure =
        Boolean(oauthError) && oauthError !== "code_already_redeemed";

      if (hasFailure) {
        const platformLabel = returnedPlatform
          ? getZernioPlatform(returnedPlatform)?.label || returnedPlatform
          : "Social account";
        toast.error(
          oauthErrorMessage ||
            `${platformLabel} connection failed (${oauthError})`,
        );
      }

      if ((cameFromZernio || pending) && !hasFailure) {
        setIsSyncing(true);
        try {
          await syncZernioAccounts();
          syncedAccounts = await listZernioAccounts();

          if (connectedPlatform) {
            const platformLabel =
              getZernioPlatform(connectedPlatform)?.label ||
              connectedPlatform;

            toast.success(
              pending?.accountId
                ? `${platformLabel} reconnected`
                : returnedUsername
                  ? `${platformLabel} @${returnedUsername} connected`
                  : `${platformLabel} connected`,
            );
          } else if (pending) {
            const reconnected = pending.accountId
              ? syncedAccounts.some(
                  (account) =>
                    account.id === pending?.accountId &&
                    !account.needs_reconnect,
                )
              : syncedAccounts.some(
                  (account) =>
                    !(pending?.accountIds || []).includes(account.id),
                );

            if (reconnected) {
              toast.success(
                pending.accountId
                  ? "Account reconnected"
                  : "Social account connected",
              );
            } else {
              toast.info("No new account was connected");
            }
          }
        } catch (err) {
          notifyZernioError(err);
        } finally {
          if (isMounted) setIsSyncing(false);
        }
      }

      try {
        const [nextProfile, nextAccounts] = await Promise.all([
          getZernioProfile(),
          syncedAccounts ? Promise.resolve(syncedAccounts) : listZernioAccounts(),
        ]);
        if (!isMounted) return;
        setProfile(nextProfile);
        setAccounts(nextAccounts);
      } catch (err) {
        if (isMounted) setError(zernioErrorMessage(err));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [accessReady, canManageConfig]);

  const visibleAccounts = useMemo(
    () =>
      accounts.filter(
        (account) => account.is_active || account.needs_reconnect,
      ),
    [accounts],
  );

  const reconnectCount = useMemo(
    () => visibleAccounts.filter((account) => account.needs_reconnect).length,
    [visibleAccounts],
  );

  const lastSyncedAt = useMemo(() => {
    const timestamps = visibleAccounts
      .map((account) => account.last_synced_at)
      .filter((value): value is string => Boolean(value))
      .sort();
    return timestamps[timestamps.length - 1] || profile?.last_synced_at || null;
  }, [profile, visibleAccounts]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncZernioAccounts();
      const refreshed = await refresh();
      if (refreshed) {
        toast.success("Social accounts are up to date");
      }
    } catch (err) {
      notifyZernioError(err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConnect = async (platform: string) => {
    setConnectingPlatform(platform);
    try {
      await ensureZernioProfile();
      const { authUrl } = await getZernioConnectUrl(platform, redirectUrl);
      sessionStorage.setItem(
        ZERNIO_PENDING_KEY,
        JSON.stringify({
          platform,
          startedAt: Date.now(),
          accountIds: accounts.map((account) => account.id),
        }),
      );
      window.location.href = authUrl;
    } catch (err) {
      notifyZernioError(err);
      setConnectingPlatform(null);
    }
  };

  const handleReconnect = async (account: ZernioAccount) => {
    setReconnectingId(account.id);
    try {
      const { authUrl } = await reconnectZernioAccount(
        account.id,
        redirectUrl,
      );
      sessionStorage.setItem(
        ZERNIO_PENDING_KEY,
        JSON.stringify({
          platform: account.platform,
          accountId: account.id,
          startedAt: Date.now(),
        }),
      );
      window.location.href = authUrl;
    } catch (err) {
      notifyZernioError(err);
      setReconnectingId(null);
    }
  };

  const handleDisconnect = async () => {
    if (!disconnectTarget) return;

    setIsDisconnecting(true);
    try {
      await disconnectZernioAccount(disconnectTarget.id);
      setAccounts((current) =>
        current.filter((account) => account.id !== disconnectTarget.id),
      );
      toast.success("Social account disconnected");
      setDisconnectTarget(null);
    } catch (err) {
      notifyZernioError(err);
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (!accessReady) {
    return (
      <div className="space-y-4">
        <div className="h-4 w-40 animate-pulse rounded bg-settings-hover" />
        <div className="h-20 animate-pulse rounded-xl border border-border bg-settings-card" />
      </div>
    );
  }

  if (!canManageConfig) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-textPrimary">
            Social accounts
          </h3>
          <p className="mt-1 text-xs text-textSecondary">
            Connect social accounts to sync the inbox, publishing, and social
            analytics.
          </p>
        </div>
        <div
          className={cn(
            "flex items-center gap-3 rounded-xl border border-border p-5",
            settingsTheme.card,
          )}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-settings-quaternary-bg">
            <Lock size={16} className="text-textSecondary" />
          </div>
          <div>
            <div className="text-sm font-medium text-textPrimary">
              Admin access required
            </div>
            <p className="mt-0.5 text-xs text-textSecondary">
              Ask a workspace admin with the config.manage permission to connect
              social accounts.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-textPrimary">
              Social accounts
            </h3>
            <Badge className="h-5 border-none bg-blue-500/15 px-2 text-[10px] font-semibold uppercase tracking-wider text-blue-400">
              Zernio
            </Badge>
          </div>
          <p className="mt-1 max-w-xl text-xs text-textSecondary">
            Connect Instagram, LinkedIn, X, and more. Messages, publishing, and
            analytics stay in sync through Zernio.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-2 text-xs"
            onClick={handleSync}
            disabled={isSyncing}
          >
            <RefreshCw
              size={13}
              className={cn(isSyncing && "animate-spin")}
            />
            {isSyncing ? "Syncing" : "Sync"}
          </Button>
          <Button
            size="sm"
            className="h-8 gap-2 text-xs"
            onClick={() => setIsConnectOpen(true)}
          >
            <Plus size={13} />
            Connect account
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border px-4 py-3.5",
          settingsTheme.card,
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-blue-500/20 bg-gradient-to-br from-blue-500/20 to-purple-500/20">
            <Share2 size={16} className="text-blue-400" />
          </div>
          <div>
            <div className="text-sm font-medium text-textPrimary">
              {profile?.name || "Zernio social sync"}
            </div>
            <div className="mt-0.5 text-[11px] text-textSecondary">
              {lastSyncedAt
                ? `Last synced ${formatRelativeTime(lastSyncedAt) || "recently"}`
                : "Waiting for the first sync"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-5 text-[11px] text-textSecondary">
          <div>
            <span className="text-sm font-semibold text-textPrimary">
              {visibleAccounts.length}
            </span>{" "}
            connected
          </div>
          <div className="flex items-center gap-1.5">
            {visibleAccounts.length === 0 ? (
              <WifiOff size={12} className="text-textSecondary" />
            ) : reconnectCount > 0 ? (
              <WifiOff size={12} className="text-amber-500" />
            ) : (
              <Wifi size={12} className="text-emerald-500" />
            )}
            <span
              className={cn(reconnectCount > 0 && "text-amber-500")}
            >
              {visibleAccounts.length === 0
                ? "Not connected"
                : reconnectCount > 0
                  ? `${reconnectCount} need attention`
                  : "All healthy"}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div
          className={cn(
            "flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3",
          )}
        >
          <AlertTriangle size={15} className="mt-0.5 text-red-500" />
          <div className="flex-1">
            <div className="text-xs font-medium text-textPrimary">
              Could not load social accounts
            </div>
            <p className="mt-0.5 text-[11px] text-textSecondary">{error}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[11px]"
            onClick={() => {
              setError(null);
              setIsLoading(true);
              refresh();
            }}
          >
            Retry
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="flex items-center gap-3 rounded-xl border border-border bg-settings-card px-4 py-3"
            >
              <div className="h-9 w-9 animate-pulse rounded-full bg-settings-hover" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-32 animate-pulse rounded bg-settings-hover" />
                <div className="h-2.5 w-24 animate-pulse rounded bg-settings-hover" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? null : visibleAccounts.length === 0 ? (
        <div className="relative overflow-hidden rounded-xl border border-dashed border-border px-6 py-10 text-center">
          <div
            className={cn(
              "pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-500/[0.04] via-transparent to-purple-500/[0.04]",
            )}
          />
          <div className="relative flex flex-col items-center">
            <div className="mb-4 flex -space-x-2">
              {["instagram", "linkedin", "twitter", "youtube"].map((slug) => {
                const platform = getZernioPlatform(slug);
                const Icon = platform?.icon || Globe;
                return (
                  <div
                    key={slug}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full border-2 border-background ring-1 ring-border",
                      platform?.bg || settingsTheme.quaternaryBg,
                    )}
                  >
                    <Icon
                      size={15}
                      className={platform?.color || "text-textSecondary"}
                    />
                  </div>
                );
              })}
            </div>
            <h4 className="text-sm font-semibold text-textPrimary">
              Connect your first social account
            </h4>
            <p className="mt-1 max-w-sm text-xs text-textSecondary">
              Link an account to start syncing DMs, published posts, and
              analytics into your workspace.
            </p>
            <Button
              size="sm"
              className="mt-4 h-8 gap-2 text-xs"
              onClick={() => setIsConnectOpen(true)}
            >
              <Plus size={13} />
              Connect account
            </Button>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "divide-y divide-border/60 overflow-hidden rounded-xl border border-border",
            settingsTheme.card,
          )}
        >
          {visibleAccounts.map((account) => {
            const platform = getZernioPlatform(account.platform);
            const status = getZernioStatus(account);
            const name =
              account.display_name ||
              account.username ||
              platform?.label ||
              account.platform;
            const lastSynced = formatRelativeTime(account.last_synced_at);
            const issue =
              Array.isArray(account.issues) && account.issues.length > 0
                ? String(account.issues[0])
                : null;

            return (
              <div
                key={account.id}
                className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-settings-hover"
              >
                <ZernioAccountAvatar account={account} />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="truncate text-sm font-medium text-textPrimary">
                      {name}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[10px] font-medium",
                        platform?.color || "text-textSecondary",
                      )}
                    >
                      <span>{platform?.label || account.platform}</span>
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 text-[10px] font-medium",
                        status.text,
                      )}
                    >
                      <span
                        className={cn("h-1.5 w-1.5 rounded-full", status.dot)}
                      />
                      {status.label}
                    </span>
                  </div>

                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-textSecondary">
                    {account.username && <span>@{account.username}</span>}
                    {lastSynced && <span>Synced {lastSynced}</span>}
                    {!account.can_post && !account.needs_reconnect && (
                      <span className="text-amber-500">Posting unavailable</span>
                    )}
                    {issue && (
                      <span className="max-w-[320px] truncate text-amber-500">
                        {issue}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  {account.needs_reconnect && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1.5 border-amber-500/30 text-[11px] text-amber-500 hover:bg-amber-500/10 hover:text-amber-400"
                      onClick={() => handleReconnect(account)}
                      disabled={reconnectingId === account.id}
                    >
                      {reconnectingId === account.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <WifiOff size={12} />
                      )}
                      Reconnect
                    </Button>
                  )}
                  <button
                    type="button"
                    onClick={() => setDisconnectTarget(account)}
                    title="Disconnect account"
                    aria-label={`Disconnect ${name}`}
                    className={cn(
                      "rounded p-1.5 text-textSecondary opacity-100 transition-all hover:bg-red-500/10 hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100",
                    )}
                  >
                    <Unplug size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog
        open={isConnectOpen}
        onOpenChange={(open) => {
          if (!connectingPlatform) setIsConnectOpen(open);
        }}
      >
        <DialogContent
          className={cn(
            "border-border text-textPrimary sm:max-w-[560px]",
            settingsTheme.dialog,
          )}
        >
          <DialogHeader>
            <DialogTitle>Connect a social account</DialogTitle>
            <DialogDescription className={settingsTheme.text.secondary}>
              Choose a platform. You will be redirected to Zernio to authorize
              the account, then brought back here.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-2 py-2 sm:grid-cols-3">
            {ZERNIO_PLATFORMS.map((platform) => {
              const Icon = platform.icon;
              const isConnecting = connectingPlatform === platform.id;

              return (
                <button
                  key={platform.id}
                  type="button"
                  onClick={() => handleConnect(platform.id)}
                  disabled={!!connectingPlatform}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-lg border border-border px-3 py-2.5 text-left transition-colors",
                    settingsTheme.card,
                    "hover:border-textSecondary/40 hover:bg-settings-hover disabled:cursor-not-allowed disabled:opacity-60",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                      platform.bg,
                    )}
                  >
                    <Icon size={15} className={platform.color} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-textPrimary">
                    {platform.label}
                  </span>
                  {isConnecting ? (
                    <Loader2
                      size={12}
                      className="animate-spin text-textSecondary"
                    />
                  ) : (
                    <ChevronRight
                      size={12}
                      className="text-textSecondary opacity-0 transition-opacity group-hover:opacity-100"
                    />
                  )}
                </button>
              );
            })}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              className={settingsTheme.button.ghost}
              onClick={() => setIsConnectOpen(false)}
              disabled={!!connectingPlatform}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!disconnectTarget}
        onOpenChange={(open) => {
          if (!open && !isDisconnecting) setDisconnectTarget(null);
        }}
      >
        <AlertDialogContent className={settingsTheme.dialog}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-textPrimary">
              <Unplug size={18} className="text-red-500" />
              Disconnect account
            </AlertDialogTitle>
            <AlertDialogDescription className="text-textSecondary">
              Disconnect{" "}
              <span className="font-medium text-textPrimary">
                {disconnectTarget?.display_name ||
                  disconnectTarget?.username ||
                  disconnectTarget?.platform}
              </span>
              ? Zernio will stop syncing its messages, posts, and analytics, and
              scheduled posts targeting it may be cancelled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className={settingsTheme.button.ghost}
              disabled={isDisconnecting}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                handleDisconnect();
              }}
              className="border-none bg-red-600 text-white hover:bg-red-700"
              disabled={isDisconnecting}
            >
              {isDisconnecting ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={13} className="animate-spin" />
                  Disconnecting
                </span>
              ) : (
                "Disconnect"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const AccountsView = ({
  setActiveTab,
  canManageConfig,
  accessReady,
}: {
  setActiveTab: (t: string) => void;
  canManageConfig?: boolean;
  accessReady?: boolean;
}) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-10">
      <ZernioAccountsSection
        canManageConfig={canManageConfig}
        accessReady={accessReady}
      />

      <div className="space-y-4 pt-8 border-t border-border">
        <h3 className="text-sm font-semibold text-textPrimary">
          {t("settings.settings")}
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div
            onClick={() => setActiveTab("Emails")}
            className={cn(
              "p-4 border border-border rounded-lg hover:border-textSecondary/50 cursor-pointer group transition-colors",
              settingsTheme.surface,
            )}
          >
            <Mail
              size={20}
              className="mb-2 text-textSecondary group-hover:text-textPrimary"
            />
            <div className="font-medium text-sm mb-1">
              {t("settings.emails")}
            </div>
            <div className="text-xs text-textSecondary">
              Set email visibility, manage your blocklist and more.
            </div>
          </div>
          <div
            onClick={() => setActiveTab("Calendars")}
            className={cn(
              "p-4 border border-border rounded-lg hover:border-textSecondary/50 cursor-pointer group transition-colors",
              settingsTheme.surface,
            )}
          >
            <Calendar
              size={20}
              className="mb-2 text-textSecondary group-hover:text-textPrimary"
            />
            <div className="font-medium text-sm mb-1">
              {t("settings.calendars")}
            </div>
            <div className="text-xs text-textSecondary">
              Configure and customize your calendar preferences.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const GeneralWorkspaceView = () => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] relative group">
      <ComingSoonLayer />
      <Empty>
        <EmptyHeader>
          <Settings className="size-12 text-textSecondary mb-4" />
          <EmptyTitle>{t("settings.workspaceSettings")}</EmptyTitle>
          <EmptyDescription>
            {t("settings.workspaceSettingsDesc")}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
};

const DataModelView = () => {
  const { t } = useTranslation();
  return (
    <div className="space-y-6 relative group">
      <ComingSoonLayer />
      <div className="flex items-center gap-2 border-b border-border mb-6">
        <TabButton active label={t("settings.custom")} count={0} />
        <TabButton label={t("settings.standard")} count={21} active={false} />
        <div className="flex-1"></div>
        <button className="flex items-center gap-2 text-xs font-medium text-textSecondary hover:text-textPrimary px-3 py-2">
          <PieChart size={14} /> {t("settings.visualize")}
        </button>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary"
          />
          <input
            className={cn(
              "w-full border border-border rounded py-1.5 pl-9 text-xs text-textPrimary focus:border-accent outline-none",
              settingsTheme.card,
            )}
            placeholder={t("settings.searchObject")}
          />
        </div>
      </div>

      <div className="space-y-0.5">
        <h4 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-2 px-2">
          {t("settings.existingObjects")}
        </h4>
        <DataModelRow icon={Users} label={t("nav.people")} count={15} />
        <DataModelRow icon={Building2} label={t("nav.companies")} count={17} />
        <DataModelRow icon={CheckCircle2} label={t("nav.tasks")} count={8} />
        <DataModelRow icon={Target} label={t("nav.opportunities")} count={12} />
        <DataModelRow icon={FileText} label={t("nav.notes")} count={5} />
        <DataModelRow
          icon={LayoutDashboard}
          label={t("commandMenu.reports")}
          count={6}
        />
        <DataModelRow icon={GitBranch} label={t("nav.workflows")} count={9} />
      </div>
    </div>
  );
};

const MembersView = ({
  initialAccess,
}: {
  initialAccess?: MyPermissionsPayload | null;
}) => {
  const { t } = useTranslation();
  const { user } = useStore();
  const [members, setMembers] = useState<MemberSummary[]>([]);
  const [roles, setRoles] = useState<RoleSummary[]>([]);
  const [myAccess, setMyAccess] = useState<MyPermissionsPayload | null>(
    initialAccess || null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState<string>("");
  const [isInviting, setIsInviting] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [roleUpdates, setRoleUpdates] = useState<Record<string, string>>({});
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  const canManageUsers =
    !!myAccess?.permissions?.includes("*") ||
    !!myAccess?.permissions?.includes("users.manage");

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const promises: Promise<any>[] = [getMyRolePermissions()];

        // Only fetch management data if authorized
        if (canManageUsers) {
          promises.push(getOrgUsers());
          promises.push(getRoles());
        }

        const [myPermissionsResponse, membersResponse, rolesResponse] =
          await Promise.all(promises);

        if (myPermissionsResponse.ok) {
          const accessData = await myPermissionsResponse.json();
          setMyAccess(accessData);
        }

        if (canManageUsers) {
          if (rolesResponse && rolesResponse.ok) {
            const rolesData = await rolesResponse.json();
            const normalizedRoles = Array.isArray(rolesData)
              ? rolesData
              : rolesData.results || [];
            setRoles(normalizedRoles);
            setInviteRoleId(
              normalizedRoles.find(
                (role: RoleSummary) => role.system_key === "member",
              )?.id ||
                normalizedRoles[0]?.id ||
                "",
            );
          }

          if (membersResponse && membersResponse.ok) {
            const membersData = await membersResponse.json();
            setMembers(
              Array.isArray(membersData)
                ? membersData
                : membersData.results || [],
            );
          } else {
            setMembers([]);
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [canManageUsers]);

  const refreshMembers = async () => {
    if (!canManageUsers) return;
    const response = await getOrgUsers();
    if (response.ok) {
      const data = await response.json();
      setMembers(Array.isArray(data) ? data : data.results || []);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail || !inviteRoleId || !canManageUsers) return;
    setIsInviting(true);
    try {
      const response = await createInvitation(
        "TEAM",
        inviteEmail,
        inviteRoleId,
      );
      if (response.ok) {
        const data = await response.json();
        const selectedRole = roles.find(
          (role) => role.id === data.role || role.id === inviteRoleId,
        );
        toast.success(`Invite sent to ${inviteEmail}`);
        setMembers((current) => [
          ...current,
          {
            id: `pending-${data.token}`,
            email: inviteEmail,
            username: inviteEmail.split("@")[0],
            role: selectedRole
              ? {
                  id: selectedRole.id,
                  name: selectedRole.name,
                  system_key: selectedRole.system_key,
                }
              : null,
          },
        ]);
        setInviteEmail("");
      }
    } finally {
      setIsInviting(false);
    }
  };

  const copyInviteLink = async () => {
    if (!inviteRoleId || !canManageUsers) return;
    setIsGeneratingLink(true);
    try {
      const response = await createInvitation("TEAM", undefined, inviteRoleId);
      if (response.ok) {
        const data = await response.json();
        const link = `${window.location.origin}/#/invite/${data.token}`;
        await navigator.clipboard.writeText(link);
        toast.success(t("settings.inviteLinkCopied"));
      }
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleRoleChange = async (member: MemberSummary) => {
    if (!canManageUsers) return;
    const selectedRoleId = roleUpdates[member.id] || member.role?.id;
    if (!selectedRoleId || selectedRoleId === member.role?.id) return;
    setSavingUserId(member.id);
    try {
      const response = await assignRole(member.id, selectedRoleId);
      if (response.ok) {
        await refreshMembers();
        toast.success(`Updated ${getMemberName(member)}'s role`);
        setRoleUpdates((current) => {
          const next = { ...current };
          delete next[member.id];
          return next;
        });
      }
    } finally {
      setInviteEmail("");
      setSavingUserId(null);
    }
  };

  const handleToggleActive = async (member: MemberSummary) => {
    if (!canManageUsers || member.id === user?.id) return;
    setSavingUserId(member.id);
    try {
      const response = await toggleUserActive(member.id);
      if (response.ok) {
        await refreshMembers();
        const data = await response.json();
        toast.success(
          `User ${data.is_active ? "activated" : "deactivated"} successfully`,
        );
      }
    } finally {
      setSavingUserId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-6 max-w-4xl">
        <div>
          <h3 className="text-sm font-semibold text-textPrimary">
            {canManageUsers ? t("settings.peopleWithAccess") : t("settings.yourAccess")}
          </h3>
          <p className="text-xs text-textSecondary mt-1">
            {canManageUsers
              ? t("settings.peopleWithAccessDesc")
              : t("settings.yourAccessDesc")}
          </p>
        </div>
        {myAccess?.role && (
          <div
            className={cn(
              "rounded-xl border border-border px-4 py-3 min-w-[220px]",
              settingsTheme.card,
            )}
          >
            <div className="text-[11px] uppercase tracking-[0.18em] text-textSecondary">
              {t("settings.yourRole")}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Shield
                size={14}
                className={
                  SYSTEM_ROLE_ACCENTS[myAccess.role.system_key || "member"] ||
                  "text-blue-400"
                }
              />
              <span className="text-sm font-medium text-textPrimary">
                {myAccess.role.name}
              </span>
            </div>
            <div className="mt-2 text-xs text-textSecondary">
              {t("settings.permissionsActive", {
                count: myAccess.permissions.length,
                plural: myAccess.permissions.length === 1 ? "" : "s",
              })}
            </div>
          </div>
        )}
      </div>

      {!canManageUsers && myAccess && (
        <div className="space-y-8 pt-6 border-t border-border max-w-4xl">
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-textPrimary">
              {t("settings.activePermissions")}
            </h4>
            {myAccess.permissions.includes("*") ? (
              <div
                className={cn(
                  "px-4 py-3 rounded-lg border border-blue-500/30 bg-blue-500/5 text-sm flex items-center gap-3",
                  settingsTheme.card,
                )}
              >
                <ShieldCheck size={18} className="text-blue-500" />
                <span className="text-textPrimary font-medium">
                  {t("settings.fullAccess")}
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {myAccess.permissions.map((perm) => (
                  <div
                    key={perm}
                    className={cn(
                      "px-3 py-2 rounded-lg border border-border text-xs flex items-center gap-2",
                      settingsTheme.card,
                    )}
                  >
                    <CheckCircle2 size={12} className="text-green-500" />
                    <span className="text-textSecondary font-mono">{perm}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {canManageUsers && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
            <div
              className={cn(
                "space-y-4 p-4 border border-border rounded-xl",
                settingsTheme.card,
              )}
            >
              <div className="flex items-center gap-2 text-sm font-semibold">
                <LinkIcon size={16} className="text-blue-500" />
                {t("settings.inviteByLink")}
              </div>
              <p className="text-xs text-textSecondary">
                {t("settings.inviteByLinkDesc")}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-[1.5fr_1fr_auto] gap-2">
                <div
                  className={cn(
                    "border border-border rounded px-3 py-1.5 text-[11px] text-textSecondary truncate font-mono h-8 flex items-center",
                    settingsTheme.inputAlt,
                  )}
                >
                  {inviteRoleId
                    ? `#/invite/[${roles.find((role) => role.id === inviteRoleId)?.name || "Member"}]`
                    : "Select a role first"}
                </div>
                <select
                  value={inviteRoleId}
                  onChange={(e) => setInviteRoleId(e.target.value)}
                  className={cn(
                    "h-8 rounded-md border border-border px-3 text-xs text-textPrimary outline-none",
                    settingsTheme.inputAlt,
                  )}
                  disabled={!canManageUsers}
                >
                  {roles
                    .filter((r) => r.system_key !== "owner")
                    .map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                </select>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={copyInviteLink}
                  disabled={
                    !canManageUsers || !inviteRoleId || isGeneratingLink
                  }
                >
                  {isGeneratingLink ? "..." : t("invite.copy")}
                </Button>
              </div>
            </div>

            {/*
            <div
              className={cn(
                "space-y-4 p-4 border border-border rounded-xl",
                settingsTheme.card,
              )}
            >
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Mail size={16} className="text-purple-500" />
                {t("settings.inviteByEmail")}
              </div>
              <p className="text-xs text-textSecondary">
                {t("settings.inviteByEmailDesc")}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-[1.5fr_1fr_auto] gap-2">
                <Input
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className={cn(
                    "border-border h-8 text-xs",
                    settingsTheme.inputAlt,
                  )}
                  placeholder="team@example.com"
                />
                <select
                  value={inviteRoleId}
                  onChange={(e) => setInviteRoleId(e.target.value)}
                  className={cn(
                    "h-8 rounded-md border border-border px-3 text-xs text-textPrimary outline-none",
                    settingsTheme.inputAlt,
                  )}
                  disabled={!canManageUsers}
                >
                  {roles
                    .filter((r) => r.system_key !== "owner")
                    .map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                </select>
                <Button
                  size="sm"
                  className="h-8 bg-secondary hover:bg-secondary/80 text-secondary-foreground"
                  onClick={handleInvite}
                  disabled={
                    !canManageUsers ||
                    isInviting ||
                    !inviteEmail ||
                    !inviteRoleId
                  }
                >
                  {isInviting ? "..." : t("settings.invite")}
                </Button>
              </div>
            </div>
            */}
          </div>

          <div className="space-y-4 pt-6 border-t border-border max-w-5xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-textPrimary">
                {t("settings.manageMembers")}
              </h3>
              <Badge
                variant="outline"
                className="text-[10px] uppercase font-bold tracking-wider"
              >
                {members.length} {t("settings.total")}
              </Badge>
            </div>

            <div
              className={cn(
                "rounded-xl border border-border overflow-hidden",
                settingsTheme.card,
              )}
            >
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr
                    className={cn(
                      "border-b border-border",
                      settingsTheme.inputAlt,
                    )}
                  >
                    <th className="px-4 py-3 text-[11px] font-bold text-textSecondary uppercase tracking-wider">
                      {t("dataTable.name")}
                    </th>
                    <th className="px-4 py-3 text-[11px] font-bold text-textSecondary uppercase tracking-wider">
                      {t("dataTable.email")}
                    </th>
                    <th className="px-4 py-3 text-[11px] font-bold text-textSecondary uppercase tracking-wider">
                      {t("settings.role")}
                    </th>
                    <th className="px-4 py-3 text-[11px] font-bold text-textSecondary uppercase tracking-wider">
                      {t("dataTable.status")}
                    </th>
                    <th className="px-4 py-3 text-[11px] font-bold text-textSecondary uppercase tracking-wider text-end">
                      {t("reports.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-10 text-center text-sm text-textSecondary"
                      >
                        {t("settings.loadingMembers")}
                      </td>
                    </tr>
                  ) : members.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-10 text-center text-sm text-textSecondary"
                      >
                        {t("settings.noMembersFound")}
                      </td>
                    </tr>
                  ) : (
                    members.map((member) => (
                      <tr
                        key={member.id}
                        className="border-b border-border/50 hover:bg-settings-hover transition-colors group"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-lg shrink-0">
                              {getMemberName(member).charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-textPrimary">
                                {getMemberName(member)}
                              </div>
                              {member.id === user?.id && (
                                <div className="text-[11px] text-textSecondary">
                                  {t("settings.you")}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-textSecondary">
                          {member.email}
                        </td>
                        <td className="px-4 py-3">
                          {canManageUsers ? (
                            <div className="flex items-center gap-2">
                              <select
                                value={
                                  roleUpdates[member.id] ||
                                  member.role?.id ||
                                  ""
                                }
                                onChange={(e) =>
                                  setRoleUpdates((current) => ({
                                    ...current,
                                    [member.id]: e.target.value,
                                  }))
                                }
                                disabled={member.role?.system_key === "owner"}
                                className={cn(
                                  "h-8 min-w-[140px] rounded-md border border-border px-2 text-xs text-textPrimary outline-none",
                                  settingsTheme.inputAlt,
                                  member.role?.system_key === "owner" && "opacity-70 cursor-not-allowed"
                                )}
                              >
                                {roles
                                  .filter((r) => r.system_key !== "owner" || member.role?.system_key === "owner")
                                  .map((role) => (
                                    <option key={role.id} value={role.id}>
                                      {role.name}
                                    </option>
                                  ))}
                              </select>
                              {roleUpdates[member.id] &&
                                roleUpdates[member.id] !== member.role?.id && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-[11px]"
                                    onClick={() => handleRoleChange(member)}
                                    disabled={savingUserId === member.id}
                                  >
                                    {savingUserId === member.id
                                      ? t("settings.savingRole")
                                      : t("common.save")}
                                  </Button>
                                )}
                            </div>
                          ) : (
                            <Badge
                              variant="ghost"
                              className={cn(
                                "text-[11px] h-5",
                                settingsTheme.quaternaryBg,
                                settingsTheme.text.primary,
                              )}
                            >
                              {member.role?.name || t("contextDrawer.notSet")}
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <div
                              className={`w-1.5 h-1.5 rounded-full ${String(member.id).startsWith("pending-") ? "bg-yellow-500 animate-pulse" : member.is_active ? "bg-green-500" : "bg-red-500"}`}
                            />
                            <span className="text-xs text-textSecondary">
                              {String(member.id).startsWith("pending-")
                                ? t("settings.pendingInvite")
                                : member.is_active
                                  ? t("settings.active")
                                  : t("settings.deactivated")}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-end">
                          {canManageUsers &&
                            !String(member.id).startsWith("pending-") &&
                            member.id !== user?.id &&
                            member.role?.system_key !== "owner" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleToggleActive(member)}
                                disabled={savingUserId === member.id}
                                className={cn(
                                  "h-7 text-[11px] font-semibold flex items-center gap-2 ltr:ml-auto rtl:mr-auto",
                                  member.is_active
                                    ? "text-red-500 hover:text-red-400 hover:bg-red-500/10"
                                    : "text-green-500 hover:text-green-400 hover:bg-green-500/10",
                                )}
                              >
                                {savingUserId === member.id ? (
                                  <RefreshCw size={12} className="animate-spin" />
                                ) : member.is_active ? (
                                  <>
                                    <Ban size={12} />
                                    {t("common.deactivate")}
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 size={12} />
                                    {t("common.activate")}
                                  </>
                                )}
                              </Button>
                            )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const BillingView = () => {
  const { t } = useTranslation();
  const { setProModalOpen } = useStore();

  return (
    <div className="space-y-10 relative group">
      <ComingSoonLayer />
      {/* Current Plan Card (Trial Style) */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-textPrimary">
          {t("settings.subscription")}
        </h3>
        <p className="text-xs text-textSecondary -mt-3 mb-4">
          {t("settings.aboutSubscription")}
        </p>

        {/* User liked this card style */}
        <div className="bg-gradient-to-r from-accent/20 to-purple-500/10 border border-accent/20 rounded-xl p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-bold text-textPrimary">
                {t("settings.proPlan")}
              </h3>
              <div className="text-sm text-textSecondary font-medium flex items-center gap-2 mt-1">
                <Badge className="bg-blue-600/10 text-blue-500 border-blue-500/20 px-2 py-0">
                  {t("settings.trial")}
                </Badge>
                {t("settings.billedMonthly")}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-textPrimary">$0</div>
              <div className="text-xs text-textSecondary font-medium">
                {t("settings.nextInvoice", { date: "Jan 22, 2026" })}
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Details Table-like card */}
        <div
          className={cn(
            "border border-border rounded-xl p-4 space-y-4",
            settingsTheme.card,
          )}
        >
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-3 text-textSecondary">
              <Tag size={16} />
              <span>{t("settings.plan")}</span>
            </div>
            <div className="flex gap-2">
              <Badge className="bg-blue-600/20 text-blue-400 border-none">
                Pro
              </Badge>
              <Badge className="bg-blue-600/20 text-blue-400 border-none">
                {t("settings.trial")}
              </Badge>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-3 text-textSecondary">
              <Calendar size={16} />
              <span>{t("settings.billingInterval")}</span>
            </div>
            <span className="font-medium">{t("settings.billedMonthly")}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-3 text-textSecondary">
              <RefreshCw size={16} />
              <span>{t("settings.renewalDate")}</span>
            </div>
            <span className="font-medium">{t("preSales.today")}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-3 text-textSecondary">
              <Users size={16} />
              <span>{t("settings.seats")}</span>
            </div>
            <span className="font-medium">1</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-3 text-textSecondary">
              <Database size={16} />
              <span>{t("settings.creditsByPeriod")}</span>
            </div>
            <span className="font-medium">5M</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-6">
          <Button
            variant="outline"
            className={cn(
              "h-9 gap-2 border-border hover:bg-[#252525]",
              settingsTheme.card,
            )}
          >
            <ArrowUpCircle size={14} className="rotate-45" />
            {t("settings.subscribeNow")}
          </Button>
          <Button
            variant="outline"
            className={cn(
              "h-9 gap-2 border-border hover:bg-[#252525]",
              settingsTheme.card,
            )}
          >
            <ArrowUpCircle size={14} className="rotate-45" />
            {t("settings.switchToYearly")}
          </Button>
          <Button
            variant="outline"
            className={cn(
              "h-9 gap-2 border-border hover:bg-[#252525]",
              settingsTheme.card,
            )}
          >
            <ArrowUpCircle size={14} className="rotate-45" />
            {t("settings.switchToOrganization")}
          </Button>
        </div>
      </div>

      {/* Credit Usage */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-textPrimary">
          {t("settings.creditUsage")}
        </h3>
        <p className="text-xs text-textSecondary -mt-3 mb-4">
          {t("settings.creditUsageDesc")}
        </p>

        <div
          className={cn(
            "border border-border rounded-xl p-5",
            settingsTheme.card,
          )}
        >
          <div className="flex justify-between items-end mb-3">
            <span className="text-xs font-semibold text-textSecondary">
              {t("settings.creditsUsed")}
            </span>
            <span className="text-xs font-bold text-textPrimary">0/500k</span>
          </div>
          <div
            className={cn(
              "w-full h-2 rounded-full overflow-hidden",
              settingsTheme.borderAlt,
            )}
          >
            <div className="w-[2%] h-full bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
          </div>
        </div>
      </div>

      {/* Credit Plan */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-textPrimary">
          {t("settings.creditPlan")}
        </h3>
        <p className="text-xs text-textSecondary -mt-3 mb-4">
          {t("settings.creditPlanDesc")}
        </p>

        <div className="max-w-md space-y-2">
          <div className="relative">
            <select
              className={cn(
                "w-full border border-border rounded-lg px-4 py-2.5 text-sm appearance-none focus:outline-none focus:ring-1 focus:ring-accent",
                settingsTheme.card,
              )}
            >
              <option>5M Credits - $0</option>
              <option>10M Credits - $50</option>
              <option>25M Credits - $100</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-textSecondary">
              <ChevronDown size={16} />
            </div>
          </div>
          <p className="text-[11px] text-textSecondary pl-1">
            {t("settings.startSubscriptionFirst")}
          </p>
        </div>
      </div>

      {/* Manage billing information */}
      <div className="space-y-4 pt-6 border-t border-border">
        <h3 className="text-sm font-semibold text-textPrimary">
          {t("settings.manageBillingInfo")}
        </h3>
        <p className="text-xs text-textSecondary -mt-3 mb-4">
          {t("settings.manageBillingInfoDesc")}
        </p>
        <Button
          variant="outline"
          className={cn(
            "h-9 gap-2 border-border hover:bg-[#252525]",
            settingsTheme.card,
          )}
        >
          <CreditCard size={14} />
          {t("settings.viewBillingDetails")}
        </Button>
      </div>

      {/* Cancel subscription */}
      <div className="space-y-4 pt-6 border-t border-border">
        <h3 className="text-sm font-semibold text-textPrimary text-red-500">
          {t("settings.cancelSubscription")}
        </h3>
        <p className="text-xs text-textSecondary -mt-3 mb-4">
          {t("settings.cancelSubscriptionDesc")}
        </p>
        <Button
          variant="outline"
          className={cn(
            "h-9 gap-2 border-red-500/30 text-red-500 hover:bg-red-500/10 hover:border-red-500/50",
            settingsTheme.card,
          )}
        >
          <X size={14} className="border border-current rounded-full p-0.5" />
          {t("settings.cancelPlan")}
        </Button>
      </div>
    </div>
  );
};

const SecurityView = () => {
  const { t } = useTranslation();
  return (
    <div className="space-y-8 relative group">
      <ComingSoonLayer />
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-textPrimary">
          {t("settings.sso")}
        </h3>
        <div
          className={cn(
            "flex items-center justify-between p-3 border border-border rounded",
            settingsTheme.card,
          )}
        >
          <div className="flex items-center gap-3">
            <ShieldCheck size={18} className="text-accent" />
            <div>
              <div className="text-sm font-medium">{t("settings.addSso")}</div>
              <div className="text-xs text-textSecondary">
                {t("settings.enterpriseFeature")}
              </div>
            </div>
          </div>
          <Lock size={14} className="text-textSecondary" />
        </div>
      </div>

      <div className="space-y-4 pt-6 border-t border-border">
        <h3 className="text-sm font-semibold text-textPrimary">
          {t("settings.authentication")}
        </h3>
        <p className="text-xs text-textSecondary -mt-3">
          {t("settings.securitySettingsDesc")}
        </p>

        <ToggleRow
          label={t("settings.googleSignIn")}
          desc={t("settings.googleSignInDesc")}
          checked
        />
        <ToggleRow
          label={t("auth.password")}
          desc={t("settings.passwordDesc")}
          checked
        />
        <ToggleRow
          label={t("settings.inviteByLinkToggle")}
          desc={t("settings.inviteByLinkToggleDesc")}
          checked
        />
      </div>
    </div>
  );
};

const IntegrationsView = () => {
  const { t } = useTranslation();
  return (
    <div className="space-y-6 relative group">
      <ComingSoonLayer />
      <div className="grid gap-4">
        <IntegrationRow
          icon={Zap}
          name="Zapier"
          desc="Post to Slack when a company is updated"
          count={5}
        />
        <IntegrationRow
          icon={Calendar}
          name="Cal.com"
          desc="Create a person when a Cal.com event is created"
          count={20}
        />
        <IntegrationRow
          icon={Mail}
          name="MailChimp"
          desc="Create a person when a MailChimp sub is created"
          count={20}
        />
        <IntegrationRow
          icon={Type}
          name="Tally"
          desc="Create a company when a Tally form is sent"
          count={20}
        />
      </div>

      <div className="pt-8 mt-4 border-t border-border">
        <div
          className={cn(
            "border border-border rounded-xl p-6 flex flex-col items-center text-center",
            settingsTheme.card,
          )}
        >
          <GitBranch size={32} className="text-textSecondary mb-4" />
          <h3 className="text-sm font-semibold text-textPrimary mb-2">
            {t("settings.requestIntegration")}
          </h3>
          <p className="text-xs text-textSecondary mb-6 max-w-xs">
            {t("settings.requestIntegrationDesc")}
          </p>
          <Button variant="outline" className="gap-2">
            <ExternalLink size={14} /> {t("settings.goToGithub")}
          </Button>
        </div>
      </div>
    </div>
  );
};

const AgentsView = () => {
  const { t } = useTranslation();
  const [hasTelegramCredential, setHasTelegramCredential] = useState(false);
  const [isLoadingCredential, setIsLoadingCredential] = useState(true);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);

  useEffect(() => {
    checkTelegramCredential();
  }, []);

  const checkTelegramCredential = async () => {
    setIsLoadingCredential(true);
    try {
      const response = await hasCredential();
      if (response.ok) {
        const data = await response.json();
        setHasTelegramCredential(data.has_credential);
      }
    } catch (error) {
      console.error("Failed to check credential:", error);
    } finally {
      setIsLoadingCredential(false);
    }
  };

  const handleSetupComplete = () => {
    setHasTelegramCredential(true);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-textPrimary">
          {t("settings.agents")}
        </h3>
        <p className="text-xs text-textSecondary -mt-3">
          {t("settings.agentsDesc")}
        </p>
      </div>

      <div
        className={cn(
          "border border-border rounded-xl overflow-hidden",
          settingsTheme.card,
        )}
      >
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Bot size={20} className="text-white" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-textPrimary">
                {t("settings.telegramAgent")}
              </div>
              <div className="text-xs text-textSecondary">
                {t("settings.telegramAgentDesc")}
              </div>
            </div>
            {isLoadingCredential ? (
              <div className="text-xs text-textSecondary">
                {t("common.loading")}
              </div>
            ) : hasTelegramCredential ? (
              <div className="flex items-center gap-2">
                <Badge className="bg-green-500/20 text-green-500 border-none text-xs">
                  <Check size={12} className="mr-1" />
                  {t("settings.configured")}
                </Badge>
                <Button
                  size="sm"
                  className="text-xs bg-secondary hover:bg-secondary/80 text-secondary-foreground"
                  onClick={() =>
                    window.open("https://t.me/founderstackbot", "_blank")
                  }
                >
                  {t("settings.letsChat")}
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="text-xs bg-secondary hover:bg-secondary/80 text-secondary-foreground"
                onClick={() => setIsSetupModalOpen(true)}
              >
                {t("settings.setupAgent")}
              </Button>
            )}
          </div>
        </div>
      </div>

      <ConnectTelegramModal
        isOpen={isSetupModalOpen}
        onOpenChange={setIsSetupModalOpen}
        onSuccess={handleSetupComplete}
      />
    </div>
  );
};

// --- Simple Placeholder Views ---
const EmailsView = () => {
  const { t } = useTranslation();
  const [isSmtpDialogOpen, setIsSmtpDialogOpen] = useState(false);
  const [useTls, setUseTls] = useState(true);

  return (
    <div className="space-y-4 relative group">
      <ComingSoonLayer />
      <h3 className="text-sm font-semibold text-textPrimary">
        {t("settings.newAccount")}
      </h3>
      <p className="text-xs text-textSecondary -mt-3">
        {t("settings.connectNewAccount")}
      </p>
      <div className="space-y-2">
        <AccountRow
          icon={Mail}
          label="Connect with Google"
          color={settingsTheme.accountIcon}
        />
        <AccountRow
          icon={Monitor}
          label={t("settings.connectSmtp")}
          color="text-textSecondary"
          onClick={() => setIsSmtpDialogOpen(true)}
        />
      </div>

      <Dialog open={isSmtpDialogOpen} onOpenChange={setIsSmtpDialogOpen}>
        <DialogContent
          className={cn(
            "border-border text-textPrimary sm:max-w-[500px] max-h-[90vh] overflow-y-auto",
            settingsTheme.dialog,
          )}
        >
          <DialogHeader>
            <DialogTitle>{t("settings.connectExistingAccounts")}</DialogTitle>
            <DialogDescription className={settingsTheme.text.secondary}>
              {t("settings.connectImapSmtp")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">{t("contextDrawer.emails")}</Label>
                <Input
                  id="email"
                  placeholder="e.g. omar@company.com"
                  className={cn(
                    settingsTheme.border.primary,
                    settingsTheme.inputAlt,
                  )}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sendername">{t("settings.senderName")}</Label>
                <Input
                  id="sendername"
                  placeholder="e.g. Omar"
                  className={cn(
                    settingsTheme.border.primary,
                    settingsTheme.inputAlt,
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="dailyLimit">{t("settings.dailyLimit")}</Label>
                <Input
                  id="dailyLimit"
                  type="number"
                  placeholder="200"
                  className={cn(
                    settingsTheme.border.primary,
                    settingsTheme.inputAlt,
                  )}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="minWait">{t("settings.minWait")}</Label>
                <Input
                  id="minWait"
                  type="number"
                  placeholder="60"
                  className={cn(
                    settingsTheme.border.primary,
                    settingsTheme.inputAlt,
                  )}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-border space-y-4">
              <h4 className="text-sm font-semibold">
                {t("settings.smtpSettings")}
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="smtpport">{t("settings.smtpPort")}</Label>
                  <Input
                    id="smtpport"
                    placeholder="587"
                    className={cn(
                      settingsTheme.border.primary,
                      settingsTheme.inputAlt,
                    )}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="smtppassword">
                    {t("settings.smtpPassword")}
                  </Label>
                  <Input
                    id="smtppassword"
                    type="password"
                    className={cn(
                      settingsTheme.border.primary,
                      settingsTheme.inputAlt,
                    )}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm font-medium">
                    {t("settings.useTls")}
                  </div>
                  <div className="text-xs text-textSecondary">
                    {t("settings.recommendedSecure")}
                  </div>
                </div>
                <div
                  className={`w-8 h-4 rounded-full p-0.5 cursor-pointer ${useTls ? "bg-accent" : "bg-[#333]"}`}
                  onClick={() => setUseTls(!useTls)}
                >
                  <div
                    className={`w-3 h-3 bg-white rounded-full shadow-sm transform transition-transform ${useTls ? "translate-x-4" : "translate-x-0"}`}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="defaultTls">{t("settings.defaultTls")}</Label>
                <Input
                  id="defaultTls"
                  placeholder="TLSv1.2"
                  className={cn(
                    settingsTheme.border.primary,
                    settingsTheme.inputAlt,
                  )}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsSmtpDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button className="bg-secondary hover:bg-secondary/80 text-secondary-foreground">
              {t("settings.connectAccount")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const CalendarsView = () => {
  const { t } = useTranslation();
  return (
    <div className="space-y-4 relative group">
      <ComingSoonLayer />
      <h3 className="text-sm font-semibold text-textPrimary">
        {t("settings.newAccount")}
      </h3>
      <p className="text-xs text-textSecondary -mt-3">
        {t("settings.connectNewAccount")}
      </p>
      <div className="space-y-2">
        <AccountRow
          icon={Mail}
          label="Connect with Google"
          color={settingsTheme.accountIcon}
        />
      </div>
    </div>
  );
};
const MarkdownLite = ({ content }: { content: string }) => {
  const lines = content.split("\n");
  return (
    <div className="space-y-3" dir="auto">
      {lines.map((line, i) => {
        if (line.startsWith("# ")) {
          return (
            <h1 key={i} className={cn("text-xl font-bold mt-6 mb-4", settingsTheme.text.primary)}>
              {line.replace("# ", "")}
            </h1>
          );
        }
        if (line.startsWith("## ")) {
          return (
            <h2
              key={i}
              className={cn("text-lg font-bold mt-5 mb-3 border-b pb-1", settingsTheme.text.primary, settingsTheme.border.primary)}
            >
              {line.replace("## ", "")}
            </h2>
          );
        }
        if (line.startsWith("### ")) {
          return (
            <h3 key={i} className={cn("text-md font-bold mt-4 mb-2", settingsTheme.text.primary)}>
              {line.replace("### ", "")}
            </h3>
          );
        }
        if (line.startsWith("- ")) {
          return (
            <li key={i} className={cn("ltr:ml-4 rtl:mr-4 list-disc text-sm", settingsTheme.text.secondary)}>
              {line.replace("- ", "")}
            </li>
          );
        }
        if (line.trim() === "") {
          return <div key={i} className="h-1" />;
        }
        return (
          <p key={i} className={cn("text-sm leading-relaxed", settingsTheme.text.secondary)}>
            {line}
          </p>
        );
      })}
    </div>
  );
};

const RolesHelpDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const { t, dir } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-w-3xl max-h-[80vh] overflow-y-auto custom-scrollbar",
          settingsTheme.dialog,
        )}
      >
        <DialogHeader>
          <DialogTitle>{t("settings.roleGuideTitle")}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <MarkdownLite content={t("settings.rbacDoc")} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

const RolesView = ({
  initialAccess,
}: {
  initialAccess?: MyPermissionsPayload | null;
}) => {
  const { t } = useTranslation();
  const [roles, setRoles] = useState<RoleSummary[]>([]);
  const [myAccess, setMyAccess] = useState<MyPermissionsPayload | null>(
    initialAccess || null,
  );
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [draft, setDraft] = useState<{
    id?: string;
    name: string;
    permissions: string[];
    hidden_fields: Record<string, string[]>;
    is_system?: boolean;
    system_key?: string | null;
  }>({
    name: "",
    permissions: [],
    hidden_fields: {},
  });

  const canManageRoles =
    !!myAccess?.permissions?.includes("*") ||
    !!myAccess?.permissions?.includes("roles.manage");

  const loadRoles = async () => {
    setIsLoading(true);
    try {
      const promises: Promise<any>[] = [getMyRolePermissions()];
      if (canManageRoles) {
        promises.push(getRoles());
      }

      const [myPermissionsResponse, rolesResponse] =
        await Promise.all(promises);

      if (myPermissionsResponse.ok) {
        setMyAccess(await myPermissionsResponse.json());
      }

      if (canManageRoles && rolesResponse && rolesResponse.ok) {
        const rolesData = await rolesResponse.json();
        const normalizedRoles = Array.isArray(rolesData)
          ? rolesData
          : rolesData.results || [];
        setRoles(normalizedRoles);
        const initialRoleId = selectedRoleId || normalizedRoles[0]?.id || "";
        setSelectedRoleId(initialRoleId);
        const selectedRole =
          normalizedRoles.find(
            (role: RoleSummary) => role.id === initialRoleId,
          ) || normalizedRoles[0];
        if (selectedRole) {
          setDraft({
            id: selectedRole.id,
            name: selectedRole.name,
            permissions: selectedRole.permissions || [],
            hidden_fields: selectedRole.hidden_fields || {},
            is_system: selectedRole.is_system,
            system_key: selectedRole.system_key,
          });
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, [canManageRoles]);

  useEffect(() => {
    const selectedRole = roles.find((role) => role.id === selectedRoleId);
    if (!selectedRole) return;
    setDraft({
      id: selectedRole.id,
      name: selectedRole.name,
      permissions: selectedRole.permissions || [],
      hidden_fields: selectedRole.hidden_fields || {},
      is_system: selectedRole.is_system,
      system_key: selectedRole.system_key,
    });
  }, [selectedRoleId, roles]);

  const filteredRoles = roles.filter((role) =>
    `${role.name} ${role.system_key || ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  const selectedRole = roles.find((role) => role.id === selectedRoleId);

  const hasUnsavedChanges = selectedRole && (
    draft.name !== selectedRole.name ||
    JSON.stringify(draft.permissions.sort()) !== JSON.stringify((selectedRole.permissions || []).sort()) ||
    JSON.stringify(draft.hidden_fields) !== JSON.stringify(selectedRole.hidden_fields || {})
  );

  const [pendingRoleId, setPendingRoleId] = useState<string | null>(null);

  const handleRoleSwitch = (roleId: string) => {
    if (roleId === selectedRoleId) return;
    if (hasUnsavedChanges) {
      setPendingRoleId(roleId);
    } else {
      setSelectedRoleId(roleId);
    }
  };

  const togglePermission = (permission: string) => {
    setDraft((current) => ({
      ...current,
      permissions: current.permissions.includes(permission)
        ? current.permissions.filter((item) => item !== permission)
        : [...current.permissions, permission],
    }));
  };

  const toggleHiddenField = (entity: string, field: string) => {
    setDraft((current) => {
      const currentFields = current.hidden_fields[entity] || [];
      const nextFields = currentFields.includes(field)
        ? currentFields.filter((item) => item !== field)
        : [...currentFields, field];
      return {
        ...current,
        hidden_fields: {
          ...current.hidden_fields,
          [entity]: nextFields,
        },
      };
    });
  };

  const handleCreateRole = async () => {
    if (!draft.name.trim()) {
      toast.error("Role name is required");
      return;
    }
    setIsCreating(true);
    try {
      const response = await createRole({
        name: draft.name.trim(),
        permissions: draft.permissions,
        hidden_fields: draft.hidden_fields,
      });
      if (response.ok) {
        const created = await response.json();
        await loadRoles();
        setSelectedRoleId(created.id);
        toast.success("Role created");
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleSaveRole = async () => {
    if (!draft.id) return;
    setIsSaving(true);
    try {
      const response = await updateRole(draft.id, {
        name: draft.name.trim(),
        permissions: draft.permissions,
        hidden_fields: draft.hidden_fields,
      });
      if (response.ok) {
        await loadRoles();
        toast.success("Role updated");
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (!canManageRoles && !isLoading) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-border p-6 space-y-4",
          settingsTheme.card,
        )}
      >
        <div className="flex items-center gap-3">
          <ShieldCheck size={18} className="text-blue-400" />
          <div>
            <h3 className="text-sm font-semibold text-textPrimary">
              {t("settings.roleAccessRestricted")}
            </h3>
            <p className="text-xs text-textSecondary mt-1">
              {t("settings.roleAccessRestrictedDesc")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-textPrimary">
              {t("settings.roles")}
            </h3>
            <button
              onClick={() => setIsHelpOpen(true)}
              className="p-1 hover:bg-settings-hover rounded-full transition-colors text-textSecondary hover:text-textPrimary"
              title={t("settings.roleGuideTooltip")}
            >
              <HelpCircle size={14} />
            </button>
          </div>
          <p className="text-xs text-textSecondary mt-1">
            {t("settings.roleTemplatesDesc")}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-2"
          onClick={() => {
            setSelectedRoleId("");
            setDraft({
              name: "",
              permissions: ["people.read", "companies.read", "tasks.read"],
              hidden_fields: {},
            });
          }}
        >
          <Plus size={14} />
          {t("settings.newRole")}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-6">
        <div
          className={cn(
            "rounded-2xl border border-border overflow-hidden",
            settingsTheme.card,
          )}
        >
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search
                size={14}
                className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 text-textSecondary"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={cn(
                  "w-full rounded-md border border-border ltr:pl-9 ltr:pr-3 rtl:pr-9 rtl:pl-3 py-2 text-sm text-textPrimary outline-none",
                  settingsTheme.input,
                )}
                placeholder={t("settings.roles")}
              />
            </div>
          </div>
          <div className="p-2 space-y-2">
            {isLoading ? (
              <div className="px-3 py-8 text-sm text-textSecondary text-center">
                {t("common.loading")}
              </div>
            ) : (
              filteredRoles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => handleRoleSwitch(role.id)}
                  className={cn(
                    "w-full text-left rtl:text-right rounded-lg border px-3 py-2.5 transition-colors group/role",
                    settingsTheme.card,
                    selectedRoleId === role.id
                      ? "border-blue-500/40"
                      : "border-transparent hover:bg-settings-hover",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Shield
                        size={16}
                        className={cn(
                          "transition-colors",
                          selectedRoleId === role.id
                            ? "text-blue-500"
                            : SYSTEM_ROLE_ACCENTS[
                                role.system_key || "member"
                              ] || "text-textSecondary",
                        )}
                      />
                      <div>
                        <div
                          className={cn(
                            "text-sm font-medium transition-colors",
                            selectedRoleId === role.id
                              ? "text-textPrimary"
                              : "text-textSecondary group-hover/role:text-textPrimary",
                          )}
                        >
                          {role.name}
                        </div>
                        <div className="text-[11px] text-textSecondary/60 uppercase">
                          {role.system_key ? role.system_key : "CUSTOM"}
                        </div>
                      </div>
                    </div>
                    <div
                      className={cn(
                        "min-w-[24px] h-6 rounded border flex items-center justify-center text-[11px] font-bold tabular-nums",
                        selectedRoleId === role.id
                          ? "border-blue-500/40 text-textPrimary"
                          : "border-border text-textSecondary",
                      )}
                    >
                      {role.assigned_users_count || 0}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div
          className={cn(
            "rounded-2xl border border-border p-5 space-y-6 relative",
            settingsTheme.card,
          )}
        >
          {hasUnsavedChanges && (
            <div className="absolute top-0 left-0 right-0 -translate-y-full pb-2 flex items-center justify-center gap-2 text-red-500 animate-pulse font-medium">
              <AlertTriangle size={14} />
              <span className="text-[11px] uppercase tracking-wider">
                {t("settings.unsavedChangesWarning")}
              </span>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
            <div className="space-y-2">
              <Label className="text-xs text-textSecondary">
                {t("settings.roleName")}
              </Label>
              <Input
                value={draft.name}
                onChange={(e) =>
                  setDraft((current) => ({ ...current, name: e.target.value }))
                }
                className={cn("border-border", settingsTheme.input)}
                placeholder={t("settings.roleNamePlaceholder")}
              />
            </div>
            <div className="flex flex-wrap gap-2 pt-6">
              {draft.system_key && (
                <div className="px-2 py-0.5 rounded border border-border text-[10px] text-textSecondary uppercase">
                  {draft.system_key}
                </div>
              )}
              {draft.is_system && (
                <div className="px-2 py-0.5 rounded border border-border text-[10px] text-textSecondary uppercase">
                  {t("settings.systemRole")}
                </div>
              )}
            </div>
          </div>

          {draft.system_key === "owner" ? (
            <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center">
                <ShieldCheck size={32} className="text-blue-500" />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-semibold text-textPrimary">
                  {t("settings.workspaceOwner")}
                </h4>
                <p className="text-sm text-textSecondary max-w-xs mx-auto">
                  {t("settings.workspaceOwnerDesc")}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-10">
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-textPrimary">
                    {t("settings.permissionMatrix")}
                  </h4>
                  <p className="text-xs text-textSecondary">
                    {t("settings.permissionMatrixDesc")}
                  </p>
                </div>
                <div className="space-y-12">
                  {ROLE_PERMISSION_GROUPS.map((group) => (
                    <div key={group.label} className="space-y-3">
                      <div className="text-xs font-semibold text-textSecondary px-1">
                        {group.label}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {group.permissions.map((permission) => {
                          const checked =
                            draft.permissions.includes(permission) ||
                            draft.permissions.includes("*");
                          return (
                            <label
                              key={permission}
                              className={cn(
                                "flex items-center justify-between rounded-lg border px-3 py-3 text-xs transition-colors cursor-pointer select-none",
                                settingsTheme.card,
                                checked
                                  ? "border-blue-500/40 text-textPrimary"
                                  : "border-border text-textSecondary hover:bg-settings-hover",
                              )}
                            >
                              <span>{permission}</span>
                              <div
                                className={cn(
                                  "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                                  checked
                                    ? "bg-blue-500/70 border-blue-500/50"
                                    : "border-border bg-transparent",
                                )}
                              >
                                {checked && (
                                  <Check
                                    size={10}
                                    className="text-white"
                                    strokeWidth={3}
                                  />
                                )}
                              </div>
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={draft.permissions.includes("*")}
                                onChange={() => togglePermission(permission)}
                                className="hidden"
                              />
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-10 pt-6 border-t border-border/50">
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-textPrimary">
                    {t("settings.hiddenFields")}
                  </h4>
                  <p className="text-xs text-textSecondary">
                    {t("settings.hiddenFieldsDesc")}
                  </p>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                  {Object.entries(HIDDEN_FIELD_OPTIONS).map(
                    ([entity, fields]) => (
                      <div key={entity} className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                          <div className="text-xs font-semibold text-textSecondary capitalize">
                            {entity === "person"
                              ? t("contextDrawer.person")
                              : entity === "company"
                                ? t("contextDrawer.company")
                                : entity}
                          </div>
                          <div className="text-[10px] text-textSecondary italic">
                            {(draft.hidden_fields[entity] || []).length > 0
                              ? t("settings.assignedMembersPlural", {
                                  count: (draft.hidden_fields[entity] || [])
                                    .length,
                                })
                              : t("common.noResults")}
                          </div>
                        </div>
                        <div
                          className={cn(
                            "rounded-xl border border-border p-5",
                            settingsTheme.card,
                          )}
                        >
                          <div className="flex flex-wrap gap-2.5">
                            {fields.map((field) => {
                              const active = (
                                draft.hidden_fields[entity] || []
                              ).includes(field);
                              return (
                                <button
                                  key={field}
                                  type="button"
                                  onClick={() =>
                                    toggleHiddenField(entity, field)
                                  }
                                  className={cn(
                                    "rounded-md border px-3 py-1.5 text-xs transition-colors tabular-nums",
                                    active
                                      ? "border-red-500/50 bg-red-500/10 text-red-500"
                                      : "border-border text-textSecondary hover:bg-settings-hover",
                                  )}
                                >
                                  {field}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </>
          )}

          <div className="flex items-center justify-between border-t border-border pt-4">
            <div className="text-xs text-textSecondary">
              {selectedRole
                ? selectedRole.assigned_users_count === 1
                  ? t("settings.assignedMembers", { count: 1 })
                  : t("settings.assignedMembersPlural", {
                      count: selectedRole.assigned_users_count || 0,
                    })
                : t("settings.roleTemplatesDesc")}
            </div>
            <Button
              onClick={draft.id ? handleSaveRole : handleCreateRole}
              disabled={isSaving || isCreating || !draft.name.trim() || (draft.id && !hasUnsavedChanges)}
              className="gap-2"
            >
              {draft.id
                ? isSaving
                  ? t("settings.savingRole")
                  : t("settings.saveRole")
                : isCreating
                  ? t("settings.creatingRole")
                  : t("settings.createRole")}
            </Button>
          </div>

          <AlertDialog open={!!pendingRoleId} onOpenChange={() => setPendingRoleId(null)}>
            <AlertDialogContent className={settingsTheme.dialog}>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-textPrimary">{t("settings.unsavedChangesTitle")}</AlertDialogTitle>
                <AlertDialogDescription className="text-textSecondary">
                  {t("settings.unsavedChangesDesc")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className={settingsTheme.button.ghost}>
                  {t("common.cancel")}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    const roleId = pendingRoleId;
                    setPendingRoleId(null);
                    if (roleId) setSelectedRoleId(roleId);
                  }}
                  className="bg-zinc-800 text-white hover:bg-zinc-700 border-none"
                >
                  {t("settings.ignoreChanges")}
                </AlertDialogAction>
                <AlertDialogAction
                  onClick={async () => {
                    const roleId = pendingRoleId;
                    await handleSaveRole();
                    if (roleId) setSelectedRoleId(roleId);
                    setPendingRoleId(null);
                  }}
                  className="bg-blue-600 text-white hover:bg-blue-700 border-none"
                >
                  {t("settings.saveAndSwitch")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <RolesHelpDialog open={isHelpOpen} onOpenChange={setIsHelpOpen} />
        </div>
      </div>
    </div>
  );
};
const DomainsView = () => {
  const { t } = useTranslation();
  return (
    <div className="space-y-6 relative group">
      <ComingSoonLayer />
      <div
        className={cn(
          "p-4 border border-border rounded-lg",
          settingsTheme.card,
        )}
      >
        <h4 className="text-sm font-medium mb-1">{t("settings.domains")}</h4>
        <p className="text-xs text-textSecondary mb-3">
          Edit your subdomain name or set a custom domain.
        </p>
        <div
          className={cn(
            "flex items-center gap-2 text-sm text-textPrimary px-3 py-2 rounded border border-border",
            settingsTheme.dark,
          )}
        >
          <Globe size={14} className="text-textSecondary" />
          <span>workspace.founderstack.com</span>
        </div>
      </div>
    </div>
  );
};
const ApiWebhookView = ({ canManageConfig }: { canManageConfig?: boolean }) => {
  const { t } = useTranslation();
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [selectAll, setSelectAll] = useState(false);

  // Confirmation dialog states
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);
  const [selectedKeyName, setSelectedKeyName] = useState<string>("");
  const [isCopied, setIsCopied] = useState(false);

  // Available scopes based on backend SCOPE_CHOICES
  const availableScopes = [
    {
      value: "crmconfigurations:read",
      label: "Read CRM Configurations",
      category: "CRM Configurations",
    },
    {
      value: "crmconfigurations:write",
      label: "Write CRM Configurations",
      category: "CRM Configurations",
    },
    { value: "people:read", label: "Read People", category: "People" },
    { value: "people:write", label: "Write People", category: "People" },
    { value: "companies:read", label: "Read Companies", category: "Companies" },
    {
      value: "companies:write",
      label: "Write Companies",
      category: "Companies",
    },
    { value: "tasks:read", label: "Read Tasks", category: "Tasks" },
    { value: "tasks:write", label: "Write Tasks", category: "Tasks" },
    {
      value: "activitylogs:read",
      label: "Read Activity Logs",
      category: "Activities",
    },
    {
      value: "activitylogs:write",
      label: "Write Activity Logs",
      category: "Activities",
    },
    { value: "notes:read", label: "Read Notes", category: "Notes" },
    { value: "notes:write", label: "Write Notes", category: "Notes" },
    {
      value: "opportunities:read",
      label: "Read Opportunities",
      category: "Opportunities",
    },
    {
      value: "opportunities:write",
      label: "Write Opportunities",
      category: "Opportunities",
    },
    { value: "reports:read", label: "Read Reports", category: "Reports" },
    { value: "reports:write", label: "Write Reports", category: "Reports" },
    {
      value: "invitations:read",
      label: "Read Invitations",
      category: "Invitations",
    },
    {
      value: "invitations:write",
      label: "Write Invitations",
      category: "Invitations",
    },
    { value: "syncrecords:read", label: "Read Sync Records", category: "Sync" },
    {
      value: "syncrecords:write",
      label: "Write Sync Records",
      category: "Sync",
    },
    { value: "synclogs:read", label: "Read Sync Logs", category: "Sync" },
    { value: "synclogs:write", label: "Write Sync Logs", category: "Sync" },
    {
      value: "interactiontypes:read",
      label: "Read Interaction Types",
      category: "Interactions",
    },
    {
      value: "interactiontypes:write",
      label: "Write Interaction Types",
      category: "Interactions",
    },
    {
      value: "interactions:read",
      label: "Read Interaction Logs",
      category: "Interactions",
    },
    {
      value: "interactions:write",
      label: "Write Interaction Logs",
      category: "Interactions",
    },
    {
      value: "dashboardconfig:read",
      label: "Read Dashboard Config",
      category: "Dashboard",
    },
    {
      value: "dashboardconfig:write",
      label: "Write Dashboard Config",
      category: "Dashboard",
    },
    {
      value: "search:only",
      label: "Search Only (No listing)",
      category: "Search",
    },
  ];

  useEffect(() => {
    if (canManageConfig) {
      loadAPIKeys();
    }
  }, [canManageConfig]);

  const loadAPIKeys = async () => {
    setIsLoading(true);
    try {
      const response = await getAPIKeys();
      if (response.ok) {
        const data = await response.json();
        // Handle both array response and paginated response with results
        const keysArray = Array.isArray(data) ? data : data.results || [];
        setApiKeys(keysArray);
      } else {
        setApiKeys([]);
      }
    } catch (error) {
      toast.error(t("settings.loadApiKeysFailed"));
      setApiKeys([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      toast.error(t("settings.enterKeyName"));
      return;
    }

    setIsCreating(true);
    try {
      const response = await createAPIKey(
        newKeyName,
        selectedScopes.length > 0 ? selectedScopes : undefined,
        expiresAt || null,
      );
      if (response.ok) {
        const data = await response.json();
        setCreatedKey(data.key);
        setNewKeyName("");
        setSelectedScopes([]);
        setExpiresAt("");
        setSelectAll(false);
        loadAPIKeys();
        toast.success(t("settings.apiKeyCreatedSuccess"));
      }
    } catch (error) {
      toast.error(t("settings.apiKeyCreateFailed"));
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyKey = () => {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const openRevokeDialog = (id: string, name: string) => {
    setSelectedKeyId(id);
    setSelectedKeyName(name);
    setRevokeDialogOpen(true);
  };

  const openDeleteDialog = (id: string, name: string) => {
    setSelectedKeyId(id);
    setSelectedKeyName(name);
    setDeleteDialogOpen(true);
  };

  const handleRevokeKey = async () => {
    if (!selectedKeyId) return;
    try {
      const response = await revokeAPIKey(selectedKeyId);
      if (response.ok) {
        loadAPIKeys();
        toast.success(t("settings.apiKeyRevokedSuccess"));
      }
    } catch (error) {
      toast.error(t("settings.apiKeyRevokeFailed"));
    } finally {
      setRevokeDialogOpen(false);
      setSelectedKeyId(null);
      setSelectedKeyName("");
    }
  };

  const handleReactivateKey = async (id: string) => {
    try {
      const response = await reactivateAPIKey(id);
      if (response.ok) {
        loadAPIKeys();
        toast.success(t("settings.apiKeyReactivatedSuccess"));
      }
    } catch (error) {
      toast.error(t("settings.apiKeyReactivateFailed"));
    }
  };

  const handleDeleteKey = async () => {
    if (!selectedKeyId) return;
    try {
      const response = await deleteAPIKey(selectedKeyId);
      if (response.ok) {
        loadAPIKeys();
        toast.success(t("settings.apiKeyDeletedSuccess"));
      }
    } catch (error) {
      toast.error(t("settings.apiKeyDeleteFailed"));
    } finally {
      setDeleteDialogOpen(false);
      setSelectedKeyId(null);
      setSelectedKeyName("");
    }
  };

  const closeCreateDialog = () => {
    setIsCreateDialogOpen(false);
    setCreatedKey(null);
    setNewKeyName("");
    setSelectedScopes([]);
    setExpiresAt("");
    setSelectAll(false);
    setIsCopied(false);
  };

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedScopes([]);
    } else {
      // Select all scopes EXCEPT search:only
      setSelectedScopes(
        availableScopes
          .filter((s) => s.value !== "search:only")
          .map((s) => s.value),
      );
    }
    setSelectAll(!selectAll);
  };

  const formatScopeCount = (scopes: string[]) => {
    if (!scopes || scopes.length === 0) return "All permissions";
    return `${scopes.length} scope${scopes.length > 1 ? "s" : ""}`;
  };

  return (
    <div className="space-y-10">
      {/* Header & Documentation */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-textPrimary">
              {t("settings.documentation")}
            </h3>
            <p className="text-xs text-textSecondary">
              Explore our REST API documentation and examples.
            </p>
          </div>
          <Button
            size="sm"
            className="bg-secondary hover:bg-secondary/80 text-secondary-foreground h-8 text-[11px] gap-2"
            onClick={() =>
              window.open(
                "https://founderstack.gitbook.io/docs/CLoI7jr67VW8jQXlpieB/",
                "_blank",
              )
            }
          >
            {t("settings.visitDocs")}
            <ExternalLink size={12} />
          </Button>
        </div>

        {/* Banner Placeholder */}
        <div
          className={cn(
            "w-full aspect-[2.5/1] border border-border rounded-xl overflow-hidden relative group/banner",
            settingsTheme.card,
          )}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-purple-600/10" />
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <div
              className={cn(
                "w-full max-w-lg rounded-lg border border-border p-4 shadow-2xl space-y-3 font-mono text-[10px]",
                settingsTheme.apiPlayground,
              )}
            >
              <div className="flex items-center justify-between border-b border-border pb-2 mb-2">
                <span className="text-blue-400">
                  {t("settings.createPersonExample")}
                </span>
                <div className="flex gap-1.5">
                  <div className="size-2 rounded-full bg-red-500/50" />
                  <div className="size-2 rounded-full bg-yellow-500/50" />
                  <div className="size-2 rounded-full bg-green-500/50" />
                </div>
              </div>
              <div className="space-y-1">
                <div>
                  <span className="text-purple-400">curl</span> -X{" "}
                  <span className="text-green-400">POST</span>{" "}
                  <span className="text-green-400">
                    &quot;https://api.founderstack.com/api/people/&quot;
                  </span>{" "}
                  \
                </div>
                <div className="pl-4">
                  -H{" "}
                  <span className="text-yellow-400">
                    &quot;Authorization: Api-Key YOUR_API_KEY&quot;
                  </span>{" "}
                  \
                </div>
                <div className="pl-4">
                  -H{" "}
                  <span className="text-yellow-400">
                    &quot;Content-Type: application/json&quot;
                  </span>{" "}
                  \
                </div>
                <div className="pl-4">
                  -d <span className="text-green-400">&apos;{"{"}</span>
                </div>
                <div className="pl-8">
                  <span className="text-blue-400">&quot;name&quot;</span>:{" "}
                  <span className="text-green-400">&quot;Jane Doe&quot;</span>,
                </div>
                <div className="pl-8">
                  <span className="text-blue-400">&quot;email&quot;</span>:{" "}
                  <span className="text-green-400">
                    &quot;jane@example.com&quot;
                  </span>
                  ,
                </div>
                <div className="pl-8">
                  <span className="text-blue-400">&quot;job_title&quot;</span>:{" "}
                  <span className="text-green-400">
                    &quot;Software Engineer&quot;
                  </span>
                  ,
                </div>
                <div className="pl-8">
                  <span className="text-blue-400">&quot;stage&quot;</span>:{" "}
                  <span className="text-green-400">&quot;Qualified&quot;</span>
                </div>
                <div className="pl-4">
                  <span className="text-green-400">{"}"}&apos;</span>
                </div>
              </div>
              <div className="pt-2 flex items-center gap-2">
                <Badge className="bg-blue-500/20 text-blue-500 border-none text-[9px] h-4">
                  POST
                </Badge>
                <span className="text-textSecondary truncate">
                  /api/people/
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* API Keys */}
      <div className="space-y-4 pt-6 border-t border-border">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-textPrimary">
            {t("settings.apiKeys")}
          </h3>
          <p className="text-xs text-textSecondary">
            {t("settings.apiKeysDesc")}
          </p>
        </div>

        <div
          className={cn(
            "rounded-lg border border-border overflow-hidden",
            settingsTheme.card,
          )}
        >
          <table className="w-full text-left text-xs">
            <thead>
              <tr
                className={cn(
                  "border-b border-border",
                  "bg-settings-tertiary-bg",
                )}
              >
                <th className="px-4 py-2.5 font-semibold text-textSecondary">
                  {t("dataTable.name")}
                </th>
                <th className="px-4 py-2.5 font-semibold text-textSecondary">
                  Prefix
                </th>
                <th className="px-4 py-2.5 font-semibold text-textSecondary">
                  Scopes
                </th>
                <th className="px-4 py-2.5 font-semibold text-textSecondary">
                  Expires
                </th>
                <th className="px-4 py-2.5 font-semibold text-textSecondary">
                  Created
                </th>
                <th className="px-4 py-2.5 font-semibold text-textSecondary">
                  {t("dataTable.status")}
                </th>
                <th className="px-4 py-2.5 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr className="border-b border-border/50 text-textSecondary">
                  <td colSpan={7} className="px-4 py-8 text-center">
                    {t("common.loading")}
                  </td>
                </tr>
              ) : apiKeys.length === 0 ? (
                <tr className="border-b border-border/50 text-textSecondary">
                  <td colSpan={7} className="px-4 py-8 text-center">
                    {canManageConfig
                      ? t("settings.noApiKeys")
                      : t("settings.noPermissionToListApis")}
                  </td>
                </tr>
              ) : (
                apiKeys.map((key) => (
                  <tr
                    key={key.id}
                    className={cn(
                      "border-b border-border/50 transition-colors",
                      "hover:bg-settings-tertiary-bg",
                    )}
                  >
                    <td className="px-4 py-3 text-textPrimary font-medium">
                      {key.name}
                    </td>
                    <td className="px-4 py-3 text-textSecondary font-mono">
                      {key.prefix}...
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-textSecondary"
                        title={key.scopes?.join(", ") || "All permissions"}
                      >
                        {formatScopeCount(key.scopes)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-textSecondary">
                      {key.expires_at ? (
                        <span
                          className={
                            new Date(key.expires_at) < new Date()
                              ? "text-red-500"
                              : ""
                          }
                        >
                          {new Date(key.expires_at).toLocaleDateString()}
                        </span>
                      ) : (
                        "Never"
                      )}
                    </td>
                    <td className="px-4 py-3 text-textSecondary">
                      {new Date(key.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className={`text-[10px] h-5 ${key.is_active ? "bg-green-500/20 text-green-500 border-none" : "bg-red-500/20 text-red-500 border-none"}`}
                      >
                        {key.is_active ? "Active" : "Revoked"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {key.is_active ? (
                          <button
                            onClick={() => openRevokeDialog(key.id, key.name)}
                            className={cn(
                              "p-1.5 rounded transition-colors",
                              settingsTheme.hoverAlt,
                              settingsTheme.text.secondary,
                              "hover:text-orange-500",
                            )}
                            title="Revoke"
                          >
                            <Ban size={14} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReactivateKey(key.id)}
                            className={cn(
                              "p-1.5 rounded transition-colors",
                              settingsTheme.hoverAlt,
                              settingsTheme.text.secondary,
                              "hover:text-green-500",
                            )}
                            title="Reactivate"
                          >
                            <KeyRound size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => openDeleteDialog(key.id, key.name)}
                          className={cn(
                            "p-1.5 rounded transition-colors",
                            settingsTheme.hover,
                            settingsTheme.text.secondary,
                            "hover:text-red-500",
                          )}
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-8 gap-2 text-xs border-border",
              settingsTheme.card,
            )}
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <Plus size={14} /> {t("settings.createApiKey")}
          </Button>
        </div>
      </div>

      {/* Create API Key Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent
          className={cn(
            "border-border text-settings-text-primary sm:max-w-[600px] max-h-[80vh] overflow-y-auto",
            settingsTheme.tertiaryBg,
          )}
        >
          <DialogHeader>
            <DialogTitle>{t("settings.createApiKey")}</DialogTitle>
            <DialogDescription className={settingsTheme.text.secondary}>
              Create a new API key with specific permissions and optional
              expiration.
            </DialogDescription>
          </DialogHeader>

          {createdKey ? (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-green-500 mb-2">
                  <CheckCircle2 size={16} />
                  <span className="text-sm font-medium">
                    {t("settings.apiKeyCreated")}
                  </span>
                </div>
                <p className="text-xs text-textSecondary mb-3">
                  {t("settings.copyKeyNow")}
                </p>
                <div className="flex gap-2">
                  <Input
                    value={createdKey}
                    readOnly
                    className={cn(
                      "border-border font-mono text-xs flex-1",
                      settingsTheme.inputAlt,
                    )}
                  />
                  <Button
                    onClick={handleCopyKey}
                    size="sm"
                    className={`transition-all duration-200 ${
                      isCopied
                        ? "bg-green-600 hover:bg-green-700 text-white"
                        : "bg-secondary hover:bg-secondary/80 text-secondary-foreground"
                    }`}
                  >
                    {isCopied ? (
                      <span className="flex items-center gap-1">
                        <Check size={14} />
                        {t("invite.copied")}
                      </span>
                    ) : (
                      t("invite.copy")
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 py-4">
              {/* Key Name */}
              <div className="grid gap-2">
                <Label htmlFor="name">{t("settings.keyName")}</Label>
                <Input
                  id="name"
                  placeholder="e.g., Production API"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className={cn(
                    settingsTheme.border.primary,
                    settingsTheme.inputAlt,
                  )}
                />
              </div>

              {/* Expiration */}
              <div className="grid gap-2">
                <Label htmlFor="expires">
                  {t("settings.expirationOptional")}
                </Label>
                <Input
                  id="expires"
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className={cn(
                    settingsTheme.border.primary,
                    settingsTheme.inputAlt,
                  )}
                  min={new Date().toISOString().split("T")[0]}
                />
                <p className="text-xs text-textSecondary">
                  {t("settings.leaveEmptyNoExpiration")}
                </p>
              </div>

              {/* Scopes */}
              <div className="grid gap-3">
                <div className="flex items-center justify-between">
                  <Label>{t("settings.permissions")}</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-textSecondary">
                      {selectedScopes.length === 0
                        ? "All permissions"
                        : `${selectedScopes.length} selected`}
                    </span>
                    <button
                      onClick={toggleSelectAll}
                      className="text-xs text-blue-500 hover:text-blue-400"
                    >
                      {selectAll
                        ? t("settings.deselectAll")
                        : t("actions.selectAll")}
                    </button>
                  </div>
                </div>

                <div
                  className={cn(
                    "border border-border rounded-lg p-4 max-h-[300px] overflow-y-auto",
                    settingsTheme.card,
                  )}
                >
                  {[
                    "CRM Configurations",
                    "People",
                    "Companies",
                    "Tasks",
                    "Activities",
                    "Notes",
                    "Opportunities",
                    "Reports",
                    "Invitations",
                    "Sync",
                    "Interactions",
                    "Dashboard",
                    "Search",
                  ].map((category) => (
                    <div key={category} className="mb-4 last:mb-0">
                      <h4 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-2">
                        {category}
                      </h4>
                      {category === "Search" ? (
                        <div className="bg-[#252525] rounded p-3 border border-border">
                          {availableScopes
                            .filter((scope) => scope.category === category)
                            .map((scope) => (
                              <label
                                key={scope.value}
                                className="flex items-start gap-2 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedScopes.includes(scope.value)}
                                  onChange={() => toggleScope(scope.value)}
                                  className="rounded border-border bg-[#222] text-blue-600 focus:ring-blue-600 mt-0.5"
                                />
                                <div className="flex-1">
                                  <span className="text-xs text-textPrimary block">
                                    {scope.label}
                                  </span>
                                  <p className="text-[10px] text-textSecondary mt-1 leading-relaxed">
                                    This scope is for if you want to connect an
                                    AI and don't want it to write, just search
                                    your records. This is the scope for it.
                                  </p>
                                </div>
                              </label>
                            ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {availableScopes
                            .filter((scope) => scope.category === category)
                            .map((scope) => (
                              <label
                                key={scope.value}
                                className="flex items-center gap-2 p-2 rounded hover:bg-[#252525] cursor-pointer transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedScopes.includes(scope.value)}
                                  onChange={() => toggleScope(scope.value)}
                                  className="rounded border-border bg-[#222] text-blue-600 focus:ring-blue-600"
                                />
                                <span className="text-xs text-textPrimary">
                                  {scope.label}
                                </span>
                              </label>
                            ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-textSecondary">
                  {t("settings.selectAllDoesntSelectSearch")}
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            {createdKey ? (
              <Button
                onClick={closeCreateDialog}
                className="bg-secondary hover:bg-secondary/80 text-secondary-foreground"
              >
                {t("common.done")}
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={closeCreateDialog}
                  className="hover:bg-[#333] hover:text-textPrimary"
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  onClick={handleCreateKey}
                  disabled={isCreating}
                  className="bg-secondary hover:bg-secondary/80 text-secondary-foreground"
                >
                  {isCreating
                    ? t("common.loading")
                    : t("settings.createApiKey")}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation Dialog */}
      <Dialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <DialogContent
          className={cn(
            "border-border text-settings-text-primary sm:max-w-[400px]",
            settingsTheme.tertiaryBg,
          )}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-500">
              <Ban size={20} />
              {t("settings.revokeApiKey")}
            </DialogTitle>
            <DialogDescription className={settingsTheme.text.secondary}>
              {t("settings.revokeApiKeyDesc", { name: selectedKeyName })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setRevokeDialogOpen(false);
                setSelectedKeyId(null);
                setSelectedKeyName("");
              }}
              className="hover:bg-[#333] hover:text-textPrimary"
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleRevokeKey}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {t("settings.revokeKey")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent
          className={cn(
            "border-border text-settings-text-primary sm:max-w-[400px]",
            settingsTheme.tertiaryBg,
          )}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <Trash2 size={20} />
              {t("settings.deleteApiKey")}
            </DialogTitle>
            <DialogDescription className={settingsTheme.text.secondary}>
              {t("settings.deleteApiKeyDesc", { name: selectedKeyName })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setDeleteDialogOpen(false);
                setSelectedKeyId(null);
                setSelectedKeyName("");
              }}
              className="hover:bg-[#333] hover:text-textPrimary"
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleDeleteKey}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {t("settings.deleteKey")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Webhooks */}
      <div className="space-y-4 pt-6 border-t border-border relative group">
        <ComingSoonLayer />
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-textPrimary">
            {t("settings.webhooks")}
          </h3>
          <p className="text-xs text-textSecondary">
            {t("settings.webhooksDesc")}
          </p>
        </div>

        <div
          className={cn(
            "rounded-lg border border-border overflow-hidden",
            settingsTheme.card,
          )}
        >
          <table className="w-full text-left text-xs">
            <thead>
              <tr
                className={cn(
                  "border-b border-border",
                  "bg-settings-tertiary-bg",
                )}
              >
                <th className="px-4 py-2.5 font-semibold text-textSecondary">
                  URL
                </th>
                <th className="px-4 py-2.5 font-semibold text-textSecondary">
                  Events
                </th>
                <th className="px-4 py-2.5 font-semibold text-textSecondary">
                  {t("dataTable.status")}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50 text-textSecondary">
                <td colSpan={3} className="px-4 py-8 text-center">
                  {t("settings.noWebhooks")}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-8 gap-2 text-xs border-border",
              settingsTheme.card,
            )}
          >
            <Plus size={14} /> {t("settings.createWebhook")}
          </Button>
        </div>
      </div>
    </div>
  );
};

// --- Helpers ---

const PlaceholderConnect = ({ title }: { title: string }) => (
  <div className="space-y-4">
    <h3 className="text-sm font-semibold text-textPrimary">New account</h3>
    <p className="text-xs text-textSecondary -mt-3">
      Connect a new account to your workspace
    </p>
    <div className="space-y-2">
      <AccountRow
        icon={Mail}
        label="Connect with Google"
        color={settingsTheme.accountIcon}
      />
      <AccountRow
        icon={Monitor}
        label="Connect with Microsoft"
        color="text-blue-400"
      />
    </div>
  </div>
);

const AccountRow = ({ icon: Icon, label, color, onClick, connected }: any) => (
  <div
    onClick={connected ? undefined : onClick}
    className={cn(
      `flex items-center justify-between p-3 border border-border rounded transition-colors group ${connected ? "" : "hover:border-textSecondary/50 cursor-pointer"}`,
      settingsTheme.card,
    )}
  >
    <div className="flex items-center gap-3">
      <Icon
        size={16}
        className={color === "text-white" ? settingsTheme.accountIcon : color}
      />
      <span className="text-sm font-medium">{label}</span>
    </div>
    {connected ? (
      <Check size={14} className="text-green-500" />
    ) : (
      <ChevronRight
        size={14}
        className="text-textSecondary group-hover:text-textPrimary"
      />
    )}
  </div>
);

const DataModelRow = ({ icon: Icon, label, count }: any) => (
  <div
    className={cn(
      "flex items-center justify-between px-3 py-2 rounded cursor-pointer group",
      "hover:bg-settings-hover",
    )}
  >
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "w-6 h-6 rounded flex items-center justify-center",
          settingsTheme.quaternaryBg,
          settingsTheme.text.secondary,
        )}
      >
        <Icon size={12} />
      </div>
      <span className="text-sm text-textPrimary font-medium">{label}</span>
    </div>
    <div className="flex items-center gap-4">
      <span
        className={cn(
          "text-xs px-1.5 py-0.5 rounded border border-border",
          settingsTheme.text.secondary,
          settingsTheme.surface,
        )}
      >
        {count}
      </span>
      <ChevronRight
        size={14}
        className="text-textSecondary opacity-0 group-hover:opacity-100"
      />
    </div>
  </div>
);

const IntegrationRow = ({ icon: Icon, name, desc, count }: any) => (
  <div
    className={cn(
      "flex items-center justify-between py-3 border-b border-border/50 px-2 -mx-2 rounded cursor-pointer group",
      "hover:bg-settings-hover",
    )}
  >
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "w-8 h-8 rounded flex items-center justify-center",
          settingsTheme.quaternaryBg,
          settingsTheme.text.primary,
        )}
      >
        <Icon size={16} />
      </div>
      <div>
        <div className="text-sm font-medium text-textPrimary">{name}</div>
        <div className="text-xs text-textSecondary">{desc}</div>
      </div>
    </div>
    <button
      className={cn(
        "px-3 py-1 text-xs font-medium rounded border border-border",
        settingsTheme.quaternaryBg,
        "hover:bg-settings-tertiary-bg",
      )}
    >
      Use
    </button>
  </div>
);

const ToggleRow = ({ label, desc, checked }: any) => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <div className="text-sm font-medium text-textPrimary">{label}</div>
        <div className="text-xs text-textSecondary">{desc}</div>
      </div>
      <div
        className={`w-8 h-4 rounded-full p-0.5 cursor-pointer ${checked ? "bg-accent" : "bg-[#333]"}`}
      >
        <div
          className={`w-3 h-3 bg-white rounded-full shadow-sm transform transition-transform ${checked ? "translate-x-4" : "translate-x-0"}`}
        />
      </div>
    </div>
  );
};

const TabButton = ({ active, label, count }: any) => (
  <button
    className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${active ? "text-textPrimary border-textPrimary" : "text-textSecondary border-transparent hover:text-textPrimary"}`}
  >
    {label}
    {count !== undefined && (
      <span
        className={cn(
          "px-1.5 py-0.5 rounded text-[10px]",
          settingsTheme.quaternaryBg,
        )}
      >
        {count}
      </span>
    )}
  </button>
);

const ReleasesView = () => {
  const { t } = useTranslation();
  const [activeSubTab, setActiveSubTab] = useState<"Changelog" | "Lab">(
    "Changelog",
  );

  return (
    <div className="space-y-8 relative group">
      <ComingSoonLayer />
      <div className="flex items-center gap-6 border-b border-border">
        <button
          onClick={() => setActiveSubTab("Changelog")}
          className={`pb-3 text-sm font-medium transition-colors relative flex items-center gap-2 ${activeSubTab === "Changelog" ? "text-textPrimary" : "text-textSecondary hover:text-textPrimary"}`}
        >
          <Rocket size={14} />
          {t("settings.changelog")}
          {activeSubTab === "Changelog" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-textPrimary" />
          )}
        </button>
        <button
          onClick={() => setActiveSubTab("Lab")}
          className={`pb-3 text-sm font-medium transition-colors relative flex items-center gap-2 ${activeSubTab === "Lab" ? "text-textPrimary" : "text-textSecondary hover:text-textPrimary"}`}
        >
          <Beaker size={14} />
          {t("settings.lab")}
          {activeSubTab === "Lab" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-textPrimary" />
          )}
        </button>
      </div>

      {activeSubTab === "Changelog" ? (
        <div className="space-y-12 animate-in fade-in duration-300">
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="text-sm font-bold text-textPrimary">1.11.0</div>
              <div className="text-xs text-textSecondary">Nov 18, 2025</div>
            </div>
            <h3 className="text-xl font-bold">{t("settings.unlistedViews")}</h3>
            <p className="text-sm text-textSecondary leading-relaxed">
              {t("settings.unlistedViewsDesc")}
            </p>
            <div
              className={cn(
                "rounded-xl border border-border overflow-hidden aspect-video relative",
                settingsTheme.card,
              )}
            >
              <img
                src="https://raw.githubusercontent.com/Othunderlight/static/refs/heads/main/unlisted-views.png"
                alt="Unlisted Views"
                className="w-full h-full object-cover opacity-80"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-bold">{t("settings.morphMany")}</h3>
            <p className="text-sm text-textSecondary leading-relaxed">
              {t("settings.morphManyDesc")}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
          <LabCard
            title="IMAP, SMTP, CalDAV"
            description="Easily add email accounts from any provider that supports IMAP, send emails with SMTP (and soon, sync calendars with CalDAV)"
            image="https://raw.githubusercontent.com/Othunderlight/static/refs/heads/main/imap-lab.png"
          />
          <LabCard
            title="Dashboards"
            description="Enable dashboards"
            image="https://raw.githubusercontent.com/Othunderlight/static/refs/heads/main/dashboards-lab.png"
          />
        </div>
      )}
    </div>
  );
};

const LabCard = ({
  title,
  description,
  image,
}: {
  title: string;
  description: string;
  image: string;
}) => {
  const [enabled, setEnabled] = useState(false);
  return (
    <div
      className={cn(
        "border border-border rounded-xl overflow-hidden group hover:border-textSecondary/30 transition-all flex flex-col",
        settingsTheme.card,
      )}
    >
      <div
        className={cn(
          "aspect-video relative overflow-hidden",
          settingsTheme.secondaryBg,
        )}
      >
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
        />
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-textPrimary">{title}</h4>
            <p className="text-xs text-textSecondary leading-relaxed">
              {description}
            </p>
          </div>
          <div
            onClick={() => setEnabled(!enabled)}
            className={`shrink-0 w-8 h-4 rounded-full p-0.5 cursor-pointer transition-colors ${enabled ? "bg-accent" : "bg-[#333]"}`}
          >
            <div
              className={`w-3 h-3 bg-white rounded-full transition-transform ${enabled ? "translate-x-4" : "translate-x-0"}`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const SupportView = () => {
  const { t } = useTranslation();
  return (
    <div className="relative group">
      <ComingSoonLayer />
      <Empty>
        <EmptyHeader>
          <MessageSquare className="size-12 text-textSecondary mb-4" />
          <EmptyTitle>{t("settings.customerSupport")}</EmptyTitle>
          <EmptyDescription>
            {t("settings.customerSupportDesc")}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button className="bg-secondary hover:bg-secondary/80 text-secondary-foreground">
            {t("settings.startChat")}
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
};

const DocumentationView = () => {
  const { t } = useTranslation();
  return (
    <div className="relative group">
      <ComingSoonLayer />
      <Empty>
        <EmptyHeader>
          <HelpCircle className="size-12 text-textSecondary mb-4" />
          <EmptyTitle>{t("settings.documentation")}</EmptyTitle>
          <EmptyDescription>{t("settings.docsDesc")}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" className="gap-2">
            {t("settings.visitDocs")} <ExternalLink size={14} />
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
};

export default SettingsLayout;
