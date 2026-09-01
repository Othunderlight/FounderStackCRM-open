import React, { useEffect, useRef } from "react";
import { Trash2, Edit, MessageSquare, Copy, Sparkles } from "lucide-react";
import { useStore } from "../store";
import { cn } from "../lib/utils";
import { useTranslation } from "../src/i18n";

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  onCopyMessages?: () => void;
  onCopyData?: () => void;
  onAutoMsgParser?: () => void;
}

const ContextMenu = ({
  x,
  y,
  onClose,
  onDelete,
  onEdit,
  onCopyMessages,
  onCopyData,
  onAutoMsgParser,
}: ContextMenuProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const { language } = useStore();
  const isRTL = language === "ar";
  const { t } = useTranslation();

  const hasActions = !!(onEdit || onCopyMessages || onCopyData || onDelete || onAutoMsgParser);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    };
    // Close on scroll to avoid detached menu
    const handleScroll = () => onClose();

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed z-[100] w-56 bg-white dark:bg-[#1f1f1f] border border-gray-300 dark:border-[#333] rounded-lg shadow-2xl py-1.5 text-sm animate-in fade-in zoom-in-95 duration-100 flex flex-col"
      style={{ top: y, left: x }}
      dir={isRTL ? "rtl" : "ltr"}
      onClick={(e) => e.stopPropagation()}
    >
      {!hasActions && (
        <div className="px-3 py-4 text-center text-textSecondary italic text-[11px]">
          {t("contextMenu.noPermission")}
        </div>
      )}

      {onEdit && (
        <button
          onClick={() => {
            onEdit();
            onClose();
          }}
          className={cn("px-3 py-2 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-[#2f2f2f] flex items-center gap-2.5 transition-colors cursor-pointer", isRTL ? "text-right" : "text-left")}
        >
          <Edit size={14} className="text-gray-500 dark:text-gray-400" />
          <span>{t("contextMenu.edit")}</span>
        </button>
      )}

      {(onCopyMessages || onCopyData) && (
        <div         className="h-[1px] bg-gray-300 dark:bg-[#333] my-1 mx-2" />
      )}

      {onCopyMessages && (
        <button
          onClick={() => {
            onCopyMessages();
            onClose();
          }}
          className={cn("px-3 py-2 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-[#2f2f2f] flex items-center gap-2.5 transition-colors cursor-pointer", isRTL ? "text-right" : "text-left")}
        >
          <MessageSquare size={14} className="text-gray-500 dark:text-gray-400" />
          <span>{t("contextMenu.copyMessages")}</span>
        </button>
      )}

      {onCopyData && (
        <button
          onClick={() => {
            onCopyData();
            onClose();
          }}
          className={cn("px-3 py-2 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-[#2f2f2f] flex items-center gap-2.5 transition-colors cursor-pointer", isRTL ? "text-right" : "text-left")}
        >
          <Copy size={14} className="text-gray-500 dark:text-gray-400" />
          <span>{t("contextMenu.copyData")}</span>
        </button>
      )}

      {/*{onAutoMsgParser && (
        <>
          <div         className="h-[1px] bg-gray-300 dark:bg-[#333] my-1 mx-2" />
          <button onClick={() => { onAutoMsgParser(); onClose(); }} className={cn("px-3 py-2 text-blue-600 dark:text-accent hover:bg-gray-100 dark:hover:bg-[#2f2f2f] flex items-center gap-2.5 transition-colors font-medium cursor-pointer", isRTL ? "text-right" : "text-left")}>
              <Sparkles size={14} className="text-blue-600 dark:text-accent" />
              <span>{t("contextMenu.autoMsgParser")}</span>
          </button>
        </>
      )}*/}

      {onDelete && (
        <>
          <div className="h-[1px] bg-gray-300 dark:bg-[#333] my-1 mx-2" />
          <button
            onClick={() => {
              onDelete();
              onClose();
            }}
            className={cn(
              "px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-500/10 dark:hover:bg-red-500/20 flex items-center gap-2.5 transition-colors cursor-pointer",
              isRTL ? "text-right" : "text-left",
            )}
          >
            <Trash2 size={14} />
            <span>{t("contextMenu.delete")}</span>
          </button>
        </>
      )}
    </div>
  );
};

export default ContextMenu;
