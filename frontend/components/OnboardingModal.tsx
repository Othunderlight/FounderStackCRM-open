import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { useStore } from "../store";
import {
  Rocket,
  User,
  Building2,
  Mail,
  Download,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Target,
  Globe,
  Plus,
  ArrowRight,
  Sun,
} from "lucide-react";
import { cn } from "../lib/utils";
import { onboardingModalTheme } from "../lib/theme";
import { useTranslation } from "../src/i18n";

const OnboardingModal = () => {
  const { isOnboardingOpen, setOnboardingOpen, setTourStep, user, language, theme } = useStore();
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0); // -1 for back, 1 for next

  const steps = [
    {
      id: "welcome",
      title: t("onboarding.welcome"),
      description: t("onboarding.setupWorkspace"),
      icon: Rocket,
    },
    {
      id: "profile",
      title: t("onboarding.setupProfile"),
      description: t("onboarding.callYouRole"),
      icon: User,
    },
    {
      id: "icp",
      title: t("onboarding.defineTarget"),
      description: t("onboarding.understandICP"),
      icon: Target,
    },
    {
      id: "integrations",
      title: t("onboarding.connectData"),
      description: t("onboarding.syncEmailLeads"),
      icon: Mail,
    },
    {
      id: "extension",
      title: t("onboarding.superchargeBrowser"),
      description: t("onboarding.installExtension"),
      icon: Download,
    },
    {
      id: "finish",
      title: t("onboarding.allSet"),
      description: t("onboarding.crmReady"),
      icon: CheckCircle2,
    },
  ];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setDirection(1);
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(currentStep - 1);
    }
  };

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <Dialog open={isOnboardingOpen} onOpenChange={setOnboardingOpen}>
      <DialogContent className={cn("sm:max-w-[600px] max-w-[95vw] max-h-[90vh] md:max-h-none border-border p-0 overflow-hidden gap-0 rounded-2xl md:rounded-[18px]", onboardingModalTheme.bg)}>
        <div className={cn("relative h-1", theme === "dark" ? "bg-[#1a1a1a]" : "bg-zinc-200")}>
          <div
            className={cn("absolute top-0 left-0 h-full transition-all duration-500 ease-out", onboardingModalTheme.progress)}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex justify-end gap-2 p-4">
          <button
            onClick={() => useStore.getState().setLanguage(language === "en" ? "ar" : "en")}
            className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors text-xs font-medium", theme === "dark" ? "border-zinc-700/50 bg-zinc-800/50 hover:bg-zinc-800/70 text-zinc-300" : "border-zinc-300/50 bg-white/50 hover:bg-gray-100 text-zinc-700")}
          >
            <Globe size={14} />
            {language === "en" ? "العربية" : "English"}
          </button>
          <button
            onClick={() => useStore.getState().setTheme(theme === "dark" ? "light" : "dark")}
            className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors text-xs font-medium", theme === "dark" ? "border-zinc-700/50 bg-zinc-800/50 hover:bg-zinc-800/70 text-zinc-300" : "border-zinc-300/50 bg-white/50 hover:bg-gray-100 text-zinc-700")}
          >
            <Sun size={14} />
            {theme === "dark" ? "Light" : "Dark"}
          </button>
        </div>

        <div className="p-4 md:p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", onboardingModalTheme.blue.bg, onboardingModalTheme.blue.text)}>
                {React.createElement(steps[currentStep].icon, { size: 20 })}
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-textPrimary leading-none mb-1">
                  {steps[currentStep].title}
                </DialogTitle>
                <DialogDescription className="text-sm text-textSecondary">
                  {t("onboarding.step")} {currentStep + 1} {t("onboarding.of")} {steps.length}
                </DialogDescription>
              </div>
            </div>
            <div className="flex gap-1">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-1.5 h-1.5 rounded-full transition-colors",
                    i === currentStep ? onboardingModalTheme.progress : i < currentStep ? "bg-blue-500/40" : "bg-border"
                  )}
                />
              ))}
            </div>
          </div>

          <div className="min-h-[300px] animate-in fade-in slide-in-from-bottom-4 duration-300">
            {currentStep === 0 && (
              <div className="space-y-6">
                <div className={cn("p-6 border border-border rounded-2xl relative overflow-hidden group", onboardingModalTheme.card)}>
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Sparkles size={80} />
                  </div>
                  <h4 className="text-xl font-bold text-textPrimary mb-2">
                    {t("onboarding.futureOfSales")}
                  </h4>
                  <p className="text-textSecondary text-sm mb-6 leading-relaxed">
                    {t("onboarding.automateOutreach")}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-textSecondary">
                    <div className="flex items-center gap-1.5">
                        <div className={cn("w-1 h-1 rounded-full", onboardingModalTheme.progress)} />
                      {t("onboarding.free7DayTrial")}
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className={cn("w-1 h-1 rounded-full", onboardingModalTheme.progress)} />
                      {t("onboarding.unlimitedLeads")}
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className={cn("w-1 h-1 rounded-full", onboardingModalTheme.progress)} />
                      {t("onboarding.aiAssistant")}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className={cn("p-4 border border-border rounded-xl transition-colors cursor-pointer group", "bg-[#1a1a1a]/50 hover:bg-[#1a1a1a]")}>
                        <Building2 size={20} className={cn("mb-3", onboardingModalTheme.blue.text)} />
                        <p className="text-sm font-medium text-textPrimary mb-1">{t("onboarding.b2bSaas")}</p>
                        <p className="text-[11px] text-textSecondary">{t("onboarding.optimizedTech")}</p>
                    </div>
                    <div className={cn("p-4 border border-border rounded-xl transition-colors cursor-pointer group", "bg-[#1a1a1a]/50 hover:bg-[#1a1a1a]")}>
                        <Target size={20} className={cn("mb-3", onboardingModalTheme.purple.text)} />
                        <p className="text-sm font-medium text-textPrimary mb-1">{t("onboarding.agencies")}</p>
                        <p className="text-[11px] text-textSecondary">{t("onboarding.scaleOutreach")}</p>
                    </div>
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="flex flex-col items-center justify-center py-4">
                   <div className={cn("w-24 h-24 rounded-full border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer group", onboardingModalTheme.card, "text-textSecondary hover:text-blue-500 hover:border-blue-500/50")}>
                    <Plus size={24} />
                    <span className="text-[10px] font-medium uppercase tracking-wider">{t("onboarding.avatar")}</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                     <label className="text-xs font-medium text-textSecondary uppercase tracking-wider mb-1.5 block">{t("onboarding.fullName")}</label>
                    <input
                      type="text"
                      defaultValue={user?.name || ""}
                      placeholder={t("onboarding.fullNamePlaceholder")}
                      dir={language === "ar" ? "rtl" : "ltr"}
                       className={cn("w-full border border-border rounded-lg px-4 py-2.5 text-sm text-textPrimary focus:outline-none transition-all", onboardingModalTheme.input.bg, onboardingModalTheme.input.focus)}
                    />
                  </div>
                  <div>
                     <label className="text-xs font-medium text-textSecondary uppercase tracking-wider mb-1.5 block">{t("onboarding.yourRole")}</label>
                     <select className={cn("w-full border border-border rounded-lg px-4 py-2.5 text-sm text-textPrimary focus:outline-none transition-all", onboardingModalTheme.input.bg, onboardingModalTheme.input.focus)}>
                      <option>{t("onboarding.founderCEO")}</option>
                      <option>{t("onboarding.salesRep")}</option>
                      <option>{t("onboarding.marketingManager")}</option>
                      <option>{t("onboarding.operations")}</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div>
                     <label className="text-xs font-medium text-textSecondary uppercase tracking-wider mb-1.5 block">{t("onboarding.targetIndustries")}</label>
                    <div className="flex flex-wrap gap-2">
                        {[
                          t("onboarding.saas"),
                          t("onboarding.fintech"),
                          t("onboarding.healthtech"),
                          t("onboarding.web3"),
                          t("onboarding.ecommerce")
                        ].map(tag => (
                            <button key={tag} className={cn("px-3 py-1.5 rounded-full border border-border text-xs text-textSecondary transition-colors", onboardingModalTheme.card, onboardingModalTheme.tag.hover)}>
                                {tag}
                            </button>
                        ))}
                        <button className={cn("px-3 py-1.5 rounded-full border border-dashed border-border text-xs text-textSecondary flex items-center gap-1", onboardingModalTheme.card)}>
                            <Plus size={12} /> {t("onboarding.addIndustry")}
                        </button>
                    </div>
                  </div>
                  <div>
                     <label className="text-xs font-medium text-textSecondary uppercase tracking-wider mb-1.5 block">{t("onboarding.targetLocation")}</label>
                     <div className={cn("flex items-center gap-2 border border-border rounded-lg px-4 py-2.5", onboardingModalTheme.input.bg)}>
                        <Globe size={16} className="text-textSecondary" />
                        <input
                            type="text"
                            placeholder={t("onboarding.locationPlaceholder")}
                            dir={language === "ar" ? "rtl" : "ltr"}
                            className="bg-transparent border-none focus:outline-none text-sm text-textPrimary w-full"
                        />
                    </div>
                  </div>
                </div>
                <div className={cn("p-4 rounded-xl", onboardingModalTheme.tip.bg, onboardingModalTheme.tip.border)}>
                    <p className={cn("text-xs leading-relaxed", onboardingModalTheme.tip.text)}>
                        <strong>{t("onboarding.proTip")}</strong> {t("onboarding.icpHelpsAI")}
                    </p>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                <button className={cn("w-full flex items-center gap-4 p-4 border border-border rounded-xl transition-all group", onboardingModalTheme.card, "hover:bg-[#222]")}>
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", onboardingModalTheme.blue.bg, onboardingModalTheme.blue.text)}>
                        <Mail size={20} />
                    </div>
                    <div className="text-left">
                        <p className="text-sm font-semibold text-textPrimary">{t("onboarding.syncGoogle")}</p>
                        <p className="text-xs text-textSecondary">{t("onboarding.trackEmailsMeetings")}</p>
                    </div>
                    <ArrowRight size={16} className="ml-auto text-textSecondary opacity-0 group-hover:opacity-100 transition-all" />
                </button>
                <button className={cn("w-full flex items-center gap-4 p-4 border border-border rounded-xl transition-all group", onboardingModalTheme.card, "hover:bg-[#222]")}>
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", onboardingModalTheme.orange.bg, onboardingModalTheme.orange.text)}>
                        <Mail size={20} />
                    </div>
                    <div className="text-left">
                        <p className="text-sm font-semibold text-textPrimary">{t("onboarding.syncOutlook")}</p>
                        <p className="text-xs text-textSecondary">{t("onboarding.connectCorporate")}</p>
                    </div>
                    <ArrowRight size={16} className="ml-auto text-textSecondary opacity-0 group-hover:opacity-100 transition-all" />
                </button>
                <button className={cn("w-full flex items-center gap-4 p-4 border border-dashed border-border rounded-xl transition-all group", onboardingModalTheme.card, "hover:bg-[#222]")}>
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", "bg-textSecondary/10 text-textSecondary")}>
                        <Download size={20} />
                    </div>
                    <div className="text-left">
                        <p className="text-sm font-semibold text-textPrimary">{t("onboarding.importCSV")}</p>
                        <p className="text-xs text-textSecondary">{t("onboarding.uploadLeads")}</p>
                    </div>
                    <ArrowRight size={16} className="ml-auto text-textSecondary opacity-0 group-hover:opacity-100 transition-all" />
                </button>
              </div>
            )}

            {currentStep === 4 && (
              <div className="flex flex-col items-center justify-center text-center space-y-6 py-4">
                 <div className={cn("w-20 h-20 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.2)] animate-pulse", onboardingModalTheme.blue.bg, onboardingModalTheme.blue.text)}>
                    <Download size={40} />
                </div>
                <div>
                    <h4 className="text-lg font-bold text-textPrimary mb-2">{t("onboarding.browserExtension")}</h4>
                    <p className="text-sm text-textSecondary max-w-[320px] mx-auto leading-relaxed">
                        {t("onboarding.extensionDescription")}
                    </p>
                </div>
                 <button className={cn("px-8 py-3 rounded-full font-semibold text-sm transition-all shadow-[0_4px_12px_rgba(59,130,246,0.3)] hover:scale-105 active:scale-95 flex items-center gap-2 text-white", onboardingModalTheme.button.primary)}>
                    <Download size={18} />
{t("onboarding.addToChrome")}
                </button>
              </div>
            )}

            {currentStep === 5 && (
              <div className="flex flex-col items-center justify-center text-center space-y-6 py-8">
                <div className="relative">
                     <div className={cn("absolute inset-0 blur-3xl opacity-20 animate-pulse", onboardingModalTheme.progress)} />
                     <CheckCircle2 size={80} className={cn("relative", onboardingModalTheme.blue.text)} />
                </div>
                <div>
                    <h4 className="text-2xl font-bold text-textPrimary mb-2">{t("onboarding.congratulations")}</h4>
                    <p className="text-sm text-textSecondary max-w-[300px] mx-auto leading-relaxed">
                        {t("onboarding.workspaceReady")}
                    </p>
                </div>
                <div className="w-full grid grid-cols-2 gap-3 mt-4">
                     <div className={cn("p-4 border border-border rounded-xl", onboardingModalTheme.card)}>
                         <p className={cn("text-lg font-bold", onboardingModalTheme.blue.text)}>100%</p>
                         <p className="text-[10px] text-textSecondary uppercase tracking-widest font-medium">{t("onboarding.profileScore")}</p>
                    </div>
                     <div className={cn("p-4 border border-border rounded-xl", onboardingModalTheme.card)}>
                          <p className={cn("text-lg font-bold", onboardingModalTheme.blue.text)}>{t("onboarding.ready")}</p>
                         <p className="text-[10px] text-textSecondary uppercase tracking-widest font-medium">{t("onboarding.aiInsights")}</p>
                    </div>
                </div>
                <button 
                  onClick={() => {
                    setOnboardingOpen(false);
                    setTourStep(0);
                  }}
                   className={cn("mt-4 flex items-center gap-2 text-sm font-semibold transition-colors group", onboardingModalTheme.blue.text, "hover:text-blue-400")}
                >
                  <Sparkles size={16} className="group-hover:rotate-12 transition-transform" />
{t("onboarding.take1MinTour")}
                </button>
              </div>
            )}
          </div>
        </div>

         <div className={cn("p-4 md:p-6 border-t border-border flex items-center justify-between gap-3", onboardingModalTheme.footer)}>
            <button
              onClick={prevStep}
              disabled={currentStep === 0}
              className={cn(
                "flex items-center gap-2 text-sm font-medium transition-all",
                currentStep === 0 ? "opacity-0 pointer-events-none" : "text-textSecondary hover:text-textPrimary"
              )}
            >
              {language === "ar" ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
              {t("onboarding.back")}
            </button>
          
          {currentStep === steps.length - 1 ? (
            <button
              onClick={() => setOnboardingOpen(false)}
                className={cn("px-6 py-2.5 rounded-lg font-semibold text-sm transition-all flex items-center gap-2 text-white", onboardingModalTheme.button.primary)}
              >
                {t("onboarding.finishSetup")}
                <CheckCircle2 size={16} />
            </button>
          ) : (
              <button
                onClick={nextStep}
                className="bg-textPrimary text-background px-6 py-2.5 rounded-lg font-semibold text-sm transition-all flex items-center gap-2 hover:opacity-90 active:scale-95"
              >
                {t("onboarding.continue")}
                {language === "ar" ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
              </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingModal;
