import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import * as Icons from "lucide-react";
import {
  Users,
  Building2,
  Target,
  CheckSquare,
  FileText,
  GitBranch,
  Settings,
  ChevronDown,
  Search,
  HelpCircle,
  List,
  Kanban,
  User,
  ChevronRight,
  PieChart,
  History,
  PanelLeftClose,
  PanelLeftOpen,
  Moon,
  UserPlus,
  MessageSquare,
  LogOut,
  MoreVertical,
  Monitor,
  Sun,
  Check,
  ChevronLeft,
  LogIn,
  Heart,
  Mail,
  Download,
  BarChart3,
  Send,
  Link as LinkIcon,
  MoreHorizontal,
  ArrowUpCircle,
  Sparkles,
  Bot,
  LayoutDashboard,
  Rocket,
  Home,
  Briefcase,
  LayoutGrid,
  Keyboard,
  Folder,
  Activity,
  Globe,
} from "lucide-react";
import { useStore } from "../store";
import { cn } from "../lib/utils";
import { toast } from "sonner";
import { InviteMembersDialog } from "./InviteMembersDialog";
import { ShortcutsDialog } from "./ShortcutsDialog";
import {
  useGuidedOnboarding,
  GuidedOnboardingOverlay,
  VirtualMouse,
} from "../src/guided-ob";
import { useTranslation } from "../src/i18n";

