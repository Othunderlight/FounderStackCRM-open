import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getInvitationInfo } from "../lib/api";
import { Loader2, CheckCircle2, Globe, Sun } from "lucide-react";
import SignupForm from "../src/components/SignupForm";
import { inviteLandingTheme } from "../lib/theme";
import { cn } from "../lib/utils";
import { useTranslation } from "../src/i18n";
import { useStore } from "../store";

export function InviteLandingPage() {
    const { token } = useParams<{ token: string }>();
    const { t, dir } = useTranslation();
    const { language, theme } = useStore();
    const [inviteInfo, setInviteInfo] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (token) {
            getInvitationInfo(token)
                .then(async (res) => {
                    if (res.ok) {
                        const data = await res.json();
                        setInviteInfo(data);
                    } else {
                        setError(t("inviteLanding.invalidInviteLink"));
                    }
                })
                .catch(() => setError(t("inviteLanding.failedLoadInvite")))
                .finally(() => setLoading(false));
        }
    }, [token, t]);

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center text-text-primary" dir={dir}>
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center text-text-primary p-4" dir={dir}>
                <h1 className={cn("text-2xl font-bold mb-2", inviteLandingTheme.error)}>{t("inviteLanding.oops")}</h1>
                <p className="text-text-secondary mb-4">{error}</p>
                <Link to="/" className="text-accent hover:underline">
                    {t("inviteLanding.goBackHome")}
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full flex flex-col lg:flex-row bg-background relative" dir={dir}>
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

            {/* Left Side: Welcome Message */}
            <div className={cn("lg:w-1/2 p-8 lg:p-16 flex flex-col justify-center text-text-primary relative overflow-hidden", inviteLandingTheme.leftBg)}>
                {/* Abstract Background Elements */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
                    <div className={cn("absolute top-[-10%] start-[-10%] w-[50%] h-[50%] blur-[100px] rounded-full", inviteLandingTheme.blur.blue)}></div>
                    <div className={cn("absolute bottom-[-10%] end-[-10%] w-[50%] h-[50%] blur-[100px] rounded-full", inviteLandingTheme.blur.purple)}></div>
                </div>

                <div className="relative z-10 max-w-lg mx-auto">
                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-8">
                            <img src="/logo.png" alt="FounderStack Logo" className="h-14 w-auto" />
                            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-purple-600 via-blue-500 to-green-500 bg-clip-text text-transparent">
                                {" "}
                                {t("inviteLanding.founderStack")}
                            </h1>
                        </div>

                        <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-6 leading-tight">
                            {t("inviteLanding.growTogether")}
                        </h1>
                        <div className="space-y-6">
                            <div className={cn("p-6 rounded-2xl backdrop-blur-sm border border-border", inviteLandingTheme.card)}>
                                <p className="text-xl font-medium text-text-primary mb-2 leading-relaxed">
                                        <span className={inviteLandingTheme.inviter}>{inviteInfo?.inviter_name || inviteInfo?.inviter_username}</span>
                                    {inviteInfo?.type === 'TEAM'
                                        ? ` ${t("inviteLanding.invitedYou")}`
                                        : ` ${t("inviteLanding.invitedYouExternal")}`
                                    }
                                    <br />
                                    {inviteInfo?.type === 'TEAM'
                                        ? t("inviteLanding.joinTeam")
                                        : t("inviteLanding.joinExternal")
                                    }
                                </p>
                            </div>

                            <div className="space-y-4 pt-4">
                                <div className="flex items-start gap-3">
                                    <CheckCircle2 className={cn("w-6 h-6 mt-1 shrink-0", inviteLandingTheme.check.green)} />
                                    <div>
                                        <h3 className="font-semibold text-text-primary">{t("inviteLanding.contextFirst")}</h3>
                                        <p className="text-sm text-text-secondary">{t("inviteLanding.contextFirstDesc")}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <CheckCircle2 className={cn("w-6 h-6 mt-1 shrink-0", inviteLandingTheme.check.blue)} />
                                    <div>
                                        <h3 className="font-semibold text-text-primary">{t("inviteLanding.aiSecond")}</h3>
                                        <p className="text-sm text-text-secondary">{t("inviteLanding.aiSecondDesc")}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <CheckCircle2 className={cn("w-6 h-6 mt-1 shrink-0", inviteLandingTheme.check.purple)} />
                                    <div>
                                        <h3 className="font-semibold text-text-primary">{t("inviteLanding.simplicityAlways")}</h3>
                                        <p className="text-sm text-text-secondary">{t("inviteLanding.simplicityAlwaysDesc")}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side: Signup Form */}
            <div className={cn("lg:w-1/2 flex flex-col items-center justify-center p-8 lg:p-0 lg:border-s border-border/20", inviteLandingTheme.rightBg)}>
                <div className="w-full max-w-sm">
                    <SignupForm inviteToken={token} inviteType={inviteInfo?.type} />
                </div>
            </div>
        </div>
    );
}
