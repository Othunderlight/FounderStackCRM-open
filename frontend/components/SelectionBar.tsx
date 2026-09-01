import React, { useMemo } from "react";
import { useStore } from "../store";
import { X, Trash2, Download } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "../src/i18n";
import { cn } from "../lib/utils";

const SelectionBar = () => {
  const {
    selectedIds,
    selectionType,
    clearSelection,
    deletePeople,
    deleteCompanies,
    deleteTasks,
    deleteOpportunities,
    deleteNotes,
    deleteActivities,
    people,
    companies,
    tasks,
    opportunities,
    notes,
    activities,
    activeColumns,
    confirm,
    language,
    myAccess,
  } = useStore();
  const { t } = useTranslation();
  const isRTL = language === "ar";

  const canDelete = useMemo(() => {
    if (!selectionType) return false;
    if (!myAccess) return true;
    if (myAccess.permissions.includes("*")) return true;

    const permissionMap: Record<string, string> = {
      person: "people.write",
      company: "companies.write",
      opportunity: "opportunities.write",
      task: "tasks.write",
      note: "notes.write",
      activity: "activities.write",
    };

    return myAccess.permissions.includes(permissionMap[selectionType]);
  }, [myAccess, selectionType]);

  const canExport = useMemo(() => {
    if (!myAccess) return true;
    return (
      myAccess.permissions.includes("*") ||
      myAccess.permissions.includes("exports.read")
    );
  }, [myAccess]);

  if (selectedIds.length === 0) return null;

  const handleExport = () => {
    let rawData: any[] = [];
    let filename = "export";

    switch (selectionType) {
      case "person":
        rawData = people.filter((p) => selectedIds.includes(p.id));
        filename = "people_export";
        break;
      case "company":
        rawData = companies.filter((c) => selectedIds.includes(c.id));
        filename = "companies_export";
        break;
      case "task":
        rawData = tasks.filter((t) => selectedIds.includes(t.id));
        filename = "tasks_export";
        break;
      case "opportunity":
        rawData = opportunities.filter((o) => selectedIds.includes(o.id));
        filename = "opportunities_export";
        break;
      case "note":
        rawData = notes.filter((n) => selectedIds.includes(n.id));
        filename = "notes_export";
        break;
      case "activity":
        rawData = activities.filter((a) => selectedIds.includes(a.id));
        filename = "activities_export";
        break;
    }

    if (rawData.length === 0) return;

    // Filter columns based on visibility
    const visibleCols = activeColumns.filter(
      (c) => c.visible && c.type !== "action",
    );
    const headers = visibleCols.map((c) => c.label);

    // Add CRM Link as a standard additional column for people if they are selected
    if (selectionType === "person") {
      headers.push("CRM Link");
    }

    const rows = rawData.map((item) => {
      const row = visibleCols.map((col) => {
        const val = item[col.key];
        if (col.type === "date" && val)
          return new Date(val).toLocaleDateString();
        if (col.type === "relation") {
          const p = item.relatedPersonId
            ? people.find((p) => p.id === item.relatedPersonId)?.name
            : null;
          const c = item.relatedCompanyId
            ? companies.find((c) => c.id === item.relatedCompanyId)?.name
            : null;
          return [p, c].filter(Boolean).join(", ");
        }
        return val || "";
      });

      if (selectionType === "person") {
        row.push(`${window.location.origin}/#/people/${item.id}`);
      }
      return row;
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `${filename}_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(
      t("selectionBar.exported").replace("{count}", String(selectedIds.length)),
    );
  };

  const handleDelete = () => {
    confirm({
      title: t("selectionBar.confirmDeleteTitle"),
      description: t("selectionBar.confirmDeleteDesc").replace(
        "{count}",
        String(selectedIds.length),
      ),
      confirmText: t("selectionBar.confirmDeleteBtn"),
      onConfirm: async () => {
        try {
          switch (selectionType) {
            case "person":
              await deletePeople(selectedIds);
              break;
            case "company":
              await deleteCompanies(selectedIds);
              break;
            case "task":
              await deleteTasks(selectedIds);
              break;
            case "opportunity":
              await deleteOpportunities(selectedIds);
              break;
            case "note":
              await deleteNotes(selectedIds);
              break;
            case "activity":
              await deleteActivities(selectedIds);
              break;
          }

          toast.success(
            t("selectionBar.deletedSuccess").replace(
              "{count}",
              String(selectedIds.length),
            ),
          );
          clearSelection();
        } catch (error) {
          toast.error(t("selectionBar.deleteFailed"));
        }
      },
    });
  };

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div
        className="relative flex items-center"
        style={{
          animation:
            "expandFromCenter 400ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        }}
      >
        <div className="absolute inset-0 bg-accent/30 rounded-lg blur-xl animate-pulse" />
        <div className="relative bg-selection-bg border border-accent/60 shadow-2xl shadow-accent/20 rounded-lg px-4 py-3 flex items-center gap-6">
          <div
            className={cn(
              "flex items-center gap-3 border-selection-border",
              isRTL ? "border-l pr-0 pl-6" : "border-r pr-6 pl-0",
            )}
          >
            <div className="w-6 h-6 bg-accent rounded flex items-center justify-center text-[15px] text-white">
              {selectedIds.length}
            </div>
            <span
              className={cn(
                "text-sm font-medium text-foreground animate-in fade-in slide-in-from-left-2 duration-200 delay-100",
                isRTL && "[animation-name:slide-in-from-right]",
              )}
            >
              {t("selectionBar.selected")}
            </span>
          </div>

          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200 delay-150">
            {canDelete && (
              <ActionButton
                variant="danger"
                icon={Trash2}
                label={t("selectionBar.delete")}
                onClick={handleDelete}
              />
            )}
            {canExport && (
              <ActionButton
                icon={Download}
                label={t("selectionBar.export")}
                onClick={handleExport}
              />
            )}
            {!canDelete && !canExport && (
              <p className="text-[11px] text-text-secondary italic px-2">
                {t("selectionBar.noPermission")}
              </p>
            )}
          </div>

          <button
            onClick={clearSelection}
            className={cn(
              "text-text-secondary hover:text-foreground transition-colors animate-in zoom-in-95 duration-200 delay-200",
              isRTL ? "me-2" : "ms-2",
            )}
          >
            <X size={18} />
          </button>
        </div>
      </div>
      <style>{`
        @keyframes expandFromCenter {
          0% {
            opacity: 0;
            transform: scaleX(0.1);
          }
          100% {
            opacity: 1;
            transform: scaleX(1);
          }
        }
      `}</style>
    </div>
  );
};

const ActionButton = ({
  icon: Icon,
  label,
  onClick,
  variant = "default",
}: any) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded text-text-secondary hover:text-white transition-colors text-sm",
      variant === "danger"
        ? "text-red-500 hover:bg-red-500/90"
        : "hover:text-foreground",
    )}
  >
    <Icon size={14} />
    <span>{label}</span>
  </button>
);

export default SelectionBar;
