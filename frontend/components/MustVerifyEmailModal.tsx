import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { useStore } from "../store";
import { useTranslation } from "../src/i18n";
import { Button } from "./ui/button";
import { Mail, MessageCircle, ArrowRight, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "../lib/utils";
import { bannerTheme } from "../lib/theme";

const VerifyEmailModal = () => {
  const { user, resendVerificationEmail, fetchCurrentUser } = useStore();
  const { t } = useTranslation();
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [countdown, setCountdown] = useState<string | null>(null);

  // Only show if force verified is on AND user is not verified in AllAuth
  const isForced = user?.must_verify_email && !user?.is_verified;

  useEffect(() => {
    if (!isForced || !user) return;

    const updateCountdown = () => {
      const now = new Date();
      const lastAt = user.last_verification_resend_at ? new Date(user.last_verification_resend_at) : null;
      const count = user.verification_resend_count || 0;

      if (count >= 4) {
        setCountdown("Support");
        return;
      }

      if (count === 2 && lastAt) {
        const diff = (lastAt.getTime() + 5 * 60 * 1000) - now.getTime();
        if (diff > 0) {
          const mins = Math.floor(diff / 60000);
          const secs = Math.floor((diff % 60000) / 1000);
          setCountdown(`${mins}:${secs < 10 ? "0" : ""}${secs}`);
        } else {
          setCountdown(null);
        }
      } else if (count === 3 && lastAt) {
        const diff = (lastAt.getTime() + 24 * 60 * 60 * 1000) - now.getTime();
        if (diff > 0) {
          const hours = Math.floor(diff / 3600000);
          const mins = Math.floor((diff % 3600000) / 60000);
          setCountdown(`${hours}h ${mins}m`);
        } else {
          setCountdown(null);
        }
      } else {
        setCountdown(null);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [isForced, user]);

  if (!isForced) return null;

  const handleResend = async () => {
    if (countdown || status === 'sending' || status === 'sent') return;
    setStatus('sending');
    try {
      await resendVerificationEmail();
      // Fetch user again to get updated count/timestamp
      await fetchCurrentUser();
      setStatus('sent');
      setTimeout(() => setStatus('idle'), 10000);
    } catch (error) {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        className={`max-w-[400px] p-10 ${bannerTheme.modal.bg} border-zinc-800 text-white shadow-2xl rounded-[24px] flex flex-col items-center text-center gap-0`}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Icon Area */}
        <div className={`w-16 h-16 ${bannerTheme.modal.iconBg} rounded-2xl ${bannerTheme.modal.iconBorder} flex items-center justify-center mb-6`}>
          <Mail className={`w-8 h-8 ${bannerTheme.modal.icon}`} />
        </div>

        <DialogTitle className={`text-[22px] font-bold ${bannerTheme.modal.title} mb-3 tracking-tight px-4 text-center`}>
          {t("banner.verification.verifyYourEmail")}
        </DialogTitle>

        <DialogDescription className={`text-[14px] ${bannerTheme.modal.description} leading-relaxed mb-8 px-6 text-center`}>
          {t("banner.verification.toContinueUsing")}
        </DialogDescription>

        <div className="flex flex-col w-full gap-3">
          <Button
            onClick={handleResend}
            disabled={status === 'sending' || status === 'sent' || countdown !== null}
            className={cn(
              "w-full font-bold h-12 rounded-xl text-[14px] flex items-center justify-center gap-2 transition-all duration-300",
              status === 'sent'
                ? bannerTheme.modal.button.sent
                : status === 'error'
                ? bannerTheme.modal.button.error
                : bannerTheme.modal.button.primary,
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
{status === 'sending' ? (
               <Loader2 className="w-4 h-4 animate-spin" />
             ) : status === 'sent' ? (
               <>
                 {t("banner.verification.checkInbox")}
                 <Check className="w-4 h-4" />
               </>
             ) : countdown ? (
               countdown === "Support"
                 ? t("banner.verification.contactSupport")
                 : t("banner.verification.wait").replace("{countdown}", countdown)
             ) : (
               <>
                 {t("banner.verification.resendVerification")}
                 <ArrowRight className="w-4 h-4" />
               </>
             )}
          </Button>

          <Button
            variant="ghost"
            onClick={() => window.open("https://t.me/Omar_Gatara", "_blank")}
            className={`w-full ${bannerTheme.modal.button.ghost} font-medium h-12 rounded-xl text-[14px] flex items-center justify-center gap-2`}
          >
            <MessageCircle className="w-4 h-4" />
            {t("banner.verification.contactSupport")}
          </Button>
        </div>

        <p className={`text-[11px] ${bannerTheme.modal.text.small} mt-6 leading-normal`}>
          {user?.verification_resend_count && user.verification_resend_count >= 4
            ? t("banner.verification.maxAttemptsReached")
            : t("banner.verification.checkSpamFolder")}
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default VerifyEmailModal;
