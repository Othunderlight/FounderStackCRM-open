import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { AlertCircle, Mail, Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
import { cn } from '../lib/utils';
import { bannerTheme } from '../lib/theme';
import { useTranslation } from '../src/i18n';

export const VerificationBanner = () => {
  const { user, resendVerificationEmail, fetchCurrentUser, language } = useStore();

  if (!user || !user.last_verification_resend_at) return null;

  const { t } = useTranslation();
  const isRTL = language === "ar";
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [countdown, setCountdown] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.is_verified || user.must_verify_email) return;

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
  }, [user]);

  if (!user || !user.is_verified || user.must_verify_email) return null;
  if (!user.last_verification_resend_at) return null;

  const handleResend = async () => {
    if (countdown) return;
    setStatus('sending');
    try {
      await resendVerificationEmail();
      await fetchCurrentUser();
      setStatus('sent');
      setTimeout(() => setStatus('idle'), 10000);
    } catch (error) {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  return (
    <div className={`${bannerTheme.verification.bg} ${bannerTheme.verification.border} px-4 py-2 flex items-center justify-between z-50`}>
      <div className="flex items-center gap-3">
        <div className={`${bannerTheme.verification.iconBg} p-1.5 rounded-md`}>
          <AlertCircle className={`w-4 h-4 ${bannerTheme.verification.iconText}`} />
        </div>
        <p className={`text-sm font-medium ${bannerTheme.verification.text}`}>
          {countdown === "Support"
            ? t("banner.verification.maxResendReached")
            : t("banner.verification.verifyEmailDesc")}
        </p>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={handleResend}
          disabled={status === 'sending' || status === 'sent' || countdown !== null}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
            status === 'sent'
              ? bannerTheme.verification.button.sent
              : status === 'error'
              ? bannerTheme.verification.button.error
              : countdown !== null
              ? bannerTheme.verification.button.disabled
              : `${bannerTheme.verification.button.idle} active:scale-95 disabled:opacity-50 disabled:active:scale-100`
          )}
        >
          {status === 'sending' ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {t("banner.verification.sending")}
            </>
          ) : status === 'sent' ? (
            <>
              <Mail className="w-3.5 h-3.5" />
              {t("banner.verification.checkInbox")}
            </>
          ) : status === 'error' ? (
            t("banner.verification.failedToSend")
          ) : countdown ? (
            countdown === "Support" ? t("banner.verification.contactSupport") : t("banner.verification.wait").replace('{countdown}', countdown)
          ) : (
            <>
              {t("banner.verification.verifyEmailBtn")}
              {isRTL ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
            </>
          )}
        </button>
      </div>
    </div>
  );
};
