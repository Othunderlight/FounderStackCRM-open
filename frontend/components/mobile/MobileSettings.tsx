import React, { useState, useEffect } from "react";
import {
  User,
  ChevronLeft,
  Check,
  X,
  Pencil,
  Lock,
  MessageCircle,
  ExternalLink,
  Loader2,
} from "lucide-react";
import {
  linkGoogle,
  hasCredential,
  createCredential,
  createAPIKey,
  apiFetch,
  changePassword,
  getMyRolePermissions,
} from "../../lib/api";
import { useStore } from "../../store";
import { toast } from "sonner";
import { useTranslation } from "../../src/i18n";

type TabType = "profile" | "agents";

const MobileSettings: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>("profile");
  const [myAccess, setMyAccess] = useState<any>(null);

  useEffect(() => {
    const fetchAccess = async () => {
      try {
        const response = await getMyRolePermissions();
        if (response.ok) {
          setMyAccess(await response.json());
        }
      } catch (err) {
        console.error("Failed to fetch permissions:", err);
      }
    };
    fetchAccess();
  }, []);

  const canUseAgents =
    !!myAccess?.permissions?.includes("*") ||
    !!myAccess?.permissions?.includes("agent.use");

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.history.back()}
              className="p-2 -ml-2 hover:bg-[#2f2f2f] rounded-full text-textSecondary active:bg-[#3f3f3f] transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
            <h1 className="text-lg font-semibold text-textPrimary">
              {t("nav.settings")}
            </h1>
          </div>
        </div>

        {/* Tab Bar - Material 3 Segmented Button */}
        <div className="px-4 pb-3">
          <div className="flex bg-[#2f2f2f] p-1 rounded-lg">
            <button
              onClick={() => setActiveTab("profile")}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === "profile"
                  ? "bg-[#3f3f3f] text-textPrimary shadow-sm"
                  : "text-textSecondary hover:text-textPrimary"
              }`}
            >
              {t("settings.profile")}
            </button>
            {canUseAgents && (
              <button
                onClick={() => setActiveTab("agents")}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                  activeTab === "agents"
                    ? "bg-[#3f3f3f] text-textPrimary shadow-sm"
                    : "text-textSecondary hover:text-textPrimary"
                }`}
              >
                {t("settings.agents")}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "profile" ? <ProfileTab /> : <AgentsTab />}
      </div>
    </div>
  );
};

