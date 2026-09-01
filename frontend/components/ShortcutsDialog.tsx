import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Command, Keyboard } from "lucide-react";
import { useTranslation } from "../src/i18n";

interface ShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ShortcutRow = ({ label, keys }: { label: string; keys: string[] }) => (
  <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
    <span className="text-sm text-textSecondary">{label}</span>
    <div className="flex gap-1">
      {keys.map((key, i) => (
        <React.Fragment key={i}>
          <kbd className="min-w-[20px] h-6 px-1.5 flex items-center justify-center bg-card-hover border border-border rounded text-[10px] font-medium text-textPrimary shadow-sm">
            {key}
          </kbd>
          {i < keys.length - 1 && <span className="text-textSecondary text-[10px] self-center">+</span>}
        </React.Fragment>
      ))}
    </div>
  </div>
);

export const ShortcutsDialog = ({ open, onOpenChange }: ShortcutsDialogProps) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        aria-describedby={undefined}
        className="sm:max-w-[400px] bg-shortcuts-bg border-border p-0 overflow-hidden"
      >
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
              <Keyboard size={18} />
            </div>
            <DialogTitle className="text-xl font-semibold text-textPrimary">{t("shortcuts.title")}</DialogTitle>
          </div>
          <p className="text-sm text-textSecondary">{t("shortcuts.subtitle")}</p>
        </DialogHeader>

        <div className="p-6 pt-4 space-y-6">
          <div>
            <h4 className="text-[11px] font-bold text-textSecondary uppercase tracking-widest mb-3 flex items-center gap-2">
              <Command size={12} /> {t("shortcuts.navigation")}
            </h4>
            <div className="bg-shortcuts-section rounded-lg border border-border/50 px-4">
              <ShortcutRow label={t("nav.allPeople")} keys={["SHIFT", "P"]} />
              <ShortcutRow label={t("nav.allTasks")} keys={["SHIFT", "T"]} />
              <ShortcutRow label={t("commandMenu.allLogs")} keys={["SHIFT", "L"]} />
              <ShortcutRow label={t("nav.companies")} keys={["SHIFT", "C"]} />
            </div>
          </div>

          <div>
            <h4 className="text-[11px] font-bold text-textSecondary uppercase tracking-widest mb-3">{t("shortcuts.application")}</h4>
            <div className="bg-shortcuts-section rounded-lg border border-border/50 px-4">
              <ShortcutRow label={t("shortcuts.commandMenu")} keys={["CTRL", "K"]} />
              <ShortcutRow label={t("shortcuts.toggleSidebar")} keys={["CTRL", "B"]} />
              <ShortcutRow label={t("shortcuts.tableSearch")} keys={["CTRL", "Q"]} />
            </div>
          </div>
        </div>

        <div className="p-4 bg-shortcuts-footer border-t border-border flex justify-center">
            <p className="text-[10px] text-textSecondary">{t("shortcuts.navDisabled")}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
