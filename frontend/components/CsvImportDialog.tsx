import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useStore } from "../store";
import { cn } from "../lib/utils";
import {
  FileText,
  Upload,
  X,
  Check,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Link as LinkIcon,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { importTheme } from "../lib/theme";
import { useTranslation } from "../src/i18n";

interface CsvImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  type: "person" | "company" | "task" | "note" | "activity" | "opportunity";
}

const getFieldLabel = (field: string, t: (key: string) => string): string => {
  const labels: Record<string, string> = {
    name: t("fieldLabels.name"),
    email: t("fieldLabels.email"),
    phone: t("fieldLabels.phone"),
    job_title: t("fieldLabels.job_title"),
    avatar: t("fieldLabels.avatar"),
    city: t("fieldLabels.city"),
    linkedin: t("fieldLabels.linkedin"),
    conversion_rate: t("fieldLabels.conversion_rate"),
    stage: t("fieldLabels.stage"),
    lead_type: t("fieldLabels.lead_type"),
    lead_source: t("fieldLabels.lead_source"),
    last_action: t("fieldLabels.last_action"),
    recommended_action: t("fieldLabels.recommended_action"),
    company: t("fieldLabels.company"),
    domain: t("fieldLabels.domain"),
    employees: t("fieldLabels.employees"),
    location: t("fieldLabels.location"),
    arr: t("fieldLabels.arr"),
    icp: t("fieldLabels.icp"),
    title: t("fieldLabels.title"),
    description: t("fieldLabels.description"),
    status: t("fieldLabels.status"),
    due_date: t("fieldLabels.due_date"),
    assignee: t("fieldLabels.assignee"),
    related_person: t("fieldLabels.related_person"),
    related_company: t("fieldLabels.related_company"),
    content: t("fieldLabels.content"),
    type: t("fieldLabels.type"),
    channel: t("fieldLabels.channel"),
    direction: t("fieldLabels.direction"),
    date: t("fieldLabels.date"),
    value: t("fieldLabels.value"),
    contact: t("fieldLabels.contact"),
  };
  return labels[field] || field;
};

const MODEL_FIELDS: Record<string, string[]> = {
  person: [
    "name",
    "email",
    "phone",
    "job_title",
    "avatar",
    "city",
    "linkedin",
    "conversion_rate",
    "stage",
    "lead_type",
    "lead_source",
    "last_action",
    "recommended_action",
    "company",
  ],
  company: [
    "name",
    "domain",
    "employees",
    "location",
    "linkedin",
    "arr",
    "icp",
  ],
  task: [
    "title",
    "description",
    "status",
    "due_date",
    "assignee",
    "related_person",
    "related_company",
  ],
  note: ["title", "content", "related_person", "related_company"],
  activity: [
    "type",
    "channel",
    "direction",
    "title",
    "content",
    "date",
    "related_person",
    "related_company",
  ],
  opportunity: ["name", "value", "stage", "company", "contact"],
};

