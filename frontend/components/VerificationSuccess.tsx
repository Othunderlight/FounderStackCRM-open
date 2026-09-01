import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { CheckCircle, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import { bannerTheme } from '../lib/theme';
import { useTranslation } from '../src/i18n';
import { cn } from '../lib/utils';

export const VerificationSuccess = () => {
  const navigate = useNavigate();
  const { fetchPeople, language } = useStore();
  const { t } = useTranslation();
  const isRTL = language === "ar";

  useEffect(() => {
    // Refresh user state by fetching something or ideally we'd have a fetchCurrentUser
    // For now, let's just assume the user will navigate home
    // We could add a window.location.reload() or a specific api call to refresh the user object
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-background p-4 text-center">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-green-500/20 blur-3xl rounded-full" />
        <div className="relative ${bannerTheme.verificationSuccess.card} p-6 rounded-full ${bannerTheme.verificationSuccess.border}">
          <CheckCircle className={`w-16 h-16 ${bannerTheme.verificationSuccess.icon}`} />
        </div>
        <Sparkles className={`absolute -top-2 -right-2 w-6 h-6 ${bannerTheme.verificationSuccess.sparkle} animate-pulse`} />
      </div>

      <h1 className={`text-3xl font-bold ${bannerTheme.verificationSuccess.text.primary} mb-4`}>
        {t("verificationSuccess.emailVerified")}
      </h1>

      <p className={`${bannerTheme.verificationSuccess.text.secondary} max-w-md mb-8`}>
        {t("verificationSuccess.accountVerifiedDesc")}
      </p>

      <button
        onClick={() => {
            // Force reload to get updated user state from backend
            window.location.href = '/';
        }}
        className={`flex items-center gap-2 ${bannerTheme.verificationSuccess.button} text-white px-8 py-3 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 group`}
      >
        {t("verificationSuccess.goToDashboard")}
        {isRTL ? <ArrowLeft className={cn("w-5 h-5 transition-transform", isRTL ? "group-hover:-translate-x-1" : "group-hover:translate-x-1")} /> : <ArrowRight className={cn("w-5 h-5 transition-transform", "group-hover:translate-x-1")} />}
      </button>
    </div>
  );
};
