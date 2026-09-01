import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useStore } from "../store";
import { cn } from "../lib/utils";
import { LinkifiedText } from "./LinkifiedText";
import {
  Person,
  Company,
  Task,
  Opportunity,
  Note,
  TaskStatus,
  OpportunityStage,
  ActivityLog,
  Column,
  FieldOption,
} from "../types";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { format } from "date-fns";
import { useTranslation } from "../src/i18n";

import {
  ArrowUpRight,
  DollarSign,
  PieChart,
  AlignLeft,
  RefreshCw,
  XCircle,
  Columns,
  Eye,
  EyeOff,
  Hash,
  History,
  ExternalLink,
  MoreHorizontal as MoreIcon,
  Edit2,
  Info,
  MoreHorizontal,
  Plus,
  Filter,
  ArrowUpDown,
  Settings2,
  Search,
  Maximize2,
  Trash2,
  Heart,
  ChevronDown,
  Check,
  X,
  User,
  Mail,
  Calendar,
  Building2,
  Phone,
  MapPin,
  Briefcase,
  Linkedin,
  Copy,
  Layout,
  GitMerge,
  Download,
  GitBranch,
  LayoutDashboard,
  Target,
  CheckSquare,
  FileText,
  UserPlus,
  Globe,
  Users,
  Sparkles,
  Pin,
  PinOff,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Upload } from "lucide-react";
import ContextMenu from "./ContextMenu";
import { MobileDataTable } from "./mobile/MobileDataTable";
import { CsvImportDialog } from "./CsvImportDialog";
import { CopyDataDialog } from "./CopyDataDialog";
import { parseConversation } from "../lib/api";
import { useGuidedOnboarding, GuidedOnboardingOverlay } from "../src/guided-ob";

interface DataTableProps {
  data: (Person | Company | Task | Opportunity | Note | ActivityLog)[];
  type: "person" | "company" | "task" | "opportunity" | "note" | "activity";
  title: string;
  viewId?: string;
  reportMode?: boolean;
}

type FilterOperator =
  | "contains"
  | "doesNotContain"
  | "is"
  | "isNot"
  | "isEmpty"
  | "isNotEmpty"
  | "isBefore"
  | "isAfter";

interface FilterRule {
  id: string;
  field: string;
  operator: FilterOperator;
  value: string;
}

interface SortRule {
  id: string;
  field: string;
  direction: "asc" | "desc";
}

type CalculationType =
  | "countAll"
  | "countValues"
  | "countUnique"
  | "countEmpty"
  | "percentEmpty"
  | "percentNotEmpty"
  | "sum"
  | "average"
  | "median"
  | "min"
  | "max"
  | "range"
  | "earliest"
  | "latest";

const PRESET_COLORS = [
  { label: "Gray", value: "bg-gray-700 text-gray-200" },
  { label: "Brown", value: "bg-amber-700/70 text-amber-200" },
  { label: "Orange", value: "bg-orange-700/70 text-orange-200" },
  { label: "Yellow", value: "bg-yellow-600/70 text-yellow-100" },
  { label: "Green", value: "bg-green-700/70 text-green-200" },
  { label: "Blue", value: "bg-blue-700/70 text-blue-200" },
  { label: "Purple", value: "bg-indigo-700/70 text-indigo-200" },
  { label: "Pink", value: "bg-pink-700/70 text-pink-200" },
  { label: "Red", value: "bg-red-700/70 text-red-200" },
];

