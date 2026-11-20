import { useState } from "react";
import { toast } from "sonner";
import { AlignLeft, ArrowRight, FileText, Loader2, MessageCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { useStore } from "../../store";
import { useTranslation } from "../../src/i18n";
import type { Channel, Direction } from "../../types";

export const AddActivityDialog = ({
  open,
  onOpenChange,
  personId,
  personName,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personId: string;
  personName?: string;
  onCreated?: () => void;
}) => {
  const { t } = useTranslation();
  const { addActivity, user } = useStore();
  const [type, setType] = useState("email");
  const [channel, setChannel] = useState<Channel>("email");
  const [direction, setDirection] = useState<Direction>("sent");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const reset = () => {
    setType("email");
    setChannel("email");
    setDirection("sent");
    setTitle("");
    setContent("");
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error(t("recordPage.activityTitleRequired"));
      return;
    }

    setIsSaving(true);
    try {
      await addActivity({
        type: type as any,
        channel,
        direction,
        title: title.trim(),
        content: content.trim(),
        date: new Date().toISOString(),
        relatedPersonId: personId,
        userId:
          `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
          user?.name ||
          "You",
      } as any);

      toast.success(t("recordPage.activityAdded"));
      reset();
      onOpenChange(false);
      onCreated?.();
    } catch (error) {
      console.error("Failed to add activity:", error);
      toast.error(t("recordPage.activityAddFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!isSaving) onOpenChange(next);
      }}
    >
      <DialogContent className="bg-card-bg border-border text-textPrimary sm:max-w-[560px] p-0 overflow-hidden">
        <div className="border-b border-border bg-dropdown-bg px-6 py-4">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-accent" />
            {t("recordPage.addNewActivity")}
          </DialogTitle>
          <DialogDescription className="mt-1 text-[11px] font-medium italic text-textSecondary">
            {t("recordPage.logActivityFor", { name: personName || "this person" })}
          </DialogDescription>
        </div>

        <div className="custom-scrollbar max-h-[60vh] space-y-5 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-textSecondary">
                {t("recordPage.interactionDate")}
              </label>
              <select
                value={type}
                onChange={(event) => setType(event.target.value)}
                className="w-full rounded-lg border border-border bg-textarea-bg px-3 py-2.5 text-sm text-textPrimary outline-none transition-all hover:border-border/80 focus:ring-1 focus:ring-accent"
              >
                <option value="email">{t("recordPage.typeEmail")}</option>
                <option value="call">{t("recordPage.typeCall")}</option>
                <option value="meeting">{t("recordPage.typeMeeting")}</option>
                <option value="msg">{t("recordPage.typeMessage")}</option>
                <option value="update">{t("recordPage.typeUpdate")}</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-textSecondary">
                <MessageCircle size={10} /> {t("recordPage.channel")}
              </label>
              <select
                value={channel}
                onChange={(event) => setChannel(event.target.value as Channel)}
                className="w-full rounded-lg border border-border bg-textarea-bg px-3 py-2.5 text-sm text-textPrimary outline-none transition-all hover:border-border/80 focus:ring-1 focus:ring-accent"
              >
                <option value="email">{t("recordPage.channelEmail")}</option>
                <option value="linkedin">{t("recordPage.channelLinkedin")}</option>
                <option value="whatsapp">{t("recordPage.channelWhatsapp")}</option>
                <option value="system">{t("recordPage.channelSystem")}</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-textSecondary">
              <ArrowRight size={10} /> {t("recordPage.direction")}
            </label>
            <div className="flex gap-2">
              {(
                [
                  ["sent", t("recordPage.sentOutgoing")],
                  ["received", t("recordPage.receivedIncoming")],
                  ["system", t("recordPage.internal")],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDirection(value)}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                    direction === value
                      ? "border border-accent/40 bg-accent/20 text-accent"
                      : "border border-border bg-textarea-bg text-textSecondary hover:border-border/80"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-textSecondary">
              <FileText size={10} /> {t("recordPage.activityTitle")}
            </label>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t("recordPage.activityTitlePlaceholder")}
              className="w-full rounded-lg border border-border bg-textarea-bg px-3 py-2.5 text-sm text-textPrimary outline-none transition-all hover:border-border/80 focus:ring-1 focus:ring-accent"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-textSecondary">
              <AlignLeft size={10} /> {t("recordPage.content")}
            </label>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder={t("recordPage.contentPlaceholder")}
              className="custom-scrollbar min-h-[130px] w-full resize-none rounded-lg border border-border bg-textarea-bg px-3 py-2.5 text-sm text-textPrimary outline-none transition-all hover:border-border/80 focus:ring-1 focus:ring-accent"
            />
          </div>
        </div>

        <DialogFooter className="border-t border-border bg-dropdown-bg px-6 py-4">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            className="text-textSecondary hover:text-textPrimary"
          >
            {t("recordPage.cancel")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !title.trim() || !content.trim()}
            className="bg-accent text-white hover:bg-blue-600 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                {t("recordPage.adding")}
              </>
            ) : (
              t("recordPage.addActivity")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
