import React, { useState, useEffect, useMemo } from "react";
import { useStore } from "../store";
import { useNavigate } from "react-router-dom";
import { Mail, Plus, ArrowRight, ArrowLeft, User, CheckSquare, Upload, Bot, MessageCircle } from "lucide-react";
import { cn } from "../lib/utils";
import { homeTheme } from "../lib/theme";
import MobileHome from "./mobile/MobileHome";
import { useTranslation } from "../src/i18n";
import { hasCredential } from "../lib/api";
import { ConnectTelegramModal } from "./ConnectTelegramModal";

const ActionCard = ({
    title,
    description,
    headerContent,
    className,
    onClick,
}: {
    title: string;
    description: string;
    headerContent: React.ReactNode;
    className?: string;
    onClick?: () => void;
}) => {
    return (
        <div
            className={cn("flex flex-col gap-3 w-full max-w-[340px]", className)}
            onClick={onClick}
        >
            <div
                className={cn("h-[180px] w-full flex items-center justify-center p-6 rounded-2xl", homeTheme.card, "border", homeTheme.border.subtle, "group", homeTheme.border.hover, "transition-all duration-300 ease-out cursor-pointer overflow-hidden shadow-sm")}
            >
                <div className="w-full h-full transform transition-transform duration-500 group-hover:scale-[1.01]">
                    {headerContent}
                </div>
            </div>
            <div className="flex flex-col gap-0.5 px-0.5 pointer-events-none">
                <h3 className="text-[15px] font-semibold text-foreground tracking-tight">
                    {title}
                </h3>
                <p className="text-[13px] text-muted-foreground leading-normal font-medium opacity-80">
                    {description}
                </p>
            </div>
        </div>
    );
};

const MockupContainer = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div className={cn(homeTheme.mockup, "rounded-xl shadow-xl p-4 w-full h-full flex flex-col gap-2.5 border", homeTheme.border.medium, "relative overflow-hidden", className)}>
        {children}
    </div>
);