export const CsvImportDialog = ({
  isOpen,
  onClose,
  type,
}: CsvImportDialogProps) => {
  const { importData, language } = useStore();
  const { t } = useTranslation();
  const isRTL = language === "ar";
  const [step, setStep] = useState<"upload" | "map" | "correct">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [allRows, setAllRows] = useState<any[]>([]);
  const [rowErrors, setRowErrors] = useState<
    Record<number, Record<string, string[]>>
  >({});
  const [correctedFields, setCorrectedFields] = useState<
    Record<number, Set<string>>
  >({});
  const [isImporting, setIsImporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Auto-creation confirmation
  const [showRelationDialog, setShowRelationDialog] = useState<{
    field: string;
    type: string;
  } | null>(null);
  const [autoCreateRelations, setAutoCreateRelations] = useState<
    Record<string, boolean>
  >({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep("upload");
    setFile(null);
    setHeaders([]);
    setMapping({});
    setAllRows([]);
    setRowErrors({});
    setCorrectedFields({});
    setIsImporting(false);
    setAutoCreateRelations({});
    setIsDragging(false);
  };

  const handleFileSelect = (selectedFile: File) => {
    if (
      selectedFile.type !== "text/csv" &&
      !selectedFile.name.endsWith(".csv")
    ) {
      toast.error(t("csvImport.uploadCsvError"));
      return;
    }
    setFile(selectedFile);
    parseCsvHeaders(selectedFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const parseCSVLine = (text: string): string[] => {
    const result: string[] = [];
    let start = 0;
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      if (text[i] === '"') {
        inQuotes = !inQuotes;
      } else if (text[i] === "," && !inQuotes) {
        result.push(text.substring(start, i));
        start = i + 1;
      }
    }
    result.push(text.substring(start));

    return result.map((val) => {
      val = val.trim();
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1);
        val = val.replace(/""/g, '"');
      }
      return val;
    });
  };

  const parseCsvHeaders = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split(/\r?\n/);
      if (lines.length > 0) {
        const firstLine = lines[0];
        const cols = parseCSVLine(firstLine);
        setHeaders(cols);

        const newMapping: Record<string, string> = {};
        const fields = MODEL_FIELDS[type];
        fields.forEach((f) => {
          const match = cols.find(
            (h) =>
              h.toLowerCase() === f.toLowerCase() ||
              h.toLowerCase().replace(/_/g, "") === f.toLowerCase(),
          );
          if (match) newMapping[f] = match;
        });
        setMapping(newMapping);
        setStep("map");
      }
    };
    reader.readAsText(file);
  };

  const processCsvData = (text: string): any[] => {
    const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
    if (lines.length === 0) return [];

    const csvHeaders = parseCSVLine(lines[0]);

    return lines.slice(1).map((line) => {
      const values = parseCSVLine(line);
      const obj: any = {};
      Object.entries(mapping).forEach(([modelField, csvHeader]) => {
        const index = csvHeaders.indexOf(csvHeader as string);
        if (index !== -1 && index < values.length) {
          let val: any = values[index];
          if (modelField === "conversion_rate") val = parseInt(val) || 0;
          if (modelField === "employees") val = val || "";
          if (modelField === "value") val = parseFloat(val) || 0;
          if (modelField === "icp") val = val.toLowerCase() === "true";
          obj[modelField] = val;
        }
      });
      return obj;
    });
  };

  const handleInitialImport = async () => {
    if (!file) return;
    setIsImporting(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const importedData = processCsvData(text);
      setAllRows(importedData);

      const result = await importData(type, {
        data: importedData,
        auto_create: autoCreateRelations,
      });

      if (result.success) {
        onClose();
        reset();
      } else if (result.errors && Array.isArray(result.errors)) {
        const errors: Record<number, any> = {};
        let errorCount = 0;
        result.errors.forEach((err: any, index: number) => {
          if (Object.keys(err).length > 0) {
            errors[index] = err;
            errorCount++;
          }
        });
        setRowErrors(errors);
        setStep("correct");
        toast.error(
          t("csvImport.importFailed").replace("{count}", String(errorCount)),
        );
      }
      setIsImporting(false);
    };
    reader.readAsText(file);
  };

  const handleRetryImport = async () => {
    setIsImporting(true);
    const result = await importData(type, {
      data: allRows,
      auto_create: autoCreateRelations,
    });

    if (result.success) {
      onClose();
      reset();
    } else if (result.errors && Array.isArray(result.errors)) {
      const errors: Record<number, any> = {};
      let errorCount = 0;
      result.errors.forEach((err: any, index: number) => {
        if (Object.keys(err).length > 0) {
          errors[index] = err;
          errorCount++;
        }
      });
      setRowErrors(errors);
      setCorrectedFields({}); // Reset corrected status on new error set
      toast.error(
        t("csvImport.stillHaveErrors").replace("{count}", String(errorCount)),
      );
    }
    setIsImporting(false);
  };

  const updateRowData = (index: number, field: string, value: any) => {
    const updated = [...allRows];
    updated[index] = { ...updated[index], [field]: value };
    setAllRows(updated);

    // If this field previously had an error, mark it as corrected
    if (rowErrors[index]?.[field]) {
      setCorrectedFields((prev) => ({
        ...prev,
        [index]: new Set([...(prev[index] || []), field]),
      }));
    }
  };

  const discardRow = (index: number) => {
    const newAllRows = [...allRows];
    newAllRows.splice(index, 1);
    setAllRows(newAllRows);

    const newRowErrors: Record<number, any> = {};
    Object.entries(rowErrors).forEach(([idx, err]) => {
      const numIdx = parseInt(idx);
      if (numIdx === index) return;
      if (numIdx > index) {
        newRowErrors[numIdx - 1] = err;
      } else {
        newRowErrors[numIdx] = err;
      }
    });
    setRowErrors(newRowErrors);

    const newCorrectedFields: Record<number, Set<string>> = {};
    Object.entries(correctedFields).forEach(([idx, fields]) => {
      const numIdx = parseInt(idx);
      if (numIdx === index) return;
      if (numIdx > index) {
        newCorrectedFields[numIdx - 1] = fields;
      } else {
        newCorrectedFields[numIdx] = fields;
      }
    });
    setCorrectedFields(newCorrectedFields);

    toast.success(t("csvImport.rowDiscarded"));
  };

  const handleImportValidOnly = async () => {
    const errorIndices = new Set(Object.keys(rowErrors).map(Number));
    const validRows = allRows.filter((_, i) => !errorIndices.has(i));

    if (validRows.length === 0) {
      toast.error(t("csvImport.stillHaveErrors").replace("{count}", "0"));
      return;
    }

    setIsImporting(true);
    const result = await importData(type, {
      data: validRows,
      auto_create: autoCreateRelations,
    });

    if (result.success) {
      onClose();
      reset();
      toast.success(t("common.success"));
    } else {
      toast.error(
        t("csvImport.importFailed").replace(
          "{count}",
          String(validRows.length),
        ),
      );
    }
    setIsImporting(false);
  };

  const handleMappingChange = (field: string, csvHeader: string) => {
    setMapping((prev) => ({ ...prev, [field]: csvHeader }));

    const relationMap: Record<string, string> = {
      company: "Company",
      contact: "Person",
      related_person: "Person",
      related_company: "Company",
    };

    if (csvHeader && relationMap[field]) {
      // Auto-enable for company fields, show dialog for person fields
      if (relationMap[field] === "Company") {
        setAutoCreateRelations((prev) => ({ ...prev, [field]: true }));
      } else {
        setShowRelationDialog({ field, type: relationMap[field] });
      }
    }
  };

  const failedIndices = Object.keys(rowErrors).map(Number);

  const isAllCorrected =
    failedIndices.length > 0 &&
    failedIndices.every((rowIndex) => {
      const errors = rowErrors[rowIndex];
      return Object.keys(errors).every((field) =>
        correctedFields[rowIndex]?.has(field),
      );
    });

  const fields = MODEL_FIELDS[type];

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
          reset();
        }
      }}
    >
      <DialogContent
        className={cn(
          "sm:max-w-[900px] border-border shadow-2xl p-0 overflow-hidden flex flex-col max-h-[90vh]",
          importTheme.bg,
        )}
      >
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl font-bold text-textPrimary flex items-center gap-2">
            <Upload className="text-accent" size={20} />
            {t("csvImport.uploadCsvTitle").replace(
              "{type}",
              type.charAt(0).toUpperCase() + type.slice(1) + "s",
            )}
          </DialogTitle>
          <DialogDescription className="text-textSecondary text-xs">
            {t("csvImport.uploadCsvDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {step === "upload" && (
            <div
              className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center cursor-pointer transition-all group ${
                isDragging
                  ? "border-accent bg-accent/10"
                  : "border-border hover:border-accent/50 hover:bg-accent/5"
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div
                className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all",
                  isDragging
                    ? "bg-accent/20 scale-110"
                    : cn(importTheme.surface, "group-hover:scale-110"),
                )}
              >
                <FileText
                  size={32}
                  className={
                    isDragging
                      ? "text-accent"
                      : "text-textSecondary group-hover:text-accent"
                  }
                />
              </div>
              <h3 className="text-lg font-medium text-textPrimary mb-1">
                {isDragging
                  ? t("csvImport.dropHere")
                  : t("csvImport.clickOrDrag")}
              </h3>
              <p className="text-sm text-textSecondary">
                {t("csvImport.csvFilesOnly")}
              </p>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".csv"
                onChange={handleFileChange}
              />
            </div>
          )}

          {step === "map" && (
            <div className="space-y-6">
              <div
                className={cn(
                  "p-4 rounded-lg flex items-start gap-3 border border-border",
                  importTheme.surface,
                )}
              >
                <AlertCircle
                  size={18}
                  className="text-accent shrink-0 mt-0.5"
                />
                <div className="text-xs text-textSecondary leading-relaxed">
                  {t("csvImport.mapInstructions")}
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 px-2 text-[10px] uppercase font-bold text-textSecondary tracking-wider">
                  <span>{t("csvImport.founderStackField")}</span>
                  <span>{t("csvImport.csvColumn")}</span>
                </div>

                {fields.map((field) => (
                  <div
                    key={field}
                    className={cn(
                      "grid grid-cols-2 gap-4 items-center p-2 rounded-lg transition-colors border border-transparent hover:border-border",
                      importTheme.surface,
                      importTheme.hover,
                    )}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm text-textPrimary font-medium">
                        {getFieldLabel(field, t)}
                      </span>
                      <span className="text-[10px] text-textSecondary font-mono">
                        {field}
                      </span>
                    </div>
                    <select
                      className={cn(
                        "border border-border rounded px-3 py-2 text-sm text-textPrimary outline-none focus:border-accent",
                        importTheme.input,
                      )}
                      value={mapping[field] || ""}
                      onChange={(e) =>
                        handleMappingChange(field, e.target.value)
                      }
                    >
                      <option value="">{t("csvImport.dontImport")}</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === "correct" && (
            <div className="space-y-6">
              <div className="bg-red-500/10 p-4 rounded-lg flex items-start gap-3 border border-red-500/20">
                <AlertCircle
                  size={18}
                  className="text-red-500 shrink-0 mt-0.5"
                />
                <div className="text-xs text-textSecondary leading-relaxed">
                  <span className="text-red-500 font-bold block mb-1">
                    {t("csvImport.errorsFound")}
                  </span>
                  {t("csvImport.errorsDesc").replace(
                    "{count}",
                    String(failedIndices.length),
                  )}
                </div>
              </div>

              <div className="space-y-8">
                {failedIndices.map((rowIndex) => {
                  const row = allRows[rowIndex];
                  const errors = rowErrors[rowIndex];
                  return (
                    <div
                      key={rowIndex}
                      className={cn(
                        "border border-border rounded-xl overflow-hidden",
                        importTheme.card,
                      )}
                    >
                      <div
                        className={cn(
                          "px-4 py-2 border-b border-border flex items-center justify-between",
                          importTheme.surface,
                        )}
                      >
                        <span className="text-[10px] uppercase font-bold text-textSecondary tracking-widest">
                          {t("csvImport.rowLabel")}
                          {rowIndex + 1}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-red-400 font-medium">
                            {Object.keys(errors).length}{" "}
                            {t("csvImport.errorsCount")}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-textSecondary hover:text-red-500 hover:bg-red-500/10"
                            onClick={() => discardRow(rowIndex)}
                            title={t("csvImport.discardRow")}
                          >
                            <Trash2 size={12} />
                          </Button>
                        </div>
                      </div>
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {fields
                          .filter((f) => mapping[f])
                          .map((field) => {
                            const fieldError = errors[field];
                            const isCorrected =
                              correctedFields[rowIndex]?.has(field);
                            return (
                              <div key={field} className="space-y-1.5">
                                <label className="text-[10px] uppercase font-semibold text-textSecondary px-1 flex items-center justify-between">
                                  {field.replace(/_/g, " ")}
                                  {fieldError && !isCorrected && (
                                    <AlertCircle
                                      size={10}
                                      className="text-red-500"
                                    />
                                  )}
                                  {isCorrected && (
                                    <Check
                                      size={10}
                                      className="text-green-500"
                                    />
                                  )}
                                </label>
                                <div className="relative group">
                                  <input
                                    className={cn(
                                      "w-full border rounded-lg px-3 py-2 text-sm text-textPrimary outline-none transition-all",
                                      importTheme.input,
                                      fieldError && !isCorrected
                                        ? "border-red-500 ring-1 ring-red-500/20 bg-red-500/5"
                                        : isCorrected
                                          ? "border-green-500 ring-1 ring-green-500/20 bg-green-500/5"
                                          : "border-border focus:border-accent focus:ring-1 focus:ring-accent/20",
                                    )}
                                    value={row[field] || ""}
                                    onChange={(e) =>
                                      updateRowData(
                                        rowIndex,
                                        field,
                                        e.target.value,
                                      )
                                    }
                                  />
                                  {fieldError && !isCorrected && (
                                    <div className="mt-1 text-[10px] text-red-400 px-1 font-medium animate-in fade-in slide-in-from-top-1">
                                      {Array.isArray(fieldError)
                                        ? fieldError[0]
                                        : fieldError}
                                    </div>
                                  )}
                                  {isCorrected && (
                                    <div className="mt-1 text-[10px] text-green-400 px-1 font-medium animate-in fade-in slide-in-from-top-1 flex items-center gap-1">
                                      <Check size={8} />{" "}
                                      {t("csvImport.corrected")}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter
          className={cn("p-6 border-t border-border", importTheme.input)}
        >
          {step === "map" && (
            <Button
              onClick={handleInitialImport}
              className="bg-accent hover:bg-blue-600 text-white font-medium flex items-center gap-2"
              disabled={
                isImporting ||
                (!mapping["name"] && !mapping["title"] && !mapping["type"])
              }
            >
              {isImporting ? (
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <Check size={16} />
              )}
              {isImporting
                ? t("csvImport.processing")
                : t("csvImport.completeImport")}
            </Button>
          )}

          {step === "correct" && (
            <>
              <Button
                variant="ghost"
                onClick={handleImportValidOnly}
                className="font-bold text-accent hover:text-blue-400 bg-accent/10 hover:bg-accent/20 px-3 py-1 rounded transition-all me-auto"
                disabled={
                  isImporting || allRows.length === failedIndices.length
                }
              >
                {t("csvImport.importValidOnly").replace(
                  "{count}",
                  String(allRows.length - failedIndices.length),
                )}
              </Button>
              <Button
                onClick={handleRetryImport}
                className={`${isAllCorrected ? "bg-green-600 hover:bg-green-700" : "bg-accent hover:bg-blue-600"} text-white font-medium flex items-center gap-2 transition-colors`}
                disabled={isImporting}
              >
                {isImporting ? (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Upload size={16} />
                )}
                {isImporting
                  ? t("csvImport.retrying")
                  : t("csvImport.retryImport").replace(
                      "{count}",
                      String(allRows.length),
                    )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>

      <Dialog
        open={!!showRelationDialog}
        onOpenChange={() => setShowRelationDialog(null)}
      >
        <DialogContent
          className={cn(
            "sm:max-w-[400px] border-border shadow-2xl",
            importTheme.bg,
          )}
        >
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-textPrimary flex items-center gap-2">
              <LinkIcon size={18} className="text-accent" />
              {t("csvImport.autoLinkTitle").replace(
                "{type}",
                showRelationDialog?.type || "",
              )}
            </DialogTitle>
            <DialogDescription className="text-textSecondary text-xs">
              {t("csvImport.autoLinkDesc").replace(
                "{type}",
                showRelationDialog?.type || "",
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 text-sm text-textSecondary leading-relaxed">
            {t("csvImport.autoLinkBody").replace(
              "{type}",
              showRelationDialog?.type || "",
            )}
            <br />
            <br />
            <span className="text-xs text-textSecondary/70">
              {t("csvImport.autoLinkHint")}
            </span>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (showRelationDialog)
                  setAutoCreateRelations({
                    ...autoCreateRelations,
                    [showRelationDialog.field]: false,
                  });
                setShowRelationDialog(null);
              }}
              className="flex-1 border-border text-textSecondary"
            >
              {t("csvImport.noUseIds")}
            </Button>
            <Button
              onClick={() => {
                if (showRelationDialog)
                  setAutoCreateRelations({
                    ...autoCreateRelations,
                    [showRelationDialog.field]: true,
                  });
                setShowRelationDialog(null);
              }}
              className="flex-1 bg-accent hover:bg-blue-600 text-white"
            >
              {t("csvImport.yesAutoCreate")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};
