import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Building2, MessageCircle, Mail, Loader2 } from "lucide-react";
import { useStore } from "../store";
import { createOnboarding, completeOnboarding } from "../lib/api";
import { toast } from "sonner";

interface NoOrganizationModalProps {
  isOpen: boolean;
}

const NoOrganizationModal = ({ isOpen }: NoOrganizationModalProps) => {
  const { user, fetchCurrentUser, fetchMyAccess } = useStore();
  const [mode, setMode] = useState<"choose" | "create" | "support">("choose");
  const [orgName, setOrgName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateOrg = async () => {
    if (!orgName.trim()) {
      toast.error("Organization name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await createOnboarding({
        company_name: orgName.trim(),
        subscribe: false,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to create organization");
      }

      await completeOnboarding();
      await fetchCurrentUser();
      await fetchMyAccess();
      toast.success("Organization created successfully!");
    } catch (err) {
      console.error("Failed to create organization:", err);
      toast.error(err instanceof Error ? err.message : "Failed to create organization");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-[480px] bg-[#0f0f0f] border-border [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {mode === "choose" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-textPrimary">
                No Organization Found
              </DialogTitle>
              <DialogDescription className="text-textSecondary mt-2">
                We couldn't find an organization associated with your account. This can happen if something went wrong during setup.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 space-y-3">
              <Button
                onClick={() => setMode("create")}
                className="w-full justify-start gap-3 h-auto py-4 bg-[#1a1a1a] hover:bg-[#222] border border-border text-textPrimary"
                variant="ghost"
              >
                <Building2 className="text-blue-500" size={20} />
                <div className="text-left">
                  <p className="font-medium">Create a new organization</p>
                  <p className="text-xs text-textSecondary mt-0.5">
                    If this is your first time setting up FounderStack
                  </p>
                </div>
              </Button>

              <Button
                onClick={() => setMode("support")}
                className="w-full justify-start gap-3 h-auto py-4 bg-[#1a1a1a] hover:bg-[#222] border border-border text-textPrimary"
                variant="ghost"
              >
                <MessageCircle className="text-purple-500" size={20} />
                <div className="text-left">
                  <p className="font-medium">I was invited to an organization</p>
                  <p className="text-xs text-textSecondary mt-0.5">
                    Contact support to fix your account
                  </p>
                </div>
              </Button>
            </div>
          </>
        )}

        {mode === "create" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-textPrimary">
                Create Your Organization
              </DialogTitle>
              <DialogDescription className="text-textSecondary mt-2">
                Enter your company or workspace name to get started.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orgName" className="text-textSecondary">
                  Organization Name
                </Label>
                <Input
                  id="orgName"
                  placeholder="e.g. Acme Inc"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="bg-[#1a1a1a] border-border text-textPrimary"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCreateOrg();
                    }
                  }}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setMode("choose")}
                  variant="ghost"
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-textSecondary hover:text-textPrimary"
                >
                  Back
                </Button>
                <Button
                  onClick={handleCreateOrg}
                  disabled={isSubmitting || !orgName.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isSubmitting && <Loader2 size={16} className="animate-spin mr-2" />}
                  Create Organization
                </Button>
              </div>
            </div>
          </>
        )}

        {mode === "support" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-textPrimary">
                Contact Support
              </DialogTitle>
              <DialogDescription className="text-textSecondary mt-2">
                It looks like you were supposed to be invited to an existing organization, but something went wrong. Please reach out and we'll fix this for you.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 space-y-4">
              <a
                href="https://t.me/Omar_Gatara"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-[#0088cc] hover:bg-[#0077b5] text-white rounded-lg font-medium transition-colors"
              >
                <MessageCircle size={18} />
                Contact on Telegram
              </a>

              <p className="text-center text-textSecondary text-sm">
                Or email us at{" "}
                <a
                  href="mailto:team@founderstack.cloud"
                  className="text-blue-500 hover:underline"
                >
                  team@founderstack.cloud
                </a>
              </p>

              <Button
                onClick={() => setMode("choose")}
                variant="ghost"
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-textSecondary hover:text-textPrimary mt-4"
              >
                Back
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default NoOrganizationModal;