const LucideIcon = ({
  name,
  size = 16,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) => {
  const IconComponent = (Icons as any)[name];
  if (!IconComponent)
    return <Icons.HelpCircle size={size} className={className} />;
  return <IconComponent size={size} className={className} />;
};

const Notifications = ({
  isCollapsed,
  Tooltip,
  onExpand,
  t,
}: {
  isCollapsed: boolean;
  Tooltip: any;
  onExpand: () => void;
  t: (key: string) => string;
}) => {
  const { appUpdates, fetchAppUpdates, language } = useStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const timeoutRef = useRef<any>(null);

  useEffect(() => {
    const { accessToken } = useStore.getState();
    if (accessToken) {
      fetchAppUpdates();
    }
  }, [fetchAppUpdates]);

  const getExternalLink = (url: string) => {
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return `https://${url}`;
  };

  const handleMouseEnter = (id: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setHoveredTaskId(id);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setHoveredTaskId(null);
    }, 150);
  };

  if (isCollapsed) {
    return (
      <Tooltip text={`${t("sidebar.notifications")} (${appUpdates.length})`}>
        <button
          onClick={() => {
            onExpand();
            setIsExpanded(true);
          }}
          className="w-9 h-9 mx-auto mb-4 flex items-center justify-center rounded-full border border-border/40 bg-card-bg hover:bg-card-hover transition-all relative group shadow-sm"
        >
          <Icons.Sparkles size={14} className="text-blue-500" />
          {appUpdates.length > 0 && (
            <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-blue-600 rounded-full flex items-center justify-center border-2 border-sidebar">
              <span className="text-[7px] font-bold text-white">
                {appUpdates.length}
              </span>
            </div>
          )}
        </button>
      </Tooltip>
    );
  }

  return (
    <div className="mx-2 mb-4 relative">
      {!isExpanded ? (
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full flex items-center justify-between px-2.5 py-1.5 bg-card-bg border border-border/40 rounded-full hover:bg-card-hover transition-all group shadow-sm"
        >
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
            <span className="text-[12px] font-medium text-textPrimary/90">
              {t("nav.gettingStarted")}
            </span>
          </div>
          {appUpdates.length > 0 && (
            <span className="text-[10px] font-bold text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded-full">
              {appUpdates.length}
            </span>
          )}
        </button>
      ) : (
        <div className="bg-card-bg border border-border/40 rounded-xl overflow-hidden p-3 animate-in fade-in zoom-in duration-200 relative shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[12px] font-semibold text-textPrimary/90">
              {t("nav.gettingStarted")}
            </h4>
...
            <div className="flex items-center gap-1">
              <button className="p-1 hover:bg-card-hover rounded text-textSecondary">
                <Icons.MoreHorizontal size={14} />
              </button>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 hover:bg-card-hover rounded text-textSecondary"
              >
                <Icons.ChevronDown size={14} className="rotate-180" />
              </button>
            </div>
          </div>
          <p className="text-[11px] text-textSecondary mb-3">
            {t("nav.yourFirstSteps")}
          </p>

          <div className="space-y-0.5 relative">
            {appUpdates.map((update) => (
              <div
                key={update.id}
                onMouseEnter={() => handleMouseEnter(update.id)}
                onMouseLeave={handleMouseLeave}
                className="flex items-center gap-3 px-2 py-1.5 rounded-md transition-colors text-textPrimary hover:bg-card-hover cursor-pointer"
              >
                <div className="p-1.5 rounded-lg bg-card-dark">
                  <LucideIcon
                    name={update.icon}
                    size={14}
                    className="text-blue-500"
                  />
                </div>
                <span className="text-[12px] flex-1 truncate">
                  {update.title}
                </span>
                <div className="w-4 h-4 flex items-center justify-center text-textSecondary/40 group-hover:text-blue-500 transition-colors">
                  <Icons.ChevronRight
                    size={12}
                    className={language === "ar" ? "rotate-180" : ""}
                  />
                </div>

                {/* Popover Card */}
                {hoveredTaskId === update.id && (
                  <div
                    onMouseEnter={() => handleMouseEnter(update.id)}
                    onMouseLeave={handleMouseLeave}
                    className={cn(
                      "fixed bottom-8 z-[9999] w-[320px] bg-card-bg border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-left-2 duration-200",
                      language === "ar" ? "right-[250px]" : "left-[250px]",
                    )}
                  >
                    <div className="h-[140px] bg-card-dark relative overflow-hidden flex items-center justify-center border-b border-border/50">
                      <span className="text-2xl font-black text-blue-500/20 uppercase tracking-[0.2em]">
                        {update.image_text || update.title}
                      </span>
                      <div className="absolute inset-0 bg-gradient-to-t from-card-bg to-transparent opacity-60" />
                    </div>
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <LucideIcon
                          name={update.icon}
                          size={16}
                          className="text-blue-500"
                        />
                        <h4 className="text-sm font-semibold text-textPrimary">
                          {update.title}
                        </h4>
                      </div>
                      <p className="text-xs text-textSecondary mb-4 leading-relaxed whitespace-pre-wrap">
                        {update.description}
                      </p>
                      <div className="flex gap-2">
                        {update.primary_action_is_internal ? (
                          <Link
                            to={update.primary_action_link}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-1.5 px-3 rounded-md flex items-center justify-center gap-1.5 transition-colors"
                          >
                            {update.primary_action_label}
                          </Link>
                        ) : (
                          <a
                            href={getExternalLink(update.primary_action_link)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-1.5 px-3 rounded-md flex items-center justify-center gap-1.5 transition-colors"
                          >
                            {update.primary_action_label}
                          </a>
                        )}

                        {update.secondary_action_label &&
                          (update.secondary_action_is_internal ? (
                            <Link
                              to={update.secondary_action_link!}
                              className="flex-1 bg-card-hover hover:bg-card-hover-light text-textPrimary text-xs font-medium py-1.5 px-3 rounded-md flex items-center justify-center gap-1.5 transition-colors border border-border"
                            >
                              {update.secondary_action_label}
                            </Link>
                          ) : (
                            <a
                              href={getExternalLink(
                                update.secondary_action_link!,
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 bg-card-hover hover:bg-card-hover-light text-textPrimary text-xs font-medium py-1.5 px-3 rounded-md flex items-center justify-center gap-1.5 transition-colors border border-border"
                            >
                              {update.secondary_action_label}
                            </a>
                          ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const GettingStarted = ({
  isCollapsed,
  Tooltip,
  onExpand,
  t,
}: {
  isCollapsed: boolean;
  Tooltip: any;
  onExpand: () => void;
  t: (key: string) => string;
}) => {
  const { language } = useStore();
  const isRTL = language === "ar";
  const [isExpanded, setIsExpanded] = useState(false);
  const [hoveredTaskId, setHoveredTaskId] = useState<number | null>(null);
  const timeoutRef = useRef<any>(null);

  const handleMouseEnter = (id: number) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setHoveredTaskId(id);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setHoveredTaskId(null);
    }, 150);
  };

  const tasks = [
    {
      id: 1,
      label: t("sidebar.signedUp"),
      completed: true,
      icon: Heart,
      description: t("sidebar.signedUpDesc"),
      image: "https://placehold.co/400x250/1e1e1e/3b82f6?text=Welcome+aboard",
      primaryAction: t("sidebar.viewProfile"),
      secondaryAction: t("sidebar.learnMore"),
    },
    {
      id: 2,
      label: t("sidebar.syncEmail"),
      completed: false,
      icon: Mail,
      description: t("sidebar.syncEmailDesc"),
      image: "https://placehold.co/400x250/1e1e1e/3b82f6?text=Email+Sync",
      primaryAction: t("sidebar.connectEmail"),
      secondaryAction: t("sidebar.readGuide"),
    },
    {
      id: 3,
      label: t("sidebar.installExtension"),
      completed: false,
      icon: Download,
      description: t("sidebar.extensionDesc"),
      image:
        "https://placehold.co/400x250/1e1e1e/3b82f6?text=Browser+Extension",
      primaryAction: t("sidebar.install"),
      secondaryAction: t("sidebar.learnMore"),
    },
    {
      id: 4,
      label: t("sidebar.createReport"),
      completed: false,
      icon: BarChart3,
      description: t("sidebar.reportDesc"),
      image: "https://placehold.co/400x250/1e1e1e/3b82f6?text=Analytics",
      primaryAction: t("sidebar.createReportBtn"),
      secondaryAction: t("sidebar.templates"),
    },
    {
      id: 5,
      label: t("sidebar.createWorkflow"),
      completed: true,
      icon: GitBranch,
      description: t("sidebar.workflowDesc"),
      image: "https://placehold.co/400x250/1e1e1e/3b82f6?text=Workflows",
      primaryAction: t("sidebar.newWorkflow"),
      secondaryAction: t("sidebar.tutorial"),
    },
    {
      id: 6,
      label: t("sidebar.createSequence"),
      completed: true,
      icon: Send,
      description: t("sidebar.sequenceDesc"),
      image: "https://placehold.co/400x250/1e1e1e/3b82f6?text=Email+Sequences",
      primaryAction: t("sidebar.createSequenceBtn"),
      secondaryAction: t("sidebar.bestPractices"),
    },
    {
      id: 7,
      label: t("sidebar.inviteTeam"),
      completed: false,
      icon: UserPlus,
      description: t("sidebar.inviteTeamDesc"),
      image:
        "https://placehold.co/400x250/1e1e1e/3b82f6?text=Team+Collaboration",
      primaryAction: t("sidebar.inviteTeamBtn"),
      secondaryAction: t("sidebar.manageRoles"),
    },
  ];

  const completedCount = tasks.filter((t) => t.completed).length;
  const progress = Math.round((completedCount / tasks.length) * 100);

  if (isCollapsed) {
    return (
      <Tooltip text={`Getting started ${progress}%`}>
        <button
          onClick={() => {
            onExpand();
            setIsExpanded(true);
          }}
          className="w-10 h-10 mx-auto mb-4 flex items-center justify-center rounded-full border border-border bg-card-bg hover:bg-card-hover transition-colors relative group"
        >
          <span className="text-[10px] font-bold z-10">{progress}%</span>
          <div
            className="absolute bottom-0 left-0 right-0 bg-blue-600/40 transition-all duration-300 rounded-b-full"
            style={{ height: `${progress}%` }}
          />
        </button>
      </Tooltip>
    );
  }

  return (
    <div className="mx-2 mb-4 relative">
      {!isExpanded ? (
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full flex items-center justify-between px-3 py-2 bg-card-bg border border-border rounded-full hover:bg-card-hover transition-all group"
        >
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_var(--color-blue-shadow)]" />
            <span className="text-[12px] font-medium text-textPrimary">
              {t("sidebar.gettingStarted")}
            </span>
          </div>
          <span className="text-[11px] font-bold text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded-full">
            {progress}%
          </span>
        </button>
      ) : (
        <div className="bg-card-bg border border-border rounded-xl overflow-hidden p-3 animate-in fade-in zoom-in duration-200 relative">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[13px] font-semibold text-textPrimary">
              {t("sidebar.gettingStarted")}
            </h4>
            <div className="flex items-center gap-1">
              <button className="p-1 hover:bg-card-hover rounded text-textSecondary">
                <MoreHorizontal size={14} />
              </button>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 hover:bg-card-hover rounded text-textSecondary"
              >
                <ChevronDown size={14} className="rotate-180" />
              </button>
            </div>
          </div>
          <p className="text-[11px] text-textSecondary mb-3">
            {progress}% {t("sidebar.completed")} | {t("sidebar.keepItUp")}
          </p>

          <div className="h-1 bg-card-hover rounded-full mb-4 overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="space-y-0.5 relative">
            {tasks.map((task) => (
              <div
                key={task.id}
                onMouseEnter={() => handleMouseEnter(task.id)}
                onMouseLeave={handleMouseLeave}
                className={`flex items-center gap-3 px-2 py-1.5 rounded-md transition-colors ${task.completed ? "text-textSecondary/60" : "text-textPrimary hover:bg-card-hover cursor-pointer"}`}
              >
                <div
                  className={`p-1.5 rounded-lg ${task.completed ? "bg-transparent" : "bg-card-dark"}`}
                >
                  <task.icon
                    size={14}
                    className={
                      task.completed ? "text-textSecondary/40" : "text-blue-500"
                    }
                  />
                </div>
                <span
                  className={`text-[12px] flex-1 ${task.completed ? "line-through" : ""}`}
                >
                  {task.label}
                </span>
                {task.completed && (
                  <div className="w-4 h-4 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-500">
                    <Check size={10} strokeWidth={4} />
                  </div>
                )}

                {/* Popover Card */}
                {hoveredTaskId === task.id && (
                  <div
                    onMouseEnter={() => handleMouseEnter(task.id)}
                    onMouseLeave={handleMouseLeave}
                    className={cn(
                      "fixed bottom-8 z-[9999] w-[320px] bg-card-bg border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-left-2 duration-200",
                      isRTL ? "right-[250px]" : "left-[250px]",
                    )}
                  >
                    <div className="h-[140px] bg-card-dark relative overflow-hidden">
                      <img
                        src={task.image}
                        alt={task.label}
                        className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity"
                      />
                    </div>
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <task.icon size={16} className="text-blue-500" />
                        <h4 className="text-sm font-semibold text-textPrimary">
                          {task.label}
                        </h4>
                      </div>
                      <p className="text-xs text-textSecondary mb-4 leading-relaxed whitespace-pre-wrap">
                        {task.description}
                      </p>
                      <div className="flex gap-2">
                        <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-1.5 px-3 rounded-md flex items-center justify-center gap-1.5 transition-colors">
                          <Download size={12} />
                          {task.primaryAction}
                        </button>
                        <button className="flex-1 bg-card-hover hover:bg-card-hover-light text-textPrimary text-xs font-medium py-1.5 px-3 rounded-md flex items-center justify-center gap-1.5 transition-colors border border-border">
                          {task.secondaryAction}
                          <ArrowUpCircle size={12} className="rotate-45" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const Sidebar = () => {
  const {
    openCommandMenu,
    isSidebarCollapsed: isCollapsed,
    toggleSidebar,
    peopleExpanded,
    tasksExpanded,
    opportunitiesExpanded,
    toolsExpanded,
    togglePeopleExpanded,
    toggleTasksExpanded,
    toggleOpportunitiesExpanded,
    toggleToolsExpanded,
    setPeopleExpanded,
    setTasksExpanded,
    setOpportunitiesExpanded,
    setToolsExpanded,
    setProModalOpen,
    user,
    logout,
    analyticsExpanded,
    toggleAnalyticsExpanded,
    setAnalyticsExpanded,
    myAccess,
  } = useStore();
  const { theme, setTheme, language } = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [menuView, setMenuView] = useState<"main" | "theme" | "language">(
    "main",
  );
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [shortcutsDialogOpen, setShortcutsDialogOpen] = useState(false);
  const workspaceMenuRef = useRef<HTMLDivElement>(null);
  const userButtonRef = useRef<HTMLDivElement>(null);
  const inviteBtnRef = useRef<HTMLButtonElement>(null);
  const shortcutsBtnRef = useRef<HTMLButtonElement>(null);
  const sidebarSearchRef = useRef<HTMLDivElement>(null);
  const toolsMenuRef = useRef<HTMLDivElement>(null);
  const reportsNavItemRef = useRef<HTMLAnchorElement>(null);

  const { highlighted, clearHighlight, isMouseMoving, setIsMouseMoving } =
    useGuidedOnboarding();

  const { t } = useTranslation();

  const canManageUsers = myAccess?.permissions?.includes("users.manage");

  useEffect(() => {
    if (
      (highlighted === "invite_usr" ||
        highlighted === "shortcuts" ||
        highlighted === "sidebar_search" ||
        highlighted === "manage_reports") &&
      !isWorkspaceMenuOpen
    ) {
      // Logic handled by VirtualMouse onComplete
    }
  }, [highlighted]);

  const handleLogout = () => {
    logout();
    navigate("/signin");
    setIsWorkspaceMenuOpen(false);
  };

  const setIsCollapsed = (collapsed: boolean) => {
    useStore.getState().setSidebarCollapsed(collapsed);
  };

  const handleNestedClick = (
    toggleAction: () => void,
    setExpanded: (expanded: boolean) => void,
  ) => {
    if (isCollapsed) {
      useStore.getState().setSidebarCollapsed(false);
      setExpanded(true);
    } else {
      toggleAction();
    }
  };

  // Click outside to close workspace menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        workspaceMenuRef.current &&
        !workspaceMenuRef.current.contains(e.target as Node)
      ) {
        setIsWorkspaceMenuOpen(false);
      }
    };

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsWorkspaceMenuOpen(false);
      }
    };

    if (isWorkspaceMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEsc);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
      if (!isWorkspaceMenuOpen) setMenuView("main");
    };
  }, [isWorkspaceMenuOpen]);

  const isActive = (path: string) => location.pathname === path;
  const isTasksActive = location.pathname.startsWith("/tasks");
  const isOpportunitiesActive = location.pathname.startsWith("/opportunities");

  const Tooltip = ({
    children,
    text,
  }: {
    children: React.ReactNode;
    text: string;
  }) => {
    if (!isCollapsed) return <>{children}</>;
    const isRTL = language === "ar";
    return (
      <div className="relative group/tooltip flex items-center justify-center h-10 w-full">
        {children}
        <div
          className={cn(
            "fixed invisible group-hover/tooltip:visible bg-tooltip-bg text-textPrimary text-[12px] px-2 py-1.5 rounded shadow-lg whitespace-nowrap z-[100] border border-border pointer-events-none mt-[-2px]",
            isRTL ? "right-[74px]" : "left-[74px]",
          )}
        >
          {text}
          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2 border-y-[4px] border-y-transparent",
              isRTL
                ? "right-[-4px] border-r-0 border-l-[4px] border-l-tooltip-bg"
                : "left-[-4px] border-r-[4px] border-r-tooltip-bg",
            )}
          />
        </div>
      </div>
    );
  };

  const NavItem = React.forwardRef<
    HTMLAnchorElement,
    {
      to: string;
      icon: any;
      label: string;
      onClick?: () => void;
      className?: string;
    }
  >(({ to, icon: Icon, label, onClick, className }, ref) => (
    <Tooltip text={label}>
      <Link
        to={to}
        ref={ref}
        onClick={onClick}
        className={cn(
          "flex items-center gap-3 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-all duration-200 mb-1.5 relative",
          isCollapsed ? "justify-center px-0 w-9 h-9 mx-auto" : "",
          isActive(to)
            ? "bg-card-hover/60 text-textPrimary shadow-sm"
            : "text-textSecondary hover:bg-card-hover/40 hover:text-textPrimary",
          className,
        )}
      >
        <Icon size={16} className={cn("shrink-0 transition-colors", isActive(to) ? "text-textPrimary" : "text-textSecondary/70")} />
        {!isCollapsed && <span className="truncate">{label}</span>}
      </Link>
    </Tooltip>
  ));

  return (
    <div
      className={`bg-sidebar border-r border-border h-screen flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out relative
        ${isCollapsed ? "w-[68px]" : "w-[260px]"}`}
    >
      <GuidedOnboardingOverlay highlighted={highlighted} />
      <VirtualMouse
        targetRef={
          highlighted === "sidebar_search"
            ? sidebarSearchRef
            : highlighted === "manage_reports"
              ? toolsMenuRef
              : userButtonRef
        }
        active={isMouseMoving}
        onComplete={() => {
          setIsMouseMoving(false);
          if (highlighted === "sidebar_search") {
            openCommandMenu();
            clearHighlight();
          } else if (highlighted === "manage_reports") {
            setToolsExpanded(true);
            if (isCollapsed) setIsCollapsed(false);
          } else {
            setIsWorkspaceMenuOpen(true);
          }
        }}
      />
      {/* Header */}
      <div
        className={`p-3 transition-all duration-300 relative ${isCollapsed ? "px-2" : ""}`}
      >
        <div
          className={`flex text-textPrimary mb-2 transition-all duration-300 ${isCollapsed ? "flex-col items-center gap-4" : "items-center justify-between"}`}
        >
          <div
            ref={userButtonRef}
            onClick={() => setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen)}
            className={cn(
              "flex items-center gap-2 min-w-0 transition-all duration-200 cursor-pointer hover:bg-card-hover/50 p-1 rounded-md -ml-1 flex-1 relative",
              isCollapsed ? "justify-center w-full ml-0" : "",
              (highlighted === "invite_usr" || highlighted === "shortcuts") &&
                "z-[100] bg-card-bg ring-2 ring-accent",
            )}
          >
            <div className="w-6 h-6 bg-white rounded-md text-black flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm">
              {(
                user?.first_name ||
                user?.name?.split(" ")[0] ||
                user?.username ||
                "FounderStack"
              )
                .charAt(0)
                .toUpperCase()}
            </div>
            {!isCollapsed && (
              <span className="text-sm font-semibold truncate uppercase tracking-tight text-textPrimary/90">
                {user?.first_name ||
                  user?.name?.split(" ")[0] ||
                  user?.username ||
                  "FounderStack"}
              </span>
            )}
            {!isCollapsed && (
              <ChevronDown
                size={14}
                className={cn("text-textSecondary/50 ms-auto transition-transform duration-200", isWorkspaceMenuOpen && "rotate-180")}
              />
            )}
          </div>

          {!isCollapsed && (
            <div className="flex items-center gap-0.5 ms-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openCommandMenu();
                }}
                className="p-1.5 hover:bg-card-hover rounded-md text-textSecondary/60 hover:text-textPrimary transition-all duration-200"
                title={t("common.search")}
              >
                <Search size={16} />
              </button>
              <button
                onClick={toggleSidebar}
                className="p-1.5 hover:bg-card-hover rounded-md text-textSecondary/60 hover:text-textPrimary transition-all duration-200"
                title={t("sidebar.collapseSidebar")}
              >
                <PanelLeftClose size={16} />
              </button>
            </div>
          )}

          {isCollapsed && (
            <button
              onClick={toggleSidebar}
              className="p-2 hover:bg-card-hover rounded-md text-textSecondary transition-all duration-200"
              title={t("sidebar.expandSidebar")}
            >
              <PanelLeftOpen size={18} />
            </button>
          )}
        </div>

        {/* Workspace Quick Actions Menu */}
        {isWorkspaceMenuOpen && (
          <div
            ref={workspaceMenuRef}
            className={cn(
              "absolute top-[52px] left-3 right-3 z-[100] bg-card-bg border border-border rounded-lg shadow-xl overflow-hidden py-1 animate-in fade-in zoom-in duration-150 origin-top min-w-[180px]",
            )}
          >
            {menuView === "main" ? (
              <>
                <button
                  onClick={() => setMenuView("theme")}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 text-textSecondary hover:bg-card-hover hover:text-textPrimary transition-colors text-sm pe-8",
                    "relative",
                  )}
                >
                  {theme === "dark" ? (
                    <Moon size={16} />
                  ) : theme === "light" ? (
                    <Sun size={16} />
                  ) : (
                    <Monitor size={16} />
                  )}
                  <span>{t("sidebar.theme")}</span>
                  <ChevronRight
                    size={14}
                    className={`absolute end-3 ${language === "ar" ? "rotate-180" : ""}`}
                  />
                </button>
                <button
                  onClick={() => setMenuView("language")}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 text-textSecondary hover:bg-card-hover hover:text-textPrimary transition-colors text-sm pe-8",
                    "relative",
                  )}
                >
                  <Globe size={16} />
                  <span>{t("sidebar.language")}</span>
                  <ChevronRight
                    size={14}
                    className={`absolute end-3 ${language === "ar" ? "rotate-180" : ""}`}
                  />
                </button>
                <button
                  ref={inviteBtnRef}
                  onClick={() => {
                    if (highlighted === "invite_usr") clearHighlight();
                    setInviteDialogOpen(true);
                    setIsWorkspaceMenuOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 text-textSecondary hover:bg-card-hover hover:text-textPrimary transition-colors text-sm",
                    highlighted === "invite_usr" &&
                      "bg-accent/20 text-accent font-bold ring-1 ring-inset ring-accent/50 animate-pulse",
                  )}
                >
                  <UserPlus size={16} />
                  <span>{canManageUsers ? t("sidebar.inviteUser") : t("sidebar.giveReferral")}</span>
                </button>
                <a
                  href="https://t.me/Omar_Gatara"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center gap-3 px-3 py-2 text-textSecondary hover:bg-card-hover hover:text-textPrimary transition-colors text-sm"
                >
                  <MessageSquare size={16} />
                  <span>{t("sidebar.support")}</span>
                </a>
                <button
                  ref={shortcutsBtnRef}
                  onClick={() => {
                    if (highlighted === "shortcuts") clearHighlight();
                    setShortcutsDialogOpen(true);
                    setIsWorkspaceMenuOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 text-textSecondary hover:bg-card-hover hover:text-textPrimary transition-colors text-sm",
                    highlighted === "shortcuts" &&
                      "bg-accent/20 text-accent font-bold ring-1 ring-inset ring-accent/50 animate-pulse",
                  )}
                >
                  <Keyboard size={16} />
                  <span>{t("shortcuts.title")}</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2 text-textSecondary hover:bg-card-hover hover:text-textPrimary transition-colors text-sm border-t border-border mt-1 pt-2"
                >
                  <LogOut size={16} />
                  <span>{t("sidebar.logOut")}</span>
                </button>
              </>
            ) : menuView === "theme" ? (
              <>
                <button
                  onClick={() => setMenuView("main")}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-textSecondary hover:bg-card-hover hover:text-textPrimary transition-colors"
                >
                  {language === "ar" ? (
                    <ChevronRight size={16} />
                  ) : (
                    <ChevronLeft size={16} />
                  )}
                  <span>{t("sidebar.back")}</span>
                </button>
                <div className="px-3 py-2 space-y-1">
                  <button
                    onClick={() => setTheme("dark")}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors",
                      theme === "dark"
                        ? "text-textPrimary bg-card-hover"
                        : "text-textSecondary hover:bg-card-hover hover:text-textPrimary",
                    )}
                  >
                    <Moon size={16} />
                    <span>{t("sidebar.dark")}</span>
                    {theme === "dark" && (
                      <Check
                        size={14}
                        className={(language as "en" | "ar") === "ar" ? "ms-auto" : "ml-auto"}
                      />
                    )}
                  </button>
                  <button
                    onClick={() => setTheme("light")}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors",
                      theme === "light"
                        ? "text-textPrimary bg-card-hover"
                        : "text-textSecondary hover:bg-card-hover hover:text-textPrimary",
                    )}
                  >
                    <Sun size={16} />
                    <span>{t("sidebar.light")}</span>
                    {theme === "light" && (
                      <Check
                        size={14}
                        className={(language as "en" | "ar") === "ar" ? "ms-auto" : "ml-auto"}
                      />
                    )}
                  </button>
                  <button
                    onClick={() => setTheme("system")}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors",
                      theme === "system"
                        ? "text-textPrimary bg-card-hover"
                        : "text-textSecondary hover:bg-card-hover hover:text-textPrimary",
                    )}
                  >
                    <Monitor size={16} />
                    <span>{t("sidebar.system")}</span>
                    {theme === "system" && (
                      <Check
                        size={14}
                        className={(language as "en" | "ar") === "ar" ? "ms-auto" : "ml-auto"}
                      />
                    )}
                  </button>
                </div>
              </>
            ) : menuView === "language" ? (
              <>
                <button
                  onClick={() => setMenuView("main")}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-textSecondary hover:bg-card-hover hover:text-textPrimary transition-colors"
                >
                  {language === "ar" ? (
                    <ChevronRight size={16} />
                  ) : (
                    <ChevronLeft size={16} />
                  )}
                  <span>{t("sidebar.back")}</span>
                </button>
                <div className="px-3 py-2 space-y-1">
                  <button
                    onClick={() => useStore.getState().setLanguage("en")}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors",
                      language === "en"
                        ? "text-textPrimary bg-card-hover"
                        : "text-textSecondary hover:bg-card-hover hover:text-textPrimary",
                    )}
                  >
                    <span className="w-4 h-4 rounded bg-card-hover flex items-center justify-center text-[10px] font-bold text-textPrimary">
                      EN
                    </span>
                    <span>{t("sidebar.english")}</span>
                    {language === "en" && (
                      <Check
                        size={14}
                        className={(language as "en" | "ar") === "ar" ? "ms-auto" : "ml-auto"}
                      />
                    )}
                  </button>
                  <button
                    onClick={() => useStore.getState().setLanguage("ar")}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors",
                      language === "ar"
                        ? "text-textPrimary bg-card-hover"
                        : "text-textSecondary hover:bg-card-hover hover:text-textPrimary",
                    )}
                  >
                    <span className="w-4 h-4 rounded bg-card-hover flex items-center justify-center text-[10px] font-bold text-textPrimary">
                      ع
                    </span>
                    <span>{t("sidebar.arabic")}</span>
                    {language === "ar" && (
                      <Check
                        size={14}
                        className={(language as "en" | "ar") === "ar" ? "ms-auto" : "ml-auto"}
                      />
                    )}
                  </button>
                </div>
              </>
            ) : null}
          </div>
        )}
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 px-2 overflow-y-auto">
        <div className="mb-6">
          {/* Main Group */}
          <div className="mt-4">
            {/* Home */}
            <NavItem to="/" icon={Home} label={t("nav.home")} />

            {/* Reports */}
            <NavItem to="/reports" icon={PieChart} label={t("nav.reports")} />

            {/* Analytics Menu */}
            <div>
              <Tooltip text={t("nav.analytics")}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-all duration-200 mb-1.5 cursor-pointer relative",
                    isCollapsed ? "justify-center px-0 w-9 h-9 mx-auto" : "",
                    location.pathname.startsWith("/analytics")
                      ? "text-textPrimary bg-card-hover/40"
                      : "text-textSecondary hover:bg-card-hover/40 hover:text-textPrimary"
                  )}
                  onClick={() =>
                    handleNestedClick(
                      toggleAnalyticsExpanded,
                      setAnalyticsExpanded,
                    )
                  }
                >
                  <div
                    className={`flex items-center gap-3 flex-1 ${isCollapsed ? "justify-center" : "min-w-0"}`}
                  >
                    <BarChart3 size={16} className={cn("shrink-0 transition-colors", location.pathname.startsWith("/analytics") ? "text-textPrimary" : "text-textSecondary/70")} />
                    {!isCollapsed && (
                      <span className="truncate">{t("nav.analytics")}</span>
                    )}
                  </div>
                  {!isCollapsed && (
                    <ChevronRight
                      size={14}
                      className={cn(
                        "text-textSecondary/40 transition-transform duration-200",
                        analyticsExpanded && "rotate-90",
                        language === "ar" && !analyticsExpanded && "rotate-180"
                      )}
                    />
                  )}
                </div>
              </Tooltip>

              {!isCollapsed && analyticsExpanded && (
                <div
                  className={cn(
                    "space-y-1 mt-0.5 border-border/20",
                    language === "ar" ? "mr-4 pr-3 border-r" : "ml-4 pl-3 border-l",
                  )}
                >
                  <NavItem
                    to="/analytics/pre-sales"
                    icon={Activity}
                    label={t("nav.preSalesOverview")}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="h-px bg-border/30 my-6 mx-3" />

          {/* Sales Group */}
          <div className="mt-8">
            {!isCollapsed && (
              <div className="px-3 mb-2 flex items-center gap-2 text-[10px] font-bold text-textSecondary/50 uppercase tracking-[0.15em] truncate">
                {t("sidebar.sales")}
              </div>
            )}

            {/* Collapsible People Menu */}
            <div id="sidebar-people">
              <Tooltip text="People">
                <div
                  className={cn(
                    "flex items-center gap-3 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-all duration-200 mb-1.5 cursor-pointer relative",
                    isCollapsed ? "justify-center px-0 w-9 h-9 mx-auto" : "",
                    location.pathname.startsWith("/people")
                      ? "text-textPrimary bg-card-hover/40"
                      : "text-textSecondary hover:bg-card-hover/40 hover:text-textPrimary"
                  )}
                  onClick={() =>
                    handleNestedClick(togglePeopleExpanded, setPeopleExpanded)
                  }
                >
                  <div
                    className={`flex items-center gap-3 flex-1 ${isCollapsed ? "justify-center" : "min-w-0"}`}
                  >
                    <Users size={16} className={cn("shrink-0 transition-colors", location.pathname.startsWith("/people") ? "text-textPrimary" : "text-textSecondary/70")} />
                    {!isCollapsed && (
                      <span className="truncate">{t("nav.people")}</span>
                    )}
                  </div>
                  {!isCollapsed && (
                    <ChevronRight
                      size={14}
                      className={cn(
                        "text-textSecondary/40 transition-transform duration-200",
                        peopleExpanded && "rotate-90",
                        language === "ar" && !peopleExpanded && "rotate-180"
                      )}
                    />
                  )}
                </div>
              </Tooltip>

              {!isCollapsed && peopleExpanded && (
                <div
                  className={cn(
                    "space-y-1 mt-0.5 border-border/20",
                    language === "ar" ? "mr-4 pr-3 border-r" : "ml-4 pl-3 border-l",
                  )}
                >
                  <NavItem
                    to="/people/all"
                    icon={List}
                    label={t("nav.allPeople")}
                  />
                  <NavItem
                    to="/people/leads"
                    icon={Target}
                    label={t("nav.leads")}
                  />
                  <NavItem
                    to="/people/clients"
                    icon={User}
                    label={t("nav.clients")}
                  />
                </div>
              )}
            </div>

            <NavItem
              to="/companies"
              icon={Building2}
              label={t("nav.companies")}
            />
          </div>

          <div className="h-px bg-border/30 my-6 mx-3" />

          {/* Activities Group */}
          <div className="mt-8">
            {!isCollapsed && (
              <div className="px-3 mb-2 flex items-center gap-2 text-[10px] font-bold text-textSecondary/50 uppercase tracking-[0.15em] truncate">
                {t("activities.title")}
              </div>
            )}

            {/* Collapsible Tasks Menu */}
            <div>
              <Tooltip text={t("nav.tasks")}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-all duration-200 mb-1.5 cursor-pointer relative",
                    isCollapsed ? "justify-center px-0 w-9 h-9 mx-auto" : "",
                    isTasksActive
                      ? "text-textPrimary bg-card-hover/40"
                      : "text-textSecondary hover:bg-card-hover/40 hover:text-textPrimary"
                  )}
                  onClick={() =>
                    handleNestedClick(toggleTasksExpanded, setTasksExpanded)
                  }
                >
                  <div
                    className={`flex items-center gap-3 flex-1 ${isCollapsed ? "justify-center" : "min-w-0"}`}
                  >
                    <CheckSquare size={16} className={cn("shrink-0 transition-colors", isTasksActive ? "text-textPrimary" : "text-textSecondary/70")} />
                    {!isCollapsed && (
                      <span className="truncate">{t("nav.tasks")}</span>
                    )}
                  </div>
                  {!isCollapsed && (
                    <ChevronRight
                      size={14}
                      className={cn(
                        "text-textSecondary/40 transition-transform duration-200",
                        tasksExpanded && "rotate-90",
                        language === "ar" && !tasksExpanded && "rotate-180"
                      )}
                    />
                  )}
                </div>
              </Tooltip>

              {!isCollapsed && tasksExpanded && (
                <div
                  className={cn(
                    "space-y-1 mt-0.5 border-border/20",
                    language === "ar" ? "mr-4 pr-3 border-r" : "ml-4 pl-3 border-l",
                  )}
                >
                  <NavItem
                    to="/tasks/all"
                    icon={List}
                    label={t("nav.allTasks")}
                  />
                  <NavItem
                    to="/tasks/status"
                    icon={Kanban}
                    label={t("nav.byStatus")}
                  />
                  <NavItem
                    to="/tasks/assigned"
                    icon={User}
                    label={t("nav.assignedToMe")}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Onboarding & Trial */}
      <div id="sidebar-notifications">
        <Notifications
          isCollapsed={isCollapsed}
          Tooltip={Tooltip}
          onExpand={() => useStore.getState().setSidebarCollapsed(false)}
          t={t}
        />
        {/*
        <GettingStarted
          isCollapsed={isCollapsed}
          Tooltip={Tooltip}
          onExpand={() => useStore.getState().setSidebarCollapsed(false)}
          t={t}
        />
        */}
      </div>

      {/* Footer */}
      <div
        className={cn(
          "p-2 border-t border-border/40 space-y-1 pt-3 pb-3 transition-all duration-300",
          isCollapsed ? "px-0" : ""
        )}
      >
        {!user && <NavItem to="/signin" icon={LogIn} label={t("nav.signIn")} />}

        <div>
          <Tooltip text={t("nav.chatSupport")}>
            <a
              href="https://t.me/Omar_Gatara"
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "flex items-center gap-3 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-all duration-200 mb-1.5 relative",
                isCollapsed ? "justify-center px-0 w-9 h-9 mx-auto" : "",
                "text-textSecondary hover:bg-card-hover/40 hover:text-textPrimary",
              )}
            >
              <MessageSquare size={16} className="shrink-0 text-textSecondary/70" />
              {!isCollapsed && (
                <span className="truncate">{t("nav.chatSupport")}</span>
              )}
            </a>
          </Tooltip>
        </div>
      </div>

      <InviteMembersDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
      />
      <ShortcutsDialog
        open={shortcutsDialogOpen}
        onOpenChange={setShortcutsDialogOpen}
      />
    </div>
  );
};

export default Sidebar;
