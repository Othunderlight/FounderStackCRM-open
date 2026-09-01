import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useStore } from "../store";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { ChevronLeft, ChevronRight, User, Check, Loader2, Globe, Sun } from "lucide-react";
import { cn } from "../lib/utils";
import { createOnboarding, completeOnboarding } from "../lib/api";
import { toast } from "sonner";
import { onboardingPageTheme } from "../lib/theme";
import { useTranslation } from "../src/i18n";

const REFERRAL_OPTIONS = [
  "aiSource",
  "billboard",
  "friends",
  "facebook",
  "xcom",
  "newsletter",
  "linkedin",
  "youtube",
  "google",
  "instagram",
  "reddit",
  "podcast",
  "other",
];

export default function OnboardingPage() {
  const { user, logout, setProModalOpen, fetchCurrentUser, fetchMyAccess, language, theme } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  // Check if user is an invited team member
  // 1. Check navigation state (from signup form)
  // 2. Check if user object already has an organization
  const inviteType = location.state?.inviteType;
  const isInvitedTeamMember = inviteType === "TEAM" || !!user?.organization;

  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<Record<string, any>>({
    fullName: "",
    email: user?.email || "",
    linkedInUrl: "",
    companyName: "",
    clientsCount: "under 10",
    referral: [],
  });

  const totalSteps = isInvitedTeamMember ? 1 : 3;
  const progressPercentage = ((currentStep + 1) / totalSteps) * 100;

  React.useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        email: user.email || prev.email,
        fullName:
          prev.fullName ||
          (user.first_name && user.last_name
            ? `${user.first_name} ${user.last_name}`
            : user.first_name || ""),
      }));
    }
  }, [user]);

  const handleInputChange = (id: string, value: any) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
    if (errors[id]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[id];
        return newErrors;
      });
    }
  };

  const handleUrlBlur = (id: string) => {
    let value = formData[id];
    if (value && !value.includes("://") && value.length > 0) {
      handleInputChange(id, "https://" + value);
    }
  };

  const toggleReferral = (option: string) => {
    setFormData((prev) => {
      const current = prev.referral || [];
      if (current.includes(option)) {
        return {
          ...prev,
          referral: current.filter((i: string) => i !== option),
        };
      }
      return { ...prev, referral: [...current, option] };
    });
  };

  const validateStep = () => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 0) {
      const trimmedName = (formData.fullName || "").trim();
      if (!trimmedName) {
        newErrors.fullName = t("onboarding.fullNameRequired");
      } else {
        const nameParts = trimmedName.split(/\s+/);
        if (nameParts.length < 2) {
          newErrors.fullName = t("onboarding.lastNameRequired");
        }
      }

      const urlRegex =
        /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
      if (formData.linkedInUrl && !urlRegex.test(formData.linkedInUrl)) {
        newErrors.linkedInUrl = t("onboarding.invalidUrl");
      }
    } else if (currentStep === 1) {
      if (!formData.companyName || !formData.companyName.trim()) {
        newErrors.companyName = t("onboarding.companyNameRequired");
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = async () => {
    if (!validateStep()) return;

    const nameParts = (formData.fullName || "").trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    if (currentStep === 0 && isInvitedTeamMember) {
      setIsSubmitting(true);
      try {
        const onboardingRes = await createOnboarding({
          first_name: firstName,
          last_name: lastName,
          linkedin_url: formData.linkedInUrl?.trim() || null,
          subscribe: false,
        });

        if (!onboardingRes.ok) {
          const errorData = await onboardingRes.json().catch(() => ({}));
          const errorMsg =
            errorData.detail || errorData.message || JSON.stringify(errorData);
          throw new Error(`Onboarding failed: ${errorMsg}`);
        }

        await completeOnboarding();
        await fetchCurrentUser();
        await fetchMyAccess();
        toast.success(t("onboarding.welcomeToTeam"));
        setProModalOpen(true);
        navigate("/");
        return;
      } catch (err) {
        console.error("Failed to complete onboarding for invited user", err);
        toast.error(
          err instanceof Error ? err.message : "Failed to complete onboarding",
        );
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (currentStep < 2) {
      setCurrentStep((prev) => prev + 1);
    } else {
      setIsSubmitting(true);
      try {
        const onboardingRes = await createOnboarding({
          first_name: firstName,
          last_name: lastName,
          linkedin_url: formData.linkedInUrl?.trim() || null,
          company_name: formData.companyName?.trim(),
          clients_count: formData.clientsCount,
          referral: formData.referral,
          subscribe: false,
        });

        if (!onboardingRes.ok) {
          const errorData = await onboardingRes.json().catch(() => ({}));
          const errorMsg =
            errorData.detail || errorData.message || JSON.stringify(errorData);
          throw new Error(`Onboarding failed: ${errorMsg}`);
        }

        await completeOnboarding();
        await fetchCurrentUser();
        await fetchMyAccess();
        toast.success(t("onboarding.onboardingCompleted"));
        setProModalOpen(true);
        navigate("/");
      } catch (err) {
        console.error("Failed to complete onboarding", err);
        toast.error(
          err instanceof Error ? err.message : "Failed to complete onboarding",
        );
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="flex-1 px-5 md:px-14 py-6 md:py-16 flex flex-col min-h-0">
            <div className="mt-8 mb-16 md:mt-2 md:mb-8">
              <h2 className={cn("text-xl md:text-[20px] font-bold", onboardingPageTheme.text.primary)}>
                {t("onboarding.getToKnowYou")}
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 pb-4">
              <div className="space-y-2">
                <Label
                  htmlFor="fullName"
                  className={cn(
                    "text-sm font-medium",
                    errors.fullName ? onboardingPageTheme.text.error : onboardingPageTheme.text.muted,
                  )}
                >
                  {t("onboarding.fullName")}
                </Label>
                <Input
                  id="fullName"
                  placeholder={t("onboarding.fullNamePlaceholder")}
                  value={formData.fullName}
                  onChange={(e) =>
                    handleInputChange("fullName", e.target.value)
                  }
                  dir={language === "ar" ? "rtl" : "ltr"}
                  className={cn(
                    "mt-2 h-9 rounded-md text-sm",
                    onboardingPageTheme.bg.input,
                    onboardingPageTheme.border.primary,
                    onboardingPageTheme.text.primary,
                    onboardingPageTheme.focus.ring,
                    errors.fullName && "border-red-500 focus:ring-red-500/40",
                  )}
                />
                {errors.fullName && (
                  <p className={cn("text-[10px]", onboardingPageTheme.text.error)}>{t("onboarding.fullNameRequired")}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="linkedInUrl"
                  className={cn(
                    "text-sm font-medium",
                    errors.linkedInUrl ? onboardingPageTheme.text.error : onboardingPageTheme.text.muted,
                  )}
                >
                  {t("onboarding.linkedInUrl")}
                </Label>
                <Input
                  id="linkedInUrl"
                  placeholder={t("onboarding.linkedInPlaceholder")}
                  value={formData.linkedInUrl}
                  onChange={(e) =>
                    handleInputChange("linkedInUrl", e.target.value)
                  }
                  onBlur={() => handleUrlBlur("linkedInUrl")}
                  dir={language === "ar" ? "rtl" : "ltr"}
                  className={cn(
                    "mt-2 h-9 rounded-md text-sm",
                    onboardingPageTheme.bg.input,
                    onboardingPageTheme.border.primary,
                    onboardingPageTheme.text.primary,
                    onboardingPageTheme.focus.ring,
                    errors.linkedInUrl && "border-red-500 focus:ring-red-500/40",
                  )}
                />
                {errors.linkedInUrl && (
                  <p className={cn("text-[10px]", onboardingPageTheme.text.error)}>
                    {t("onboarding.invalidUrl")}
                  </p>
                )}
              </div>

            </div>

            <div className={cn("fixed bottom-0 left-0 right-0 p-4 md:bg-transparent md:p-0 md:static md:mt-4", onboardingPageTheme.bg.primary)}>
              <Button
                onClick={nextStep}
                disabled={isSubmitting}
                className={cn("w-full py-3 md:py-2 font-medium h-12 md:h-9 rounded-xl md:rounded-md text-sm flex items-center justify-center gap-2", "text-white", onboardingPageTheme.button.primary)}
              >
                {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                Continue
              </Button>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="flex-1 px-5 md:px-14 py-6 md:py-16 flex flex-col min-h-0 relative">
            <button
              onClick={prevStep}
              className={cn("absolute top-4 md:top-6 p-2 transition-colors", language === "ar" ? "right-4 md:right-6" : "left-4 md:left-6", onboardingPageTheme.text.footer, `hover:${onboardingPageTheme.text.primary}`)}
            >
              {language === "ar" ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
            <div className="mt-8 mb-16 md:mt-2 md:mb-8">
              <h2 className={cn("text-xl md:text-[20px] font-bold", onboardingPageTheme.text.primary)}>
                {t("onboarding.createWorkspace")}
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto space-y-6 pb-4">
              <div className="space-y-2">
                <Label
                  htmlFor="companyName"
                  className={cn(
                    "text-sm font-medium",
                    errors.companyName ? onboardingPageTheme.text.error : onboardingPageTheme.text.muted,
                  )}
                >
                  {t("onboarding.companyName")}
                </Label>
                <Input
                  id="companyName"
                  placeholder={t("onboarding.companyNamePlaceholder")}
                  value={formData.companyName}
                  onChange={(e) =>
                    handleInputChange("companyName", e.target.value)
                  }
                  dir={language === "ar" ? "rtl" : "ltr"}
                  className={cn(
                    "mt-2 h-9 rounded-md text-sm",
                    onboardingPageTheme.bg.input,
                    onboardingPageTheme.border.primary,
                    onboardingPageTheme.text.primary,
                    onboardingPageTheme.focus.ring,
                    errors.companyName && "border-red-500 focus:ring-red-500/40",
                  )}
                />
                {errors.companyName && (
                  <p className={cn("text-[10px]", onboardingPageTheme.text.error)}>
                    {t("onboarding.companyNameRequired")}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className={cn("text-sm font-medium", onboardingPageTheme.text.muted)}>
                  {t("onboarding.howManyClients")}
                </Label>
                <div className="relative mt-2">
                  <select
                    className={cn("w-full h-9 border rounded-md px-3 py-1 text-sm focus:outline-none appearance-none cursor-pointer", onboardingPageTheme.bg.input, onboardingPageTheme.border.primary, onboardingPageTheme.text.primary, onboardingPageTheme.focus.ring)}
                    value={formData.clientsCount}
                    onChange={(e) =>
                      handleInputChange("clientsCount", e.target.value)
                    }
                  >
                    <option value="under 10">{t("onboarding.under10")}</option>
                    <option value="under 50">{t("onboarding.under50")}</option>
                    <option value="under 100">{t("onboarding.under100")}</option>
                  </select>
                  <ChevronLeft
                    size={12}
                    className={cn("-rotate-90 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none", onboardingPageTheme.text.footer)}
                  />
                </div>
              </div>
            </div>
            <div className={cn("fixed bottom-0 left-0 right-0 p-4 md:bg-transparent md:p-0 md:static md:mt-4", onboardingPageTheme.bg.primary)}>
              <Button
                onClick={nextStep}
                disabled={isSubmitting}
                className={cn("w-full py-3 md:py-2 font-medium h-12 md:h-9 rounded-xl md:rounded-md text-sm flex items-center justify-center gap-2", "text-white", onboardingPageTheme.button.primary)}
              >
                {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                Continue
              </Button>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="flex-1 px-5 md:px-14 py-6 md:py-16 flex flex-col min-h-0 relative">
            <button
              onClick={prevStep}
              className={cn("absolute top-4 md:top-6 p-2 transition-colors", language === "ar" ? "right-4 md:right-6" : "left-4 md:left-6", onboardingPageTheme.text.footer, `hover:${onboardingPageTheme.text.primary}`)}
            >
              {language === "ar" ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
            <div className="mt-8 mb-16 md:mt-2 md:mb-8">
              <h2 className={cn("text-xl md:text-[20px] font-bold mb-1", onboardingPageTheme.text.primary)}>
                {t("onboarding.howDidYouHear")}
              </h2>
              <p className={cn("text-xs", onboardingPageTheme.text.footer)}>
                {t("onboarding.optionalSelectWhere")}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto pr-2 pb-4">
              <div className="flex flex-wrap gap-2">
                {REFERRAL_OPTIONS.map((option) => (
                  <button
                    key={option}
                    onClick={() => toggleReferral(option)}
                    className={cn(
                      "px-3 py-1.5 rounded-full border text-xs transition-all flex items-center gap-1.5",
                      formData.referral?.includes(option)
                        ? cn(onboardingPageTheme.referral.active.bg, onboardingPageTheme.referral.active.border, onboardingPageTheme.text.primary)
                        : cn(onboardingPageTheme.card, onboardingPageTheme.border.primary, onboardingPageTheme.referral.inactive, "hover:border-zinc-700", theme === "dark" ? "hover:text-white" : "hover:text-black"),
                    )}
                  >
                    {t(`onboarding.referral.${option}`)}
                    {formData.referral?.includes(option) && (
                      <Check size={11} className="text-blue-500" />
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className={cn("fixed bottom-0 left-0 right-0 p-4 md:bg-transparent md:p-0 md:static md:mt-4 space-y-2", onboardingPageTheme.bg.primary)}>
              <Button
                onClick={nextStep}
                disabled={isSubmitting}
                className={cn("w-full py-3 md:py-2 font-medium h-12 md:h-9 rounded-xl md:rounded-md text-sm flex items-center justify-center gap-2", "text-white", onboardingPageTheme.button.primary)}
              >
                {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                Continue
              </Button>
              <Button
                onClick={nextStep}
                variant="ghost"
                className={cn("w-full text-xs font-medium h-10 md:h-9 rounded-xl md:rounded-md", theme === "dark" ? "text-zinc-300 hover:text-zinc-100 hover:bg-zinc-700 bg-zinc-800/50 md:bg-zinc-800/75" : "text-zinc-700 hover:text-zinc-900 hover:bg-gray-100 bg-white/50 border border-zinc-300")}
              >
                {t("onboarding.skip")}
              </Button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={cn("min-h-screen flex flex-col font-sans", onboardingPageTheme.bg.primary, onboardingPageTheme.text.secondary)}>
      {/* Language and Theme Switches */}
      <div className={cn("absolute top-4 md:top-6 z-10", language === "ar" ? "left-4 md:left-6" : "right-4 md:right-6", "flex gap-2")}>
          <button
            onClick={() => useStore.getState().setLanguage(language === "en" ? "ar" : "en")}
            className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors text-xs font-medium", theme === "dark" ? "border-zinc-700/50 bg-zinc-800/50 hover:bg-zinc-800/70 text-zinc-300" : "border-zinc-300/50 bg-white/50 hover:bg-gray-100 text-zinc-700", onboardingPageTheme.text.secondary)}
          >
            <Globe size={14} />
            {language === "en" ? "العربية" : "English"}
          </button>
          <button
            onClick={() => useStore.getState().setTheme(theme === "dark" ? "light" : "dark")}
            className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors text-xs font-medium", theme === "dark" ? "border-zinc-700/50 bg-zinc-800/50 hover:bg-zinc-800/70 text-zinc-300" : "border-zinc-300/50 bg-white/50 hover:bg-gray-100 text-zinc-700", onboardingPageTheme.text.secondary)}
          >
            <Sun size={14} />
            {theme === "dark" ? "Light" : "Dark"}
          </button>
      </div>

      <div className="pt-8 md:pt-12 pb-6 md:pb-8 flex items-center justify-center gap-3">
        <img src="/logo.png" alt="FounderStack Logo" className="h-14 w-auto" />
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-purple-600 via-blue-500 to-green-500 bg-clip-text text-transparent">
          {t("inviteLanding.founderStack")}
        </h1>
      </div>

      <main className="flex-1 flex items-center justify-center p-4 md:p-4">
        <div className={cn("w-full max-w-[1100px] md:h-[640px] md:border md:rounded-[32px] overflow-hidden md:grid md:grid-cols-2 shadow-2xl", onboardingPageTheme.bg.secondary, onboardingPageTheme.border.secondary)}>
          <div className={cn("flex flex-col relative min-h-screen md:min-h-0 rounded-2xl md:rounded-none pb-20 md:pb-0", onboardingPageTheme.bg.primary)}>
            {/* Progress Bar */}
            <div className={cn("absolute top-0 left-0 w-full h-1", theme === "dark" ? "bg-zinc-900" : "bg-zinc-200")}>
              <div
                className={cn("h-full transition-all duration-500 ease-in-out", onboardingPageTheme.progress)}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>

            {renderStep()}
          </div>

          <div className={cn("hidden md:border-l md:p-12 md:flex md:items-center md:justify-center md:overflow-hidden md:relative", theme === "dark" ? "md:bg-[#0f0f0f] md:border-zinc-800/50" : "md:bg-[#f0f0f0] md:border-zinc-300/50")}>
            <div className="w-full h-full opacity-40 grayscale pointer-events-none scale-110 translate-x-12 translate-y-8">
              <div className={cn("w-full aspect-[4/3] rounded-tl-2xl border-t border-l flex overflow-hidden", theme === "dark" ? "bg-[#050505] border-zinc-800" : "bg-[#f5f5f5] border-zinc-300")}>
                <div className={cn("w-16 border-r p-4 space-y-6", theme === "dark" ? "border-zinc-800" : "border-zinc-300")}>
                  <div className={cn("w-8 h-8 rounded-lg", theme === "dark" ? "bg-zinc-800/50" : "bg-zinc-200/50")} />
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div
                        key={i}
                        className={cn("w-full h-1.5 rounded-full", theme === "dark" ? "bg-zinc-900" : "bg-zinc-300")}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex-1 p-8 space-y-8">
                  <div className="flex items-center justify-between">
                    <div className={cn("h-4 w-32 rounded-full", theme === "dark" ? "bg-zinc-900" : "bg-zinc-300")} />
                    <div className={cn("w-8 h-8 rounded-full", theme === "dark" ? "bg-zinc-900" : "bg-zinc-300")} />
                  </div>
                  <div className="space-y-4">
                    {/* If team member, show only the steps needed. Else show all. */}
                    {(isInvitedTeamMember
                      ? Array.from({ length: totalSteps }, (_, i) => i + 1)
                      : [1, 2, 3]
                    ).map((i) => (
                      <div
                        key={i}
                        className={`flex items-center gap-4 ${i > (isInvitedTeamMember ? totalSteps : 3) ? "hidden" : ""}`}
                      >
                        {/* Simple visualization, we can improve active state if needed */}
                        <div
                          className={cn("w-3 h-3 rounded-sm", i <= currentStep + 1 ? (theme === "dark" ? "bg-white" : "bg-blue-500") : (theme === "dark" ? "bg-zinc-900" : "bg-zinc-300"))}
                        />
                        <div className={cn("h-2 w-32 rounded-full", theme === "dark" ? "bg-zinc-900" : "bg-zinc-300")} />
                        <div className={cn("h-2 w-full rounded-full", theme === "dark" ? "bg-zinc-900/50" : "bg-zinc-300/50")} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className={cn("absolute inset-0 bg-gradient-to-r via-transparent to-transparent", theme === "dark" ? "from-[#0f0f0f]" : "from-[#f0f0f0]")} />
          </div>
        </div>
      </main>

      <footer className={cn("py-6 md:py-8 flex items-center justify-center gap-4 md:gap-6 text-[11px] font-medium", onboardingPageTheme.text.footer)}>
        <span>{t("onboarding.copyright")}</span>
        <a href="#" className={cn("transition-colors", `hover:${onboardingPageTheme.text.primary}`)}>
          {t("onboarding.privacyPolicy")}
        </a>
        <a href="#" className={cn("transition-colors", `hover:${onboardingPageTheme.text.primary}`)}>
          {t("onboarding.support")}
        </a>
        <button
          onClick={() => {
            logout();
            navigate("/signin");
          }}
          className={cn("transition-colors", `hover:${onboardingPageTheme.text.primary}`)}
        >
          {t("onboarding.signOut")}
        </button>
      </footer>
    </div>
  );
}
