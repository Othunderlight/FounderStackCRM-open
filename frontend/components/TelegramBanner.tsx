import React, { useState, useEffect, useMemo } from "react";
import { Bot, Loader2, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";
import { hasCredential } from "../lib/api";
import { ConnectTelegramModal } from "./ConnectTelegramModal";
import { bannerTheme } from "../lib/theme";
import { useTranslation } from "../src/i18n";
import { useStore } from "../store";
import { cn } from "../lib/utils";

export const TelegramBanner = () => {
  const { language, user, myAccess, fetchMyAccess } = useStore();

  if (!user) return null;
  const { t } = useTranslation();
  const isRTL = language === "ar";

  const canUseAgent = useMemo(() => 
    myAccess?.permissions?.includes('*') || myAccess?.permissions?.includes('agent.use'), 
  [myAccess]);

  // Fetch permissions if they haven't been loaded yet
  useEffect(() => {
    if (!myAccess) {
      fetchMyAccess();
    }
  }, [myAccess, fetchMyAccess]);

  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [buttonStatus, setButtonStatus] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");

  useEffect(() => {
    if (canUseAgent) {
      checkConnection();
    } else {
      setIsLoading(false);
    }
  }, [canUseAgent]);

  const checkConnection = async () => {
    setIsLoading(true);
    try {
      const response = await hasCredential();
      if (response.ok) {
        const data = await response.json();
        setIsConnected(data.has_credential);
      } else {
        setIsConnected(false);
      }
    } catch (error) {
      console.error("Failed to check Telegram connection:", error);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupClick = () => {
    setIsSetupModalOpen(true);
  };

  const handleOpenTelegram = () => {
    window.open("https://t.me/founderstackbot", "_blank");
  };

  const handleSetupComplete = () => {
    setIsConnected(true);
    setButtonStatus("sent");
    setTimeout(() => setButtonStatus("idle"), 10000);
  };

  if (!canUseAgent || isLoading || isConnected === null || isConnected) return null;

  return (
    <>
      <div className={`${bannerTheme.telegram.bg} ${bannerTheme.telegram.border} px-4 py-2 flex items-center justify-between z-40`}>
        <div className="flex items-center gap-3">
          <div className={`${bannerTheme.telegram.iconBg} p-1.5 rounded-md`}>
            <Bot className={`w-4 h-4 ${bannerTheme.telegram.iconText}`} />
          </div>
          <p className={`text-sm font-medium ${bannerTheme.telegram.text}`}>
            {t("banner.telegram.connectAiChief")}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleSetupClick}
            disabled={buttonStatus === "sending" || buttonStatus === "sent"}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold ${bannerTheme.telegram.button.bg} ${bannerTheme.telegram.button.text} active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all`}
          >
            {buttonStatus === "sending" ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {t("banner.telegram.settingUp")}
              </>
            ) : buttonStatus === "sent" ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                {t("banner.telegram.connected")}
              </>
            ) : buttonStatus === "error" ? (
              t("banner.telegram.failedTryAgain")
            ) : (
              <>
                {t("banner.telegram.claimAiChief")}
                {isRTL ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
              </>
            )}
          </button>
        </div>
      </div>

      <ConnectTelegramModal
        isOpen={isSetupModalOpen}
        onOpenChange={setIsSetupModalOpen}
        onSuccess={handleSetupComplete}
      />
    </>
  );
};
