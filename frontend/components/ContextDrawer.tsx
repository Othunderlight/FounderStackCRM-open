import React, { useState, useEffect, useRef, useMemo } from "react";
import { useStore } from "../store";
import { useNavigate } from "react-router-dom";
import { LinkifiedText } from "./LinkifiedText";
import { isPinned, togglePin, sortWithPinnedFirst } from "../lib/pins";
import {
  X,
  ExternalLink,
  Calendar,
  Mail,
  MapPin,
  Building,
  Phone,
  Linkedin,
  Bot,
  FileText,
  CheckCircle,
  Home,
  ListTodo,
  Paperclip,
  ChevronDown,
  ArrowUpRight,
  User,
  Globe,
  Users,
  Target,
  CheckSquare,
  AlignLeft,
  Trash2,
  DollarSign,
  PieChart,
  Hash,
  ArrowLeft,
  ArrowRight,
  Plus,
  Maximize2,
  Activity,
  MessageSquare,
  MessageCircle,
  Check,
  Sparkles,
  Copy,
  RefreshCw,
  Search,
  Pencil,
  Edit,
  Zap,
  Pin,
  PinOff,
  XCircle,
} from "lucide-react";
import {
  Person,
  Company,
  Task,
  Note,
  Opportunity,
  ActivityLog,
  InteractionLog,
  Channel,
  Direction,
} from "../types";
import { toast } from "sonner";
import {
  parseConversation,
  apiFetch,
  getPeople,
  getCompanies,
} from "../lib/api";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format, isToday, isYesterday } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InteractionTypeModal } from "./InteractionTypeModal";
import { useTranslation } from "../src/i18n";

