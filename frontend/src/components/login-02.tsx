import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import React, { JSX, SVGProps, useState, useEffect } from "react";
import { useStore } from "../../store";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { googleLogin, BASE_URL } from "../../lib/api";
import { Eye, EyeOff } from "lucide-react";
import posthog from "posthog-js";
import { authTheme } from "../../lib/theme";
import { useTranslation } from "../../src/i18n";

declare global {
  interface Window {
    google: any;
  }
}

const GoogleIcon = (
  props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>,
) => (
  <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
    <path d="M3.06364 7.50914C4.70909 4.24092 8.09084 2 12 2C14.6954 2 16.959 2.99095 18.6909 4.60455L15.8227 7.47274C14.7864 6.48185 13.4681 5.97727 12 5.97727C9.39542 5.97727 7.19084 7.73637 6.40455 10.1C6.2045 10.7 6.09086 11.3409 6.09086 12C6.09086 12.6591 6.2045 13.3 6.40455 13.9C7.19084 16.2636 9.39542 18.0227 12 18.0227C13.3454 18.0227 14.4909 17.6682 15.3864 17.0682C16.4454 16.3591 17.15 15.3 17.3818 14.05H12V10.1818H21.4181C21.5364 10.8363 21.6 11.5182 21.6 12.2273C21.6 15.2727 20.5091 17.8363 18.6181 19.5773C16.9636 21.1046 14.7 22 12 22C8.09084 22 4.70909 19.7591 3.06364 16.4909C2.38638 15.1409 2 13.6136 2 12C2 10.3864 2.38638 8.85911 3.06364 7.50914Z" />
  </svg>
);

export default function Login02() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { setUser, setTokens } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const returnTo = queryParams.get("returnTo") || "/";

  const handleGoogleLogin = async (tokenResponse: any) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await googleLogin(tokenResponse.access_token);
      const data = await response.json();

      if (response.ok) {
        setTokens(data.access, data.refresh);
        const mappedUser = {
          ...data.user,
          name:
            data.user.name ||
            `${data.user.first_name} ${data.user.last_name}`.trim() ||
            data.user.username,
          username: data.user.username,
        };
        setUser(mappedUser);
        posthog.identify(mappedUser.email);
        navigate(returnTo);
      } else {
        const errorMessage =
          data.detail || data.non_field_errors?.[0] || t("auth.googleLoginFailed");
        if (errorMessage.includes("No account found")) {
          setError(t("auth.noAccountFound"));
        } else {
          setError(errorMessage);
        }
      }
    } catch (err) {
      setError(t("auth.unexpectedError"));
      console.error("Google login error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = () => {
    if (!window.google) {
      setError(t("auth.googleScriptNotLoaded"));
      return;
    }

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id:
        "865621409095-pb96havoussm9aeorn18un3dqt7u7hpj.apps.googleusercontent.com", // Replace with your client ID
      scope: "email profile openid",
      callback: handleGoogleLogin,
    });
    client.requestAccessToken();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch(`${BASE_URL}/api/auth/login/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Successful login
        setTokens(data.access, data.refresh);
        const mappedUser = {
          ...data.user,
          name:
            data.user.name ||
            `${data.user.first_name} ${data.user.last_name}`.trim() ||
            data.user.username,
          username: data.user.username,
        };
        setUser(mappedUser);
        posthog.identify(email);
        navigate(returnTo);
      } else {
        // Handle errors
        setError(
          data.non_field_errors?.[0] ||
            data.detail ||
            t("auth.invalidEmailPassword"),
        );
      }
    } catch (err) {
      setError(t("auth.unexpectedError"));
      console.error("Login error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background text-foreground relative px-4">
      {/* Brand Logo at the top */}
      <div className="absolute top-12 md:top-20 left-0 right-0 flex items-center justify-center gap-3">
        <img src="/logo.png" alt="FounderStack Logo" className="h-14 w-auto" />
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-purple-600 via-blue-500 to-green-500 bg-clip-text text-transparent">
          {t("inviteLanding.founderStack")}
        </h1>
      </div>

      <div className="flex flex-1 flex-col max-w-sm w-full">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-semibold tracking-tight">
              {t("auth.welcomeBack")}
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              {t("auth.enterCredentials")}
            </p>
          </div>

          {error && (
            <div
              className={`mb-6 p-3 text-sm rounded-md text-center font-medium animate-in fade-in slide-in-from-top-1 ${authTheme.error.text} ${authTheme.error.bg} ${authTheme.error.border}`}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label
                htmlFor="email-login-02"
                className="text-xs font-normal text-muted-foreground/90 ms-1"
              >
                {t("auth.emailAddress")}
              </Label>
              <Input
                type="email"
                id="email-login-02"
                name="email-login-02"
                autoComplete="email"
                placeholder="name@company.com"
                className={`h-11 transition-all ${authTheme.input.bg} ${authTheme.input.border} ${authTheme.input.focus}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={50}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between ms-1">
                <Label
                  htmlFor="password-login-02"
                  className="text-xs font-normal text-muted-foreground/90"
                >
                  {t("auth.password")}
                </Label>
                <a
                  href="https://t.me/Omar_Gatara"
                  className="text-[11px] text-muted-foreground hover:text-primary underline-offset-4 hover:underline transition-colors"
                >
                  {t("auth.forgot")}
                </a>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  id="password-login-02"
                  name="password-login-02"
                  autoComplete="password"
                  placeholder="••••••••••••"
                  className={`h-11 transition-all pr-10 ${authTheme.input.bg} ${authTheme.input.border} ${authTheme.input.focus}`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  maxLength={20}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full h-11 font-medium"
              disabled={isLoading}
            >
              {isLoading ? t("auth.signingIn") : t("auth.signIn")}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full border-border/40" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                {t("auth.orWith")}
              </span>
            </div>
          </div>

          <button
            onClick={loginWithGoogle}
            disabled={isLoading}
            className={`w-full h-11 border border-border hover:border-muted-foreground/30 font-medium rounded-lg transition-all flex items-center justify-center gap-3 text-auth-text-primary ${authTheme.button.google}`}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span>{t("auth.signInWithGoogle")}</span>
          </button>

          <div className="mt-8 pt-6 border-t border-border/40 text-center">
            <p className="text-sm text-muted-foreground font-normal">
              {t("auth.newToFounder")}{" "}
              <Link
                to="/signup"
                className="font-normal text-foreground underline underline-offset-4 hover:text-primary transition-colors"
              >
                {t("auth.createAccount")}
              </Link>
            </p>
          </div>

          {/* <p className="mt-6 text-center text-xs text-muted-foreground">
            By signing in, you agree to our{" "}
            <a
              href="#"
              className="underline underline-offset-4 hover:text-primary"
            >
              terms of service
            </a>{" "}
            and{" "}
            <a
              href="#"
              className="underline underline-offset-4 hover:text-primary"
            >
              privacy policy
            </a>
            .
          </p> */}
        </div>
      </div>
    </div>
  );
}
