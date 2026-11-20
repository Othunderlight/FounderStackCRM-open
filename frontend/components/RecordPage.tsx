import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "../src/i18n";
import { useStore } from "../store";
import {
  Building,
  User,
  Mail,
  MapPin,
  Phone,
  Globe,
  DollarSign,
  Users,
  Home,
  ListTodo,
  FileText,
  Paperclip,
  Activity,
  ArrowLeft,
  CheckSquare,
  Check,
  Calendar,
  Plus,
  AlignLeft,
  Briefcase,
  Linkedin,
  Trash2,
  MoreHorizontal,
  Send,
  Sparkles,
  MessageSquare,
  Monitor,
  Link2,
  Filter,
  MessageCircle,
  Target,
  PieChart,
  ArrowRight,
  Copy,
  RefreshCw,
  ExternalLink,
  Pencil,
  Hash,
  Search,
  Zap,
  Pin,
  PinOff,
} from "lucide-react";
import {
  Task,
  Note,
  Opportunity,
  Person,
  Company,
  ActivityLog,
  InteractionLog,
  Channel,
  Direction,
} from "../types";
import { isPinned, togglePin, sortWithPinnedFirst } from "../lib/pins";
import { PersonConversations } from "./zernio/PersonConversations";
import { PersonTimeline } from "./zernio/PersonTimeline";
import { PersonIdentities } from "./zernio/PersonIdentities";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format, isToday, isYesterday } from "date-fns";
import { InteractionTypeModal } from "./InteractionTypeModal";
import { LinkifiedText } from "./LinkifiedText";