const ProfileTab: React.FC = () => {
  const { t } = useTranslation();
  const { user, setUser } = useStore();
  const [firstName, setFirstName] = useState(
    user?.first_name || user?.name?.split(" ")[0] || "",
  );
  const [lastName, setLastName] = useState(
    user?.last_name || user?.name?.split(" ")[1] || "",
  );
  const [email, setEmail] = useState(user?.email || "");
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGoogleConnecting, setIsGoogleConnecting] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChanging, setIsChanging] = useState(false);

  useEffect(() => {
    if (user) {
      setEmail(user.email);
      setFirstName(user.first_name || user.name?.split(" ")[0] || "");
      setLastName(user.last_name || user.name?.split(" ")[1] || "");
    }
  }, [user]);

  const hasNameChanges =
    firstName !== (user?.first_name || user?.name?.split(" ")[0] || "") ||
    lastName !== (user?.last_name || user?.name?.split(" ")[1] || "");

  const isGoogleConnected = !!user?.google_email;

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
        toast.success(t("settings.profileUpdated"));
      } else {
        const data = await response.json();
        toast.error(data.detail || t("settings.profileUpdateFailed"));
      }
    } catch (err) {
      console.error("Profile save error:", err);
      toast.error(t("settings.profileUpdateFailed"));
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
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        const data = await response.json();
        setUser({ ...user!, email: data.email });
        setIsEditingEmail(false);
        toast.success(t("settings.emailUpdated"));
      } else {
        const data = await response.json();
        toast.error(
          data.detail || data.email?.[0] || t("settings.emailUpdateFailed"),
        );
      }
    } catch (err) {
      console.error("Email save error:", err);
      toast.error(t("settings.emailUpdateFailed"));
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
      toast.error(t("common.error"));
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
      toast.error(t("settings.passwordsDoNotMatch"));
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
      toast.error(t("common.error"));
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      {/* Name Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-textPrimary">
            {t("dataTable.name")}
          </label>
          {hasNameChanges && (
            <button
              onClick={saveProfile}
              disabled={isSaving}
              className="text-sm font-medium text-blue-500 disabled:opacity-50"
            >
              {isSaving ? t("common.loading") : t("common.save")}
            </button>
          )}
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-textSecondary mb-1.5 block">
              {t("settings.firstName")}
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full bg-[#1c1c1c] border border-border rounded-lg px-3 py-2.5 text-sm text-textPrimary focus:border-blue-500 focus:outline-none transition-colors"
              placeholder={t("settings.firstName")}
            />
          </div>
          <div>
            <label className="text-xs text-textSecondary mb-1.5 block">
              {t("settings.lastName")}
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full bg-[#1c1c1c] border border-border rounded-lg px-3 py-2.5 text-sm text-textPrimary focus:border-blue-500 focus:outline-none transition-colors"
              placeholder={t("settings.lastName")}
            />
          </div>
        </div>
      </section>

      {/* Email Section */}
      <section className="space-y-3">
        <label className="text-sm font-medium text-textPrimary">
          {t("dataTable.email")}
        </label>
        <div className="relative">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={!isEditingEmail}
            className={`w-full bg-[#1c1c1c] border rounded-lg px-3 py-2.5 text-sm transition-colors ${
              !isEditingEmail
                ? "border-transparent text-textSecondary"
                : "border-blue-500 text-textPrimary"
            }`}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            {isEditingEmail ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={handleSaveEmail}
                  disabled={isSaving}
                  className="p-1.5 hover:bg-green-900/50 text-green-500 rounded-md disabled:opacity-50"
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={() => setIsEditingEmail(false)}
                  className="p-1.5 hover:bg-red-900/50 text-red-500 rounded-md"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditingEmail(true)}
                className="p-1.5 text-textSecondary hover:text-textPrimary hover:bg-[#333] rounded-md transition-colors"
              >
                <Pencil size={16} />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="space-y-3 pt-4 border-t border-border">
        <h3 className="text-sm font-medium text-textPrimary">
          {t("settings.security")}
        </h3>
        <button
          onClick={() => setIsChangePasswordOpen(true)}
          className="w-full flex items-center justify-between p-3 bg-[#1c1c1c] border border-border rounded-lg hover:border-textSecondary/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Lock size={18} className="text-textSecondary" />
            <span className="text-sm font-medium">
              {t("settings.changePassword")}
            </span>
          </div>
          <ChevronRight size={18} className="text-textSecondary" />
        </button>
      </section>

      {/* Google Connection Section */}
      <section className="space-y-3 pt-4 border-t border-border">
        <h3 className="text-sm font-medium text-textPrimary">
          {t("settings.connectedAccounts")}
        </h3>
        <button
          onClick={connectGoogle}
          disabled={isGoogleConnecting}
          className="w-full flex items-center gap-3 p-3 bg-[#1c1c1c] border border-border rounded-lg hover:border-textSecondary/50 transition-colors disabled:opacity-50"
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
          <span className="text-sm font-medium flex-1 text-left">
            {isGoogleConnected
              ? t("settings.googleConnected")
              : t("settings.connectGoogle")}
          </span>
          {isGoogleConnected && <Check size={16} className="text-green-500" />}
        </button>
        {isGoogleConnected && user?.google_email && (
          <p className="text-xs text-textSecondary px-1">{user.google_email}</p>
        )}
      </section>

      {/* Change Password Modal - Full Screen on Mobile */}
      {isChangePasswordOpen && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
          <header className="flex items-center justify-between px-4 h-14 border-b border-border">
            <button
              onClick={() => setIsChangePasswordOpen(false)}
              className="p-2 -ml-2 hover:bg-[#2f2f2f] rounded-full text-textSecondary"
            >
              <X size={24} />
            </button>
            <h2 className="text-lg font-semibold">
              {t("settings.changePassword")}
            </h2>
            <div className="w-10" />
          </header>

          <form
            onSubmit={handleChangePassword}
            className="flex-1 p-4 space-y-4"
          >
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("settings.currentPassword")}
              </label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full bg-[#1c1c1c] border border-border rounded-lg px-3 py-2.5 text-sm"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("settings.newPassword")}
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-[#1c1c1c] border border-border rounded-lg px-3 py-2.5 text-sm"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("settings.confirmNewPassword")}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-[#1c1c1c] border border-border rounded-lg px-3 py-2.5 text-sm"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isChanging}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg mt-6 disabled:opacity-50"
            >
              {isChanging
                ? t("settings.updatingPassword")
                : t("settings.updatePassword")}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

const AgentsTab: React.FC = () => {
  const { t } = useTranslation();
  const [hasTelegramCredential, setHasTelegramCredential] = useState(false);
  const [isLoadingCredential, setIsLoadingCredential] = useState(true);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [telegramId, setTelegramId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

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

  const handleSetupTelegram = async () => {
    if (!telegramId.trim()) {
      toast.error(t("telegramModal.pleaseEnterTelegramId"));
      return;
    }

    setIsSubmitting(true);
    try {
      const createKeyResponse = await createAPIKey(
        "telegram_chat_agent",
        [
          "crmconfigurations:read",
          "crmconfigurations:write",
          "people:read",
          "people:write",
          "companies:read",
          "companies:write",
          "tasks:read",
          "tasks:write",
          "activitylogs:read",
          "activitylogs:write",
          "notes:read",
          "notes:write",
          "opportunities:read",
          "opportunities:write",
          "reports:read",
          "reports:write",
          "interactiontypes:read",
          "interactiontypes:write",
          "interactions:read",
          "interactions:write",
          "dashboardconfig:read",
          "dashboardconfig:write",
        ],
        null,
      );

      if (!createKeyResponse.ok) {
        toast.error(t("telegramModal.failedToCreateApiKey"));
        setIsSubmitting(false);
        return;
      }

      const keyData = await createKeyResponse.json();
      const apiKey = keyData.key;

      const credentialResponse = await createCredential([
        { name: "telegram_id", value: telegramId.trim() },
        { name: "crm_api_key", value: apiKey },
        { name: "can_continue", value: "0" },
      ]);

      if (credentialResponse.ok) {
        setHasTelegramCredential(true);
        setIsSetupModalOpen(false);
        setShowSuccessModal(true);
        setTelegramId("");
      } else {
        const errorData = await credentialResponse.json();
        toast.error(
          errorData.detail || t("telegramModal.failedToCreateCredential"),
        );
      }
    } catch (error) {
      toast.error(t("telegramModal.unexpectedError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <section className="space-y-2">
        <h2 className="text-sm font-medium text-textPrimary">
          {t("settings.agents")}
        </h2>
        <p className="text-xs text-textSecondary">{t("settings.agentsDesc")}</p>
      </section>

      {/* Telegram Agent Card */}
      <div className="bg-[#1c1c1c] border border-border rounded-xl overflow-hidden">
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <MessageCircle size={24} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-textPrimary">
                {t("settings.telegramAgent")}
              </div>
              <div className="text-xs text-textSecondary truncate">
                {t("settings.telegramAgentDesc")}
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            {isLoadingCredential ? (
              <div className="flex items-center gap-2 text-xs text-textSecondary">
                <Loader2 size={14} className="animate-spin" />
                {t("common.loading")}
              </div>
            ) : hasTelegramCredential ? (
              <>
                <span className="flex items-center gap-1.5 text-xs font-medium text-green-500 bg-green-500/10 px-2 py-1 rounded-md">
                  <Check size={12} />
                  {t("settings.configured")}
                </span>
                <button
                  onClick={() =>
                    window.open("https://t.me/founderstackbot", "_blank")
                  }
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {t("settings.letsChat")}
                  <ExternalLink size={14} />
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsSetupModalOpen(true)}
                className="w-full bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
              >
                {t("settings.setupAgent")}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Setup Modal - Full Screen on Mobile */}
      {isSetupModalOpen && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
          <header className="flex items-center justify-between px-4 h-14 border-b border-border">
            <button
              onClick={() => {
                setIsSetupModalOpen(false);
                setTelegramId("");
              }}
              className="p-2 -ml-2 hover:bg-[#2f2f2f] rounded-full text-textSecondary"
            >
              <X size={24} />
            </button>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <MessageCircle size={20} className="text-blue-500" />
              {t("settings.telegramAgent")}
            </h2>
            <div className="w-10" />
          </header>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="bg-[#252525] rounded-xl p-4 border border-border">
              <h4 className="text-sm font-medium text-textPrimary mb-3">
                {t("telegramModal.howToLog")}
              </h4>
              <ol className="space-y-3 text-xs text-textSecondary">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 font-bold">1.</span>
                  <span>
                    Go to{" "}
                    <a
                      href="https://t.me/idbot"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      t.me/idbot
                    </a>
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 font-bold">2.</span>
                  <span>{t("telegramModal.clickToOpen")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 font-bold">3.</span>
                  <span>{t("telegramModal.pasteIdProvided")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 font-bold">4.</span>
                  <span>Paste the ID below</span>
                </li>
              </ol>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("telegramModal.pasteIdProvided")}
              </label>
              <input
                type="text"
                placeholder="e.g., 123456789"
                value={telegramId}
                onChange={(e) => setTelegramId(e.target.value)}
                className="w-full bg-[#1c1c1c] border border-border rounded-lg px-3 py-2.5 text-sm"
              />
              <p className="text-[10px] text-textSecondary">
                {t("telegramModal.agentWillSendWelcome")}
              </p>
            </div>

            <button
              onClick={handleSetupTelegram}
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg mt-4 disabled:opacity-50"
            >
              {isSubmitting
                ? t("telegramModal.settingUp")
                : t("telegramModal.connectAgent")}
            </button>
          </div>
        </div>
      )}

      {/* Success Modal - Full Screen on Mobile */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
          <header className="flex items-center justify-between px-4 h-14 border-b border-border">
            <div className="w-10" />
            <h2 className="text-lg font-semibold">{t("common.success")}</h2>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="p-2 -mr-2 hover:bg-[#2f2f2f] rounded-full text-textSecondary"
            >
              <X size={24} />
            </button>
          </header>

          <div className="flex-1 p-4 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
              <Check size={32} className="text-green-500" />
            </div>
            <h3 className="text-lg font-semibold text-textPrimary mb-2">
              {t("telegramModal.telegramConnected")}
            </h3>
            <p className="text-sm text-textSecondary mb-8">
              {t("telegramModal.chatWithCrm")}
            </p>

            <button
              onClick={() => {
                setShowSuccessModal(false);
                window.open("https://t.me/founderstackbot", "_blank");
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg"
            >
              {t("telegramModal.checkTelegram")}
            </button>

            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full mt-3 text-sm font-medium text-textSecondary py-2"
            >
              {t("common.close")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const ChevronRight: React.FC<{ size: number; className?: string }> = ({
  size,
  className,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="m9 18 6-6-6-6" />
  </svg>
);

const ChevronLeftComponent: React.FC<{ size: number; className?: string }> = ({
  size,
  className,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="m15 18-6-6 6-6" />
  </svg>
);

export default MobileSettings;
