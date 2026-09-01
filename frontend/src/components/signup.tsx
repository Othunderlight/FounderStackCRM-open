import React from "react";
import SignupForm from "./SignupForm";
import { authTheme } from "../../lib/theme";
import { useTranslation } from "../../src/i18n";
import { useStore } from "../../store";
import { Globe, Sun } from "lucide-react";
import { cn } from "../../lib/utils";

export default function Signup({
  inviteToken,
  inviteType,
}: {
  inviteToken?: string;
  inviteType?: string;
}) {
  const { t, dir } = useTranslation();
  const { language, theme } = useStore();
  return (
    <div className="flex items-center justify-center min-h-screen bg-background text-foreground relative px-4" dir={dir}>
      {/* Language and Theme Switches */}
      <div className={cn("absolute top-4 md:top-6 z-20", dir === "rtl" ? "left-4 md:left-6" : "right-4 md:right-6", "flex gap-2")}>
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

      {/* Brand Logo at the top */}
      <div className="absolute top-20 md:top-28 left-0 right-0 flex items-center justify-center gap-3">
        <img src="/logo.png" alt="FounderStack Logo" className="h-14 w-auto" />
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-purple-600 via-blue-500 to-green-500 bg-clip-text text-transparent">
          {" "}
          {t("inviteLanding.founderStack")}
        </h1>
      </div>

      <div className="flex flex-1 flex-col max-w-sm">
        <SignupForm inviteToken={inviteToken} inviteType={inviteType} />
      </div>
    </div>
  );
}
