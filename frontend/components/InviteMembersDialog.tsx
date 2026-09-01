"use client";

import {
  UserPlus,
  Users,
  Globe,
  ChevronRight,
  ChevronLeft,
  Copy,
  Check,
  Link as LinkIcon,
  Loader2,
  ArrowLeft,
  Mail,
  Sparkles,
} from "lucide-react";
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { createInvitation } from "../lib/api";

import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { cn } from "../lib/utils";
import { inviteDialogTheme } from "../lib/theme";
import { useTranslation } from "../src/i18n";
import { useStore } from "../store";

interface InviteMembersDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function InviteMembersDialog({
  open,
  onOpenChange,
  trigger,
}: InviteMembersDialogProps) {
  const { language, myAccess } = useStore();
  const { t } = useTranslation();
  const isRTL = language === "ar";
  const [internalOpen, setInternalOpen] = useState(false);
  const [step, setStep] = useState<"choice" | "link">("choice");
  const [inviteType, setInviteType] = useState<"team" | "external" | null>(
    null,
  );
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);

  const canManageUsers = myAccess?.permissions?.includes("users.manage");

  const isOpen = open !== undefined ? open : internalOpen;
  const setOpen = (val: boolean) => {
    if (onOpenChange) onOpenChange(val);
    else setInternalOpen(val);
    if (!val) {
      // Reset state when closing, with a slight delay for smooth exit
      setTimeout(() => {
        setStep("choice");
        setInviteType(null);
        setGeneratedLink(null);
        setHasCopied(false);
      }, 300);
    }
  };

  const handleChoice = async (type: "team" | "external") => {
    setInviteType(type);
    setIsLoading(true);
    setStep("link");

    try {
      const response = await createInvitation(
        type === "team" ? "TEAM" : "EXTERNAL",
      );
      if (response.ok) {
        const data = await response.json();
        const origin = window.location.origin;
        setGeneratedLink(`${origin}/#/invite/${data.token}`);
      } else {
        toast.error(t("invite.failedGenerateLink"));
        setStep("choice");
      }
    } catch (error) {
      console.error(error);
      toast.error(t("invite.errorOccurred"));
      setStep("choice");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    setHasCopied(true);
    toast.success(t("invite.linkCopied"));
    setTimeout(() => setHasCopied(false), 2000);
  };

  // Reset copied state if link changes
  useEffect(() => {
    setHasCopied(false);
  }, [generatedLink]);

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className={cn("sm:max-w-[500px] p-0 gap-0 border overflow-hidden shadow-2xl rounded-2xl text-white", inviteDialogTheme.bg, inviteDialogTheme.border)}>
        <div className="p-6 pb-2">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              {step === "link" && (
                <button
                  onClick={() => setStep("choice")}
                  className={cn("p-1 rounded-full transition-colors", inviteDialogTheme.text.secondary, `hover:${inviteDialogTheme.text.primary}`, inviteDialogTheme.hover, isRTL ? "-me-2" : "-ms-2")}
                >
                  {isRTL ? <ChevronRight size={16} /> : <ArrowLeft size={16} />}
                </button>
              )}
              <DialogTitle className={cn("text-xl font-semibold tracking-tight flex items-center gap-2", inviteDialogTheme.text.primary)}>
                {step === "choice" ? (
                  canManageUsers ? t("invite.inviteNewMembers") : t("invite.inviteReferEarn")
                ) : inviteType === "team" ? (
                  t("invite.inviteTeamMember")
                ) : (
                  t("invite.inviteReferEarn")
                )}
              </DialogTitle>
            </div>
            <p className={cn("text-sm font-medium leading-relaxed", inviteDialogTheme.text.secondary)}>
              {step === "choice"
                ? ""
                : inviteType === "team"
                  ? t("invite.shareTeamLink")
                  : t("invite.shareReferralLink")}
            </p>
          </DialogHeader>
        </div>

        <div className="p-6 pt-2">
          {step === "choice" ? (
            <div className="grid gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
              {canManageUsers && (
                <button
                  onClick={() => handleChoice("team")}
                  className={cn("relative flex items-center gap-5 p-5 rounded-2xl border transition-all duration-200 group text-left overflow-hidden", inviteDialogTheme.border, inviteDialogTheme.card, inviteDialogTheme.hover)}
                >
                  <div className={cn("absolute inset-0 bg-gradient-to-r to-transparent opacity-0 group-hover:opacity-100 transition-opacity", inviteDialogTheme.gradient.blue)} />
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-all", inviteDialogTheme.blue.bg, inviteDialogTheme.blue.text, inviteDialogTheme.blue.hoverBg, inviteDialogTheme.blue.shadow)}>
                    <Users size={22} strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 relative z-10">
                    <h4 className={cn("font-semibold text-base mb-1 transition-colors", inviteDialogTheme.text.primary, inviteDialogTheme.blue.hoverText)}>
                      {t("invite.teamMember")}
                    </h4>
                    <p className={cn("text-xs leading-tight", inviteDialogTheme.text.secondary)}>
                      {t("invite.teamMemberDesc")}
                    </p>
                  </div>
                  {isRTL ? (
                    <ChevronLeft
                      size={18}
                      className={cn("group-hover:-translate-x-1 transition-all", inviteDialogTheme.text.secondary, `group-hover:${inviteDialogTheme.text.primary}`)}
                    />
                  ) : (
                    <ChevronRight
                      size={18}
                      className={cn("group-hover:translate-x-1 transition-all", inviteDialogTheme.text.secondary, `group-hover:${inviteDialogTheme.text.primary}`)}
                    />
                  )}
                </button>
              )}

              <button
                onClick={() => handleChoice("external")}
                className={cn("relative flex items-center gap-5 p-5 rounded-2xl border transition-all duration-200 group text-left overflow-hidden", inviteDialogTheme.border, inviteDialogTheme.card, inviteDialogTheme.hover)}
              >
                <div className={cn("absolute inset-0 bg-gradient-to-r to-transparent opacity-0 group-hover:opacity-100 transition-opacity", inviteDialogTheme.gradient.purple)} />
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-all", inviteDialogTheme.purple.bg, inviteDialogTheme.purple.text, inviteDialogTheme.purple.hoverBg, inviteDialogTheme.purple.shadow)}>
                  <Globe size={22} strokeWidth={2.5} />
                </div>
                <div className="flex-1 relative z-10">
                  <h4 className={cn("font-semibold text-base mb-1 transition-colors", inviteDialogTheme.text.primary, inviteDialogTheme.purple.hoverText)}>
                    {t("invite.referEarn")}
                  </h4>
                  <p className={cn("text-xs leading-tight", inviteDialogTheme.text.secondary)}>
                    {t("invite.referEarnDesc")}
                  </p>
                </div>
                {isRTL ? (
                  <ChevronLeft
                    size={18}
                    className={cn("group-hover:-translate-x-1 transition-all", inviteDialogTheme.text.secondary, `group-hover:${inviteDialogTheme.text.primary}`)}
                  />
                ) : (
                  <ChevronRight
                    size={18}
                    className={cn("group-hover:translate-x-1 transition-all", inviteDialogTheme.text.secondary, `group-hover:${inviteDialogTheme.text.primary}`)}
                  />
                )}
              </button>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              {isLoading ? (
                  <div className={cn("h-48 flex flex-col items-center justify-center space-y-4", inviteDialogTheme.text.secondary)}>
                    <div className="relative">
                      <div className={cn("absolute inset-0 blur-xl opacity-20 animate-pulse rounded-full", inviteDialogTheme.loading.blur)} />
                      <Loader2 className={cn("h-10 w-10 animate-spin relative z-10", inviteDialogTheme.blue.text)} />
                    </div>
                    <p className="text-sm font-medium animate-pulse">
                      {t("invite.generatingLink")}
                    </p>
                  </div>
              ) : (
                <div className="space-y-6">
                  <div className={cn("p-1 rounded-xl border flex items-center shadow-inner group focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500/50 transition-all", inviteDialogTheme.card, inviteDialogTheme.border)}>
                    <div className={cn("h-10 w-10 flex items-center justify-center shrink-0", inviteDialogTheme.text.secondary)}>
                      <LinkIcon size={16} />
                    </div>
                    <Input
                      readOnly
                      value={generatedLink || ""}
                      className={cn("border-none bg-transparent h-11 focus-visible:ring-0 px-0 text-sm font-mono selection:bg-blue-500/30", inviteDialogTheme.text.primary)}
                    />
                    <Button
                      size="sm"
                      onClick={copyToClipboard}
                      className={cn(
                        "h-9 px-4 m-1 rounded-lg transition-all font-medium shadow-lg",
                        hasCopied
                          ? cn(inviteDialogTheme.green.bg, inviteDialogTheme.green.text, inviteDialogTheme.green.hover, "border border-green-500/20")
                          : cn(inviteDialogTheme.button.blue, "text-white border border-transparent"),
                      )}
                    >
                      {hasCopied ? (
                        <span className="flex items-center gap-2">
                          <Check size={14} strokeWidth={3} />
                          {t("invite.copied")}
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Copy size={8} />
                          {t("invite.copy")}
                        </span>
                      )}
                    </Button>
                  </div>

                  <div
                    className={cn(
                      "rounded-xl p-4 border text-xs leading-relaxed transition-all",
                      inviteType === "team"
                        ? cn(inviteDialogTheme.info.team.border, inviteDialogTheme.info.team.text)
                        : cn(inviteDialogTheme.info.external.border, inviteDialogTheme.info.external.text),
                    )}
                  >
                    <h5 className="font-semibold mb-1 flex items-center gap-2">
                      {inviteType === "team" ? (
                        <UserPlus size={14} />
                      ) : (
                        <Globe size={14} />
                      )}
                      {inviteType === "team"
                        ? t("invite.whatHappensNext")
                        : t("invite.howDoesThisWork")}
                    </h5>
                    <p className="opacity-90">
                      {inviteType === "team"
                        ? t("invite.teamMemberNextStep")
                        : t("invite.referralNextStep")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
