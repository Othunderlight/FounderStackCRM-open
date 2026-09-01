import React, { useState, useMemo, useEffect } from "react";
import { useStore } from "../store";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  FileText,
  Trash2,
  Search,
  ArrowUpDown,
  ChevronDown,
  Link as LinkIcon,
  Eye,
  Download,
  User,
  Calendar,
  MoreHorizontal,
  X,
  ExternalLink,
  Share2,
  Check,
  Copy,
  Globe,
  Lock,
} from "lucide-react";
import { Report, Person } from "../types";
import DataTable from "./DataTable";
import { useTranslation } from "../src/i18n";
import { AccessDeniedPage } from "./AccessDeniedPage";

const ReportsPage = () => {
  const {
    reports,
    fetchReports,
    deleteReports,
    updateReport,
    confirm,
    user,
    language,
    myAccess,
    fetchMyAccess,
  } = useStore();
  const { t } = useTranslation();
  const navigate = useNavigate();

  // RBAC: Check if user has permission to read reports
  const canReadReports = useMemo(() => {
    if (!myAccess) return null;
    return (
      myAccess.permissions?.includes("*") ||
      myAccess.permissions?.includes("reports.read")
    );
  }, [myAccess]);

  const canWriteReports = useMemo(() => {
    if (!myAccess) return null;
    return (
      myAccess.permissions?.includes("*") ||
      myAccess.permissions?.includes("reports.write")
    );
  }, [myAccess]);

  // Fetch permissions if they haven't been loaded yet
  useEffect(() => {
    if (!myAccess) {
      fetchMyAccess();
    }
  }, [myAccess, fetchMyAccess]);

  const isRTL = language === "ar";
  const [searchQuery, setSearchQuery] = useState("");
  const [reportsLoading, setReportsLoading] = useState(true);
  const searchRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (canReadReports === true) {
      setReportsLoading(true);
      fetchReports().finally(() => setReportsLoading(false));
    } else if (canReadReports === false) {
      setReportsLoading(false);
    }
  }, [canReadReports, fetchReports]);

  useEffect(() => {
    const handleShortcut = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "q") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const [sortField, setSortField] = useState<keyof Report>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // View report state
  const [viewingReport, setViewingReport] = useState<Report | null>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && viewingReport) {
        setViewingReport(null);
      }
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [viewingReport]);

  const filteredReports = useMemo(() => {
    let result = reports.filter(
      (r) =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.createdBy.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    result.sort((a, b) => {
      const valA = (a as any)[sortField];
      const valB = (b as any)[sortField];

      if (typeof valA === "string" && typeof valB === "string") {
        const comparison = valA.localeCompare(valB);
        return sortDirection === "asc" ? comparison : -comparison;
      }
      if (typeof valA === "boolean" && typeof valB === "boolean") {
        return sortDirection === "asc"
          ? valA === valB
            ? 0
            : valA
              ? 1
              : -1
          : valA === valB
            ? 0
            : valA
              ? -1
              : 1;
      }
      return 0;
    });

    return result;
  }, [reports, searchQuery, sortField, sortDirection]);

  const handleSort = (field: keyof Report) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleShare = (report: Report) => {
    const publicLink = `${window.location.origin}/#/shared/report/${report.id}`;
    navigator.clipboard.writeText(publicLink);
    toast.info(t("reports.publicLinkCopied"));
  };

  const handleOpenLink = (report: Report) => {
    const publicLink = `${window.location.origin}/#/shared/report/${report.id}`;
    window.open(publicLink, "_blank");
  };

  const handleDelete = (ids: string[]) => {
    confirm({
      title: t("confirm.deleteReports"),
      description: t("confirm.deleteReportsConfirm").replace(
        "{count}",
        String(ids.length),
      ),
      confirmText: t("confirm.delete"),
      onConfirm: async () => {
        try {
          await deleteReports(ids);
          setSelectedIds([]);
          toast.success(
            t("confirm.deletedReports").replace("{count}", String(ids.length)),
          );
        } catch (error) {
          toast.error(t("confirm.deleteReportsFailed"));
        }
      },
    });
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const toggleAllSelection = () => {
    if (selectedIds.length === filteredReports.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredReports.map((r) => r.id));
    }
  };

  const toggleShared = (report: Report) => {
    const newState = !report.isShared;
    updateReport(report.id, { isShared: newState });
    toast.success(
      newState ? t("reports.reportNowShared") : t("reports.reportNowPrivate"),
    );
  };

  const handleBulkCopyLinks = () => {
    const links = selectedIds
      .map((id) => `${window.location.origin}/#/shared/report/${id}`)
      .join("\n");
    navigator.clipboard.writeText(links);
    toast.info(
      t("reports.linksCopied").replace("{count}", String(selectedIds.length)),
    );
  };

  const handleBulkDownload = () => {
    const selectedReports = reports.filter((r) => selectedIds.includes(r.id));
    if (selectedReports.length === 0) return;

    // Generate CSV content
    // Headers
    const headers = [
      "Report Name",
      "Creator",
      "Created At",
      "Record Count",
      "Filters",
    ];

    // Rows
    const rows = selectedReports.map((report) => [
      report.name,
      report.createdBy,
      new Date(report.createdAt).toLocaleDateString(),
      (report.data?.length || 0).toString(),
      report.filters
        ?.map((f) => `${f.field} ${f.operator} ${f.value}`)
        .join("; ") || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    // Trigger download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `reports_export_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(
      t("reports.exportedToCsv").replace(
        "{count}",
        String(selectedReports.length),
      ),
    );
  };

  const handleDownloadReport = (report: Report) => {
    // Headers
    const headers = [
      "Name",
      "Company",
      "Email",
      "Phone",
      "Stage",
      "Lead Type",
      "Created At",
      "CRM Link",
    ];

    // Rows
    const rows = report.data.map((person) => [
      person.name,
      person.companyName || "",
      person.email || "",
      person.phone || "",
      person.stage || "",
      person.leadType || "",
      person.createdAt,
      `${window.location.origin}/#/people/${person.id}`,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      ),
    ].join("\n");

    // Trigger download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `${report.name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(t("reports.downloadedAsCsv").replace("{name}", report.name));
  };

  const sharedCount = reports.filter((r) => (r as any).isShared).length;
  const notSharedCount = reports.length - sharedCount;

  if (reportsLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (!canReadReports) {
    return (
      <AccessDeniedPage 
        title={t("reports.readAccessDenied")}
        description={t("reports.readAccessDeniedDesc")}
      />
    );
  }

  return (
    <div className="flex flex-col h-full text-sm bg-background relative">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-2 text-textSecondary">
          <span className="hover:underline cursor-pointer">
            {user?.first_name || user?.name?.split(" ")[0] || "CRM"}
          </span>
          <span className="opacity-50">/</span>
          <span className="text-textPrimary font-medium">
            {t("nav.reports")}
          </span>
          <span
            className={`text-xs bg-orange-500/20 px-2 py-0.5 rounded-full text-orange-500 border border-orange-500/30 font-semibold tracking-wider ${isRTL ? "mr-2" : "ml-2"}`}
          >
            BETA Feature
          </span>
          <span
            className={`text-xs ${isRTL ? "mr-2" : "ml-2"} bg-card-hover px-1.5 py-0.5 rounded text-textSecondary border border-border/50`}
          >
            {filteredReports.length}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search
              size={14}
              className={`absolute ${isRTL ? "right-2.5" : "left-2.5"} top-1/2 -translate-y-1/2 text-textSecondary group-focus-within:text-textPrimary transition-colors`}
            />
            <input
              ref={searchRef}
              type="text"
              placeholder={t("reports.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`bg-reports-card border border-border/50 ${isRTL ? "pr-9 pl-4" : "pl-9 pr-4"} py-1.5 text-textPrimary placeholder-textSecondary focus:outline-none focus:border-accent/50 rounded-md text-xs w-64 transition-all ${isRTL ? "text-right" : "text-left"}`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className={`absolute ${isRTL ? "left-2" : "right-2"} top-1/2 -translate-y-1/2 text-textSecondary hover:text-textPrimary`}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content Table */}
      <div className="flex-1 overflow-auto p-6 bg-reports-bg">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <div className="bg-reports-card p-4 rounded-lg border border-border/50">
              <div className="text-textSecondary text-xs font-medium uppercase tracking-wider mb-2">
                {t("reports.totalReports")}
              </div>
              <div className="text-2xl font-bold text-textPrimary">
                {reports.length}
              </div>
            </div>
            <div className="bg-reports-card p-4 rounded-lg border border-border/50">
              <div className="text-textSecondary text-xs font-medium uppercase tracking-wider mb-2">
                {t("reports.notSharedReports")}
              </div>
              <div className="text-2xl font-bold text-textPrimary">
                {notSharedCount}
              </div>
            </div>
            <div className="bg-reports-card p-4 rounded-lg border border-border/50">
              <div className="text-textSecondary text-xs font-medium uppercase tracking-wider mb-2">
                {t("reports.sharedWithManagement")}
              </div>
              <div className="text-2xl font-bold text-textPrimary">
                {sharedCount}
              </div>
            </div>
          </div>

          <div className="bg-reports-card border border-border rounded-xl shadow-2xl overflow-hidden">
            <table
              className={`w-full text-left ${isRTL ? "text-right" : "text-left"}`}
            >
              <thead>
                <tr className="bg-reports-header border-b border-border">
                  <th className="px-5 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={
                        selectedIds.length > 0 &&
                        selectedIds.length === filteredReports.length
                      }
                      onChange={toggleAllSelection}
                      className="rounded border-gray-600 bg-transparent accent-accent cursor-pointer"
                    />
                  </th>
                  <th
                    className={`px-5 py-3 text-xs font-semibold text-textSecondary uppercase tracking-wider cursor-pointer hover:bg-reports-hover transition-colors ${isRTL ? "text-right" : "text-left"}`}
                    onClick={() => handleSort("name")}
                  >
                    <div
                      className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : "flex-row"}`}
                    >
                      <FileText size={14} />
                      {t("reports.name")}
                      {sortField === "name" && (
                        <ArrowUpDown
                          size={12}
                          className={
                            sortDirection === "asc" ? "rotate-180" : ""
                          }
                        />
                      )}
                    </div>
                  </th>
                  <th
                    className="px-5 py-3 text-xs font-semibold text-textSecondary uppercase tracking-wider cursor-pointer hover:bg-reports-hover transition-colors text-center"
                    onClick={() => handleSort("isShared")}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Globe size={14} />
                      {t("reports.status")}
                      {sortField === "isShared" && (
                        <ArrowUpDown
                          size={12}
                          className={
                            sortDirection === "asc" ? "rotate-180" : ""
                          }
                        />
                      )}
                    </div>
                  </th>
                  <th
                    className="px-5 py-3 text-xs font-semibold text-textSecondary uppercase tracking-wider cursor-pointer hover:bg-reports-hover transition-colors text-center"
                    onClick={() => handleSort("createdBy")}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <User size={14} />
                      {t("reports.creator")}
                      {sortField === "createdBy" && (
                        <ArrowUpDown
                          size={12}
                          className={
                            sortDirection === "asc" ? "rotate-180" : ""
                          }
                        />
                      )}
                    </div>
                  </th>
                  <th
                    className="px-5 py-3 text-xs font-semibold text-textSecondary uppercase tracking-wider cursor-pointer hover:bg-reports-hover transition-colors text-center"
                    onClick={() => handleSort("createdAt")}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Calendar size={14} />
                      {t("reports.createdAt")}
                      {sortField === "createdAt" && (
                        <ArrowUpDown
                          size={12}
                          className={
                            sortDirection === "asc" ? "rotate-180" : ""
                          }
                        />
                      )}
                    </div>
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold text-textSecondary uppercase tracking-wider text-right">
                    {t("reports.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredReports.length > 0 ? (
                  filteredReports.map((report) => (
                    <tr
                      key={report.id}
                      className={`hover:bg-reports-row-hover transition-colors group ${selectedIds.includes(report.id) ? "bg-reports-row-selected" : ""}`}
                    >
                      <td className="px-5 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(report.id)}
                          onChange={() => toggleSelected(report.id)}
                          className="rounded border-gray-600 bg-transparent accent-accent cursor-pointer"
                        />
                      </td>
                      <td
                        className="px-5 py-4 cursor-pointer"
                        onClick={() => setViewingReport(report)}
                      >
                        <div
                          className={`flex flex-col ${isRTL ? "items-end" : "items-start"}`}
                        >
                          <span className="text-textPrimary font-medium group-hover:text-accent transition-colors">
                            {(report as any).name}
                          </span>
                          <span
                            className={`text-[10px] text-textSecondary mt-1 italic ${isRTL ? "text-left" : "text-right"}`}
                          >
                            {(report as any).data.length} {t("reports.records")}{" "}
                            {t("reports.filters").charAt(0)}{" "}
                            {(report as any).filters?.length || 0}{" "}
                            {t("reports.filters")}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <button
                          onClick={() => canWriteReports && toggleShared(report)}
                          disabled={!canWriteReports}
                          className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold transition-all
                                                        ${
                                                          (report as any)
                                                            .isShared
                                                            ? "bg-green-500/10 text-green-500 border border-green-500/20"
                                                            : "bg-textSecondary/10 text-textSecondary border border-textSecondary/20"
                                                        }
                                                        ${!canWriteReports ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                                                    `}
                        >
                          {(report as any).isShared ? (
                            <Globe size={10} />
                          ) : (
                            <Lock size={10} />
                          )}
                          {(report as any).isShared
                            ? t("reports.shared")
                            : t("reports.private")}
                        </button>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-6 h-6 bg-orange-500/20 text-orange-500 rounded-full flex items-center justify-center text-[10px] font-bold">
                            {(report as any).createdBy.charAt(0)}
                          </div>
                          <span className="text-textPrimary">
                            {(report as any).createdBy}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-textSecondary text-xs text-center">
                        {new Date(report.createdAt).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          },
                        )}
                      </td>
                      <td className={`px-5 py-4 whitespace-nowrap text-right`}>
                        <div className={`flex items-center gap-1 justify-end`}>
                          <button
                            onClick={() => setViewingReport(report)}
                            className="p-1.5 hover:bg-reports-hover rounded text-textSecondary hover:text-textPrimary transition-colors"
                            title={t("reports.viewReportDetails")}
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handleOpenLink(report)}
                            className="p-1.5 hover:bg-reports-hover rounded text-textSecondary hover:text-accent transition-colors"
                            title={t("reports.openPublicLink")}
                          >
                            <ExternalLink size={16} />
                          </button>
                          <button
                            onClick={() => handleShare(report)}
                            className="p-1.5 hover:bg-reports-hover rounded text-textSecondary hover:text-accent transition-colors"
                            title={t("reports.copyPublicLink")}
                          >
                            <LinkIcon size={16} />
                          </button>
                          <button
                            onClick={() => handleDownloadReport(report)}
                            className="p-1.5 hover:bg-reports-hover rounded text-textSecondary hover:text-textPrimary transition-colors"
                            title={t("reports.downloadCsv")}
                          >
                            <Download size={16} />
                          </button>
                          {canWriteReports && (
                            <button
                              onClick={() => handleDelete([report.id])}
                              className="p-1.5 hover:bg-reports-hover rounded text-textSecondary hover:text-red-400 transition-colors"
                              title={t("reports.deleteReport")}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-5 py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-card-hover rounded-full flex items-center justify-center text-textSecondary">
                          <FileText size={32} />
                        </div>
                        <div className="text-textPrimary font-medium">
                          {t("reports.noReportsFound")}
                        </div>
                        <p className="text-textSecondary text-xs max-w-[250px]">
                          {searchQuery
                            ? t("reports.tryAdjustingSearch")
                            : t("reports.createFirstReport")}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bulk Selection Bar */}
      {selectedIds.length > 0 && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 bg-reports-card border border-accent/30 shadow-2xl rounded-lg px-6 py-3 flex items-center gap-6 animate-in slide-in-from-bottom-4 duration-200 z-[100] ${isRTL ? "flex-row-reverse" : "flex-row"}`}
        >
          <div
            className={`flex items-center gap-3 ${isRTL ? "pl-6 border-l" : "pr-6 border-r"} border-border`}
          >
            <div className="w-6 h-6 bg-accent rounded-full flex items-center justify-center text-white text-xs font-bold">
              {selectedIds.length}
            </div>
            <span className="text-sm font-medium text-textPrimary">
              {selectedIds.length} {t("reports.reportsSelected")}
            </span>
          </div>

          <div
            className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : "flex-row"}`}
          >
            <button
              onClick={handleBulkCopyLinks}
              className={`flex items-center gap-2 px-3 py-1.5 hover:bg-card-hover rounded-md text-xs font-medium text-textSecondary hover:text-textPrimary transition-colors ${isRTL ? "flex-row-reverse" : "flex-row"}`}
            >
              <Copy size={14} /> {t("reports.copyLinks")}
            </button>
            <button
              onClick={handleBulkDownload}
              className={`flex items-center gap-2 px-3 py-1.5 hover:bg-card-hover rounded-md text-xs font-medium text-textSecondary hover:text-textPrimary transition-colors ${isRTL ? "flex-row-reverse" : "flex-row"}`}
            >
              <Download size={14} /> {t("reports.download")}
            </button>
            {canWriteReports && (
              <button
                onClick={() => handleDelete(selectedIds)}
                className={`flex items-center gap-2 px-3 py-1.5 hover:bg-red-500/10 text-red-500 rounded-md text-xs font-medium transition-colors ${isRTL ? "flex-row-reverse" : "flex-row"}`}
              >
                <Trash2 size={14} /> {t("reports.delete")}
              </button>
            )}
          </div>

          <div
            className={
              isRTL ? "border-r border-border" : "border-l border-border"
            }
          >
            <button
              onClick={() => setSelectedIds([])}
              className="text-textSecondary hover:text-textPrimary p-1 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* View Report Modal */}
      {viewingReport && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-background border border-border rounded-2xl w-full max-w-7xl h-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div
              className={`flex items-center justify-between px-6 py-4 border-b border-border bg-reports-bg ${isRTL ? "flex-row-reverse" : "flex-row"}`}
            >
              <div
                className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : "flex-row"}`}
              >
                <div className="p-2 bg-accent/10 rounded-lg">
                  <FileText size={20} className="text-accent" />
                </div>
                <div
                  className={`flex flex-col ${isRTL ? "items-end" : "items-start"}`}
                >
                  <h2 className="text-lg font-bold text-textPrimary">
                    {(viewingReport as any).name}
                  </h2>
                  <p className="text-xs text-textSecondary">
                    {t("reports.snapshotOf").replace(
                      "{count}",
                      String((viewingReport as any).data?.length || 0),
                    )}{" "}
                    {t("reports.createdAt").toLowerCase()}{" "}
                    {new Date(
                      (viewingReport as any).createdAt,
                    ).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div
                className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : "flex-row"}`}
              >
                <button
                  onClick={() => handleShare(viewingReport)}
                  className={`flex items-center gap-2 px-4 py-2 bg-card-hover hover:bg-card-hover-light text-textPrimary rounded-lg text-sm font-medium transition-all ${isRTL ? "flex-row-reverse" : "flex-row"}`}
                >
                  <Copy size={14} /> {t("reports.copyPublicLinkBtn")}
                </button>
                <button
                  onClick={() => setViewingReport(null)}
                  className="p-2 text-textSecondary hover:text-textPrimary hover:bg-card-hover rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col">
              <DataTable
                data={(viewingReport as any).data}
                type="person"
                title={(viewingReport as any).name}
                reportMode={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