const ContextDrawer = () => {
  const {
    isDrawerOpen,
    drawerStack,
    closeDrawer,
    popDrawer,
    fetchOrgUsers,
    myAccess,
    customStages,
    customLeadTypes,
    customLeadSources,
    theme,
    language,
  } = useStore();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Home");

  const isRTL = language === "ar";
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const handleClose = () => {
    if (isMobile && currentItem) {
      const routeMap: Record<string, string> = {
        person: "/people/all",
        company: "/companies",
        opportunity: "/opportunities/all",
        task: "/tasks/all",
        note: "/notes",
        activity: "/people/logs",
      };
      navigate(routeMap[currentItem.type] || "/");
    }
    closeDrawer();
  };

  // Auto Msg Parser States
  const [isAutoMsgParserOpen, setIsAutoMsgParserOpen] = useState(false);
  const [parserPersonId, setParserPersonId] = useState<string | null>(null);
  const [convText, setConvText] = useState("");
  const [isParsing, setIsParsing] = useState(false);

  const handleParseConversation = async () => {
    if (!parserPersonId || !convText.trim()) return;

    setIsParsing(true);
    try {
      const response = await parseConversation(parserPersonId, convText);
      if (response.ok) {
        toast.success("Conversation parsed successfully!");
        setIsAutoMsgParserOpen(false);
        setConvText("");
      } else {
        toast.error("Failed to parse conversation.");
      }
    } catch (error) {
      console.error("Parse error:", error);
      toast.error("An error occurred while parsing the conversation.");
    } finally {
      setIsParsing(false);
    }
  };

  useEffect(() => {
    const canReadUsers = !!myAccess?.permissions?.includes("*") || !!myAccess?.permissions?.includes("users.manage");
    if (isDrawerOpen && canReadUsers) {
      fetchOrgUsers();
    }
  }, [isDrawerOpen, fetchOrgUsers, myAccess]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeDrawer();
      }
    };

    if (isDrawerOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDrawerOpen, closeDrawer]);

  // Current item is the top of the stack
  const currentItem = drawerStack[drawerStack.length - 1];

  // Reset or Restore active tab when item changes
  useEffect(() => {
    if (currentItem?.id) {
      setActiveTab(currentItem.activeTab || "Home");
    }
  }, [currentItem?.id, currentItem?.activeTab]);

  if (!isDrawerOpen || drawerStack.length === 0) return null;

  const handleExpand = () => {
    // Navigate to full page view
    const state = { initialTab: activeTab };
    if (currentItem.type === "person")
      navigate(`/people/${currentItem.id}`, { state });
    else if (currentItem.type === "company")
      navigate(`/companies/${currentItem.id}`, { state });
    else if (currentItem.type === "opportunity")
      navigate(`/opportunities/${currentItem.id}`, { state });
    else if (currentItem.type === "task")
      navigate(`/tasks/${currentItem.id}`, { state });
    else if (currentItem.type === "activity") navigate(`/people/logs`); // No single page for activity yet
    closeDrawer();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-in fade-in duration-300" onClick={closeDrawer} />
      <div className={`fixed top-0 h-full w-full md:w-[630px] bg-drawer-bg border-border z-50 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${isRTL ? "left-0 border-r" : "right-0 border-l"}`}>
        {/* Header */}
        <div className="px-6 pt-4 pb-0 bg-drawer-bg">
          <div className="flex items-center gap-3 mb-6">
            {/* Navigation Controls */}
            {drawerStack.length > 1 ? (
              <button
                onClick={popDrawer}
                className="text-textSecondary hover:text-textPrimary transition-colors"
              >
                {isRTL ? <ArrowRight size={20} /> : <ArrowLeft size={20} />}
              </button>
            ) : (
              <button
                onClick={handleClose}
                className="text-textSecondary hover:text-textPrimary transition-colors"
              >
                <X size={20} />
              </button>
            )}

            <div className="flex-1"></div>

            <button
              onClick={handleExpand}
              className="text-textSecondary hover:text-textPrimary transition-colors"
            >
              <Maximize2 size={16} />
            </button>
          </div>

          <DrawerContentRenderer
            item={currentItem}
            activeTab={activeTab}
            myAccess={myAccess}
            setActiveTab={setActiveTab}
            onOpenAutoMsgParser={(id) => {
              setParserPersonId(id);
              setIsAutoMsgParserOpen(true);
            }}
          />
        </div>
      </div>

      <Dialog open={isAutoMsgParserOpen} onOpenChange={setIsAutoMsgParserOpen}>
        <DialogContent className="sm:max-w-[600px] bg-card-bg border-border text-textPrimary z-[100]">
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
                <span className="font-bold text-accent me-1">{t("autoMsgParser.proTip")}</span>
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
              className="w-full h-[300px] bg-textarea-bg border border-border rounded-md p-3 text-sm focus:outline-none focus:border-accent resize-none no-scrollbar placeholder:text-textSecondary/30"
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsAutoMsgParserOpen(false)}
              className="text-textSecondary hover:text-textPrimary hover:bg-card-hover"
              disabled={isParsing}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleParseConversation}
              disabled={isParsing || !convText.trim()}
              className="bg-accent hover:bg-blue-600 text-white font-medium"
            >
              {isParsing ? (
                <>
                  <RefreshCw className={`w-4 h-4 ${isRTL ? "ms-2" : "me-2"} animate-spin`} />
                  {t("autoMsgParser.processing")}
                </>
              ) : (
                t("autoMsgParser.process")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

const DrawerContentRenderer = ({
  item,
  activeTab,
  setActiveTab,
  onOpenAutoMsgParser,
  myAccess,
}: {
  item: { id: string; type: string };
  activeTab: string;
  setActiveTab: (t: string) => void;
  onOpenAutoMsgParser: (id: string) => void;
  myAccess: any;
}) => {
  const { t } = useTranslation();
  const { people, companies, opportunities, tasks, notes, activities } =
    useStore();

  let data: any = null;
  if (item.type === "person") data = people.find((p) => p.id === item.id);
  else if (item.type === "company")
    data = companies.find((c) => c.id === item.id);
  else if (item.type === "task") data = tasks.find((t) => t.id === item.id);
  else if (item.type === "opportunity")
    data = opportunities.find((o) => o.id === item.id);
  else if (item.type === "note") data = notes.find((n) => n.id === item.id);
  else if (item.type === "activity")
    data = activities.find((a) => a.id === item.id);

  if (!data)
    return <div className="p-6 text-textSecondary">{t("contextDrawer.recordNotFound")}</div>;

  return (
    <RecordView
      data={data}
      type={item.type as any}
      activeTab={activeTab}
      myAccess={myAccess}
      setActiveTab={setActiveTab}
      onOpenAutoMsgParser={onOpenAutoMsgParser}
    />
  );
};

const RecordView = ({
  data,
  type,
  activeTab,
  setActiveTab,
  onOpenAutoMsgParser,
  myAccess,
}: {
  data: any;
  type: "person" | "company" | "task" | "opportunity" | "note" | "activity";
  activeTab: string;
  setActiveTab: (t: string) => void;
  onOpenAutoMsgParser: (id: string) => void;
  myAccess: any;
}) => {
  const {
    updateTask,
    updateOpportunity,
    updateNote,
    updatePerson,
    updateCompany,
    updateActivity,
    deletePeople,
    deleteCompanies,
    deleteTasks,
    deleteOpportunities,
    deleteNotes,
    deleteActivities,
    closeDrawer,
    confirm,
  } = useStore();

  const fieldMapping: Record<string, string> = {
    companyName: "company",
    jobTitle: "job_title",
    leadType: "lead_type",
    leadSource: "lead_source",
    conversionRate: "conversion_rate",
    lastAction: "last_action",
    recommendedAction: "recommended_action",
    createdAt: "created_at",
    updatedAt: "updated_at",
    dueDate: "due_date",
    status: "status",
    email: "email",
    city: "city",
    phone: "phone",
    linkedin: "linkedin",
    domain: "domain",
    location: "location",
    arr: "arr",
    icp: "icp",
    assignee: "assignee",
    content: "content",
  };

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

  const canWriteEntity = (entityType: string) => {
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

    return myAccess.permissions.includes(permissionMap[entityType]);
  };

  const isFieldHidden = (field: string) => {
    if (!myAccess?.hidden_fields) return false;
    const entityKey = type === "activity" ? "person" : type; 
    const hiddenForEntity = myAccess.hidden_fields[entityKey] || [];
    const snakeField = fieldMapping[field] || field;

    return hiddenForEntity.includes(snakeField);
  };

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

  const { t } = useTranslation();
  const [titleValue, setTitleValue] = useState(
    type === "activity"
      ? data.title || ""
      : data.title || data.name || "",
  );
  const [editingTitle, setEditingTitle] = useState(false);

  // Auto-focus title if it's "Untitled" (usually a new record)
  useEffect(() => {
    if (
      data &&
      (data.name === "Untitled" ||
        data.name === "Untitled Note" ||
        data.title === "Untitled" ||
        (type === "activity" && data.content === "New activity log..."))
    ) {
      // Delay slightly to ensure drawer animation is finished
      const timer = setTimeout(() => {
        setEditingTitle(true);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [data.id]);

  // Sync title when data changes (e.g. navigation)
  useEffect(() => {
    setTitleValue(
      type === "activity"
        ? data.title || ""
        : data.title || data.name || "",
    );
  }, [data.id, type, data.title, data.name]);

  const handleTitleSave = () => {
    if (type === "task") updateTask(data.id, { title: titleValue });
    else if (type === "opportunity")
      updateOpportunity(data.id, { name: titleValue });
    else if (type === "note") updateNote(data.id, { title: titleValue });
    else if (type === "person") updatePerson(data.id, { name: titleValue });
    else if (type === "company") updateCompany(data.id, { name: titleValue });
    else if (type === "activity")
      updateActivity(data.id, { title: titleValue }); // Activity uses title for the header
    setEditingTitle(false);
  };

  const getActivityTitle = () => {
    const direction = data.direction || "";
    const name = data.personName || data.companyName || "";
    const logType = data.type || "";
    return `${direction} ${name} ${logType}`.trim() || "Untitled Activity";
  };

  const handleDelete = () => {
    confirm({
      title: t("confirm.deleteRecord"),
      description: t("confirm.deleteRecordConfirm"),
      confirmText: t("confirm.delete"),
      onConfirm: async () => {
        try {
          if (type === "person") await deletePeople([data.id]);
          else if (type === "company") await deleteCompanies([data.id]);
          else if (type === "task") await deleteTasks([data.id]);
          else if (type === "opportunity") await deleteOpportunities([data.id]);
          else if (type === "note") await deleteNotes([data.id]);
          else if (type === "activity") await deleteActivities([data.id]);
          toast.success(t("confirm.recordDeleted"));
          closeDrawer();
        } catch (error) {
          toast.error(t("confirm.deleteRecordFailed"));
        }
      },
    });
  };

  if (!canRead) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-150px)] px-6">
        <div className="w-16 h-16 mb-4 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
          <XCircle size={32} className="text-red-500/60" />
        </div>
        <h3 className="text-lg font-medium text-textPrimary">
          {t("dataTable.accessDenied")}
        </h3>
        <p className="text-sm text-textSecondary/60 mt-2 text-center leading-relaxed max-w-[280px]">
          {t("dataTable.noReadPermission", { type })}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      {/* Title Section ... same ... */}
      <div className="flex items-center gap-3 mb-6">
        {/* Icon */}
        {type === "person" && (
          <div className="w-8 h-8 rounded-full bg-card-hover overflow-hidden flex items-center justify-center">
            {data.avatar ? (
              <img src={data.avatar} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold">
                {data.name?.charAt(0) || "?"}
              </span>
            )}
          </div>
        )}
        {type === "company" && (
          <div className="w-8 h-8 rounded bg-red-500/20 text-red-500 flex items-center justify-center">
            <Building size={16} />
          </div>
        )}
        {type === "task" && (
          <div className="w-8 h-8 rounded bg-blue-500/20 text-blue-500 flex items-center justify-center">
            <CheckSquare size={16} />
          </div>
        )}
        {type === "note" && (
          <div className="w-8 h-8 rounded bg-yellow-500/20 text-yellow-500 flex items-center justify-center">
            <FileText size={16} />
          </div>
        )}
        {type === "opportunity" && (
          <div className="w-8 h-8 rounded bg-green-500/20 text-green-500 flex items-center justify-center">
            <Target size={16} />
          </div>
        )}
        {type === "activity" && (
          <div className="w-8 h-8 rounded bg-purple-500/20 text-purple-500 flex items-center justify-center">
            <Activity size={16} />
          </div>
        )}

        <div className="flex-1">
          {editingTitle ? (
            <input
              dir="auto"
              className="w-full bg-input-bg border border-border rounded px-2 py-1 text-lg font-bold text-textPrimary focus:outline-none focus:border-accent"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => e.key === "Enter" && handleTitleSave()}
              autoFocus
            />
          ) : (
            <h1
              className={`text-lg font-bold text-textPrimary ${canWrite ? "cursor-pointer hover:underline decoration-textSecondary/50 underline-offset-4" : "cursor-default"}`}
              onClick={canWrite ? () => setEditingTitle(true) : undefined}
            >
              <LinkifiedText
                text={
                  type === "activity" && !titleValue
                    ? getActivityTitle()
                    : titleValue || "Untitled"
                }
              />
            </h1>
          )}
        </div>
        <span className="text-xs text-textSecondary">
          {data.createdAt
            ? `${t("contextDrawer.created")} ${format(new Date(data.createdAt), "MMM d, yyyy")}`
            : ""}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border mb-0">
        <TabItem
          label={t("contextDrawer.home")}
          icon={Home}
          active={activeTab === "Home"}
          onClick={() => setActiveTab("Home")}
        />
        {type !== "task" && type !== "note" && type !== "activity" && (myAccess?.permissions.includes("tasks.read") || myAccess?.permissions.includes("*")) && (
          <TabItem
            label={t("contextDrawer.tasks")}
            icon={ListTodo}
            active={activeTab === "Tasks"}
            onClick={() => setActiveTab("Tasks")}
          />
        )}
        {type !== "task" && type !== "note" && type !== "activity" && (myAccess?.permissions.includes("notes.read") || myAccess?.permissions.includes("*")) && (
          <TabItem
            label={t("contextDrawer.notes")}
            icon={FileText}
            active={activeTab === "Notes"}
            onClick={() => setActiveTab("Notes")}
          />
        )}
        {type === "person" && (myAccess?.permissions.includes("interactions.read") || myAccess?.permissions.includes("*")) && (
          <TabItem
            label={t("contextDrawer.timeline")}
            icon={Activity}
            active={activeTab === "Timeline"}
            onClick={() => setActiveTab("Timeline")}
            badge="BETA"
          />
        )}
        {type !== "task" && type !== "note" && type !== "activity" && (
          <TabItem
            label={t("contextDrawer.actions")}
            icon={Target}
            active={activeTab === "Actions"}
            onClick={() => setActiveTab("Actions")}
          />
        )}
        {type !== "task" && type !== "note" && type !== "activity" && (myAccess?.permissions.includes("activities.read") || myAccess?.permissions.includes("*")) && (
          <TabItem
            label={t("contextDrawer.context")}
            icon={MessageSquare}
            active={activeTab === "Context"}
            onClick={() => setActiveTab("Context")}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar py-6">
        {activeTab === "Home" && (
          <HomeTab
            data={data}
            type={type}
            canWrite={canWrite}
            isFieldHidden={isFieldHidden}
          />
        )}
        {activeTab === "Tasks" && (
          <TasksTab
            parentId={data.id}
            parentType={type}
            canWrite={canWriteEntity("task")}
          />
        )}
        {activeTab === "Notes" && (
          <NotesTab
            parentId={data.id}
            parentType={type}
            activeTab={activeTab}
            canWrite={canWriteEntity("note")}
          />
        )}
        {activeTab === "Timeline" && (
          <TimelineTab data={data} type={type} canWrite={canWriteEntity("activity")} />
        )}
        {activeTab === "Actions" && (
          <ActionsTab data={data} type={type} canWrite={canWrite} />
        )}
        {activeTab === "Context" && (
          <ContextTab
            data={data}
            type={type}
            onOpenAutoMsgParser={onOpenAutoMsgParser}
            canWrite={canWriteEntity("activity")}
          />
        )}
      </div>

      {/* Footer Actions */}
      <div className="py-3 border-t border-border mt-auto flex justify-between items-center bg-drawer-bg">
        {canWrite && (
          <button
            onClick={handleDelete}
            className="text-xs text-textSecondary hover:text-red-400 flex items-center gap-2 px-2 py-1 rounded hover:bg-card-hover transition-colors"
          >
            <Trash2 size={12} /> {t("contextDrawer.delete")}
          </button>
        )}
      </div>
    </div>
  );
};

const TabItem = ({ label, icon: Icon, active, onClick, badge }: any) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 py-2 px-3 relative transition-all cursor-pointer rounded-t-md border-b-2 ${active ? "text-textPrimary border-textPrimary bg-card-hover" : "text-textSecondary border-transparent hover:text-textPrimary hover:bg-card-hover"}`}
  >
    <Icon size={14} />
    <span className="text-sm font-medium">{label}</span>
    {badge && (
      <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-orange-500/20 text-orange-500 border border-orange-500/30 rounded-full uppercase tracking-wide">
        {badge}
      </span>
    )}
  </button>
);

const StageBadge = ({ stage, field }: { stage: any; field?: string }) => {
  const { t } = useTranslation();
  if (!stage)
    return (
      <span className="text-textSecondary opacity-30 italic text-xs">
        {t("contextDrawer.notSet")}
      </span>
    );

  if (field === "direction") {
    const directionColors: any = {
      received: "bg-green-700/70 text-green-200",
      sent: "bg-blue-700/70 text-blue-200",
      system: "bg-gray-700 text-gray-200",
    };
    const labels: Record<string, string> = {
      received: t("contextDrawer.received"),
      sent: t("contextDrawer.sent"),
      system: t("contextDrawer.system"),
    };
    return (
      <span
        className={`px-2 py-0.5 rounded text-xs font-medium ${directionColors[stage] || "bg-[#2f2f2f] text-textSecondary"}`}
      >
        {labels[stage] || stage}
      </span>
    );
  }

  if (field === "channel") {
    const channelColors: any = {
      email: "bg-blue-700/70 text-blue-200",
      linkedin: "bg-indigo-700/70 text-indigo-200",
      whatsapp: "bg-green-700/70 text-green-200",
      system: "bg-gray-700 text-gray-200",
    };
    return (
      <span
        className={`px-2 py-0.5 rounded text-xs font-medium ${channelColors[stage] || "bg-[#2f2f2f] text-textSecondary"}`}
      >
        {stage}
      </span>
    );
  }

  if (field === "type") {
    const typeColors: any = {
      email: "bg-blue-700/70 text-blue-200",
      call: "bg-green-700/70 text-green-200",
      meeting: "bg-purple-700/70 text-purple-200",
      msg: "bg-indigo-700/70 text-indigo-200",
      update: "bg-cyan-700/70 text-cyan-200",
    };
    const labels: Record<string, string> = {
      msg: t("contextDrawer.message"),
    };
    return (
      <span
        className={`px-2 py-0.5 rounded text-xs font-medium ${typeColors[stage] || "bg-[#2f2f2f] text-textSecondary"}`}
      >
        {labels[stage] || stage}
      </span>
    );
  }

  if (field === "leadSource" || field === "personLeadSource") {
    const sourceColors: any = {
      Inbound: "bg-indigo-700/70 text-indigo-200",
      Outbound: "bg-amber-700/70 text-amber-200",
    };
    const labels: Record<string, string> = {
      Inbound: t("contextDrawer.inbound"),
      Outbound: t("contextDrawer.outbound"),
    };
    return (
      <span
        className={`px-2 py-0.5 rounded text-xs font-medium ${sourceColors[stage] || "bg-[#2f2f2f] text-textSecondary"}`}
      >
        {labels[stage] || stage}
      </span>
    );
  }

  if (field === "leadType" || field === "personLeadType") {
    const leadTypeColors: any = {
      Prospect: "bg-blue-700/70 text-blue-200",
      "Cold Lead": "bg-cyan-700/70 text-cyan-200",
      "Warm Lead": "bg-orange-700/70 text-orange-200",
      "Hot Lead": "bg-red-700/70 text-red-200",
      Client: "bg-green-700/70 text-green-200",
    };
    const labels: Record<string, string> = {
      Prospect: t("contextDrawer.prospect"),
      "Cold Lead": t("contextDrawer.coldLead"),
      "Warm Lead": t("contextDrawer.warmLead"),
      "Hot Lead": t("contextDrawer.hotLead"),
      Client: t("contextDrawer.client"),
    };
    return (
      <span
        className={`px-2 py-0.5 rounded text-xs font-medium ${leadTypeColors[stage] || "bg-[#2f2f2f] text-textSecondary"}`}
      >
        {labels[stage] || stage}
      </span>
    );
  }

  if (field === "stage" || field === "personStage") {
    const stageColors: any = {
      Lead: "bg-gray-700 text-gray-200",
      Qualified: "bg-indigo-700/70 text-indigo-200",
      Negotiation: "bg-yellow-600/70 text-yellow-100",
      Closed: "bg-green-700/70 text-green-200",
      Lost: "bg-red-700/70 text-red-200",
    };
    const labels: Record<string, string> = {
      Lead: t("contextDrawer.lead"),
      Qualified: t("contextDrawer.qualified"),
      Negotiation: t("contextDrawer.negotiation"),
      Closed: t("contextDrawer.closed"),
      Lost: t("contextDrawer.lost"),
    };
    return (
      <span
        className={`px-2 py-0.5 rounded text-xs font-medium ${stageColors[stage] || "bg-[#2f2f2f] text-textSecondary"}`}
      >
        {labels[stage] || stage}
      </span>
    );
  }

  const colors: any = {
    Screening: "bg-pink-700/70 text-pink-200",
    Meeting: "bg-blue-700/70 text-blue-200",
    Proposal: "bg-yellow-600/70 text-yellow-100",
    Customer: "bg-green-700/70 text-green-200",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-medium ${colors[stage] || "bg-[#2f2f2f]"}`}
    >
      {stage}
    </span>
  );
};

const ChannelIcon = ({ channel }: { channel?: string }) => {
  switch (channel) {
    case "linkedin":
      return <Linkedin size={10} className="text-linkedin" />;
    case "email":
      return <Mail size={10} className="text-yellow-500" />;
    case "whatsapp":
      return <MessageCircle size={10} className="text-green-500" />;
    default:
      return <Activity size={10} />;
  }
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

const EditablePropertyRow = ({
  icon: Icon,
  label,
  value,
  field,
  type = "text",
  onSave,
  isBadge,
  canWrite = true,
}: any) => {
  const { t } = useTranslation();
  const { language } = useStore();
  const isRTL = language === "ar";
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  const [searchTerm, setSearchTerm] = useState("");
  const [relationTab, setRelationTab] = useState<"person" | "company">(
    "person",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use global store for static data and display lookups only
  const {
    customStages,
    customLeadTypes,
    customLeadSources,
    theme,
    people,
    companies,
    orgUsers,
  } = useStore();

  // LOCAL state for dropdown items - isolated from table data
  const [dropdownPeople, setDropdownPeople] = useState<Person[]>([]);
  const [dropdownCompanies, setDropdownCompanies] = useState<Company[]>([]);
  const [dropdownPeoplePagination, setDropdownPeoplePagination] = useState<{
    next: string | null;
  }>({ next: null });
  const [dropdownCompaniesPagination, setDropdownCompaniesPagination] =
    useState<{ next: string | null }>({ next: null });
  const [isLoadingDropdown, setIsLoadingDropdown] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Helper to map API response to Person/Company
  const mapPerson = (p: any): Person => ({
    id: String(p.id),
    name: p.name,
    avatar: p.avatar,
    email: p.email,
    jobTitle: p.job_title,
    companyId: p.company ? String(p.company) : "",
    companyName: p.company_name || "",
    phone: p.phone || "",
    city: p.city || "",
    linkedin: p.linkedin,
    createdAt: p.created_at,
    createdBy: p.created_by_name,
    conversionRate: p.conversion_rate,
    stage: p.stage,
    lastAction: p.last_action,
    leadType: p.lead_type,
  });

  const mapCompany = (c: any): Company => ({
    id: String(c.id),
    name: c.name,
    domain: c.domain || "",
    employees: c.employees || "",
    location: c.location || "",
    linkedin: c.linkedin,
    createdAt: c.created_at,
    owner: c.owner_details?.username || "Unknown",
    createdBy: c.created_by_name,
    arr: c.arr || "",
    icp: c.icp || false,
  });

  // Fetch people for dropdown (local state)
  const fetchDropdownPeople = async (params: any = {}, append = false) => {
    setIsLoadingDropdown(true);
    try {
      let response;
      if (typeof params === "string" && params.startsWith("http")) {
        const url = new URL(params);
        response = await apiFetch(url.pathname + url.search);
      } else {
        response = await getPeople(params);
      }
      if (response.ok) {
        const data = await response.json();
        const results = data.results || [];
        const mapped = results.map(mapPerson);
        setDropdownPeople((prev) =>
          append
            ? [
                ...prev,
                ...mapped.filter(
                  (m: Person) => !prev.find((p) => p.id === m.id),
                ),
              ]
            : mapped,
        );
        setDropdownPeoplePagination({ next: data.next || null });
      }
    } catch (err) {
      console.error("Fetch dropdown people error:", err);
    } finally {
      setIsLoadingDropdown(false);
    }
  };

  // Fetch companies for dropdown (local state)
  const fetchDropdownCompanies = async (params: any = {}, append = false) => {
    setIsLoadingDropdown(true);
    try {
      let response;
      if (typeof params === "string" && params.startsWith("http")) {
        const url = new URL(params);
        response = await apiFetch(url.pathname + url.search);
      } else {
        response = await getCompanies(params);
      }
      if (response.ok) {
        const data = await response.json();
        const results = data.results || [];
        const mapped = results.map(mapCompany);
        setDropdownCompanies((prev) =>
          append
            ? [
                ...prev,
                ...mapped.filter(
                  (m: Company) => !prev.find((c) => c.id === m.id),
                ),
              ]
            : mapped,
        );
        setDropdownCompaniesPagination({ next: data.next || null });
      }
    } catch (err) {
      console.error("Fetch dropdown companies error:", err);
    } finally {
      setIsLoadingDropdown(false);
    }
  };

  // Debounced API search for relation fields - uses LOCAL state
  useEffect(() => {
    if (!editing || type !== "relation") return;
    const timer = setTimeout(() => {
      const params = searchTerm ? { search: searchTerm } : {};
      if (relationTab === "person") fetchDropdownPeople(params);
      else fetchDropdownCompanies(params);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, relationTab, editing, type]);

  // Debounced API search for companySelect - uses LOCAL state
  useEffect(() => {
    if (!editing || type !== "companySelect") return;
    const timer = setTimeout(() => {
      const params = val ? { search: val } : {};
      fetchDropdownCompanies(params);
    }, 300);
    return () => clearTimeout(timer);
  }, [val, editing, type]);

  useEffect(() => {
    if (!editing) {
      setVal(value);
      setError(null);
    }
  }, [value, editing]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (type === "date") return;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        // If specific types, we might want to save on blur/click outside
        if (
          ["text", "number", "companySelect"].includes(type) &&
          editing &&
          !isSaving
        ) {
          handleSave(val);
        } else if (!isSaving) {
          setEditing(false);
        }
      }
    };

    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (editing && event.key === "Escape") {
        event.stopPropagation();
        setEditing(false);
      }
    };

    if (editing) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleGlobalKeyDown, true);
      // Focus input
      setTimeout(() => inputRef.current?.focus(), 10);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleGlobalKeyDown, true);
    };
  }, [editing, val, isSaving, type]);

  const handleSave = async (newValue: any) => {
    let processedValue = newValue;

    // Auto-inject https:// for URL fields if protocol is missing
    const lowerLabel = label.toLowerCase();
    const isUrlField =
      ["linkedin", "domain", "website", "avatar"].includes(lowerLabel) ||
      lowerLabel.includes("url");

    if (
      isUrlField &&
      typeof processedValue === "string" &&
      processedValue.trim() !== ""
    ) {
      const trimmed = processedValue.trim();
      if (!/^https?:\/\//i.test(trimmed)) {
        processedValue = `https://${trimmed}`;
        setVal(processedValue); // Update UI to reflect the change
      }
    }

    if (processedValue === value && !error) {
      setEditing(false);
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const response = await onSave(processedValue);
      if (
        response &&
        typeof response === "object" &&
        "ok" in response &&
        !response.ok
      ) {
        const data = await response.json();
        // Try to find any field-specific error first, then detail/message
        const fieldError = Object.values(data)[0];
        const msg =
          (Array.isArray(fieldError) ? fieldError[0] : fieldError) ||
          data.detail ||
          data.message ||
          "Invalid value";
        setError(String(msg));
      } else {
        setEditing(false);
      }
    } catch (e) {
      setError("Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && type !== "relation" && type !== "companySelect") {
      handleSave(val);
    }
    if (e.key === "Escape") {
      setEditing(false);
      setVal(value);
    }
  };

  const getBadgeColor = (val: string, field: string) => {
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

    // Lead Source
    if (field === "leadSource" || field === "personLeadSource") {
      const custom = customLeadSources.find((s: any) => (s.label || s) === val);
      const fallbackColors: any = {
        Inbound: "bg-green-900/40 text-green-400",
        Outbound: "bg-purple-900/40 text-purple-400",
      };
      const colorClass = custom?.color || fallbackColors[val] || "bg-skeleton-bg text-textSecondary";
      return convertColorForTheme(colorClass);
    }

    // Lead Types
    if (field === "leadType" || field === "personLeadType") {
      const custom = customLeadTypes.find((t: any) => (t.label || t) === val);
      const fallbackColors: any = {
        Prospect: "bg-blue-900/40 text-blue-400",
        "Cold Lead": "bg-cyan-900/40 text-cyan-400",
        "Warm Lead": "bg-orange-900/40 text-orange-400",
        "Hot Lead": "bg-red-900/40 text-red-500",
        Client: "bg-green-900/40 text-green-400",
      };
      const colorClass = custom?.color || fallbackColors[val] || "bg-skeleton-bg text-textSecondary";
      return convertColorForTheme(colorClass);
    }

    // Person Stages
    if (field === "stage" || field === "personStage") {
      const custom = customStages.find((s: any) => (s.label || s) === val);
      const fallbackColors: any = {
        Lead: "bg-gray-800 text-gray-400",
        Qualified: "bg-indigo-900/40 text-indigo-400",
        Negotiation: "bg-yellow-900/40 text-yellow-400",
        Closed: "bg-green-900/40 text-green-400",
        Lost: "bg-red-900/40 text-red-400",
      };
      const colorClass = custom?.color || fallbackColors[val] || "bg-skeleton-bg text-textSecondary";
      return convertColorForTheme(colorClass);
    }

    // Task Status
    if (field === "status") {
      const colors: Record<string, string> = {
        Todo: "bg-blue-700/70 text-blue-200",
        "In Progress": "bg-purple-700/70 text-purple-200",
        Done: "bg-green-700/70 text-green-200",
      };
      return convertColorForTheme(colors[val] || "bg-skeleton-bg");
    }

    // Activity Direction
    if (field === "direction") {
      const directionColors: any = {
        received: "bg-green-900/40 text-green-400",
        sent: "bg-blue-900/40 text-blue-400",
        system: "bg-gray-800 text-gray-400",
      };
      return convertColorForTheme(directionColors[val] || "bg-skeleton-bg text-textSecondary");
    }

    // Activity Channel
    if (field === "channel") {
      const channelColors: any = {
        email: "bg-blue-900/40 text-blue-400",
        linkedin: "bg-indigo-900/40 text-indigo-400",
        whatsapp: "bg-green-900/40 text-green-400",
        system: "bg-gray-800 text-gray-400",
      };
      return convertColorForTheme(channelColors[val] || "bg-skeleton-bg text-textSecondary");
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
      return convertColorForTheme(typeColors[val] || "bg-skeleton-bg text-textSecondary");
    }

    return "bg-skeleton-bg text-textSecondary";
  };

  const isListType = ["status", "stage", "leadType", "leadSource"].includes(
    type,
  );

  if (type === "date") {
    const dateValue = val ? new Date(val) : undefined;
    return (
      <div
        className="flex items-center min-h-[32px] group relative"
        ref={dropdownRef}
      >
        <div className={`w-[160px] flex items-center gap-2 text-textSecondary ${isRTL ? "flex-row" : ""}`}>
          <Calendar size={14} className="opacity-70" />
          <span className="text-sm truncate">{label}</span>
        </div>
        <div className="flex-1">
          <Popover
            open={editing && canWrite}
            onOpenChange={(open) => {
              if (canWrite) {
                setEditing(open);
                if (!open) setError(null);
              }
            }}
          >
            <PopoverTrigger asChild>
              <div
                className={`text-sm ${canWrite ? "cursor-pointer hover:bg-card-hover border border-transparent hover:border-border/50" : "cursor-default"} px-2 py-1 rounded flex items-center gap-2 transition-colors min-h-[28px] w-full ${isRTL ? "-ms-1 me-0" : "-ml-1 me-0"} ${error ? "border-red-500 bg-red-500/10" : ""}`}
                onClick={canWrite ? undefined : (e) => e.stopPropagation()}
                title={error || ""}
              >
                {dateValue ? (
                  <span className="text-textPrimary">
                    {format(dateValue, "MMM d, yyyy")}
                  </span>
                ) : (
                  <span className="text-textSecondary opacity-50 italic text-xs">
                    {t("contextDrawer.addDate")}
                  </span>
                )}
                {isSaving && (
                  <div className={`animate-spin h-3 w-3 border-2 border-accent border-t-transparent rounded-full ${isRTL ? "ms-auto" : "ms-auto"}`} />
                )}
              </div>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto p-0 bg-background shadow-2xl z-[60]"
              align="start"
            >
              <CalendarComponent
                mode="single"
                selected={dateValue}
                onSelect={(date) => {
                  if (date) {
                    const iso = date.toISOString();
                    setVal(iso);
                    handleSave(iso);
                  }
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    );
  }

  if (type === "relation") {
    const currentPersonId = value?.relatedPersonId;
    const currentCompanyId = value?.relatedCompanyId;
    const fallbackPersonName = value?.personName;
    const fallbackCompanyName = value?.companyName;

    const selected = currentPersonId
      ? people.find((p: Person) => p.id === currentPersonId)
      : currentCompanyId
        ? companies.find((c: Company) => c.id === currentCompanyId)
        : null;

    const displayName =
      selected?.name ||
      (currentPersonId
        ? fallbackPersonName
        : currentCompanyId
          ? fallbackCompanyName
          : null);

    const filteredItems =
      relationTab === "person" ? dropdownPeople : dropdownCompanies;
    const pagination =
      relationTab === "person"
        ? dropdownPeoplePagination
        : dropdownCompaniesPagination;

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      if (target.scrollHeight - target.scrollTop <= target.clientHeight + 50) {
        if (pagination.next && !isLoadingDropdown) {
          if (relationTab === "person")
            fetchDropdownPeople(pagination.next, true);
          else fetchDropdownCompanies(pagination.next, true);
        }
      }
    };

    return (
      <div
        className="flex items-center min-h-[32px] group relative"
        ref={dropdownRef}
      >
        <div className={`w-[160px] flex items-center gap-2 text-textSecondary ${isRTL ? "flex-row" : ""}`}>
          <ArrowUpRight size={14} className="opacity-70" />
          <span className="text-sm truncate">{t("contextDrawer.relations")}</span>
        </div>
        <div className="flex-1">
          <div
            onClick={canWrite ? () => setEditing(true) : undefined}
            className={`text-sm ${canWrite ? "cursor-pointer hover:bg-card-hover border border-transparent hover:border-border/50" : "cursor-default"} px-2 py-1 rounded flex items-center gap-2 transition-colors min-h-[28px] w-full ${isRTL ? "-ms-1 me-0" : "-ml-1 me-0"} ${error ? "border-red-500" : ""}`}
            title={error || ""}
          >
            {displayName ? (
              <div className={`flex items-center gap-1.5 truncate ${isRTL ? "flex-row" : ""}`}>
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0 ${currentPersonId ? "bg-orange-500" : "bg-red-500"}`}
                >
                  {displayName.charAt(0) || "?"}
                </div>
                <span className="truncate">{displayName}</span>
              </div>
            ) : (
              <span className="text-textSecondary opacity-50 italic text-xs">
                {t("contextDrawer.addRelation")}
              </span>
            )}
            {isSaving && (
              <div className={`animate-spin h-3 w-3 border-2 border-accent border-t-transparent rounded-full ${isRTL ? "ms-auto" : "ms-auto"}`} />
            )}
          </div>

          {editing && (
            <div className={`absolute top-full w-[280px] bg-dropdown-bg border border-border shadow-2xl rounded-md z-[60] overflow-hidden animate-in fade-in zoom-in-95 mt-1 flex flex-col max-h-[350px] ${isRTL ? "right-[160px]" : "left-[160px]"}`}>
              <div className="flex border-b border-border bg-input-bg">
                <button
                  onClick={() => setRelationTab("person")}
                  className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${relationTab === "person" ? "text-accent border-b-2 border-accent" : "text-textSecondary hover:text-textPrimary"}`}
                >
                  {t("contextDrawer.people")}
                </button>
                <button
                  onClick={() => setRelationTab("company")}
                  className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${relationTab === "company" ? "text-accent border-b-2 border-accent" : "text-textSecondary hover:text-textPrimary"}`}
                >
                  {t("contextDrawer.companies")}
                </button>
              </div>

              <div className="p-2 border-b border-border">
                <input
                  autoFocus
                  className="w-full bg-input-bg border border-border rounded px-2 py-1.5 text-xs text-textPrimary outline-none focus:border-accent"
                  placeholder={relationTab === "person" ? t("contextDrawer.searchPeople") : t("contextDrawer.searchCompanies")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div
                ref={listRef}
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
                      className="flex items-center gap-2 px-2 py-2 hover:bg-card-hover rounded cursor-pointer group transition-colors"
                      onClick={() => {
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
                        {isSelected && (
                          <Check size={10} className="text-white" />
                        )}
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
                          {relationTab === "person" ? t("contextDrawer.person") : t("contextDrawer.company")}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {isLoadingDropdown && filteredItems.length === 0 && (
                  <div className="space-y-2 p-2">
                    <div className="h-10 w-full bg-skeleton-bg rounded animate-pulse" />
                    <div className="h-10 w-full bg-skeleton-bg rounded animate-pulse" />
                    <div className="h-10 w-full bg-skeleton-bg rounded animate-pulse" />
                  </div>
                )}
                {isLoadingDropdown && filteredItems.length > 0 && (
                  <div className="p-2 flex justify-center">
                    <div className="animate-spin h-4 w-4 border-2 border-accent border-t-transparent rounded-full" />
                  </div>
                )}
                {!isLoadingDropdown && filteredItems.length === 0 && (
                  <div className="p-4 text-textSecondary text-xs text-center italic">
                    {relationTab === "person" ? t("contextDrawer.noPeopleFound") : t("contextDrawer.noCompaniesFound")}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (type === "companySelect") {
    const handleCompanyScroll = (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      if (target.scrollHeight - target.scrollTop <= target.clientHeight + 50) {
        if (dropdownCompaniesPagination.next && !isLoadingDropdown) {
          fetchDropdownCompanies(dropdownCompaniesPagination.next, true);
        }
      }
    };

    return (
      <div
        className="flex items-center min-h-[32px] group relative"
        ref={dropdownRef}
      >
        <div className={`w-[160px] flex items-center gap-2 text-textSecondary ${isRTL ? "flex-row" : ""}`}>
          {Icon && <Icon size={14} className="opacity-70" />}
          <span className="text-sm truncate">{label}</span>
        </div>
        <div className="flex-1">
          {editing ? (
            <div className="relative w-full">
              <input
                ref={inputRef}
                className={`w-full bg-input-bg border rounded px-2 py-1 text-sm text-textPrimary outline-none ${error ? "border-red-500" : "border-accent"}`}
                value={val || ""}
                onChange={(e) => setVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    // If exact match found or just text
                    handleSave({ name: val, id: null }); // Passing object or string? Handler expects object for company
                  }
                  if (e.key === "Escape") setEditing(false);
                }}
              />
              {/* Dropdown */}
              <div
                className="absolute top-full left-0 w-full bg-dropdown-bg border border-border shadow-xl rounded-md z-[60] mt-1 max-h-[200px] overflow-y-auto"
                onScroll={handleCompanyScroll}
              >
                {dropdownCompanies.map((c: Company) => (
                  <div
                    key={c.id}
                    className="px-3 py-2 hover:bg-card-hover cursor-pointer flex items-center gap-2"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSave({ name: c.name, id: c.id });
                    }}
                  >
                    <div className="w-5 h-5 rounded bg-red-500/20 text-red-500 flex items-center justify-center text-[10px] font-bold">
                      {c.name.charAt(0)}
                    </div>
                    <span className="text-sm text-textPrimary">{c.name}</span>
                  </div>
                ))}
                {isLoadingDropdown && dropdownCompanies.length === 0 && (
                  <div className="space-y-2 p-2">
                    <div className="h-10 w-full bg-skeleton-bg rounded animate-pulse" />
                    <div className="h-10 w-full bg-skeleton-bg rounded animate-pulse" />
                    <div className="h-10 w-full bg-skeleton-bg rounded animate-pulse" />
                  </div>
                )}
                {isLoadingDropdown && dropdownCompanies.length > 0 && (
                  <div className="p-2 flex justify-center">
                    <div className="animate-spin h-4 w-4 border-2 border-accent border-t-transparent rounded-full" />
                  </div>
                )}
                {!isLoadingDropdown &&
                  dropdownCompanies.length === 0 &&
                  val && (
                    <div className="px-3 py-2 text-textSecondary text-xs italic">
                      {t("contextTab.noMatchingCompanies")}
                    </div>
                  )}
              </div>
            </div>
          ) : (
            <div
              onClick={canWrite ? () => setEditing(true) : undefined}
              className={`text-sm ${canWrite ? "cursor-pointer hover:bg-card-hover px-2 py-1 -ml-1 rounded flex items-center gap-2 border border-transparent hover:border-border/50" : "cursor-default px-2 py-1 -ml-1"} transition-colors min-h-[28px] w-full ${error ? "border-red-500" : ""}`}
              title={error || ""}
            >
              {value ? (
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded bg-red-500 flex items-center justify-center text-[8px] font-bold text-white">
                    {value.charAt(0)}
                  </span>
                  <span>{value}</span>
                </div>
              ) : (
                <span className="text-textSecondary opacity-50 italic text-xs">
                  {t("contextDrawer.selectCompany")}
                </span>
              )}
              {isSaving && (
                <div className="ml-auto animate-spin h-3 w-3 border-2 border-accent border-t-transparent rounded-full" />
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (type === "assignee") {
    const currentAssigneeId = field;
    const currentAssigneeName = value;

    const selectedUser = orgUsers.find((u: any) => String(u.id) === String(currentAssigneeId));

    return (
      <div
        className="flex items-center min-h-[32px] group relative"
        ref={dropdownRef}
      >
        <div className={`w-[160px] flex items-center gap-2 text-textSecondary ${isRTL ? "flex-row" : ""}`}>
          <User size={14} className="opacity-70" />
          <span className="text-sm truncate">{label}</span>
        </div>
        <div className="flex-1">
          <div
            onClick={canWrite ? () => setEditing(true) : undefined}
            className={`text-sm ${canWrite ? "cursor-pointer hover:bg-card-hover border border-transparent hover:border-border/50" : "cursor-default"} px-2 py-1 rounded flex items-center gap-2 transition-colors min-h-[28px] w-full ${isRTL ? "-ms-1 me-0" : "-ml-1 me-0"} ${error ? "border-red-500" : ""}`}
            title={error || ""}
          >
            {selectedUser || currentAssigneeName ? (
              <div className={`flex items-center gap-1.5 truncate ${isRTL ? "flex-row" : ""}`}>
                <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center text-[10px] text-accent font-bold">
                  {((selectedUser as any)?.full_name || (selectedUser as any)?.username || currentAssigneeName || "?").charAt(0)}
                </div>
                <span className="truncate">
                  {(selectedUser as any)?.full_name || (selectedUser as any)?.username || currentAssigneeName}
                </span>
              </div>
            ) : (
              <span className="text-textSecondary opacity-50 italic text-xs">
                {t("contextDrawer.unassigned")}
              </span>
            )}
            {isSaving && (
              <div className={`animate-spin h-3 w-3 border-2 border-accent border-t-transparent rounded-full ${isRTL ? "ms-auto" : "ml-auto"}`} />
            )}
          </div>

          {editing && (
            <div className="absolute top-full left-0 w-[220px] bg-dropdown-bg border border-border shadow-2xl rounded-md z-[60] overflow-hidden animate-in fade-in zoom-in-95 mt-1 flex flex-col max-h-[250px]">
              <div className="max-h-[200px] overflow-y-auto custom-scrollbar py-1">
                {orgUsers.map((u: any) => {
                  const isSelected = String(u.id) === String(currentAssigneeId);
                  return (
                    <div
                      key={u.id}
                      className="px-3 py-2 hover:bg-card-hover cursor-pointer flex items-center justify-between group transition-colors"
                      onClick={() => {
                        handleSave(u.id);
                        setEditing(false);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center text-[10px] text-accent font-bold">
                          {u.full_name?.charAt(0) || u.username?.charAt(0) || "?"}
                        </div>
                        <span className="text-xs text-textPrimary">
                          {u.full_name || u.username}
                        </span>
                      </div>
                      {isSelected && !isSaving && (
                        <Check size={12} className="text-accent" />
                      )}
                      {isSaving && (
                        <div className="animate-spin h-3 w-3 border-2 border-accent border-t-transparent rounded-full" />
                      )}
                    </div>
                  );
                })}
                {orgUsers.length === 0 && (
                  <div className="p-4 text-textSecondary text-xs text-center italic">
                    {t("contextDrawer.noUsersFound")}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center min-h-[32px] group" ref={dropdownRef}>
      <div className={`w-[160px] flex items-center gap-2 text-textSecondary ${isRTL ? "flex-row" : ""}`}>
        {Icon && <Icon size={14} className="opacity-70" />}
        <span className="text-sm truncate">{label}</span>
      </div>
      <div className="flex-1">
        {isListType ? (
          <div className="flex items-center relative">
            <select
              className={`bg-transparent ${canWrite ? "hover:bg-card-hover border-transparent hover:border-border/50 cursor-pointer" : "border-transparent cursor-default"} text-sm px-2 py-1 rounded w-full outline-none focus:border-accent transition-colors appearance-none font-medium ${isRTL ? "-mr-1 ps-8" : "-ml-1 pe-8"} ${getBadgeColor(val, field)} ${isSaving ? "opacity-50" : ""}`}
              value={val || ""}
              onChange={(e) => {
                setVal(e.target.value);
                handleSave(e.target.value);
              }}
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: isRTL ? "left 6px center" : "right 6px center",
                backgroundSize: "12px",
              }}
              disabled={!canWrite || isSaving}
            >
              {type === "status" && (
                <>
                  <option className="bg-drawer-bg" value="Todo">
                    Todo
                  </option>
                  <option className="bg-drawer-bg" value="In Progress">
                    In Progress
                  </option>
                  <option className="bg-drawer-bg" value="Done">
                    Done
                  </option>
                </>
              )}
              {type === "stage" &&
                (field === "direction" ? (
                  <>
                    <option className="bg-drawer-bg" value="received">
                      Received
                    </option>
                    <option className="bg-drawer-bg" value="sent">
                      Sent
                    </option>
                    <option className="bg-drawer-bg" value="system">
                      System
                    </option>
                  </>
                ) : field === "type" ? (
                  [
                    "email",
                    "call",
                    "meeting",
                    "msg",
                    "update",
                  ].map((t) => (
                    <option className="bg-drawer-bg" key={t} value={t}>
                      {t}
                    </option>
                  ))
                ) : field === "channel" ? (
                  ["email", "linkedin", "whatsapp", "system"].map((c) => (
                    <option className="bg-drawer-bg" key={c} value={c}>
                      {c}
                    </option>
                  ))
                ) : (
                  customStages.map((s) => (
                    <option
                      className="bg-drawer-bg"
                      key={typeof s === "object" ? s.label : s}
                      value={typeof s === "object" ? s.label : s}
                    >
                      {typeof s === "object" ? s.label : s}
                    </option>
                  ))
                ))}
              {type === "leadType" &&
                customLeadTypes.map((t) => (
                  <option
                    className="bg-drawer-bg"
                    key={typeof t === "object" ? t.label : t}
                    value={typeof t === "object" ? t.label : t}
                  >
                    {typeof t === "object" ? t.label : t}
                  </option>
                ))}
              {type === "leadSource" &&
                customLeadSources.map((s) => (
                  <option
                    className="bg-drawer-bg"
                    key={typeof s === "object" ? s.label : s}
                    value={typeof s === "object" ? s.label : s}
                  >
                    {typeof s === "object" ? s.label : s}
                  </option>
                ))}
            </select>
            {isSaving && (
              <div className="absolute right-6 top-1/2 -translate-y-1/2 animate-spin h-3 w-3 border-2 border-accent border-t-transparent rounded-full" />
            )}
          </div>
        ) : type === "textarea" && editing ? (
          <div className="relative z-[60]">
            <div
              className={`absolute top-0 left-0 w-[300px] min-h-[120px] bg-dropdown-bg border shadow-2xl rounded-md p-2 animate-in zoom-in-95 ${error ? "border-red-500" : "border-border"}`}
            >
              <textarea
                autoFocus
                dir="auto"
                className="w-full min-h-[100px] bg-transparent text-textPrimary text-sm outline-none resize-none border-0"
                value={val || ""}
                onChange={(e) => setVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    handleSave(val);
                  }
                  if (e.key === "Escape") setEditing(false);
                }}
                disabled={isSaving}
              />
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50 text-[10px] text-textSecondary">
                <span>{t("contextDrawer.pressCmdEnterToSave")}</span>
                <div className="flex items-center gap-2">
                  {isSaving && (
                    <div className="animate-spin h-3 w-3 border-2 border-accent border-t-transparent rounded-full" />
                  )}
                  <button
                    onClick={() => handleSave(val)}
                    className="px-2 py-1 bg-accent text-white rounded hover:bg-blue-600 transition-colors"
                    disabled={isSaving}
                  >
                    {t("contextDrawer.save")}
                  </button>
                </div>
              </div>
              {error && (
                <div className="text-red-500 text-[10px] mt-1">{error}</div>
              )}
            </div>
          </div>
        ) : editing ? (
          <div className="flex items-center gap-1 w-full relative">
            <input
              ref={inputRef}
              dir="auto"
              type={type === "number" ? "number" : "text"}
              className={`bg-input-bg border text-sm p-1 rounded outline-none text-textPrimary ${type === "number" ? "w-20" : "w-full"} ${error ? "border-red-500" : "border-accent"}`}
              value={val || ""}
              onChange={(e) => setVal(e.target.value)}
              onKeyDown={handleKeyDown}
              title={error || ""}
            />
            {type === "number" && (
              <span className="text-textSecondary text-sm">%</span>
            )}
            {isSaving && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 animate-spin h-3 w-3 border-2 border-accent border-t-transparent rounded-full" />
            )}
          </div>
        ) : (
          <div
            onClick={canWrite ? () => {
              setVal(value);
              setEditing(true);
            } : undefined}
            className={`text-sm ${canWrite ? "cursor-pointer hover:bg-card-hover border-transparent hover:border-border/50" : "cursor-default border-transparent"} px-2 py-1 rounded flex items-center gap-2 border transition-colors min-h-[28px] w-full group/prop relative ${isRTL ? "-ms-1 me-0" : "-ml-1 me-0"} ${error ? "border-red-500 bg-red-500/10" : ""}`}
            title={error || ""}
          >
            {type === "number" && value !== undefined && (
              <ConversionCircle percentage={Number(value)} />
            )}
            {isBadge || isListType ? (
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${getBadgeColor(value, field)}`}>
                {value}
              </span>
            ) : (
              <span className="text-textPrimary break-words">
                {value !== undefined && value !== "" && value !== null ? (
                  type === "number" ? (
                    `${value}%`
                  ) : (
                    <LinkifiedText text={String(value)} />
                  )
                ) : (
                  <span className="text-textSecondary opacity-50 italic text-xs">
                    {t("contextDrawer.notSet")}
                  </span>
                )}
              </span>
            )}

            {/* Quick Action Buttons - Floating Overlay */}
            {value && (
              <div className={`hidden group-hover/prop:flex items-center gap-1 absolute top-1/2 -translate-y-1/2 bg-menu-section-bg shadow-xl border border-border/50 rounded-md p-1 z-10 animate-in fade-in zoom-in-95 duration-100 ${isRTL ? "left-1" : "right-1"}`}>
                {(field === "phone" || (field === "channel" && value === "whatsapp")) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const num = String(value).replace(/[^0-9]/g, "");
                      const formattedNum = num.startsWith("+")
                        ? num
                        : `+${num}`;
                      window.open(`https://wa.me/${formattedNum}`, "_blank");
                    }}
                    className="p-1 hover:bg-card-hover-light rounded text-green-500 transition-colors"
                    title={t("contextDrawer.openWhatsApp")}
                  >
                    <ExternalLink size={12} />
                  </button>
                )}
              </div>
            )}

            {isSaving && (
              <div className={`animate-spin h-3 w-3 border-2 border-accent border-t-transparent rounded-full ${isRTL ? "ms-auto" : "ml-auto"}`} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// --- TABS CONTENT ---

const ContextTab = ({
  data,
  type,
  onOpenAutoMsgParser,
  canWrite,
}: {
  data: any;
  type: string;
  onOpenAutoMsgParser: (id: string) => void;
  canWrite: boolean;
}) => {
  const { t } = useTranslation();
  const { activities, closeDrawer, fetchActivities, addActivity } = useStore();
  const navigate = useNavigate();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Add Activity Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newActivityType, setNewActivityType] = useState("email");
  const [newActivityTitle, setNewActivityTitle] = useState("");
  const [newActivityContent, setNewActivityContent] = useState("");
  const [newActivityChannel, setNewActivityChannel] =
    useState<Channel>("email");
  const [newActivityDirection, setNewActivityDirection] =
    useState<Direction>("sent");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (type === "person") fetchActivities({ related_person: data.id }, true);
    else if (type === "company")
      fetchActivities({ related_company: data.id }, true);
  }, [data.id, type, fetchActivities]);

  // Date parsing helper
  const parseActivityDate = (dateStr: string) => {
    if (!dateStr) return 0;
    if (dateStr === "Just now") return new Date().getTime();

    // Try parsing as ISO string/Date first
    const parsed = Date.parse(dateStr);
    if (!isNaN(parsed)) return parsed;

    // Fallback to relative time logic
    const now = new Date().getTime();
    const num = parseInt(dateStr.match(/\d+/)?.[0] || "0");
    if (dateStr.includes("min")) return now - num * 60 * 1000;
    if (dateStr.includes("hour")) return now - num * 60 * 60 * 1000;
    if (dateStr.includes("day")) return now - num * 24 * 60 * 60 * 1000;
    if (dateStr.includes("week")) return now - num * 7 * 24 * 60 * 60 * 1000;
    return 0;
  };

  const relatedActivities = activities
    .filter(
      (a) =>
        (type === "person" && a.relatedPersonId === data.id) ||
        (type === "company" && a.relatedCompanyId === data.id),
    )
    .sort((a, b) => parseActivityDate(a.date) - parseActivityDate(b.date));

  // Get last 5
  const recentActivities = relatedActivities.slice(-5);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [recentActivities]);

  const handleCopyContext = () => {
    const text = relatedActivities
      .map((a) => {
        const timestamp = parseActivityDate(a.date);
        const time = format(new Date(timestamp), "yyyy-MM-dd HH:mm");
        const sender = a.direction === "sent" ? "Me" : data.name || "User";
        return `[${time}] ${sender} (${a.channel}): ${a.content}`;
      })
      .join("\n\n");

    navigator.clipboard.writeText(text);
    toast.success(t("contextTab.conversationCopied"));
  };

  const handleCreateActivity = async () => {
    if (!newActivityTitle || !newActivityContent) {
      toast.error(t("contextTab.fillTitleAndContent"));
      return;
    }

    setIsCreating(true);
    try {
      const activityData: any = {
        type: newActivityType,
        channel: newActivityChannel,
        direction: newActivityDirection,
        title: newActivityTitle,
        content: newActivityContent,
        date: new Date().toISOString(),
      };

      if (type === "person") {
        activityData.relatedPersonId = data.id;
      } else if (type === "company") {
        activityData.relatedCompanyId = data.id;
      }

      await addActivity(activityData);

      toast.success(t("contextTab.activityAdded"));
      setIsAddModalOpen(false);
      setNewActivityTitle("");
      setNewActivityContent("");
      setNewActivityType("email");
      setNewActivityChannel("email");
      setNewActivityDirection("sent");
    } catch (err) {
      console.error("Failed to add activity:", err);
      toast.error(t("contextTab.activityAddFailed"));
    } finally {
      setIsCreating(false);
    }
  };

  const handleViewAll = () => {
    const state = { initialTab: "Context" };
    if (type === "person") navigate(`/people/${data.id}`, { state });
    else if (type === "company") navigate(`/companies/${data.id}`, { state });
    else if (type === "opportunity")
      navigate(`/opportunities/${data.id}`, { state });
    closeDrawer();
  };

  const ChannelIcon = ({ channel }: { channel?: string }) => {
    switch (channel) {
      case "linkedin":
        return <Linkedin size={10} className="text-linkedin" />;
      case "email":
        return <Mail size={10} className="text-yellow-500" />;
      case "whatsapp":
        return <MessageCircle size={10} className="text-green-500" />;
      default:
        return <Activity size={10} />;
    }
  };

  // Grouping Logic
  const groupedActivities: {
    [key: string]: {
      dateLabel: string;
      timestamp: number;
      items: ActivityLog[];
    };
  } = {};
  recentActivities.forEach((act) => {
    const timestamp = parseActivityDate(act.date);
    const date = new Date(timestamp);
    let dateKey = format(date, "MMM d, yyyy");
    if (isToday(date)) dateKey = "Today";
    else if (isYesterday(date)) dateKey = "Yesterday";

    if (!groupedActivities[dateKey]) {
      groupedActivities[dateKey] = {
        dateLabel: dateKey,
        timestamp: timestamp,
        items: [],
      };
    }
    groupedActivities[dateKey].items.push(act);
  });

  const sortedGroups = Object.values(groupedActivities).sort(
    (a, b) => a.timestamp - b.timestamp,
  );

  // Sort items within groups by timestamp (Oldest -> Newest)
  sortedGroups.forEach((group) => {
    group.items.sort(
      (a, b) => parseActivityDate(a.date) - parseActivityDate(b.date),
    );
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-6 px-1">
        {relatedActivities.length > 0 && (
          <div className="flex justify-between items-center px-2 gap-4">
            {canWrite && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="text-xs flex items-center gap-1.5 bg-accent/10 hover:bg-accent/20 text-accent px-3 py-1.5 rounded border border-accent/20 transition-colors font-medium cursor-pointer"
              >
                <Plus size={12} />
                <span>{t("contextTab.addActivity")}</span>
              </button>
            )}
            <div className={`flex items-center gap-4 ${!canWrite ? "ms-auto" : ""}`}>
              <button
                onClick={handleCopyContext}
                className="text-xs flex items-center gap-1.5 text-textSecondary hover:text-textPrimary transition-colors cursor-pointer"
                title="Copy full conversation"
              >
                <Copy size={12} />
                <span>{t("contextTab.copyHistory")}</span>
              </button>
            </div>
          </div>
        )}

        {recentActivities.length === 0 && (
          <div className="text-center text-textSecondary py-10">
            <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm mb-4">{t("contextTab.noRecentConversation")}</p>
            {canWrite && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-accent/10 hover:bg-accent/20 text-accent rounded-lg border border-accent/20 transition-colors font-medium mx-auto cursor-pointer"
              >
                <Plus size={14} />
                <span>{t("contextTab.addFirstActivity")}</span>
              </button>
            )}
          </div>
        )}

        {sortedGroups.map((group) => (
          <div key={group.dateLabel} className="space-y-4">
            <div className="flex justify-center sticky top-0 z-10 py-1">
              <span className="px-2 py-0.5 bg-card-hover text-textSecondary text-[10px] uppercase font-bold rounded-full border border-border/50 shadow-sm">
                {group.dateLabel}
              </span>
            </div>
            {group.items.map((act) => {
              const isSent = act.direction === "sent";
              const timestamp = parseActivityDate(act.date);
              const timeStr = format(new Date(timestamp), "HH:mm");

              return (
                <div
                  key={act.id}
                  className={`flex w-full ${isSent ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[90%] flex gap-2 ${isSent ? "flex-row-reverse" : "flex-row"}`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${isSent ? "bg-orange-500 text-white" : "bg-card-hover text-textPrimary"}`}
                    >
                      {isSent ? "Y" : act.userId?.charAt(0)}
                    </div>
                    <div className="flex flex-col gap-1">
                      <div
                        dir="auto"
                        className={`rounded-lg p-3 text-xs whitespace-pre-wrap border ${isSent ? "bg-table-row-selected border-card-hover-light" : "bg-drawer-bg border-border"}`}
                      >
                        <LinkifiedText text={act.content} />
                      </div>
                      <div
                        className={`flex items-center gap-1.5 text-[10px] text-textSecondary ${isSent ? "justify-end" : "justify-start"}`}
                      >
                        <ChannelIcon channel={act.channel} />
                        <span className="capitalize">{act.channel}</span>
                        <span>•</span>
                        <span>{timeStr}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="mt-4 pt-4 border-t border-border sticky bottom-0 bg-drawer-bg">
        <button
          onClick={handleViewAll}
          className="w-full py-2 bg-card-hover hover:bg-card-hover-light rounded text-sm text-textPrimary flex items-center justify-center gap-2 transition-colors border border-border"
        >
          <span>{t("contextTab.viewFullConversation")}</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {/* Add Activity Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[550px] bg-card-bg border-border text-textPrimary z-[100] shadow-2xl p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-dropdown-bg">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Plus className="w-5 h-5 text-accent" />
              {t("contextTab.addNewActivity")}
            </DialogTitle>
            <DialogDescription className="text-textSecondary text-[11px] mt-1 font-medium italic">
              {t("recordPage.logActivityFor", { name: data.name || "this record" })}
            </DialogDescription>
          </div>

          <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-textSecondary uppercase tracking-widest flex items-center gap-1.5">
                  <Hash size={10} /> {t("recordPage.activityType")}
                </label>
                <select
                  value={newActivityType}
                  onChange={(e) => setNewActivityType(e.target.value)}
                  className="w-full bg-textarea-bg border border-border rounded-lg px-3 py-2.5 text-sm text-textPrimary outline-none focus:ring-1 focus:ring-accent transition-all hover:border-border/80"
                >
                  <option value="email">{t("contextTab.optionEmail")}</option>
                  <option value="call">{t("contextTab.optionCall")}</option>
                  <option value="meeting">{t("contextTab.optionMeeting")}</option>
                  <option value="msg">{t("contextDrawer.message")}</option>
                  <option value="update">{t("contextTab.optionUpdate")}</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-textSecondary uppercase tracking-widest flex items-center gap-1.5">
                  <MessageCircle size={10} /> {t("recordPage.channel")}
                </label>
                <select
                  value={newActivityChannel}
                  onChange={(e) =>
                    setNewActivityChannel(e.target.value as Channel)
                  }
                  className="w-full bg-textarea-bg border border-border rounded-lg px-3 py-2.5 text-sm text-textPrimary outline-none focus:ring-1 focus:ring-accent transition-all hover:border-border/80"
                >
                  <option value="email">{t("contextTab.optionEmail")}</option>
                  <option value="linkedin">{t("contextTab.optionLinkedin")}</option>
                  <option value="whatsapp">{t("contextTab.optionWhatsApp")}</option>
                  <option value="system">{t("contextTab.optionSystem")}</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-textSecondary uppercase tracking-widest flex items-center gap-1.5">
                <ArrowRight size={10} /> {t("recordPage.direction")}
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setNewActivityDirection("sent")}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    newActivityDirection === "sent"
                      ? "bg-accent/20 text-accent border border-accent/40"
                      : "bg-textarea-bg text-textSecondary border border-border hover:border-border/80"
                  }`}
                >
                  {t("contextTab.sentOutgoing")}
                </button>
                <button
                  onClick={() => setNewActivityDirection("received")}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    newActivityDirection === "received"
                      ? "bg-accent/20 text-accent border border-accent/40"
                      : "bg-textarea-bg text-textSecondary border border-border hover:border-border/80"
                  }`}
                >
                  {t("contextTab.receivedIncoming")}
                </button>
                <button
                  onClick={() => setNewActivityDirection("system")}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    newActivityDirection === "system"
                      ? "bg-accent/20 text-accent border border-accent/40"
                      : "bg-textarea-bg text-textSecondary border border-border hover:border-border/80"
                  }`}
                >
                  {t("contextTab.internal")}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-textSecondary uppercase tracking-widest flex items-center gap-1.5">
                <FileText size={10} /> {t("recordPage.activityTitle")}
              </label>
              <input
                type="text"
                value={newActivityTitle}
                onChange={(e) => setNewActivityTitle(e.target.value)}
                placeholder={t("contextTab.activityTitlePlaceholder")}
                className="w-full bg-textarea-bg border border-border rounded-lg px-3 py-2.5 text-sm text-textPrimary outline-none focus:ring-1 focus:ring-accent transition-all hover:border-border/80"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-textSecondary uppercase tracking-widest flex items-center gap-1.5">
                <AlignLeft size={10} /> {t("recordPage.content")}
              </label>
              <textarea
                value={newActivityContent}
                onChange={(e) => setNewActivityContent(e.target.value)}
                placeholder={t("contextTab.activityContentPlaceholder")}
                className="w-full bg-textarea-bg border border-border rounded-lg px-3 py-2.5 text-sm text-textPrimary outline-none focus:ring-1 focus:ring-accent min-h-[150px] resize-none transition-all hover:border-border/80 custom-scrollbar"
              />
            </div>
          </div>

          <div className="px-6 py-4 border-t border-border bg-dropdown-bg flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => setIsAddModalOpen(false)}
              className="text-textSecondary hover:text-textPrimary"
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleCreateActivity}
              disabled={isCreating || !newActivityTitle || !newActivityContent}
              className="bg-accent hover:bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  {t("common.loading")}
                </>
              ) : (
                <>
                  <Plus size={14} />
                  {t("contextTab.addActivity")}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const HomeTab = ({
  data,
  type,
  canWrite,
  isFieldHidden,
}: {
  data: any;
  type: string;
  canWrite: boolean;
  isFieldHidden: (f: string) => boolean;
}) => {
  const { t } = useTranslation();
  const { language } = useStore();
  const isRTL = language === "ar";
  const {
    people,
    companies,
    pushDrawer,
    updatePerson,
    updateCompany,
    updateTask,
    updateOpportunity,
    updateNote,
    updateActivity,
    activities,
    tasks,
    orgUsers,
  } = useStore();
  const [editingTaskDesc, setEditingTaskDesc] = useState(false);
  const [editingNoteContent, setEditingNoteContent] = useState(false);
  const [editingActivityContent, setEditingActivityContent] = useState(false);

  const handleRelationClick = (
    id: string | undefined,
    type: "person" | "company",
  ) => {
    if (id) pushDrawer({ id, type });
  };

  return (
    <div className="space-y-1">
      {type === "activity" && (
        <>
          {!isFieldHidden("type") && (
            <EditablePropertyRow
              icon={Hash}
              label={t("contextDrawer.type")}
              field="type"
              value={data.type}
              type="stage"
              canWrite={canWrite}
              onSave={(v: any) => updateActivity(data.id, { type: v })}
            />
          )}
          {!isFieldHidden("direction") && (
            <EditablePropertyRow
              icon={ArrowUpRight}
              label={t("contextDrawer.direction")}
              field="direction"
              value={data.direction}
              type="stage"
              canWrite={canWrite}
              onSave={(v: any) => updateActivity(data.id, { direction: v })}
            />
          )}
          {!isFieldHidden("channel") && (
            <EditablePropertyRow
              icon={Globe}
              label={t("contextDrawer.channel")}
              field="channel"
              value={data.channel}
              type="stage"
              canWrite={canWrite}
              onSave={(v: any) => updateActivity(data.id, { channel: v })}
            />
          )}
          {!isFieldHidden("date") && (
            <EditablePropertyRow
              icon={Calendar}
              label={t("contextDrawer.date")}
              field="date"
              value={data.date}
              type="date"
              canWrite={canWrite}
              onSave={(v: any) => updateActivity(data.id, { date: v })}
            />
          )}
          <EditablePropertyRow
            label={t("contextDrawer.relations")}
            field="relations"
            value={{
              relatedPersonId: data.relatedPersonId,
              relatedCompanyId: data.relatedCompanyId,
              personName: data.personName,
              companyName: data.companyName,
            }}
            type="relation"
            canWrite={canWrite}
            onSave={(v: any) => updateActivity(data.id, v)}
          />
          {!isFieldHidden("content") && (
            <div className="mt-4">
              <label className="text-xs font-semibold text-textSecondary uppercase mb-2 block">
                {t("contextDrawer.content")}
              </label>
              {editingActivityContent && canWrite ? (
                <textarea
                  dir="auto"
                  autoFocus
                  className="w-full bg-table-row-hover border border-border rounded p-3 text-sm text-textPrimary min-h-[150px] outline-none focus:border-accent"
                  placeholder={t("contextDrawer.activityDetails")}
                  defaultValue={data.content}
                  onBlur={(e) => {
                    updateActivity(data.id, { content: e.target.value });
                    setEditingActivityContent(false);
                  }}
                />
              ) : (
                <div
                  dir="auto"
                  onClick={canWrite ? () => setEditingActivityContent(true) : undefined}
                  className={`w-full bg-table-row-hover border border-border rounded p-3 text-sm text-textPrimary min-h-[150px] outline-none focus:border-accent ${canWrite ? "cursor-text" : "cursor-default"} whitespace-pre-wrap`}
                >
                  {data.content ? (
                    <LinkifiedText text={data.content} />
                  ) : (
                    <span className="opacity-50">{t("contextDrawer.activityDetails")}</span>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {type === "person" && (
        <>
          {!isFieldHidden("city") && (
            <EditablePropertyRow
              icon={MapPin}
              label={t("contextDrawer.city")}
              value={data.city}
              canWrite={canWrite}
              onSave={(v: any) => updatePerson(data.id, { city: v })}
            />
          )}
          {!isFieldHidden("email") && (
            <EditablePropertyRow
              icon={Mail}
              label={t("contextDrawer.emails")}
              value={data.email}
              isBadge
              canWrite={canWrite}
              onSave={(v: any) => updatePerson(data.id, { email: v })}
            />
          )}
          {!isFieldHidden("jobTitle") && (
            <EditablePropertyRow
              icon={AlignLeft}
              label={t("contextDrawer.jobTitle")}
              value={data.jobTitle}
              canWrite={canWrite}
              onSave={(v: any) => updatePerson(data.id, { jobTitle: v })}
            />
          )}
          {!isFieldHidden("linkedin") && (
            <EditablePropertyRow
              icon={Linkedin}
              label={t("contextDrawer.linkedin")}
              value={data.linkedin}
              canWrite={canWrite}
              onSave={(v: any) => updatePerson(data.id, { linkedin: v })}
            />
          )}
          {!isFieldHidden("companyName") && (
            <EditablePropertyRow
              icon={Building}
              label={t("contextDrawer.company")}
              value={data.companyName}
              type="companySelect"
              canWrite={canWrite}
              onSave={(v: any) => {
                if (v && typeof v === "object" && "name" in v) {
                  return updatePerson(data.id, {
                    companyName: v.name,
                    companyId: v.id,
                  });
                }
              }}
            />
          )}
          {!isFieldHidden("phone") && (
            <EditablePropertyRow
              icon={Phone}
              label={t("contextDrawer.phones")}
              field="phone"
              value={data.phone}
              canWrite={canWrite}
              onSave={(v: any) => updatePerson(data.id, { phone: v })}
            />
          )}
          <div className="h-px bg-border/50 my-6" />
          {!isFieldHidden("leadType") && (
            <EditablePropertyRow
              icon={Target}
              label={t("contextDrawer.type")}
              value={data.leadType}
              field="leadType"
              type="leadType"
              canWrite={canWrite}
              onSave={(v: any) => updatePerson(data.id, { leadType: v })}
            />
          )}
          {!isFieldHidden("leadSource") && (
            <EditablePropertyRow
              icon={Sparkles}
              label={t("contextDrawer.source")}
              value={data.leadSource}
              field="leadSource"
              type="leadSource"
              canWrite={canWrite}
              onSave={(v: any) => updatePerson(data.id, { leadSource: v })}
            />
          )}
          {!isFieldHidden("stage") && (
            <EditablePropertyRow
              icon={Activity}
              label={t("contextDrawer.stage")}
              value={data.stage}
              field="stage"
              type="stage"
              canWrite={canWrite}
              onSave={(v: any) => updatePerson(data.id, { stage: v })}
            />
          )}
          {!isFieldHidden("conversionRate") && (
            <EditablePropertyRow
              icon={PieChart}
              label={t("contextDrawer.convert")}
              value={data.conversionRate}
              type="number"
              canWrite={canWrite}
              onSave={(v: any) =>
                updatePerson(data.id, { conversionRate: Number(v) })
              }
            />
          )}
          {!isFieldHidden("lastAction") && (
            <EditablePropertyRow
              icon={MessageSquare}
              label={t("contextDrawer.lastAction")}
              value={data.lastAction}
              type="textarea"
              canWrite={canWrite}
              onSave={(v: any) => updatePerson(data.id, { lastAction: v })}
            />
          )}
        </>
      )}

      {type === "company" && (
        <>
          {!isFieldHidden("domain") && (
            <EditablePropertyRow
              icon={Globe}
              label={t("contextDrawer.domain")}
              value={data.domain}
              isBadge
              canWrite={canWrite}
              onSave={(v: any) => updateCompany(data.id, { domain: v })}
            />
          )}
          {!isFieldHidden("linkedin") && (
            <EditablePropertyRow
              icon={Linkedin}
              label={t("contextDrawer.linkedin")}
              value={data.linkedin}
              canWrite={canWrite}
              onSave={(v: any) => updateCompany(data.id, { linkedin: v })}
            />
          )}
          {!isFieldHidden("employees") && (
            <EditablePropertyRow
              icon={Users}
              label={t("contextDrawer.employees")}
              value={data.employees}
              canWrite={canWrite}
              onSave={(v: any) => updateCompany(data.id, { employees: v })}
            />
          )}
          {!isFieldHidden("location") && (
            <EditablePropertyRow
              icon={MapPin}
              label={t("contextDrawer.location")}
              value={data.location}
              canWrite={canWrite}
              onSave={(v: any) => updateCompany(data.id, { location: v })}
            />
          )}
          {!isFieldHidden("arr") && (
            <EditablePropertyRow
              icon={DollarSign}
              label={t("contextDrawer.arr")}
              value={data.arr}
              canWrite={canWrite}
              onSave={(v: any) => updateCompany(data.id, { arr: v })}
            />
          )}
          {!isFieldHidden("icp") && (
            <div className="flex items-center min-h-[32px] group">
              <div className="w-[160px] flex items-center gap-2 text-textSecondary">
                <Check size={14} className="opacity-70" />
                <span className="text-sm">{t("contextDrawer.icp")}</span>
              </div>
              <input
                type="checkbox"
                checked={data.icp}
                disabled={!canWrite}
                onChange={(e) =>
                  updateCompany(data.id, { icp: e.target.checked })
                }
                className={`rounded border-gray-600 bg-transparent accent-accent ${canWrite ? "cursor-pointer" : "cursor-default opacity-50"}`}
              />
            </div>
          )}
        </>
      )}

      {type === "task" && (
        <>
          <EditablePropertyRow
            label={t("contextDrawer.status")}
            value={data.status}
            field="status"
            type="status"
            canWrite={canWrite}
            onSave={(v: any) => updateTask(data.id, { status: v })}
          />
          <EditablePropertyRow
            label={t("contextDrawer.dueDate")}
            value={data.dueDate}
            type="date"
            canWrite={canWrite}
            onSave={(v: any) => updateTask(data.id, { dueDate: v })}
          />
          <EditablePropertyRow
            label={t("contextDrawer.assignee")}
            value={data.assignee}
            field={data.assigneeId}
            type="assignee"
            canWrite={canWrite}
            onSave={(v: any) => updateTask(data.id, { assigneeId: v, assignee: v ? (orgUsers.find((u: any) => String(u.id) === String(v)) as any)?.full_name || (orgUsers.find((u: any) => String(u.id) === String(v)) as any)?.username || "Unknown" : "" })}
          />
          <EditablePropertyRow
            label={t("contextDrawer.relations")}
            value={{
              relatedPersonId: data.relatedPersonId,
              relatedCompanyId: data.relatedCompanyId,
              personName: data.personName,
              companyName: data.companyName,
            }}
            type="relation"
            canWrite={canWrite}
            onSave={(v: any) => updateTask(data.id, v)}
          />
          {!isFieldHidden("content") && (
            <div className="mt-4">
              <label className="text-xs font-semibold text-textSecondary uppercase mb-2 block">
                {t("contextDrawer.description")}
              </label>
              {editingTaskDesc && canWrite ? (
                <textarea
                  dir="auto"
                  autoFocus
                  className="w-full bg-table-row-hover border border-border rounded p-3 text-sm text-textSecondary min-h-[100px] outline-none focus:border-accent"
                  placeholder={t("contextDrawer.addDetails")}
                  defaultValue={data.description}
                  onBlur={(e) => {
                    updateTask(data.id, { description: e.target.value });
                    setEditingTaskDesc(false);
                  }}
                />
              ) : (
                <div
                  dir="auto"
                  onClick={canWrite ? () => setEditingTaskDesc(true) : undefined}
                  className={`w-full bg-table-row-hover border border-border rounded p-3 text-sm text-textSecondary min-h-[100px] outline-none focus:border-accent ${canWrite ? "cursor-text" : "cursor-default"} whitespace-pre-wrap`}
                >
                  {data.description ? (
                    <LinkifiedText text={data.description} />
                  ) : (
                    <span className="opacity-50">{t("contextDrawer.addDetails")}</span>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {type === "note" && (
        <>
          <div className="flex items-center min-h-[32px]">
            <div className={`w-[160px] flex items-center gap-2 text-textSecondary ${isRTL ? "flex-row" : ""}`}>
              <Calendar size={14} className="opacity-70" />
              <span className="text-sm">{t("contextDrawer.created")} </span>
            </div>
            <div className="text-sm text-textPrimary">
              {format(new Date(data.createdAt), "MMM d, yyyy")}
            </div>
          </div>
          <EditablePropertyRow
            label={t("contextDrawer.relations")}
            value={{
              relatedPersonId: data.relatedPersonId,
              relatedCompanyId: data.relatedCompanyId,
              personName: data.personName,
              companyName: data.companyName,
            }}
            type="relation"
            canWrite={canWrite}
            onSave={(v: any) => updateNote(data.id, v)}
          />
          {!isFieldHidden("content") && (
            <div className="mt-4">
              {editingNoteContent && canWrite ? (
                <textarea
                  dir="auto"
                  autoFocus
                  className="w-full bg-table-row-hover border border-border rounded p-3 text-sm text-textPrimary min-h-[200px] outline-none font-mono focus:border-accent"
                  placeholder={t("contextDrawer.typeYourNote")}
                  defaultValue={data.content}
                  onBlur={(e) => {
                    updateNote(data.id, { content: e.target.value });
                    setEditingNoteContent(false);
                  }}
                />
              ) : (
                <div
                  dir="auto"
                  onClick={canWrite ? () => setEditingNoteContent(true) : undefined}
                  className={`w-full bg-table-row-hover border border-border rounded p-3 text-sm text-textPrimary min-h-[200px] outline-none font-mono focus:border-accent ${canWrite ? "cursor-text" : "cursor-default"} whitespace-pre-wrap`}
                >
                  {data.content ? (
                    <LinkifiedText text={data.content} />
                  ) : (
                    <span className="opacity-50">{t("contextDrawer.typeYourNote")}</span>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

const ActionsTab = ({ data, type }: { data: any; type: string }) => {
  const { t } = useTranslation();
  const { language } = useStore();
  const isRTL = language === "ar";
  const { activities, updatePerson, updateCompany } = useStore();
  const [editingLastAction, setEditingLastAction] = useState(false);
  const [editingRecommendedAction, setEditingRecommendedAction] =
    useState(false);
  const [lastActionValue, setLastActionValue] = useState(data.lastAction || "");
  const [recommendedActionValue, setRecommendedActionValue] = useState(data.recommendedAction || "");

  // Sync local state when data changes
  useEffect(() => {
    setLastActionValue(data.lastAction || "");
  }, [data.lastAction]);

  useEffect(() => {
    setRecommendedActionValue(data.recommendedAction || "");
  }, [data.recommendedAction]);

  // Date parsing helper
  const parseRelativeTime = (timeStr: string) => {
    if (!timeStr) return 0;
    if (timeStr === "Just now") return new Date().getTime();
    const parsed = Date.parse(timeStr);
    if (!isNaN(parsed)) return parsed;
    const now = new Date().getTime();
    const num = parseInt(timeStr.match(/\d+/)?.[0] || "0");
    if (timeStr.includes("min")) return now - num * 60 * 1000;
    if (timeStr.includes("hour")) return now - num * 60 * 60 * 1000;
    if (timeStr.includes("day")) return now - num * 24 * 60 * 60 * 1000;
    if (timeStr.includes("week")) return now - num * 7 * 24 * 60 * 60 * 1000;
    return 0;
  };

  const relatedActivities = activities
    .filter(
      (a) =>
        (type === "person" && a.relatedPersonId === data.id) ||
        (type === "company" && a.relatedCompanyId === data.id),
    )
    .sort((a, b) => parseRelativeTime(a.date) - parseRelativeTime(b.date));

  const lastMsg =
    relatedActivities.length > 0
      ? relatedActivities[relatedActivities.length - 1]
      : null;

  return (
    <div className="space-y-6">
      <div className="bg-table-row-hover p-4 rounded-lg border border-border">
        <span className="text-[10px] font-bold text-textSecondary uppercase block mb-3">
          {t("recordPage.relationshipStatus")}
        </span>
        <div className="space-y-3">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-textSecondary uppercase">
              {t("recordPage.lastMessage")}
            </span>
            <div className="flex items-center gap-2 text-xs text-textPrimary italic">
              {lastMsg ? (
                <>
                  <ChannelIcon channel={lastMsg.channel} />
                  <span dir="auto" className="truncate">
                    "{lastMsg.content.substring(0, 60)}..."
                  </span>
                </>
              ) : (
                <span className="opacity-50">{t("recordPage.noMessagesYet")}</span>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-textSecondary uppercase">
              {t("contextDrawer.status")}
            </span>
            <div className="flex items-center gap-2">
              {lastMsg && lastMsg.direction === "sent" ? (
                <span className="px-2 py-0.5 bg-yellow-600/70 text-yellow-100 rounded text-[10px] font-bold border border-yellow-500/30">
                  {t("recordPage.waitingForResponse")}
                </span>
              ) : lastMsg && lastMsg.direction === "received" ? (
                <span className="px-2 py-0.5 bg-red-700/70 text-red-200 rounded text-[10px] font-bold border border-red-500/30">
                  {t("recordPage.followUpRequired")}
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-gray-700 text-gray-200 rounded text-[10px] font-bold">
                  {t("recordPage.neutral")}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-textSecondary uppercase block">
            {t("recordPage.lastActionTaken")}
          </label>
          {editingLastAction ? (
            <textarea
              dir="auto"
              autoFocus
              className="w-full bg-input-bg border border-border rounded-lg p-3 text-sm text-textPrimary outline-none focus:border-accent min-h-[80px] resize-none transition-colors"
              value={lastActionValue}
              placeholder={t("recordPage.lastActionPlaceholder")}
              onChange={(e) => setLastActionValue(e.target.value)}
              onBlur={(e) => {
                type === "person"
                  ? updatePerson(data.id, { lastAction: lastActionValue })
                  : updateCompany(data.id, { lastAction: lastActionValue });
                setEditingLastAction(false);
              }}
            />
          ) : (
            <div
              dir="auto"
              onClick={() => setEditingLastAction(true)}
              className="w-full bg-input-bg border border-border rounded-lg p-3 text-sm text-textPrimary outline-none focus:border-accent min-h-[80px] resize-none transition-colors cursor-text whitespace-pre-wrap"
            >
              {lastActionValue ? (
                <LinkifiedText text={lastActionValue} />
              ) : (
                <span className="opacity-50">
                  {t("recordPage.lastActionPlaceholder")}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-accent uppercase block">
              {t("recordPage.recommendedNextStep")}
            </label>
          </div>
          {editingRecommendedAction ? (
            <textarea
              dir="auto"
              autoFocus
              className="w-full bg-input-bg border border-accent/30 rounded-lg p-3 text-sm text-textPrimary outline-none focus:border-accent min-h-[100px] resize-none transition-colors"
              value={recommendedActionValue}
              placeholder={t("recordPage.nextStepPlaceholder")}
              onChange={(e) => setRecommendedActionValue(e.target.value)}
              onBlur={(e) => {
                type === "person"
                  ? updatePerson(data.id, { recommendedAction: recommendedActionValue })
                  : updateCompany(data.id, { recommendedAction: recommendedActionValue });
                setEditingRecommendedAction(false);
              }}
            />
          ) : (
            <div
              dir="auto"
              onClick={() => setEditingRecommendedAction(true)}
              className="w-full bg-input-bg border border-accent/30 rounded-lg p-3 text-sm text-textPrimary outline-none focus:border-accent min-h-[100px] resize-none transition-colors cursor-text whitespace-pre-wrap"
            >
              {recommendedActionValue ? (
                <LinkifiedText text={recommendedActionValue} />
              ) : (
                <span className="opacity-50">{t("recordPage.nextStepPlaceholder")}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TasksTab = ({
  parentId,
  parentType,
  canWrite,
}: {
  parentId: string;
  parentType: string;
  canWrite: boolean;
}) => {
  const { t } = useTranslation();
  const { tasks, addTask, pushDrawer, user, fetchTasks, updateTask } =
    useStore();
  const [, forceUpdate] = useState({});

  useEffect(() => {
    if (parentType === "person") fetchTasks({ related_person: parentId });
    else if (parentType === "company")
      fetchTasks({ related_company: parentId });
  }, [parentId, parentType, fetchTasks]);

  // Filter tasks related to this parent
  const allRelatedTasks = tasks.filter(
    (t) =>
      (parentType === "person" && t.relatedPersonId === parentId) ||
      (parentType === "company" && t.relatedCompanyId === parentId),
  );

  // Sort with pinned items first
  const relatedTasks = sortWithPinnedFirst(parentId, "task", allRelatedTasks);

  const handleCreateTask = async () => {
    const newTask: Task = {
      id: Math.random().toString(),
      title: "Untitled",
      status: "Todo",
      dueDate: "",
      relatedPersonId: parentType === "person" ? parentId : undefined,
      relatedCompanyId: parentType === "company" ? parentId : undefined,
      assignee: user?.name || "Me",
      createdAt: "Just now",
    };
    const createdTask = await addTask(newTask);
    if (createdTask) {
      pushDrawer({ id: createdTask.id, type: "task" });
    }
  };

  const toggleTaskStatus = async (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    const newStatus = task.status === "Done" ? "Todo" : "Done";
    await updateTask(task.id, { status: newStatus });
    toast.success(t("tasksTab.taskMarkedAs", { status: newStatus }));
  };

  const handleTogglePin = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    togglePin(parentId, "task", taskId);
    forceUpdate({});
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-textSecondary">{t("tasksTab.allTasks")}</h3>
        {canWrite && (
          <button
            onClick={handleCreateTask}
            className="flex items-center gap-1.5 px-2 py-1 bg-card-hover hover:bg-card-hover-light rounded text-xs text-textPrimary border border-border transition-colors"
          >
            <Plus size={12} /> {t("tasksTab.addTask")}
          </button>
        )}
      </div>

      <div className="space-y-1">
        {relatedTasks.map((task) => {
          const pinned = isPinned(parentId, "task", task.id);
          return (
            <div
              key={task.id}
              className={`flex items-center gap-3 p-2 hover:bg-card-hover rounded group cursor-pointer border border-transparent hover:border-border/50 transition-colors ${pinned ? "bg-white/[0.03] border-accent/20" : ""}`}
              onClick={() => pushDrawer({ id: task.id, type: "task" })}
            >
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${task.status === "Done" ? "bg-green-500 border-green-500" : "border-textSecondary hover:border-textPrimary"} ${canWrite ? "cursor-pointer" : "cursor-default"}`}
                onClick={canWrite ? (e) => toggleTaskStatus(e, task) : (e) => e.stopPropagation()}
              >
                {task.status === "Done" && (
                  <Check size={10} className="text-black" />
                )}
              </div>
              <span
                className={`text-sm flex-1 ${task.status === "Done" ? "line-through text-textSecondary" : "text-textPrimary"}`}
              >
                <LinkifiedText text={task.title} />
              </span>
              <span className="text-xs text-textSecondary">
                {task.dueDate
                  ? format(new Date(task.dueDate), "MMM d, yyyy")
                  : ""}
              </span>
              <button
                onClick={(e) => handleTogglePin(e, task.id)}
                className={`p-1 rounded transition-colors ${pinned ? "text-accent hover:text-accent/80" : "text-textSecondary/30 hover:text-textSecondary opacity-0 group-hover:opacity-100"}`}
              >
                {pinned ? <Pin size={12} /> : <PinOff size={12} />}
              </button>
            </div>
          );
        })}
        {relatedTasks.length === 0 && (
          <div className="text-xs text-textSecondary opacity-50 px-2">
            {t("tasksTab.noTasksYet")}
          </div>
        )}
      </div>
    </div>
  );
};

const TimelineTab = ({
  data,
  type,
  canWrite,
}: {
  data: any;
  type: string;
  canWrite: boolean;
}) => {
  const { t } = useTranslation();
  const {
    interactions,
    interactionTypes,
    activities,
    fetchInteractions,
    fetchInteractionTypes,
    addInteraction,
    deleteInteractions,
    pushDrawer,
    fetchActivities,
    myAccess,
  } = useStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isInteractionTypeModalOpen, setIsInteractionTypeModalOpen] =
    useState(false);
  const [pendingModalToReopen, setPendingModalToReopen] = useState<
    "add" | "edit" | null
  >(null);

  // Activity Linking States
  const [activitySearchQuery, setActivitySearchQuery] = useState("");
  const [linkableActivities, setLinkableActivities] = useState<ActivityLog[]>(
    [],
  );
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(
    null,
  );
  const [showActivityCreation, setShowActivityCreation] = useState(false);

  // New Activity Form States
  const [newActivityType, setNewActivityType] = useState("email");
  const [newActivityTitle, setNewActivityTitle] = useState("");
  const [newActivityContent, setNewActivityContent] = useState("");
  const [selectedInteraction, setSelectedInteraction] =
    useState<InteractionLog | null>(null);
  const [newInteractionType, setNewInteractionType] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [interactionStep, setInteractionStep] = useState<1 | 2>(1);
  const [addInteractionDate, setAddInteractionDate] = useState<string>(new Date().toISOString());
  const [showAddDatePicker, setShowAddDatePicker] = useState(false);

  // Edit Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingInteraction, setEditingInteraction] =
    useState<InteractionLog | null>(null);
  const [editedDate, setEditedDate] = useState<string>("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Filter states for activity search
  const [activityTypeFilter, setActivityTypeFilter] = useState<string>("all");
  const [activityChannelFilter, setActivityChannelFilter] =
    useState<string>("all");

  // New activity fields from feedback
  const [newActivityChannel, setNewActivityChannel] =
    useState<Channel>("email");
  const [newActivityDirection, setNewActivityDirection] =
    useState<Direction>("sent");

  useEffect(() => {
    fetchInteractionTypes();
    if (type === "person") {
      fetchInteractions({ related_person: data.id });
    } else if (type === "company") {
      fetchInteractions({ related_company: data.id });
    }
  }, [data.id, type, fetchInteractionTypes, fetchInteractions]);

  const fetchLinkableActivities = async (search: string = "") => {
    setIsLoadingActivities(true);
    try {
      const params: any = { limit: 7 };
      if (type === "person") params.related_person = data.id;
      else if (type === "company") params.related_company = data.id;

      if (search) params.search = search;

      const response = await fetchActivities(params, true);
      // fetchActivities in store already updates the 'activities' array,
      // but we want a filtered subset for the modal specifically.
      // Since fetchActivities returns pagination info, we might need to filter manually or use a local fetch.

      // For now, we'll rely on the store's 'activities' being updated and filter them locally
      // to show only those matching the search and relation.
    } catch (err) {
      console.error("Failed to fetch linkable activities", err);
    } finally {
      setIsLoadingActivities(false);
    }
  };

  // Filter activities for the linking dropdown
  const filteredLinkableActivities = activities
    .filter((a) => {
      const matchesRelation =
        type === "person"
          ? a.relatedPersonId === data.id
          : a.relatedCompanyId === data.id;

      const matchesType =
        activityTypeFilter === "all" || a.type === activityTypeFilter;
      const matchesChannel =
        activityChannelFilter === "all" || a.channel === activityChannelFilter;

      const matchesSearch =
        !activitySearchQuery ||
        a.title?.toLowerCase().includes(activitySearchQuery.toLowerCase()) ||
        a.content?.toLowerCase().includes(activitySearchQuery.toLowerCase());

      return matchesRelation && matchesType && matchesChannel && matchesSearch;
    })
    .slice(0, 15); // Increased slice since we have filters now

  useEffect(() => {
    if (isAddModalOpen || isLinkModalOpen || isEditModalOpen) {
      fetchLinkableActivities();
    }
  }, [isAddModalOpen, isLinkModalOpen, isEditModalOpen]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activitySearchQuery) fetchLinkableActivities(activitySearchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [activitySearchQuery]);

  const relatedInteractions = interactions.filter((i) => {
    if (type === "person" && i.related_person === data.id) return true;
    if (type === "company" && i.related_company === data.id) return true;
    return false;
  });

  const canWriteInteractions = useMemo(() => {
    if (!myAccess) return true;
    return (
      myAccess.permissions.includes("*") ||
      myAccess.permissions.includes("interactions.write")
    );
  }, [myAccess]);

  const handleInteractionClick = async (interaction: InteractionLog) => {
    if (interaction.activity_log) {
      setIsLoadingActivities(true);
      try {
        let activity = activities.find(
          (a) => a.id === interaction.activity_log,
        );
        if (!activity) {
          const { fetchActivityById } = useStore.getState();
          activity = await fetchActivityById(interaction.activity_log);
        }
        if (activity) {
          pushDrawer({ id: activity.id, type: "activity" }, "Timeline");
        } else {
          if (!canWriteInteractions) {
            toast.error("You do not have permission to link interactions.");
            return;
          }
          setSelectedInteraction(interaction);
          setIsLinkModalOpen(true);
        }
      } finally {
        setIsLoadingActivities(false);
      }
    } else {
      if (!canWriteInteractions) {
        toast.error("You do not have permission to link interactions.");
        return;
      }
      setSelectedInteraction(interaction);
      setIsLinkModalOpen(true);
    }
  };

  const handleCreateInteraction = async () => {
    if (!newInteractionType) return;
    setIsCreating(true);
    try {
      let activityId = selectedActivityId;

      // If user opted to create a new activity
      if (showActivityCreation && newActivityTitle) {
        const { addActivity } = useStore.getState();
        const createdActivity = await addActivity({
          type: newActivityType as any,
          channel: newActivityChannel,
          direction: newActivityDirection,
          title: newActivityTitle,
          content: newActivityContent,
          date: new Date().toISOString(),
          relatedPersonId: type === "person" ? data.id : undefined,
          relatedCompanyId:
            type === "company" ? data.id : data.companyId || undefined,
        } as any);
        if (createdActivity) {
          activityId = createdActivity.id;
        }
      }

      const newInteraction = await addInteraction({
        interaction_type: newInteractionType,
        related_person: type === "person" ? data.id : undefined,
        related_company:
          type === "company" ? data.id : data.companyId || undefined,
        notes: newNotes || undefined,
        date: addInteractionDate,
        activity_log: activityId || undefined,
      } as any);

      setNewInteractionType("");
      setNewNotes("");
      setSelectedActivityId(null);
      setShowActivityCreation(false);
      setNewActivityTitle("");
      setNewActivityContent("");
      setIsAddModalOpen(false);
      setAddInteractionDate(new Date().toISOString());
      toast.success(t("timelineTab.interactionAdded"));
    } catch (err) {
      toast.error(t("timelineTab.interactionAddFailed"));
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateInteraction = async () => {
    if (!editingInteraction) return;
    setIsCreating(true);

    try {
      let activityId = selectedActivityId;

      // If we are creating a NEW activity during edit
      if (showActivityCreation && newActivityTitle && newActivityContent) {
        const { addActivity } = useStore.getState(); // Ensure addActivity is available
        const createdActivity = await addActivity({
          type: newActivityType as any,
          channel: newActivityChannel,
          direction: newActivityDirection,
          title: newActivityTitle,
          content: newActivityContent,
          date: new Date().toISOString(),
          relatedPersonId: type === "person" ? data.id : undefined,
          relatedCompanyId:
            type === "company" ? data.id : data.companyId || undefined,
        } as any);
        if (createdActivity) {
          activityId = createdActivity.id;
        }
      }

      const { updateInteraction } = useStore.getState(); // Ensure updateInteraction is available
      const response = await updateInteraction(editingInteraction.id, {
        interaction_type: newInteractionType,
        notes: newNotes,
        activity_log: activityId,
        date: editedDate || editingInteraction.date,
      });

      if (response?.ok) {
        toast.success(t("timelineTab.interactionUpdated"));
        setIsEditModalOpen(false);
        setEditingInteraction(null);
        setNewInteractionType("");
        setNewNotes("");
        setSelectedActivityId(null);
        setInteractionStep(1);
        setEditedDate("");
      }
    } catch (error) {
      console.error("Failed to update interaction:", error);
      toast.error(t("timelineTab.interactionUpdateFailed"));
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteInteraction = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteInteractions([id]);
      toast.success(t("timelineTab.interactionDeleted"));
    } catch (err) {
      toast.error(t("timelineTab.interactionDeleteFailed"));
    }
  };

  const getInteractionColor = (color?: string) => {
    if (!color) return "bg-border/20 text-textSecondary";
    if (color.startsWith("#")) {
      const hex = color.replace("#", "");
      return `bg-[#${hex}]/20 text-[#${hex}]`;
    }
    return color;
  };

  const getInteractionIcon = (interaction: InteractionLog) => {
    const activity =
      activities.find((a) => a.id === interaction.activity_log) ||
      interaction.activity_log_details;
    const type = (
      activity?.type ||
      interaction.interaction_type_name ||
      ""
    ).toLowerCase();

    if (type.includes("email")) return Mail;
    if (type.includes("call")) return Phone;
    if (type.includes("meeting")) return Calendar;
    if (type.includes("note")) return FileText;
    if (type.includes("linkedin")) return MessageSquare;
    if (type.includes("whatsapp")) return MessageSquare;
    return Activity;
  };

  const groupedInteractions: {
    [key: string]: { label: string; items: InteractionLog[] };
  } = {};
  relatedInteractions.forEach((interaction) => {
    const date = new Date(interaction.date);
    const dateKey = format(date, "MMM d, yyyy");

    if (!groupedInteractions[dateKey]) {
      groupedInteractions[dateKey] = { label: dateKey, items: [] };
    }
    groupedInteractions[dateKey].items.push(interaction);
  });

  const sortedGroups = Object.entries(groupedInteractions).sort(
    ([a], [b]) => new Date(b).getTime() - new Date(a).getTime(),
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h3 className="text-xs font-bold text-textSecondary uppercase tracking-wider">
          {t("timelineTab.interactionHistory")}
        </h3>
        {canWrite && (
          <button
            onClick={() => {
              setIsAddModalOpen(true);
              setSelectedActivityId(null);
              setShowActivityCreation(false);
            }}
            className="flex items-center gap-1.5 px-2 py-1 bg-card-hover hover:bg-card-hover-light rounded text-xs text-textPrimary border border-border transition-colors"
          >
            <Plus size={14} /> {t("timelineTab.logInteraction")}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar space-y-8 pr-2">
        {relatedInteractions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-textSecondary/40">
            <div className="w-16 h-16 rounded-full bg-table-row-hover flex items-center justify-center mb-4">
              <Activity size={32} />
            </div>
            <p className="text-sm font-medium">{t("timelineTab.noInteractionsTracked")}</p>
            <p className="text-xs mt-1">
              {t("timelineTab.startLogging")}
            </p>
          </div>
        )}

        <div className="space-y-10 relative pb-10">
          {/* Vertical Line */}
          {sortedGroups.length > 0 && (
            <div className="absolute left-[84px] top-6 bottom-0 w-px bg-border/50" />
          )}

          {sortedGroups.map(([key, group]) => (
            <div key={key} className="space-y-10">
              {/* Date Header */}
              <div className="flex justify-start pt-4 mb-4">
                <div className="ml-[48px] px-3 py-1 mb-4 bg-menu-section-bg text-textSecondary text-[10px] uppercase font-bold rounded border border-border/50 shadow-sm">
                  {group.label}
                </div>
              </div>

              <div className="space-y-12">
                {group.items.map((interaction) => {
                  const activityFromStore = activities.find(
                    (a) => a.id === interaction.activity_log,
                  );
                  const hasActivity =
                    interaction.activity_log &&
                    (activityFromStore || interaction.activity_log_details);
                  const Icon = getInteractionIcon(interaction);

                  return (
                    <div
                      key={interaction.id}
                      className="relative flex items-start group"
                      onClick={() => handleInteractionClick(interaction)}
                    >
                      {/* Time Label (Left) */}
                      <div className="w-[70px] pt-1 text-center text-[10px] text-textSecondary font-medium tabular-nums">
                        {format(new Date(interaction.date), "hh:mm a")}
                      </div>

                      {/* Vertical Timeline Node (Center) */}
                      <div className="w-[30px] flex justify-center relative z-10">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center bg-drawer-bg border border-border transition-transform group-hover:scale-110 shadow-lg ${getInteractionColor(interaction.interaction_type_color)}`}
                        >
                          <Icon size={14} />
                        </div>
                      </div>

                      {/* Content (Right) */}
                      <div className="flex-1 ml-4 pr-4">
                        <div className="bg-dropdown-bg border border-border/50 rounded-xl p-4 cursor-pointer hover:border-accent/40 hover:bg-menu-section-bg transition-all group-hover:shadow-[0_4px_20px_-5px_var(--color-shadow)]">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center flex-wrap gap-2 mb-2">
                                <span className="text-xs font-bold text-textPrimary">
                                  {interaction.interaction_type_name}
                                </span>
                              </div>

                              {interaction.notes ? (
                                <p
                                  dir="auto"
                                  className="text-sm text-textSecondary leading-relaxed line-clamp-2 group-hover:line-clamp-none transition-all"
                                >
                                  <LinkifiedText text={interaction.notes} />
                                </p>
                              ) : (
                                <p className="text-xs text-textSecondary/50 italic font-light">
                                  {t("timelineTab.noAdditionalNotes")}
                                </p>
                              )}

                              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/10">
                                <div className="flex items-center gap-2">
                                  <div className="w-4 h-4 rounded-full bg-accent/20 flex items-center justify-center text-[8px] font-bold text-accent">
                                    {interaction.created_by_name?.charAt(0) ||
                                      "U"}
                                  </div>
                                  <p className="text-[9px] text-textSecondary font-medium">
                                    {t("timelineTab.by")} {interaction.created_by_name} •{" "}
                                    {format(
                                      new Date(interaction.date),
                                      "MMM d, yyyy",
                                    )}
                                  </p>
                                </div>
                                {hasActivity && (
                                  <span className="flex items-center gap-1 text-[9px] text-accent font-bold px-1.5 py-0.5 bg-accent/10 rounded-md">
                                    {t("timelineTab.linked")}
                                  </span>
                                )}
                              </div>
                            </div>

                            {canWrite && (
                              <div className="flex flex-col gap-2 shrink-0">
                                <button
                                  onClick={(e) =>
                                    handleDeleteInteraction(e, interaction.id)
                                  }
                                  className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/10 rounded-lg text-textSecondary hover:text-red-400 transition-all"
                                >
                                  <Trash2 size={12} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingInteraction(interaction);
                                    setNewInteractionType(
                                      interaction.interaction_type || "",
                                    );
                                    setNewNotes(interaction.notes || "");
                                    setSelectedActivityId(
                                      interaction.activity_log || null,
                                    );
                                    setEditedDate(interaction.date);
                                    setInteractionStep(1);
                                    setIsEditModalOpen(true);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-accent/10 rounded-lg text-textSecondary hover:text-accent transition-all"
                                >
                                  <Pencil size={12} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Interaction Modal */}
      <Dialog
        open={isAddModalOpen}
        onOpenChange={(open) => {
          setIsAddModalOpen(open);
          if (!open) {
            setInteractionStep(1);
            setAddInteractionDate(new Date().toISOString());
            setShowAddDatePicker(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-[550px] bg-card-bg border-border text-textPrimary z-[100] shadow-2xl p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-dropdown-bg">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="w-5 h-5 text-accent" />
              {t("timelineTab.trackInteraction")} {interactionStep === 1 ? t("timelineTab.step1of2") : t("timelineTab.step2of2")}
            </DialogTitle>
            <DialogDescription className="text-textSecondary text-[11px] mt-1 font-medium italic">
              {interactionStep === 1
                ? t("timelineTab.step1Description", { name: data.name || "this lead" })
                : t("timelineTab.step2Description")}
            </DialogDescription>
          </div>

          <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
            {interactionStep === 1 ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-textSecondary uppercase tracking-widest flex items-center gap-1.5">
                        <Hash size={10} /> {t("timelineTab.interactionCategory")}
                      </label>
                      <button
                        onClick={() => {
                          setIsAddModalOpen(false);
                          setPendingModalToReopen("add");
                          setIsInteractionTypeModalOpen(true);
                        }}
                        className="text-[10px] text-accent hover:text-accent/80 font-bold flex items-center gap-1 transition-colors"
                      >
                        {t("timelineTab.manage")}
                      </button>
                    </div>
                    <select
                      value={newInteractionType}
                      onChange={(e) => setNewInteractionType(e.target.value)}
                      className="w-full bg-textarea-bg border border-border rounded-lg px-3 py-2.5 text-sm text-textPrimary outline-none focus:ring-1 focus:ring-accent transition-all hover:border-border/80"
                    >
                      <option value="">{t("timelineTab.selectCategory")}</option>
                      {interactionTypes.map((it) => (
                        <option key={it.id} value={it.id}>
                          {it.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-textSecondary uppercase tracking-widest flex items-center gap-1.5">
                      <Calendar size={10} /> {t("timelineTab.interactionDate")}
                    </label>
                    <Popover open={showAddDatePicker} onOpenChange={setShowAddDatePicker}>
                      <PopoverTrigger asChild>
                        <button
                          className="w-full bg-textarea-bg border border-border rounded-lg px-3 py-2.5 text-sm text-textPrimary outline-none focus:ring-1 focus:ring-accent transition-all hover:border-border/80 text-left flex items-center justify-between cursor-pointer"
                        >
                          <span>
                            {addInteractionDate
                              ? format(new Date(addInteractionDate), "PPp")
                              : format(new Date(), "PPp")}
                          </span>
                          <Calendar size={14} className="text-accent" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-[999] bg-textarea-bg border-border" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={addInteractionDate ? new Date(addInteractionDate) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              const currentDate = addInteractionDate ? new Date(addInteractionDate) : new Date();
                              currentDate.setFullYear(date.getFullYear());
                              currentDate.setMonth(date.getMonth());
                              currentDate.setDate(date.getDate());
                              setAddInteractionDate(currentDate.toISOString());
                            }
                            setShowAddDatePicker(false);
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-textSecondary uppercase tracking-widest flex items-center gap-1.5">
                    <AlignLeft size={10} /> {t("timelineTab.observationNotes")}
                  </label>
                  <textarea
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder={t("timelineTab.notesPlaceholder")}
                    className="w-full bg-textarea-bg border border-border rounded-lg px-3 py-2.5 text-sm text-textPrimary outline-none focus:ring-1 focus:ring-accent min-h-[120px] resize-none transition-all hover:border-border/80 custom-scrollbar"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                {/* Activity Linking/Creation Section */}
                <div className="bg-textarea-bg border border-border rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-textSecondary uppercase tracking-widest flex items-center gap-1.5">
                      <Activity size={10} /> {t("timelineTab.relatedActivityLog")}
                    </label>
                    <button
                      onClick={() => {
                        setShowActivityCreation(!showActivityCreation);
                        setSelectedActivityId(null);
                      }}
                      className="text-[10px] font-bold text-accent uppercase tracking-wider hover:underline underline-offset-4"
                    >
                      {showActivityCreation
                        ? t("timelineTab.linkExistingInstead")
                        : t("timelineTab.createNewInstead")}
                    </button>
                  </div>

                  {!showActivityCreation ? (
                    <div className="space-y-4">
                      <div className="flex flex-col gap-3">
                        <div className="relative">
                          <Search
                            size={14}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary/50"
                          />
                          <input
                            type="text"
                            placeholder={t("timelineTab.searchActivity")}
                            value={activitySearchQuery}
                            onChange={(e) =>
                              setActivitySearchQuery(e.target.value)
                            }
                            className="w-full bg-card-bg border border-border rounded-lg pl-10 pr-3 py-2 text-xs text-textPrimary outline-none focus:border-accent"
                          />
                          {isLoadingActivities && (
                            <RefreshCw
                              size={12}
                              className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-accent"
                            />
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={activityTypeFilter}
                            onChange={(e) =>
                              setActivityTypeFilter(e.target.value)
                            }
                            className="bg-card-bg border border-border rounded-lg px-2 py-1.5 text-[10px] text-textSecondary outline-none focus:border-accent cursor-pointer"
                          >
                            <option value="all">{t("timelineTab.allTypes")}</option>
<option value="email">{t("contextTab.optionEmail")}</option>
                    <option value="call">{t("contextTab.optionCall")}</option>
                    <option value="meeting">{t("contextTab.optionMeeting")}</option>
                    <option value="msg">{t("contextTab.optionMessage")}</option>
                    <option value="update">{t("contextTab.optionUpdate")}</option>
                          </select>
                          <select
                            value={activityChannelFilter}
                            onChange={(e) =>
                              setActivityChannelFilter(e.target.value)
                            }
                            className="bg-card-bg border border-border rounded-lg px-2 py-1.5 text-[10px] text-textSecondary outline-none focus:border-accent cursor-pointer"
                          >
                            <option value="all">{t("timelineTab.allChannels")}</option>
<option value="email">{t("contextTab.optionEmail")}</option>
                    <option value="linkedin">{t("contextTab.optionLinkedin")}</option>
                    <option value="whatsapp">{t("contextTab.optionWhatsApp")}</option>
                    <option value="system">{t("contextTab.optionSystem")}</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1.5 max-h-[200px] overflow-y-auto no-scrollbar">
                        {filteredLinkableActivities.length > 0 ? (
                          filteredLinkableActivities.map((activity) => (
                            <div
                              key={activity.id}
                              onClick={() =>
                                setSelectedActivityId(
                                  activity.id === selectedActivityId
                                    ? null
                                    : activity.id,
                                )
                              }
                              className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center gap-3 ${selectedActivityId === activity.id ? "bg-accent/10 border-accent/50" : "bg-card-bg border-border hover:border-border/80"}`}
                            >
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center bg-background/50 text-accent`}
                              >
                                {activity.type === "email" && (
                                  <Mail size={14} />
                                )}
                                {activity.type === "call" && (
                                  <Phone size={14} />
                                )}
                                {activity.type === "meeting" && (
                                  <Calendar size={14} />
                                )}
                                {(activity.type === "msg" ||
                                  activity.type === "update") && (
                                  <MessageSquare size={14} />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-[11px] font-bold text-textPrimary truncate flex items-center justify-between gap-2">
                                  <span className="truncate">
                                    {activity.title ||
                                      (activity.channel
                                        ? `${activity.channel.charAt(0).toUpperCase() + activity.channel.slice(1)} - ${activity.content.substring(0, 30)}...`
                                        : activity.content.substring(0, 40) +
                                          "...")}
                                  </span>
                                  <span className="text-[9px] opacity-40 font-bold uppercase shrink-0">
                                    {activity.type}
                                  </span>
                                </div>
                                <div className="text-[10px] text-textSecondary font-medium flex items-center gap-2">
                                  <span className="tabular-nums">
                                    {format(
                                      new Date(activity.date),
                                      "MMM d, yyyy",
                                    )}
                                  </span>
                                  {activity.channel && (
                                    <span className="opacity-40 font-bold">
                                      • {activity.channel.toUpperCase()}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {selectedActivityId === activity.id && (
                                <Check size={14} className="text-accent" />
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-6 border border-dashed border-border rounded-lg">
                            <p className="text-[10px] text-textSecondary font-medium">
                              {t("timelineTab.noSuitableActivities")}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-textSecondary/80 uppercase">
                            {t("timelineTab.activityType")}
                          </label>
                          <select
                            value={newActivityType}
                            onChange={(e) => setNewActivityType(e.target.value)}
                            className="w-full bg-card-bg border border-border rounded-lg px-2 py-2 text-xs text-textPrimary outline-none focus:border-accent"
                          >
<option value="email">{t("contextTab.optionEmail")}</option>
                    <option value="call">{t("contextTab.optionCall")}</option>
                    <option value="meeting">{t("contextTab.optionMeeting")}</option>
                    <option value="msg">{t("contextTab.optionMessage")}</option>
                    <option value="update">{t("contextTab.optionUpdate")}</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-textSecondary/80 uppercase">
                            {t("timelineTab.briefTitle")}
                          </label>
                          <input
                            type="text"
                            value={newActivityTitle}
                            onChange={(e) =>
                              setNewActivityTitle(e.target.value)
                            }
                            placeholder={t("timelineTab.titlePlaceholder")}
                            className="w-full bg-card-bg border border-border rounded-lg px-2 py-2 text-xs text-textPrimary outline-none focus:border-accent"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-textSecondary/80 uppercase">
                            {t("timelineTab.channel")}
                          </label>
                          <select
                            value={newActivityChannel}
                            onChange={(e) =>
                              setNewActivityChannel(e.target.value as Channel)
                            }
                            className="w-full bg-card-bg border border-border rounded-lg px-2 py-2 text-xs text-textPrimary outline-none focus:border-accent"
                          >
<option value="email">{t("contextTab.optionEmail")}</option>
                    <option value="linkedin">{t("contextTab.optionLinkedin")}</option>
                    <option value="whatsapp">{t("contextTab.optionWhatsApp")}</option>
                    <option value="system">{t("contextTab.optionSystem")}</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-textSecondary/80 uppercase">
                            {t("timelineTab.direction")}
                          </label>
                          <select
                            value={newActivityDirection}
                            onChange={(e) =>
                              setNewActivityDirection(
                                e.target.value as Direction,
                              )
                            }
                            className="w-full bg-card-bg border border-border rounded-lg px-2 py-2 text-xs text-textPrimary outline-none focus:border-accent"
                          >
                            <option value="sent">{t("contextDrawer.sent")}</option>
                            <option value="received">{t("contextDrawer.received")}</option>
                            <option value="system">{t("contextDrawer.system")}</option>
                          </select>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-textSecondary/80 uppercase">
                          {t("timelineTab.activityDetails")}
                        </label>
                        <textarea
                          value={newActivityContent}
                          onChange={(e) =>
                            setNewActivityContent(e.target.value)
                          }
                          placeholder={t("timelineTab.detailsPlaceholder")}
                          className="w-full bg-card-bg border border-border rounded-lg px-2 py-2 text-xs text-textPrimary outline-none focus:border-accent min-h-[60px] resize-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="px-6 py-4 bg-dropdown-bg border-t border-border flex justify-between items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                setIsAddModalOpen(false);
                setNewInteractionType("");
                setNewNotes("");
                setInteractionStep(1);
              }}
              className="text-textSecondary hover:text-textPrimary hover:bg-white/5 text-xs font-bold uppercase tracking-wider"
            >
              {t("timelineTab.cancel")}
            </Button>
            <div className="flex items-center gap-2">
              {interactionStep === 2 && (
                <Button
                  variant="outline"
                  onClick={() => setInteractionStep(1)}
                  className="border-border hover:bg-white/5 text-[10px] font-bold uppercase tracking-wider h-10 px-4"
                >
                  {t("timelineTab.back")}
                </Button>
              )}
              {interactionStep === 1 ? (
                <Button
                  onClick={() => setInteractionStep(2)}
                  disabled={!newInteractionType}
                  className="bg-accent hover:bg-blue-600 text-white font-bold uppercase tracking-widest text-[10px] h-10 px-6 shadow-[0_0_20px_-5px_theme(colors.accent.DEFAULT)]"
                >
                  {t("timelineTab.continue")}
                  <ArrowRight size={14} className="ms-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleCreateInteraction}
                  disabled={isCreating}
                  className="bg-accent hover:bg-blue-600 text-white font-bold uppercase tracking-widest text-[10px] h-10 px-6 shadow-[0_0_20px_-5px_theme(colors.accent.DEFAULT)]"
                >
                  {isCreating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 me-2 animate-spin" />
                      {t("timelineTab.saving")}
                    </>
                  ) : (
                    t("timelineTab.confirmSave")
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <InteractionTypeModal
        isOpen={isInteractionTypeModalOpen}
        onClose={() => setIsInteractionTypeModalOpen(false)}
        onReopen={() => {
          if (pendingModalToReopen === "add") setIsAddModalOpen(true);
          else if (pendingModalToReopen === "edit") setIsEditModalOpen(true);
          setPendingModalToReopen(null);
        }}
      />

      {/* Edit Interaction Modal */}
      <Dialog
        open={isEditModalOpen}
        onOpenChange={(open) => {
          setIsEditModalOpen(open);
          if (!open) {
            setEditingInteraction(null);
            setInteractionStep(1);
            setEditedDate("");
            setShowDatePicker(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-[550px] bg-card-bg border-border text-textPrimary z-[100] shadow-2xl p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-dropdown-bg">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Pencil className="w-5 h-5 text-accent" />
              {t("timelineTab.editInteraction")} {interactionStep === 1 ? t("timelineTab.step1of2") : t("timelineTab.step2of2")}
            </DialogTitle>
            <DialogDescription className="text-textSecondary text-[11px] mt-1 font-medium italic">
              {interactionStep === 1
                ? t("timelineTab.step1EditDescription")
                : t("timelineTab.step2EditDescription")}
            </DialogDescription>
          </div>

          <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
            {interactionStep === 1 ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-textSecondary uppercase tracking-widest flex items-center gap-1.5">
                        <Hash size={10} /> {t("timelineTab.interactionCategory")}
                      </label>
                      <button
                        onClick={() => {
                          setIsEditModalOpen(false);
                          setPendingModalToReopen("edit");
                          setIsInteractionTypeModalOpen(true);
                        }}
                        className="text-[10px] text-accent hover:text-accent/80 font-bold flex items-center gap-1 transition-colors"
                      >
                        {t("timelineTab.manage")}
                      </button>
                    </div>
                    <select
                      value={newInteractionType}
                      onChange={(e) => setNewInteractionType(e.target.value)}
                      className="w-full bg-textarea-bg border border-border rounded-lg px-3 py-2.5 text-sm text-textPrimary outline-none focus:ring-1 focus:ring-accent transition-all hover:border-border/80"
                    >
                      <option value="">{t("timelineTab.selectCategory")}</option>
                      {interactionTypes.map((it) => (
                        <option key={it.id} value={it.id}>
                          {it.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-textSecondary uppercase tracking-widest flex items-center gap-1.5">
                      <Calendar size={10} /> {t("timelineTab.interactionDate")}
                    </label>
                    <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                      <PopoverTrigger asChild>
                        <button
                          className="w-full bg-textarea-bg border border-border rounded-lg px-3 py-2.5 text-sm text-textPrimary outline-none focus:ring-1 focus:ring-accent transition-all hover:border-border/80 text-left flex items-center justify-between cursor-pointer"
                        >
                          <span>
                            {editedDate
                              ? format(new Date(editedDate), "PPp")
                              : editingInteraction
                              ? format(new Date(editingInteraction.date), "PPp")
                              : format(new Date(), "PPp")}
                          </span>
                          <Calendar size={14} className="text-accent" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-[999] bg-textarea-bg border-border" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={editedDate ? new Date(editedDate) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              const currentDate = editedDate ? new Date(editedDate) : new Date();
                              currentDate.setFullYear(date.getFullYear());
                              currentDate.setMonth(date.getMonth());
                              currentDate.setDate(date.getDate());
                              setEditedDate(currentDate.toISOString());
                            }
                            setShowDatePicker(false);
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-textSecondary uppercase tracking-widest flex items-center gap-1.5">
                    <AlignLeft size={10} /> {t("timelineTab.observationNotes")}
                  </label>
                  <textarea
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder={t("timelineTab.notesPlaceholder")}
                    className="w-full bg-textarea-bg border border-border rounded-lg px-3 py-2.5 text-sm text-textPrimary outline-none focus:ring-1 focus:ring-accent min-h-[120px] resize-none transition-all hover:border-border/80 custom-scrollbar"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                <div className="bg-textarea-bg border border-border rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-textSecondary uppercase tracking-widest flex items-center gap-1.5">
                      <Activity size={10} /> Related Activity Log
                    </label>
                    <div className="flex items-center gap-3">
                      {selectedActivityId && !showActivityCreation && (
                        <button
                          onClick={() => setSelectedActivityId(null)}
                          className="text-[10px] font-bold text-red-400/80 uppercase tracking-wider hover:underline underline-offset-4"
                        >
                          Unlink
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setShowActivityCreation(!showActivityCreation);
                          if (!showActivityCreation)
                            setSelectedActivityId(null);
                          else
                            setSelectedActivityId(
                              editingInteraction?.activity_log || null,
                            );
                        }}
                        className="text-[10px] font-bold text-accent uppercase tracking-wider hover:underline underline-offset-4"
                      >
                        {showActivityCreation
                          ? "Cancel creation"
                          : "Link Different / Create New"}
                      </button>
                    </div>
                  </div>

                  {!showActivityCreation ? (
                    <div className="space-y-4">
                      <div className="flex flex-col gap-3">
                        <div className="relative">
                          <Search
                            size={14}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary/50"
                          />
                          <input
                            type="text"
                            placeholder={t("timelineTab.searchActivity")}
                            value={activitySearchQuery}
                            onChange={(e) =>
                              setActivitySearchQuery(e.target.value)
                            }
                            className="w-full bg-card-bg border border-border rounded-lg pl-10 pr-3 py-2 text-xs text-textPrimary outline-none focus:border-accent"
                          />
                          {isLoadingActivities && (
                            <RefreshCw
                              size={12}
                              className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-accent"
                            />
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={activityTypeFilter}
                            onChange={(e) =>
                              setActivityTypeFilter(e.target.value)
                            }
                            className="bg-card-bg border border-border rounded-lg px-2 py-1.5 text-[10px] text-textSecondary outline-none focus:border-accent cursor-pointer"
                          >
                            <option value="all">{t("timelineTab.allTypes")}</option>
<option value="email">{t("contextTab.optionEmail")}</option>
                    <option value="call">{t("contextTab.optionCall")}</option>
                    <option value="meeting">{t("contextTab.optionMeeting")}</option>
                    <option value="msg">{t("contextTab.optionMessage")}</option>
                    <option value="update">{t("contextTab.optionUpdate")}</option>
                          </select>
                          <select
                            value={activityChannelFilter}
                            onChange={(e) =>
                              setActivityChannelFilter(e.target.value)
                            }
                            className="bg-card-bg border border-border rounded-lg px-2 py-1.5 text-[10px] text-textSecondary outline-none focus:border-accent cursor-pointer"
                          >
                            <option value="all">{t("timelineTab.allChannels")}</option>
<option value="email">{t("contextTab.optionEmail")}</option>
                    <option value="linkedin">{t("contextTab.optionLinkedin")}</option>
                    <option value="whatsapp">{t("contextTab.optionWhatsApp")}</option>
                    <option value="system">{t("contextTab.optionSystem")}</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1.5 max-h-[200px] overflow-y-auto no-scrollbar">
                        {filteredLinkableActivities.length > 0 ? (
                          filteredLinkableActivities.map((activity) => (
                            <div
                              key={activity.id}
                              onClick={() =>
                                setSelectedActivityId(
                                  activity.id === selectedActivityId
                                    ? null
                                    : activity.id,
                                )
                              }
                              className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center gap-3 ${selectedActivityId === activity.id ? "bg-accent/10 border-accent/50" : "bg-card-bg border-border hover:border-border/80"}`}
                            >
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center bg-background/50 text-accent`}
                              >
                                {activity.type === "email" && (
                                  <Mail size={14} />
                                )}
                                {activity.type === "call" && (
                                  <Phone size={14} />
                                )}
                                {activity.type === "meeting" && (
                                  <Calendar size={14} />
                                )}
                                {(activity.type === "msg" ||
                                  activity.type === "update") && (
                                  <MessageSquare size={14} />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-[11px] font-bold text-textPrimary truncate flex items-center justify-between gap-2">
                                  <span className="truncate">
                                    {activity.title ||
                                      (activity.channel
                                        ? `${activity.channel.charAt(0).toUpperCase() + activity.channel.slice(1)} - ${activity.content.substring(0, 30)}...`
                                        : activity.content.substring(0, 40) +
                                          "...")}
                                  </span>
                                  <span className="text-[9px] opacity-40 font-bold uppercase shrink-0">
                                    {activity.type}
                                  </span>
                                </div>
                                <div className="text-[10px] text-textSecondary font-medium flex items-center gap-2">
                                  <span className="tabular-nums">
                                    {format(
                                      new Date(activity.date),
                                      "MMM d, yyyy",
                                    )}
                                  </span>
                                  {activity.channel && (
                                    <span className="opacity-40 font-bold">
                                      • {activity.channel.toUpperCase()}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {selectedActivityId === activity.id && (
                                <Check size={14} className="text-accent" />
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-6 border border-dashed border-border rounded-lg">
                            <p className="text-[10px] text-textSecondary font-medium">
                              {t("timelineTab.noSuitableActivities")}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-textSecondary/80 uppercase">
                            {t("timelineTab.activityType")}
                          </label>
                          <select
                            value={newActivityType}
                            onChange={(e) => setNewActivityType(e.target.value)}
                            className="w-full bg-card-bg border border-border rounded-lg px-2 py-2 text-xs text-textPrimary outline-none focus:border-accent"
                          >
<option value="email">{t("contextTab.optionEmail")}</option>
                    <option value="call">{t("contextTab.optionCall")}</option>
                    <option value="meeting">{t("contextTab.optionMeeting")}</option>
                    <option value="msg">{t("contextTab.optionMessage")}</option>
                    <option value="update">{t("contextTab.optionUpdate")}</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-textSecondary/80 uppercase">
                            {t("timelineTab.briefTitle")}
                          </label>
                          <input
                            type="text"
                            value={newActivityTitle}
                            onChange={(e) =>
                              setNewActivityTitle(e.target.value)
                            }
                            placeholder={t("timelineTab.titlePlaceholder")}
                            className="w-full bg-card-bg border border-border rounded-lg px-2 py-2 text-xs text-textPrimary outline-none focus:border-accent"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-textSecondary/80 uppercase">
                            {t("timelineTab.channel")}
                          </label>
                          <select
                            value={newActivityChannel}
                            onChange={(e) =>
                              setNewActivityChannel(e.target.value as Channel)
                            }
                            className="w-full bg-card-bg border border-border rounded-lg px-2 py-2 text-xs text-textPrimary outline-none focus:border-accent"
                          >
<option value="email">{t("contextTab.optionEmail")}</option>
                    <option value="linkedin">{t("contextTab.optionLinkedin")}</option>
                    <option value="whatsapp">{t("contextTab.optionWhatsApp")}</option>
                    <option value="system">{t("contextTab.optionSystem")}</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-textSecondary/80 uppercase">
                            {t("timelineTab.direction")}
                          </label>
                          <select
                            value={newActivityDirection}
                            onChange={(e) =>
                              setNewActivityDirection(
                                e.target.value as Direction,
                              )
                            }
                            className="w-full bg-card-bg border border-border rounded-lg px-2 py-2 text-xs text-textPrimary outline-none focus:border-accent"
                          >
                            <option value="sent">{t("contextDrawer.sent")}</option>
                            <option value="received">{t("contextDrawer.received")}</option>
                            <option value="system">{t("contextDrawer.system")}</option>
                          </select>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-textSecondary/80 uppercase">
                          {t("timelineTab.activityDetails")}
                        </label>
                        <textarea
                          value={newActivityContent}
                          onChange={(e) =>
                            setNewActivityContent(e.target.value)
                          }
                          placeholder={t("timelineTab.detailsPlaceholder")}
                          className="w-full bg-card-bg border border-border rounded-lg px-2 py-2 text-xs text-textPrimary outline-none focus:border-accent min-h-[60px] resize-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="px-6 py-4 bg-dropdown-bg border-t border-border flex justify-between items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingInteraction(null);
                setInteractionStep(1);
              }}
              className="text-textSecondary hover:text-textPrimary hover:bg-white/5 text-xs font-bold uppercase tracking-wider"
            >
              {t("common.cancel")}
            </Button>
            <div className="flex items-center gap-2">
              {interactionStep === 2 && (
                <Button
                  variant="outline"
                  onClick={() => setInteractionStep(1)}
                  className="border-border hover:bg-white/5 text-[10px] font-bold uppercase tracking-wider h-10 px-4"
                >
                  Back
                </Button>
              )}
              {interactionStep === 1 ? (
                <Button
                  onClick={() => setInteractionStep(2)}
                  disabled={!newInteractionType}
                  className="bg-accent hover:bg-blue-600 text-white font-bold uppercase tracking-widest text-[10px] h-10 px-6 shadow-[0_0_20px_-5px_theme(colors.accent.DEFAULT)]"
                >
                  Continue
                  <ArrowRight size={14} className="ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleUpdateInteraction}
                  disabled={isCreating}
                  className="bg-accent hover:bg-blue-600 text-white font-bold uppercase tracking-widest text-[10px] h-10 px-6 shadow-[0_0_20px_-5px_theme(colors.accent.DEFAULT)]"
                >
                  {isCreating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Link Activity Modal (Enhanced Search & Link) */}
      <Dialog open={isLinkModalOpen} onOpenChange={setIsLinkModalOpen}>
        <DialogContent className="sm:max-w-[500px] bg-card-bg border-border text-textPrimary z-[100] p-0 overflow-hidden shadow-2xl">
          <div className="px-6 py-4 border-b border-border bg-dropdown-bg">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Activity className="w-5 h-5 text-accent" />
              Consolidate Data
            </DialogTitle>
            <DialogDescription className="text-textSecondary text-[11px] mt-1 font-medium italic">
              No full activity record found for this interaction. Search and
              link one now.
            </DialogDescription>
          </div>

          <div className="p-6 space-y-6">
            <div className="bg-textarea-bg border border-border/50 rounded-xl p-4 shadow-inner">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${getInteractionColor(selectedInteraction?.interaction_type_color)} border-current/20`}
                >
                  {selectedInteraction?.interaction_type_name}
                </span>
                <span className="text-[9px] text-textSecondary font-bold">
                  {selectedInteraction?.date
                    ? format(new Date(selectedInteraction.date), "PPp")
                    : ""}
                </span>
              </div>
              {selectedInteraction?.notes && (
                <p className="text-xs text-textPrimary leading-relaxed">
                  <LinkifiedText text={selectedInteraction.notes} />
                </p>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary/50"
                  />
                  <input
                    type="text"
                    placeholder={t("contextTab.searchActivities")}
                    value={activitySearchQuery}
                    onChange={(e) => setActivitySearchQuery(e.target.value)}
                    className="w-full bg-textarea-bg border border-border rounded-lg pl-10 pr-3 py-2.5 text-xs text-textPrimary outline-none focus:border-accent transition-all"
                  />
                  {isLoadingActivities && (
                    <RefreshCw
                      size={12}
                      className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-accent"
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={activityTypeFilter}
                    onChange={(e) => setActivityTypeFilter(e.target.value)}
                    className="bg-textarea-bg border border-border rounded-lg px-2 py-2 text-[10px] text-textSecondary outline-none focus:border-accent cursor-pointer"
                  >
                    <option value="all">{t("timelineTab.allTypes")}</option>
                    <option value="email">{t("contextTab.optionEmail")}</option>
                    <option value="call">{t("contextTab.optionCall")}</option>
                    <option value="meeting">{t("contextTab.optionMeeting")}</option>
                    <option value="msg">{t("contextTab.optionMessage")}</option>
                    <option value="update">{t("contextTab.optionUpdate")}</option>
                  </select>
                  <select
                    value={activityChannelFilter}
                    onChange={(e) => setActivityChannelFilter(e.target.value)}
                    className="bg-textarea-bg border border-border rounded-lg px-2 py-2 text-[10px] text-textSecondary outline-none focus:border-accent cursor-pointer"
                  >
                    <option value="all">{t("timelineTab.allChannels")}</option>
                    <option value="email">{t("contextTab.optionEmail")}</option>
                    <option value="linkedin">{t("contextTab.optionLinkedin")}</option>
                    <option value="whatsapp">{t("contextTab.optionWhatsApp")}</option>
                    <option value="system">{t("contextTab.optionSystem")}</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                {filteredLinkableActivities.length > 0 ? (
                  filteredLinkableActivities.map((activity) => (
                    <div
                      key={activity.id}
                      onClick={() =>
                        setSelectedActivityId(
                          activity.id === selectedActivityId
                            ? null
                            : activity.id,
                        )
                      }
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${selectedActivityId === activity.id ? "bg-accent/10 border-accent/50" : "bg-textarea-bg border-border hover:border-border/80"}`}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-background/50 text-accent">
                        {activity.type === "email" && <Mail size={14} />}
                        {activity.type === "call" && <Phone size={14} />}
                        {activity.type === "meeting" && <Calendar size={14} />}
                        {(activity.type === "msg" ||
                          activity.type === "update") && (
                          <MessageSquare size={14} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-bold text-textPrimary truncate flex items-center justify-between gap-2">
                          <span className="truncate">
                            {activity.title ||
                              (activity.channel
                                ? `${activity.channel.charAt(0).toUpperCase() + activity.channel.slice(1)} - ${activity.content.substring(0, 30)}...`
                                : activity.content.substring(0, 40) + "...")}
                          </span>
                          <span className="text-[9px] opacity-40 font-bold uppercase shrink-0">
                            {activity.type}
                          </span>
                        </div>
                        <div className="text-[10px] text-textSecondary font-medium flex items-center gap-2">
                          <span className="tabular-nums">
                            {format(new Date(activity.date), "PP")}
                          </span>
                          {activity.channel && (
                            <span className="opacity-40 font-bold">
                              • {activity.channel.toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>
                      {selectedActivityId === activity.id && (
                        <Check size={14} className="text-accent" />
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 border border-dashed border-border rounded-xl">
                    <p className="text-[11px] text-textSecondary font-medium">
                      No activity logs available to unify.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="px-6 py-4 bg-dropdown-bg border-t border-border flex justify-end items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => setIsLinkModalOpen(false)}
              className="text-textSecondary hover:text-textPrimary hover:bg-white/5 text-xs font-bold uppercase"
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={async () => {
                if (!selectedInteraction || !selectedActivityId) return;
                const { updateInteraction } = useStore.getState();
                await updateInteraction(selectedInteraction.id, {
                  activity_log: selectedActivityId,
                } as any);
                setIsLinkModalOpen(false);
                toast.success("Activity linked successfully");
              }}
              disabled={!selectedActivityId}
              className="bg-accent hover:bg-blue-600 text-white font-bold uppercase text-[10px] px-6 h-10 w-full"
            >
              Link Activity
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
const NotesTab = ({
  parentId,
  parentType,
  activeTab,
  canWrite,
}: {
  parentId: string;
  parentType: string;
  activeTab: string;
  canWrite: boolean;
}) => {
  const { notes, addNote, pushDrawer, fetchNotes } = useStore();
  const [, forceUpdate] = useState({});

  useEffect(() => {
    if (parentType === "person") fetchNotes({ related_person: parentId });
    else if (parentType === "company")
      fetchNotes({ related_company: parentId });
  }, [parentId, parentType, fetchNotes]);

  const allRelatedNotes = notes.filter(
    (n) =>
      (parentType === "person" && n.relatedPersonId === parentId) ||
      (parentType === "company" && n.relatedCompanyId === parentId),
  );

  const relatedNotes = sortWithPinnedFirst(parentId, "note", allRelatedNotes);

  const handleCreateNote = async () => {
    const newNote: Note = {
      id: Math.random().toString(),
      title: "Untitled Note",
      content: "",
      relatedPersonId: parentType === "person" ? parentId : undefined,
      relatedCompanyId: parentType === "company" ? parentId : undefined,
      createdAt: "Just now",
    };
    const createdNote = await addNote(newNote);
    if (createdNote) {
      pushDrawer({ id: createdNote.id, type: "note" }, activeTab);
    }
  };

  const handleTogglePin = (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    togglePin(parentId, "note", noteId);
    forceUpdate({});
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-textSecondary">All Notes</h3>
        {canWrite && (
          <button
            onClick={handleCreateNote}
            className="flex items-center gap-1.5 px-2 py-1 bg-card-hover hover:bg-card-hover-light rounded text-xs text-textPrimary border border-border transition-colors"
          >
            <Plus size={12} /> Add note
          </button>
        )}
      </div>

      <div className="space-y-2">
        {relatedNotes.map((note) => {
          const pinned = isPinned(parentId, "note", note.id);
          return (
            <div
              key={note.id}
              className={`bg-table-row-hover border p-3 rounded cursor-pointer hover:border-textSecondary/50 transition-colors group relative ${pinned ? "border-accent/30 bg-white/[0.03]" : "border-border"}`}
              onClick={() => pushDrawer({ id: note.id, type: "note" }, activeTab)}
            >
              <div className="flex items-start justify-between mb-1">
                <div className="font-medium text-sm text-textPrimary flex-1">
                  {note.title}
                </div>
                <button
                  onClick={(e) => handleTogglePin(e, note.id)}
                  className={`p-1 rounded transition-colors shrink-0 ${pinned ? "text-accent hover:text-accent/80" : "text-textSecondary/30 hover:text-textSecondary opacity-0 group-hover:opacity-100"}`}
                >
                  {pinned ? <Pin size={12} /> : <PinOff size={12} />}
                </button>
              </div>
              <div className="text-xs text-textSecondary line-clamp-2">
                <LinkifiedText text={note.content || "No content"} />
              </div>
            </div>
          );
        })}
        {relatedNotes.length === 0 && (
          <div className="text-xs text-textSecondary opacity-50 px-2">
            No notes yet.
          </div>
        )}
      </div>
    </div>
  );
};

export default ContextDrawer;
