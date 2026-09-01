import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store";
import { useTranslation } from "../src/i18n";
import {
  BarChart as RechartsBarChart,
  Bar as RechartsBar,
  LineChart as RechartsLineChart,
  Line as RechartsLine,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  FunnelChart as RechartsFunnelChart,
  Funnel as RechartsFunnel,
  LabelList,
  Cell,
  ScatterChart as RechartsScatterChart,
  Scatter as RechartsScatter,
  ZAxis,
} from "recharts";
import {
  ArrowLeft,
  ArrowRight,
  ArrowDown,
  MoreVertical,
  Edit2,
  RefreshCw,
  Calendar as CalendarIcon,
  BellOff,
  ChevronDown,
  ChevronRight,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  MessageCircle,
  PhoneCall,
  UserPlus,
  Mail,
  Users,
  CheckSquare,
  GraduationCap,
  Inbox,
  Settings,
  GripVertical,
  Check,
  X,
  Plus,
  Calendar,
  AlignLeft,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { cn } from "../lib/utils";
import { InteractionTypeModal, RELEVANT_ICONS } from "./InteractionTypeModal";
import { AccessDeniedPage } from "./AccessDeniedPage";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Calendar as CalendarComponent } from "../components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import { format } from "date-fns";
import { toast } from "sonner";

// Mock Data

const scoreData = [
  { month: "Jun", score: 30 },
  { month: "Jul", score: 40 },
  { month: "Aug", score: 25 },
  { month: "Sep", score: 20 },
  { month: "Oct", score: 15 },
  { month: "Nov", score: 18 },
  { month: "Dec", score: 28 },
  { month: "Jan", score: 38 },
  { month: "Feb", score: 45 },
  { month: "Mar", score: 52 },
];

const historyData = [
  { month: "Jun", count: 7 },
  { month: "Jul", count: 4 },
  { month: "Aug", count: 1 },
  { month: "Sep", count: 2 },
  { month: "Oct", count: 0 },
  { month: "Nov", count: 2 },
  { month: "Dec", count: 5 },
  { month: "Jan", count: 6 },
  { month: "Feb", count: 7 },
  { month: "Mar", count: 3 },
];

const frequencyData = [
  { day: 0, hour: 1, value: 10 },
  { day: 1, hour: 3, value: 20 },
  { day: 2, hour: 5, value: 30 },
  { day: 3, hour: 2, value: 15 },
  { day: 4, hour: 6, value: 25 },
  { day: 5, hour: 4, value: 35 },
  { day: 6, hour: 7, value: 40 },
];