const Home = () => {
    const { user, setTasksExpanded, setPeopleExpanded, setSidebarCollapsed, language, myAccess, fetchMyAccess } = useStore();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const isRTL = language === "ar";

    // RBAC Permissions
    const canReadTasks = useMemo(() => 
        myAccess?.permissions?.includes('*') || myAccess?.permissions?.includes('tasks.read'), 
    [myAccess]);

    const canWritePeople = useMemo(() => 
        myAccess?.permissions?.includes('*') || myAccess?.permissions?.includes('people.write'), 
    [myAccess]);

    const canReadPeople = useMemo(() => 
        myAccess?.permissions?.includes('*') || myAccess?.permissions?.includes('people.read'), 
    [myAccess]);

    const canUseAgent = useMemo(() => 
        myAccess?.permissions?.includes('*') || myAccess?.permissions?.includes('agent.use'), 
    [myAccess]);

    // Fetch permissions if they haven't been loaded yet
    useEffect(() => {
        if (!myAccess) {
            fetchMyAccess();
        }
    }, [myAccess, fetchMyAccess]);

    const [isAgentConnected, setIsAgentConnected] = useState<boolean | null>(null);
    const [isAgentLoading, setIsAgentLoading] = useState(true);
    const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);

    const greeting = user?.first_name ? `${t("home.greeting")} ${user.first_name}` : t("home.greeting");

    const handleViewPeopleClick = () => {
        setSidebarCollapsed(false);
        setPeopleExpanded(true);
        navigate("/people/all");
    };

    const handleTaskClick = () => {
        setSidebarCollapsed(false);
        setTasksExpanded(true);
        navigate("/tasks/all", {
            state: {
                initialFilterRules: [
                    { id: "status-filter", field: "status", operator: "is", value: "Todo" }
                ],
                initialSortRules: [
                    { id: "due-date-sort", field: "dueDate", direction: "asc" }
                ]
            }
        });
    };

    const handleImportClick = () => {
        setSidebarCollapsed(false);
        setPeopleExpanded(true);
        navigate("/people/all", {
            state: { openImport: true }
        });
    };

    const handleCreateClick = () => {
        setSidebarCollapsed(false);
        setPeopleExpanded(true);
        navigate("/people/all", {
            state: { highlightNewRecord: true }
        });
    };

    useEffect(() => {
        if (canUseAgent) {
            checkAgentConnection();
        } else {
            setIsAgentLoading(false);
        }
    }, [canUseAgent]);

    const checkAgentConnection = async () => {
        setIsAgentLoading(true);
        try {
            const response = await hasCredential();
            if (response.ok) {
                const data = await response.json();
                setIsAgentConnected(data.has_credential);
            } else {
                setIsAgentConnected(false);
            }
        } catch (error) {
            console.error("Failed to check agent connection:", error);
            setIsAgentConnected(false);
        } finally {
            setIsAgentLoading(false);
        }
    };

    const handleAgentSetup = () => {
        setIsSetupModalOpen(true);
    };

    const handleAgentSetupComplete = () => {
        setIsAgentConnected(true);
    };

    const handleAgentChat = () => {
        window.open("https://t.me/founderstackbot", "_blank");
    };

    return (
        <>
            {/* Mobile Home */}
            <div className="md:hidden h-full">
                <MobileHome />
            </div>

            {/* Desktop Home */}
            <div className="hidden md:flex h-full w-full flex-col items-center justify-center p-8 overflow-y-auto bg-background selection:bg-accent/30">
                <div className="max-w-[760px] w-full flex flex-col items-start animate-in fade-in zoom-in-95 duration-1000">
                {/* Header Section */}
                <div className="w-full mb-12">
                    <h1 className="text-[28px] font-bold mb-2 text-foreground flex items-center gap-2.5 tracking-tight">
                        {greeting} <span className="animate-wave origin-[70%_70%] inline-block">👋</span> {t("home.startWorking")}
                    </h1>
                    <p className="text-muted-foreground text-[14px] font-medium leading-relaxed max-w-lg">
                        {t("home.dailyUpdates")}
                    </p>
                </div>

                {/* Card Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-12 w-full">
                    {/* Card 1: View Tasks */}
                    {canReadTasks && (
                        <ActionCard
                            title={t("home.viewTasks")}
                            description={t("home.viewTasksDesc")}
                            onClick={handleTaskClick}
                            headerContent={
                                <div className="w-full h-full p-2">
                                    <MockupContainer className="justify-center items-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center text-accent border border-accent/10">
                                                    <CheckSquare size={20} />
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <span className={cn("text-xs font-semibold", homeTheme.text)}>{t("home.todaysTasks")}</span>
                                                    <div className={cn("h-1 w-16 rounded-full", homeTheme.bg.subtle)}></div>
                                                </div>
                                            </div>
                                            <div className="mt-1 bg-white text-black h-7 px-3 rounded-lg text-[10px] font-bold flex items-center gap-1.5 hover:bg-gray-200 transition-colors shadow-md">
                                                {t("home.view")} {isRTL ? <ArrowLeft size={12} /> : <ArrowRight size={12} />}
                                            </div>
                                        </div>
                                    </MockupContainer>
                                </div>
                            }
                        />
                    )}

                    {/* Card 2 & 3 replacement if no write permission but has read permission */}
                    {!canWritePeople && canReadPeople && (
                        <ActionCard
                            title={t("nav.allPeople")}
                            description={t("home.createEntityDesc").replace("Start with adding and setup", "View and manage")}
                            onClick={handleViewPeopleClick}
                            headerContent={
                                <div className="w-full h-full p-2">
                                    <MockupContainer className="justify-center items-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center text-accent border border-accent/10">
                                                    <User size={20} />
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <span className={cn("text-xs font-semibold", homeTheme.text)}>{t("nav.people")}</span>
                                                    <div className={cn("h-1 w-16 rounded-full", homeTheme.bg.subtle)}></div>
                                                </div>
                                            </div>
                                            <div className="mt-1 bg-white text-black h-7 px-3 rounded-lg text-[10px] font-bold flex items-center gap-1.5 hover:bg-gray-200 transition-colors shadow-md">
                                                {t("home.view")} {isRTL ? <ArrowLeft size={12} /> : <ArrowRight size={12} />}
                                            </div>
                                        </div>
                                    </MockupContainer>
                                </div>
                            }
                        />
                    )}

                    {/* Card 2: Import Data */}
                    {canWritePeople && (
                        <ActionCard
                            title={t("home.importData")}
                            description={t("home.importDataDesc")}
                            onClick={handleImportClick}
                            headerContent={
                                <div className="w-full h-full p-2">
                                    <MockupContainer className="p-4">
                                        <div className={cn("flex items-center justify-between mb-3 pb-2.5 border-b", homeTheme.border.subtle)}>
                                            <div className="flex items-center gap-2">
                                                <div className={cn("w-4 h-4 rounded flex items-center justify-center", homeTheme.bg.subtle)}>
                                                    <Upload size={10} className={homeTheme.text} />
                                                </div>
                                                <div className={cn("h-1.5 w-16 rounded-full", homeTheme.bg.subtle)}></div>
                                            </div>
                                            <div className={cn("h-5 w-5 rounded-full border", homeTheme.bg.subtle, homeTheme.border.medium)}></div>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2.5">
                                                <div className={cn("h-2 w-12 rounded-full", homeTheme.bg.subtle)}></div>
                                                <div className={cn("h-1 flex-1 rounded-full", homeTheme.bg.verySubtle)}></div>
                                            </div>
                                            <div className="flex items-center gap-2.5">
                                                <div className={cn("h-2 w-10 rounded-full", homeTheme.bg.subtle)}></div>
                                                <div className={cn("h-1 flex-1 rounded-full", homeTheme.bg.verySubtle)}></div>
                                            </div>
                                        </div>
                                    </MockupContainer>
                                </div>
                            }
                        />
                    )}

                    {/* Card 3: Create Entity */}
                    {canWritePeople && (
                        <ActionCard
                            title={t("home.createEntity")}
                            description={t("home.createEntityDesc")}
                            onClick={handleCreateClick}
                            headerContent={
                                <div className="w-full h-full p-2">
                                    <MockupContainer className="p-4">
                                        <div className={cn("flex items-center gap-3 mb-4 pb-3 border-b", homeTheme.border.subtle)}>
                                            <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center text-accent border border-accent/10">
                                                <User size={16} />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <div className={cn("h-1.5 w-24 rounded-full", homeTheme.bg.medium)}></div>
                                                <div className={cn("h-1 w-14 rounded-full", homeTheme.bg.subtle)}></div>
                                            </div>
                                        </div>
                                        <div className="space-y-2.5">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className={cn("h-1.5 rounded-full w-full", homeTheme.bg.subtle)}></div>
                                                <div className={cn("h-1.5 rounded-full w-[70%]", homeTheme.bg.medium)}></div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className={cn("h-1.5 rounded-full w-[80%]", homeTheme.bg.subtle)}></div>
                                                <div className={cn("h-1.5 rounded-full w-full", homeTheme.bg.medium)}></div>
                                            </div>
                                        </div>
                                    </MockupContainer>
                                </div>
                            }
                        />
                    )}

                    {/* Card 4: Connect Agent / Chat with Agent */}
                    {canUseAgent && (
                        <ActionCard
                            title={isAgentConnected ? t("home.chatWithAgent") : t("home.connectAgent")}
                            description={isAgentConnected ? t("home.chatWithAgentDesc") : t("home.connectAgentDesc")}
                            onClick={isAgentConnected ? handleAgentChat : handleAgentSetup}
                            headerContent={
                                <div className="w-full h-full p-2">
                                    {isAgentConnected ? (
                                        <MockupContainer className="justify-center items-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center text-accent border border-accent/10">
                                                        <Bot size={20} />
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <span className={cn("text-xs font-semibold", homeTheme.text)}>{t("home.chatWithAgent")}</span>
                                                        <div className={cn("h-1 w-16 rounded-full", homeTheme.bg.subtle)}></div>
                                                    </div>
                                                </div>
                                                <div className="space-y-1 w-full max-w-36">
                                                    <div className="flex justify-start">
                                                        <div className="bg-accent/10 rounded-lg px-2 py-1 max-w-28">
                                                            <p className="text-[10px] text-accent">How can I help?</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-end">
                                                        <div className="bg-accent rounded-lg px-2 py-1 max-w-28">
                                                            <p className="text-[10px] text-white">Show me today's tasks</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </MockupContainer>
                                    ) : (
                                        <MockupContainer className="justify-center items-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center text-accent border border-accent/10">
                                                        <Bot size={20} />
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <span className={cn("text-xs font-semibold", homeTheme.text)}>{t("home.connectAgent")}</span>
                                                        <div className={cn("h-1 w-16 rounded-full", homeTheme.bg.subtle)}></div>
                                                    </div>
                                                </div>
                                                <div className="mt-1 bg-accent text-white h-7 px-3 rounded-lg text-[10px] font-bold flex items-center gap-1.5 hover:bg-accent/90 transition-colors shadow-md">
                                                    {t("home.connectAgent")}
                                                    {isRTL ? <ArrowLeft size={12} /> : <ArrowRight size={12} />}
                                                </div>
                                            </div>
                                        </MockupContainer>
                                    )}
                                </div>
                            }
                        />
                    )}
                </div>
            </div>

            <style>{`
        @keyframes wave {
          0% { transform: rotate(0deg); }
          10% { transform: rotate(14deg); }
          20% { transform: rotate(-8deg); }
          30% { transform: rotate(14deg); }
          40% { transform: rotate(-4deg); }
          50% { transform: rotate(10deg); }
          60% { transform: rotate(0deg); }
          100% { transform: rotate(0deg); }
        }
        .animate-wave {
          animation: wave 2.5s infinite;
          transform-origin: 70% 70%;
        }
        ::-webkit-scrollbar {
          width: 0px;
          background: transparent;
        }
      `}</style>
            </div>

            <ConnectTelegramModal
                isOpen={isSetupModalOpen}
                onOpenChange={setIsSetupModalOpen}
                onSuccess={handleAgentSetupComplete}
            />
        </>
    );
};

export default Home;
