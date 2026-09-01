import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Bot, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { createCredential, createAPIKey, fastai } from "../lib/api";
import { toast } from "sonner";
import { modalTheme } from "../lib/theme";
import { useTranslation } from "../src/i18n";
import { useStore } from "../store";
import { cn } from "../lib/utils";

/** Safely convert any error payload (including FastAPI validation arrays) to a displayable string */
function safeErrorMessage(
  val: unknown,
  fallback = "An error occurred",
): string {
  if (!val) return fallback;
  if (typeof val === "string") return val;
  if (Array.isArray(val)) {
    // FastAPI 422 detail: [{type, loc, msg, input}, ...]
    const msgs = val.map((v: any) =>
      typeof v === "string" ? v : v?.msg || JSON.stringify(v),
    );
    return msgs.join("; ") || fallback;
  }
  if (typeof val === "object") {
    const obj = val as Record<string, any>;
    return obj.msg || obj.message || obj.detail || JSON.stringify(val);
  }
  return String(val);
}

interface ConnectTelegramModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const ConnectTelegramModal = ({
  isOpen,
  onOpenChange,
  onSuccess,
}: ConnectTelegramModalProps) => {
  const { language } = useStore();
  const { t } = useTranslation();
  const isRTL = language === "ar";
  const [telegramId, setTelegramId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  // Track whether onSuccess should fire when the success modal is dismissed
  const pendingSuccessRef = useRef(false);

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

      if (!credentialResponse.ok) {
        const errorData = await credentialResponse.json();
        toast.error(
          errorData.detail || t("telegramModal.failedToCreateCredential"),
        );
        setIsSubmitting(false);
        return;
      }

      // Test message delivery
      const testMessageResponse = await fastai.sendTelegramMessage(
        telegramId.trim(),
        "👋 Hey! I'm TMM.\n\nI'll handle your data entry so you don't have to.\n\nTell me about the last person you spoke to — just a voice note or a quick text will do.\n\nStart by clicking 👉 /start",
        apiKey,
      );

      if (testMessageResponse.ok) {
        const result = await testMessageResponse.json();
        if (result.status === "success") {
          setTelegramId("");
          // DON'T call onSuccess yet — it may unmount us.
          // Mark it pending so we fire it when the user dismisses the success modal.
          pendingSuccessRef.current = true;
          onOpenChange(false);
          toast.success(t("telegramModal.agentSentYouMsg"));
          setShowSuccessModal(true);
        } else {
          const errorMsg = safeErrorMessage(
            result.message || result.detail,
            t("telegramModal.failedToSendTestMessage"),
          );
          onOpenChange(false);
          toast.error(errorMsg);
          setShowErrorModal(true);
        }
      } else {
        let errorMsg = t("telegramModal.failedToSendMessageToTelegram");
        try {
          const errorData = await testMessageResponse.json();
          errorMsg = safeErrorMessage(
            errorData.detail || errorData.message,
            errorMsg,
          );
        } catch (e) {
          // ignore parse error
        }
        onOpenChange(false);
        toast.error(errorMsg);
        setShowErrorModal(true);
      }
    } catch (error: any) {
      const errorMsg = safeErrorMessage(
        error?.message,
        t("telegramModal.unexpectedError"),
      );
      onOpenChange(false);
      toast.error(errorMsg);
      setShowErrorModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent
          className={`${modalTheme.connectTelegram.bg} ${modalTheme.connectTelegram.border} text-textPrimary sm:max-w-[500px]`}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot size={20} className={modalTheme.connectTelegram.link.icon} />
              {t("telegramModal.claimAiChief")}
            </DialogTitle>
            <DialogDescription
              className={modalTheme.connectTelegram.description}
            >
              {t("telegramModal.connectTelegramDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <a
              href="https://t.me/founderstackbot"
              target="_blank"
              rel="noopener noreferrer"
              className={`block ${modalTheme.connectTelegram.link.bg} rounded-xl p-6 ${modalTheme.connectTelegram.link.border} ${modalTheme.connectTelegram.link.hoverBorder} hover:shadow-lg ${modalTheme.connectTelegram.link.hoverShadow} transition-all duration-300 group`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-14 h-14 rounded-full ${modalTheme.connectTelegram.link.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}
                >
                  <Bot
                    size={28}
                    className={modalTheme.connectTelegram.link.icon}
                  />
                </div>
                <div className="flex-1">
                  <h4
                    className={`text-lg font-semibold ${modalTheme.connectTelegram.link.text} mb-1`}
                  >
                    {t("telegramModal.msgAiChief")}
                  </h4>
                  <p className="text-sm text-textSecondary">
                    {t("telegramModal.clickToOpen")}
                  </p>
                </div>
                <div
                  className={cn(
                    `${modalTheme.connectTelegram.link.arrow} transition-transform duration-300`,
                    isRTL
                      ? "group-hover:-translate-x-1"
                      : "group-hover:translate-x-1",
                  )}
                >
                  {isRTL ? (
                    <ArrowRight
                      size={24}
                      className="text-textSecondary rotate-180"
                    />
                  ) : (
                    <svg
                      width="24"
                      height="24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  )}
                </div>
              </div>
            </a>

            <div className="grid gap-2">
              <Label htmlFor="telegramId">
                {t("telegramModal.pasteIdProvided")}
              </Label>
              <Input
                id="telegramId"
                placeholder={t("telegramModal.telegramIdPlaceholder")}
                value={telegramId}
                onChange={(e) => setTelegramId(e.target.value)}
                className={`${modalTheme.connectTelegram.input.bg} ${modalTheme.connectTelegram.input.border}`}
              />
              <p className="text-[10px] text-textSecondary">
                {t("telegramModal.agentWillSendWelcome")}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                onOpenChange(false);
                setTelegramId("");
              }}
              className={`${modalTheme.connectTelegram.button.ghost} flex-1`}
            >
              {t("telegramModal.cancel")}
            </Button>
            <Button
              onClick={handleSetupTelegram}
              disabled={isSubmitting}
              className={`${modalTheme.connectTelegram.button.primary} text-white flex-1`}
            >
              {isSubmitting
                ? t("telegramModal.settingUp")
                : t("telegramModal.connectAgent")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Modal - Rendered via Portal */}
      {createPortal(
        <Dialog open={showSuccessModal} onOpenChange={() => {}}>
          <DialogContent
            className={`${modalTheme.success.bg} ${modalTheme.success.border} text-textPrimary sm:max-w-[450px]`}
            onPointerDownOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
            onInteractOutside={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 size={20} className={modalTheme.success.icon} />
                {t("telegramModal.telegramConnected")}
              </DialogTitle>
              <DialogDescription className={modalTheme.success.description}>
                {t("telegramModal.chatWithCrm")}
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <div
                className={`${modalTheme.success.card.bg} rounded-lg p-4 ${modalTheme.success.card.border} text-center`}
              >
                <Bot
                  size={32}
                  className={`${modalTheme.success.card.icon} mx-auto mb-3`}
                />
                <p className={`text-sm ${modalTheme.success.card.text} mb-1`}>
                  {t("telegramModal.justSentYouMsg")}
                </p>
                <p className="text-xs text-textSecondary">
                  {t("telegramModal.welcomeMsg")}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowSuccessModal(false);
                  if (pendingSuccessRef.current) {
                    pendingSuccessRef.current = false;
                    onSuccess?.();
                  }
                }}
                className={`${modalTheme.success.button.ghost} flex-1`}
              >
                {t("telegramModal.close")}
              </Button>
              <Button
                className={`${modalTheme.success.button.primary} text-white flex-1`}
                onClick={() => {
                  setShowSuccessModal(false);
                  if (pendingSuccessRef.current) {
                    pendingSuccessRef.current = false;
                    onSuccess?.();
                  }
                  window.open("https://t.me/founderstackbot", "_blank");
                }}
              >
                {t("telegramModal.checkTelegram")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>,
        document.body,
      )}

      {/* Error Modal - Rendered via Portal */}
      {createPortal(
        <Dialog
          open={showErrorModal}
          onOpenChange={(open) => {
            if (!open) setShowErrorModal(false);
          }}
        >
          <DialogContent
            className={`${modalTheme.error.bg} ${modalTheme.error.border} text-textPrimary sm:max-w-[450px]`}
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle size={20} className={modalTheme.error.icon} />
                {t("telegramModal.setupCompletedIssues")}
              </DialogTitle>
              <DialogDescription className={modalTheme.error.description}>
                {t("telegramModal.connectionFailed")}
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <div
                className={`${modalTheme.error.card.bg} rounded-lg p-4 ${modalTheme.error.card.border} text-center`}
              >
                <AlertCircle
                  size={32}
                  className={`${modalTheme.error.card.icon} mx-auto mb-3`}
                />
                <p className={`text-sm ${modalTheme.error.card.text} mb-1`}>
                  {t("telegramModal.pleaseContactSupport")}
                </p>
                <p className="text-xs text-textSecondary">
                  {t("telegramModal.helpYouGetConnected")}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => setShowErrorModal(false)}
                className={`${modalTheme.error.button.ghost} flex-1`}
              >
                {t("telegramModal.close")}
              </Button>
              <Button
                className={`${modalTheme.error.button.primary} text-white flex-1`}
                onClick={() => {
                  setShowErrorModal(false);
                  window.open("https://t.me/OmarGatara", "_blank");
                }}
              >
                {t("telegramModal.contactSupport")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>,
        document.body,
      )}
    </>
  );
};
