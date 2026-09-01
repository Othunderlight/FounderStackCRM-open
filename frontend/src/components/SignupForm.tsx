import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import React, { useState } from "react";
import { useStore } from "../../store";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import { register } from "../../lib/api";
import posthog from "posthog-js";
import { authTheme } from "../../lib/theme";
import { useTranslation } from "../i18n";

const FORBIDDEN_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "aol.com",
  "icloud.com",
  "mail.com",
  "protonmail.com",
  "zoho.com",
  "yandex.com",
  "live.com",
  "msn.com",
  "gmx.com",
  "me.com",
  "duck.com",
];

const FORBIDDEN_PREFIXES = [
  "admin",
  "info",
  "support",
  "contact",
  "sales",
  "billing",
  "help",
  "hello",
  "webmaster",
  "hr",
  "jobs",
  "marketing",
  "test",
  "dev",
  "noreply",
  "no-reply",
];

export default function SignupForm({
  inviteToken,
  inviteType,
}: {
  inviteToken?: string;
  inviteType?: string;
}) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Real-time validation states
  const [emailValid, setEmailValid] = useState<boolean | null>(null);
  const [emailFocused, setEmailFocused] = useState(false);
  const [emailErrorMsg, setEmailErrorMsg] = useState<string>("");

  const { setUser, setTokens } = useStore();
  const navigate = useNavigate();

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEmail(val);

    if (!val) {
      setEmailValid(null);
      setEmailErrorMsg("");
      return;
    }

    const parts = val.split("@");
    const prefix = parts[0]?.toLowerCase();
    const domain = parts[1]?.toLowerCase();

    // Check for forbidden prefixes
    if (prefix && FORBIDDEN_PREFIXES.includes(prefix)) {
      setEmailValid(false);
      setEmailErrorMsg(t("signup.adminEmailsNotAllowed"));
    }
    // Check for forbidden domains
    else if (domain && FORBIDDEN_DOMAINS.includes(domain)) {
      setEmailValid(false);
      setEmailErrorMsg(t("signup.businessEmailsOnly"));
    } else if (domain && domain.includes(".") && domain.length > 3) {
      // Basic valid email format check (has @, domain, and dot)
      setEmailValid(true);
      setEmailErrorMsg("");
    } else {
      // Incomplete or invalid format
      setEmailValid(null);
      setEmailErrorMsg("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (password !== confirmPassword) {
      setError(t("signup.passwordsDoNotMatch"));
      return;
    }

    const parts = email.trim().split("@");
    const prefix = parts[0]?.toLowerCase();
    const domain = parts[1]?.toLowerCase();

    if (prefix && FORBIDDEN_PREFIXES.includes(prefix)) {
      const msg = t("signup.adminEmailsNotAllowedPersonal");
      setError(msg);
      toast.error(msg);
      return;
    }

    if (domain && FORBIDDEN_DOMAINS.includes(domain)) {
      const msg = t("signup.useBusinessEmail");
      setError(msg);
      toast.error(msg);
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        email: email.trim(),
        username: email.trim(), // Use email as username
        password1: password,
        password2: confirmPassword,
        invite_token: inviteToken, // Pass token to backend
      };

      console.log("Sending signup request with payload:", {
        ...payload,
        password1: "***",
        password2: "***",
      });

      const response = await register(payload);

      console.log("Response status:", response.status);

      const contentType = response.headers.get("content-type");
      let data: any = {};

      if (contentType && contentType.indexOf("application/json") !== -1) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.error("Non-JSON response received:", text.substring(0, 200));
        throw new Error(`Server error: ${response.status}`);
      }

      console.log("Response data:", data);

      if (response.ok) {
        console.log("Signup successful");

        // Sync to secondary Supabase app
        try {
          const { error: sbError } = await supabase.auth.signUp({
            email: email.trim(),
            password: password,
          });
          if (sbError)
            console.error("Secondary Supabase signup failed:", sbError.message);
        } catch (sbCatch) {
          console.error("Secondary Supabase signup exception:", sbCatch);
        }

        if (data.access && data.refresh) {
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
          posthog.reset(true);
          posthog.identify(email);
          navigate("/onboarding", { state: { inviteType } });
        } else {
          console.log("Signup ok but no tokens returned");
          navigate("/signin");
        }
      } else {
        console.error("Signup failed with status", response.status, data);
        if (typeof data === "object" && data !== null) {
          setFieldErrors(data);

          // Try to extract a general error message
          const generalError =
            data.non_field_errors?.[0] ||
            data.detail ||
            (typeof data.error === "string" ? data.error : null) ||
            t("signup.registrationFailed");

          setError(generalError);
          toast.error(generalError);
        } else {
          setError(t("signup.invalidServerResponse"));
          toast.error(t("signup.invalidServerResponse"));
        }
      }
    } catch (err) {
      console.error("Fetch error during signup:", err);
      const msg = t("signup.unableToConnect");
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const getFieldError = (field: string) => {
    return fieldErrors[field] ? fieldErrors[field][0] : null;
  };

  // Helper to determine input class
  const getEmailInputClass = () => {
    const baseError = getFieldError("email");
    if (baseError || emailValid === false) {
      return "border-red-500 focus-visible:ring-red-500";
    }
    if (emailValid === true && emailFocused) {
      return "border-green-500 focus-visible:ring-green-500";
    }
    return "";
  };

  return (
    <div className="w-full max-w-sm">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-semibold tracking-tight">
            {t("signup.createAccount")}
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            {t("signup.joinFounder")}
          </p>
        </div>

        {error && (
          <div className={`mb-6 p-3 text-sm rounded-md text-center font-medium animate-in fade-in slide-in-from-top-1 ${authTheme.error.text} ${authTheme.error.bg} ${authTheme.error.border}`}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label
              htmlFor="email-signup"
              className="text-xs font-normal text-muted-foreground/90 ms-1"
            >
              {t("signup.businessEmail")}
            </Label>
            <Input
              type="email"
              id="email-signup"
              name="email-signup"
              autoComplete="email"
              placeholder="name@company.com"
               className={`h-11 transition-all ${authTheme.input.bg} ${authTheme.input.border} ${authTheme.input.focus} ${getEmailInputClass()}`}
              value={email}
              onChange={handleEmailChange}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              maxLength={50}
              required
            />
            {emailValid === false && emailErrorMsg && (
              <p className="mt-1.5 text-xs text-red-500 font-medium ms-1">
                {emailErrorMsg}
              </p>
            )}
            {getFieldError("email") && (
              <p className="mt-1.5 text-xs text-red-500 font-medium ms-1">
                {getFieldError("email")}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="password-signup"
              className="text-xs font-normal text-muted-foreground/90 ms-1"
            >
              {t("auth.password")}
            </Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                id="password-signup"
                name="password-signup"
                autoComplete="new-password"
                placeholder="••••••••••••"
                 className={`h-11 transition-all pe-10 ${authTheme.input.bg} ${authTheme.input.border} ${authTheme.input.focus} ${
                  getFieldError("password1")
                    ? authTheme.input.error + " " + authTheme.input.errorFocus
                    : ""
                }`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                maxLength={20}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {getFieldError("password1") && (
              <p className="mt-1.5 text-xs text-red-500 font-medium ms-1">
                {getFieldError("password1")}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="confirm-password-signup"
              className="text-xs font-normal text-muted-foreground/90 ms-1"
            >
              {t("signup.confirmPassword")}
            </Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                id="confirm-password-signup"
                name="confirm-password-signup"
                autoComplete="new-password"
                placeholder="••••••••••••"
                 className={`h-11 transition-all ${authTheme.input.bg} ${authTheme.input.border} ${authTheme.input.focus} ${
                  getFieldError("password2")
                    ? authTheme.input.error + " " + authTheme.input.errorFocus
                    : ""
                }`}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                maxLength={20}
                required
              />
            </div>
            {getFieldError("password2") && (
              <p className="mt-1.5 text-xs text-red-500 font-medium ms-1">
                {getFieldError("password2")}
              </p>
            )}
          </div>
          <Button
            type="submit"
            className="w-full h-11 font-medium mt-2"
            disabled={isLoading}
          >
            {isLoading ? t("signup.creatingAccount") : t("signup.signUp")}
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-border/40 text-center">
          <p className="text-sm text-muted-foreground font-normal">
            {t("signup.alreadyHaveAccount")}{" "}
            <Link
              to="/signin"
              className="font-normal text-foreground underline underline-offset-4 hover:text-primary transition-colors"
            >
              {t("signup.signIn")}
            </Link>
          </p>
        </div>

        {/* <p className="mt-6 text-center text-xs text-muted-foreground">
          By signing up, you agree to our{" "}
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
  );
}
