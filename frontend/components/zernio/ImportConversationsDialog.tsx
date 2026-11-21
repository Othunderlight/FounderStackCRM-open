import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Users,
} from "lucide-react";
import { useTranslation } from "../../src/i18n";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import {
  importZernioConversationsToPeople,
  notifyZernioError,
  type ZernioImportPeopleResult,
} from "../../lib/zernio";

export const ImportConversationsDialog = ({
  open,
  onOpenChange,
  onImported,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: (result: ZernioImportPeopleResult) => void;
}) => {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<ZernioImportPeopleResult | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setPreview(null);
      setError(null);
      setIsPreviewing(false);
      setIsImporting(false);
    }
  }, [open]);

  const handlePreview = async () => {
    setIsPreviewing(true);
    setError(null);
    try {
      const result = await importZernioConversationsToPeople({
        dryRun: true,
        createMissing: true,
        updateExisting: true,
      });
      setPreview(result);
    } catch (err) {
      console.error("Failed to preview imports:", err);
      setError(t("zernio.importPreviewFailed"));
      notifyZernioError(err, t("zernio.importPreviewFailed"));
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    setError(null);
    try {
      const result = await importZernioConversationsToPeople({
        dryRun: false,
        createMissing: true,
        updateExisting: true,
      });
      onImported?.(result);
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to import conversations:", err);
      setError(t("zernio.importFailed"));
      notifyZernioError(err, t("zernio.importFailed"));
    } finally {
      setIsImporting(false);
    }
  };

  const summary = preview;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!isPreviewing && !isImporting) onOpenChange(next);
      }}
    >
      <DialogContent className="border-border bg-settings-dialog text-textPrimary sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users size={18} className="text-accent" />
            {t("zernio.importTitle")}
          </DialogTitle>
          <DialogDescription className="text-textSecondary">
            {t("zernio.importDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {!summary && (
            <div className="rounded-lg border border-border bg-settings-card px-4 py-3 text-xs leading-relaxed text-textSecondary">
              {t("zernio.importExplain")}
            </div>
          )}

          {summary && (
            <div className="overflow-hidden rounded-lg border border-border">
              <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
                <div className="px-4 py-3">
                  <div className="text-[10px] uppercase tracking-wide text-textSecondary">
                    {t("zernio.importTotal")}
                  </div>
                  <div className="mt-0.5 text-lg font-semibold text-textPrimary">
                    {summary.total}
                  </div>
                </div>
                <div className="px-4 py-3">
                  <div className="text-[10px] uppercase tracking-wide text-textSecondary">
                    {t("zernio.importToLink")}
                  </div>
                  <div className="mt-0.5 text-lg font-semibold text-accent">
                    {summary.linked}
                  </div>
                </div>
                <div className="border-t border-border px-4 py-3">
                  <div className="text-[10px] uppercase tracking-wide text-textSecondary">
                    {t("zernio.importAlreadyLinked")}
                  </div>
                  <div className="mt-0.5 text-sm font-medium text-textPrimary">
                    {summary.already_linked}
                  </div>
                </div>
                <div className="border-t border-border px-4 py-3">
                  <div className="text-[10px] uppercase tracking-wide text-textSecondary">
                    {t("zernio.importNewPeople")}
                  </div>
                  <div className="mt-0.5 text-sm font-medium text-textPrimary">
                    {summary.created_people}
                  </div>
                </div>
              </div>

              {summary.linked === 0 && summary.already_linked > 0 && (
                <div className="flex items-center gap-2 border-t border-border px-4 py-2.5 text-[11px] text-textSecondary">
                  <CheckCircle2 size={13} className="text-emerald-500" />
                  {t("zernio.importNothingToDo")}
                </div>
              )}

              {(summary.errors?.length ?? 0) > 0 && (
                <div className="border-t border-border px-4 py-2.5">
                  <div className="flex items-center gap-2 text-[11px] font-medium text-amber-500">
                    <AlertTriangle size={13} />
                    {t("zernio.importErrors", {
                      count: summary.errors?.length ?? 0,
                    })}
                  </div>
                  <ul className="mt-1 space-y-0.5 text-[10px] text-textSecondary">
                    {(summary.errors || []).slice(0, 3).map((entry, index) => (
                      <li key={`${entry.conversation_id}-${index}`}>
                        {entry.conversation_id}: {entry.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-textSecondary">
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            className="text-textSecondary hover:text-textPrimary"
            onClick={() => onOpenChange(false)}
            disabled={isPreviewing || isImporting}
          >
            {t("common.cancel")}
          </Button>

          {!summary ? (
            <Button
              type="button"
              variant="outline"
              onClick={handlePreview}
              disabled={isPreviewing || isImporting}
              className="gap-2"
            >
              {isPreviewing ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <ArrowRight size={14} />
              )}
              {isPreviewing
                ? t("zernio.previewing")
                : t("zernio.preview")}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleImport}
              disabled={isImporting || summary.linked === 0}
              className="gap-2"
            >
              {isImporting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Users size={14} />
              )}
              {isImporting ? t("zernio.importing") : t("zernio.importNow")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