const DataTable = ({
  data,
  type,
  title,
  viewId,
  reportMode,
}: DataTableProps) => {
  // Field mapping from frontend camelCase to backend snake_case
  const fieldMapping: Record<string, string> = {
    companyName: "company__name",
    companyId: "company",
    contactName: "contact__name",
    jobTitle: "job_title",
    leadType: "lead_type",
    leadSource: "lead_source",
    conversionRate: "conversion_rate",
    lastAction: "last_action",
    recommendedAction: "recommended_action",
    createdAt: "created_at",
    createdBy:
      type === "company"
        ? "owner__first_name"
        : type === "activity"
          ? "user__first_name"
          : "created_by__first_name",
    updatedAt: "updated_at",
    dueDate: "due_date",
    personName: "related_person__name",
    personEmail: "related_person__email",
    personPhone: "related_person__phone",
    personLastAction: "related_person__last_action",
    personStage: "related_person__stage",
    personLeadType: "related_person__lead_type",
    personConversionRate: "related_person__conversion_rate",
    relatedCompanyName: "related_company__name",
    relations: "relations",
    status: "status",
    type: "type",
    channel: "channel",
    direction: "direction",
    email: "email",
    city: "city",
    phone: "phone",
    linkedin: "linkedin",
    domain: "domain",
    location: "location",
    arr: "arr",
    icp: "icp",
    assignee: "assignee__first_name",
    content: "content",
  };

  // Define sortable fields per type (backend snake_case names)
  const sortableFields: Record<string, string[]> = {
    person: [
      "name",
      "created_at",
      "conversion_rate",
      "stage",
      "lead_type",
      "lead_source",
      "email",
      "city",
      "job_title",
      "last_action",
      "phone",
      "linkedin",
      "updated_at",
      "company__name",
      "created_by__first_name",
    ],
    company: [
      "name",
      "created_at",
      "employees",
      "domain",
      "owner__first_name",
      "linkedin",
      "location",
      "arr",
      "icp",
      "updated_at",
    ],
    opportunity: [
      "name",
      "value",
      "stage",
      "created_at",
      "company__name",
      "contact__name",
      "updated_at",
    ],
    task: [
      "title",
      "status",
      "due_date",
      "created_at",
      "created_by__first_name",
      "assignee__first_name",
      "updated_at",
    ],
    note: [
      "title",
      "created_at",
      "content",
      "created_by__first_name",
      "updated_at",
    ],
    activity: [
      "date",
      "type",
      "channel",
      "direction",
      "content",
      "related_person__name",
      "related_person__last_action",
      "related_person__stage",
      "related_person__lead_type",
      "related_person__email",
      "related_person__phone",
      "related_person__conversion_rate",
      "updated_at",
    ],
  };

  const navigate = useNavigate();
  const {
    openDrawer,
    addPerson,
    addCompany,
    addOpportunity,
    addNote,
    addTask,
    updatePerson,
    updateCompany,
    updateTask,
    updateOpportunity,
    updateNote,
    updateActivity,
    companies,
    people,
    views,
    updateView,
    customStages,
    customLeadTypes,
    customLeadSources,
    customChannels,
    addCustomStage,
    addCustomLeadType,
    addCustomLeadSource,
    addCustomChannel,
    updateCustomStage,
    updateCustomLeadType,
    updateCustomLeadSource,
    selectedIds,
    selectionType,
    toggleSelection,
    setSelection,
    clearSelection,
    deletePeople,
    deleteCompanies,
    deleteTasks,
    deleteOpportunities,
    deleteNotes,
    deleteActivities,
    addActivity,
    addReport,
    user,
    myAccess,
    setActiveColumns,
    confirm,
    loading,
    counts,
    fetchPeople,
    fetchCompanies,
    fetchTasks,
    fetchOpportunities,
    fetchNotes,
    fetchActivities,
    orgUsers,
    fetchOrgUsers,
    exportPersonData,
    fetchCRMConfig,
    theme,
    language,
  } = useStore();

  const filteredSortableFields = useMemo(() => {
    const result: Record<string, string[]> = {};
    Object.keys(sortableFields).forEach((entityType) => {
      const hidden = myAccess?.hidden_fields?.[entityType] || [];
      result[entityType] = sortableFields[entityType].filter(
        (field) => !hidden.includes(field),
      );
    });
    return result;
  }, [sortableFields, myAccess]);

  const isRTL = language === "ar";
  const { t } = useTranslation();

  const canWrite = useMemo(() => {
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

    return myAccess.permissions.includes(permissionMap[type]);
  }, [myAccess, type]);

  const canExport = useMemo(() => {
    if (!myAccess) return true;
    return (
      myAccess.permissions.includes("*") ||
      myAccess.permissions.includes("exports.read")
    );
  }, [myAccess]);

  const canManageConfig = useMemo(() => {
    if (!myAccess) return true;
    return (
      myAccess.permissions.includes("*") ||
      myAccess.permissions.includes("config.manage")
    );
  }, [myAccess]);

  const canWriteReports = useMemo(() => {
    if (!myAccess) return true;
    return (
      myAccess.permissions.includes("*") ||
      myAccess.permissions.includes("reports.write")
    );
  }, [myAccess]);

  const canRead = useMemo(() => {
    if (!myAccess) return true;
    if (myAccess.permissions.includes("*")) return true;

    const readPermissionMap: Record<string, string> = {
      person: "people.read",
      company: "companies.read",
      opportunity: "opportunities.read",
      task: "tasks.read",
      note: "notes.read",
      activity: "activities.read",
    };

    return myAccess.permissions.includes(readPermissionMap[type]);
  }, [myAccess, type]);

  const isFieldHidden = (field: string) => {
    if (!myAccess?.hidden_fields) return false;
    const entityKey = type === "activity" ? "person" : type; 
    const hiddenForEntity = myAccess.hidden_fields[entityKey] || [];
    const snakeField = fieldMapping[field] || field;

    if (hiddenForEntity.includes(snakeField)) return true;

    if (type === "activity" && field.startsWith("person")) {
      const personField =
        field.charAt(6).toLowerCase() + field.slice(7);
      const snakePersonField = fieldMapping[personField] || personField;
      if (hiddenForEntity.includes(snakePersonField)) return true;
    }

    return false;
  };

  useEffect(() => {
    fetchCRMConfig();
  }, []);

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

  // Selection & Editing
  const [editingCell, setEditingCell] = useState<{
    id: string;
    field: string;
  } | null>(null);

  // Advanced Filter & Sort State
  const [filterRules, setFilterRules] = useState<FilterRule[]>(() => {
    const v = useStore.getState().views.find((v) => v.id === viewId);
    return v?.filterRules || [];
  });
  const [sortRules, setSortRules] = useState<SortRule[]>(() => {
    const v = useStore.getState().views.find((v) => v.id === viewId);
    return v?.sortRules || [];
  });
  const [isAdvancedFilterMode, setIsAdvancedFilterMode] = useState(false);

  // UI State
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    id: string;
  } | null>(null);
  const [headerContextMenu, setHeaderContextMenu] = useState<{
    x: number;
    y: number;
    colKey: string;
  } | null>(null);
  const [activeMenu, setActiveMenu] = useState<
    "filter" | "sort" | "fields" | "options" | null
  >(null);
  const [isCreateReportDialogOpen, setIsCreateReportDialogOpen] =
    useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isAutoMsgParserOpen, setIsAutoMsgParserOpen] = useState(false);
  const [parserPersonId, setParserPersonId] = useState<string | null>(null);
  const [convText, setConvText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const handleParseConversation = async () => {
    if (!parserPersonId || !convText.trim()) return;

    setIsParsing(true);
    try {
      const response = await parseConversation(parserPersonId, convText);
      if (response.ok) {
        toast.success(t("dataTable.conversationParsed"));
        setIsAutoMsgParserOpen(false);
        setConvText("");
      } else {
        toast.error(t("dataTable.failedToParse"));
      }
    } catch (error) {
      console.error("Parse error:", error);
      toast.error(t("dataTable.parsingError"));
    } finally {
      setIsParsing(false);
    }
  };
  const [reportNameInput, setReportNameInput] = useState("");
  const [copyDataDialog, setCopyDataDialog] = useState<{
    isOpen: boolean;
    personId: string | null;
  }>({ isOpen: false, personId: null });

  const location = useLocation();
  const sourceFilterIds = location.state?.sourceFilterIds as
    | string[]
    | undefined;
  const sourceTitle = location.state?.sourceTitle as string | undefined;

  // Initial State from Deep Links
  const initialFilterRules = location.state?.initialFilterRules as
    | FilterRule[]
    | undefined;
  const initialSortRules = location.state?.initialSortRules as
    | SortRule[]
    | undefined;
  const openImport = location.state?.openImport as boolean | undefined;
  const highlightNewRecord = location.state?.highlightNewRecord as
    | boolean
    | undefined;

  useEffect(() => {
    if (initialFilterRules && initialFilterRules.length > 0) {
      setFilterRules(initialFilterRules);
    }
    if (initialSortRules && initialSortRules.length > 0) {
      setSortRules(initialSortRules);
    }
  }, [initialFilterRules, initialSortRules]);

  useEffect(() => {
    if (openImport) {
      setIsImportDialogOpen(true);
    }
  }, [openImport]);

  // --- Pagination & Server Side Logic ---
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  useEffect(() => {
    const canReadUsers = !!myAccess?.permissions?.includes("*") || !!myAccess?.permissions?.includes("users.manage");
    if (type === "task" && canReadUsers) {
      fetchOrgUsers();
    }
  }, [type, fetchOrgUsers, myAccess]);

  // Trigger Fetch on changes
  useEffect(() => {
    const { accessToken } = useStore.getState();
    if (!accessToken) return;
    if (reportMode) return; // Don't refetch on server in report mode (it uses snapshot)

    const params: any = {
      page: currentPage,
      page_size: itemsPerPage,
    };

    if (globalSearchQuery) {
      params.search = globalSearchQuery;
    }

    // Sorting
    if (sortRules.length > 0) {
      const ordering = sortRules
        .map((rule) => {
          let sortField = rule.field;

          // Apply same field mapping as filters
          const fieldMapping: Record<string, string> = {
            companyName: "company__name",
            companyId: "company",
            contactName: "contact__name",
            jobTitle: "job_title",
            leadType: "lead_type",
            leadSource: "lead_source",
            conversionRate: "conversion_rate",
            lastAction: "last_action",
            recommendedAction: "recommended_action",
            createdAt: "created_at",
            createdBy:
              type === "company"
                ? "owner__first_name"
                : type === "activity"
                  ? "user__first_name"
                  : "created_by__first_name",
            updatedAt: "updated_at",
            dueDate: "due_date",
            personName: "related_person__name",
            personEmail: "related_person__email",
            personPhone: "related_person__phone",
            personLastAction: "related_person__last_action",
            personStage: "related_person__stage",
            personLeadType: "related_person__lead_type",
            personConversionRate: "related_person__conversion_rate",
            relatedCompanyName: "related_company__name",
            relations: "relations",
            status: "status",
            type: "type",
            channel: "channel",
            direction: "direction",
            email: "email",
            city: "city",
            phone: "phone",
            linkedin: "linkedin",
            domain: "domain",
            location: "location",
            arr: "arr",
            icp: "icp",
            assignee: "assignee__first_name",
            content: "content",
          };

          if (fieldMapping[sortField]) sortField = fieldMapping[sortField];
          return `${rule.direction === "desc" ? "-" : ""}${sortField}`;
        })
        .join(",");

      params.ordering = ordering;
    }

    // Contextual Filter (View Logs)
    if (type === "activity" && sourceFilterIds && sourceFilterIds.length > 0) {
      params.related_person__in = sourceFilterIds.join(",");
    }

    // Advanced Filter Rules
    if (filterRules.length > 0) {
      filterRules.forEach((rule) => {
        // Skip invalid rules, but allow empty check operators
        if (
          !rule.value &&
          rule.operator !== "isEmpty" &&
          rule.operator !== "isNotEmpty"
        )
          return;

        let key = rule.field;

        // Field Mapping for Backend
        const fieldMapping: Record<string, string> = {
          companyName: "company__name",
          companyId: "company",
          contactName: "contact__name",
          jobTitle: "job_title",
          leadType: "lead_type",
          conversionRate: "conversion_rate",
          lastAction: "last_action",
          recommendedAction: "recommended_action",
          createdAt: "created_at",
          createdBy:
            type === "company"
              ? "owner__first_name"
              : type === "activity"
                ? "user__first_name"
                : "created_by__first_name",
          updatedAt: "updated_at",
          dueDate: "due_date",
          personName: "related_person__name",
          personEmail: "related_person__email",
          personPhone: "related_person__phone",
          // For activity company name
          relatedCompanyName: "related_company__name",
          relations: "relations",
          status: "status",
          type: "type",
        };

        // Special handling for isEmpty on relationship fields - use base field name
        if (rule.operator === "isEmpty" || rule.operator === "isNotEmpty") {
          const relationshipEmptyMapping: Record<string, string> = {
            companyName: "company",
            createdBy: "created_by",
            contactName: "contact",
            personName: "related_person",
            relatedCompanyName: "related_company",
          };
          if (relationshipEmptyMapping[key]) {
            key = relationshipEmptyMapping[key];
          } else if (fieldMapping[key]) {
            key = fieldMapping[key];
          }
        } else {
          // Special handling for Activity company name if key matches
          if (type === "activity" && key === "companyName")
            key = "related_company__name";
          if (fieldMapping[key]) key = fieldMapping[key];
        }

        // Operator Mapping
        switch (rule.operator) {
          case "contains":
            params[`${key}__icontains`] = rule.value;
            break;
          case "doesNotContain":
            params[`${key}__notcontains`] = rule.value;
            break;
          case "is":
            params[key] = rule.value;
            break;
          case "isNot":
            params[`${key}__exclude`] = rule.value;
            break;
          case "isBefore":
            params[`${key}__lt`] = rule.value;
            break;
          case "isAfter":
            params[`${key}__gt`] = rule.value;
            break;
          case "isEmpty":
            params[`${key}__isempty`] = "true";
            break;
          case "isNotEmpty":
            params[`${key}__isempty`] = "false";
            break;
        }
      });
    }

    switch (type) {
      case "person":
        fetchPeople(params);
        break;
      case "company":
        fetchCompanies(params);
        break;
      case "task":
        fetchTasks(params);
        break;
      case "opportunity":
        fetchOpportunities(params);
        break;
      case "note":
        fetchNotes(params);
        break;
      case "activity":
        fetchActivities(params);
        break;
    }
  }, [
    type,
    currentPage,
    itemsPerPage,
    globalSearchQuery,
    sortRules,
    filterRules,
    reportMode,
    sourceFilterIds,
  ]);

  const getInitialColumns = (type: string): Column[] => {
    let initialCols: Column[] = [];
    if (type === "company") {
      initialCols = [
        {
          key: "name",
          label: "Company",
          width: "180px",
          icon: Building2,
          visible: true,
          type: "text",
        },
        {
          key: "domain",
          label: "Domain",
          width: "180px",
          icon: Globe,
          visible: true,
          type: "text",
        },
        {
          key: "createdBy",
          label: t("dataTable.createdBy"),
          width: "150px",
          icon: User,
          visible: true,
          type: "text",
        },
        {
          key: "owner",
          label: t("dataTable.accountOwner"),
          width: "150px",
          icon: User,
          visible: true,
          type: "text",
        },
        {
          key: "createdAt",
          label: t("dataTable.creationDate"),
          width: "180px",
          icon: Calendar,
          visible: true,
          type: "date",
        },
        {
          key: "employees",
          label: t("dataTable.employees"),
          width: "120px",
          icon: Users,
          visible: true,
          type: "text",
        },
        {
          key: "linkedin",
          label: t("dataTable.linkedin"),
          width: "150px",
          icon: Linkedin,
          visible: true,
          type: "text",
        },
        {
          key: "location",
          label: t("dataTable.address"),
          width: "250px",
          icon: MapPin,
          visible: true,
          type: "text",
        },
        {
          key: "arr",
          label: t("dataTable.arr"),
          width: "120px",
          icon: DollarSign,
          visible: true,
          type: "text",
        },
        {
          key: "icp",
          label: t("dataTable.icp"),
          width: "100px",
          icon: Check,
          visible: true,
          type: "text",
        },
      ];
    } else if (type === "task") {
      initialCols = [
        {
          key: "title",
          label: t("dataTable.title"),
          width: "240px",
          icon: CheckSquare,
          visible: true,
          type: "text",
        },
        {
          key: "status",
          label: t("dataTable.status"),
          width: "140px",
          icon: Check,
          visible: true,
          type: "status",
        },
        {
          key: "relations",
          label: t("dataTable.relations"),
          width: "180px",
          icon: ArrowUpRight,
          visible: true,
          type: "relation",
        },
        {
          key: "createdBy",
          label: t("dataTable.createdBy"),
          width: "150px",
          icon: User,
          visible: true,
          type: "text",
        },
        {
          key: "dueDate",
          label: t("dataTable.dueDate"),
          width: "150px",
          icon: Calendar,
          visible: true,
          type: "date",
        },
        {
          key: "assignee",
          label: t("dataTable.assignee"),
          width: "150px",
          icon: User,
          visible: true,
          type: "assignee",
        },
        {
          key: "createdAt",
          label: t("dataTable.creationDate"),
          width: "180px",
          icon: Calendar,
          visible: true,
          type: "date",
        },
      ];
    } else if (type === "opportunity") {
      initialCols = [
        {
          key: "name",
          label: t("dataTable.name"),
          width: "220px",
          icon: Target,
          visible: true,
          type: "text",
        },
        {
          key: "value",
          label: t("dataTable.amount"),
          width: "120px",
          icon: DollarSign,
          visible: true,
          type: "currency",
        },
        {
          key: "stage",
          label: t("dataTable.stage"),
          width: "150px",
          icon: PieChart,
          visible: true,
          type: "stage",
        },
        {
          key: "companyName",
          label: t("dataTable.company"),
          width: "180px",
          icon: Building2,
          visible: true,
          type: "text",
        },
        {
          key: "contactName",
          label: t("dataTable.pointOfContact"),
          width: "180px",
          icon: User,
          visible: true,
          type: "text",
        },
        {
          key: "createdAt",
          label: t("dataTable.creationDate"),
          width: "180px",
          icon: Calendar,
          visible: true,
          type: "date",
        },
      ];
    } else if (type === "note") {
      initialCols = [
        {
          key: "title",
          label: t("dataTable.title"),
          width: "250px",
          icon: FileText,
          visible: true,
          type: "text",
        },
        {
          key: "relations",
          label: t("dataTable.relations"),
          width: "180px",
          icon: ArrowUpRight,
          visible: true,
          type: "relation",
        },
        {
          key: "content",
          label: t("dataTable.body"),
          width: "300px",
          icon: AlignLeft,
          visible: true,
          type: "text",
        },
        {
          key: "createdBy",
          label: t("dataTable.createdBy"),
          width: "150px",
          icon: User,
          visible: true,
          type: "text",
        },
        {
          key: "createdAt",
          label: t("dataTable.creationDate"),
          width: "180px",
          icon: Calendar,
          visible: true,
          type: "date",
        },
      ];
    } else if (type === "activity") {
      initialCols = [
        {
          key: "personName",
          label: t("dataTable.name"),
          width: "180px",
          icon: User,
          visible: true,
          type: "text",
        },
        {
          key: "type",
          label: t("dataTable.type"),
          width: "120px",
          icon: Hash,
          visible: true,
          type: "stage",
        },
        {
          key: "relations",
          label: t("dataTable.relations"),
          width: "180px",
          icon: ArrowUpRight,
          visible: true,
          type: "relation",
        },
        {
          key: "personLastAction",
          label: t("dataTable.lastAction"),
          width: "180px",
          icon: GitBranch,
          visible: false,
          type: "text",
        },
        {
          key: "content",
          label: t("dataTable.lastMsg"),
          width: "250px",
          icon: Mail,
          visible: true,
          type: "text",
        },
        {
          key: "direction",
          label: t("dataTable.direction"),
          width: "120px",
          icon: ArrowUpRight,
          visible: true,
          type: "stage",
        },
        {
          key: "channel",
          label: t("dataTable.channel"),
          width: "120px",
          icon: Globe,
          visible: true,
          type: "stage",
        },
        {
          key: "date",
          label: t("dataTable.date"),
          width: "150px",
          icon: Calendar,
          visible: true,
          type: "date",
        },
        {
          key: "personConversionRate",
          label: t("dataTable.convertPercent"),
          width: "120px",
          icon: Target,
          visible: true,
          type: "number",
        },
        {
          key: "personStage",
          label: t("dataTable.stage"),
          width: "130px",
          icon: PieChart,
          visible: true,
          type: "stage",
        },
        {
          key: "personLeadType",
          label: t("dataTable.type"),
          width: "130px",
          icon: Target,
          visible: true,
          type: "stage",
        },
        {
          key: "personLeadSource",
          label: t("dataTable.source"),
          width: "120px",
          icon: Sparkles,
          visible: true,
          type: "stage",
        },
        {
          key: "personPhone",
          label: t("dataTable.phone"),
          width: "150px",
          icon: Phone,
          visible: true,
          type: "phone",
        },
        {
          key: "personEmail",
          label: t("dataTable.email"),
          width: "200px",
          icon: Mail,
          visible: true,
          type: "text",
        },
      ];
    } else {
      initialCols = [
        {
          key: "name",
          label: t("dataTable.name"),
          width: "200px",
          icon: User,
          visible: true,
          type: "text",
        },
        {
          key: "email",
          label: t("dataTable.email"),
          width: "220px",
          icon: Mail,
          visible: true,
          type: "text",
        },
        {
          key: "conversionRate",
          label: t("dataTable.convertPercent"),
          width: "130px",
          icon: Target,
          visible: true,
          type: "number",
        },
        {
          key: "stage",
          label: t("dataTable.stage"),
          width: "130px",
          icon: PieChart,
          visible: true,
          type: "stage",
        },
        {
          key: "leadType",
          label: t("dataTable.type"),
          width: "130px",
          icon: Target,
          visible: true,
          type: "stage",
        },
        {
          key: "leadSource",
          label: t("dataTable.source"),
          width: "120px",
          icon: Sparkles,
          visible: true,
          type: "stage",
        },
        {
          key: "lastAction",
          label: t("dataTable.lastAction"),
          width: "200px",
          icon: AlignLeft,
          visible: true,
          type: "text",
        },
        {
          key: "createdBy",
          label: t("dataTable.createdBy"),
          width: "150px",
          icon: User,
          visible: true,
          type: "text",
        },
        {
          key: "companyName",
          label: t("dataTable.companyField"),
          width: "180px",
          icon: Building2,
          visible: true,
          type: "select",
        },
        {
          key: "phone",
          label: t("dataTable.phone"),
          width: "180px",
          icon: Phone,
          visible: true,
          type: "phone",
        },
        {
          key: "createdAt",
          label: t("dataTable.creationDate"),
          width: "180px",
          icon: Calendar,
          visible: true,
          type: "date",
        },
        {
          key: "city",
          label: t("dataTable.city"),
          width: "150px",
          icon: MapPin,
          visible: true,
          type: "text",
        },
        {
          key: "jobTitle",
          label: t("dataTable.jobTitle"),
          width: "180px",
          icon: Briefcase,
          visible: true,
          type: "text",
        },
        {
          key: "linkedin",
          label: t("dataTable.linkedin"),
          width: "150px",
          icon: Linkedin,
          visible: true,
          type: "text",
        },
        {
          key: "updatedAt",
          label: t("dataTable.lastUpdate"),
          width: "180px",
          icon: Calendar,
          visible: false,
          type: "date",
        },
      ];
    }

    if (reportMode && type === "person") {
      initialCols = [
        {
          key: "name",
          label: t("dataTable.name"),
          width: "200px",
          icon: User,
          visible: true,
          type: "text",
        },
        {
          key: "companyName",
          label: t("dataTable.company"),
          width: "180px",
          icon: Building2,
          visible: true,
          type: "text",
        },
        {
          key: "leadType",
          label: t("dataTable.type"),
          width: "130px",
          icon: Target,
          visible: true,
          type: "stage",
        },
        {
          key: "stage",
          label: t("dataTable.stage"),
          width: "130px",
          icon: PieChart,
          visible: true,
          type: "stage",
        },
        {
          key: "conversionRate",
          label: t("dataTable.converted"),
          width: "130px",
          icon: Target,
          visible: true,
          type: "number",
        },
        {
          key: "lastAction",
          label: t("dataTable.lastAction"),
          width: "200px",
          icon: AlignLeft,
          visible: true,
          type: "text",
        },
        {
          key: "crmLink",
          label: t("dataTable.crmLink"),
          width: "100px",
          icon: ExternalLink,
          visible: true,
          type: "action",
        },
      ];
    }

    return initialCols.filter((col) => !isFieldHidden(col.key));
  };

  // Calculations State
  const [columnCalculations, setColumnCalculations] = useState<
    Record<string, CalculationType>
  >({});
  const [activeCalculationMenu, setActiveCalculationMenu] = useState<{
    colKey: string;
    x: number;
    y: number;
  } | null>(null);

  // Column State
  const [columns, setColumns] = useState<Column[]>(() => {
    const initialCols = getInitialColumns(type);
    
    // Load from localStorage if exists
    const storageKey = `table-columns-${type}${viewId ? `-${viewId}` : ""}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const savedPrefs = JSON.parse(saved) as {
          key: string;
          width: string;
          visible: boolean;
          pinned?: boolean;
        }[];
        // Merge saved prefs with initial definitions to ensure we have icons and types
        const orderedCols: Column[] = [];
        savedPrefs.forEach((pref) => {
          const col = initialCols.find((c) => c.key === pref.key);
          if (col) {
            orderedCols.push({
              ...col,
              width: pref.width,
              visible: pref.visible,
              pinned: pref.pinned || false,
            });
          }
        });
        // Add any new columns that might have been added to the app but aren't in savedPrefs
        initialCols.forEach((col) => {
          if (!orderedCols.find((c) => c.key === col.key)) {
            orderedCols.push(col);
          }
        });
        return orderedCols;
      } catch (e) {
        console.error("Failed to parse saved column preferences", e);
      }
    }

    const v = useStore.getState().views.find((v) => v.id === viewId);
    if (v && v.visibleColumns && v.visibleColumns.length > 0) {
      return initialCols.map((col) => ({
        ...col,
        visible: v.visibleColumns.includes(col.key),
      }));
    }
    return initialCols;
  });

  // Persistence for column preferences
  useEffect(() => {
    const storageKey = `table-columns-${type}${viewId ? `-${viewId}` : ""}`;
    const prefs = columns.map((c) => ({
      key: c.key,
      width: c.width,
      visible: c.visible,
      pinned: c.pinned,
    }));
    localStorage.setItem(storageKey, JSON.stringify(prefs));
  }, [columns, type, viewId]);

  const togglePin = (key: string) => {
    setColumns((prev) => {
      const col = prev.find((c) => c.key === key);
      if (!col) return prev;
      const isPinned = !col.pinned;
      
      const newCols = [...prev];
      const idx = newCols.findIndex((c) => c.key === key);
      const [removed] = newCols.splice(idx, 1);
      
      if (isPinned) {
        let lastPinnedIdx = -1;
        for (let i = 0; i < newCols.length; i++) {
          if (newCols[i].pinned) lastPinnedIdx = i;
        }
        newCols.splice(lastPinnedIdx + 1, 0, { ...removed, pinned: true });
      } else {
        let firstUnpinnedIdx = newCols.findIndex(c => !c.pinned);
        if (firstUnpinnedIdx === -1) firstUnpinnedIdx = newCols.length;
        newCols.splice(firstUnpinnedIdx, 0, { ...removed, pinned: false });
      }
      return newCols;
    });
  };

  const pinnedOffsets = useMemo(() => {
    const offsets: Record<string, number> = {};
    let currentOffset = 40; 
    columns
      .filter((c) => c.visible && c.pinned)
      .forEach((col) => {
        offsets[col.key] = currentOffset;
        currentOffset += parseInt(col.width) || 0;
      });
    return offsets;
  }, [columns]);

  // --- Column Resizing & Reordering Logic ---
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const resizeStartX = useRef<number>(0);
  const resizeStartWidth = useRef<number>(0);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);

  const startResizing = (
    e: React.MouseEvent,
    colKey: string,
    currentWidth: string,
  ) => {
    e.stopPropagation();
    e.preventDefault();
    setResizingColumn(colKey);
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = parseInt(currentWidth);

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - resizeStartX.current;
      const newWidth = Math.max(50, resizeStartWidth.current + delta);
      setColumns((prev) =>
        prev.map((c) =>
          c.key === colKey ? { ...c, width: `${newWidth}px` } : c,
        ),
      );
    };

    const onMouseUp = () => {
      setResizingColumn(null);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  const autoSizeColumn = (colKey: string) => {
    const col = columns.find((c) => c.key === colKey);
    if (!col) return;

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return;
    context.font = "14px Inter, system-ui, sans-serif";

    let maxWidth = 0;

    // 1. Measure header
    const headerTextWidth = context.measureText(col.label).width;
    const headerWidth = headerTextWidth + 80; // Icon + Padding + Sort + Pin
    maxWidth = Math.max(maxWidth, headerWidth);

    // 2. Measure data (sample first 100 rows for performance)
    filteredData.slice(0, 100).forEach((item: any) => {
      let val = "";
      const rawVal = item[colKey];

      if (col.type === "date") {
        try {
          val = rawVal ? format(new Date(rawVal), "MMM d, yyyy") : "";
        } catch (e) {
          val = String(rawVal || "");
        }
      } else if (col.type === "currency") {
        val = (Number(rawVal) || 0).toLocaleString();
      } else if (typeof rawVal === "object" && rawVal !== null) {
        val = rawVal.name || rawVal.title || String(rawVal);
      } else {
        val = String(rawVal || "");
      }

      const width = context.measureText(val).width + 48; // Padding + extra breathing room
      maxWidth = Math.max(maxWidth, width);
    });

    const finalWidth = Math.min(Math.max(maxWidth, 100), 600);

    setColumns((prev) =>
      prev.map((c) =>
        c.key === colKey ? { ...c, width: `${Math.ceil(finalWidth)}px` } : c,
      ),
    );
    toast.success(`${col.label} ${t("dataTable.autoSized") || "auto-sized"}`);
  };

  const handleDragStart = (e: React.DragEvent, key: string) => {
    if (resizingColumn) return;
    setDraggedColumn(key);
    e.dataTransfer.setData("columnKey", key);
    // Visual feedback
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetKey: string) => {
    e.preventDefault();
    const draggedKey = e.dataTransfer.getData("columnKey");
    if (!draggedKey || draggedKey === targetKey) return;

    setColumns((prev) => {
      const newCols = [...prev];
      const draggedIdx = newCols.findIndex((c) => c.key === draggedKey);
      const targetIdx = newCols.findIndex((c) => c.key === targetKey);
      if (draggedIdx === -1 || targetIdx === -1) return prev;

      const [removed] = newCols.splice(draggedIdx, 1);
      newCols.splice(targetIdx, 0, removed);
      return newCols;
    });
    setDraggedColumn(null);
  };

  const handleSort = (colKey: string, multi: boolean) => {
    setSortRules((prev) => {
      const existing = prev.find((s) => s.field === colKey);
      const newDirection = existing?.direction === "asc" ? "desc" : "asc";

      if (multi) {
        if (existing) {
          return prev.map((s) =>
            s.field === colKey ? { ...s, direction: newDirection } : s,
          );
        }
        return [
          ...prev,
          { id: Math.random().toString(), field: colKey, direction: "asc" },
        ];
      } else {
        return [{ id: "quick", field: colKey, direction: newDirection }];
      }
    });
  };

  const isFieldReadOnly = (field: string) => {
    if (!canWrite || reportMode) return true;
    const readOnlyFields = ["createdAt", "createdBy", "owner", "updatedAt"];
    if (readOnlyFields.includes(field)) return true;

    if (type === "activity") {
      const activityEditableFields = [
        "direction",
        "content",
        "channel",
        "personLastAction",
        "type",
        "date",
        "relations",
      ];
      return !activityEditableFields.includes(field);
    }

    if (field.startsWith("person") && type !== "person" && type !== "activity")
      return true;

    return false;
  };

  const moveToNextCell = (
    id: string,
    field: string,
    direction: "next" | "prev" = "next",
  ) => {
    const visibleColumns = columns.filter((c) => c.visible);
    let colIndex = visibleColumns.findIndex((c) => c.key === field);
    let rowIndex = filteredData.findIndex((item: any) => item.id === id);

    if (colIndex === -1 || rowIndex === -1) return;

    let attempts = 0;
    const maxAttempts = visibleColumns.length * filteredData.length;

    while (attempts < maxAttempts) {
      attempts++;
      if (direction === "next") {
        colIndex++;
        if (colIndex >= visibleColumns.length) {
          colIndex = 0;
          rowIndex++;
        }
      } else {
        colIndex--;
        if (colIndex < 0) {
          colIndex = visibleColumns.length - 1;
          rowIndex--;
        }
      }

      if (rowIndex < 0 || rowIndex >= filteredData.length) {
        setEditingCell(null);
        return;
      }

      const nextField = visibleColumns[colIndex].key;
      if (!isFieldReadOnly(nextField)) {
        setEditingCell({
          id: (filteredData[rowIndex] as any).id,
          field: nextField,
        });
        return;
      }
    }

    setEditingCell(null);
  };

  // Sync columns to store for SelectionBar export
  useEffect(() => {
    setActiveColumns(columns);
  }, [columns, setActiveColumns]);

  const handleUpdateView = () => {
    if (viewId) {
      updateView(viewId, {
        filterRules,
        sortRules,
        visibleColumns: columns.filter((c) => c.visible).map((c) => c.key),
      });
    }
  };

  const handleResetView = () => {
    const activeView = views.find((v) => v.id === viewId);
    // Clear local storage on reset to return to view defaults
    const storageKey = `table-columns-${type}${viewId ? `-${viewId}` : ""}`;
    localStorage.removeItem(storageKey);

    if (activeView) {
      setFilterRules(activeView.filterRules || []);
      setSortRules(activeView.sortRules || []);
      setGlobalSearchQuery("");
      setIsAdvancedFilterMode(false);
      if (activeView.visibleColumns.length > 0) {
        setColumns(
          getInitialColumns(type).map((col) => ({
            ...col,
            visible: activeView.visibleColumns.includes(col.key),
          })),
        );
      } else {
        setColumns(getInitialColumns(type));
      }
    } else {
      setColumns(getInitialColumns(type));
      setFilterRules([]);
      setSortRules([]);
      setGlobalSearchQuery("");
    }
  };

  // Load View Logic
  useEffect(() => {
    const activeView = views.find((v) => v.id === viewId);
    const storageKey = `table-columns-${type}${viewId ? `-${viewId}` : ""}`;
    const saved = localStorage.getItem(storageKey);

    if (saved) {
      try {
        const savedPrefs = JSON.parse(saved) as {
          key: string;
          width: string;
          visible: boolean;
          pinned?: boolean;
        }[];
        const initialCols = getInitialColumns(type);
        const orderedCols: Column[] = [];

        savedPrefs.forEach((pref) => {
          const col = initialCols.find((c) => c.key === pref.key);
          if (col) {
            orderedCols.push({
              ...col,
              width: pref.width,
              visible: pref.visible,
              pinned: !!pref.pinned,
            });
          }
        });

        initialCols.forEach((col) => {
          if (!orderedCols.find((c) => c.key === col.key)) {
            orderedCols.push(col);
          }
        });

        setColumns(orderedCols);

        if (activeView) {
          setFilterRules(activeView.filterRules || []);
          setSortRules(activeView.sortRules || []);
        }
        return;
      } catch (e) {
        console.error("Failed to parse saved column preferences", e);
      }
    }

    if (activeView) {
      setFilterRules(activeView.filterRules || []);
      setSortRules(activeView.sortRules || []);
      // If the view has saved columns, use them. Otherwise, use defaults.
      const baseCols = getInitialColumns(type);
      if (activeView.visibleColumns && activeView.visibleColumns.length > 0) {
        setColumns(
          baseCols.map((col) => ({
            ...col,
            visible: activeView.visibleColumns.includes(col.key),
          })),
        );
      } else {
        setColumns(baseCols);
      }
    } else {
      // Default view logic
      setFilterRules([]);
      setSortRules([]);
      setColumns(getInitialColumns(type));
    }
  }, [viewId, type, views, reportMode, language]);

  // Clear selection if navigating to a different entity type table
  useEffect(() => {
    if (selectionType && selectionType !== type) {
      clearSelection();
    }
  }, [type, selectionType]);

  // Initialize columns based on type (only if no viewId)
  useEffect(() => {
    if (!viewId && !reportMode) {
      let initialCols = getInitialColumns(type);
      setColumns(initialCols);
      // Reset calculations when type changes
      setColumnCalculations({ [initialCols[0].key]: "countAll" });
    }
  }, [type, viewId, reportMode, language]);

  // --- Filtering & Sorting Logic ---

  const filteredData = useMemo(() => {
    if (!reportMode) {
      // In normal mode, data is now filtered by the backend.
      return data;
    }

    let result = data;

    // 0. Contextual Filter (for View Logs)
    if (type === "activity" && sourceFilterIds && sourceFilterIds.length > 0) {
      result = result.filter((item) =>
        sourceFilterIds.includes((item as ActivityLog).relatedPersonId),
      );
    }

    // 1. Global Search
    if (globalSearchQuery) {
      const lowerQuery = globalSearchQuery.toLowerCase();
      result = result.filter((item) =>
        Object.values(item).some((val) =>
          String(val).toLowerCase().includes(lowerQuery),
        ),
      );
    }

    // 2. Filter Rules
    if (filterRules.length > 0) {
      result = result.filter((item) => {
        // Default to AND logic for multiple rules
        return filterRules.every((rule) => {
          const itemValue = (item as any)[rule.field];
          const ruleValue = rule.value;
          const strItemVal = String(itemValue || "").toLowerCase();
          const strRuleVal = String(ruleValue || "").toLowerCase();

          switch (rule.operator) {
            case "contains":
              return strItemVal.includes(strRuleVal);
            case "doesNotContain":
              return !strItemVal.includes(strRuleVal);
            case "is":
              return strItemVal === strRuleVal;
            case "isNot":
              return strItemVal !== strRuleVal;
            case "isEmpty":
              return !itemValue || itemValue === "";
            case "isNotEmpty":
              return !!itemValue && itemValue !== "";
            // ISO date string comparison
            case "isBefore":
              return itemValue < ruleValue;
            case "isAfter":
              return itemValue > ruleValue;
            default:
              return true;
          }
        });
      });
    }

    // 3. Sorting
    if (sortRules.length > 0) {
      result = [...result].sort((a, b) => {
        for (const sort of sortRules) {
          const valA = (a as any)[sort.field] || "";
          const valB = (b as any)[sort.field] || "";

          const col = columns.find((c) => c.key === sort.field);
          let comparison = 0;

          if (col?.type === "date") {
            const dateA = valA ? new Date(valA) : new Date(0);
            const dateB = valB ? new Date(valB) : new Date(0);
            comparison = dateA.getTime() - dateB.getTime();
          } else if (col?.type === "currency" || col?.type === "number") {
            const numA = valA && !isNaN(Number(valA)) ? Number(valA) : 0;
            const numB = valB && !isNaN(Number(valB)) ? Number(valB) : 0;
            comparison = numA - numB;
          } else {
            comparison = String(valA).localeCompare(String(valB));
          }

          if (comparison !== 0) {
            return sort.direction === "asc" ? comparison : -comparison;
          }
        }
        return 0;
      });
    }

    return result;
  }, [
    data,
    globalSearchQuery,
    filterRules,
    sortRules,
    reportMode,
    sourceFilterIds,
  ]);

  // Total Count from Server (or client if report)
  const totalCount = reportMode
    ? filteredData.length
    : counts[type] || data.length;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [globalSearchQuery, type]);

  // --- Calculations Logic ---

  const calculateColumn = (colKey: string, calcType: CalculationType) => {
    const values = filteredData.map((item: any) => item[colKey]);
    const definedValues = values.filter(
      (v) => v !== null && v !== undefined && v !== "",
    );
    const total = values.length;

    if (total === 0) return "0";

    const isNumeric =
      columns.find((c) => c.key === colKey)?.type === "currency" ||
      columns.find((c) => c.key === colKey)?.type === "number";

    switch (calcType) {
      case "countAll":
        return total.toString();
      case "countValues":
        return definedValues.length.toString();
      case "countUnique":
        return new Set(definedValues).size.toString();
      case "countEmpty":
        return (total - definedValues.length).toString();
      case "percentEmpty":
        return Math.round(((total - definedValues.length) / total) * 100) + "%";
      case "percentNotEmpty":
        return Math.round((definedValues.length / total) * 100) + "%";

      case "sum":
        if (isNumeric) {
          const sum = definedValues.reduce(
            (acc, val) => acc + (Number(val) || 0),
            0,
          );
          return sum.toLocaleString();
        }
        return "-";

      case "average":
        if (isNumeric && definedValues.length > 0) {
          const sum = definedValues.reduce(
            (acc, val) => acc + (Number(val) || 0),
            0,
          );
          return Math.round(sum / definedValues.length).toLocaleString();
        }
        return "-";

      case "min":
        if (isNumeric && definedValues.length > 0)
          return Math.min(...definedValues.map((v) => Number(v))).toString();
        return "-";

      case "max":
        if (isNumeric && definedValues.length > 0)
          return Math.max(...definedValues.map((v) => Number(v))).toString();
        return "-";

      case "median":
        if (isNumeric && definedValues.length > 0) {
          const sorted = definedValues
            .map((v) => Number(v))
            .sort((a, b) => a - b);
          const mid = Math.floor(sorted.length / 2);
          return sorted.length % 2 !== 0
            ? sorted[mid].toString()
            : ((sorted[mid - 1] + sorted[mid]) / 2).toString();
        }
        return "-";

      default:
        return "";
    }
  };

  // --- Event Handlers ---

  const handleRowClick = (item: any) => {
    if (!editingCell) {
      if (type === "activity" && item.relatedPersonId) {
        openDrawer({ id: item.relatedPersonId, type: "person" });
      } else {
        openDrawer({ id: item.id, type: type });
      }
    }
  };

  const handleContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    if (!selectedIds.includes(id)) {
      setSelection([id], type);
    }
    setContextMenu({ x: e.clientX, y: e.clientY, id });
  };

  const handleCopyMessages = async (id: string) => {
    const text = await exportPersonData(id, "messages");
    if (text) {
      navigator.clipboard.writeText(text);
      toast.success("Messages copied to clipboard");
    }
  };

  const handleCopyData = (id: string) => {
    setCopyDataDialog({ isOpen: true, personId: id });
  };

  const handleDeleteContext = () => {
    if (contextMenu) {
      confirm({
        title: t("confirm.deleteItems"),
        description: t("confirm.deleteItemsConfirm").replace(
          "{count}",
          String(selectedIds.length),
        ),
        confirmText: t("confirm.delete"),
        onConfirm: async () => {
          try {
            switch (type) {
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
              t("confirm.deletedItems").replace(
                "{count}",
                String(selectedIds.length),
              ),
            );
            clearSelection();
          } catch (error) {
            toast.error(t("confirm.deleteItemsFailed"));
          }
        },
      });
    }
  };

  const { highlighted, clearHighlight } = useGuidedOnboarding();

  const handleNewRecord = () => {
    if (highlighted === "new_record") clearHighlight();
    if (type === "person") {
      const tempId = Math.random().toString();
      addPerson({
        id: tempId,
        name: "Untitled",
        email: "",
        jobTitle: "",
        companyId: "",
        companyName: "",
        phone: "",
        city: "",
        leadSource: "Outbound",
        createdAt: "Just now",
        createdBy:
          `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
          user?.name ||
          "You",
      }).then((createdPerson) => {
        if (createdPerson) {
          openDrawer({ id: createdPerson.id, type: "person" });
        }
      });
    } else if (type === "company") {
      const tempId = Math.random().toString();
      addCompany({
        id: tempId,
        name: "Untitled",
        domain: "",
        employees: "",
        location: "",
        createdAt: "Just now",
        owner:
          `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
          user?.name ||
          "You",
        arr: "$0",
        icp: false,
      }).then((createdCompany) => {
        if (createdCompany) {
          openDrawer({ id: createdCompany.id, type: "company" });
        }
      });
    } else if (type === "task") {
      const tempId = Math.random().toString();
      addTask({
        id: tempId,
        title: "Untitled",
        status: "Todo",
        dueDate: "",
        assignee:
          `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
          user?.name ||
          "Me",
        assigneeId: user?.id,
        createdAt: "Just now",
      }).then((createdTask) => {
        if (createdTask) {
          openDrawer({ id: createdTask.id, type: "task" });
        }
      });
    } else if (type === "opportunity") {
      const tempId = Math.random().toString();
      addOpportunity({
        id: tempId,
        name: "New Opp",
        value: 0,
        companyName: "Pending",
        contactName: "Pending",
        stage: "Screening",
        createdAt: "Just now",
      }).then((createdOpp) => {
        if (createdOpp) {
          openDrawer({ id: createdOpp.id, type: "opportunity" });
        }
      });
    } else if (type === "note") {
      const tempId = Math.random().toString();
      // We await the real creation so we get the real ID from the backend
      addNote({
        id: tempId,
        title: "New Note",
        content: "",
        createdAt: "Just now",
      }).then((createdNote) => {
        if (createdNote) {
          openDrawer({ id: createdNote.id, type: "note" });
        }
      });
    } else if (type === "activity") {
      const tempId = Math.random().toString();
      addActivity({
        id: tempId,
        type: "note",
        channel: "system",
        direction: "system",
        content: "New activity log...",
        date: new Date().toISOString(),
      }).then((createdActivity) => {
        if (createdActivity) {
          openDrawer({ id: createdActivity.id, type: "activity" });
        }
      });
    }
  };

  const handleCreateReport = () => {
    if (type !== "person" || filteredData.length === 0) return;
    setReportNameInput(`Report - ${new Date().toLocaleDateString()}`);
    setIsCreateReportDialogOpen(true);
  };

  const submitCreateReport = async () => {
    if (!reportNameInput) return;

    try {
      await addReport({
        id: "temp", // Backend assigns real ID
        name: reportNameInput,
        data: filteredData as Person[],
        createdBy:
          `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
          user?.name ||
          "You",
        createdAt: new Date().toISOString(),
        isShared: false,
        filters: filterRules,
        sorts: sortRules,
      });

      toast.success("Report created successfully!");
      setIsCreateReportDialogOpen(false);
    } catch (error) {
      toast.error("Failed to create report");
    }
  };

  const isSelected = (id: string) =>
    selectedIds.includes(id) && selectionType === type;
  const isAllSelected =
    filteredData.length > 0 &&
    selectedIds.length === filteredData.length &&
    selectionType === type;

  const toggleAll = () => {
    if (isAllSelected) {
      clearSelection();
    } else {
      setSelection(
        filteredData.map((d: any) => d.id),
        type,
      );
    }
  };

  const toggleVisibility = (key: string) => {
    setColumns((cols) =>
      cols.map((c) => (c.key === key ? { ...c, visible: !c.visible } : c)),
    );
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (activeMenu && !(e.target as Element).closest(".menu-container")) {
        setActiveMenu(null);
      }
      if (
        activeCalculationMenu &&
        !(e.target as Element).closest(".calc-menu")
      ) {
        setActiveCalculationMenu(null);
      }
      if (
        headerContextMenu &&
        !(e.target as Element).closest(".header-context-menu")
      ) {
        setHeaderContextMenu(null);
      }
    };

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (
          activeMenu ||
          activeCalculationMenu ||
          contextMenu ||
          headerContextMenu
        ) {
          setActiveMenu(null);
          setActiveCalculationMenu(null);
          setContextMenu(null);
          setHeaderContextMenu(null);
          e.stopPropagation();
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc, true); // Use capture to handle before others
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc, true);
    };
  }, [activeMenu, activeCalculationMenu, contextMenu, headerContextMenu]);

  // --- Sub-Components ---

  const HeaderContextMenu = () => {
    if (!headerContextMenu) return null;
    const col = columns.find((c) => c.key === headerContextMenu.colKey);
    if (!col) return null;

    const actions = [
      {
        label: t("dataTable.hideColumn"),
        icon: EyeOff,
        onClick: () => toggleVisibility(headerContextMenu.colKey),
      },
      {
        label: col.pinned ? t("dataTable.unpin") : t("dataTable.pin"),
        icon: col.pinned ? PinOff : Pin,
        onClick: () => togglePin(col.key),
      },
      {
        label: t("dataTable.sortAsc"),
        icon: ArrowUp,
        onClick: () => {
          setSortRules([{ id: "quick", field: col.key, direction: "asc" }]);
        },
      },
      {
        label: t("dataTable.sortDesc"),
        icon: ArrowDown,
        onClick: () => {
          setSortRules([{ id: "quick", field: col.key, direction: "desc" }]);
        },
      },
      {
        label: t("dataTable.bestFit"),
        icon: Maximize2,
        onClick: () => autoSizeColumn(col.key),
      },
    ];

    return (
      <div
        className="header-context-menu fixed bg-menu-bg border border-border rounded-lg shadow-2xl py-1 z-[100] w-48 animate-in fade-in zoom-in-95 duration-100"
        style={{ left: headerContextMenu.x, top: headerContextMenu.y }}
        onClick={(e) => e.stopPropagation()}
      >
        {actions.map((action, idx) => (
          <button
            key={idx}
            className="w-full px-3 py-2 flex items-center gap-3 text-sm text-textPrimary hover:bg-card-hover transition-colors text-left"
            onClick={(e) => {
              e.stopPropagation();
              action.onClick();
              setHeaderContextMenu(null);
            }}
          >
            <action.icon size={14} className="text-textSecondary" />
            <span>{action.label}</span>
          </button>
        ))}
      </div>
    );
  };

  const FieldsPanel = () => {
    const visibleCols = columns.filter((c) => c.visible);
    const hiddenCols = columns.filter((c) => !c.visible);

    return (
      <div
        className={`menu-container absolute top-full mt-1 bg-menu-bg border border-border rounded-lg shadow-2xl w-[280px] z-50 flex flex-col animate-in fade-in zoom-in-95 duration-100 max-h-[60vh] ${isRTL ? "right-0" : "left-0"}`}
      >
        <div className="flex items-center justify-between p-3 border-b border-border">
          <span className="font-medium text-textPrimary text-sm">
            {t("dataTable.fields")}
          </span>
          <button
            onClick={() => setActiveMenu(null)}
            className="text-textSecondary hover:text-textPrimary"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-2 flex-1 overflow-y-auto custom-scrollbar">
          <div className="mb-2">
            <div className="text-[10px] uppercase font-semibold text-textSecondary px-2 py-1 mb-1">
              {t("dataTable.shown")}
            </div>
            {visibleCols.map((col) => (
              <div
                key={col.key}
                className="flex items-center gap-2 px-2 py-1.5 hover:bg-card-hover rounded cursor-pointer group"
              >
                <div
                  className="text-accent"
                  onClick={() => toggleVisibility(col.key)}
                >
                  <CheckSquare size={14} />
                </div>
                <span
                  className="flex-1 text-textPrimary text-sm"
                  onClick={() => toggleVisibility(col.key)}
                >
                  {col.label}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePin(col.key);
                  }}
                  className={`p-1 rounded hover:bg-skeleton-bg transition-colors ${col.pinned ? "text-accent" : "text-textSecondary opacity-0 group-hover:opacity-100"}`}
                  title={col.pinned ? t("dataTable.unpin") : t("dataTable.pin")}
                >
                  {col.pinned ? <PinOff size={12} /> : <Pin size={12} />}
                </button>
                <div
                  className="text-textSecondary opacity-0 group-hover:opacity-100"
                  onClick={() => toggleVisibility(col.key)}
                >
                  <Eye size={12} />
                </div>
              </div>
            ))}
          </div>
          <div className="mb-2">
            <div className="text-[10px] uppercase font-semibold text-textSecondary px-2 py-1 mb-1">
              {t("dataTable.hidden")}
            </div>
            {hiddenCols.length === 0 && (
              <div className="px-2 text-textSecondary text-xs italic">
                {t("dataTable.noHiddenFields")}
              </div>
            )}
            {hiddenCols.map((col) => (
              <div
                key={col.key}
                className="flex items-center gap-2 px-2 py-1.5 hover:bg-skeleton-bg rounded cursor-pointer group opacity-75 hover:opacity-100"
                onClick={() => toggleVisibility(col.key)}
              >
                <div className="text-textSecondary">
                  <div className="w-3.5 h-3.5 border border-textSecondary/50 rounded"></div>
                </div>
                <span className="flex-1 text-textPrimary text-sm">
                  {col.label}
                </span>
                <div className="text-textSecondary opacity-0 group-hover:opacity-100">
                  <EyeOff size={12} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ... FilterPanel and SortPanel reused (omitted for brevity but logically present in full file) ...
  // Re-inserting simplified versions for completeness in the update
  const FilterPanel = () => {
    const [searchTerm, setSearchTerm] = useState("");

    // Group fields
    const visibleFields = columns.filter(
      (c) =>
        c.visible && c.label.toLowerCase().includes(searchTerm.toLowerCase()),
    );
    const hiddenFields = columns.filter(
      (c) =>
        !c.visible && c.label.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    const addFilter = (fieldKey: string) => {
      const col = columns.find((c) => c.key === fieldKey);
      // Default operator based on type
      let defaultOp: FilterOperator = "contains";
      if (col?.type === "date") defaultOp = "is";
      if (col?.type === "status" || col?.type === "select") defaultOp = "is";

      setFilterRules((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          field: fieldKey,
          operator: defaultOp,
          value: "",
        },
      ]);
    };

    return (
      <div
        className={`menu-container absolute top-full mt-1 bg-menu-bg border border-border rounded-lg shadow-2xl w-[320px] z-50 flex flex-col animate-in fade-in zoom-in-95 duration-100 max-h-[80vh] ${isRTL ? "right-0" : "left-0"}`}
      >
        <div className="flex items-center justify-between p-3 border-b border-border">
          <span className="font-medium text-textPrimary text-sm">
            {t("dataTable.filter")}
          </span>
          <button
            onClick={() => setActiveMenu(null)}
            className="text-textSecondary hover:text-textPrimary"
          >
            <X size={14} />
          </button>
        </div>

        {/* Active Filter Configuration (Simple Mode) */}
        {!isAdvancedFilterMode && filterRules.length > 0 && (
          <div className="p-3 border-b border-border space-y-3 bg-menu-section-bg">
            {filterRules.map((rule, idx) => {
              const col = columns.find((c) => c.key === rule.field);
              return (
                <div key={rule.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-textPrimary flex items-center gap-1">
                      {col?.icon && (
                        <col.icon size={12} className="text-textSecondary" />
                      )}
                      {col?.label}
                    </span>
                    <button
                      onClick={() =>
                        setFilterRules((prev) =>
                          prev.filter((r) => r.id !== rule.id),
                        )
                      }
                      className="text-textSecondary hover:text-red-400"
                    >
                      <X size={12} />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <select
                      className="bg-input-bg border border-border rounded text-xs px-2 py-1.5 text-textPrimary outline-none w-1/3"
                      value={rule.operator}
                      onChange={(e) =>
                        setFilterRules((prev) =>
                          prev.map((r) =>
                            r.id === rule.id
                              ? {
                                  ...r,
                                  operator: e.target.value as FilterOperator,
                                }
                              : r,
                          ),
                        )
                      }
                    >
                      {/* Dynamic operators based on field type */}
                      {col?.type === "date" ? (
                        <>
                          <option value="isBefore">
                            {t("dataTable.isBefore")}
                          </option>
                          <option value="isAfter">
                            {t("dataTable.isAfter")}
                          </option>
                        </>
                      ) : col?.key === "linkedin" ? (
                        <>
                          <option value="isEmpty">
                            {t("dataTable.isEmpty")}
                          </option>
                          <option value="isNotEmpty">
                            {t("dataTable.isNotEmpty")}
                          </option>
                        </>
                      ) : (
                        <>
                          <option value="contains">
                            {t("dataTable.contains")}
                          </option>
                          <option value="doesNotContain">
                            {t("dataTable.doesNotContain")}
                          </option>
                          <option value="isEmpty">
                            {t("dataTable.isEmpty")}
                          </option>
                          <option value="isNotEmpty">
                            {t("dataTable.isNotEmpty")}
                          </option>
                        </>
                      )}
                    </select>
                    {rule.operator !== "isEmpty" &&
                      rule.operator !== "isNotEmpty" &&
                      (col?.type === "date" ? (
                        <input
                          type="date"
                          className="bg-input-bg border border-border rounded text-xs px-2 py-1.5 text-textPrimary outline-none flex-1 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:brightness-100"
                          value={rule.value}
                          onChange={(e) =>
                            setFilterRules((prev) =>
                              prev.map((r) =>
                                r.id === rule.id
                                  ? { ...r, value: e.target.value }
                                  : r,
                              ),
                            )
                          }
                        />
                      ) : (
                        <input
                          autoFocus
                          dir="auto"
                          className="bg-input-bg border border-border rounded text-xs px-2 py-1.5 text-textPrimary outline-none flex-1"
                          placeholder={t("dataTable.value")}
                          value={rule.value}
                          onChange={(e) =>
                            setFilterRules((prev) =>
                              prev.map((r) =>
                                r.id === rule.id
                                  ? { ...r, value: e.target.value }
                                  : r,
                              ),
                            )
                          }
                        />
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Field List to Add */}
        <div className="p-2 flex-1 overflow-y-auto custom-scrollbar">
          <div className="relative mb-2 px-1">
            <Search
              size={14}
              className={`absolute top-1/2 -translate-y-1/2 text-textSecondary ${isRTL ? "right-3" : "left-3"}`}
            />
            <input
              type="text"
              dir="auto"
              placeholder={t("dataTable.searchFields")}
              className="w-full bg-input-bg border border-border rounded pl-8 pr-2 py-1.5 text-xs text-textPrimary focus:outline-none focus:border-textSecondary/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus={filterRules.length === 0}
            />
          </div>

          {visibleFields.map((col) => (
            <div
              key={col.key}
              onClick={() => addFilter(col.key)}
              className="flex items-center gap-2 px-2 py-1.5 hover:bg-skeleton-bg rounded cursor-pointer group"
            >
              <col.icon size={14} className="text-textSecondary" />
              <span className="flex-1 text-textPrimary text-sm">
                {col.label}
              </span>
            </div>
          ))}
          {hiddenFields.length > 0 && (
            <>
              <div className="text-[10px] uppercase font-semibold text-textSecondary px-2 py-1 mt-2">
                {t("dataTable.hiddenFields")}
              </div>
              {hiddenFields.map((col) => (
                <div
                  key={col.key}
                  onClick={() => addFilter(col.key)}
                  className="flex items-center gap-2 px-2 py-1.5 hover:bg-skeleton-bg rounded cursor-pointer group opacity-75 hover:opacity-100"
                >
                  <col.icon size={14} className="text-textSecondary" />
                  <span className="flex-1 text-textPrimary text-sm">
                    {col.label}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-2 border-t border-border bg-table-bg">
          <button
            onClick={() => {
              setIsAdvancedFilterMode(!isAdvancedFilterMode);
              setActiveMenu(null);
            }}
            className="w-full flex items-center justify-center gap-2 py-1.5 text-xs text-textSecondary hover:text-textPrimary hover:bg-skeleton-bg rounded transition-colors"
          >
            <Settings2 size={12} />
            {isAdvancedFilterMode
              ? t("dataTable.switchToBasicFilter")
              : t("dataTable.advancedFilter")}
          </button>
        </div>
      </div>
    );
  };

  const SortPanel = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const filteredCols = columns
      .filter((c) => c.label.toLowerCase().includes(searchTerm.toLowerCase()))
      .filter((c) => filteredSortableFields[type]?.includes(c.key));

    const toggleSort = (fieldKey: string) => {
      setSortRules((prev) => {
        const existing = prev.find((s) => s.field === fieldKey);
        if (existing) {
          if (existing.direction === "asc")
            return prev.map((s) =>
              s.field === fieldKey ? { ...s, direction: "desc" } : s,
            );
          return prev.filter((s) => s.field !== fieldKey);
        }
        // Single sort behavior for now as per usual UX, though state supports multi
        return [
          { id: Math.random().toString(), field: fieldKey, direction: "asc" },
        ];
      });
    };

    return (
      <div
        className={`menu-container absolute top-full mt-1 bg-dropdown-bg border border-border rounded-lg shadow-2xl w-[280px] z-50 flex flex-col animate-in fade-in zoom-in-95 duration-100 max-h-[60vh] ${isRTL ? "right-0" : "left-0"}`}
      >
        <div className="flex items-center justify-between p-3 border-b border-border">
          <span className="font-medium text-textPrimary text-sm">
            {t("dataTable.sortBy")}
          </span>
          <button
            onClick={() => setActiveMenu(null)}
            className="text-textSecondary hover:text-textPrimary"
          >
            <X size={14} />
          </button>
        </div>

        {sortRules.length > 0 && (
          <div className="p-2 border-b border-border space-y-1 bg-menu-section-bg">
            {sortRules.map((rule) => {
              const col = columns.find((c) => c.key === rule.field);
              return (
                <div
                  key={rule.id}
                  className="flex items-center justify-between px-2 py-1.5 bg-skeleton-bg rounded"
                >
                  <span className="text-xs text-textPrimary flex items-center gap-2">
                    {col?.icon && (
                      <col.icon size={12} className="text-textSecondary" />
                    )}
                    {col?.label}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-textSecondary uppercase">
                      {rule.direction === "asc"
                        ? t("dataTable.asc")
                        : t("dataTable.desc")}
                    </span>
                    <button
                      onClick={() => toggleSort(rule.field)}
                      className="text-textSecondary hover:text-textPrimary"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="p-2 flex-1 overflow-y-auto custom-scrollbar">
          <div className="relative mb-2">
            <input
              type="text"
              placeholder={t("dataTable.search")}
              className="w-full bg-input-bg border border-border rounded px-2 py-1.5 text-xs text-textPrimary focus:outline-none focus:border-textSecondary/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {filteredCols.map((col) => (
            <div
              key={col.key}
              onClick={() => toggleSort(col.key)}
              className="flex items-center gap-2 px-2 py-1.5 hover:bg-skeleton-bg rounded cursor-pointer group"
            >
              <col.icon size={14} className="text-textSecondary" />
              <span className="flex-1 text-textPrimary text-sm">
                {col.label}
              </span>
              {sortRules.some((s) => s.field === col.key) && (
                <Check size={12} className="text-accent" />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const AdvancedFilterBar = () => {
    const addRule = () => {
      setFilterRules((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          field: "name",
          operator: "contains",
          value: "",
        },
      ]);
    };

    return (
      <div className="bg-table-bg border-b border-border p-3 flex flex-col gap-3 animate-in slide-in-from-top-2 duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-textSecondary">
            <Filter size={14} />
            <span className="font-medium">
              {t("dataTable.advancedFilterRules")}
            </span>
          </div>
          <button
            onClick={() => setIsAdvancedFilterMode(false)}
            className="text-xs text-textSecondary hover:text-textPrimary hover:underline"
          >
            {t("dataTable.exitAdvancedMode")}
          </button>
        </div>

        <div className="space-y-2">
          {filterRules.map((rule, index) => {
            const col = columns.find((c) => c.key === rule.field);
            return (
              <div key={rule.id} className="flex items-center gap-2 text-sm">
                <span
                  className={`text-textSecondary w-12 text-xs font-mono ${isRTL ? "text-left" : "text-right"}`}
                >
                  {index === 0 ? t("dataTable.where") : t("dataTable.and")}
                </span>

                {/* Field Selector */}
                <div className="relative group">
                  <div className="flex items-center gap-2 bg-input-bg border border-border rounded px-2 py-1 min-w-[120px] cursor-pointer hover:border-textSecondary">
                    {col?.icon && (
                      <col.icon size={12} className="text-textSecondary" />
                    )}
                    <select
                      className="bg-transparent outline-none w-full appearance-none cursor-pointer text-textPrimary"
                      value={rule.field}
                      onChange={(e) =>
                        setFilterRules((prev) =>
                          prev.map((r) =>
                            r.id === rule.id
                              ? { ...r, field: e.target.value }
                              : r,
                          ),
                        )
                      }
                    >
                      {columns.map((c) => (
                        <option key={c.key} value={c.key}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Operator Selector - Dynamic based on field type */}
                {(() => {
                  const filterCol = columns.find((c) => c.key === rule.field);
                  return (
                    <select
                      className="bg-input-bg border border-border rounded px-2 py-1 text-textPrimary outline-none min-w-[100px]"
                      value={rule.operator}
                      onChange={(e) =>
                        setFilterRules((prev) =>
                          prev.map((r) =>
                            r.id === rule.id
                              ? {
                                  ...r,
                                  operator: e.target.value as FilterOperator,
                                }
                              : r,
                          ),
                        )
                      }
                    >
                      {filterCol?.type === "date" ? (
                        <>
                          <option value="isBefore">
                            {t("dataTable.isBefore")}
                          </option>
                          <option value="isAfter">
                            {t("dataTable.isAfter")}
                          </option>
                        </>
                      ) : filterCol?.key === "linkedin" ? (
                        <>
                          <option value="isEmpty">
                            {t("dataTable.isEmpty")}
                          </option>
                          <option value="isNotEmpty">
                            {t("dataTable.isNotEmpty")}
                          </option>
                        </>
                      ) : (
                        <>
                          <option value="contains">
                            {t("dataTable.contains")}
                          </option>
                          <option value="doesNotContain">
                            {t("dataTable.doesNotContain")}
                          </option>
                          <option value="isEmpty">
                            {t("dataTable.isEmpty")}
                          </option>
                          <option value="isNotEmpty">
                            {t("dataTable.isNotEmpty")}
                          </option>
                        </>
                      )}
                    </select>
                  );
                })()}

                {/* Value Input */}
                {rule.operator !== "isEmpty" &&
                  rule.operator !== "isNotEmpty" &&
                  (() => {
                    const filterCol = columns.find((c) => c.key === rule.field);
                    return filterCol?.type === "date" ? (
                      <input
                        type="date"
                        className="bg-input-bg border border-border rounded px-2 py-1 text-textPrimary outline-none flex-1 min-w-[150px] [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:brightness-100"
                        value={rule.value}
                        onChange={(e) =>
                          setFilterRules((prev) =>
                            prev.map((r) =>
                              r.id === rule.id
                                ? { ...r, value: e.target.value }
                                : r,
                            ),
                          )
                        }
                      />
                    ) : (
                      <input
                        className="bg-input-bg border border-border rounded px-2 py-1 text-textPrimary outline-none flex-1 min-w-[150px]"
                        placeholder={t("dataTable.value")}
                        value={rule.value}
                        onChange={(e) =>
                          setFilterRules((prev) =>
                            prev.map((r) =>
                              r.id === rule.id
                                ? { ...r, value: e.target.value }
                                : r,
                            ),
                          )
                        }
                      />
                    );
                  })()}

                <button
                  onClick={() =>
                    setFilterRules((prev) =>
                      prev.filter((r) => r.id !== rule.id),
                    )
                  }
                  className="p-1 hover:bg-skeleton-bg rounded text-textSecondary hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>

        <div>
          <button
            onClick={addRule}
            className="text-xs flex items-center gap-1 text-textSecondary hover:text-textPrimary hover:bg-skeleton-bg px-2 py-1 rounded transition-colors"
          >
            <Plus size={12} /> {t("dataTable.addFilterRule")}
          </button>
        </div>
      </div>
    );
  };

  const CalculationMenu = ({
    colKey,
    onClose,
  }: {
    colKey: string;
    onClose: () => void;
  }) => {
    const col = columns.find((c) => c.key === colKey);
    const isNumeric = col?.type === "currency" || col?.type === "number";
    const isDate = col?.type === "date";

    const handleSelect = (type: CalculationType | "none") => {
      if (type === "none") {
        const newCalcs = { ...columnCalculations };
        delete newCalcs[colKey];
        setColumnCalculations(newCalcs);
      } else {
        setColumnCalculations((prev) => ({ ...prev, [colKey]: type }));
      }
      onClose();
    };

    const Option = ({
      label,
      type,
    }: {
      label: string;
      type: CalculationType;
    }) => (
      <div
        className={`px-3 py-1.5 hover:bg-skeleton-bg cursor-pointer text-sm flex justify-between items-center ${columnCalculations[colKey] === type ? "text-accent" : "text-textPrimary"}`}
        onClick={() => handleSelect(type)}
      >
        <span>{label}</span>
        {columnCalculations[colKey] === type && <Check size={12} />}
      </div>
    );

    return (
      <div
        className="calc-menu fixed bg-dropdown-bg border border-border shadow-2xl rounded-lg py-1 z-[100] min-w-[180px] animate-in fade-in zoom-in-95 duration-75"
        style={{
          top: activeCalculationMenu?.y,
          left: activeCalculationMenu?.x,
        }}
      >
        <div className="px-3 py-1.5 text-xs font-semibold text-textSecondary uppercase tracking-wider">
          {t("dataTable.calculate")}
        </div>
        <Option label={t("dataTable.countAll")} type="countAll" />
        <Option label={t("dataTable.countValues")} type="countValues" />
        <Option label={t("dataTable.countUnique")} type="countUnique" />
        <Option label={t("dataTable.countEmpty")} type="countEmpty" />
        <Option label={t("dataTable.countNotEmpty")} type="percentNotEmpty" />
        <Option label={t("dataTable.percentEmpty")} type="percentEmpty" />
        <Option label={t("dataTable.percentNotEmpty")} type="percentNotEmpty" />

        {isNumeric && (
          <>
            <div className="h-[1px] bg-border my-1" />
            <Option label={t("dataTable.sum")} type="sum" />
            <Option label={t("dataTable.average")} type="average" />
            <Option label={t("dataTable.median")} type="median" />
            <Option label={t("dataTable.min")} type="min" />
            <Option label={t("dataTable.max")} type="max" />
          </>
        )}

        <div className="h-[1px] bg-border my-1" />
        <div
          className="px-3 py-1.5 hover:bg-skeleton-bg cursor-pointer text-sm text-textSecondary hover:text-textPrimary"
          onClick={() => handleSelect("none")}
        >
          {t("dataTable.none")}
        </div>
      </div>
    );
  };

  const isViewModified = useMemo(() => {
    if (!viewId) return false;
    const activeView = views.find((v) => v.id === viewId);
    if (!activeView) return false;

    const currentVisibleKeys = columns
      .filter((c) => c.visible)
      .map((c) => c.key)
      .sort()
      .join(",");
    const savedVisibleKeys = activeView.visibleColumns.sort().join(",");

    return (
      JSON.stringify(filterRules) !== JSON.stringify(activeView.filterRules) ||
      JSON.stringify(sortRules) !== JSON.stringify(activeView.sortRules) ||
      currentVisibleKeys !== savedVisibleKeys
    );
  }, [viewId, views, filterRules, sortRules, columns]);

  return (
    <>
      <div className="md:hidden flex-1 min-h-0 flex flex-col">
        <MobileDataTable data={data} type={type} title={title} />
      </div>

      <div className="hidden md:flex flex-col flex-1 min-h-0 text-sm bg-background relative">
        <GuidedOnboardingOverlay highlighted={highlighted} />
        {/* Header Toolbar */}
        {!reportMode && (
          <div className="flex items-center justify-between px-6 py-3 border-b border-border">
            {!reportMode && (
              <div className="flex items-center gap-2 text-textSecondary">
                <span className="hover:underline cursor-pointer">
                  {user?.first_name ||
                    user?.name?.split(" ")[0] ||
                    t("dataTable.workspace")}
                </span>
                <span className="opacity-50">/</span>
                <span className="text-textPrimary font-medium capitalize">
                  {type === "activity" && sourceFilterIds ? (
                    <span className="flex items-center gap-2">
                      {t("dataTable.logsFor")}{" "}
                      {sourceTitle || t("dataTable.currentView")}
                      <button
                        onClick={() =>
                          navigate("/people/logs", { state: {}, replace: true })
                        }
                        className="text-[10px] bg-skeleton-bg hover:bg-card-hover-light px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors"
                        title="Clear contextual filter"
                      >
                        <X size={10} /> {t("dataTable.clear")}
                      </button>
                    </span>
                  ) : viewId ? (
                    views.find((v) => v.id === viewId)?.name
                  ) : (
                    title
                  )}
                </span>
                <span className="text-xs ml-2 bg-skeleton-bg px-1.5 py-0.5 rounded text-textSecondary border border-border/50">
                  {totalCount}
                </span>
              </div>
            )}
            {reportMode && (
              <div className="flex items-center gap-2 text-textSecondary">
                <span className="text-textPrimary font-bold text-lg">
                  {title}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2">
              {isViewModified && (
                <div className="flex items-center gap-2 mr-2 animate-in fade-in slide-in-from-right-2 duration-300">
                  <button
                    onClick={handleResetView}
                    className="flex items-center gap-1.5 px-2 py-1 hover:bg-skeleton-bg rounded text-xs text-textSecondary hover:text-textPrimary transition-colors"
                  >
                    <RefreshCw size={12} /> {t("dataTable.reset")}
                  </button>
                  <div className="h-4 w-[1px] bg-border"></div>
                  <button
                    onClick={handleUpdateView}
                    className="text-xs font-semibold text-accent hover:text-blue-400 px-3 py-1 bg-accent/10 hover:bg-accent/20 rounded transition-all flex items-center gap-1.5"
                  >
                    <Check size={12} />
                    {t("dataTable.updateView")}
                  </button>
                </div>
              )}
              {!reportMode && type === "person" && canWriteReports && (
                <>
                  <button
                    onClick={() => {
                      if (highlighted === "create_report") clearHighlight();
                      handleCreateReport();
                    }}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 hover:bg-skeleton-bg text-textPrimary rounded-sm transition-all text-xs font-medium border border-border relative",
                      highlighted === "create_report" &&
                        "z-[100] ring-2 ring-accent scale-105 shadow-[0_0_15px_var(--color-accent-shadow)] border-accent bg-card-bg",
                    )}
                  >
                    <FileText
                      size={14}
                      className={cn(
                        highlighted === "create_report"
                          ? "text-accent"
                          : "text-textSecondary",
                      )}
                    />
                    {t("dataTable.createReport")}
                    {highlighted === "create_report" && (
                      <span className="absolute -top-1 -right-1 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                      </span>
                    )}
                  </button>
                  {/*<button
                  onClick={() =>
                    navigate("/people/logs", {
                      state: {
                        sourceFilterIds: filteredData.map((d) => d.id),
                        sourceTitle:
                          title === "All People" && viewId
                            ? views.find((v) => v.id === viewId)?.name
                            : title,
                      },
                    })
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-skeleton-bg text-textPrimary rounded-sm transition-colors text-xs font-medium border border-border"
                >
                  <History size={14} className="text-textSecondary" />
                  View Logs
                </button>*/}
                </>
              )}
              {!reportMode && canWrite && (
                <div className="flex items-center gap-2">
                  {type !== "activity" && (
                    <button
                      onClick={() => {
                        if (highlighted === "import_btn") clearHighlight();
                        setIsImportDialogOpen(true);
                      }}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 hover:bg-skeleton-bg text-textPrimary rounded-sm transition-all text-xs font-medium border border-border relative",
                        highlighted === "import_btn" &&
                          "ring-2 ring-accent scale-105 animate-pulse shadow-[0_0_15px_var(--color-accent-shadow)] border-accent z-[100] bg-table-bg",
                      )}
                    >
                      <Upload size={14} className="text-textSecondary" />
                      {t("dataTable.import")}
                      {highlighted === "import_btn" && (
                        <span className="absolute -top-1 -right-1 flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                        </span>
                      )}
                    </button>
                  )}
                  <button
                    onClick={handleNewRecord}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-blue-600 text-white rounded-sm transition-colors text-xs font-medium shadow-sm"
                  >
                    <Plus size={14} />
                    {t("dataTable.newRecord")}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Filter/Sort/Search Bar */}
        <div className="flex items-center justify-between px-6 py-2 border-b border-border bg-background relative">
          <div className="flex items-center gap-1">
            <div className="relative">
              <button
                onClick={() =>
                  setActiveMenu(activeMenu === "filter" ? null : "filter")
                }
                className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${activeMenu === "filter" || filterRules.length > 0 ? "bg-skeleton-bg text-textPrimary" : "text-textSecondary hover:text-textPrimary hover:bg-skeleton-bg"}`}
              >
                <Filter size={14} /> <span>{t("dataTable.filter")}</span>
                {filterRules.length > 0 && (
                  <span className="ml-1 bg-accent text-white px-1 rounded-sm text-[10px]">
                    {filterRules.length}
                  </span>
                )}
              </button>
              {activeMenu === "filter" && <FilterPanel />}
            </div>

            <div className="relative">
              <button
                onClick={() =>
                  setActiveMenu(activeMenu === "sort" ? null : "sort")
                }
                className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${activeMenu === "sort" || sortRules.length > 0 ? "bg-skeleton-bg text-textPrimary" : "text-textSecondary hover:text-textPrimary hover:bg-skeleton-bg"}`}
              >
                <ArrowUpDown size={14} /> <span>{t("dataTable.sort")}</span>
                {sortRules.length > 0 && (
                  <span className="ml-1 bg-accent text-white px-1 rounded-sm text-[10px]">
                    {sortRules.length}
                  </span>
                )}
              </button>
              {activeMenu === "sort" && <SortPanel />}
            </div>

            <div className="relative">
              <button
                onClick={() =>
                  setActiveMenu(activeMenu === "fields" ? null : "fields")
                }
                className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${activeMenu === "fields" ? "bg-skeleton-bg text-textPrimary" : "text-textSecondary hover:text-textPrimary hover:bg-skeleton-bg"}`}
              >
                <Columns size={14} /> <span>{t("dataTable.fields")}</span>
              </button>
              {activeMenu === "fields" && <FieldsPanel />}
            </div>

            <div className="h-4 w-[1px] bg-border mx-2"></div>

            {!isAdvancedFilterMode && filterRules.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-[500px]">
                {filterRules.map((rule) => {
                  const col = columns.find((c) => c.key === rule.field);

                  const operatorLabels: Record<FilterOperator, string> = {
                    contains: t("dataTable.contains"),
                    doesNotContain: t("dataTable.doesNotContain"),
                    is: t("dataTable.is"),
                    isNot: t("dataTable.isNot"),
                    isEmpty: t("dataTable.isEmpty"),
                    isNotEmpty: t("dataTable.isNotEmpty"),
                    isBefore: t("dataTable.isBefore"),
                    isAfter: t("dataTable.isAfter"),
                  };

                  let displayValue = rule.value;
                  if (
                    rule.operator === "isEmpty" ||
                    rule.operator === "isNotEmpty"
                  ) {
                    displayValue = "";
                  } else if (
                    !rule.value &&
                    (rule.operator === "is" || rule.operator === "isNot")
                  ) {
                    displayValue = t("dataTable.empty");
                  }

                  return (
                    <div
                      key={rule.id}
                      className="flex items-center gap-1.5 bg-skeleton-bg px-2.5 py-1 rounded border border-border text-xs text-textPrimary whitespace-nowrap group hover:border-accent/50 transition-colors"
                    >
                      <span className="text-textSecondary">{col?.label}</span>
                      <span className="text-textSecondary opacity-70">
                        {operatorLabels[rule.operator]}
                      </span>
                      {displayValue && <span>{displayValue}</span>}
                      <button
                        onClick={() =>
                          setFilterRules((prev) =>
                            prev.filter((r) => r.id !== rule.id),
                          )
                        }
                        className="ml-1 text-textSecondary hover:text-red-400 opacity-60 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="relative group ml-auto">
              <Search
                size={14}
                className={`absolute top-1/2 -translate-y-1/2 text-textSecondary group-hover:text-textPrimary transition-colors ${isRTL ? "right-2" : "left-2"}`}
              />
              <input
                ref={searchRef}
                type="text"
                dir={isRTL ? "rtl" : "ltr"}
                placeholder={t("dataTable.searchPlaceholder")}
                value={globalSearchQuery}
                onChange={(e) => setGlobalSearchQuery(e.target.value)}
                className={`bg-transparent text-textPrimary placeholder-textSecondary focus:outline-none text-sm w-32 focus:w-48 transition-all h-8 rounded hover:bg-skeleton-bg focus:bg-skeleton-bg ${isRTL ? "pr-8 pl-3" : "pl-8 pr-3"}`}
              />
            </div>
          </div>
        </div>

        {isAdvancedFilterMode && <AdvancedFilterBar />}

        {/* Main Table Content */}
        <div className="flex-1 overflow-auto bg-table-bg custom-scrollbar">
          <div className="min-w-full inline-block align-middle pb-12">
            <div className="border-b border-border">
              <div className="flex bg-table-bg sticky top-0 z-10 w-fit">
                <div
                  className="w-10 flex-shrink-0 border-r border-border border-b border-border p-2 flex items-center justify-center bg-table-bg sticky z-[40]"
                  style={{ [isRTL ? "right" : "left"]: 0 }}
                >
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleAll}
                    className="rounded border-gray-600 bg-transparent accent-accent cursor-pointer"
                  />
                </div>
                {columns
                  .filter((c) => c.visible)
                  .map((col) => {
                    const backendField = fieldMapping[col.key] || col.key;
                    const isSortable =
                      filteredSortableFields[type]?.includes(backendField);
                    const isPinned = !!col.pinned && !reportMode;

                    return (
                      <div
                        key={col.key}
                        style={{
                          width: col.width,
                          ...(isPinned
                            ? { [isRTL ? "right" : "left"]: pinnedOffsets[col.key] }
                            : {}),
                        }}
                        draggable={!reportMode && !isPinned}
                        onDragStart={(e) => handleDragStart(e, col.key)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, col.key)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setHeaderContextMenu({
                            x: e.clientX,
                            y: e.clientY,
                            colKey: col.key,
                          });
                        }}
                        className={`flex-shrink-0 p-2 px-3 border-r border-border border-b border-border text-xs font-medium text-textSecondary uppercase tracking-wide flex items-center gap-2 group ${isSortable ? "cursor-pointer hover:bg-skeleton-bg" : ""} bg-table-bg transition-colors relative ${draggedColumn === col.key ? "opacity-50" : ""} ${isPinned ? "sticky z-[30]" : ""}`}
                        onDoubleClick={
                          isSortable
                            ? (e) => handleSort(col.key, e.shiftKey)
                            : undefined
                        }
                      >
                        <col.icon size={13} />
                        <span className="truncate flex-1">{col.label}</span>
                        {(() => {
                          const sortIdx = sortRules.findIndex(
                            (s) => s.field === col.key,
                          );
                          if (sortIdx === -1) return null;
                          return (
                            <div className="flex items-center gap-0.5">
                              <ArrowUpDown
                                size={10}
                                className="text-accent"
                              />
                              {sortRules.length > 1 && (
                                <span className="text-[8px] font-bold text-accent bg-accent/10 px-0.5 rounded-sm">
                                  {sortIdx + 1}
                                </span>
                              )}
                            </div>
                          );
                        })()}

                        {/* Pin button on hover */}
                        {!reportMode && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePin(col.key);
                            }}
                            className={`p-1 rounded hover:bg-skeleton-bg transition-all cursor-pointer ${col.pinned ? "text-accent opacity-100" : "text-textSecondary opacity-0 group-hover:opacity-100"}`}
                            title={
                              col.pinned
                                ? t("dataTable.unpin")
                                : t("dataTable.pin")
                            }
                          >
                            {col.pinned ? (
                              <PinOff size={10} />
                            ) : (
                              <Pin size={10} />
                            )}
                          </button>
                        )}

                        {/* Resize Handle */}
                        {!reportMode && (
                          <div
                            className={`absolute ${isRTL ? "left-0" : "right-0"} top-0 bottom-0 w-1 cursor-col-resize hover:bg-accent/50 transition-colors z-20 ${resizingColumn === col.key ? "bg-accent w-0.5" : ""}`}
                            onMouseDown={(e) =>
                              startResizing(e, col.key, col.width)
                            }
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              autoSizeColumn(col.key);
                            }}
                          />
                        )}
                        
                        {/* Shadow for pinned columns boundary */}
                        {isPinned && 
                         columns.filter(c => c.visible && c.pinned).pop()?.key === col.key && (
                          <div className={`absolute top-0 bottom-0 w-4 pointer-events-none ${isRTL ? "left-0 -translate-x-full bg-gradient-to-r" : "right-0 translate-x-full bg-gradient-to-l"} from-transparent to-black/10`} />
                        )}
                      </div>
                    );
                  })}
                {!reportMode && canWrite && (
                  <div className="w-12 flex-shrink-0 border-b border-border bg-table-bg">
                    <button
                      onClick={handleNewRecord}
                      className="w-full h-full flex items-center justify-center text-textSecondary hover:text-textPrimary hover:bg-skeleton-bg"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="w-fit">
              {loading[type] ? (
                // Skeleton Loading State
                Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex border-b border-border/50 animate-pulse"
                  >
                    <div
                      className="w-10 flex-shrink-0 border-r border-border p-2 flex items-center justify-center sticky bg-table-bg z-[20]"
                      style={{ [isRTL ? "right" : "left"]: 0 }}
                    >
                      <Skeleton className="h-4 w-4 bg-muted/20" />
                    </div>
                    {columns
                      .filter((c) => c.visible)
                      .map((col) => (
                        <div
                          key={col.key}
                          style={{
                            width: col.width,
                            ...(col.pinned && !reportMode
                              ? {
                                  [isRTL ? "right" : "left"]:
                                    pinnedOffsets[col.key],
                                }
                              : {}),
                          }}
                          className={`flex-shrink-0 border-r border-border p-3 bg-table-bg ${col.pinned && !reportMode ? "sticky z-[10]" : ""}`}
                        >
                          <Skeleton className="h-4 w-full bg-muted/20" />
                        </div>
                      ))}
                    <div className="w-12 flex-shrink-0" />
                  </div>
                ))
              ) : filteredData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 w-full min-w-[800px]">
                  {!canRead ? (
                    <>
                      <div className="w-16 h-16 mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
                        <XCircle size={32} className="text-red-500/60" />
                      </div>
                      <h3 className="text-lg font-medium text-textPrimary">
                        {t("dataTable.accessDenied")}
                      </h3>
                      <p className="text-sm text-textSecondary/60 mt-1 max-w-md text-center">
                        {t("dataTable.noReadPermission", { type })}
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 mb-4 rounded-full bg-border/20 flex items-center justify-center">
                        <X size={32} className="text-textSecondary/40" />
                      </div>
                      <h3 className="text-lg font-medium text-textSecondary">
                        {t("dataTable.noRecordYet")}
                      </h3>
                      <p className="text-sm text-textSecondary/60 mt-1">
                        {t("dataTable.tryAdjustingFilters")}
                      </p>
                      {!reportMode && canWrite && (
                        <button
                          onClick={handleNewRecord}
                          className="mt-6 flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-md transition-colors text-sm font-medium"
                        >
                          <Plus size={16} />{" "}
                          {t("dataTable.createYourFirst", { type })}
                        </button>
                      )}
                    </>
                  )}
                </div>
              ) : (
                filteredData.map((item: any) => (
                  <div
                    key={item.id}
                    className={`flex group hover:bg-table-row-hover transition-colors ${isSelected(item.id) ? "bg-table-row-selected" : ""} ${type === "activity" ? "cursor-pointer" : ""}`}
                    onContextMenu={(e) => handleContextMenu(e, item.id)}
                    onClick={() => {
                      if (type === "activity") handleRowClick(item);
                    }}
                  >
                    <div
                      className="w-10 flex-shrink-0 border-r border-border border-b border-border p-2 flex items-center justify-center sticky z-[20] bg-table-bg"
                      style={{ [isRTL ? "right" : "left"]: 0 }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected(item.id)}
                        onChange={() => toggleSelection(item.id, type)}
                        className={`rounded border-gray-600 bg-transparent accent-accent cursor-pointer ${isSelected(item.id) ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    {columns
                      .filter((c) => c.visible)
                      .map((col) => {
                        const isPinned = !!col.pinned && !reportMode;
                        return (
                          <div
                            key={col.key}
                            style={{
                              width: col.width,
                              ...(isPinned
                                ? {
                                    [isRTL ? "right" : "left"]:
                                      pinnedOffsets[col.key],
                                  }
                                : {}),
                            }}
                            className={`flex-shrink-0 border-r border-border border-b border-border text-textPrimary text-sm relative bg-table-bg ${isPinned ? "sticky z-[10]" : ""}`}
                            dir={
                              col.type === "date" ||
                              col.type === "phone" ||
                              [
                                "companyName",
                                "createdBy",
                                "stage",
                                "leadType",
                                "leadSource",
                              ].includes(col.key)
                                ? "auto"
                                : undefined
                            }
                          >
                            <EditableCell
                              item={item}
                              field={col.key}
                              type={col.type}
                              entityType={type}
                              reportMode={reportMode}
                              canWrite={canWrite}
                              canManageConfig={canManageConfig}
                              isEditing={
                                editingCell?.id === item.id &&
                                editingCell?.field === col.key
                              }
                              onEditStart={() => {
                                if (canWrite)
                                  setEditingCell({
                                    id: item.id,
                                    field: col.key,
                                  });
                              }}
                              onEditEnd={() => setEditingCell(null)}
                              onTab={(dir: "next" | "prev") =>
                                moveToNextCell(item.id, col.key, dir)
                              }
                              theme={theme}
                              onSave={(val: any) => {
                                if (type === "person") {
                                  if (
                                    col.key === "companyName" &&
                                    val &&
                                    typeof val === "object" &&
                                    "name" in val
                                  ) {
                                    return updatePerson(item.id, {
                                      companyName: val.name,
                                      companyId: val.id,
                                    });
                                  } else {
                                    return updatePerson(item.id, {
                                      [col.key]: val,
                                    });
                                  }
                                } else if (type === "company")
                                  return updateCompany(item.id, {
                                    [col.key]: val,
                                  });
                                else if (type === "task") {
                                  if (col.key === "assignee") {
                                    return updateTask(item.id, {
                                      assigneeId: val,
                                    });
                                  }
                                  if (
                                    col.key === "relations" &&
                                    typeof val === "object"
                                  ) {
                                    return updateTask(item.id, val);
                                  } else {
                                    return updateTask(item.id, {
                                      [col.key]: val,
                                    });
                                  }
                                } else if (type === "opportunity")
                                  return updateOpportunity(item.id, {
                                    [col.key]: val,
                                  });
                                else if (type === "activity") {
                                  if (
                                    col.key === "relations" &&
                                    typeof val === "object"
                                  ) {
                                    return updateActivity(item.id, val);
                                  } else {
                                    return updateActivity(item.id, {
                                      [col.key]: val,
                                    });
                                  }
                                } else if (type === "note") {
                                  if (
                                    col.key === "relations" &&
                                    typeof val === "object"
                                  ) {
                                    return updateNote(item.id, val);
                                  } else {
                                    return updateNote(item.id, {
                                      [col.key]: val,
                                    });
                                  }
                                }
                              }}
                              companies={companies}
                              people={people}
                              openDrawer={() => handleRowClick(item)}
                              orgUsers={orgUsers}
                              customStages={customStages}
                              customLeadTypes={customLeadTypes}
                              customLeadSources={customLeadSources}
                              customChannels={customChannels}
                              addCustomStage={addCustomStage}
                              addCustomLeadType={addCustomLeadType}
                              addCustomLeadSource={addCustomLeadSource}
                              addCustomChannel={addCustomChannel}
                              updateCustomStage={updateCustomStage}
                              updateCustomLeadType={updateCustomLeadType}
                              updateCustomLeadSource={updateCustomLeadSource}
                              isRTL={isRTL}
                            />
                            {/* Shadow for pinned columns boundary */}
                            {isPinned &&
                              columns.filter((c) => c.visible && c.pinned)
                                .pop()?.key === col.key && (
                                <div
                                  className={`absolute top-0 bottom-0 w-4 pointer-events-none ${isRTL ? "left-0 -translate-x-full bg-gradient-to-r" : "right-0 translate-x-full bg-gradient-to-l"} from-transparent to-black/5`}
                                />
                              )}
                          </div>
                        );
                      })}
                    {!reportMode && (
                      <div className="w-12 flex-shrink-0 border-b border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleRowClick(item)}
                          className="text-textSecondary hover:text-textPrimary p-1 rounded hover:bg-card-hover-light"
                        >
                          <Maximize2 size={12} />
                        </button>
                      </div>
                    )}
                    {reportMode && (
                      <div className="w-4 border-b border-border" />
                    )}
                  </div>
                ))
              )}

              {!reportMode && canWrite && type !== "activity" && (
                <div
                  className={cn(
                    "flex group hover:bg-table-row-hover transition-all cursor-pointer border-b border-border/50 relative",
                    highlighted === "new_record" &&
                      "bg-accent/10 ring-2 ring-inset ring-accent/50 animate-pulse z-[100] bg-table-bg",
                  )}
                  onClick={handleNewRecord}
                >
                  <div
                    className="w-10 flex-shrink-0 border-r border-border border-b border-border p-2 flex items-center justify-center sticky z-[20] bg-table-bg"
                    style={{ [isRTL ? "right" : "left"]: 0 }}
                  >
                    <Plus
                      size={14}
                      className={cn(
                        "text-textSecondary transition-all",
                        highlighted === "new_record"
                          ? "text-accent scale-125"
                          : "opacity-50 group-hover:opacity-100",
                      )}
                    />
                  </div>
                  {columns
                    .filter((c) => c.visible)
                    .map((col, index) => {
                      const isPinned = !!col.pinned && !reportMode;
                      return (
                        <div
                          key={col.key}
                          style={{
                            width: col.width,
                            ...(isPinned
                              ? {
                                  [isRTL ? "right" : "left"]:
                                    pinnedOffsets[col.key],
                                }
                              : {}),
                          }}
                          className={`flex-shrink-0 border-r border-border border-b border-border p-2 flex items-center text-textSecondary bg-table-bg ${isPinned ? "sticky z-[10]" : ""}`}
                        >
                          {index === 0 && (
                            <span
                              className={cn(
                                "transition-all",
                                highlighted === "new_record"
                                  ? "text-accent font-bold"
                                  : "opacity-50 group-hover:opacity-100 text-sm",
                              )}
                            >
                              {t("dataTable.new")}
                            </span>
                          )}
                          {isPinned &&
                            columns.filter((c) => c.visible && c.pinned).pop()
                              ?.key === col.key && (
                              <div
                                className={`absolute top-0 bottom-0 w-4 pointer-events-none ${isRTL ? "left-0 -translate-x-full bg-gradient-to-r" : "right-0 translate-x-full bg-gradient-to-l"} from-transparent to-black/5`}
                              />
                            )}
                        </div>
                      );
                    })}
                  <div className="w-12 flex-shrink-0 border-b border-border"></div>
                </div>
              )}
            </div>

            {/* Table Footer with Calculations */}
            <div className="flex bg-table-bg sticky bottom-0 border-t border-border shadow-lg w-fit z-20 pointer-events-none">
              <div
                className="w-10 flex-shrink-0 border-r border-border p-2 bg-table-bg sticky z-[40] pointer-events-auto"
                style={{ [isRTL ? "right" : "left"]: 0 }}
              ></div>
              {columns
                .filter((c) => c.visible)
                .map((col, index) => {
                  const calcType = columnCalculations[col.key];
                  const result = calcType
                    ? calculateColumn(col.key, calcType)
                    : null;
                  const isHoverable = index > 0;
                  const isPinned = col.pinned && !reportMode;

                  return (
                    <div
                      key={col.key}
                      style={{
                        width: col.width,
                        ...(isPinned
                          ? {
                              [isRTL ? "right" : "left"]:
                                pinnedOffsets[col.key],
                            }
                          : {}),
                      }}
                      className={`flex-shrink-0 p-2 px-3 border-r border-border text-xs text-textSecondary hover:text-textPrimary cursor-pointer flex items-center gap-1 bg-table-bg hover:bg-table-row-hover transition-colors group relative pointer-events-auto ${isPinned ? "sticky z-[30]" : ""}`}
                      onClick={(e) => {
                        const rect = (
                          e.currentTarget as HTMLElement
                        ).getBoundingClientRect();
                        setActiveCalculationMenu({
                          colKey: col.key,
                          x: rect.left,
                          y:
                            rect.bottom - rect.height - 200 > 0
                              ? rect.top - 200
                              : rect.bottom,
                        });
                      }}
                    >
                      {result ? (
                        <span className="font-medium text-textPrimary">
                          {calcType === "countAll" && index === 0
                            ? `Count ${result}`
                            : result}
                        </span>
                      ) : (
                        <div
                          className={`flex items-center gap-1 ${isHoverable ? "opacity-0 group-hover:opacity-100" : "opacity-100"}`}
                        >
                          <span className="opacity-50">
                            {t("dataTable.calculate")}
                          </span>
                        </div>
                      )}
                      <ChevronDown
                        size={10}
                        className={`ml-auto opacity-0 group-hover:opacity-100 ${result ? "text-textPrimary" : ""}`}
                      />
                      {isPinned &&
                        columns.filter((c) => c.visible && c.pinned).pop()
                          ?.key === col.key && (
                          <div
                            className={`absolute top-0 bottom-0 w-4 pointer-events-none ${isRTL ? "left-0 -translate-x-full bg-gradient-to-r" : "right-0 translate-x-full bg-gradient-to-l"} from-transparent to-black/10`}
                          />
                        )}
                    </div>
                  );
                })}
              <div className="w-12 flex-shrink-0 bg-table-bg"></div>
            </div>
          </div>
        </div>

        {/* Pagination Controls */}
        {totalCount > 0 && (
          <div className="border-t border-border bg-table-bg p-2 flex items-center justify-between z-20">
            <div className="flex items-center gap-4">
              <div className="text-xs text-textSecondary px-2">
                {t("dataTable.showing")} {(currentPage - 1) * itemsPerPage + 1}{" "}
                {t("dataTable.to")}{" "}
                {Math.min(currentPage * itemsPerPage, totalCount)}{" "}
                {t("dataTable.of")} {totalCount} {t("dataTable.records")}
              </div>
              <div className="flex items-center gap-2 text-xs text-textSecondary">
                <span>{t("dataTable.rowsPerPage")}</span>
                <select
                  className="bg-input-bg border border-border rounded px-1 py-0.5 text-textPrimary outline-none focus:border-accent"
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                >
                  <option value={15}>15</option>
                  <option value={30}>30</option>
                </select>
              </div>
            </div>
            <Pagination className="w-auto mx-0">
              <PaginationContent
                className={isRTL ? "flex-row-reverse" : "flex-row"}
              >
                {isRTL ? (
                  <>
                    <PaginationItem>
                      <PaginationNext
                        onClick={() =>
                          setCurrentPage((p) => Math.min(totalPages, p + 1))
                        }
                        className={
                          currentPage === totalPages
                            ? "pointer-events-none opacity-50"
                            : ""
                        }
                      >
                        {t("dataTable.nextPage")}
                      </PaginationNext>
                    </PaginationItem>

                    {totalPages > 1 && (
                      <>
                        {currentPage < totalPages - 1 && (
                          <PaginationItem>
                            <PaginationLink
                              onClick={() => setCurrentPage(totalPages)}
                            >
                              {totalPages}
                            </PaginationLink>
                          </PaginationItem>
                        )}
                        {currentPage < totalPages - 2 && (
                          <PaginationItem>
                            <PaginationEllipsis />
                          </PaginationItem>
                        )}

                        {currentPage < totalPages && (
                          <PaginationItem>
                            <PaginationLink
                              onClick={() => setCurrentPage(currentPage + 1)}
                            >
                              {currentPage + 1}
                            </PaginationLink>
                          </PaginationItem>
                        )}

                        <PaginationItem>
                          <PaginationLink isActive>
                            {currentPage}
                          </PaginationLink>
                        </PaginationItem>

                        {currentPage > 1 && (
                          <PaginationItem>
                            <PaginationLink
                              onClick={() => setCurrentPage(currentPage - 1)}
                            >
                              {currentPage - 1}
                            </PaginationLink>
                          </PaginationItem>
                        )}

                        {currentPage > 3 && (
                          <PaginationItem>
                            <PaginationEllipsis />
                          </PaginationItem>
                        )}
                        {currentPage > 2 && (
                          <PaginationItem>
                            <PaginationLink onClick={() => setCurrentPage(1)}>
                              1
                            </PaginationLink>
                          </PaginationItem>
                        )}
                      </>
                    )}

                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() =>
                          setCurrentPage((p) => Math.max(1, p - 1))
                        }
                        className={
                          currentPage === 1
                            ? "pointer-events-none opacity-50"
                            : ""
                        }
                      >
                        {t("dataTable.previousPage")}
                      </PaginationPrevious>
                    </PaginationItem>
                  </>
                ) : (
                  <>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() =>
                          setCurrentPage((p) => Math.max(1, p - 1))
                        }
                        className={
                          currentPage === 1
                            ? "pointer-events-none opacity-50"
                            : ""
                        }
                      >
                        {t("dataTable.previousPage")}
                      </PaginationPrevious>
                    </PaginationItem>

                    {/* Simple Logic for now: Show current, prev, next if possible */}
                    {totalPages > 1 && (
                      <>
                        {currentPage > 2 && (
                          <PaginationItem>
                            <PaginationLink onClick={() => setCurrentPage(1)}>
                              1
                            </PaginationLink>
                          </PaginationItem>
                        )}
                        {currentPage > 3 && (
                          <PaginationItem>
                            <PaginationEllipsis />
                          </PaginationItem>
                        )}

                        {currentPage > 1 && (
                          <PaginationItem>
                            <PaginationLink
                              onClick={() => setCurrentPage(currentPage - 1)}
                            >
                              {currentPage - 1}
                            </PaginationLink>
                          </PaginationItem>
                        )}

                        <PaginationItem>
                          <PaginationLink isActive>
                            {currentPage}
                          </PaginationLink>
                        </PaginationItem>

                        {currentPage < totalPages && (
                          <PaginationItem>
                            <PaginationLink
                              onClick={() => setCurrentPage(currentPage + 1)}
                            >
                              {currentPage + 1}
                            </PaginationLink>
                          </PaginationItem>
                        )}

                        {currentPage < totalPages - 2 && (
                          <PaginationItem>
                            <PaginationEllipsis />
                          </PaginationItem>
                        )}
                        {currentPage < totalPages - 1 && (
                          <PaginationItem>
                            <PaginationLink
                              onClick={() => setCurrentPage(totalPages)}
                            >
                              {totalPages}
                            </PaginationLink>
                          </PaginationItem>
                        )}
                      </>
                    )}

                    <PaginationItem>
                      <PaginationNext
                        onClick={() =>
                          setCurrentPage((p) => Math.min(totalPages, p + 1))
                        }
                        className={
                          currentPage === totalPages
                            ? "pointer-events-none opacity-50"
                            : ""
                        }
                      >
                        {t("dataTable.nextPage")}
                      </PaginationNext>
                    </PaginationItem>
                  </>
                )}
              </PaginationContent>
            </Pagination>
          </div>
        )}

        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={() => setContextMenu(null)}
            onDelete={canWrite ? handleDeleteContext : undefined}
            onEdit={() => openDrawer({ id: contextMenu.id, type })}
            onCopyMessages={
              type === "person" && canExport
                ? () => handleCopyMessages(contextMenu.id)
                : undefined
            }
            onCopyData={
              type === "person" && canExport
                ? () => handleCopyData(contextMenu.id)
                : undefined
            }
            onAutoMsgParser={
              type === "person" && canExport
                ? () => {
                    setParserPersonId(contextMenu.id);
                    setIsAutoMsgParserOpen(true);
                  }
                : undefined
            }
          />
        )}

        {headerContextMenu && <HeaderContextMenu />}

        {activeCalculationMenu && (
          <CalculationMenu
            colKey={activeCalculationMenu.colKey}
            onClose={() => setActiveCalculationMenu(null)}
          />
        )}

        <CopyDataDialog
          isOpen={copyDataDialog.isOpen}
          onClose={() =>
            setCopyDataDialog({ ...copyDataDialog, isOpen: false })
          }
          onCopy={async (scope) => {
            if (copyDataDialog.personId) {
              const text = await exportPersonData(
                copyDataDialog.personId,
                scope,
              );
              if (text) {
                navigator.clipboard.writeText(text);
                toast.success(t("dataTable.dataCopied"));
                setCopyDataDialog({ ...copyDataDialog, isOpen: false });
              }
            }
          }}
        />

        <Dialog
          open={isCreateReportDialogOpen}
          onOpenChange={setIsCreateReportDialogOpen}
        >
          <DialogContent 
            aria-describedby={undefined}
            className="sm:max-w-[425px] bg-table-bg border-border shadow-2xl"
          >
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-textPrimary flex items-center gap-2">
                <FileText className="text-accent" size={20} />
                {t("dataTable.createNewReport")}
              </DialogTitle>
              <DialogDescription className="text-textSecondary text-xs">
                {t("dataTable.reportDescription")}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label
                  htmlFor="name"
                  className="text-textSecondary text-xs uppercase font-semibold"
                >
                  {t("dataTable.reportName")}
                </Label>
                <Input
                  id="name"
                  value={reportNameInput}
                  onChange={(e) => setReportNameInput(e.target.value)}
                  className="bg-table-row-hover border-border text-textPrimary focus:ring-accent h-10"
                  autoFocus
                />
              </div>
              <p className="text-[10px] text-textSecondary italic">
                {t("dataTable.thisWillCreateSnapshot", {
                  count: filteredData.length,
                })}
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateReportDialogOpen(false)}
                className="border-border text-textSecondary hover:text-textPrimary hover:bg-skeleton-bg"
              >
                {t("dataTable.cancel")}
              </Button>
              <Button
                onClick={submitCreateReport}
                className="bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium"
              >
                {t("dataTable.createReportBtn")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={isAutoMsgParserOpen}
          onOpenChange={setIsAutoMsgParserOpen}
        >
          <DialogContent 
            aria-describedby={undefined}
            className="sm:max-w-[600px] bg-card-bg border-border text-textPrimary"
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-accent" />
                {t("autoMsgParser.title")}
              </DialogTitle>
              <DialogDescription className="text-textSecondary text-xs">
                {t("autoMsgParser.description")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-accent/5 border border-accent/20 rounded-md p-3">
                <p className="text-xs text-textSecondary leading-relaxed">
                  <span className="font-bold text-accent mr-1">
                    {t("autoMsgParser.proTip")}
                  </span>
                  {t("autoMsgParser.proTipContent")}
                </p>
              </div>
              <textarea
                dir="auto"
                value={convText}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/🙃\s*👏\s*👍/g, "");
                  setConvText(cleaned);
                }}
                placeholder={t("autoMsgParser.placeholder")}
                className="w-full h-[300px] bg-card-dark border border-border rounded-md p-3 text-sm focus:outline-none focus:border-accent resize-none no-scrollbar placeholder:text-textSecondary/30"
              />
            </div>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setIsAutoMsgParserOpen(false)}
                className="text-textSecondary hover:text-textPrimary hover:bg-skeleton-bg"
                disabled={isParsing}
              >
                {t("autoMsgParser.title")}
              </Button>
              <Button
                onClick={handleParseConversation}
                disabled={isParsing || !convText.trim()}
                className="bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium"
              >
                {isParsing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    {t("autoMsgParser.processing")}
                  </>
                ) : (
                  t("autoMsgParser.process")
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <CsvImportDialog
          isOpen={isImportDialogOpen}
          onClose={() => setIsImportDialogOpen(false)}
          type={type}
        />
      </div>
    </>
  );
};

// ... (EditableCell, StatusBadge, StageBadge components remain same) ...
const EditableCell = ({
  item,
  field,
  type,
  entityType,
  isEditing,
  onEditStart,
  onEditEnd,
  onTab,
  onSave,
  companies: propsCompanies,
  people: propsPeople,
  openDrawer,
  orgUsers,
  customStages,
  customLeadTypes,
  customLeadSources,
  customChannels,
  addCustomStage,
  addCustomLeadType,
  addCustomLeadSource,
  addCustomChannel,
  updateCustomStage,
  deleteCustomStage,
  updateCustomLeadType,
  deleteCustomLeadType,
  updateCustomLeadSource,
  reportMode,
  theme,
  isRTL,
  canWrite,
  canManageConfig,
}: any) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const {
    people,
    companies,
    peoplePagination,
    companiesPagination,
    fetchPeople,
    fetchCompanies,
    loading,
  } = useStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tempValue, setTempValue] = useState(item[field]);
  const [showExpanded, setShowExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isEditing &&
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        if (!isSaving) {
          // For select/input, they might have their own onBlur, but for custom dropdowns we need this
          handleSave(tempValue);
        }
      }
    };

    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (isEditing && event.key === "Escape") {
        event.stopPropagation();
        onEditEnd();
      }
    };

    if (isEditing) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleGlobalKeyDown, true);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleGlobalKeyDown, true);
    };
  }, [isEditing, onEditEnd, isSaving, tempValue]);

  const isReadOnly =
    !canWrite ||
    reportMode ||
    field === "createdAt" ||
    field === "createdBy" ||
    field === "owner" ||
    field === "updatedAt" ||
    (entityType === "activity"
      ? ![
          "direction",
          "content",
          "channel",
          "personLastAction",
          "type",
          "date",
          "relations",
        ].includes(field)
      : field.startsWith("person"));

  // Relation Search State
  const [searchTerm, setSearchTerm] = useState("");
  const [relationTab, setRelationTab] = useState<"person" | "company">(
    "person",
  );

  // Debounced Search for Relations and Company Select
  useEffect(() => {
    if (!isEditing) return;

    if (type === "relation") {
      const timer = setTimeout(() => {
        const params = searchTerm ? { search: searchTerm } : {};
        if (relationTab === "person") fetchPeople(params);
        else fetchCompanies(params);
      }, 300);
      return () => clearTimeout(timer);
    } else if (type === "select" && field === "companyName") {
      const timer = setTimeout(() => {
        const params =
          tempValue && typeof tempValue === "string"
            ? { search: tempValue }
            : {};
        fetchCompanies(params);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [
    searchTerm,
    relationTab,
    isEditing,
    type,
    field,
    tempValue,
    fetchPeople,
    fetchCompanies,
  ]);

  // Custom Stage State
  const [customValue, setCustomValue] = useState("");
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const PRESET_COLORS = [
    { label: "Gray", value: "bg-gray-700 text-gray-200" },
    { label: "Blue", value: "bg-blue-700/70 text-blue-200" },
    { label: "Purple", value: "bg-indigo-700/70 text-indigo-200" },
    { label: "Yellow", value: "bg-yellow-600/70 text-yellow-100" },
    { label: "Green", value: "bg-green-700/70 text-green-200" },
    { label: "Red", value: "bg-red-700/70 text-red-200" },
    { label: "Orange", value: "bg-orange-700/70 text-orange-200" },
    { label: "Cyan", value: "bg-cyan-700/70 text-cyan-200" },
  ];
  const [customColor, setCustomColor] = useState(PRESET_COLORS[0].value);

  // Status/Stage constants
  const TASK_STATUSES: (TaskStatus | "No Status")[] = [
    "No Status",
    "Todo",
    "In Progress",
    "Done",
  ];
  const OPP_STAGES: OpportunityStage[] = [
    "Screening",
    "Meeting",
    "Proposal",
    "Customer",
  ];

  useEffect(() => {
    if (!isEditing) {
      setTempValue(item[field]);
      setError(null);
      setSelectedIndex(-1);
    }
  }, [item, field, isEditing]);

  useEffect(() => {
    if (isEditing) {
      // For long text fields, show expanded view immediately if it's 'lastAction', 'content' or already long
      if (
        field === "lastAction" ||
        field === "personLastAction" ||
        field === "content" ||
        String(item[field] || "").length > 30
      ) {
        setShowExpanded(true);
      }
      // Small delay to ensure render
      setTimeout(() => {
        inputRef.current?.focus();
        textareaRef.current?.focus();
        if (!inputRef.current && !textareaRef.current) {
          containerRef.current?.focus();
        }
      }, 10);
    } else {
      setShowExpanded(false);
      // Reset auxiliary states when editing ends
      setSearchTerm("");
      setIsAddingCustom(false);
      setCustomValue("");
    }
  }, [isEditing, field]);

  const handleSave = async (val: any, next?: () => void) => {
    let processedValue = val;

    // Auto-inject https:// for URL fields if protocol is missing
    const urlFields = ["linkedin", "avatar", "website", "domain"];
    const isUrlField =
      urlFields.includes(field) || field.toLowerCase().endsWith("url");

    if (
      isUrlField &&
      typeof processedValue === "string" &&
      processedValue.trim() !== ""
    ) {
      const trimmed = processedValue.trim();
      if (!/^https?:\/\//i.test(trimmed)) {
        processedValue = `https://${trimmed}`;
        setTempValue(processedValue); // Update UI to reflect the change
      }
    }

    if (processedValue === item[field] && !error) {
      if (next) next();
      else onEditEnd();
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const response = await onSave(processedValue);
      if (response && !response.ok) {
        const data = await response.json();
        // Map frontend field to backend field for error lookup
        const mapping: Record<string, string> = {
          jobTitle: "job_title",
          companyId: "company",
          companyName: "company",
          conversionRate: "conversion_rate",
          lastAction: "last_action",
          recommendedAction: "recommended_action",
          leadType: "lead_type",
          dueDate: "due_date",
          relatedPersonId: "related_person",
          relatedCompanyId: "related_company",
          personConversionRate: "conversion_rate",
          personLastAction: "last_action",
          personLeadType: "lead_type",
          personStage: "stage",
          personEmail: "email",
          personPhone: "phone",
        };

        const backendField = mapping[field] || field;

        const fieldError =
          data[backendField] ||
          data.detail ||
          data.message ||
          t("dataTable.invalidValue");
        setError(
          Array.isArray(fieldError) ? fieldError[0] : String(fieldError),
        );
      } else {
        if (next) next();
        else onEditEnd();
      }
    } catch (e) {
      setError(t("dataTable.connectionError"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (
        (type === "select" || type === "relation") &&
        selectedIndex >= 0 &&
        !showExpanded
      ) {
        // Handle selection from dropdown
        const options =
          type === "select" ? (field === "companyName" ? companies : []) : [];
        // Note: relations have their own search/select logic, usually clicked, but let's support basic select if applicable
        if (type === "select" && options[selectedIndex]) {
          handleSave(options[selectedIndex]);
          return;
        }
      }
      handleSave(tempValue);
    }
    if (e.key === "Escape") onEditEnd();
    if (e.key === "Tab") {
      e.preventDefault();
      handleSave(tempValue, () => onTab?.(e.shiftKey ? "prev" : "next"));
    }
    if (e.key === "ArrowDown" && (type === "select" || type === "relation")) {
      e.preventDefault();
      const options =
        type === "select" ? (field === "companyName" ? companies : []) : [];
      if (options.length > 0) {
        setSelectedIndex((prev) => Math.min(prev + 1, options.length - 1));
      }
    }
    if (e.key === "ArrowUp" && (type === "select" || type === "relation")) {
      e.preventDefault();
      if (selectedIndex > 0) {
        setSelectedIndex((prev) => prev - 1);
      }
    }
  };

  if (type === "date") {
    const dateValue = tempValue ? new Date(tempValue) : undefined;

    if (isEditing && !isReadOnly) {
      return (
        <div
          className="w-full h-full relative"
          onClick={(e) => e.stopPropagation()}
        >
          <Popover open={true} onOpenChange={(open) => !open && onEditEnd()}>
            <PopoverTrigger asChild>
              <div
                className={`w-full h-full px-3 py-2 flex items-center bg-input-bg border-2 cursor-pointer ${error ? "border-red-500" : "border-accent"}`}
                title={error || ""}
              >
                {dateValue ? (
                  format(dateValue, "PPP")
                ) : (
                  <span className="text-textSecondary opacity-30 italic text-xs">
                    {t("dataTable.pickDate")}
                  </span>
                )}
                {isSaving && (
                  <div className="ml-auto animate-spin h-3 w-3 border-2 border-accent border-t-transparent rounded-full" />
                )}
              </div>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto p-0 bg-background shadow-2xl z-[100]"
              align="start"
            >
              <CalendarComponent
                mode="single"
                selected={dateValue}
                onSelect={(date) => {
                  if (date) {
                    const iso = date.toISOString();
                    setTempValue(iso);
                    handleSave(iso);
                  }
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
      );
    }

    return (
      <div
        className={`w-full h-full px-3 py-2 flex items-center ${isReadOnly ? "cursor-default" : "cursor-pointer group"}`}
        onClick={
          isReadOnly
            ? undefined
            : (e) => {
                e.stopPropagation();
                onEditStart();
              }
        }
      >
        {dateValue ? (
          <div className="flex items-center gap-2">
            <Calendar size={12} className="text-textSecondary" />
            <span>{format(dateValue, "MMM d, yyyy")}</span>
          </div>
        ) : (
          <span className="text-textSecondary opacity-30 italic text-xs">
            {t("dataTable.empty")}
          </span>
        )}
      </div>
    );
  }

  if (type === "status") {
    if (isEditing && !isReadOnly) {
      return (
        <div
          className="w-full h-full relative outline-none"
          ref={containerRef}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setSelectedIndex((prev) =>
                Math.min(prev + 1, TASK_STATUSES.length - 1),
              );
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setSelectedIndex((prev) => Math.max(prev - 1, 0));
            } else if (e.key === "Enter" && selectedIndex >= 0) {
              e.preventDefault();
              const s = TASK_STATUSES[selectedIndex];
              handleSave(s === "No Status" ? undefined : s);
            } else {
              handleKeyDown(e);
            }
          }}
        >
          <div
            className={`absolute top-0 w-[200px] bg-dropdown-bg border shadow-2xl rounded-md z-50 overflow-hidden animate-in zoom-in-95 ${error ? "border-red-500" : "border-border"} ${isRTL ? "right-0" : "left-0"}`}
            title={error || ""}
          >
            {TASK_STATUSES.map((s, idx) => (
              <div
                key={s}
                className={`px-3 py-1.5 hover:bg-skeleton-bg cursor-pointer flex items-center justify-between group ${selectedIndex === idx ? "bg-skeleton-bg" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSave(s === "No Status" ? undefined : s);
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <StatusBadge
                  status={s === "No Status" ? undefined : s}
                  theme={theme}
                />
                {tempValue === s && !isSaving && (
                  <Check size={12} className="text-accent" />
                )}
                {isSaving && tempValue === s && (
                  <div className="animate-spin h-3 w-3 border-2 border-accent border-t-transparent rounded-full" />
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }
    return (
      <div
        className={`w-full h-full px-3 py-2 flex items-center ${isReadOnly ? "cursor-default" : "cursor-pointer"}`}
        onClick={
          isReadOnly
            ? undefined
            : (e) => {
                e.stopPropagation();
                onEditStart();
              }
        }
      >
        <StatusBadge status={item[field]} theme={theme} />
      </div>
    );
  }

  if (type === "stage") {
    const stages =
      field === "leadType" || field === "personLeadType"
        ? customLeadTypes
        : field === "leadSource" || field === "personLeadSource"
          ? customLeadSources
          : (field === "stage" || field === "personStage") &&
              (entityType === "person" || entityType === "activity")
            ? customStages
            : field === "direction"
              ? ["received", "sent"]
              : field === "channel"
                ? customChannels
                : field === "type"
                  ? ["email", "call", "meeting", "msg", "update"]
                  : OPP_STAGES;

    if (isEditing && !isReadOnly) {
      return (
        <div
          className="w-full h-full relative outline-none"
          onClick={(e) => e.stopPropagation()}
          ref={containerRef}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setSelectedIndex((prev) => Math.min(prev + 1, stages.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setSelectedIndex((prev) => Math.max(prev - 1, 0));
            } else if (e.key === "Enter" && selectedIndex >= 0) {
              e.preventDefault();
              const s = stages[selectedIndex];
              const label = typeof s === "string" ? s : s.label;
              handleSave(label);
            } else {
              handleKeyDown(e);
            }
          }}
        >
          <div
            className={`absolute top-0 w-[200px] bg-dropdown-bg border shadow-2xl rounded-md z-50 overflow-hidden animate-in zoom-in-95 ${error ? "border-red-500" : "border-border"} ${isRTL ? "right-0" : "left-0"}`}
            title={error || ""}
          >
            <div className="max-h-[250px] overflow-y-auto py-1">
              {(stages as any[]).map((s: any, idx) => {
                const label = typeof s === "string" ? s : s.label;
                const option =
                  typeof s === "string"
                    ? { label: s, color: "bg-skeleton-bg text-textSecondary" }
                    : s;

                return (
                  <div
                    key={label}
                    className={`px-3 py-1.5 hover:bg-skeleton-bg cursor-pointer flex items-center justify-between group relative ${selectedIndex === idx ? "bg-skeleton-bg" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSave(label);
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <StageBadge
                      stage={label}
                      field={field}
                      customStages={customStages}
                      customLeadTypes={customLeadTypes}
                      customLeadSources={customLeadSources}
                      theme={theme}
                    />

                    <div className="flex items-center gap-1">
                      {item[field] === label && !isSaving && (
                        <Check size={12} className="text-accent" />
                      )}
                      {isSaving && tempValue === label && (
                        <div className="animate-spin h-3 w-3 border-2 border-accent border-t-transparent rounded-full" />
                      )}

                      {canManageConfig && (
                        <Popover>
                          <PopoverTrigger
                            asChild
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              tabIndex={-1}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-card-hover-light rounded text-textSecondary transition-opacity"
                            >
                              <MoreIcon size={12} />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-60 p-0 bg-dropdown-bg border-border z-[60]"
                            side="right"
                            align="start"
                          >
                            <div className="p-2">
                              <div className="flex items-center gap-1 bg-input-bg border border-border rounded px-2 py-1">
                                <Input
                                  defaultValue={label}
                                  className="h-6 w-full p-0 border-none bg-transparent text-xs focus-visible:ring-0"
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      const val = e.currentTarget.value;
                                      if (val && val !== label) {
                                        const newOpt = { ...option, label: val };
                                        if (
                                          field === "leadType" ||
                                          field === "personLeadType"
                                        )
                                          updateCustomLeadType(label, newOpt);
                                        else if (
                                          field === "leadSource" ||
                                          field === "personLeadSource"
                                        )
                                          updateCustomLeadSource(label, newOpt);
                                        else if (
                                          field === "stage" ||
                                          field === "personStage"
                                        )
                                          updateCustomStage(label, newOpt);
                                      }
                                    }
                                  }}
                                />
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {field !== "direction" && (
              <div className="border-t border-border mt-1 p-2">
                {isAddingCustom ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-1">
                      <input
                        autoFocus
                        className="bg-input-bg border border-border rounded px-2 py-1 text-xs text-textPrimary outline-none flex-1"
                        placeholder={t("dataTable.addCustom") + "..."}
                        value={customValue}
                        onChange={(e) => setCustomValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && customValue) {
                            const newOption = {
                              label: customValue,
                              color: customColor,
                            };
                            if (
                              field === "leadType" ||
                              field === "personLeadType"
                            )
                              addCustomLeadType(newOption);
                            else if (
                              field === "leadSource" ||
                              field === "personLeadSource"
                            )
                              addCustomLeadSource(newOption);
                            else if (
                              field === "stage" ||
                              field === "personStage"
                            )
                              addCustomStage(newOption);
                            else if (field === "channel")
                              addCustomChannel(customValue); // Channel still string for now
                            handleSave(customValue);
                          }
                        }}
                      />
                      <button
                        onClick={() => setIsAddingCustom(false)}
                        className="p-1 hover:bg-skeleton-bg rounded text-textSecondary"
                      >
                        <X size={12} />
                      </button>
                    </div>
                    {(field === "leadType" ||
                      field === "personLeadType" ||
                      field === "leadSource" ||
                      field === "personLeadSource" ||
                      field === "stage" ||
                      field === "personStage") && (
                      <div className="flex gap-2 flex-wrap">
                        {PRESET_COLORS.map((c) => (
                          <div
                            key={c.value}
                            className={`w-6 h-6 rounded-full cursor-pointer ${c.value} transition-all hover:scale-110 ${customColor === c.value ? "ring-1 ring-green/50 scale-110" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setCustomColor(c.value);
                            }}
                            title={c.label}
                          />
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => {
                        if (customValue) {
                          const newOption = {
                            label: customValue,
                            color: customColor,
                          };
                          if (
                            field === "leadType" ||
                            field === "personLeadType"
                          )
                            addCustomLeadType(newOption);
                          else if (
                            field === "leadSource" ||
                            field === "personLeadSource"
                          )
                            addCustomLeadSource(newOption);
                          else if (field === "stage" || field === "personStage")
                            addCustomStage(newOption);
                          else if (field === "channel")
                            addCustomChannel(customValue);
                          handleSave(customValue);
                        }
                      }}
                      className="w-full py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded"
                    >
                      {t("dataTable.create")} "
                      {customValue || t("dataTable.new")}"
                    </button>
                  </div>
                ) : canManageConfig ? (
                  <button
                    onClick={() => setIsAddingCustom(true)}
                    className="w-full flex items-center gap-1.5 px-2 py-1 text-xs text-textSecondary hover:text-textPrimary hover:bg-skeleton-bg rounded transition-colors"
                  >
                    <Plus size={12} /> {t("dataTable.addCustom")}
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </div>
      );
    }
    return (
      <div
        className={`w-full h-full px-3 py-2 flex items-center ${isReadOnly ? "cursor-default" : "cursor-text"}`}
        onClick={
          isReadOnly
            ? undefined
            : (e) => {
                e.stopPropagation();
                onEditStart();
              }
        }
      >
        <StageBadge
          stage={item[field]}
          field={field}
          customStages={customStages}
          customLeadTypes={customLeadTypes}
          customLeadSources={customLeadSources}
          theme={theme}
        />
      </div>
    );
  }

  if (type === "assignee") {
    if (isEditing && !isReadOnly) {
      return (
        <div
          className="w-full h-full relative outline-none"
          ref={containerRef}
          tabIndex={0}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setSelectedIndex((prev) =>
                Math.min(prev + 1, orgUsers.length - 1),
              );
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setSelectedIndex((prev) => Math.max(prev - 1, 0));
            } else if (e.key === "Enter" && selectedIndex >= 0) {
              e.preventDefault();
              const u = orgUsers[selectedIndex];
              handleSave(u.id);
            } else {
              handleKeyDown(e);
            }
          }}
        >
          <div
            className={`absolute top-0 w-[200px] bg-dropdown-bg border shadow-2xl rounded-md z-50 overflow-hidden animate-in zoom-in-95 ${error ? "border-red-500" : "border-border"} ${isRTL ? "right-0" : "left-0"}`}
            title={error || ""}
          >
            <div className="max-h-[250px] overflow-y-auto py-1 custom-scrollbar">
              {orgUsers.map((u: any, idx: number) => (
                <div
                  key={u.id}
                  className={`px-3 py-1.5 hover:bg-skeleton-bg cursor-pointer flex items-center justify-between group ${selectedIndex === idx ? "bg-skeleton-bg" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSave(u.id);
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center text-[10px] text-accent font-bold">
                      {u.full_name?.charAt(0) || u.username?.charAt(0) || "?"}
                    </div>
                    <span className="text-xs text-textPrimary">
                      {u.full_name || u.username}
                    </span>
                  </div>
                  {item.assigneeId === String(u.id) && !isSaving && (
                    <Check size={12} className="text-accent" />
                  )}
                  {isSaving && tempValue === u.id && (
                    <div className="animate-spin h-3 w-3 border-2 border-accent border-t-transparent rounded-full" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
    return (
      <div
        className={`w-full h-full px-3 py-2 flex items-center ${isReadOnly ? "cursor-default" : "cursor-pointer group"}`}
        onClick={
          isReadOnly
            ? undefined
            : (e) => {
                e.stopPropagation();
                onEditStart();
              }
        }
      >
        {item[field] ? (
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center text-[10px] text-accent font-bold">
              {String(item[field]).charAt(0).toUpperCase()}
            </div>
            <span className="truncate">{item[field]}</span>
          </div>
        ) : (
          <span className="text-textSecondary opacity-30 italic text-xs">
            {t("dataTable.unassigned")}
          </span>
        )}
      </div>
    );
  }

  if (type === "relation") {
    if (isEditing) {
      const filteredItems = relationTab === "person" ? people : companies;
      const pagination =
        relationTab === "person" ? peoplePagination : companiesPagination;
      const isFetchingInitial =
        relationTab === "person" ? loading.person : loading.company;

      const currentPersonId = item.relatedPersonId;
      const currentCompanyId = item.relatedCompanyId;

      const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        if (
          target.scrollHeight - target.scrollTop <=
          target.clientHeight + 50
        ) {
          if (pagination.next && !isFetchingInitial) {
            if (relationTab === "person") fetchPeople(pagination.next, true);
            else fetchCompanies(pagination.next, true);
          }
        }
      };

      return (
        <div
          className="w-full h-full relative"
          onClick={(e) => e.stopPropagation()}
          ref={containerRef}
        >
          <div
            className={`flex items-center gap-1 w-full h-full px-2 cursor-pointer bg-input-bg border ${error ? "border-red-500" : "border-accent"}`}
            title={error || ""}
          >
            {currentPersonId || currentCompanyId ? (
              (() => {
                const selected = currentPersonId
                  ? people.find((p: Person) => p.id === currentPersonId)
                  : companies.find((c: Company) => c.id === currentCompanyId);

                const displayName =
                  selected?.name ||
                  (item as any).personName ||
                  (item as any).companyName;

                return displayName ? (
                  <div className="flex items-center gap-1 text-xs bg-skeleton-bg px-1.5 py-0.5 rounded">
                    <div
                      className={`w-3 h-3 rounded-full flex items-center justify-center text-[6px] text-white font-bold ${currentPersonId ? "bg-orange-500" : "bg-red-500"}`}
                    >
                      {displayName.charAt(0).toUpperCase() || "?"}
                    </div>
                    <span className="truncate max-w-[100px]">
                      {displayName}
                    </span>
                  </div>
                ) : (
                  <span className="text-textSecondary text-xs">
                    {t("dataTable.unknown")}
                  </span>
                );
              })()
            ) : (
              <span className="text-textSecondary text-xs">
                {t("dataTable.empty")}
              </span>
            )}
            {isSaving && (
              <div className="ml-auto animate-spin h-3 w-3 border-2 border-accent border-t-transparent rounded-full" />
            )}
          </div>

          {/* Dropdown */}
          <div
            className={`absolute top-full w-[280px] bg-dropdown-bg border border-border shadow-2xl rounded-md z-50 overflow-hidden animate-in fade-in zoom-in-95 mt-1 flex flex-col max-h-[350px] ${isRTL ? "right-0" : "left-0"}`}
          >
            {/* Tab Switcher */}
            <div className="flex border-b border-border bg-input-bg">
              <button
                onClick={() => setRelationTab("person")}
                className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${relationTab === "person" ? "text-accent border-b-2 border-accent" : "text-textSecondary hover:text-textPrimary"}`}
              >
                {t("dataTable.people")}
              </button>
              <button
                onClick={() => setRelationTab("company")}
                className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${relationTab === "company" ? "text-accent border-b-2 border-accent" : "text-textSecondary hover:text-textPrimary"}`}
              >
                {t("dataTable.companies")}
              </button>
            </div>

            <div className="p-2 border-b border-border">
              <input
                autoFocus
                className="w-full bg-input-bg border border-border rounded px-2 py-1.5 text-xs text-textPrimary outline-none focus:border-accent"
                placeholder={
                  relationTab === "person"
                    ? t("dataTable.searchPeople")
                    : t("dataTable.searchCompanies")
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") onEditEnd();
                  if (e.key === "Tab") {
                    e.preventDefault();
                    onTab?.(e.shiftKey ? "prev" : "next");
                  }
                }}
              />
            </div>

            <div
              className="overflow-y-auto flex-1 p-1 max-h-[200px] custom-scrollbar"
              onScroll={handleScroll}
            >
              {filteredItems.map((relItem: any) => {
                const isSelected =
                  relationTab === "person"
                    ? relItem.id === currentPersonId
                    : relItem.id === currentCompanyId;

                return (
                  <div
                    key={relItem.id}
                    className="flex items-center gap-2 px-2 py-2 hover:bg-skeleton-bg rounded cursor-pointer group transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (relationTab === "person") {
                        handleSave({
                          relatedPersonId: isSelected ? null : relItem.id,
                          relatedCompanyId: null,
                        });
                      } else {
                        handleSave({
                          relatedPersonId: null,
                          relatedCompanyId: isSelected ? null : relItem.id,
                        });
                      }
                    }}
                  >
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSelected ? "bg-accent border-accent" : "border-textSecondary group-hover:border-textPrimary"}`}
                    >
                      {isSelected && <Check size={10} className="text-white" />}
                    </div>
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold overflow-hidden shrink-0 ${relationTab === "person" ? "bg-skeleton-bg" : "bg-red-500/20 text-red-500"}`}
                    >
                      {relationTab === "person" && relItem.avatar ? (
                        <img
                          src={relItem.avatar}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        relItem.name?.charAt(0) || "?"
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm text-textPrimary truncate">
                        {relItem.name}
                      </span>
                      <span className="text-[10px] text-textSecondary">
                        {relationTab === "person"
                          ? t("dataTable.person")
                          : t("dataTable.company")}
                      </span>
                    </div>
                  </div>
                );
              })}
              {isFetchingInitial && filteredItems.length === 0 && (
                <div className="space-y-2 p-2">
                  <Skeleton className="h-10 w-full bg-skeleton-bg" />
                  <Skeleton className="h-10 w-full bg-skeleton-bg" />
                  <Skeleton className="h-10 w-full bg-skeleton-bg" />
                </div>
              )}
              {isFetchingInitial && filteredItems.length > 0 && (
                <div className="p-2 flex justify-center">
                  <div className="animate-spin h-4 w-4 border-2 border-accent border-t-transparent rounded-full" />
                </div>
              )}
              {!isFetchingInitial && filteredItems.length === 0 && (
                <div className="p-4 text-textSecondary text-xs text-center italic">
                  {t("dataTable.noFound", {
                    type:
                      relationTab === "person"
                        ? t("dataTable.people").toLowerCase()
                        : t("dataTable.companies").toLowerCase(),
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }
  }

  if (type === "relation" && !isEditing) {
    const currentPersonId = (item as any).relatedPersonId;
    const currentCompanyId = (item as any).relatedCompanyId;

    const selected = currentPersonId
      ? people.find((p: Person) => p.id === currentPersonId)
      : currentCompanyId
        ? companies.find((c: Company) => c.id === currentCompanyId)
        : null;

    const displayName =
      selected?.name || (item as any).personName || (item as any).companyName;

    return (
      <div
        className="w-full h-full px-3 py-2 flex items-center cursor-pointer group"
        onClick={(e) => {
          e.stopPropagation();
          onEditStart();
        }}
      >
        {displayName ? (
          <div className="flex items-center gap-1.5 truncate">
            <div
              className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0 ${currentPersonId ? "bg-orange-500" : "bg-red-500"}`}
            >
              {displayName.charAt(0).toUpperCase() || "?"}
            </div>
            <span className="truncate">{displayName}</span>
          </div>
        ) : (
          <span className="text-textSecondary opacity-30 italic text-xs">
            {t("dataTable.empty")}
          </span>
        )}
      </div>
    );
  }

  if (type === "select") {
    if (isEditing) {
      const options = field === "companyName" ? companies : [];
      const isFetching = field === "companyName" ? loading.company : false;
      const pagination =
        field === "companyName" ? companiesPagination : { next: null };

      const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        if (
          target.scrollHeight - target.scrollTop <=
          target.clientHeight + 50
        ) {
          if (pagination.next && !isFetching) {
            if (field === "companyName") fetchCompanies(pagination.next, true);
          }
        }
      };

      return (
        <div className="w-full h-full relative" ref={containerRef}>
          <input
            ref={inputRef}
            className={`w-full h-full bg-input-bg text-textPrimary px-3 outline-none border-2 ${error ? "border-red-500" : "border-accent"}`}
            value={tempValue || ""}
            onChange={(e) => setTempValue(e.target.value)}
            onKeyDown={handleKeyDown}
            title={error || ""}
            placeholder={t("dataTable.searchCompany")}
          />
          {isSaving && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 animate-spin h-3 w-3 border-2 border-accent border-t-transparent rounded-full" />
          )}
          {/* Dropdown */}
          <div
            className={`absolute top-full min-w-[220px] bg-dropdown-bg border border-border shadow-2xl rounded-md z-50 overflow-hidden animate-in fade-in zoom-in-95 max-h-[250px] overflow-y-auto mt-1 custom-scrollbar ${isRTL ? "right-0" : "left-0"}`}
            onScroll={handleScroll}
          >
            {options.map((opt: any, idx: number) => (
              <div
                key={opt.id}
                className={`px-3 py-2 hover:bg-skeleton-bg cursor-pointer flex items-center gap-2 group border-b border-border/10 last:border-0 ${selectedIndex === idx ? "bg-skeleton-bg" : ""}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSave(opt);
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <div className="w-5 h-5 rounded bg-blue-500/20 text-blue-500 flex items-center justify-center text-[10px] font-bold">
                  {opt.name.substring(0, 1)}
                </div>
                <span className="text-sm text-textPrimary">{opt.name}</span>
              </div>
            ))}
            {isFetching && options.length === 0 && (
              <div className="p-4 space-y-2">
                <div className="h-4 bg-skeleton-bg animate-pulse rounded w-3/4" />
                <div className="h-4 bg-skeleton-bg animate-pulse rounded w-1/2" />
              </div>
            )}
            {isFetching && options.length > 0 && (
              <div className="p-2 flex justify-center">
                <div className="animate-spin h-4 w-4 border-2 border-accent border-t-transparent rounded-full" />
              </div>
            )}
            {options.length === 0 && !isFetching && (
              <div className="px-3 py-2 text-textSecondary text-xs italic">
                {t("dataTable.noMatchingCompanies")}
              </div>
            )}
          </div>
        </div>
      );
    }
  }

  if (isEditing) {
    if (showExpanded) {
      return (
        <div
          className="w-full h-full relative"
          onClick={(e) => e.stopPropagation()}
          ref={containerRef}
        >
          <div
            className={`absolute top-0 w-[300px] min-h-[120px] bg-dropdown-bg border shadow-2xl rounded-md z-50 p-2 animate-in zoom-in-95 ${error ? "border-red-500" : "border-border"} ${isRTL ? "right-0" : "left-0"}`}
            title={error || ""}
          >
            <textarea
              ref={textareaRef}
              dir="auto"
              className="w-full min-h-[100px] bg-transparent text-textPrimary text-sm outline-none resize-none border-0"
              value={tempValue || ""}
              onChange={(e) => setTempValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  handleSave(tempValue);
                }
                if (e.key === "Escape") onEditEnd();
                if (e.key === "Tab") {
                  e.preventDefault();
                  handleSave(tempValue, () =>
                    onTab?.(e.shiftKey ? "prev" : "next"),
                  );
                }
              }}
              disabled={isSaving}
            />
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50 text-[10px] text-textSecondary">
              <span>{t("dataTable.pressCmdEnterToSave")}</span>
              <div className="flex items-center gap-2">
                {isSaving && (
                  <div className="animate-spin h-3 w-3 border-2 border-accent border-t-transparent rounded-full" />
                )}
                <button
                  onClick={() => {
                    handleSave(tempValue);
                  }}
                  className="px-2 py-1 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors disabled:opacity-50"
                  disabled={isSaving}
                >
                  {t("dataTable.save")}
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="w-full h-full relative" ref={containerRef}>
        <input
          ref={inputRef}
          dir="auto"
          className={`w-full h-full bg-input-bg text-textPrimary px-3 outline-none border-2 ${error ? "border-red-500" : "border-accent"}`}
          value={tempValue || ""}
          onChange={(e) => setTempValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSaving}
          title={error || ""}
        />
        {isSaving && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 animate-spin h-3 w-3 border-2 border-accent border-t-transparent rounded-full" />
        )}
      </div>
    );
  }

  if (type === "action" && field === "crmLink") {
    return (
      <div className="w-full h-full px-3 py-2 flex items-center justify-center">
        <button
          onClick={(e) => {
            e.stopPropagation();
            const url = `${window.location.origin}/#/people/${item.id}`;
            window.open(url, "_blank");
          }}
          className="flex items-center gap-1.5 px-3 py-1 bg-accent/10 hover:bg-accent/20 text-accent rounded-md text-[10px] font-bold transition-all border border-accent/20 whitespace-nowrap"
        >
          <ExternalLink size={12} />
          OPEN CRM
        </button>
      </div>
    );
  }

  return (
    <div
      className={`w-full h-full px-3 py-2 flex items-center relative group/cell ${isReadOnly ? "cursor-default" : "cursor-text"}`}
      onClick={
        isReadOnly
          ? undefined
          : (e) => {
              e.stopPropagation();
              onEditStart();
            }
      }
    >
      {field === "createdBy" || field === "assignee" || field === "owner" ? (
        item[field] ? (
          <div className="flex items-center gap-1.5 min-w-0">
            {(() => {
              const displayName = field === "owner" && entityType === "company"
                ? (() => {
                    const ownerUser = orgUsers.find(u => u.email === item[field]);
                    return ownerUser ? `${ownerUser.first_name} ${ownerUser.last_name}` : item[field];
                  })()
                : item[field];
              return (
                <>
                  <div className="w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center text-[8px] font-bold text-black shrink-0">
                    {String(displayName || "?").charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate">{displayName}</span>
                </>
              );
            })()}
          </div>
        ) : (
          <span className="text-textSecondary opacity-30">Empty</span>
        )
      ) : field === "conversionRate" || field === "personConversionRate" ? (
        <div className="flex items-center gap-2">
          <ConversionCircle percentage={Number(item[field]) || 0} />
          <span className="font-medium">{item[field] || 0}%</span>
        </div>
      ) : field === "icp" ? (
        <div className="flex items-center justify-center w-full">
          {item[field] === true ? (
            <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center text-green-500">
              <Check size={14} strokeWidth={3} />
            </div>
          ) : item[field] === false ? (
            <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center text-red-500">
              <X size={14} strokeWidth={3} />
            </div>
          ) : (
            <span className="text-textSecondary opacity-30 italic text-xs">
              Null
            </span>
          )}
        </div>
      ) : (
        <div
          className="truncate flex-1 flex items-center gap-2"
          dir={
            type === "text" &&
            String(item[field]).match(/[\u0600-\u06FF]/) === null
              ? "auto"
              : undefined
          }
        >
          {type === "phone" && item[field] && (
            <div className="text-textSecondary">
              <Phone size={12} />
            </div>
          )}
          {item[field] ? (
            type === "text" ? (
              <LinkifiedText
                text={String(item[field])}
                preserveNewlines={false}
              />
            ) : (
              item[field]
            )
          ) : (
            <span className="text-textSecondary opacity-30">Empty</span>
          )}
        </div>
      )}

      {/* Quick Action Buttons - Floating Overlay */}
      {!reportMode && item[field] && (
        <div
          className={`hidden group-hover/cell:flex items-center gap-1 absolute top-1/2 -translate-y-1/2 bg-card-bg shadow-xl border border-border/50 rounded-md p-1 z-10 animate-in fade-in zoom-in-95 duration-100 ${isRTL ? "left-2" : "right-2"}`}
        >
          {(field === "phone" || field === "personPhone") && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const num = String(item[field]).replace(/[^0-9]/g, "");
                const formattedNum = num.startsWith("+") ? num : `+${num}`;
                window.open(`https://wa.me/${formattedNum}`, "_blank");
              }}
              className="p-1 hover:bg-card-hover-light rounded text-green-500 transition-colors"
              title="Open WhatsApp"
            >
              <ExternalLink size={12} />
            </button>
          )}
          {type === "text" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                openDrawer();
              }}
              className="p-1 hover:bg-card-hover-light rounded text-textSecondary transition-colors"
              title="Expand"
            >
              <Maximize2 size={12} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const StatusBadge = ({
  status,
  theme,
}: {
  status?: TaskStatus | "No Status";
  theme?: string;
}) => {
  if (!status || status === "No Status")
    return (
      <span className="px-2 py-0.5 rounded text-xs border border-dashed border-textSecondary text-textSecondary">
        No Status
      </span>
    );

  // Utility function to convert dark mode colors to light mode
  const convertColorForTheme = (colorClass: string): string => {
    if (theme === "light") {
      const colorMappings: Record<string, string> = {
        "bg-blue-900/40 text-blue-400": "bg-blue-100 text-blue-800",
        "bg-purple-900/40 text-purple-400": "bg-purple-100 text-purple-800",
        "bg-green-900/40 text-green-400": "bg-green-100 text-green-800",
      };
      return colorMappings[colorClass] || colorClass;
    }
    return colorClass;
  };

  const colors = {
    Todo: "bg-blue-900/40 text-blue-400",
    "In Progress": "bg-purple-900/40 text-purple-400",
    Done: "bg-green-900/40 text-green-400",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-medium ${convertColorForTheme(colors[status] || "bg-skeleton-bg")}`}
    >
      {status}
    </span>
  );
};

const StageBadge = ({
  stage,
  field,
  customStages = [],
  customLeadTypes = [],
  customLeadSources = [],
  theme,
}: {
  stage: any;
  field?: string;
  customStages?: FieldOption[];
  customLeadTypes?: FieldOption[];
  customLeadSources?: FieldOption[];
  theme?: string;
}) => {
  if (!stage)
    return (
      <span className="text-textSecondary opacity-30 italic text-xs">
        Empty
      </span>
    );

  // Utility function to convert dark mode colors to light mode
  const convertColorForTheme = (colorClass: string): string => {
    if (theme === "light") {
      // Define mappings from dark to light colors
      const colorMappings: Record<string, string> = {
        "bg-green-900/40 text-green-400": "bg-green-100 text-green-800",
        "bg-blue-900/40 text-blue-400": "bg-blue-100 text-blue-800",
        "bg-gray-800 text-gray-400": "bg-gray-200 text-gray-700",
        "bg-indigo-900/40 text-indigo-400": "bg-indigo-100 text-indigo-800",
        "bg-purple-900/40 text-purple-400": "bg-purple-100 text-purple-800",
        "bg-cyan-900/40 text-cyan-400": "bg-cyan-100 text-cyan-800",
        "bg-orange-900/40 text-orange-400": "bg-orange-100 text-orange-800",
        "bg-red-900/40 text-red-500": "bg-red-100 text-red-800",
        "bg-yellow-900/40 text-yellow-400": "bg-yellow-100 text-yellow-800",
        "bg-pink-900/40 text-pink-400": "bg-pink-100 text-pink-800",
        "bg-gray-700 text-gray-200": "bg-gray-200 text-gray-800",
        "bg-amber-700/70 text-amber-200": "bg-amber-200 text-amber-800",
        "bg-orange-700/70 text-orange-200": "bg-orange-200 text-orange-800",
        "bg-yellow-600/70 text-yellow-100": "bg-yellow-200 text-yellow-900",
        "bg-green-700/70 text-green-200": "bg-green-200 text-green-800",
        "bg-blue-700/70 text-blue-200": "bg-blue-200 text-blue-800",
        "bg-indigo-700/70 text-indigo-200": "bg-indigo-200 text-indigo-800",
        "bg-pink-700/70 text-pink-200": "bg-pink-200 text-pink-800",
        "bg-red-700/70 text-red-200": "bg-red-200 text-red-800",
      };

      // Check for exact match first
      if (colorMappings[colorClass]) {
        return colorMappings[colorClass];
      }

      // For custom colors from DB, try to convert common patterns
      // Convert bg-color-900/40 to bg-color-100 and text-color-400 to text-color-800
      let converted = colorClass;
      converted = converted.replace(/bg-(\w+)-900\/40/g, "bg-$1-100");
      converted = converted.replace(/text-(\w+)-400/g, "text-$1-800");
      converted = converted.replace(/text-(\w+)-500/g, "text-$1-800");
      converted = converted.replace(/bg-(\w+)-800/g, "bg-$1-200");
      converted = converted.replace(/text-(\w+)-400/g, "text-$1-700");
      converted = converted.replace(/bg-(\w+)-700\/70/g, "bg-$1-200");
      converted = converted.replace(/text-(\w+)-200/g, "text-$1-800");
      converted = converted.replace(/text-(\w+)-100/g, "text-$1-900");

      // If no conversion applied, return original (assuming it's already light mode compatible)
      return converted || colorClass;
    }
    return colorClass;
  };

  // Activity Direction
  if (field === "direction") {
    const directionColors: any = {
      received: "bg-green-900/40 text-green-400",
      sent: "bg-blue-900/40 text-blue-400",
      system: "bg-gray-800 text-gray-400",
    };
    const labels: any = {
      received: "Received",
      sent: "Sent",
      system: "System",
    };
    return (
      <span
        className={`px-2 py-0.5 rounded text-xs font-medium ${convertColorForTheme(directionColors[stage] || "bg-skeleton-bg text-textSecondary")}`}
      >
        {labels[stage] || stage}
      </span>
    );
  }

  // Activity Channel
  if (field === "channel") {
    const channelColors: any = {
      email: "bg-blue-900/40 text-blue-400",
      linkedin: "bg-indigo-900/40 text-indigo-400",
      whatsapp: "bg-green-900/40 text-green-400",
      system: "bg-gray-800 text-gray-400",
    };
    return (
      <span
        className={`px-2 py-0.5 rounded text-xs font-medium ${convertColorForTheme(channelColors[stage] || "bg-skeleton-bg text-textSecondary")}`}
      >
        {stage}
      </span>
    );
  }

  // Activity Type
  if (field === "type") {
    const typeColors: any = {
      email: "bg-blue-900/40 text-blue-400",
      call: "bg-green-900/40 text-green-400",
      meeting: "bg-purple-900/40 text-purple-400",
      msg: "bg-indigo-900/40 text-indigo-400",
      update: "bg-cyan-900/40 text-cyan-400",
    };
    const labels: any = {
      msg: "Message",
    };
    return (
      <span
        className={`px-2 py-0.5 rounded text-xs font-medium ${convertColorForTheme(typeColors[stage] || "bg-skeleton-bg text-textSecondary")}`}
      >
        {labels[stage] || stage}
      </span>
    );
  }

  // Lead Source
  if (field === "leadSource" || field === "personLeadSource") {
    const custom = customLeadSources.find((s: any) => (s.label || s) === stage);
    const fallbackColors: any = {
      Inbound: "bg-green-900/40 text-green-400",
      Outbound: "bg-purple-900/40 text-purple-400",
    };

    const colorClass =
      custom?.color ||
      fallbackColors[stage] ||
      "bg-skeleton-bg text-textSecondary";
    return (
      <span
        className={`px-2 py-0.5 rounded text-xs font-medium ${convertColorForTheme(colorClass)}`}
      >
        {stage}
      </span>
    );
  }

  // Lead Types
  if (field === "leadType" || field === "personLeadType") {
    const custom = customLeadTypes.find((t: any) => (t.label || t) === stage);

    // Fallback for hardcoded if not in custom (though custom should include defaults now)
    const fallbackColors: any = {
      Prospect: "bg-blue-900/40 text-blue-400",
      "Cold Lead": "bg-cyan-900/40 text-cyan-400",
      "Warm Lead": "bg-orange-900/40 text-orange-400",
      "Hot Lead": "bg-red-900/40 text-red-500",
      Client: "bg-green-900/40 text-green-400",
    };

    const colorClass =
      custom?.color ||
      fallbackColors[stage] ||
      "bg-skeleton-bg text-textSecondary";
    return (
      <span
        className={`px-2 py-0.5 rounded text-xs font-medium ${convertColorForTheme(colorClass)}`}
      >
        {stage}
      </span>
    );
  }

  // Person Stages
  if (field === "stage" || field === "personStage") {
    const custom = customStages.find((s: any) => (s.label || s) === stage);

    const fallbackColors: any = {
      Lead: "bg-gray-800 text-gray-400",
      Qualified: "bg-indigo-900/40 text-indigo-400",
      Negotiation: "bg-yellow-900/40 text-yellow-400",
      Closed: "bg-green-900/40 text-green-400",
      Lost: "bg-red-900/40 text-red-400",
    };

    const colorClass =
      custom?.color ||
      fallbackColors[stage] ||
      "bg-skeleton-bg text-textSecondary";
    return (
      <span
        className={`px-2 py-0.5 rounded text-xs font-medium ${convertColorForTheme(colorClass)}`}
      >
        {stage}
      </span>
    );
  }

  // Opportunity Stages
  const colors: any = {
    Screening: "bg-pink-900/40 text-pink-400",
    Meeting: "bg-blue-900/40 text-blue-400",
    Proposal: "bg-yellow-900/40 text-yellow-400",
    Customer: "bg-green-900/40 text-green-400",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-medium ${convertColorForTheme(colors[stage] || "bg-skeleton-bg")}`}
    >
      {stage}
    </span>
  );
};

const ConversionCircle = ({ percentage }: { percentage: number }) => {
  const size = 16;
  const strokeWidth = 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-white/10"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="text-accent"
      />
    </svg>
  );
};

export default DataTable;
