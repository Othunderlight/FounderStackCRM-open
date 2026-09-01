import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { useStore } from "../store";
import { Button } from "./ui/button";
import { Sparkles } from "lucide-react";
import { cn } from "../lib/utils";
import { hasCredential } from "../lib/api";
import { ConnectTelegramModal } from "./ConnectTelegramModal";
import { proModalTheme } from "../lib/theme";
import { useTranslation } from "../src/i18n";

const ProModal = () => {
  const { isProModalOpen, setProModalOpen, myAccess } = useStore();
  const { t } = useTranslation();
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [hasTelegramCredential, setHasTelegramCredential] = useState(false);

  const canUseAgent =
    myAccess?.permissions?.includes("*") ||
    myAccess?.permissions?.includes("agent.use");

  useEffect(() => {
    if (canUseAgent) {
      checkTelegramCredential();
    }
  }, [canUseAgent]);

  const checkTelegramCredential = async () => {
    try {
      const response = await hasCredential();
      if (response.ok) {
        const data = await response.json();
        setHasTelegramCredential(data.has_credential);
      }
    } catch (error) {
      console.error("Failed to check credential:", error);
    }
  };

  const handleClaimAIChief = () => {
    if (hasTelegramCredential) {
      window.open("https://t.me/founderstackbot", "_blank");
      setProModalOpen(false);
    } else {
      setIsSetupModalOpen(true);
    }
  };

  const handleSetupComplete = () => {
    setHasTelegramCredential(true);
  };

  return (
    <>
      <Dialog
        open={isProModalOpen}
        onOpenChange={(open) => {
          setProModalOpen(open);
          if (!open) {
            setIsSetupModalOpen(false);
          }
        }}
      >
        <DialogContent className={cn("max-w-[420px] p-0 border-zinc-800 shadow-2xl rounded-[28px] overflow-hidden", proModalTheme.bg, proModalTheme.text.primary)}>
          <div className="p-10 flex flex-col items-center text-center">
            <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-6", proModalTheme.icon.bg, proModalTheme.icon.border)}>
              <img
                src="/logo.png"
                alt="FounderStack Logo"
                className="w-10 h-10 object-contain"
              />
            </div>

            <DialogTitle className={cn("text-[22px] font-bold mb-3 tracking-tight", proModalTheme.text.primary)}>
              {t("proModal.welcomeToFounderStack")}
            </DialogTitle>

            <DialogDescription className={cn("text-[14px] leading-relaxed mb-8 px-2", proModalTheme.text.secondary)}>
              {t("proModal.workspaceReady")}
              {canUseAgent && (
                <>
                  <br />
                  {t("proModal.startByConnecting")}
                </>
              )}
            </DialogDescription>

            <div className="flex flex-col w-full gap-3">
              <Button
                onClick={canUseAgent ? handleClaimAIChief : () => setProModalOpen(false)}
                className={cn("w-full font-semibold h-11 rounded-xl text-[14px] flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 text-white", proModalTheme.button.primary)}
              >
                {canUseAgent ? (
                  <>
                    <Sparkles size={16} />
                    {t("proModal.claimAiChief")}
                  </>
                ) : (
                  t("proModal.welcomeToFounderStack")
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reusable Telegram Setup Modal */}
      <ConnectTelegramModal
        isOpen={isSetupModalOpen}
        onOpenChange={setIsSetupModalOpen}
        onSuccess={handleSetupComplete}
      />
    </>
  );
};

export default ProModal;