// --- SHARED SUB-COMPONENTS ---

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
  customStages?: any[];
  customLeadTypes?: any[];
  customLeadSources?: any[];
  theme?: string;
}) => {
  const { t } = useTranslation();

  if (!stage)
    return (
      <span className="text-textSecondary opacity-30 italic text-xs">
        {t("recordPage.noStage")}
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

  // Opportunity Stages (default)
  const oppColors: any = {
    Screening: "bg-pink-900/40 text-pink-400",
    Meeting: "bg-blue-900/40 text-blue-400",
    Proposal: "bg-yellow-900/40 text-yellow-400",
    Customer: "bg-green-900/40 text-green-400",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-medium ${convertColorForTheme(oppColors[stage] || "bg-skeleton-bg text-textSecondary")}`}
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

// --- TAB COMPONENTS ---

const getInteractionIcon = (
  interaction: InteractionLog,
  activities: ActivityLog[],
) => {
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

const getInteractionColor = (color: string | null) => {
  if (!color) return "text-textSecondary bg-border/10 border-border/20";
  if (color === "blue")
    return "text-blue-500 bg-blue-500/10 border-blue-500/20";
  if (color === "red") return "text-red-500 bg-red-500/10 border-red-500/20";
  if (color === "green")
    return "text-green-500 bg-green-500/10 border-green-500/20";
  if (color === "orange")
    return "text-orange-500 bg-orange-500/10 border-orange-500/20";
  if (color === "purple")
    return "text-purple-500 bg-purple-500/10 border-purple-500/20";
  return "text-textSecondary";
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
  const { language } = useStore();
  const isRTL = language === "ar";
  const {
    activities,
    interactions,
    interactionTypes,
    updateInteraction,
    addInteraction,
    deleteInteractions,
    fetchActivityById,
    openDrawer,
    addActivity,
    fetchActivities,
    myAccess,
  } = useStore();

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isInteractionTypeModalOpen, setIsInteractionTypeModalOpen] =
    useState(false);
  const [pendingModalToReopen, setPendingModalToReopen] = useState<
    "add" | "edit" | null
  >(null);
  const [isCreating, setIsCreating] = useState(false);
  const [interactionStep, setInteractionStep] = useState<1 | 2>(1);

  // Form States
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(
    null,
  );
  const [showActivityCreation, setShowActivityCreation] = useState(false);
  const [newInteractionType, setNewInteractionType] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [editingInteraction, setEditingInteraction] =
    useState<InteractionLog | null>(null);
  const [selectedInteraction, setSelectedInteraction] =
    useState<InteractionLog | null>(null);
  const [editedDate, setEditedDate] = useState<string>("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [addInteractionDate, setAddInteractionDate] = useState<string>(
    new Date().toISOString(),
  );
  const [showAddDatePicker, setShowAddDatePicker] = useState(false);

  // Activity Creation States
  const [newActivityType, setNewActivityType] = useState("email");
  const [newActivityTitle, setNewActivityTitle] = useState("");
  const [newActivityContent, setNewActivityContent] = useState("");
  const [newActivityChannel, setNewActivityChannel] =
    useState<Channel>("email");
  const [newActivityDirection, setNewActivityDirection] =
    useState<Direction>("sent");

  // Search/Filter states
  const [activitySearchQuery, setActivitySearchQuery] = useState("");
  const [activityTypeFilter, setActivityTypeFilter] = useState("all");
  const [activityChannelFilter, setActivityChannelFilter] = useState("all");
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);

  const fetchLinkableActivities = async (search: string = "") => {
    setIsLoadingActivities(true);
    try {
      const params: any = { limit: 7 };
      if (type === "person") params.related_person = data.id;
      else if (type === "company") params.related_company = data.id;

      if (search) params.search = search;

      await fetchActivities(params, true);
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
    .slice(0, 15);

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
          activity = await fetchActivityById(interaction.activity_log);
        }

        if (activity) {
          openDrawer({ id: activity.id, type: "activity" });
        } else {
          // Fallback to linking if activity not found
          if (!canWriteInteractions) {
            toast.error("You do not have permission to link interactions.");
            return;
          }
          setSelectedInteraction(interaction);
          setIsLinkModalOpen(true);
          toast.error("Activity not found in system. Please link it again.");
        }
      } catch (err) {
        console.error("Failed to resolve activity:", err);
        if (canWriteInteractions) {
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

      await addInteraction({
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
      setInteractionStep(1);
      setAddInteractionDate(new Date().toISOString());
      toast.success("Interaction added");
    } catch (err) {
      toast.error("Failed to add interaction");
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

      const response = await updateInteraction(editingInteraction.id, {
        interaction_type: newInteractionType,
        notes: newNotes,
        activity_log: activityId,
        date: editedDate || editingInteraction.date,
      });

      if (response?.ok) {
        toast.success("Interaction updated successfully");
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
      toast.error("Failed to update interaction");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteInteraction = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteInteractions([id]);
      toast.success("Interaction deleted");
    } catch (err) {
      toast.error("Failed to delete interaction");
    }
  };

  const relatedInteractions = interactions
    .filter((i) => {
      if (type === "person" && i.related_person === data.id) return true;
      if (type === "company" && i.related_company === data.id) return true;
      return false;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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
      <div className="flex items-center justify-between mb-6 px-8 pt-6">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold text-textPrimary uppercase tracking-tight">
            {t("recordPage.timelineHistory")}
          </h3>
        </div>
        {canWrite && (
          <button
            onClick={() => {
              setIsAddModalOpen(true);
              setSelectedActivityId(null);
              setShowActivityCreation(false);
              setInteractionStep(1);
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-card-hover hover:bg-card-hover-light rounded text-sm text-textPrimary border border-border transition-colors"
          >
            <Plus size={14} /> {t("recordPage.logInteraction")}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-8 pb-12 relative">
        {relatedInteractions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-textSecondary/40">
            <Activity size={48} className="mb-4 opacity-20" />
            <p className="text-sm font-medium">
              {t("recordPage.noInteractionsYet")}
            </p>
          </div>
        )}

        {/* Vertical Timeline Line */}
        {relatedInteractions.length > 0 && (
          <div
            className={`absolute ${isRTL ? "right-[84px]" : "left-[84px]"} top-4 bottom-0 w-px bg-border/20 z-0`}
          />
        )}

        <div className="space-y-6 w-full">
          {sortedGroups.map(([key, group]) => (
            <div key={key} className="space-y-6">
              {/* Date Header: Light box with border */}
              <div className="flex justify-start pt-4 mb-2">
                <div
                  className={`${isRTL ? "mr-6" : "ml-6"} mb-4 px-3 py-1.5 bg-card-bg text-textSecondary text-[11px] font-medium rounded-md border border-border/60 shadow-sm relative z-10 min-w-[120px] text-center`}
                >
                  {group.label}
                </div>
              </div>

              <div className="space-y-8">
                {group.items.map((interaction) => {
                  const activity =
                    activities.find((a) => a.id === interaction.activity_log) ||
                    interaction.activity_log_details;
                  const hasActivity = !!activity;
                  const Icon = getInteractionIcon(interaction, activities);

                  return (
                    <div
                      key={interaction.id}
                      className="relative flex items-start group hover:bg-white/[0.02] -mx-4 px-4 py-2 rounded-lg transition-colors"
                      onClick={() => handleInteractionClick(interaction)}
                    >
                      <div className="w-[70px] pt-2 text-center text-[11px] text-textSecondary/60 font-medium tabular-nums">
                        {format(new Date(interaction.date), "hh:mm a")}
                      </div>

                      <div className="w-[30px] flex justify-center relative z-10 pt-1">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center bg-record-dark border border-border/40 transition-transform group-hover:scale-105 shadow-sm ${getInteractionColor(interaction.interaction_type_color)}`}
                        >
                          <Icon size={14} />
                        </div>
                      </div>

                      <div
                        className={`flex-1 ${isRTL ? "mr-5 pl-4" : "ml-5 pr-4"} relative pt-1`}
                      >
                        <div className="cursor-pointer">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center flex-wrap gap-1.5 mb-2">
                                <span className="text-[13px] font-semibold text-textPrimary">
                                  {interaction.interaction_type_name}
                                </span>
                                {hasActivity && (
                                  <span className="text-[13px] font-semibold text-textSecondary">
                                    {t("recordPage.added")}
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-col gap-1">
                                {interaction.notes && (
                                  <p
                                    dir="auto"
                                    className={`text-[12px] text-textSecondary/80 leading-relaxed line-clamp-2 ${isRTL ? "text-right" : "text-left"}`}
                                  >
                                    <LinkifiedText text={interaction.notes} />
                                  </p>
                                )}

                                <div
                                  className={`flex items-center gap-2 mt-4 ${isRTL ? "flex-row-reverse" : "flex-row"}`}
                                >
                                  <p
                                    dir="auto"
                                    className={`text-[10px] text-textSecondary/40 font-medium ${isRTL ? "text-right" : "text-left"}`}
                                  >
                                    {t("recordPage.byUser", {
                                      name: interaction.created_by_name,
                                    })}
                                  </p>
                                  <span className="text-textSecondary/40">
                                    •
                                  </span>
                                  <span
                                    dir="auto"
                                    className={`text-[10px] text-textSecondary/40 ${isRTL ? "text-right" : "text-left"}`}
                                  >
                                    {format(
                                      new Date(interaction.date),
                                      "MMM d, yyyy",
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Actions Column */}
                            {canWrite && (
                              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
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
                                  className="p-1.5 hover:bg-white/5 rounded-md text-textSecondary hover:text-accent transition-all"
                                >
                                  <Pencil size={12} />
                                </button>
                                <button
                                  onClick={(e) =>
                                    handleDeleteInteraction(e, interaction.id)
                                  }
                                  className="p-1.5 hover:bg-red-500/5 rounded-md text-textSecondary hover:text-red-400 transition-all"
                                >
                                  <Trash2 size={12} />
                                </button>

                                {hasActivity && (
                                  <span className="flex items-center gap-1 text-[8px] text-accent/80 font-bold px-1 py-0.5 bg-accent/5 rounded border border-accent/20">
                                    {t("recordPage.linked")}
                                  </span>
                                )}
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
              {t("recordPage.logInteraction")}{" "}
              {interactionStep === 1
                ? t("recordPage.step1of2")
                : t("recordPage.step2of2")}
            </DialogTitle>
            <DialogDescription className="text-textSecondary text-[11px] mt-1 font-medium italic">
              {interactionStep === 1
                ? t("recordPage.logMetadata", {
                    name: data.name || "this lead",
                  })
                : t("recordPage.linkInteraction")}
            </DialogDescription>
          </div>

          <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
            {interactionStep === 1 ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-textSecondary uppercase tracking-widest flex items-center gap-1.5">
                        <Hash size={10} /> {t("recordPage.interactionCategory")}
                      </label>
                      <button
                        onClick={() => {
                          setIsAddModalOpen(false);
                          setPendingModalToReopen("add");
                          setIsInteractionTypeModalOpen(true);
                        }}
                        className="text-[10px] text-accent hover:text-accent/80 font-bold flex items-center gap-1 transition-colors"
                      >
                        {t("recordPage.manage")}
                      </button>
                    </div>
                    <select
                      value={newInteractionType}
                      onChange={(e) => setNewInteractionType(e.target.value)}
                      className="w-full bg-textarea-bg border border-border rounded-lg px-3 py-2.5 text-sm text-textPrimary outline-none focus:ring-1 focus:ring-accent transition-all hover:border-border/80"
                    >
                      <option value="">{t("recordPage.selectCategory")}</option>
                      {interactionTypes.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-textSecondary uppercase tracking-widest flex items-center gap-1.5">
                      <Calendar size={10} /> {t("recordPage.interactionDate")}
                    </label>
                    <Popover
                      open={showAddDatePicker}
                      onOpenChange={setShowAddDatePicker}
                    >
                      <PopoverTrigger asChild>
                        <button className="w-full bg-textarea-bg border border-border rounded-lg px-3 py-2.5 text-sm text-textPrimary outline-none focus:ring-1 focus:ring-accent transition-all hover:border-border/80 text-left flex items-center justify-between cursor-pointer">
                          <span>
                            {addInteractionDate
                              ? format(new Date(addInteractionDate), "PPp")
                              : format(new Date(), "PPp")}
                          </span>
                          <Calendar size={14} className="text-accent" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-auto p-0 z-[999] bg-textarea-bg border-border"
                        align="start"
                      >
                        <CalendarComponent
                          mode="single"
                          selected={
                            addInteractionDate
                              ? new Date(addInteractionDate)
                              : undefined
                          }
                          onSelect={(date) => {
                            if (date) {
                              const currentDate = addInteractionDate
                                ? new Date(addInteractionDate)
                                : new Date();
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
                    <AlignLeft size={10} /> {t("recordPage.observationNotes")}
                  </label>
                  <textarea
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder={t("recordPage.notesPlaceholder")}
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
                      <Activity size={10} />{" "}
                      {t("recordPage.relatedActivityLog")}
                    </label>
                    <button
                      onClick={() => {
                        setShowActivityCreation(!showActivityCreation);
                        setSelectedActivityId(null);
                      }}
                      className="text-[10px] font-bold text-accent uppercase tracking-wider hover:underline underline-offset-4"
                    >
                      {showActivityCreation
                        ? t("recordPage.linkExistingInstead")
                        : t("recordPage.createNewInstead")}
                    </button>
                  </div>

                  {!showActivityCreation ? (
                    <div className="space-y-4">
                      <div className="flex flex-col gap-3">
                        <div className="relative">
                          <Search
                            size={14}
                            className={`absolute ${isRTL ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 text-textSecondary/50`}
                          />
                          <input
                            type="text"
                            placeholder={t("recordPage.searchActivity")}
                            value={activitySearchQuery}
                            onChange={(e) =>
                              setActivitySearchQuery(e.target.value)
                            }
                            className={`w-full bg-card-bg border border-border rounded-lg ${isRTL ? "pr-10 pl-3" : "pl-10 pr-3"} py-2 text-xs text-textPrimary outline-none focus:border-accent`}
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
                            <option value="all">
                              {t("recordPage.allTypes")}
                            </option>
                            <option value="email">Email</option>
                            <option value="call">Call</option>
                            <option value="meeting">Meeting</option>
                            <option value="msg">Message</option>
                            <option value="update">Update</option>
                          </select>
                          <select
                            value={activityChannelFilter}
                            onChange={(e) =>
                              setActivityChannelFilter(e.target.value)
                            }
                            className="bg-card-bg border border-border rounded-lg px-2 py-1.5 text-[10px] text-textSecondary outline-none focus:border-accent cursor-pointer"
                          >
                            <option value="all">
                              {t("recordPage.allChannels")}
                            </option>
                            <option value="email">Email</option>
                            <option value="linkedin">LinkedIn</option>
                            <option value="whatsapp">WhatsApp</option>
                            <option value="system">System</option>
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
                              {t("recordPage.noSuitableActivities")}
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
                            {t("recordPage.activityType")}
                          </label>
                          <select
                            value={newActivityType}
                            onChange={(e) => setNewActivityType(e.target.value)}
                            className="w-full bg-card-bg border border-border rounded-lg px-2 py-2 text-xs text-textPrimary outline-none focus:border-accent"
                          >
                            <option value="email">Email</option>
                            <option value="call">Call</option>
                            <option value="meeting">Meeting</option>
                            <option value="msg">Message</option>
                            <option value="update">Update</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-textSecondary/80 uppercase">
                            {t("recordPage.briefTitle")}
                          </label>
                          <input
                            type="text"
                            value={newActivityTitle}
                            onChange={(e) =>
                              setNewActivityTitle(e.target.value)
                            }
                            placeholder={t("recordPage.titlePlaceholder")}
                            className="w-full bg-card-bg border border-border rounded-lg px-2 py-2 text-xs text-textPrimary outline-none focus:border-accent"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-textSecondary/80 uppercase">
                            {t("recordPage.channel")}
                          </label>
                          <select
                            value={newActivityChannel}
                            onChange={(e) =>
                              setNewActivityChannel(e.target.value as Channel)
                            }
                            className="w-full bg-card-bg border border-border rounded-lg px-2 py-2 text-xs text-textPrimary outline-none focus:border-accent"
                          >
                            <option value="email">Email</option>
                            <option value="linkedin">LinkedIn</option>
                            <option value="whatsapp">WhatsApp</option>
                            <option value="system">System</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-textSecondary/80 uppercase">
                            {t("recordPage.direction")}
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
                            <option value="sent">{t("recordPage.sent")}</option>
                            <option value="received">
                              {t("recordPage.received")}
                            </option>
                            <option value="system">
                              {t("recordPage.system")}
                            </option>
                          </select>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-textSecondary/80 uppercase">
                          Activity Details
                        </label>
                        <textarea
                          value={newActivityContent}
                          onChange={(e) =>
                            setNewActivityContent(e.target.value)
                          }
                          placeholder={t("recordPage.detailsPlaceholder")}
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
              {t("recordPage.cancel")}
            </Button>
            <div className="flex items-center gap-2">
              {interactionStep === 2 && (
                <Button
                  variant="outline"
                  onClick={() => setInteractionStep(1)}
                  className="border-border hover:bg-white/5 text-[10px] font-bold uppercase tracking-wider h-10 px-4"
                >
                  {t("recordPage.back")}
                </Button>
              )}
              {interactionStep === 1 ? (
                <Button
                  onClick={() => setInteractionStep(2)}
                  disabled={!newInteractionType}
                  className="bg-accent hover:bg-blue-600 text-white font-bold uppercase tracking-widest text-[10px] h-10 px-6 shadow-[0_0_20px_-5px_theme(colors.accent.DEFAULT)]"
                >
                  {t("recordPage.continue")}
                  <ArrowRight size={14} className={isRTL ? "mr-2" : "ml-2"} />
                </Button>
              ) : (
                <Button
                  onClick={handleCreateInteraction}
                  disabled={isCreating}
                  className="bg-accent hover:bg-blue-600 text-white font-bold uppercase tracking-widest text-[10px] h-10 px-6 shadow-[0_0_20px_-5px_theme(colors.accent.DEFAULT)]"
                >
                  {isCreating ? (
                    <>
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${isRTL ? "ml-2" : "mr-2"} animate-spin`}
                      />
                      {t("recordPage.saving")}
                    </>
                  ) : (
                    t("recordPage.confirmAndSave")
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
              {t("recordPage.editInteraction")}{" "}
              {interactionStep === 1
                ? t("recordPage.step1of2")
                : t("recordPage.step2of2")}
            </DialogTitle>
            <DialogDescription className="text-textSecondary text-[11px] mt-1 font-medium italic">
              {interactionStep === 1
                ? t("recordPage.updateMetadata")
                : t("recordPage.changeLinkedActivity")}
            </DialogDescription>
          </div>

          <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
            {interactionStep === 1 ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-textSecondary uppercase tracking-widest flex items-center gap-1.5">
                        <Hash size={10} /> {t("recordPage.interactionCategory")}
                      </label>
                      <button
                        onClick={() => {
                          setIsEditModalOpen(false);
                          setPendingModalToReopen("edit");
                          setIsInteractionTypeModalOpen(true);
                        }}
                        className="text-[10px] text-accent hover:text-accent/80 font-bold flex items-center gap-1 transition-colors"
                      >
                        {t("recordPage.manage")}
                      </button>
                    </div>
                    <select
                      value={newInteractionType}
                      onChange={(e) => setNewInteractionType(e.target.value)}
                      className="w-full bg-textarea-bg border border-border rounded-lg px-3 py-2.5 text-sm text-textPrimary outline-none focus:ring-1 focus:ring-accent transition-all hover:border-border/80"
                    >
                      <option value="">{t("recordPage.selectCategory")}</option>
                      {interactionTypes.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-textSecondary uppercase tracking-widest flex items-center gap-1.5">
                      <Calendar size={10} /> {t("recordPage.interactionDate")}
                    </label>
                    <Popover
                      open={showDatePicker}
                      onOpenChange={setShowDatePicker}
                    >
                      <PopoverTrigger asChild>
                        <button className="w-full bg-textarea-bg border border-border rounded-lg px-3 py-2.5 text-sm text-textPrimary outline-none focus:ring-1 focus:ring-accent transition-all hover:border-border/80 text-left flex items-center justify-between cursor-pointer">
                          <span>
                            {editedDate
                              ? format(new Date(editedDate), "PPp")
                              : editingInteraction
                                ? format(
                                    new Date(editingInteraction.date),
                                    "PPp",
                                  )
                                : format(new Date(), "PPp")}
                          </span>
                          <Calendar size={14} className="text-accent" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-auto p-0 z-[999] bg-textarea-bg border-border"
                        align="start"
                      >
                        <CalendarComponent
                          mode="single"
                          selected={
                            editedDate ? new Date(editedDate) : undefined
                          }
                          onSelect={(date) => {
                            if (date) {
                              const currentDate = editedDate
                                ? new Date(editedDate)
                                : new Date();
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
                    <AlignLeft size={10} /> {t("recordPage.observationNotes")}
                  </label>
                  <textarea
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder={t("recordPage.notesPlaceholder")}
                    className="w-full bg-textarea-bg border border-border rounded-lg px-3 py-2.5 text-sm text-textPrimary outline-none focus:ring-1 focus:ring-accent min-h-[120px] resize-none transition-all hover:border-border/80 custom-scrollbar"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                <div className="bg-textarea-bg border border-border rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-textSecondary uppercase tracking-widest flex items-center gap-1.5">
                      <Activity size={10} />{" "}
                      {t("recordPage.relatedActivityLog")}
                    </label>
                    <div className="flex items-center gap-3">
                      {selectedActivityId && !showActivityCreation && (
                        <button
                          onClick={() => setSelectedActivityId(null)}
                          className="text-[10px] font-bold text-red-400/80 uppercase tracking-wider hover:underline underline-offset-4"
                        >
                          {t("recordPage.unlink")}
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
                          ? t("recordPage.cancelCreation")
                          : t("recordPage.linkDifferentCreateNew")}
                      </button>
                    </div>
                  </div>

                  {!showActivityCreation ? (
                    <div className="space-y-4">
                      <div className="flex flex-col gap-3">
                        <div className="relative">
                          <Search
                            size={14}
                            className={`absolute ${isRTL ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 text-textSecondary/50`}
                          />
                          <input
                            type="text"
                            placeholder={t("recordPage.searchActivity")}
                            value={activitySearchQuery}
                            onChange={(e) =>
                              setActivitySearchQuery(e.target.value)
                            }
                            className={`w-full bg-card-bg border border-border rounded-lg ${isRTL ? "pr-10 pl-3" : "pl-10 pr-3"} py-2 text-xs text-textPrimary outline-none focus:border-accent`}
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
                            <option value="all">
                              {t("recordPage.allTypes")}
                            </option>
                            <option value="email">Email</option>
                            <option value="call">Call</option>
                            <option value="meeting">Meeting</option>
                            <option value="msg">Message</option>
                            <option value="update">Update</option>
                          </select>
                          <select
                            value={activityChannelFilter}
                            onChange={(e) =>
                              setActivityChannelFilter(e.target.value)
                            }
                            className="bg-card-bg border border-border rounded-lg px-2 py-1.5 text-[10px] text-textSecondary outline-none focus:border-accent cursor-pointer"
                          >
                            <option value="all">
                              {t("recordPage.allChannels")}
                            </option>
                            <option value="email">Email</option>
                            <option value="linkedin">LinkedIn</option>
                            <option value="whatsapp">WhatsApp</option>
                            <option value="system">System</option>
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
                              {t("recordPage.noSuitableActivities")}
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
                            {t("recordPage.activityType")}
                          </label>
                          <select
                            value={newActivityType}
                            onChange={(e) => setNewActivityType(e.target.value)}
                            className="w-full bg-card-bg border border-border rounded-lg px-2 py-2 text-xs text-textPrimary outline-none focus:border-accent"
                          >
                            <option value="email">Email</option>
                            <option value="call">Call</option>
                            <option value="meeting">Meeting</option>
                            <option value="msg">Message</option>
                            <option value="update">Update</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-textSecondary/80 uppercase">
                            {t("recordPage.briefTitle")}
                          </label>
                          <input
                            type="text"
                            value={newActivityTitle}
                            onChange={(e) =>
                              setNewActivityTitle(e.target.value)
                            }
                            placeholder={t("recordPage.titlePlaceholder")}
                            className="w-full bg-card-bg border border-border rounded-lg px-2 py-2 text-xs text-textPrimary outline-none focus:border-accent"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-textSecondary/80 uppercase">
                            {t("recordPage.channel")}
                          </label>
                          <select
                            value={newActivityChannel}
                            onChange={(e) =>
                              setNewActivityChannel(e.target.value as Channel)
                            }
                            className="w-full bg-card-bg border border-border rounded-lg px-2 py-2 text-xs text-textPrimary outline-none focus:border-accent"
                          >
                            <option value="email">Email</option>
                            <option value="linkedin">LinkedIn</option>
                            <option value="whatsapp">WhatsApp</option>
                            <option value="system">System</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-textSecondary/80 uppercase">
                            {t("recordPage.direction")}
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
                            <option value="sent">{t("recordPage.sent")}</option>
                            <option value="received">
                              {t("recordPage.received")}
                            </option>
                            <option value="system">
                              {t("recordPage.system")}
                            </option>
                          </select>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-textSecondary/80 uppercase">
                          Activity Details
                        </label>
                        <textarea
                          value={newActivityContent}
                          onChange={(e) =>
                            setNewActivityContent(e.target.value)
                          }
                          placeholder={t("recordPage.detailsPlaceholder")}
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
              {t("recordPage.cancel")}
            </Button>
            <div className="flex items-center gap-2">
              {interactionStep === 2 && (
                <Button
                  variant="outline"
                  onClick={() => setInteractionStep(1)}
                  className="border-border hover:bg-white/5 text-[10px] font-bold uppercase tracking-wider h-10 px-4"
                >
                  {t("recordPage.back")}
                </Button>
              )}
              {interactionStep === 1 ? (
                <Button
                  onClick={() => setInteractionStep(2)}
                  disabled={!newInteractionType}
                  className="bg-accent hover:bg-blue-600 text-white font-bold uppercase tracking-widest text-[10px] h-10 px-6 shadow-[0_0_20px_-5px_theme(colors.accent.DEFAULT)]"
                >
                  {t("recordPage.continue")}
                  <ArrowRight size={14} className={isRTL ? "mr-2" : "ml-2"} />
                </Button>
              ) : (
                <Button
                  onClick={handleUpdateInteraction}
                  disabled={isCreating}
                  className="bg-accent hover:bg-blue-600 text-white font-bold uppercase tracking-widest text-[10px] h-10 px-6 shadow-[0_0_20px_-5px_theme(colors.accent.DEFAULT)]"
                >
                  {isCreating ? (
                    <>
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${isRTL ? "ml-2" : "mr-2"} animate-spin`}
                      />
                      {t("recordPage.saving")}
                    </>
                  ) : (
                    t("recordPage.saveChanges")
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

      {/* Link Modal Ported from ContextDrawer */}
      <Dialog open={isLinkModalOpen} onOpenChange={setIsLinkModalOpen}>
        <DialogContent className="sm:max-w-[550px] bg-card-bg border-border text-textPrimary z-[100] p-0 overflow-hidden shadow-2xl">
          <div className="px-6 py-4 border-b border-border bg-dropdown-bg">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Link2 className="w-5 h-5 text-accent" />
              {t("recordPage.linkInteractionModal")}
            </DialogTitle>
            <DialogDescription className="text-textSecondary text-[11px] mt-1 italic">
              {t("recordPage.connectForTransparency")}
            </DialogDescription>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex flex-col gap-3">
              <div className="relative">
                <Search
                  size={14}
                  className={`absolute ${isRTL ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 text-textSecondary/50`}
                />
                <input
                  type="text"
                  placeholder={t("recordPage.searchActivity")}
                  value={activitySearchQuery}
                  onChange={(e) => setActivitySearchQuery(e.target.value)}
                  className={`w-full bg-textarea-bg border border-border rounded-lg ${isRTL ? "pr-10 pl-3" : "pl-10 pr-3"} py-2.5 text-xs text-textPrimary outline-none focus:border-accent transition-all`}
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
                  className="bg-textarea-bg border border-border rounded-lg px-2 py-1.5 text-[10px] text-textSecondary outline-none focus:border-accent cursor-pointer"
                >
                  <option value="all">{t("recordPage.allTypes")}</option>
                  <option value="email">Email</option>
                  <option value="call">Call</option>
                  <option value="meeting">Meeting</option>
                  <option value="note">Internal Note</option>
                </select>
                <select
                  value={activityChannelFilter}
                  onChange={(e) => setActivityChannelFilter(e.target.value)}
                  className="bg-textarea-bg border border-border rounded-lg px-2 py-1.5 text-[10px] text-textSecondary outline-none focus:border-accent cursor-pointer"
                >
                  <option value="all">{t("recordPage.allChannels")}</option>
                  <option value="email">Email</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="system">System</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
              {filteredLinkableActivities.length > 0 ? (
                filteredLinkableActivities.map((activity) => (
                  <div
                    key={activity.id}
                    onClick={() =>
                      setSelectedActivityId(
                        activity.id === selectedActivityId ? null : activity.id,
                      )
                    }
                    className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center gap-3 ${selectedActivityId === activity.id ? "bg-accent/10 border-accent/50" : "bg-card-bg border-border hover:border-border/80"}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center bg-background/50 text-accent`}
                    >
                      <Activity size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-bold text-textPrimary truncate flex items-center justify-between gap-2">
                        <span className="truncate">
                          {activity.title ||
                            activity.content.substring(0, 40) + "..."}
                        </span>
                      </div>
                      <div className="text-[10px] text-textSecondary font-medium flex items-center gap-2">
                        <span className="tabular-nums">
                          {format(new Date(activity.date), "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>
                    {selectedActivityId === activity.id && (
                      <Check size={14} className="text-accent" />
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-10 border border-dashed border-border rounded-xl bg-textarea-bg">
                  <Activity size={24} className="mx-auto mb-2 opacity-20" />
                  <p className="text-[10px] text-textSecondary font-medium">
                    {t("recordPage.noSuitableActivities")}
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className="px-6 py-4 bg-dropdown-bg border-t border-border flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => setIsLinkModalOpen(false)}
              className="text-textSecondary hover:text-textPrimary hover:bg-white/5 text-xs font-bold uppercase tracking-wider"
            >
              {t("recordPage.cancel")}
            </Button>
            <Button
              onClick={async () => {
                if (!selectedInteraction || !selectedActivityId) return;
                await updateInteraction(selectedInteraction.id, {
                  activity_log: selectedActivityId,
                });
                setIsLinkModalOpen(false);
                toast.success("Interaction linked successfully");
              }}
              disabled={!selectedActivityId}
              className="bg-accent hover:bg-blue-600 text-white font-bold uppercase tracking-widest text-[10px] h-10 px-6 shadow-[0_0_20px_-5px_theme(colors.accent.DEFAULT)]"
            >
              {t("recordPage.confirmLinking")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const ActionsTab = ({
  data,
  type,
  onUpdate,
  canWrite,
}: {
  data: any;
  type: string;
  onUpdate: any;
  canWrite: boolean;
}) => {
  const { t } = useTranslation();
  const { activities } = useStore();
  const [lastAction, setLastAction] = useState(data.lastAction || "");
  const [recommended, setRecommended] = useState(data.recommendedAction || "");
  const [savingField, setSavingField] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setLastAction(data.lastAction || "");
    setRecommended(data.recommendedAction || "");
  }, [data.id, data.lastAction, data.recommendedAction]);

  const handleSave = async (field: string, value: string) => {
    if (value === data[field]) return;
    setSavingField(field);
    setErrors((prev) => ({ ...prev, [field]: "" }));
    try {
      const response = await onUpdate(field, value);
      if (
        response &&
        typeof response === "object" &&
        "ok" in response &&
        !response.ok
      ) {
        const errData = await response.json();
        const fieldError = Object.values(errData)[0];
        const msg =
          (Array.isArray(fieldError) ? fieldError[0] : fieldError) ||
          errData.detail ||
          "Invalid value";
        setErrors((prev) => ({ ...prev, [field]: String(msg) }));
      }
    } catch (e) {
      setErrors((prev) => ({ ...prev, [field]: "Failed to save" }));
    } finally {
      setSavingField(null);
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent,
    field: string,
    value: string,
  ) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSave(field, value);
    }
  };

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
        ((type === "person" && a.relatedPersonId === data.id) ||
          (type === "company" && a.relatedCompanyId === data.id)) &&
        a.channel !== "system",
    )
    .sort((a, b) => parseRelativeTime(a.date) - parseRelativeTime(b.date));

  const lastMsg =
    relatedActivities.length > 0
      ? relatedActivities[relatedActivities.length - 1]
      : null;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-record-bg p-6 rounded-xl border border-border">
          <h3 className="text-xs font-bold text-textSecondary uppercase mb-4 flex items-center gap-2">
            <Activity size={14} className="text-accent" />
            {t("recordPage.relationshipStatus")}
          </h3>
          <div className="flex items-center gap-6">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-textSecondary uppercase">
                {t("recordPage.lastMessage")}
              </span>
              <div className="flex items-center gap-2 text-sm text-textPrimary">
                {lastMsg ? (
                  <>
                    <ChannelIcon channel={lastMsg.channel} />
                    <span className="truncate max-w-[200px] italic">
                      "{lastMsg.content.substring(0, 50)}"...
                    </span>
                  </>
                ) : (
                  <span className="text-textSecondary opacity-50">
                    {t("recordPage.noMessagesYet")}
                  </span>
                )}
              </div>
            </div>
            <div className="h-10 w-px bg-border"></div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-textSecondary uppercase">
                {t("recordPage.responseStatus")}
              </span>
              <div className="flex items-center gap-2">
                {lastMsg && lastMsg.direction === "sent" ? (
                  <span className="px-2 py-0.5 bg-yellow-600/70 text-yellow-100 rounded text-xs font-medium border border-yellow-500/30">
                    {t("recordPage.waitingForResponse")}
                  </span>
                ) : lastMsg && lastMsg.direction === "received" ? (
                  <span className="px-2 py-0.5 bg-red-700/70 text-red-200 rounded text-xs font-medium border border-red-500/30">
                    {t("recordPage.followUpRequired")}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-gray-700 text-gray-200 rounded text-xs font-medium">
                    {t("recordPage.neutral")}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-record-bg p-6 rounded-xl border border-border">
          <h3 className="text-xs font-bold text-textSecondary uppercase mb-6 flex items-center gap-2">
            <Target size={14} className="text-accent" />
            {t("recordPage.actionPlan")}
          </h3>
          <div className="space-y-8">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-textPrimary uppercase">
                  {t("recordPage.lastActionTaken")}
                </label>
                <div className="flex items-center gap-2">
                  {savingField === "lastAction" && (
                    <div className="animate-spin h-3 w-3 border-2 border-accent border-t-transparent rounded-full" />
                  )}
                  <span className="text-[10px] text-textSecondary">
                    {t("recordPage.visibleInDataTable")}
                  </span>
                </div>
              </div>
              <textarea
                dir="auto"
                readOnly={!canWrite}
                className={`w-full bg-record-input border rounded-lg p-3 text-sm text-textPrimary focus:outline-none focus:border-accent min-h-[80px] resize-none transition-colors ${errors.lastAction ? "border-red-500 bg-red-500/5" : "border-border"} ${!canWrite ? "cursor-default" : ""}`}
                value={lastAction}
                placeholder={t("recordPage.lastActionPlaceholder")}
                onChange={(e) => setLastAction(e.target.value)}
                onBlur={() => handleSave("lastAction", lastAction)}
                onKeyDown={(e) => handleKeyDown(e, "lastAction", lastAction)}
                title={errors.lastAction || ""}
              />
              {errors.lastAction && (
                <div className="text-red-500 text-[10px]">
                  {errors.lastAction}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-accent uppercase">
                  {t("recordPage.recommendedNextStep")}
                </label>
                <div className="flex items-center gap-2">
                  {savingField === "recommendedAction" && (
                    <div className="animate-spin h-3 w-3 border-2 border-accent border-t-transparent rounded-full" />
                  )}
                  {/*<div className="flex items-center gap-1 text-accent">
                    <Sparkles size={10} />
                    <span className="text-[10px] font-bold">AI STRATEGY</span>
                  </div>*/}
                </div>
              </div>
              <textarea
                dir="auto"
                readOnly={!canWrite}
                className={`w-full bg-record-input border rounded-lg p-3 text-sm text-textPrimary focus:outline-none focus:border-accent min-h-[100px] resize-none transition-colors ${errors.recommendedAction ? "border-red-500 bg-red-500/5" : "border-accent/30"} ${!canWrite ? "cursor-default" : ""}`}
                value={recommended}
                placeholder={t("recordPage.nextStepPlaceholder")}
                onChange={(e) => setRecommended(e.target.value)}
                onBlur={() => handleSave("recommendedAction", recommended)}
                onKeyDown={(e) =>
                  handleKeyDown(e, "recommendedAction", recommended)
                }
                title={errors.recommendedAction || ""}
              />
              {errors.recommendedAction && (
                <div className="text-red-500 text-[10px]">
                  {errors.recommendedAction}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const TasksPanel = ({
  tasks,
  parentId,
  onAdd,
  onOpen,
  onDelete,
  onStatusChange,
  canWrite,
}: any) => {
  const { t } = useTranslation();
  const [, forceUpdate] = useState({});

  const sortedTasks = sortWithPinnedFirst(parentId, "task", tasks);

  const handleTogglePin = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    togglePin(parentId, "task", taskId);
    forceUpdate({});
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-textPrimary">
          {t("recordPage.tasks")}
        </h3>
        {canWrite && (
          <button
            onClick={onAdd}
            className="flex items-center gap-2 px-3 py-1.5 bg-card-hover hover:bg-card-hover-light rounded text-sm text-textPrimary border border-border transition-colors"
          >
            <Plus size={14} /> {t("recordPage.addTask")}
          </button>
        )}
      </div>
      <div className="space-y-3">
        {sortedTasks.map((task: Task) => {
          const pinned = isPinned(parentId, "task", task.id);
          return (
            <div
              key={task.id}
              className={`flex items-center justify-between p-4 border rounded-lg transition-colors group cursor-pointer ${pinned ? "bg-white/[0.03] border-accent/30" : "bg-record-bg border-border hover:border-textSecondary/50"}`}
              onClick={() => onOpen(task.id)}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center ${canWrite ? "cursor-pointer" : "cursor-default"} transition-colors ${task.status === "Done" ? "bg-green-500 border-green-500" : "border-textSecondary hover:border-textPrimary"}`}
                  onClick={canWrite ? (e) => {
                    e.stopPropagation();
                    onStatusChange(
                      task.id,
                      task.status === "Done" ? "Todo" : "Done",
                    );
                  } : (e) => e.stopPropagation()}
                >
                  {task.status === "Done" && (
                    <Check size={12} className="text-black" />
                  )}
                </div>
                <div className="flex-1">
                  <span
                    className={`text-sm font-medium ${task.status === "Done" ? "line-through text-textSecondary" : "text-textPrimary"}`}
                  >
                    <LinkifiedText text={task.title} />
                  </span>
                  <div className="flex items-center gap-3 mt-1 text-xs text-textSecondary">
                    <span className="bg-card-hover px-1.5 py-0.5 rounded">
                      {task.status}
                    </span>
                    {task.dueDate && (
                      <span>
                        {t("recordPage.due")}{" "}
                        {format(new Date(task.dueDate), "MMM d, yyyy")}
                      </span>
                    )}
                    {task.assignee && (
                      <span>
                        {t("recordPage.assignedTo", { name: task.assignee })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => handleTogglePin(e, task.id)}
                  className={`p-1.5 rounded transition-all ${pinned ? "text-accent hover:text-accent/80" : "text-textSecondary/30 hover:text-textSecondary opacity-0 group-hover:opacity-100"}`}
                >
                  {pinned ? <Pin size={14} /> : <PinOff size={14} />}
                </button>
                {canWrite && (
                  <button
                    className="p-2 text-textSecondary hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(task.id);
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {sortedTasks.length === 0 && (
          <div className="text-center py-10 text-textSecondary bg-record-bg rounded-lg border border-border border-dashed">
            {t("recordPage.noTasksYet")}
          </div>
        )}
      </div>
    </div>
  );
};

const NotesPanel = ({
  notes,
  parentId,
  onAdd,
  onOpen,
  onDelete,
  canWrite,
}: any) => {
  const { t } = useTranslation();
  const { language } = useStore();
  const isRTL = language === "ar";
  const [, forceUpdate] = useState({});

  const sortedNotes = sortWithPinnedFirst(parentId, "note", notes);

  const handleTogglePin = (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    togglePin(parentId, "note", noteId);
    forceUpdate({});
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-textPrimary">
          {t("recordPage.notes")}
        </h3>
        {canWrite && (
          <button
            onClick={onAdd}
            className="flex items-center gap-2 px-3 py-1.5 bg-card-hover hover:bg-card-hover-light rounded text-sm text-textPrimary border border-border transition-colors"
          >
            <Plus size={14} /> {t("recordPage.addNote")}
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {sortedNotes.map((n: Note) => {
          const pinned = isPinned(parentId, "note", n.id);
          return (
            <div
              key={n.id}
              className={`p-4 border rounded-lg h-48 flex flex-col transition-colors cursor-pointer group relative ${pinned ? "bg-white/[0.03] border-accent/30" : "bg-record-bg border-border hover:border-textSecondary/50"}`}
              onClick={() => onOpen(n.id)}
            >
              <div className="flex justify-between items-start mb-2">
                <h4
                  dir="auto"
                  className={`font-semibold text-textPrimary truncate ${isRTL ? "pl-8" : "pr-8"}`}
                >
                  {n.title}
                </h4>
                <div
                  className={`flex items-center gap-1 absolute top-3 ${isRTL ? "left-3" : "right-3"}`}
                >
                  <button
                    onClick={(e) => handleTogglePin(e, n.id)}
                    className={`p-1.5 rounded transition-all ${pinned ? "text-accent hover:text-accent/80" : "text-textSecondary/30 hover:text-textSecondary opacity-0 group-hover:opacity-100"}`}
                  >
                    {pinned ? <Pin size={14} /> : <PinOff size={14} />}
                  </button>
                  {canWrite && (
                    <button
                      className="p-1.5 text-textSecondary hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity rounded hover:bg-card-hover"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(n.id);
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
              <p
                dir="auto"
                className={`text-sm text-textSecondary line-clamp-5 flex-1 whitespace-pre-wrap font-mono ${isRTL ? "text-right" : "text-left"}`}
              >
                <LinkifiedText text={n.content || t("recordPage.noContent")} />
              </p>
              <div
                className="text-xs text-textSecondary mt-3 pt-3 border-t border-border/50"
                dir="auto"
              >
                {format(new Date(n.createdAt), "MMM d, yyyy")}
              </div>
            </div>
          );
        })}
        {sortedNotes.length === 0 && (
          <div className="col-span-2 text-center py-10 text-textSecondary bg-record-bg rounded-lg border border-border border-dashed">
            {t("recordPage.noNotesYet")}
          </div>
        )}
      </div>
    </div>
  );
};

// --- PROPERTY EDITING COMPONENT ---

const EditableSidebarProp = ({
  icon: Icon,
  label,
  value,
  field,
  type = "text",
  onSave,
  canWrite = true,
}: any) => {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    customStages,
    customLeadTypes,
    customLeadSources,
    companies,
    language,
  } = useStore();
  const isRTL = language === "ar";
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) {
      setLocalValue(value);
      setError(null);
    }
  }, [value, isEditing]);

  useEffect(() => {
    if (isEditing) {
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isEditing]);

  const handleSave = async (valToSave?: any) => {
    let finalVal = valToSave !== undefined ? valToSave : localValue;

    // Auto-inject https:// for URL fields if protocol is missing
    const lowerLabel = label.toLowerCase();
    const isUrlField =
      ["linkedin", "website", "domain", "avatar"].includes(lowerLabel) ||
      lowerLabel.includes("url");

    if (isUrlField && typeof finalVal === "string" && finalVal.trim() !== "") {
      const trimmed = finalVal.trim();
      if (!/^https?:\/\//i.test(trimmed)) {
        finalVal = `https://${trimmed}`;
        setLocalValue(finalVal);
      }
    }

    if (finalVal === value && !error) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const response = await onSave(finalVal);
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
        setIsEditing(false);
      }
    } catch (e) {
      setError("Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && type !== "companySelect") handleSave();
    if (e.key === "Escape") {
      setIsEditing(false);
      setLocalValue(value);
    }
  };

  const isListType = ["stage", "leadType", "leadSource"].includes(type);

  if (type === "date") {
    const dateValue = value ? new Date(value) : undefined;
    return (
      <div className="flex flex-col gap-1 group relative">
        <div
          className={`flex items-center gap-2 text-xs text-textSecondary ${isRTL ? "pr-1" : "pl-1"}`}
        >
          <Calendar size={12} />
          <span>{label}</span>
        </div>
        <div className={`${isRTL ? "pr-5" : "pl-5"} min-h-[20px]`}>
          <Popover
            open={isEditing && canWrite}
            onOpenChange={(open) => {
              if (canWrite) {
                setIsEditing(open);
                if (!open) setError(null);
              }
            }}
          >
            <PopoverTrigger asChild>
              <div
                className={`text-sm text-textPrimary break-words ${canWrite ? "cursor-pointer hover:bg-card-hover border-transparent hover:border-border" : "cursor-default border-transparent"} rounded px-2 py-1 ${isRTL ? "-mr-1" : "-ml-1"} transition-colors border flex items-center gap-2 w-full min-h-[28px] ${error ? "border-red-500 bg-red-500/10" : ""}`}
                onClick={canWrite ? undefined : (e) => e.stopPropagation()}
                title={error || ""}
              >
                {dateValue ? (
                  <span dir="auto" className="flex-1 text-start">
                    {format(dateValue, "PPP")}
                  </span>
                ) : (
                  <span className="text-textSecondary opacity-50 text-xs italic">
                    {t("recordPage.addDate")}
                  </span>
                )}
                {isSaving && (
                  <div
                    className={`${isRTL ? "mr-auto" : "ml-auto"} animate-spin h-3 w-3 border-2 border-accent border-t-transparent rounded-full`}
                  />
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
                    handleSave(date.toISOString());
                  }
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    );
  }

  const getBadgeColor = (val: string, type: string) => {
    if (type === "leadType") {
      const leadTypeColors: any = {
        Prospect: "bg-blue-700/70 text-blue-200",
        "Cold Lead": "bg-cyan-700/70 text-cyan-200",
        "Warm Lead": "bg-orange-700/70 text-orange-200",
        "Hot Lead": "bg-red-700/70 text-red-200",
        Client: "bg-green-700/70 text-green-200",
      };
      return leadTypeColors[val] || "bg-card-hover text-textSecondary";
    }
    if (type === "leadSource") {
      const source = customLeadSources.find((s: any) => (s.label || s) === val);
      if (source) return source.color;
      return "bg-card-hover text-textSecondary";
    }
    if (type === "stage") {
      const stageColors: any = {
        Lead: "bg-gray-700 text-gray-200",
        Qualified: "bg-indigo-700/70 text-indigo-200",
        Negotiation: "bg-yellow-600/70 text-yellow-100",
        Closed: "bg-green-700/70 text-green-200",
        Lost: "bg-red-700/70 text-red-200",
      };
      return stageColors[val] || "bg-card-hover text-textSecondary";
    }
    return "";
  };

  if (type === "companySelect") {
    const filteredCompanies = companies.filter((c: Company) =>
      c.name.toLowerCase().includes((localValue || "").toLowerCase()),
    );

    return (
      <div className="flex flex-col gap-1 group">
        <div
          className={`flex items-center gap-2 text-xs text-textSecondary ${isRTL ? "pr-1" : "pl-1"}`}
        >
          {Icon && <Icon size={12} />}
          <span>{label}</span>
        </div>
        <div className={`${isRTL ? "pr-6" : "pl-6"} min-h-[20px] relative`}>
          {isEditing ? (
            <div className="relative w-full">
              <input
                ref={inputRef}
                className={`w-full bg-record-input border rounded px-2 py-1 text-sm text-textPrimary outline-none ${error ? "border-red-500" : "border-accent"}`}
                value={localValue || ""}
                onChange={(e) => setLocalValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter")
                    handleSave({ name: localValue, id: null });
                  if (e.key === "Escape") setIsEditing(false);
                }}
              />
              <div
                className={`absolute top-full ${isRTL ? "right-0" : "left-0"} w-full bg-dropdown-bg border border-border shadow-xl rounded-md z-[60] mt-1 max-h-[200px] overflow-y-auto`}
              >
                {filteredCompanies.map((c: Company) => (
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
                    <span dir="auto" className="text-sm text-textPrimary">
                      {c.name}
                    </span>
                  </div>
                ))}
                {filteredCompanies.length === 0 && localValue && (
                  <div className="px-3 py-2 text-textSecondary text-xs italic">
                    No matching companies
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div
              className={`text-sm text-textPrimary break-words ${canWrite ? "cursor-pointer hover:bg-card-hover border-transparent hover:border-border" : "cursor-default border-transparent"} rounded px-2 py-1 ${isRTL ? "-mr-1" : "-ml-1"} transition-colors border flex items-center gap-2 w-full min-h-[28px] ${error ? "border-red-500 bg-red-500/10" : ""}`}
              onClick={canWrite ? () => setIsEditing(true) : undefined}
              title={error || ""}
            >
              {value ? (
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded bg-red-500 flex items-center justify-center text-[8px] font-bold text-white">
                    {value.charAt(0)}
                  </span>
                  <span dir="auto" className="flex-1 text-start">
                    {value}
                  </span>
                </div>
              ) : (
                <span className="text-textSecondary opacity-50 italic text-xs">
                  {t("recordPage.selectCompany")}
                </span>
              )}
              {isSaving && (
                <div
                  className={`${isRTL ? "mr-auto" : "ml-auto"} animate-spin h-3 w-3 border-2 border-accent border-t-transparent rounded-full`}
                />
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 group">
      <div
        className={`flex items-center gap-2 text-xs text-textSecondary ${isRTL ? "pr-1" : "pl-1"}`}
      >
        {Icon && <Icon size={12} />}
        <span>{label}</span>
      </div>
      <div className={`${isRTL ? "pr-6" : "pl-6"} min-h-[20px] relative`}>
        {isListType ? (
          <div className="flex items-center relative">
            <select
              className={` ${canWrite ? "hover:bg-card-hover border-transparent hover:border-border/50 cursor-pointer" : "border-transparent cursor-default"} border text-sm px-2 py-0.5 ${isRTL ? "-mr-1" : "-ml-1"} rounded w-full ${isRTL ? "pl-8" : "pr-8"} outline-none focus:border-accent transition-colors appearance-none font-medium ${getBadgeColor(localValue, type)} ${isSaving ? "opacity-50" : ""}`}
              value={localValue || ""}
              onChange={(e) => {
                setLocalValue(e.target.value);
                handleSave(e.target.value);
              }}
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: isRTL
                  ? "left 6px center"
                  : "right 6px center",
                backgroundSize: "12px",
              }}
              disabled={!canWrite || isSaving}
            >
              {type === "stage" &&
                customStages.map((s) => (
                  <option
                    className="bg-record-bg"
                    key={typeof s === "object" ? s.label : s}
                    value={typeof s === "object" ? s.label : s}
                  >
                    {typeof s === "object" ? s.label : s}
                  </option>
                ))}
              {type === "leadType" &&
                customLeadTypes.map((t) => (
                  <option
                    className="bg-record-bg"
                    key={typeof t === "object" ? t.label : t}
                    value={typeof t === "object" ? t.label : t}
                  >
                    {typeof t === "object" ? t.label : t}
                  </option>
                ))}
              {type === "leadSource" &&
                customLeadSources.map((s) => (
                  <option
                    className="bg-record-bg"
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
        ) : type === "textarea" && isEditing ? (
          <div className="flex flex-col gap-2 mt-1 relative">
            <textarea
              autoFocus
              dir="auto"
              className={`w-full bg-record-input text-sm text-textPrimary border rounded px-2 py-1.5 outline-none min-h-[100px] resize-none ${error ? "border-red-500" : "border-accent"}`}
              value={localValue || ""}
              onChange={(e) => setLocalValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  handleSave();
                }
                if (e.key === "Escape") {
                  setIsEditing(false);
                  setLocalValue(value);
                }
              }}
              disabled={isSaving}
            />
            <div className="flex items-center justify-between text-[10px] text-textSecondary">
              <span>{t("recordPage.pressCmdEnterToSave")}</span>
              <div className="flex items-center gap-2">
                {isSaving && (
                  <div className="animate-spin h-3 w-3 border-2 border-accent border-t-transparent rounded-full" />
                )}
                <button
                  onClick={() => handleSave()}
                  className="px-2 py-1 bg-accent text-white rounded hover:bg-blue-600 transition-colors"
                  disabled={isSaving}
                >
                  Save
                </button>
              </div>
            </div>
            {error && (
              <div className="text-red-500 text-[10px] mt-1">{error}</div>
            )}
          </div>
        ) : isEditing ? (
          <div className="flex items-center gap-1 w-full relative">
            <input
              ref={inputRef}
              autoFocus
              dir="auto"
              type={type === "number" ? "number" : "text"}
              className={`bg-record-input text-sm text-textPrimary border rounded px-1.5 py-0.5 outline-none ${type === "number" ? "w-20" : "w-full"} ${error ? "border-red-500" : "border-accent"}`}
              value={localValue || ""}
              onChange={(e) => setLocalValue(e.target.value)}
              onBlur={() => handleSave()}
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
            className={`text-sm text-textPrimary break-words ${canWrite ? "cursor-pointer hover:bg-card-hover border-transparent hover:border-border" : "cursor-default border-transparent"} rounded px-2 py-1 ${isRTL ? "-mr-1" : "-ml-1"} transition-colors border flex items-center gap-2 w-full min-h-[28px] group/prop relative ${error ? "border-red-500 bg-red-500/10" : ""}`}
            onClick={canWrite ? () => setIsEditing(true) : undefined}
            title={error || ""}
          >
            {type === "number" && value !== undefined && (
              <ConversionCircle percentage={Number(value)} />
            )}
            {value !== undefined && value !== "" && value !== null ? (
              type === "number" ? (
                `${value}%`
              ) : (
                <span
                  dir="auto"
                  style={{ unicodeBidi: "plaintext" }}
                  className={`flex-1 ${isRTL ? "text-right" : "text-left"}`}
                >
                  <LinkifiedText text={String(value)} />
                </span>
              )
            ) : (
              <span className="text-textSecondary opacity-50 text-xs italic">
                {t("recordPage.notSet")}
              </span>
            )}

            {/* Quick Action Buttons - Floating Overlay */}
            {value && (
              <div
                className={`hidden group-hover/prop:flex items-center gap-1 absolute ${isRTL ? "left-1" : "right-1"} top-1/2 -translate-y-1/2 bg-menu-section-bg shadow-xl border border-border/50 rounded-md p-1 z-10 animate-in fade-in zoom-in-95 duration-100`}
              >
                {(field === "phone" ||
                  (field === "channel" && value === "whatsapp")) && (
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
                    title={t("recordPage.openWhatsApp")}
                  >
                    <ExternalLink size={12} />
                  </button>
                )}
              </div>
            )}

            {isSaving && (
              <div
                className={`${isRTL ? "mr-auto" : "ml-auto"} animate-spin h-3 w-3 border-2 border-accent border-t-transparent rounded-full`}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const TabItem = ({ label, icon: Icon, active, onClick, badge }: any) => (
  <button
    onClick={onClick}
    className={`flex shrink-0 items-center gap-2 py-3 px-4 relative transition-all cursor-pointer rounded-t-md border-b-2 ${active ? "text-textPrimary border-textPrimary bg-white/5" : "text-textSecondary border-transparent hover:text-textPrimary hover:bg-white/5"}`}
  >
    <Icon size={16} />
    <span className="font-medium text-sm">{label}</span>
    {badge && (
      <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-orange-500/20 text-orange-500 border border-orange-500/30 rounded-full uppercase tracking-wide">
        {badge}
      </span>
    )}
  </button>
);

// --- MAIN RECORD PAGE COMPONENT ---

const RecordPage = ({
  type,
}: {
  type: "person" | "company" | "opportunity";
}) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    people,
    companies,
    opportunities,
    tasks,
    notes,
    activities,
    activitiesPagination,
    interactions,
    interactionTypes,
    customStages,
    customLeadTypes,
    customLeadSources,
    theme,
    updatePerson,
    updateCompany,
    updateOpportunity,
    addTask,
    addNote,
    openDrawer,
    updateTask,
    updateNote,
    deleteTasks,
    deleteNotes,
    addActivity,
    addInteraction,
    updateInteraction,
    deleteInteractions,
    user,
    confirm,
    fetchActivities,
    fetchTasks,
    fetchNotes,
    fetchInteractions,
    fetchInteractionTypes,
    fetchActivityById,
    fetchPersonById,
    fetchCompanyById,
    fetchOpportunityById,
    myAccess,
  } = useStore();

  const { t } = useTranslation();
  const { language } = useStore();
  const isRTL = language === "ar";

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
    const hiddenForEntity = myAccess.hidden_fields[type] || [];
    const snakeField = fieldMapping[field] || field;
    return hiddenForEntity.includes(snakeField);
  };

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const [activeTab, setActiveTab] = useState(
    location.state?.initialTab || "Home",
  );
  const [conversationFocus, setConversationFocus] = useState<string | null>(
    null,
  );

  const canUseAgent =
    !!myAccess?.permissions?.includes("*") ||
    !!myAccess?.permissions?.includes("agent.use");
  const canReadPeople =
    !!myAccess?.permissions?.includes("*") ||
    !!myAccess?.permissions?.includes("people.read");

  useEffect(() => {
    if (isMobile && id) {
      openDrawer({ id, type, activeTab });
    }
  }, [id, type, isMobile, activeTab, openDrawer]);

  if (isMobile) {
    return null;
  }
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [editingSubtitle, setEditingSubtitle] = useState(false);
  const [subtitleValue, setSubtitleValue] = useState("");
  const [isFetchingRecord, setIsFetchingRecord] = useState(false);

  let data: any = null;
  if (type === "person") data = people.find((p) => p.id === id);
  else if (type === "company") data = companies.find((c) => c.id === id);
  else if (type === "opportunity")
    data = opportunities.find((o) => o.id === id);

  useEffect(() => {
    const loadRecord = async () => {
      if (!id || data) return;
      setIsFetchingRecord(true);
      try {
        if (type === "person") await fetchPersonById(id);
        else if (type === "company") await fetchCompanyById(id);
        else if (type === "opportunity") await fetchOpportunityById(id);
      } catch (err) {
        console.error("Failed to fetch record:", err);
      } finally {
        setIsFetchingRecord(false);
      }
    };

    loadRecord();
  }, [
    id,
    type,
    data === null,
    fetchPersonById,
    fetchCompanyById,
    fetchOpportunityById,
  ]);

  useEffect(() => {
    if (data) {
      setTitleValue(data.name || data.title);
      setSubtitleValue(
        type === "person"
          ? data.jobTitle
          : type === "company"
            ? data.domain
            : data.stage,
      );
    }
  }, [data?.id, type]);

  useEffect(() => {
    fetchInteractionTypes();
    if (type === "person") {
      fetchInteractions({ related_person: id });
      fetchActivities({ related_person: id });
      fetchTasks({ related_person: id });
      fetchNotes({ related_person: id });
    } else if (type === "company") {
      fetchInteractions({ related_company: id });
      fetchActivities({ related_company: id });
      fetchTasks({ related_company: id });
      fetchNotes({ related_company: id });
    } else if (type === "opportunity" && data) {
      if (data.contactId) {
        fetchInteractions({ related_person: data.contactId });
        fetchActivities({ related_person: data.contactId });
        fetchTasks({ related_person: data.contactId });
        fetchNotes({ related_person: data.contactId });
      }
      if (data.companyId) {
        fetchInteractions({ related_company: data.companyId });
        fetchActivities({ related_company: data.companyId });
        fetchTasks({ related_company: data.companyId });
        fetchNotes({ related_company: data.companyId });
      }
    }
  }, [
    id,
    type,
    data?.id,
    data?.contactId,
    data?.companyId,
    fetchInteractionTypes,
    fetchInteractions,
    fetchActivities,
    fetchTasks,
    fetchNotes,
  ]);

  if (isFetchingRecord) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-textSecondary">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
          <span className="text-sm animate-pulse">
            {t("recordPage.loadingRecord")}
          </span>
        </div>
      </div>
    );
  }

  if (!data)
    return (
      <div className="p-10 text-textSecondary">
        {t("recordPage.recordNotFound")}
      </div>
    );

  const handleTitleSave = () => {
    setEditingTitle(false);
    if (titleValue !== data.name) {
      if (type === "person") updatePerson(data.id, { name: titleValue });
      else if (type === "company") updateCompany(data.id, { name: titleValue });
      else if (type === "opportunity")
        updateOpportunity(data.id, { name: titleValue });
    }
  };

  const handleSubtitleSave = () => {
    setEditingSubtitle(false);
    const val = subtitleValue;
    if (type === "person" && val !== data.jobTitle)
      updatePerson(data.id, { jobTitle: val });
    else if (type === "company" && val !== data.domain)
      updateCompany(data.id, { domain: val });
    else if (type === "opportunity" && val !== data.stage)
      updateOpportunity(data.id, { stage: val as any });
  };

  const handleSidebarUpdate = (field: string, value: string) => {
    if (type === "person") return updatePerson(data.id, { [field]: value });
    else if (type === "company")
      return updateCompany(data.id, { [field]: value });
    else if (type === "opportunity")
      return updateOpportunity(data.id, { [field]: value });
  };

  // Filter related items
  const relatedTasks = tasks.filter((t) => {
    if (type === "person") return t.relatedPersonId === id;
    if (type === "company") return t.relatedCompanyId === id;
    if (type === "opportunity" && data) {
      return (
        (data.contactId && t.relatedPersonId === data.contactId) ||
        (data.companyId && t.relatedCompanyId === data.companyId)
      );
    }
    return false;
  });
  const relatedNotes = notes.filter((n) => {
    if (type === "person") return n.relatedPersonId === id;
    if (type === "company") return n.relatedCompanyId === id;
    if (type === "opportunity" && data) {
      return (
        (data.contactId && n.relatedPersonId === data.contactId) ||
        (data.companyId && n.relatedCompanyId === data.companyId)
      );
    }
    return false;
  });

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
    .filter((a) => {
      if (type === "person") return a.relatedPersonId === id;
      if (type === "company") return a.relatedCompanyId === id;
      if (type === "opportunity" && data) {
        return (
          (data.contactId && a.relatedPersonId === data.contactId) ||
          (data.companyId && a.relatedCompanyId === data.companyId)
        );
      }
      return false;
    })
    .sort((a, b) => parseRelativeTime(a.date) - parseRelativeTime(b.date));

  return (
    <div className="flex h-screen bg-background text-textPrimary overflow-hidden">
      <div className="flex-1 flex flex-col bg-record-input">
        <div className="border-b border-border bg-record-bg">
          <div className="max-w-5xl mx-auto px-8 flex items-center justify-center gap-4">
            <TabItem
              label={t("recordPage.home")}
              icon={Home}
              active={activeTab === "Home"}
              onClick={() => setActiveTab("Home")}
            />
            {(myAccess?.permissions.includes("tasks.read") || myAccess?.permissions.includes("*")) && (
              <TabItem
                label={t("recordPage.tasks")}
                icon={ListTodo}
                active={activeTab === "Tasks"}
                onClick={() => setActiveTab("Tasks")}
              />
            )}
            {(myAccess?.permissions.includes("notes.read") || myAccess?.permissions.includes("*")) && (
              <TabItem
                label={t("recordPage.notes")}
                icon={FileText}
                active={activeTab === "Notes"}
                onClick={() => setActiveTab("Notes")}
              />
            )}
            {(myAccess?.permissions.includes("interactions.read") || myAccess?.permissions.includes("*")) && (
              <TabItem
                label={t("recordPage.timeline")}
                icon={Activity}
                active={activeTab === "Timeline"}
                onClick={() => setActiveTab("Timeline")}
                badge="BETA"
              />
            )}
            <TabItem
              label={t("recordPage.actions")}
              icon={Target}
              active={activeTab === "Actions"}
              onClick={() => setActiveTab("Actions")}
            />
            {(myAccess?.permissions.includes("activities.read") || myAccess?.permissions.includes("*")) && (
              <TabItem
                label={t("recordPage.context")}
                icon={MessageSquare}
                active={activeTab === "Context"}
                onClick={() => setActiveTab("Context")}
              />
            )}
            {type === "person" && canUseAgent && (
              <TabItem
                label={t("zernio.conversations")}
                icon={MessageCircle}
                active={activeTab === "Conversations"}
                onClick={() => setActiveTab("Conversations")}
              />
            )}
          </div>
        </div>

        <div className="flex-1 overflow-hidden relative flex flex-col">
          <div className="overflow-y-auto p-8 max-w-5xl h-full mx-auto w-full">
            {activeTab === "Home" && (
              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  {!isFieldHidden("engagementOverview") && (
                    <div className="bg-record-bg p-6 rounded-xl border border-border">
                      <h3 className="text-xs font-bold text-textSecondary uppercase mb-4">
                        {t("recordPage.engagementOverview")}
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-textSecondary">
                            {t("recordPage.totalActivities")}
                          </span>
                          <span className="text-sm font-bold text-textPrimary">
                            {relatedActivities.length}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-textSecondary">
                            {t("recordPage.openTasks")}
                          </span>
                          <span className="text-sm font-bold text-accent">
                            {
                              relatedTasks.filter((t) => t.status !== "Done")
                                .length
                            }
                          </span>
                        </div>
                        {!isFieldHidden("conversionRate") && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-textSecondary">
                              {t("recordPage.conversionProbability")}
                            </span>
                            <div className="flex items-center gap-2">
                              <ConversionCircle
                                percentage={data.conversionRate || 0}
                              />
                              <span className="text-sm font-bold text-textPrimary">
                                {data.conversionRate || 0}%
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="bg-record-bg p-6 rounded-xl border border-border">
                    <h3 className="text-xs font-bold text-textSecondary uppercase mb-4">
                      {t("recordPage.latestInfo")}
                    </h3>
                    <div className="space-y-4">
                      {!isFieldHidden("stage") && (
                        <div className="flex flex-col">
                          <span className="text-[10px] text-textSecondary uppercase mb-1">
                            {t("recordPage.stage")}
                          </span>
                          <div className="w-fit">
                            <StageBadge
                              stage={data.stage}
                              field="stage"
                              customStages={customStages}
                              customLeadTypes={customLeadTypes}
                              customLeadSources={customLeadSources}
                              theme={theme}
                            />
                          </div>
                        </div>
                      )}
                      {!isFieldHidden("leadType") && (
                        <div className="flex flex-col">
                          <span className="text-[10px] text-textSecondary uppercase mb-1">
                            {t("recordPage.leadType")}
                          </span>
                          <div className="w-fit">
                            <StageBadge
                              stage={data.leadType}
                              field="leadType"
                              customStages={customStages}
                              customLeadTypes={customLeadTypes}
                              customLeadSources={customLeadSources}
                              theme={theme}
                            />
                          </div>
                        </div>
                      )}
                      {!isFieldHidden("leadSource") && (
                        <div className="flex flex-col">
                          <span className="text-[10px] text-textSecondary uppercase mb-1">
                            {t("recordPage.leadSource")}
                          </span>
                          <div className="w-fit">
                            <StageBadge
                              stage={data.leadSource}
                              field="leadSource"
                              customStages={customStages}
                              customLeadTypes={customLeadTypes}
                              customLeadSources={customLeadSources}
                              theme={theme}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {!isFieldHidden("about") && (
                  <div className="bg-record-bg p-6 rounded-xl border border-border">
                    <h3 className="text-xs font-bold text-textSecondary uppercase mb-4">
                      {t("recordPage.about", { name: data.name })}
                    </h3>
                    <p
                      dir="auto"
                      className={`text-sm text-textSecondary leading-relaxed ${isRTL ? "text-right" : "text-left"}`}
                    >
                      {type === "person"
                        ? t("recordPage.personAbout", {
                            name: data.name,
                            title: data.jobTitle || "contact",
                            company: data.companyName || "their company",
                            date: data.createdAt ? new Date(data.createdAt).toLocaleDateString() : "unknown",
                          })
                        : t("recordPage.companyAbout", {
                            name: data.name,
                            location: data.location || "Unknown",
                            employees: data.employees || "unknown",
                          })}
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "Tasks" && (
              <TasksPanel
                tasks={relatedTasks}
                parentId={id}
                canWrite={canWriteEntity("task")}
                onAdd={async () => {
                  const newTask: Task = {
                    id: Math.random().toString(),
                    title: "Untitled",
                    status: "Todo",
                    dueDate: "",
                    relatedPersonId: type === "person" ? id : undefined,
                    relatedCompanyId: type === "company" ? id : undefined,
                    assignee:
                      `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
                      user?.name ||
                      "Me",
                    createdBy:
                      `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
                      user?.name ||
                      "Me",
                    createdAt: "Just now",
                  };
                  const createdTask = await addTask(newTask);
                  if (createdTask) {
                    openDrawer({ id: createdTask.id, type: "task" });
                    toast.success("Task created successfully");
                  }
                }}
                onOpen={(taskId: string) =>
                  openDrawer({ id: taskId, type: "task" })
                }
                onDelete={(taskId: string) => {
                  confirm({
                    title: t("confirm.deleteTask"),
                    description: t("confirm.deleteTaskConfirm"),
                    confirmText: t("confirm.delete"),
                    onConfirm: async () => {
                      try {
                        await deleteTasks([taskId]);
                        toast.success(t("confirm.taskDeleted"));
                      } catch (e) {
                        toast.error(t("confirm.deleteTaskFailed"));
                      }
                    },
                  });
                }}
                onStatusChange={(taskId: string, status: any) => {
                  updateTask(taskId, { status });
                  toast.success(`Task marked as ${status}`);
                }}
              />
            )}

            {activeTab === "Notes" && (
              <NotesPanel
                notes={relatedNotes}
                parentId={id}
                canWrite={canWriteEntity("note")}
                onAdd={async () => {
                  const newNote: Note = {
                    id: Math.random().toString(),
                    title: "Untitled Note",
                    content: "",
                    relatedPersonId: type === "person" ? id : undefined,
                    relatedCompanyId: type === "company" ? id : undefined,
                    createdAt: "Just now",
                  };
                  const createdNote = await addNote(newNote);
                  if (createdNote) {
                    openDrawer({ id: createdNote.id, type: "note" });
                    toast.success("Note created successfully");
                  }
                }}
                onOpen={(noteId: string) =>
                  openDrawer({ id: noteId, type: "note" })
                }
                onDelete={(noteId: string) => {
                  confirm({
                    title: t("confirm.deleteNote"),
                    description: t("confirm.deleteNoteConfirm"),
                    confirmText: t("confirm.delete"),
                    onConfirm: async () => {
                      try {
                        await deleteNotes([noteId]);
                        toast.success(t("confirm.noteDeleted"));
                      } catch (e) {
                        toast.error(t("confirm.deleteNoteFailed"));
                      }
                    },
                  });
                }}
              />
            )}

            {activeTab === "Timeline" && (
              <TimelineTab
                data={data}
                type={type}
                canWrite={canWriteEntity("activity")}
              />
            )}

            {activeTab === "Actions" && (
              <ActionsTab
                data={data}
                type={type}
                canWrite={canWrite}
                onUpdate={handleSidebarUpdate}
              />
            )}

            {activeTab === "Context" &&
              (type === "person" && canReadPeople ? (
                <PersonTimeline
                  personId={id || ""}
                  personName={data.name}
                  canWrite={canWriteEntity("activity")}
                  canReply={canUseAgent}
                  onOpenConversation={(conversationId) => {
                    setConversationFocus(conversationId);
                    setActiveTab("Conversations");
                  }}
                />
              ) : (
                <UnifiedContextFeed
                  activities={relatedActivities}
                  entityId={id || ""}
                  entityName={data.name}
                  onAddActivity={addActivity}
                  user={user}
                  canWrite={canWriteEntity("activity")}
                />
              ))}

            {activeTab === "Conversations" && type === "person" && canUseAgent && (
              <PersonConversations
                personId={id || ""}
                personName={data.name}
                canReply={canUseAgent}
                initialConversationId={conversationFocus}
              />
            )}
          </div>
        </div>
      </div>

      <div
        className={`w-[350px] ${isRTL ? "border-r" : "border-l"} border-border bg-record-bg flex flex-col overflow-y-auto`}
      >
        <div
          className={`p-6 ${isRTL ? "pr-10" : "pl-10"} border-b border-border`}
        >
          <button
            onClick={() => navigate("/people/all")}
            className="flex items-center gap-2 text-textSecondary hover:text-textPrimary mb-6 text-xs font-medium"
          >
            {isRTL ? (
              <ArrowLeft size={14} className="rotate-180" />
            ) : (
              <ArrowLeft size={14} />
            )}
            {t("recordPage.back")}
          </button>
          <div className="flex items-center gap-4 mb-2">
            {type === "person" && (
              <div className="w-12 h-12 rounded-full bg-card-hover overflow-hidden flex items-center justify-center shrink-0">
                {data.avatar ? (
                  <img
                    src={data.avatar}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xl font-bold">
                    {data.name?.charAt(0) || "?"}
                  </span>
                )}
              </div>
            )}
            {type === "company" && (
              <div className="w-12 h-12 rounded bg-red-500/20 text-red-500 flex items-center justify-center shrink-0">
                <Building size={24} />
              </div>
            )}
            {type === "opportunity" && (
              <div className="w-12 h-12 rounded bg-green-500/20 text-green-500 flex items-center justify-center shrink-0">
                <Activity size={24} />
              </div>
            )}

            <div className="flex-1 min-w-0">
              {editingTitle && canWrite ? (
                <input
                  dir="auto"
                  className="w-full bg-record-input border border-accent rounded px-1 py-0.5 text-xl font-bold text-textPrimary outline-none mb-1"
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  onBlur={handleTitleSave}
                  onKeyDown={(e) => e.key === "Enter" && handleTitleSave()}
                  autoFocus
                />
              ) : (
                <h1
                  className={`text-xl font-bold truncate ${canWrite ? "cursor-pointer hover:underline decoration-textSecondary/50 underline-offset-4" : "cursor-default"}`}
                  onClick={canWrite ? () => setEditingTitle(true) : undefined}
                >
                  <span dir="auto">{data.name}</span>
                </h1>
              )}

              {editingSubtitle && canWrite ? (
                <input
                  dir="auto"
                  className="mt-1 w-full bg-record-input border border-accent rounded px-1 py-0.5 text-sm text-textSecondary outline-none"
                  value={subtitleValue}
                  onChange={(e) => setSubtitleValue(e.target.value)}
                  onBlur={handleSubtitleSave}
                  onKeyDown={(e) => e.key === "Enter" && handleSubtitleSave()}
                  autoFocus
                />
              ) : (
                <p
                  className={`mt-1 text-sm text-textSecondary truncate ${canWrite ? "cursor-pointer hover:text-textPrimary transition-colors" : "cursor-default"}`}
                  onClick={canWrite ? () => setEditingSubtitle(true) : undefined}
                >
                  <span dir="auto">
                    {type === "person"
                      ? data.jobTitle
                      : type === "company"
                        ? data.domain
                        : data.stage}
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>

        <div className={`p-6 ${isRTL ? "pr-10" : "pl-10"} space-y-6`}>
          <div>
            <h3 className="text-[11px] font-bold text-textSecondary uppercase tracking-wider mb-3">
              {t("recordPage.properties")}
            </h3>
            <div className="space-y-4">
              {type === "person" && (
                <>
                  {!isFieldHidden("city") && (
                    <EditableSidebarProp
                      icon={MapPin}
                      label={t("recordPage.city")}
                      value={data.city}
                      canWrite={canWrite}
                      onSave={(v: string) => handleSidebarUpdate("city", v)}
                    />
                  )}
                  {!isFieldHidden("email") && (
                    <EditableSidebarProp
                      icon={Mail}
                      label={t("recordPage.email")}
                      value={data.email}
                      canWrite={canWrite}
                      onSave={(v: string) => handleSidebarUpdate("email", v)}
                    />
                  )}
                  {!isFieldHidden("phone") && (
                    <EditableSidebarProp
                      icon={Phone}
                      label={t("recordPage.phone")}
                      field="phone"
                      value={data.phone}
                      canWrite={canWrite}
                      onSave={(v: string) => handleSidebarUpdate("phone", v)}
                    />
                  )}
                  {!isFieldHidden("companyName") && (
                    <EditableSidebarProp
                      icon={Building}
                      label={t("recordPage.company")}
                      value={data.companyName}
                      type="companySelect"
                      canWrite={canWrite}
                      onSave={(v: any) => {
                        if (v && typeof v === "object" && "name" in v) {
                          updatePerson(data.id, {
                            companyName: v.name,
                            companyId: v.id,
                          });
                        }
                      }}
                    />
                  )}
                  {!isFieldHidden("linkedin") && (
                    <EditableSidebarProp
                      icon={Linkedin}
                      label={t("recordPage.linkedin")}
                      value={data.linkedin}
                      canWrite={canWrite}
                      onSave={(v: string) => handleSidebarUpdate("linkedin", v)}
                    />
                  )}
                  {data.identities?.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-textSecondary">
                        <MessageCircle size={11} />
                        {t("zernio.identities")}
                      </div>
                      <PersonIdentities identities={data.identities} compact />
                    </div>
                  )}
                  <div className="h-px bg-border/50 my-6" />
                  {!isFieldHidden("leadType") && (
                    <EditableSidebarProp
                      icon={Target}
                      label={t("recordPage.type")}
                      value={data.leadType}
                      type="leadType"
                      canWrite={canWrite}
                      onSave={(v: string) => handleSidebarUpdate("leadType", v)}
                    />
                  )}
                  {!isFieldHidden("leadSource") && (
                    <EditableSidebarProp
                      icon={Sparkles}
                      label={t("recordPage.source")}
                      value={data.leadSource}
                      type="leadSource"
                      canWrite={canWrite}
                      onSave={(v: string) => handleSidebarUpdate("leadSource", v)}
                    />
                  )}
                  {!isFieldHidden("stage") && (
                    <EditableSidebarProp
                      icon={Activity}
                      label={t("recordPage.stage")}
                      value={data.stage}
                      type="stage"
                      canWrite={canWrite}
                      onSave={(v: string) => handleSidebarUpdate("stage", v)}
                    />
                  )}
                  {!isFieldHidden("conversionRate") && (
                    <EditableSidebarProp
                      icon={PieChart}
                      label={t("recordPage.convert")}
                      value={data.conversionRate}
                      type="number"
                      canWrite={canWrite}
                      onSave={(v: string) =>
                        handleSidebarUpdate("conversionRate", v)
                      }
                    />
                  )}
                  {!isFieldHidden("lastAction") && (
                    <EditableSidebarProp
                      icon={MessageSquare}
                      label={t("recordPage.lastAction")}
                      value={data.lastAction}
                      type="textarea"
                      canWrite={canWrite}
                      onSave={(v: string) => handleSidebarUpdate("lastAction", v)}
                    />
                  )}
                </>
              )}
              {type === "company" && (
                <>
                  {!isFieldHidden("domain") && (
                    <EditableSidebarProp
                      icon={Globe}
                      label={t("recordPage.domain")}
                      value={data.domain}
                      canWrite={canWrite}
                      onSave={(v: string) => handleSidebarUpdate("domain", v)}
                    />
                  )}
                  {!isFieldHidden("linkedin") && (
                    <EditableSidebarProp
                      icon={Linkedin}
                      label={t("recordPage.linkedin")}
                      value={data.linkedin}
                      canWrite={canWrite}
                      onSave={(v: string) => handleSidebarUpdate("linkedin", v)}
                    />
                  )}
                  {!isFieldHidden("location") && (
                    <EditableSidebarProp
                      icon={MapPin}
                      label={t("recordPage.address")}
                      value={data.location}
                      canWrite={canWrite}
                      onSave={(v: string) => handleSidebarUpdate("location", v)}
                    />
                  )}
                  {!isFieldHidden("employees") && (
                    <EditableSidebarProp
                      icon={Users}
                      label={t("recordPage.employees")}
                      value={data.employees}
                      canWrite={canWrite}
                      onSave={(v: string) => handleSidebarUpdate("employees", v)}
                    />
                  )}
                  {!isFieldHidden("arr") && (
                    <EditableSidebarProp
                      icon={DollarSign}
                      label={t("recordPage.arr")}
                      value={data.arr}
                      canWrite={canWrite}
                      onSave={(v: string) => handleSidebarUpdate("arr", v)}
                    />
                  )}
                </>
              )}
              {type === "opportunity" && (
                <>
                  {!isFieldHidden("value") && (
                    <EditableSidebarProp
                      icon={DollarSign}
                      label={t("recordPage.value")}
                      value={data.value}
                      canWrite={canWrite}
                      onSave={(v: string) => handleSidebarUpdate("value", v)}
                    />
                  )}
                  {!isFieldHidden("companyName") && (
                    <EditableSidebarProp
                      icon={Building}
                      label={t("recordPage.company")}
                      value={data.companyName}
                      type="companySelect"
                      canWrite={canWrite}
                      onSave={(v: any) => {
                        if (v && typeof v === "object" && "name" in v) {
                          updateOpportunity(data.id, {
                            companyName: v.name,
                            companyId: v.id,
                          });
                        }
                      }}
                    />
                  )}
                  {!isFieldHidden("contactName") && (
                    <EditableSidebarProp
                      icon={User}
                      label={t("recordPage.contact")}
                      value={data.contactName}
                      canWrite={canWrite}
                      onSave={(v: string) =>
                        handleSidebarUpdate("contactName", v)
                      }
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- FEED COMPONENT ---

const UnifiedContextFeed = ({
  activities,
  entityId,
  entityName,
  onAddActivity,
  user,
  canWrite,
}: {
  activities: ActivityLog[];
  entityId: string;
  entityName: string;
  onAddActivity: any;
  user: any;
  canWrite: boolean;
}) => {
  const { t } = useTranslation();
  const { language } = useStore();
  const isRTL = language === "ar";
  const [draft, setDraft] = useState("");
  const [channel, setChannel] = useState<"email" | "linkedin" | "whatsapp">(
    "email",
  );
  const [filterChannel, setFilterChannel] = useState<
    "all" | "email" | "linkedin" | "whatsapp"
  >("all");
  const [isThinking, setIsThinking] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isInitialLoad = useRef(true);
  const suppressScrollRef = useRef(false);
  const { fetchActivities, addActivity } = useStore();

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

  // Initial fetch
  useEffect(() => {
    const initFetch = async () => {
      const res = await fetchActivities({ related_person: entityId }, true);
      if (res) setNextPage(res.next);

      // On first load, scroll to bottom
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "auto" });
        isInitialLoad.current = false;
      }, 100);
    };
    initFetch();
  }, [entityId, fetchActivities]);

  useEffect(() => {
    // Only auto-scroll to bottom if it's NOT a pagination load
    if (
      !isLoadingMore &&
      !suppressScrollRef.current &&
      !isInitialLoad.current
    ) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    if (!isLoadingMore) {
      suppressScrollRef.current = false;
    }
  }, [activities.length, filterChannel, isLoadingMore]); // Added isLoadingMore to deps

  const handleLoadMore = async () => {
    if (nextPage && scrollRef.current) {
      const container = scrollRef.current;
      const oldScrollHeight = container.scrollHeight;
      const oldScrollTop = container.scrollTop;

      setIsLoadingMore(true);
      suppressScrollRef.current = true; // Block the useEffect scroll

      const res = await fetchActivities(nextPage, true);
      if (res) setNextPage(res.next);

      setIsLoadingMore(false);

      // Maintain scroll position
      setTimeout(() => {
        const newScrollHeight = container.scrollHeight;
        container.scrollTop =
          oldScrollTop + (newScrollHeight - oldScrollHeight);
      }, 0);
    }
  };

  const handleSend = async () => {
    if (!draft.trim()) return;

    const newActivity: any = {
      id: Math.random().toString(),
      type: "msg",
      channel: channel,
      direction: "sent",
      content: draft,
      date: new Date().toISOString(),
      relatedPersonId: entityId,
      userId:
        `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
        user?.name ||
        "You",
    };
    await onAddActivity(newActivity);
    toast.success(`Message sent via ${channel}`);
    setDraft("");
  };

  const handleGenerateAI = () => {
    setIsThinking(true);
    setTimeout(() => {
      setDraft(`Hi ${entityName.split(" ")[0]},

I was reviewing our previous conversation about the enterprise plan. Given your team's size, I think we can offer a custom tier.

Are you free for a quick sync this week?`);
      setIsThinking(false);
    }, 800);
  };

  const [copySuccess, setCopySuccess] = useState(false);

  const handleCreateActivity = async () => {
    if (!newActivityTitle || !newActivityContent) {
      toast.error("Please fill in both title and content");
      return;
    }

    setIsCreating(true);
    try {
      await addActivity({
        type: newActivityType as any,
        channel: newActivityChannel,
        direction: newActivityDirection,
        title: newActivityTitle,
        content: newActivityContent,
        date: new Date().toISOString(),
        relatedPersonId: entityId,
        userId:
          `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
          user?.name ||
          "You",
      } as any);

      toast.success("Activity added successfully");
      setIsAddModalOpen(false);
      setNewActivityTitle("");
      setNewActivityContent("");
      setNewActivityType("email");
      setNewActivityChannel("email");
      setNewActivityDirection("sent");
    } catch (err) {
      console.error("Failed to add activity:", err);
      toast.error("Failed to add activity");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyContext = async () => {
    const text = visibleActivities
      .map((a) => {
        const timestamp = parseActivityDate(a.date);
        const time = format(new Date(timestamp), "yyyy-MM-dd HH:mm");
        const sender = a.direction === "sent" ? "Me" : entityName || "User";
        return `[${time}] ${sender} (${a.channel}): ${a.content}`;
      })
      .join("\n\n");

    await navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const visibleActivities = activities.filter((act) => {
    if (filterChannel === "all") return true;
    if (filterChannel === "email" && act.channel === "email") return true;
    if (filterChannel === "linkedin" && act.channel === "linkedin") return true;
    if (filterChannel === "whatsapp" && act.channel === "whatsapp") return true;
    return false;
  });

  const parseActivityDate = (dateStr: string) => {
    if (!dateStr) return 0;
    if (dateStr === "Just now") return new Date().getTime();
    const parsed = Date.parse(dateStr);
    if (!isNaN(parsed)) return parsed;
    const now = new Date().getTime();
    const num = parseInt(dateStr.match(/\d+/)?.[0] || "0");
    if (dateStr.includes("min")) return now - num * 60 * 1000;
    if (dateStr.includes("hour")) return now - num * 60 * 60 * 1000;
    if (dateStr.includes("day")) return now - num * 24 * 60 * 60 * 1000;
    if (dateStr.includes("week")) return now - num * 7 * 24 * 60 * 60 * 1000;
    return 0;
  };

  const groupedActivities: {
    [key: string]: {
      dateLabel: string;
      timestamp: number;
      items: ActivityLog[];
    };
  } = {};
  visibleActivities.forEach((act) => {
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
  sortedGroups.forEach((group) => {
    group.items.sort(
      (a, b) => parseActivityDate(a.date) - parseActivityDate(b.date),
    );
  });

  return (
    <div className="flex flex-col h-full bg-record-input">
      {visibleActivities.length > 0 && (
        <div className="border-b border-border bg-record-bg">
          <div className="max-w-5xl mx-auto px-8 py-2 flex items-center justify-between gap-3">
            {canWrite && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="text-xs flex items-center gap-1.5 bg-accent/10 hover:bg-accent/20 text-accent px-3 py-1.5 rounded border border-accent/20 transition-colors font-medium"
              >
                <Plus size={12} />
                <span>{t("recordPage.addActivity")}</span>
              </button>
            )}
            <div className={`flex items-center gap-3 ${!canWrite ? (isRTL ? "mr-auto" : "ml-auto") : ""}`}>
              <button
                onClick={handleCopyContext}
                className="text-xs flex items-center gap-1.5 text-textSecondary hover:text-textPrimary transition-colors"
                title="Copy visible conversation"
              >
                {copySuccess ? (
                  <Check size={12} className="text-green-500" />
                ) : (
                  <Copy size={12} />
                )}
                <span>
                  {copySuccess ? t("recordPage.copied") : t("recordPage.copy")}
                </span>
              </button>
              <div className="h-4 w-px bg-border"></div>
              <select
                className="bg-card-bg border border-border rounded-lg px-2 py-1 text-[10px] text-textSecondary outline-none focus:border-accent cursor-pointer hover:border-border/80 transition-colors"
                value={filterChannel}
                onChange={(e) => setFilterChannel(e.target.value as any)}
              >
                <option value="all">{t("recordPage.allChannelsFilter")}</option>
                <option value="email">{t("recordPage.emailOnly")}</option>
                <option value="linkedin">{t("recordPage.linkedinOnly")}</option>
                <option value="whatsapp">{t("recordPage.whatsappOnly")}</option>
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-8" ref={scrollRef}>
        <div className="max-w-5xl mx-auto space-y-6 w-full">
          {nextPage && (
            <div className="flex justify-center mb-6">
              <button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="text-xs px-4 py-2 bg-dropdown-bg hover:bg-card-hover text-textSecondary hover:text-textPrimary rounded-full border border-border transition-all flex items-center gap-2 group shadow-lg"
              >
                {isLoadingMore ? (
                  <div className="animate-spin h-3 w-3 border-2 border-accent border-t-transparent rounded-full" />
                ) : (
                  <RefreshCw
                    size={12}
                    className="group-hover:rotate-180 transition-transform duration-500"
                  />
                )}
                <span>{t("recordPage.loadOlderMessages")}</span>
              </button>
            </div>
          )}
          {visibleActivities.length === 0 && !isLoadingMore && (
            <div className="flex flex-col items-center justify-center h-64 text-textSecondary">
              <MessageSquare size={48} className="mb-4 opacity-50" />
              <p className="mb-4">{t("recordPage.noConversationHistory")}</p>
              {canWrite && (
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-accent/10 hover:bg-accent/20 text-accent rounded-lg border border-accent/20 transition-colors font-medium"
                >
                  <Plus size={14} />
                  <span>{t("recordPage.addFirstActivity")}</span>
                </button>
              )}            </div>
          )}
          {sortedGroups.map((group) => (
            <div key={group.dateLabel} className="space-y-6">
              <div className="flex justify-center sticky top-0 z-10 py-2">
                <span className="px-3 py-1 bg-card-hover text-textSecondary text-[10px] uppercase font-bold rounded-full border border-border/50 shadow-sm">
                  {group.dateLabel}
                </span>
              </div>
              {group.items.map((act) => {
                const isSent = act.direction === "sent";
                const isSystem = act.channel === "system" || !act.channel;
                const timestamp = parseActivityDate(act.date);
                const timeStr = format(new Date(timestamp), "HH:mm");
                if (isSystem) {
                  return (
                    <div key={act.id} className="flex justify-center my-4">
                      <div className="bg-dropdown-bg border border-border rounded-full px-4 py-1 text-xs text-textSecondary flex items-center gap-2">
                        <Activity size={12} />
                        <span dir="auto">{act.content}</span>
                        <span className="opacity-50">• {timeStr}</span>
                      </div>
                    </div>
                  );
                }
                return (
                  <div
                    key={act.id}
                    className={`flex w-full ${isSent ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[70%] flex gap-3 ${isSent ? "flex-row-reverse" : "flex-row"}`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isSent ? "bg-orange-500 text-white" : "bg-card-hover text-textPrimary"}`}
                      >
                        {isSent ? "Y" : act.userId?.charAt(0)}
                      </div>
                      <div className="flex flex-col gap-1">
                        <div
                          dir="auto"
                          className={`rounded-lg p-4 text-sm whitespace-pre-wrap border ${isSent ? "bg-table-row-selected border-card-hover-light" : "bg-record-bg border-border"}`}
                        >
                          <LinkifiedText text={act.content} />
                        </div>
                        <div
                          className={`flex items-center gap-2 text-[10px] text-textSecondary ${isSent ? "justify-end" : "justify-start"}`}
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
      </div>

      {/*<div className="p-4 bg-record-bg border-t border-border">
        <div className="max-w-5xl mx-auto flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 bg-record-input p-1 rounded-md border border-border">
              <button
                onClick={() => setChannel("email")}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${channel === "email" ? "bg-card-hover text-white" : "text-textSecondary hover:text-white"}`}
              >
                <Mail size={12} /> Email
              </button>
              <button
                onClick={() => setChannel("linkedin")}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${channel === "linkedin" ? "bg-linkedin/20 text-linkedin" : "text-textSecondary hover:text-white"}`}
              >
                <Linkedin size={12} /> LinkedIn
              </button>
              <button
                onClick={() => setChannel("whatsapp")}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${channel === "whatsapp" ? "bg-green-500/20 text-green-500" : "text-textSecondary hover:text-white"}`}
              >
                <MessageCircle size={12} /> WhatsApp
              </button>
            </div>
            <button
              onClick={handleGenerateAI}
              disabled={isThinking}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-accent hover:text-blue-400 transition-colors disabled:opacity-50"
            >
              <Sparkles size={12} />
              {isThinking ? t("recordPage.readingContext") : t("recordPage.draftWithAi")}
            </button>
          </div>
          <div className="relative">
            <textarea
              dir="auto"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t("recordPage.messageVia", { name: entityName, channel })}
              className={`w-full bg-record-input border border-border rounded-lg p-3 text-sm text-textPrimary focus:outline-none focus:border-accent min-h-[100px] resize-none ${isRTL ? "pl-12" : "pr-12"}`}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend();
              }}
            />
            <button
              onClick={handleSend}
              disabled={!draft.trim()}
              className="absolute bottom-3 right-3 p-2 bg-accent hover:bg-blue-600 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={16} />
            </button>
          </div>
          <div className="text-[10px] text-textSecondary text-right">
            {t("recordPage.cmdEnterToSend")}
          </div>
        </div>
      </div>*/}

      {/* Add Activity Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[550px] bg-card-bg border-border text-textPrimary z-[100] shadow-2xl p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-dropdown-bg">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Plus className="w-5 h-5 text-accent" />
              {t("recordPage.addNewActivity")}
            </DialogTitle>
            <DialogDescription className="text-textSecondary text-[11px] mt-1 font-medium italic">
              {t("recordPage.logActivityFor", { name: entityName })}
            </DialogDescription>
          </div>

          <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-textSecondary uppercase tracking-widest flex items-center gap-1.5">
                  <Calendar size={10} /> {t("recordPage.interactionDate")}
                </label>
                <select
                  value={newActivityType}
                  onChange={(e) => setNewActivityType(e.target.value)}
                  className="w-full bg-textarea-bg border border-border rounded-lg px-3 py-2.5 text-sm text-textPrimary outline-none focus:ring-1 focus:ring-accent transition-all hover:border-border/80"
                >
                  <option value="email">Email</option>
                  <option value="call">Call</option>
                  <option value="meeting">Meeting</option>
                  <option value="msg">Message</option>
                  <option value="update">Update</option>
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
                  <option value="email">Email</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="system">System</option>
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
                  {t("recordPage.sentOutgoing")}
                </button>
                <button
                  onClick={() => setNewActivityDirection("received")}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    newActivityDirection === "received"
                      ? "bg-accent/20 text-accent border border-accent/40"
                      : "bg-textarea-bg text-textSecondary border border-border hover:border-border/80"
                  }`}
                >
                  {t("recordPage.receivedIncoming")}
                </button>
                <button
                  onClick={() => setNewActivityDirection("system")}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    newActivityDirection === "system"
                      ? "bg-accent/20 text-accent border border-accent/40"
                      : "bg-textarea-bg text-textSecondary border border-border hover:border-border/80"
                  }`}
                >
                  {t("recordPage.internal")}
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
                placeholder={t("recordPage.activityTitlePlaceholder")}
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
                placeholder={t("recordPage.contentPlaceholder")}
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
              {t("recordPage.cancel")}
            </Button>
            <Button
              onClick={handleCreateActivity}
              disabled={isCreating || !newActivityTitle || !newActivityContent}
              className="bg-accent hover:bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  {t("recordPage.adding")}
                </>
              ) : (
                <>
                  <Plus size={14} />
                  {t("recordPage.addActivity")}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RecordPage;
