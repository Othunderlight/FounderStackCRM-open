import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useStore } from "../../store";
import { useTranslation } from "../../src/i18n";
import { Shield, Check, ExternalLink } from "lucide-react";

/**
 * MCP Connect page — acts as the OAuth2 auth bridge.
 *
 * Flow:
 * 1. MCP server redirects here with ?auth_id=...&state=...&client_name=...&callback_url=...
 * 2. If user is not logged in, App.tsx redirects to /signin?returnTo=/mcp/connect?...
 * 3. After login, user lands back here with a valid token.
 * 4. User sees a "Connect" screen and clicks "Authorize".
 * 5. We redirect to callback_url with the JWT token.
 */
export default function McpConnect() {
    const location = useLocation();
    const navigate = useNavigate();
    const { accessToken, user } = useStore();
    const { t } = useTranslation();
    const [isAuthorizing, setIsAuthorizing] = useState(false);

    const params = new URLSearchParams(location.search);
    const authId = params.get("auth_id");
    const state = params.get("state");
    const clientName = params.get("client_name") || "MCP Client";
    const callbackUrl = params.get("callback_url");

    // If not authenticated, redirect to signin with returnTo preserving MCP params
    useEffect(() => {
        if (!accessToken) {
            const returnTo = encodeURIComponent(location.pathname + location.search);
            navigate(`/signin?returnTo=${returnTo}`);
        }
    }, [accessToken, navigate, location.pathname, location.search]);

    const handleAuthorize = () => {
        if (!callbackUrl || !authId || !accessToken) return;

        setIsAuthorizing(true);

        // Redirect to MCP server callback with the JWT token
        const redirectUrl = `${callbackUrl}?auth_id=${encodeURIComponent(authId)}&token=${encodeURIComponent(accessToken)}&state=${encodeURIComponent(state || "")}`;
        window.location.href = redirectUrl;
    };

    const handleCancel = () => {
        navigate("/");
    };

    // Missing required params
    if (!authId || !callbackUrl) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background text-foreground px-4">
                <div className="max-w-md w-full text-center space-y-4">
                    <div className="w-16 h-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center">
                        <Shield className="w-8 h-8 text-destructive" />
                    </div>
                    <h1 className="text-xl font-semibold">{t("mcp.invalidRequest")}</h1>
                    <p className="text-sm text-muted-foreground">
                        {t("mcp.missingParams")}
                    </p>
                    <Button variant="outline" onClick={() => navigate("/")}>
                        {t("mcp.goToDashboard")}
                    </Button>
                </div>
            </div>
        );
    }

    // Waiting for auth (shouldn't show if App.tsx redirect is working)
    if (!accessToken) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background text-foreground px-4">
                <div className="max-w-md w-full text-center space-y-4">
                    <div className="animate-spin w-8 h-8 mx-auto border-2 border-primary border-t-transparent rounded-full" />
                    <p className="text-sm text-muted-foreground">{t("mcp.redirecting")}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-background text-foreground px-4">
            {/* Brand Logo */}
            <div className="absolute top-12 md:top-20 left-0 right-0 flex items-center justify-center gap-3">
                <img src="/logo.png" alt="FounderStack Logo" className="h-14 w-auto" />
                <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-purple-600 via-blue-500 to-green-500 bg-clip-text text-transparent">
                    FounderStack
                </h1>
            </div>

            <div className="max-w-md w-full space-y-8">
                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="w-16 h-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center mb-4 border border-primary/20">
                        <Shield className="w-8 h-8 text-primary" />
                    </div>
                    <h2 className="text-2xl font-semibold tracking-tight">
                        {t("mcp.connectTitle")}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {t("mcp.wantsAccess", { clientName })}
                    </p>
                </div>

                {/* User Info Card */}
                <div className="border border-border rounded-xl p-4 bg-card/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                            {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U"}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                                {user?.name || user?.username || "User"}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                                {user?.email || ""}
                            </p>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-green-500">
                            <Check className="w-3.5 h-3.5" />
                            {t("mcp.signedIn")}
                        </div>
                    </div>
                </div>

                {/* Permissions */}
                <div className="border border-border rounded-xl p-4 space-y-3 bg-card/50">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {t("mcp.willBeAbleTo")}
                    </p>
                    <div className="space-y-2.5">
                        {[
                            t("mcp.accessCrm"),
                            t("mcp.viewManageCampaigns"),
                            t("mcp.createUpdateRecords"),
                        ].map((perm, i) => (
                            <div key={i} className="flex items-start gap-2.5">
                                <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                <span className="text-sm text-muted-foreground">{perm}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                    <Button
                        className="w-full h-11 font-medium"
                        onClick={handleAuthorize}
                        disabled={isAuthorizing}
                    >
                        {isAuthorizing ? (
                            <span className="flex items-center gap-2">
                                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                                {t("mcp.connecting")}
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <ExternalLink className="w-4 h-4" />
                                {t("mcp.authorize", { clientName })}
                            </span>
                        )}
                    </Button>
                    <Button
                        variant="ghost"
                        className="w-full h-11 text-muted-foreground"
                        onClick={handleCancel}
                        disabled={isAuthorizing}
                    >
                        {t("common.cancel")}
                    </Button>
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-muted-foreground">
                    {t("mcp.footer")}
                </p>
            </div>
        </div>
    );
}