export default function PreSalesDashboard() {
  const { t, dir } = useTranslation();
  const isRTL = dir === "rtl";
  const navigate = useNavigate();
  const {
    fetchFunnelAnalytics,
    fetchChannelAnalytics,
    fetchInteractionTypes,
    interactionTypes,
    myAccess,
    fetchMyAccess
  } = useStore();

  // Fetch permissions if they haven't been loaded yet
  useEffect(() => {
    if (!myAccess) {
      fetchMyAccess();
    }
  }, [myAccess, fetchMyAccess]);

  const canReadDashboard = useMemo(() => 
    myAccess?.permissions?.includes('*') || myAccess?.permissions?.includes('dashboard.read'), 
  [myAccess]);

  const canWriteDashboard = useMemo(() => 
    myAccess?.permissions?.includes('*') || myAccess?.permissions?.includes('dashboard.write'), 
  [myAccess]);

  const canReadInteractions = useMemo(() => 
    myAccess?.permissions?.includes('*') || myAccess?.permissions?.includes('interactions.read'), 
  [myAccess]);

  const canWriteInteractions = useMemo(() => 
    myAccess?.permissions?.includes('*') || myAccess?.permissions?.includes('interactions.write'), 
  [myAccess]);

  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [funnelData, setFunnelData] = useState<any[]>([]);
  const [channelData, setChannelData] = useState<any>(null);
  const [funnelLoading, setFunnelLoading] = useState(true);
  const [channelLoading, setChannelLoading] = useState(true);
  const [hasAnyInteractions, setHasAnyInteractions] = useState<boolean | null>(
    null,
  );
  const [checkingInteractions, setCheckingInteractions] = useState(true);
  const [funnelTimeframe, setFunnelTimeframe] = useState("month");
  const [funnelCountMode, setFunnelCountMode] = useState<"unique" | "total">(
    "unique",
  );
  const [dailyCountMode, setDailyCountMode] = useState<"unique" | "total">(
    "total",
  );
  const [dailyCounts, setDailyCounts] = useState<Record<string, number>>({});
  const [channelTimeframe, setChannelTimeframe] = useState("month");
  const [channelCountMode, setChannelCountMode] = useState<"unique" | "total">(
    "unique",
  );
  const [isEditFunnelModalOpen, setIsEditFunnelModalOpen] = useState(false);
  const [isEditChannelModalOpen, setIsEditChannelModalOpen] = useState(false);
  const [isInteractionModalOpen, setIsInteractionModalOpen] = useState(false);
  const [isFunnelRefreshing, setIsFunnelRefreshing] = useState(false);
  const [isChannelRefreshing, setIsChannelRefreshing] = useState(false);
  const [walkthroughStep, setWalkthroughStep] = useState<number | null>(null);
  const [typesLoading, setTypesLoading] = useState(true);
  const { dashboardConfigs, fetchDashboardConfig, saveDashboardConfig } =
    useStore();

  // Load dashboard configs on mount
  useEffect(() => {
    if (canReadDashboard) {
      fetchDashboardConfig("funnel-chart");
      fetchDashboardConfig("channel-chart");
    }
  }, [fetchDashboardConfig, canReadDashboard]);

  // Initial load for types - always load regardless of dashboard/interactions read permissions
  useEffect(() => {
    setTypesLoading(true);
    fetchInteractionTypes().finally(() => setTypesLoading(false));
  }, [fetchInteractionTypes]);

  // Check if user has any interactions at all (independent of funnel/timeframe)
  useEffect(() => {
    if (!canReadInteractions) {
      setCheckingInteractions(false);
      return;
    }
    const checkInteractions = async () => {
      setCheckingInteractions(true);
      try {
        const api = await import("../lib/api");
        const response = await api.getInteractions({ limit: 1 });
        const data = await response.json();
        setHasAnyInteractions((data.count || 0) > 0);
      } catch (error) {
        console.error("Failed to check interactions:", error);
        setHasAnyInteractions(null);
      }
      setCheckingInteractions(false);
    };
    checkInteractions();
  }, [canReadInteractions]);

  // Funnel load
  useEffect(() => {
    if (!canReadDashboard) {
      setFunnelLoading(false);
      return;
    }
    const loadFunnel = async () => {
      setFunnelLoading(true);
      const data = await fetchFunnelAnalytics(funnelTimeframe, funnelCountMode);
      if (data) {
        setFunnelData(data);
      }
      setFunnelLoading(false);
    };
    loadFunnel();
  }, [
    fetchFunnelAnalytics,
    funnelTimeframe,
    funnelCountMode,
    dashboardConfigs["funnel-chart"],
    interactionTypes.length,
    canReadDashboard,
  ]);

  // Channel load
  useEffect(() => {
    if (!canReadDashboard) {
      setChannelLoading(false);
      return;
    }
    const loadChannel = async () => {
      setChannelLoading(true);
      const data = await fetchChannelAnalytics(
        channelTimeframe,
        channelCountMode,
      );
      if (data) {
        setChannelData(data);
      }
      setChannelLoading(false);
    };
    loadChannel();
  }, [
    fetchChannelAnalytics,
    channelTimeframe,
    channelCountMode,
    dashboardConfigs["channel-chart"],
    canReadDashboard,
  ]);

  // Daily counts load (independent of funnel count mode)
  const loadDailyCounts = async () => {
    if (!canReadInteractions) return;
    try {
      const api = await import("../lib/api");
      const today = new Date().toISOString().split("T")[0];
      const results = await Promise.all(
        interactionTypes.map(async (type) => {
          const res = await api.getInteractions({
            interaction_type: type.id,
            date__date: today,
            limit: 1,
            distinct: dailyCountMode === "unique" ? "true" : "false",
          });
          const data = await res.json();
          return { id: type.id, count: data.count || 0 };
        }),
      );
      const countsMap: Record<string, number> = {};
      results.forEach((r) => {
        countsMap[r.id] = r.count;
      });
      setDailyCounts(countsMap);
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error("Failed to fetch daily counts:", error);
    }
  };

  useEffect(() => {
    if (interactionTypes.length > 0 && canReadInteractions) {
      loadDailyCounts();
    }
  }, [interactionTypes, dailyCountMode, canReadInteractions]);

  // Refresh handlers with rate limiting
  const handleRefreshFunnel = async () => {
    if (isFunnelRefreshing) return; // Prevent multiple clicks

    setIsFunnelRefreshing(true);
    try {
      const data = await fetchFunnelAnalytics(funnelTimeframe, funnelCountMode);
      if (data) {
        setFunnelData(data);
      }
    } catch (error) {
      console.error("Failed to refresh funnel:", error);
    } finally {
      // Rate limit: wait at least 2 seconds before allowing another refresh
      setTimeout(() => {
        setIsFunnelRefreshing(false);
      }, 2000);
    }
  };

  const handleRefreshChannel = async () => {
    if (isChannelRefreshing) return; // Prevent multiple clicks

    setIsChannelRefreshing(true);
    try {
      const data = await fetchChannelAnalytics(
        channelTimeframe,
        channelCountMode,
      );
      if (data) {
        setChannelData(data);
      }
    } catch (error) {
      console.error("Failed to refresh channel:", error);
    } finally {
      // Rate limit: wait at least 2 seconds before allowing another refresh
      setTimeout(() => {
        setIsChannelRefreshing(false);
      }, 2000);
    }
  };

  const funnelConfig = dashboardConfigs["funnel-chart"];
  const isFunnelConfigured = !!(
    funnelConfig &&
    funnelConfig.selectedTypes &&
    funnelConfig.selectedTypes.length > 0
  );
  const isChannelConfigured = !!(
    dashboardConfigs["channel-chart"] &&
    dashboardConfigs["channel-chart"].columns &&
    dashboardConfigs["channel-chart"].columns.length > 0
  );

  const filteredFunnelData = funnelConfig?.selectedTypes
    ? funnelConfig.selectedTypes
        .map((id: string) => funnelData.find((d: any) => d.id === id))
        .filter(Boolean)
    : [...(funnelData || [])].sort((a, b) => b.value - a.value);

  // Filter out items with zero value for better UX
  const nonZeroFunnelData = (filteredFunnelData || []).filter(
    (d: any) => d.value > 0,
  );

  const sortedFunnelData = [...(funnelData || [])].sort(
    (a, b) => b.value - a.value,
  );

  const getIcon = (iconName: string | undefined): LucideIcons.LucideIcon => {
    if (!iconName || iconName === "Icon") return MessageCircle;

    const iconObj = RELEVANT_ICONS.find((i) => i.name === iconName);
    if (iconObj) return iconObj.icon;

    // Fallback to dynamic lookup if not in RELEVANT_ICONS
    // @ts-ignore
    const IconComponent = LucideIcons[iconName];
    // Ensure we don't return the base 'Icon' component or non-functions
    if (typeof IconComponent !== "function" || iconName === "Icon")
      return MessageCircle;
    return (IconComponent as LucideIcons.LucideIcon) || MessageCircle;
  };

  // DAILY TRACKING: Independent of funnel config, shows all types with its own count mode
  // Using interactionTypes instead of funnelData so it renders even if dashboard.read is missing
  const trackingActivities = (interactionTypes || [])
    .map((f) => {
      const iconComp = getIcon(f.icon);
      return {
        id: f.id,
        name: f.name,
        icon: iconComp,
        count: dailyCounts[f.id] || 0,
        color: f.color || "var(--color-accent)",
        fill: f.color,
        disabled: false,
      };
    })
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const activities = trackingActivities;

  if (
    typesLoading ||
    (funnelLoading &&
      funnelData.length === 0 &&
      channelLoading &&
      (!channelData || !channelData.data || channelData.data.length === 0))
  ) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
      </div>
    );
  }

  const hasNoInteractionTypes = !typesLoading && interactionTypes.length === 0;
  const hasNoData = !checkingInteractions && hasAnyInteractions === false;
  const showNoDataModal = !hasNoInteractionTypes && hasNoData;

  if (selectedActivity) {
    const activity = activities.find((a) => a.id === selectedActivity);
    return (
      <ActivityDetail
        activity={activity}
        onBack={() => setSelectedActivity(null)}
        setDailyCounts={setDailyCounts}
      />
    );
  }

  if (!canReadDashboard && !canReadInteractions) {
    return (
      <AccessDeniedPage 
        title={t("preSales.dashboardAccessDenied")}
        description={t("preSales.dashboardAccessDeniedDesc")}
      />
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-background">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--color-text-secondary); }
      `}</style>
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-text-primary">
                {t("preSales.overview")}
              </h2>
              <span className="text-xs bg-orange-500/20 px-2 py-1 rounded-full text-orange-500 border border-orange-500/30 font-semibold tracking-wider">
                BETA Feature
              </span>
            </div>
            <p className="text-text-secondary text-sm">
              {t("preSales.trackDaily")}
            </p>
          </div>
          {canReadInteractions && (
            <button
              onClick={() => setIsInteractionModalOpen(true)}
              className="p-2.5 bg-muted/50 hover:bg-muted border border-border rounded-xl transition-all text-text-secondary hover:text-accent group shadow-sm"
              title={t("preSales.interactionsConfig")}
            >
              <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Funnel Chart */}
          {canReadDashboard && (
            <div className="bg-surface border border-border rounded-xl p-6 shadow-sm lg:col-span-3 relative group">
              {funnelLoading && (
                <div className="absolute inset-0 z-10 bg-surface/50 backdrop-blur-[1px] flex items-center justify-center rounded-xl">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
                </div>
              )}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  {t("preSales.conversionFunnel")}
                  {canWriteDashboard && (
                    <div className="relative">
                      <button
                        onClick={() => setIsEditFunnelModalOpen(true)}
                        className={cn(
                          "p-1 rounded-md transition-all flex items-center justify-center",
                          !isFunnelConfigured
                            ? "opacity-100 bg-accent/20 border border-accent/40 shadow-[0_0_12px_rgba(35,131,226,0.3)] animate-[pulse-accent_2s_infinite]"
                            : "opacity-0 group-hover:opacity-100 hover:bg-muted border border-transparent",
                        )}
                        title={
                          isFunnelConfigured ? t("preSales.editFunnel") : undefined
                        }
                      >
                        <Edit2
                          className={cn(
                            "w-4 h-4",
                            !isFunnelConfigured
                              ? "text-accent"
                              : "text-text-secondary",
                          )}
                        />
                      </button>
                      {!isFunnelConfigured && (
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-accent text-white text-[10px] font-bold rounded shadow-[0_4px_12px_rgba(35,131,226,0.4)] whitespace-nowrap z-20 pointer-events-none animate-in fade-in slide-in-from-bottom-1 duration-300">
                          configure me
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-accent rotate-45" />
                        </div>
                      )}
                    </div>
                  )}
                  {canWriteDashboard && (
                    <button
                      onClick={handleRefreshFunnel}
                      disabled={isFunnelRefreshing}
                      className={cn(
                        "p-1 rounded-md transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-muted border border-transparent",
                        isFunnelRefreshing && "opacity-100 animate-spin",
                      )}
                      title={t("preSales.refreshFunnelData")}
                    >
                      <RefreshCw
                        className={cn(
                          "w-4 h-4 text-text-secondary",
                          isFunnelRefreshing && "text-accent",
                        )}
                      />
                    </button>
                  )}
                </h3>
                <div className="flex items-center gap-2">
                  <select
                    value={funnelCountMode}
                    onChange={(e) =>
                      setFunnelCountMode(e.target.value as "unique" | "total")
                    }
                    disabled={funnelLoading}
                    className="text-xs border border-border rounded-md bg-surface px-2 py-1 text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
                    title={t("preSales.countModeTooltip")}
                  >
                    <option value="unique">{t("preSales.unique")}</option>
                    <option value="total">{t("preSales.total")}</option>
                  </select>
                  <TimeframeSelector
                    value={funnelTimeframe}
                    onChange={setFunnelTimeframe}
                    disabled={funnelLoading}
                  />
                </div>
              </div>
              {nonZeroFunnelData.length === 0 ? (
                <div className="h-[400px] w-full flex flex-col items-center justify-center text-text-secondary">
                  <Inbox className="w-12 h-12 mb-4 opacity-40" />
                  <p className="text-sm font-medium">
                    {t("preSales.noDataTimeframe").replace(
                      "{mode}",
                      funnelCountMode,
                    )}
                  </p>
                  <p className="text-xs opacity-60 mt-1">
                    {t("preSales.tryDifferentRange")}
                  </p>
                  <p className="text-xs opacity-50 mt-2 italic">
                    {t("preSales.tryEditingConfig")}
                  </p>
                </div>
              ) : (
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsFunnelChart
                      margin={{ top: 20, right: 80, bottom: 20, left: 20 }}
                    >
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--color-surface)",
                          borderColor: "var(--color-border)",
                          color: "var(--color-text-primary)",
                        }}
                        itemStyle={{ color: "var(--color-text-primary)" }}
                      />
                      <RechartsFunnel
                        dataKey="value"
                        data={nonZeroFunnelData}
                        isAnimationActive
                      >
                        <LabelList
                          position="right"
                          fill="var(--color-text-primary)"
                          stroke="none"
                          dataKey="name"
                        />
                        {nonZeroFunnelData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </RechartsFunnel>
                    </RechartsFunnelChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Daily Tracking List */}
          {canReadInteractions && (
            <div className="bg-surface border border-border rounded-xl p-6 shadow-sm flex flex-col lg:col-span-2 overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  {t("preSales.dailyTracking")}
                </h3>
                <div className="flex items-center gap-2">
                  <select
                    value={dailyCountMode}
                    onChange={(e) =>
                      setDailyCountMode(e.target.value as "unique" | "total")
                    }
                    className="text-xs border border-border rounded-md bg-surface px-2 py-1 text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent"
                    title={t("preSales.countModeTooltip")}
                  >
                    <option value="unique">{t("preSales.unique")}</option>
                    <option value="total">{t("preSales.total")}</option>
                  </select>
                  <span className="text-sm text-text-secondary">
                    {t("preSales.today")}
                  </span>
                </div>
              </div>

              <div className="overflow-y-auto pr-2 max-h-[480px] custom-scrollbar">
                {activities.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-text-secondary py-8">
                    <Inbox className="w-10 h-10 mb-3 opacity-40" />
                    <p className="text-sm font-medium">
                      {t("preSales.noActivities").replace(
                        "{mode}",
                        dailyCountMode,
                      )}
                    </p>
                    <p className="text-xs opacity-60 mt-1 text-center">
                      {t("preSales.addInteractionTypes")}
                    </p>
                    <p className="text-xs opacity-50 mt-2 italic text-center">
                      {t("preSales.tryAdjustingFilter")}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activities.map((activity) => (
                      <button
                        key={activity.id}
                        onClick={() =>
                          !activity.disabled && setSelectedActivity(activity.id)
                        }
                        disabled={activity.disabled}
                        className={cn(
                          "w-full flex items-center justify-between p-3 rounded-lg border border-border transition-all",
                          activity.disabled
                            ? "opacity-50 cursor-not-allowed bg-muted/30"
                            : "hover:bg-muted/50 hover:border-accent/30 cursor-pointer shadow-sm",
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2" style={{ color: activity.color }}>
                            <activity.icon className="w-4 h-4" />
                          </div>
                          <span className="font-medium text-left">
                            {activity.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              "text-lg font-semibold",
                              activity.count > 0
                                ? "text-text-primary"
                                : "text-text-secondary",
                            )}
                          >
                            {activity.count}
                          </span>
                          {!activity.disabled && (
                            <ChevronRight className="w-4 h-4 text-text-secondary" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* New Channel Conversion Card */}
        {canReadDashboard && (
          <div className="relative">
            {channelLoading && (
              <div className="absolute inset-0 z-30 bg-surface/50 backdrop-blur-[1px] flex items-center justify-center rounded-xl">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
              </div>
            )}
            <div
              className={cn(
                "absolute top-6 z-20 flex items-center gap-2",
                isRTL ? "left-6" : "right-6",
              )}
            >
              <select
                value={channelCountMode}
                onChange={(e) =>
                  setChannelCountMode(e.target.value as "unique" | "total")
                }
                disabled={channelLoading}
                className="text-xs border border-border rounded-md bg-surface px-2 py-1 text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
                title={t("preSales.countModeTooltip")}
              >
                <option value="unique">{t("preSales.unique")}</option>
                <option value="total">{t("preSales.total")}</option>
              </select>
              <TimeframeSelector
                value={channelTimeframe}
                onChange={setChannelTimeframe}
                disabled={channelLoading}
              />
            </div>
            <ChannelConversionCard
              data={channelData || []}
              onEdit={() => setIsEditChannelModalOpen(true)}
              canEdit={canWriteDashboard}
              isConfigured={isChannelConfigured}
              countMode={channelCountMode}
              onRefresh={handleRefreshChannel}
              isRefreshing={isChannelRefreshing}
            />
          </div>
        )}
      </div>

      {isEditFunnelModalOpen && (
        <EditFunnelModal
          isOpen={isEditFunnelModalOpen}
          onClose={() => setIsEditFunnelModalOpen(false)}
          interactionTypes={useStore.getState().interactionTypes}
          currentConfig={dashboardConfigs["funnel-chart"] || {}}
          onSave={(config) => saveDashboardConfig("funnel-chart", config)}
          onOpenInteractionConfig={() => setIsInteractionModalOpen(true)}
        />
      )}

      {isEditChannelModalOpen && (
        <EditChannelModal
          isOpen={isEditChannelModalOpen}
          onClose={() => setIsEditChannelModalOpen(false)}
          interactionTypes={useStore.getState().interactionTypes}
          currentConfig={dashboardConfigs["channel-chart"] || {}}
          onSave={(config) => saveDashboardConfig("channel-chart", config)}
          onOpenInteractionConfig={() => setIsInteractionModalOpen(true)}
        />
      )}

      <InteractionTypeModal
        isOpen={isInteractionModalOpen}
        onClose={() => setIsInteractionModalOpen(false)}
      />

      {hasNoInteractionTypes && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface border border-border w-full max-w-md rounded-2xl shadow-2xl p-6 animate-in slide-in-from-top-8 duration-300">
            <div className="text-center">
              <div className="w-14 h-14 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Settings className="w-7 h-7 text-accent" />
              </div>
              <h2 className="text-xl font-bold text-text-primary mb-2">
                {t("preSales.startAddingTypes")}
              </h2>
              <p className="text-sm text-text-secondary mb-6">
                {t("preSales.addTypesToStart")}
              </p>
              <div
                className={cn(
                  "bg-muted/30 rounded-xl p-4 mb-6",
                  isRTL ? "text-right" : "text-left",
                )}
              >
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
                  {t("preSales.examples")}
                </p>
                <div className="space-y-2">
                  {[
                    "Outreach",
                    "Follow-up",
                    "Send connection request",
                    "Showed call",
                    "Booked call",
                  ].map((example) => (
                    <div
                      key={example}
                      className="flex items-center gap-2 text-sm text-text-primary"
                    >
                      <ChevronRight
                        className={cn(
                          "w-3 h-3 text-accent",
                          isRTL && "rotate-180",
                        )}
                      />
                      {example}
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setIsInteractionModalOpen(true)}
                className="w-full py-3 px-4 bg-accent text-white rounded-xl font-medium hover:bg-accent/90 transition-all shadow-lg shadow-accent/20"
              >
                {t("preSales.addTypesButton")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showNoDataModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface border border-border w-full max-w-md rounded-2xl shadow-2xl p-6 animate-in slide-in-from-top-8 duration-300">
            <div className="text-center">
              <div className="w-14 h-14 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-7 h-7 text-accent" />
              </div>
              <h2 className="text-xl font-bold text-text-primary mb-2">
                {t("preSales.startLogging")}
              </h2>
              <p className="text-sm text-text-secondary mb-6">
                {t("preSales.trackFirstInteraction")}
              </p>
              <div
                className={cn(
                  "bg-muted/30 rounded-xl p-4 mb-6",
                  isRTL ? "text-right" : "text-left",
                )}
              >
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
                  {t("preSales.howToLogInteraction")}
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-accent/20 text-accent text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                      1
                    </div>
                    <span className="text-sm text-text-primary">
                      {t("preSales.stepGoTo")}{" "}
                      <button
                        onClick={() => navigate("/people/all")}
                        className="text-accent hover:underline"
                      >
                        {t("preSales.allPeople")}
                      </button>
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-accent/20 text-accent text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                      2
                    </div>
                    <span className="text-sm text-text-primary">
                      {t("preSales.stepOpenDetails")}
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-accent/20 text-accent text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                      3
                    </div>
                    <span className="text-sm text-text-primary">
                      {t("preSales.stepGoToTimeline")}
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-accent/20 text-accent text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                      4
                    </div>
                    <span className="text-sm text-text-primary">
                      {t("preSales.stepClickPlus")}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    navigate("/people/all");
                  }}
                  className="flex-1 py-3 px-4 border border-border text-text-secondary rounded-xl font-medium hover:bg-muted transition-all"
                >
                  {t("common.cancel")}
                </button>
                <a
                  href="https://youtu.be/Feoad772tiY?si=J3Pizyz0PhIoSoSY"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 px-4 bg-accent text-white rounded-xl font-medium hover:bg-accent/90 transition-all shadow-lg shadow-accent/20 text-center"
                >
                  {t("preSales.showMe")}
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EditChannelModal({
  isOpen,
  onClose,
  interactionTypes,
  currentConfig,
  onSave,
  onOpenInteractionConfig,
}: {
  isOpen: boolean;
  onClose: () => void;
  interactionTypes: any[];
  currentConfig: any;
  onSave: (config: any) => void;
  onOpenInteractionConfig: () => void;
}) {
  const { t, dir } = useTranslation();
  const isRTL = dir === "rtl";
  const predefinedColors = [
    "#22c55e", // Green
    "#3b82f6", // Blue
    "#ec4899", // Pink
    "#f59e0b", // Amber
    "#8b5cf6", // Violet
    "#ef4444", // Red
    "#06b6d4", // Cyan
    "#10b981", // Emerald
    "#6366f1", // Indigo
    "#f97316", // Orange
  ];

  const [columns, setColumns] = useState<any[]>(
    currentConfig.columns && currentConfig.columns.length > 0
      ? currentConfig.columns
      : [
          {
            id: Math.random().toString(36).substr(2, 9),
            name: "Outreach",
            color: "#22c55e",
            typeIds: [],
          },
          {
            id: Math.random().toString(36).substr(2, 9),
            name: "Responses",
            color: "#3b82f6",
            typeIds: [],
          },
          {
            id: Math.random().toString(36).substr(2, 9),
            name: "Booked Calls",
            color: "#ec4899",
            typeIds: [],
          },
        ],
  );

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleSave = () => {
    onSave({ columns });
    onClose();
  };

  const addColumn = () => {
    const newColor = predefinedColors[columns.length % predefinedColors.length];
    setColumns([
      ...columns,
      {
        id: Math.random().toString(36).substr(2, 9),
        name: "New Stage",
        color: newColor,
        typeIds: [],
      },
    ]);
  };

  const updateColumn = (id: string, updates: any) => {
    setColumns(
      columns.map((col) => (col.id === id ? { ...col, ...updates } : col)),
    );
  };

  const deleteColumn = (id: string) => {
    setColumns(columns.filter((col) => col.id !== id));
  };

  const cycleColor = (id: string, currentColor: string) => {
    const currentIndex = predefinedColors.indexOf(currentColor);
    const nextIndex = (currentIndex + 1) % predefinedColors.length;
    updateColumn(id, { color: predefinedColors[nextIndex] });
  };

  const toggleTypeId = (columnId: string, typeId: string) => {
    setColumns((prev) =>
      prev.map((col) => {
        if (col.id === columnId) {
          const newIds = col.typeIds.includes(typeId)
            ? col.typeIds.filter((i: string) => i !== typeId)
            : [...col.typeIds, typeId];
          return { ...col, typeIds: newIds };
        }
        return col;
      }),
    );
  };

  const handleDragStart = (index: number) => setDraggedIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    setColumns((prev) => {
      const newCols = [...prev];
      const draggedItem = newCols[draggedIndex];
      newCols.splice(draggedIndex, 1);
      newCols.splice(index, 0, draggedItem);
      return newCols;
    });
    setDraggedIndex(index);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-8 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="bg-surface border border-border w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in slide-in-from-top-8 duration-300 z-10">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Settings className="w-5 h-5 text-accent" />
              {t("preSales.customizeChannel")}
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              {t("preSales.channelConfigDesc")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenInteractionConfig}
              className="p-2 hover:bg-muted rounded-full transition-colors text-text-secondary hover:text-accent"
              title={t("preSales.manageInteractionTypes")}
            >
              <Edit2 className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-4">
          {columns.map((col, index) => (
            <div
              key={col.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={() => setDraggedIndex(null)}
              className={cn(
                "flex items-start gap-4 p-4 bg-background border border-border rounded-xl transition-all",
                draggedIndex === index
                  ? "opacity-30 scale-[0.98]"
                  : "hover:border-accent/30 shadow-sm",
              )}
            >
              {/* Drag Handle */}
              <div className="mt-2.5 cursor-move">
                <GripVertical className="w-4 h-4 text-text-secondary" />
              </div>

              {/* Color Square */}
              <button
                onClick={() => cycleColor(col.id, col.color)}
                className="mt-1 w-8 h-8 rounded-lg shadow-inner transition-transform active:scale-90 flex-shrink-0"
                style={{ backgroundColor: col.color }}
                title={t("preSales.clickToCycleColor")}
              />

              {/* Main Content */}
              <div className="flex-1 space-y-4">
                <div
                  className={cn(
                    "flex items-center gap-3",
                    isRTL && "flex-row-reverse",
                  )}
                >
                  <input
                    type="text"
                    value={col.name}
                    onChange={(e) =>
                      updateColumn(col.id, { name: e.target.value })
                    }
                    className={cn(
                      "bg-transparent text-lg font-bold text-text-primary border-b border-transparent hover:border-border focus:border-accent outline-none px-1 py-0.5 w-full transition-colors",
                      isRTL && "text-right",
                    )}
                    placeholder={t("preSales.stageName")}
                  />
                  <button
                    onClick={() => deleteColumn(col.id)}
                    className="p-1.5 hover:bg-red-500/10 text-text-secondary hover:text-red-500 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Interaction Types Selector */}
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">
                    {t("preSales.mappedInteractionTypes")}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {interactionTypes.map((type) => {
                      const isSelected = col.typeIds.includes(type.id);
                      return (
                        <button
                          key={type.id}
                          onClick={() => toggleTypeId(col.id, type.id)}
                          className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] font-medium transition-all",
                            isSelected
                              ? "bg-accent/10 border-accent text-accent"
                              : "bg-muted/10 border-border text-text-secondary hover:border-accent/30",
                          )}
                        >
                          <div
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: type.color }}
                          />
                          {type.name}
                          {isSelected && <Check className="w-3 h-3" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={addColumn}
            className="w-full py-4 border-2 border-dashed border-border rounded-xl text-text-secondary hover:text-accent hover:border-accent/40 hover:bg-accent/5 transition-all flex items-center justify-center gap-2 text-sm font-medium"
          >
            <UserPlus className="w-4 h-4" />
            {t("preSales.addNewStage")}
          </button>
        </div>

        <div className="p-6 border-t border-border flex justify-end gap-3 bg-muted/10">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-medium hover:bg-muted rounded-xl transition-colors border border-border"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={handleSave}
            className="px-8 py-2.5 text-sm font-medium bg-accent text-white rounded-xl hover:bg-accent/90 transition-all shadow-lg shadow-accent/20"
          >
            {t("preSales.saveConfiguration")}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditFunnelModal({
  isOpen,
  onClose,
  interactionTypes,
  currentConfig,
  onSave,
  onOpenInteractionConfig,
}: {
  isOpen: boolean;
  onClose: () => void;
  interactionTypes: any[];
  currentConfig: any;
  onSave: (config: any) => void;
  onOpenInteractionConfig: () => void;
}) {
  const { t, dir } = useTranslation();
  const isRTL = dir === "rtl";
  const [selectedIds, setSelectedIds] = useState<string[]>(
    currentConfig.selectedTypes || [],
  );
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Sync selectedIds with config when it changes (initial load)
  useEffect(() => {
    if (currentConfig.selectedTypes) {
      setSelectedIds(currentConfig.selectedTypes);
    } else {
      // Default: select all if no config exists yet
      setSelectedIds(interactionTypes.map((t) => t.id));
    }
  }, [currentConfig.selectedTypes, interactionTypes]);

  const handleToggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleSave = () => {
    onSave({ selectedTypes: selectedIds });
    onClose();
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newIds = [...selectedIds];
    const draggedItem = newIds[draggedIndex];
    newIds.splice(draggedIndex, 1);
    newIds.splice(index, 0, draggedItem);
    setSelectedIds(newIds);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const selectedTypesData = selectedIds
    .map((id) => interactionTypes.find((t) => t.id === id))
    .filter(Boolean);

  const availableTypes = interactionTypes.filter(
    (t) => !selectedIds.includes(t.id),
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-8 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="bg-surface border border-border w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in slide-in-from-top-8 duration-300 z-10">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Settings className="w-5 h-5 text-accent" />
              {t("preSales.customizeFunnel")}
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              {t("preSales.funnelConfigDesc")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenInteractionConfig}
              className="p-2 hover:bg-muted rounded-full transition-colors text-text-secondary hover:text-accent"
              title={t("preSales.manageInteractionTypes")}
            >
              <Edit2 className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-8">
          {/* Selected & Ordering */}
          <div>
            <h3
              className={cn(
                "text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4",
                isRTL && "text-right",
              )}
            >
              {t("preSales.pipelineOrder")}
            </h3>
            {selectedIds.length === 0 ? (
              <div className="p-8 border-2 border-dashed border-border rounded-xl text-center text-text-secondary">
                <p>{t("preSales.noTypesSelected")}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedIds.map((id, index) => {
                  const type = interactionTypes.find((t) => t.id === id);
                  if (!type) return null;
                  return (
                    <div
                      key={id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        "flex items-center gap-4 p-3 bg-background border border-border rounded-xl cursor-move transition-all",
                        draggedIndex === index
                          ? "opacity-40 scale-[0.98] border-accent"
                          : "hover:border-accent/30 hover:shadow-md",
                      )}
                    >
                      <GripVertical className="w-4 h-4 text-text-secondary" />
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: type.color }}
                      />
                      <span
                        className={cn(
                          "flex-1 font-medium",
                          isRTL && "text-right",
                        )}
                      >
                        {type.name}
                      </span>
                      <button
                        onClick={() => handleToggle(id)}
                        className="p-1.5 hover:bg-muted rounded-md text-text-secondary hover:text-red-500 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Available to Add */}
          {availableTypes.length > 0 && (
            <div>
              <h3
                className={cn(
                  "text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4",
                  isRTL && "text-right",
                )}
              >
                {t("preSales.availableTypes")}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {availableTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => handleToggle(type.id)}
                    className="flex items-center gap-3 p-3 bg-muted/20 border border-border rounded-xl hover:bg-muted/40 hover:border-accent/20 transition-all text-left group"
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: type.color }}
                    />
                    <span className="flex-1 text-sm font-medium">
                      {type.name}
                    </span>
                    <div className="w-5 h-5 rounded-md border border-border flex items-center justify-center group-hover:bg-accent/10 group-hover:border-accent/40 transition-colors">
                      <Check className="w-3 h-3 text-accent opacity-0 group-hover:opacity-100" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-border flex justify-end gap-3 bg-muted/10">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-medium hover:bg-muted rounded-xl transition-colors border border-border"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={handleSave}
            className="px-8 py-2.5 text-sm font-medium bg-accent text-white rounded-xl hover:bg-accent/90 transition-all shadow-lg shadow-accent/20"
          >
            {t("preSales.saveConfiguration")}
          </button>
        </div>
      </div>
    </div>
  );
}

const colorMap: Record<
  string,
  {
    hex: string;
    text: string;
    bg: string;
    bgLight: string;
    bgLighter: string;
    bgLightest: string;
    bgFaded: string;
  }
> = {
  "text-yellow-500": {
    hex: "#eab308",
    text: "text-yellow-500",
    bg: "bg-yellow-500",
    bgLight: "bg-yellow-500/80",
    bgLighter: "bg-yellow-500/50",
    bgLightest: "bg-yellow-500/30",
    bgFaded: "bg-yellow-500/20",
  },
  "text-green-500": {
    hex: "#22c55e",
    text: "text-green-500",
    bg: "bg-green-500",
    bgLight: "bg-green-500/80",
    bgLighter: "bg-green-500/50",
    bgLightest: "bg-green-500/30",
    bgFaded: "bg-green-500/20",
  },
  "text-orange-500": {
    hex: "#f97316",
    text: "text-orange-500",
    bg: "bg-orange-500",
    bgLight: "bg-orange-500/80",
    bgLighter: "bg-orange-500/50",
    bgLightest: "bg-orange-500/30",
    bgFaded: "bg-orange-500/20",
  },
  "text-blue-500": {
    hex: "#3b82f6",
    text: "text-blue-500",
    bg: "bg-blue-500",
    bgLight: "bg-blue-500/80",
    bgLighter: "bg-blue-500/50",
    bgLightest: "bg-blue-500/30",
    bgFaded: "bg-blue-500/20",
  },
  "text-purple-500": {
    hex: "#a855f7",
    text: "text-purple-500",
    bg: "bg-purple-500",
    bgLight: "bg-purple-500/80",
    bgLighter: "bg-purple-500/50",
    bgLightest: "bg-purple-500/30",
    bgFaded: "bg-purple-500/20",
  },
  "text-pink-500": {
    hex: "#ec4899",
    text: "text-pink-500",
    bg: "bg-pink-500",
    bgLight: "bg-pink-500/80",
    bgLighter: "bg-pink-500/50",
    bgLightest: "bg-pink-500/30",
    bgFaded: "bg-pink-500/20",
  },
  "text-red-500": {
    hex: "#ef4444",
    text: "text-red-500",
    bg: "bg-red-500",
    bgLight: "bg-red-500/80",
    bgLighter: "bg-red-500/50",
    bgLightest: "bg-red-500/30",
    bgFaded: "bg-red-500/20",
  },
  "text-teal-500": {
    hex: "#14b8a6",
    text: "text-teal-500",
    bg: "bg-teal-500",
    bgLight: "bg-teal-500/80",
    bgLighter: "bg-teal-500/50",
    bgLightest: "bg-teal-500/30",
    bgFaded: "bg-teal-500/20",
  },
  "text-indigo-500": {
    hex: "#6366f1",
    text: "text-indigo-500",
    bg: "bg-indigo-500",
    bgLight: "bg-indigo-500/80",
    bgLighter: "bg-indigo-500/50",
    bgLightest: "bg-indigo-500/30",
    bgFaded: "bg-indigo-500/20",
  },
  "text-gray-500": {
    hex: "#6b7280",
    text: "text-gray-500",
    bg: "bg-gray-500",
    bgLight: "bg-gray-500/80",
    bgLighter: "bg-gray-500/50",
    bgLightest: "bg-gray-500/30",
    bgFaded: "bg-gray-500/20",
  },
};

function TimeframeSelector({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const { t, dir } = useTranslation();
  const isRTL = dir === "rtl";
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredOption, setHoveredOption] = useState<string | null>(null);
  const [showButtonTooltip, setShowButtonTooltip] = useState(false);
  const options = [
    {
      label: t("preSales.week"),
      value: "week",
      tooltip: t("preSales.last7Days"),
    },
    {
      label: t("preSales.month"),
      value: "month",
      tooltip: t("preSales.last30Days"),
    },
    {
      label: t("preSales.quarter"),
      value: "quarter",
      tooltip: t("preSales.last90Days"),
    },
    {
      label: t("preSales.year"),
      value: "year",
      tooltip: t("preSales.last365Days"),
    },
  ];

  const currentOpt = options.find((opt) => opt.value === value);
  const currentLabel = currentOpt?.label || t("preSales.month");
  const currentTooltip = currentOpt?.tooltip || "";

  return (
    <div className="relative">
      <button
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setShowButtonTooltip(true)}
        onMouseLeave={() => setShowButtonTooltip(false)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-muted border border-border rounded-lg hover:bg-background/20 transition-colors text-text-primary shadow-sm",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      >
        {currentLabel}
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 transition-transform",
            isOpen && "rotate-180",
          )}
        />
        {showButtonTooltip && !isOpen && (
          <div
            className={`absolute ${isRTL ? "left-0" : "right-0"} bottom-full mb-2 z-50 px-2.5 py-1 bg-accent text-white text-[10px] font-medium rounded whitespace-nowrap shadow-lg pointer-events-none`}
          >
            {currentTooltip}
            <div
              className={`absolute -bottom-1 ${isRTL ? "left-3" : "right-3"} w-2 h-2 bg-accent rotate-45`}
            />
          </div>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setIsOpen(false)}
          />
          <div
            className={`absolute ${isRTL ? "left-0" : "right-0"} mt-2 w-32 bg-surface border border-border rounded-xl shadow-xl z-40 py-1 overflow-hidden animate-in fade-in zoom-in duration-200`}
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                onMouseEnter={() => setHoveredOption(opt.value)}
                onMouseLeave={() => setHoveredOption(null)}
                className={cn(
                  `w-full px-4 py-2 text-xs ${isRTL ? "text-right" : "text-left"} transition-colors hover:bg-muted relative`,
                  value === opt.value
                    ? "text-accent font-semibold bg-accent/5"
                    : "text-text-secondary",
                )}
              >
                {opt.label}
                {hoveredOption === opt.value && (
                  <div
                    className={`absolute ${isRTL ? "right-full mr-2" : "left-full ml-2"} top-1/2 -translate-y-1/2 z-50 px-2.5 py-1 bg-text-primary text-surface text-[10px] font-medium rounded whitespace-nowrap shadow-lg pointer-events-none`}
                  >
                    {opt.tooltip}
                    <div
                      className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? "-right-1" : "-left-1"} w-2 h-2 bg-text-primary rotate-45`}
                    />
                  </div>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ActivityDetail({
  activity,
  onBack,
  setDailyCounts,
}: {
  activity: any;
  onBack: () => void;
  setDailyCounts: React.Dispatch<React.SetStateAction<Record<string, number>>>;
}) {
  const { fetchActivityDetailAnalytics, addInteraction, interactionTypes, myAccess } =
    useStore();
  const [scoreTimeframe, setScoreTimeframe] = useState("month");
  const [historyTimeframe, setHistoryTimeframe] = useState("month");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAddInteractionOpen, setIsAddInteractionOpen] = useState(false);
  const [showAddTooltip, setShowAddTooltip] = useState(false);
  const [addInteractionDate, setAddInteractionDate] = useState<Date>(
    new Date(),
  );
  const [addInteractionNotes, setAddInteractionNotes] = useState("");
  const [addInteractionCount, setAddInteractionCount] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const { t } = useTranslation();

  const canReadInteractions = useMemo(() => 
    myAccess?.permissions?.includes('*') || myAccess?.permissions?.includes('interactions.read'), 
  [myAccess]);

  const canWriteInteractions = useMemo(() => 
    myAccess?.permissions?.includes('*') || myAccess?.permissions?.includes('interactions.write'), 
  [myAccess]);

  const activeColor = activity.color || "#6b7280";
  const { dir } = useTranslation();
  const isRTL = dir === "rtl";

  // Fallback for UI classes if color is not in the map
  const colorData = colorMap[activity.color] || {
    hex: activeColor,
    text: "text-text-primary",
    bg: "bg-accent",
    bgLight: "bg-accent/80",
    bgLighter: "bg-accent/50",
    bgLightest: "bg-accent/30",
    bgFaded: "bg-accent/20",
  };

  const IconComponent = activity.icon || CalendarIcon;

  useEffect(() => {
    if (!canReadInteractions) {
      setLoading(false);
      return;
    }
    const loadDetail = async () => {
      setLoading(true);
      const res = await fetchActivityDetailAnalytics(activity.id, "year");
      if (res) {
        setData(res);
      }
      setLoading(false);
    };
    loadDetail();
  }, [activity.id, fetchActivityDetailAnalytics, canReadInteractions]);

  const getHeatmapStyle = (count: number) => {
    if (count === 0)
      return { backgroundColor: "rgba(var(--color-muted-rgb), 0.2)" };
    let opacity = 0.2;
    if (count >= 7) opacity = 1;
    else if (count >= 4) opacity = 0.8;
    else if (count >= 2) opacity = 0.5;

    return {
      backgroundColor: activeColor,
      opacity: opacity,
    };
  };

  const daysName = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const processChartData = (
    raw: any[],
    timeframe: string,
    type: "score" | "count",
  ) => {
    if (!raw || raw.length === 0) return [];

    const processed: any[] = [];
    const groups: Record<string, any[]> = {};

    raw.forEach((p) => {
      const d = new Date(p.date);
      let key = "";
      if (timeframe === "month") {
        key = p.date.substring(0, 7); // YYYY-MM
      } else if (timeframe === "week") {
        // Find start of week (Sunday or Monday, let's use first interaction as start of sequence)
        // Actually, let's just use 7-day windows from the start of the data
        const start = new Date(raw[0].date);
        const diff = Math.floor(
          (d.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
        );
        const weekIndex = Math.floor(diff / 7);
        key = `W${weekIndex}`;
      } else if (timeframe === "quarter") {
        const q = Math.floor(d.getMonth() / 3) + 1;
        key = `${d.getFullYear()}-Q${q}`;
      } else if (timeframe === "year") {
        key = `${d.getFullYear()}`;
      } else {
        key = p.date; // Day
      }

      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });

    Object.keys(groups)
      .sort()
      .forEach((k) => {
        const bucket = groups[k];
        processed.push({
          date: bucket[0].date,
          value:
            type === "score"
              ? Math.round(
                  bucket.reduce((acc, c) => acc + c.score, 0) / bucket.length,
                )
              : bucket.reduce((acc, c) => acc + c.count, 0),
          count: bucket.reduce((acc, c) => acc + c.count, 0),
        });
      });

    return processed;
  };

  const CustomXAxisTick = (props: any) => {
    const { x, y, payload, index, allData, timeframe } = props;
    const tick = payload.value;
    const d = new Date(tick);
    const prev = index > 0 ? new Date(allData[index - 1].date) : null;

    let label = "";
    let subLabel = "";

    if (timeframe === "month") {
      const isNewYear = !prev || prev.getFullYear() !== d.getFullYear();
      label = d.toLocaleDateString("en-US", { month: "short" });
      subLabel = isNewYear ? d.getFullYear().toString() : "";
    } else if (timeframe === "week") {
      const isNewMonth = !prev || prev.getMonth() !== d.getMonth();
      if (isNewMonth) {
        label = d.toLocaleDateString("en-US", { month: "short" });
        const isNewYear = !prev || prev.getFullYear() !== d.getFullYear();
        subLabel = isNewYear ? d.getFullYear().toString() : "";
      } else {
        label = d.getDate().toString();
      }
    } else {
      label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }

    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={12}
          textAnchor="middle"
          fill="var(--color-text-secondary)"
          fontSize={10}
        >
          <tspan x="0" dy="0">
            {label}
          </tspan>
          {subLabel && (
            <tspan x="0" dy="12">
              {subLabel}
            </tspan>
          )}
        </text>
      </g>
    );
  };

  const scoreChartDataProcessed = processChartData(
    data?.chartData,
    scoreTimeframe,
    "score",
  );
  const historyChartDataProcessed = processChartData(
    data?.chartData,
    historyTimeframe,
    "count",
  );

  const heatmapRaw = data?.chartData || [];

  const weeks: any[][] = [];
  for (let i = 0; i < heatmapRaw.length; i += 7) {
    weeks.push(heatmapRaw.slice(i, i + 7));
  }

  const handleAddInteraction = async () => {
    // Auto-find the interaction type matching this activity
    const matchedType = interactionTypes.find((t) => t.name === activity.name);
    if (!matchedType) return;
    setIsAdding(true);
    try {
      const promises = [];
      for (let i = 0; i < addInteractionCount; i++) {
        promises.push(
          addInteraction({
            interaction_type: matchedType.id,
            notes: addInteractionNotes || undefined,
            date: addInteractionDate.toISOString(),
          }),
        );
      }
      await Promise.all(promises);
      toast.success(
        addInteractionCount > 1
          ? `${addInteractionCount} ${t("preSales.interactionsTitlePlural")}`
          : t("preSales.addInteraction"),
      );
      setIsAddInteractionOpen(false);
      setAddInteractionNotes("");
      setAddInteractionCount(1);
      setAddInteractionDate(new Date());
      // Directly update the daily count for this activity
      setDailyCounts((prev) => ({
        ...prev,
        [activity.id]: (prev[activity.id] || 0) + addInteractionCount,
      }));
      // Refresh the Overview data for this activity if readable
      if (canReadInteractions) {
        const res = await fetchActivityDetailAnalytics(activity.id, "year");
        if (res) {
          setData(res);
        }
      }
    } catch (error) {
      console.error("Failed to add interaction:", error);
      toast.error(t("preSales.failedToAdd"));
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-background">
      <div className="max-w-3xl mx-auto bg-surface text-text-primary rounded-xl overflow-hidden border border-border shadow-2xl relative">
        {loading && (
          <div className="absolute inset-0 z-50 bg-surface/50 backdrop-blur-[1px] flex items-center justify-center rounded-xl">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-muted rounded-full transition-colors"
            >
              <ArrowLeft className={cn("w-5 h-5", isRTL && "rotate-180")} />
            </button>
            <h2 className="text-xl font-semibold tracking-tight text-text-primary">
              {activity.name}
            </h2>
          </div>
          <div className="flex items-center gap-2 relative">
            {canWriteInteractions && (
              <button
                onClick={() => setIsAddInteractionOpen(true)}
                onMouseEnter={() => setShowAddTooltip(true)}
                onMouseLeave={() => setShowAddTooltip(false)}
                className="p-2 rounded-lg hover:bg-muted/50 transition-colors relative"
                style={{ color: activeColor }}
                title={t("preSales.quickAddTooltip")}
              >
                <Plus className="w-5 h-5" />
              </button>
            )}
            <div className="p-2 rounded shadow-sm">
              <IconComponent
                className="w-5 h-5"
                style={{ color: activeColor }}
              />
            </div>
          </div>
        </div>

        <div className="p-6 space-y-12 overflow-y-auto max-h-[calc(100vh-100px)] custom-scrollbar">
          {canReadInteractions ? (
            <>
              {/* Overview */}
              <section>
                <h3 className="text-text-primary text-lg font-medium mb-6">
                  {t("preSales.overviewSection")}
                </h3>
                <div className="flex items-center gap-10">
                  <div className="relative w-16 h-16">
                    <svg
                      className="w-full h-full transform -rotate-90"
                      viewBox="0 0 36 36"
                    >
                      <path
                        className="text-muted/20"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        strokeDasharray={`${data?.scoreToday || 0}, 100`}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke={activeColor}
                        strokeWidth="4"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <div className={cn("flex gap-10", isRTL && "flex-row-reverse")}>
                    <div className={cn("text-left", isRTL && "text-right")}>
                      <div className="text-xs text-text-secondary">
                        {t("preSales.scoreLabel")}
                      </div>
                      <div className="text-2xl font-bold" dir="ltr">
                        {data?.scoreToday || 0}%
                      </div>
                    </div>
                    <div className={cn("text-left", isRTL && "text-right")}>
                      <div className="text-xs text-text-secondary">
                        {t("preSales.monthLabel")}
                      </div>
                      <div
                        className={cn("text-2xl font-bold", colorData.text)}
                        dir="ltr"
                      >
                        {data?.scoreMonthDiff >= 0 ? "+" : ""}
                        {data?.scoreMonthDiff || 0}%
                      </div>
                    </div>
                    <div className={cn("text-left", isRTL && "text-right")}>
                      <div className="text-xs text-text-secondary">
                        {t("preSales.yearLabel")}
                      </div>
                      <div
                        className={cn("text-2xl font-bold", colorData.text)}
                        dir="ltr"
                      >
                        {data?.scoreYearDiff >= 0 ? "+" : ""}
                        {data?.scoreYearDiff || 0}%
                      </div>
                    </div>
                    <div className={cn("text-left", isRTL && "text-right")}>
                      <div className="text-xs text-text-secondary">
                        {t("preSales.totalLabel")}
                      </div>
                      <div className="text-2xl font-bold" dir="ltr">
                        {data?.totalCount || 0}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Score Chart */}
              <section>
                <div className="flex justify-between items-center mb-6">
                  <h3
                    className="font-medium text-lg"
                    style={{ color: activeColor }}
                  >
                    {t("preSales.score")}
                  </h3>
                  <div className="flex items-center gap-2">
                    <TimeframeSelector
                      value={scoreTimeframe}
                      onChange={setScoreTimeframe}
                    />
                  </div>
                </div>
                <div className="overflow-x-auto custom-scrollbar pb-2">
                  <div className="h-64 min-w-[700px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart
                        data={scoreChartDataProcessed}
                        margin={{ top: 10, right: 10, bottom: 20, left: -20 }}
                      >
                        <CartesianGrid
                          strokeDasharray="0"
                          stroke="var(--color-border)"
                          vertical={false}
                          opacity={0.2}
                        />
                        <XAxis
                          dataKey="date"
                          stroke="var(--color-text-secondary)"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          interval={0}
                          tick={
                            <CustomXAxisTick
                              allData={scoreChartDataProcessed}
                              timeframe={scoreTimeframe}
                            />
                          }
                        />
                        <YAxis
                          stroke="var(--color-text-secondary)"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(val) => `${val}%`}
                          domain={[0, 100]}
                          ticks={[20, 40, 60, 80, 100]}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "var(--color-surface)",
                            border: "1px solid var(--color-border)",
                            borderRadius: "8px",
                          }}
                          itemStyle={{ color: "var(--color-text-primary)" }}
                          formatter={(value: any, name: any, props: any) => {
                            if (name === "value")
                              return [
                                `${t("preSales.scoreLabel")} ${value}%`,
                                `${props.payload.count} ${t("preSales.interactionsUnit")}`,
                              ];
                            return [value, name];
                          }}
                        />
                        <RechartsLine
                          type="monotone"
                          dataKey="value"
                          stroke={activeColor}
                          strokeWidth={2}
                          dot={{ r: 4, fill: activeColor, strokeWidth: 0 }}
                          activeDot={{ r: 6 }}
                        />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </section>

              {/* History Chart */}
              <section>
                <div className="flex justify-between items-center mb-6">
                  <h3
                    className="font-medium text-lg"
                    style={{ color: activeColor }}
                  >
                    {t("preSales.history")}
                  </h3>
                  <TimeframeSelector
                    value={historyTimeframe}
                    onChange={setHistoryTimeframe}
                  />
                </div>
                <div className="overflow-x-auto custom-scrollbar pb-2">
                  <div className="h-64 min-w-[700px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart
                        data={historyChartDataProcessed}
                        margin={{ top: 20, right: 10, bottom: 20, left: -20 }}
                      >
                        <CartesianGrid
                          strokeDasharray="0"
                          stroke="var(--color-border)"
                          vertical={false}
                          opacity={0.2}
                        />
                        <XAxis
                          dataKey="date"
                          stroke="var(--color-text-secondary)"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          interval={0}
                          tick={
                            <CustomXAxisTick
                              allData={historyChartDataProcessed}
                              timeframe={historyTimeframe}
                            />
                          }
                        />
                        <YAxis hide />
                        <Tooltip
                          cursor={{ fill: "rgba(255,255,255,0.05)" }}
                          contentStyle={{
                            backgroundColor: "var(--color-surface)",
                            border: "1px solid var(--color-border)",
                            borderRadius: "8px",
                          }}
                          itemStyle={{ color: "var(--color-text-primary)" }}
                          formatter={(value: any) => [
                            `${value} ${t("preSales.interactionsUnit")}`,
                          ]}
                        />
                        <RechartsBar
                          dataKey="value"
                          fill={activeColor}
                          radius={[4, 4, 0, 0]}
                          barSize={12}
                        >
                          <LabelList
                            dataKey="value"
                            position="top"
                            fill="var(--color-text-secondary)"
                            fontSize={10}
                            offset={10}
                          />
                        </RechartsBar>
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </section>

              {/* Calendar Heatmap */}
              <section className="pb-8">
                <h3
                  className="font-medium text-lg mb-6"
                  style={{ color: activeColor }}
                >
                  {t("preSales.calendar")}
                </h3>
                <div
                  className="bg-muted/10 p-6 rounded-xl border border-border"
                  dir="ltr"
                >
                  <div className="overflow-x-auto custom-scrollbar pb-2">
                    <div className="min-w-[700px]">
                      {/* Month Labels */}
                      <div className="flex mb-2 ml-10">
                        {weeks.map((week, weekIndex) => {
                          const firstDay = new Date(week[0].date);
                          const prevWeek =
                            weekIndex > 0
                              ? new Date(weeks[weekIndex - 1][0].date)
                              : null;
                          const isFirstInMonth =
                            !prevWeek ||
                            firstDay.getMonth() !== prevWeek.getMonth();
                          return (
                            <div
                              key={weekIndex}
                              className="w-[20px] flex-none text-[9px] text-text-secondary"
                            >
                              {isFirstInMonth ? (
                                <div className="leading-tight">
                                  <div>
                                    {firstDay.toLocaleDateString("en-US", {
                                      month: "short",
                                    })}
                                  </div>
                                  {(!prevWeek ||
                                    prevWeek.getFullYear() !==
                                      firstDay.getFullYear()) && (
                                    <div className="opacity-50">
                                      {firstDay.getFullYear()}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                ""
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex">
                        <div className="flex flex-col gap-1 pr-4">
                          {daysName.map((day, i) => (
                            <div
                              key={i}
                              className="text-[9px] text-text-secondary h-[20px] flex items-center"
                            >
                              {day}
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-1">
                          {weeks.map((week, weekIndex) => (
                            <div
                              key={weekIndex}
                              className="w-[20px] flex flex-col gap-1"
                            >
                              {week.map((day, dayIndex) => (
                                <div
                                  key={dayIndex}
                                  className={cn(
                                    "w-[20px] h-[20px] rounded-[3px] transition-all hover:scale-110 flex items-center justify-center text-[8px] font-bold",
                                    day.count > 0
                                      ? "text-white"
                                      : "text-transparent",
                                  )}
                                  style={getHeatmapStyle(day.count)}
                                  title={`${day.date}: ${day.count} ${day.count === 1 ? t("preSales.interactionsUnitSingular") : t("preSales.interactionsUnit")}`}
                                >
                                  {day.count > 0 ? day.count : ""}
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <div className="flex items-center gap-2 text-[10px] text-text-secondary">
                      <span>{t("preSales.less")}</span>
                      <div className="flex gap-1">
                        <div className="w-3 h-3 rounded-[2px] bg-muted/20" />
                        <div
                          className="w-3 h-3 rounded-[2px]"
                          style={{ backgroundColor: activeColor, opacity: 0.3 }}
                        />
                        <div
                          className="w-3 h-3 rounded-[2px]"
                          style={{ backgroundColor: activeColor, opacity: 0.5 }}
                        />
                        <div
                          className="w-3 h-3 rounded-[2px]"
                          style={{ backgroundColor: activeColor, opacity: 0.7 }}
                        />
                        <div
                          className="w-3 h-3 rounded-[2px]"
                          style={{ backgroundColor: activeColor }}
                        />
                      </div>
                      <span>{t("preSales.more")}</span>
                    </div>
                  </div>
                </div>
              </section>
            </>
          ) : (
            <div className="h-96 flex flex-col items-center justify-center text-text-secondary">
              <Ban className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-lg font-bold">{t("common.accessDenied")}</p>
              <p className="text-sm opacity-60">You do not have permission to view interaction analytics.</p>
            </div>
          )}
        </div>

        {/* Quick Add Interaction Modal */}
        <Dialog
          open={isAddInteractionOpen}
          onOpenChange={setIsAddInteractionOpen}
        >
          <DialogContent className="sm:max-w-[500px] bg-surface border-border text-text-primary shadow-2xl p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-border bg-muted/30">
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Plus className="w-5 h-5 text-accent" />
                {t("preSales.quickAddInteraction").replace(
                  "{name}",
                  activity.name,
                )}
              </DialogTitle>
              <DialogDescription className="text-text-secondary text-[11px] mt-1 font-medium italic">
                {t("preSales.logWithoutLink")}
              </DialogDescription>
            </div>

            <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {/* Date Picker */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest flex items-center gap-1.5">
                  <Calendar size={10} /> {t("preSales.interactionDateLabel")}
                </label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <button className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary outline-none focus:ring-1 focus:ring-accent transition-all hover:border-border/80 text-left flex items-center justify-between">
                      <span>{format(addInteractionDate, "PPP")}</span>
                      <CalendarIcon className="w-4 h-4 text-text-secondary" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto p-0 border-border bg-surface"
                    align="start"
                  >
                    <CalendarComponent
                      mode="single"
                      selected={addInteractionDate}
                      onSelect={(date) => {
                        if (date) {
                          setAddInteractionDate(date);
                          setCalendarOpen(false);
                        }
                      }}
                      initialFocus
                      className="bg-surface text-text-primary"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Count */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest flex items-center gap-1.5">
                  <Users size={10} /> {t("preSales.countLabel")}
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={addInteractionCount}
                  onChange={(e) =>
                    setAddInteractionCount(
                      Math.max(1, parseInt(e.target.value) || 1),
                    )
                  }
                  className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary outline-none focus:ring-1 focus:ring-accent transition-all hover:border-border/80"
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest flex items-center gap-1.5">
                  <AlignLeft size={10} /> {t("preSales.notesOptional")}
                </label>
                <textarea
                  value={addInteractionNotes}
                  onChange={(e) => setAddInteractionNotes(e.target.value)}
                  placeholder={t("preSales.notesPlaceholder")}
                  className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary outline-none focus:ring-1 focus:ring-accent min-h-[100px] resize-none transition-all hover:border-border/80 custom-scrollbar"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border bg-muted/10 flex justify-end gap-3">
              <DialogClose asChild>
                <Button
                  variant="outline"
                  className="border-border text-text-secondary hover:bg-muted"
                >
                  {t("common.cancel")}
                </Button>
              </DialogClose>
              <Button
                onClick={handleAddInteraction}
                disabled={isAdding}
                className="bg-accent hover:bg-accent/90 text-white disabled:opacity-50"
              >
                {isAdding
                  ? t("preSales.adding")
                  : addInteractionCount > 1
                    ? t("preSales.addInteractions").replace(
                        "{count}",
                        addInteractionCount.toString(),
                      )
                    : t("preSales.addInteraction")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <style>{`
                    .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
                    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                    .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 10px; }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--color-text-secondary); }
                    @keyframes pulse-accent {
                        0% { box-shadow: 0 0 0 0 rgba(35, 131, 226, 0.4); }
                        70% { box-shadow: 0 0 0 8px rgba(35, 131, 226, 0); }
                        100% { box-shadow: 0 0 0 0 rgba(35, 131, 226, 0); }
                    }
                `}</style>
      </div>
    </div>
  );
}

function ChannelConversionCard({
  data: chartResult,
  onEdit,
  onRefresh,
  isRefreshing,
  isConfigured,
  countMode,
  canEdit,
}: {
  data: any;
  onEdit: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  isConfigured?: boolean;
  countMode: "unique" | "total";
  canEdit?: boolean;
}) {
  const { t, dir } = useTranslation();
  const isRTL = dir === "rtl";
  const hasNoChartData =
    !chartResult || !chartResult.data || chartResult.data.length === 0;
  const columns = chartResult?.columns || [];
  const data = chartResult?.data || [];

  // Calculate totals for each column
  const columnTotals: Record<string, number> = {};
  columns.forEach((col: any) => {
    columnTotals[col.id] = data.reduce(
      (acc: number, curr: any) => acc + (curr[col.id] || 0),
      0,
    );
  });

  const hasZeroData = Object.values(columnTotals).every((v) => v === 0);
  const showEmptyState = hasNoChartData || hasZeroData;
  const maxVal = showEmptyState
    ? 1
    : Math.max(...Object.values(columnTotals), 1);
  const roundedMax = Math.ceil(maxVal / 10) * 10 || 10;
  const ticks = [
    roundedMax,
    Math.round(roundedMax * 0.75),
    Math.round(roundedMax * 0.5),
    Math.round(roundedMax * 0.25),
    0,
  ];

  const gridTemplateColumns = `120px ${columns.map((_: any, i: number) => (i === columns.length - 1 ? "1fr" : "1fr 80px")).join(" ")} 150px`;

  const firstColumnId = columns[0]?.id;
  const lastColumnId = columns[columns.length - 1]?.id;
  const totalConvRate =
    firstColumnId && lastColumnId && columnTotals[firstColumnId] > 0
      ? (
          (columnTotals[lastColumnId] / columnTotals[firstColumnId]) *
          100
        ).toFixed(1) + "%"
      : "0%";

  return (
    <div className="bg-surface text-text-primary border border-border rounded-xl shadow-sm relative group/card">
      {/* Decorative ribbon */}

      <div className="p-6">
        <div className="flex items-center justify-right mb-8">
          {isRTL ? (
            <>
              <div />
              <div className="flex items-center gap-3 bg-muted/30 px-4 py-2 rounded-xl">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  {t("preSales.channelWiseConversion")}
                </h2>
                <div className="flex items-center gap-1">
                  {canEdit && (
                    <div className="relative">
                      <button
                        onClick={onEdit}
                        className={cn(
                          "p-1 rounded-md transition-all flex items-center justify-center",
                          !isConfigured
                            ? "opacity-100 bg-accent/20 border border-accent/40 shadow-[0_0_12px_rgba(35,131,226,0.3)] animate-[pulse-accent_2s_infinite]"
                            : "opacity-0 group-hover/card:opacity-100 hover:bg-muted border border-transparent",
                        )}
                        title={
                          isConfigured
                            ? t("preSales.configureChannelCategories")
                            : undefined
                        }
                      >
                        <Edit2
                          className={cn(
                            "w-4 h-4",
                            !isConfigured ? "text-accent" : "text-text-secondary",
                          )}
                        />
                      </button>
                      {!isConfigured && (
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-accent text-white text-[10px] font-bold rounded shadow-[0_4px_12px_rgba(35,131,226,0.4)] whitespace-nowrap z-20 pointer-events-none animate-in fade-in slide-in-from-bottom-1 duration-300">
                          {t("preSales.configureMe")}
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-accent rotate-45" />
                        </div>
                      )}
                    </div>
                  )}
                  {canEdit && (
                    <button
                      onClick={onRefresh}
                      disabled={isRefreshing}
                      className={cn(
                        "p-1 rounded-md transition-all flex items-center justify-center opacity-0 group-hover/card:opacity-100 hover:bg-muted border border-transparent",
                        isRefreshing && "opacity-100 animate-spin",
                      )}
                      title={t("preSales.refreshChannelData")}
                    >
                      <RefreshCw
                        className={cn(
                          "w-4 h-4 text-text-secondary",
                          isRefreshing && "text-accent",
                        )}
                      />
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold flex items-center gap-2">
                {t("preSales.channelWiseConversion")}
                {canEdit && (
                  <div className="relative">
                    <button
                      onClick={onEdit}
                      className={cn(
                        "p-1 rounded-md transition-all flex items-center justify-center",
                        !isConfigured
                          ? "opacity-100 bg-accent/20 border border-accent/40 shadow-[0_0_12px_rgba(35,131,226,0.3)] animate-[pulse-accent_2s_infinite]"
                          : "opacity-0 group-hover/card:opacity-100 hover:bg-muted border border-transparent",
                      )}
                      title={
                        isConfigured
                          ? t("preSales.configureChannelCategories")
                          : undefined
                      }
                    >
                      <Edit2
                        className={cn(
                          "w-4 h-4",
                          !isConfigured ? "text-accent" : "text-text-secondary",
                        )}
                      />
                    </button>
                    {!isConfigured && (
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-accent text-white text-[10px] font-bold rounded shadow-[0_4px_12px_rgba(35,131,226,0.4)] whitespace-nowrap z-20 pointer-events-none animate-in fade-in slide-in-from-bottom-1 duration-300">
                        {t("preSales.configureMe")}
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-accent rotate-45" />
                      </div>
                    )}
                  </div>
                )}
                {canEdit && (
                  <button
                    onClick={onRefresh}
                    disabled={isRefreshing}
                    className={cn(
                      "p-1 rounded-md transition-all flex items-center justify-center opacity-0 group-hover/card:opacity-100 hover:bg-muted border border-transparent",
                      isRefreshing && "opacity-100 animate-spin",
                    )}
                    title={t("preSales.refreshChannelData")}
                  >
                    <RefreshCw
                      className={cn(
                        "w-4 h-4 text-text-secondary",
                        isRefreshing && "text-accent",
                      )}
                    />
                  </button>
                )}
              </h2>
            </>
          )}
        </div>

        {showEmptyState ? (
          <div className="px-6 py-12 flex flex-col items-center justify-center text-center">
            <Inbox className="w-12 h-12 text-text-secondary/40 mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {t("preSales.noChannelDataYet").replace("{mode}", countMode)}
            </h3>
            <p className="text-sm text-text-secondary">
              {t("preSales.channelDataWillAppear")}
            </p>
            <p className="text-xs text-text-secondary/60 mt-2 italic">
              {t("preSales.tryEditingOrAdjusting")}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto pb-4 custom-scrollbar">
            <div className="min-w-[800px]">
              {/* CHART SECTION */}
              <div
                className="grid h-64 relative"
                style={{ gridTemplateColumns }}
              >
                {/* Background Grid Lines & Y-Axis */}
                <div className="absolute inset-0 flex flex-col justify-between pb-8 pointer-events-none z-0">
                  {ticks.map((val, i) => (
                    <div key={i} className="w-full flex items-center">
                      <div className="w-[120px] text-xs text-text-secondary pr-4 text-left pl-4">
                        {val !== 0 ? val : ""}
                      </div>
                      <div
                        className={cn(
                          "flex-1 border-t border-border/60 mr-[150px]",
                          val === 0 ? "border-solid" : "border-dashed",
                        )}
                      ></div>
                    </div>
                  ))}
                </div>

                {/* Col 1: Empty (for Y-axis spacer) */}
                <div></div>

                {columns.map((col: any, index: number) => {
                  const total = columnTotals[col.id];
                  const height = (total / maxVal) * 100;
                  const isLast = index === columns.length - 1;
                  const convRate =
                    !isLast && columnTotals[col.id] > 0
                      ? (
                          (columnTotals[columns[index + 1].id] /
                            columnTotals[col.id]) *
                          100
                        ).toFixed(1) + "%"
                      : "0%";

                  return (
                    <React.Fragment key={col.id}>
                      {/* Bar Column */}
                      <div className="flex flex-col justify-end items-center pb-8 px-4 sm:px-8 z-10 group relative">
                        <span
                          className="mb-2 font-semibold"
                          style={{ color: col.color }}
                        >
                          {total}
                        </span>
                        <div
                          className="w-full max-w-[100px] rounded-t-sm transition-all duration-300 group-hover:scale-105 group-hover:brightness-110 cursor-pointer"
                          style={{
                            height: `${height}%`,
                            backgroundColor: col.color,
                          }}
                        ></div>
                        {/* Tooltip */}
                        <div className="absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity bg-surface border border-border text-text-primary text-xs rounded-md py-1 px-2 pointer-events-none whitespace-nowrap z-20 shadow-lg -translate-y-full">
                          Total {col.name}: {total}
                        </div>
                      </div>

                      {/* Arrow Column */}
                      {!isLast && (
                        <div className="flex flex-col justify-end items-center pb-16 z-10">
                          <span className="font-semibold text-sm">
                            {convRate}
                          </span>
                          <ArrowRight
                            className={cn(
                              "w-4 h-4 text-text-secondary mt-1",
                              isRTL && "rotate-180",
                            )}
                          />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}

                {/* Overall Indicator Column */}
                <div className="flex flex-col items-center justify-center pb-8 z-10 h-full">
                  <span className="text-sm text-text-secondary mb-2">
                    {columnTotals[columns[0].id]}
                  </span>
                  <div className="flex-1 w-px bg-border relative flex items-center justify-center">
                    <div className="absolute bg-surface py-2 px-1 flex flex-col items-center w-32 border border-border shadow-sm rounded-md">
                      <span className="text-xl font-semibold">
                        {totalConvRate}
                      </span>
                      <span className="text-[10px] text-text-secondary uppercase tracking-wider text-center">
                        Conversion Rate
                      </span>
                    </div>
                  </div>
                  <ArrowDown className="w-4 h-4 text-text-secondary mt-1" />
                  <span className="text-sm text-text-secondary mt-1">
                    {columnTotals[columns[columns.length - 1].id]}
                  </span>
                </div>
              </div>

              {/* TABLE HEADER */}
              <div
                className="grid py-3 border-y border-border bg-muted/20 text-sm font-medium"
                style={{ gridTemplateColumns }}
              >
                <div className="px-4">{t("preSales.channel")}</div>
                {columns.map((col: any, i: number) => (
                  <React.Fragment key={col.id}>
                    <div className="text-center" style={{ color: col.color }}>
                      {col.name}
                    </div>
                    {i < columns.length - 1 && <div></div>}
                  </React.Fragment>
                ))}
                <div className="text-center">
                  {t("preSales.conversionRate")}
                </div>
              </div>

              {/* TABLE ROWS */}
              {data.map((row: any, i: number) => (
                <div
                  key={i}
                  className="grid py-4 border-b border-border/50 text-sm items-center hover:bg-muted/10 transition-colors"
                  style={{ gridTemplateColumns }}
                >
                  <div className="px-4 text-text-secondary">{row.name}</div>
                  {columns.map((col: any, index: number) => {
                    const isLast = index === columns.length - 1;
                    const rowConvRate =
                      !isLast && row[col.id] > 0
                        ? (
                            (row[columns[index + 1].id] / row[col.id]) *
                            100
                          ).toFixed(1) + "%"
                        : "0%";

                    return (
                      <React.Fragment key={col.id}>
                        <div
                          className="text-center font-medium"
                          style={{ color: col.color }}
                        >
                          {row[col.id] || 0}
                        </div>
                        {!isLast && (
                          <div className="text-center text-text-secondary text-xs">
                            {rowConvRate}
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                  <div className="text-center font-semibold">
                    {row[columns[0].id] > 0
                      ? (
                          (row[columns[columns.length - 1].id] /
                            row[columns[0].id]) *
                          100
                        ).toFixed(1) + "%"
                      : "0%"}
                  </div>
                </div>
              ))}

              {/* TOTAL ROW */}
              <div
                className="grid py-4 bg-muted/30 text-sm items-center font-semibold rounded-b-xl"
                style={{ gridTemplateColumns }}
              >
                <div className="px-4">{t("preSales.totalLabel")}</div>
                {columns.map((col: any, i: number) => (
                  <React.Fragment key={col.id}>
                    <div className="text-center" style={{ color: col.color }}>
                      {columnTotals[col.id]}
                    </div>
                    {i < columns.length - 1 && <div></div>}
                  </React.Fragment>
                ))}
                <div className="text-center">{totalConvRate}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
