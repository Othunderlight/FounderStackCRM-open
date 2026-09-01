import React, { useState, useMemo } from "react";
import { useStore } from "../../store";
import { cn } from "../../lib/utils";
import {
  Person,
  Company,
  Task,
  Opportunity,
  Note,
  ActivityLog,
} from "../../types";
import {
  User,
  Building2,
  Target,
  CheckSquare,
  FileText,
  Activity,
  ChevronRight,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  MessageCircle,
  Linkedin,
  Globe,
  Tag,
  Share2,
  CheckCircle2,
  Clock,
  Circle,
  Pencil,
  Users,
  Bot,
} from "lucide-react";

interface MobileDataTableProps {
  data: (Person | Company | Task | Opportunity | Note | ActivityLog)[];
  type: "person" | "company" | "task" | "opportunity" | "note" | "activity";
  title: string;
}

export const MobileDataTable: React.FC<MobileDataTableProps> = ({
  data,
  type,
  title,
}) => {
  const { 
    openDrawer, 
    loading, 
    addPerson, 
    addCompany, 
    addTask, 
    addOpportunity, 
    addNote,
    user 
  } = useStore();
  const [pageSize, setPageSize] = useState(10);
  const [taskFilter, setTaskFilter] = useState<"all" | "today" | "Todo" | "In Progress" | "Done">("all");

  const filteredTasks = useMemo(() => {
    if (type !== "task") return data;
    
    return data.filter((task: Task) => {
      if (taskFilter === "all") return true;
      if (taskFilter === "today") {
        if (!task.dueDate) return false;
        const today = new Date();
        const dueDate = new Date(task.dueDate);
        return dueDate.toDateString() === today.toDateString();
      }
      return task.status === taskFilter;
    });
  }, [data, taskFilter, type]);

  const paginatedData = useMemo(() => {
    const sourceData = type === "task" ? filteredTasks : data;
    return sourceData.slice(0, pageSize);
  }, [filteredTasks, pageSize, type]);

  const hasMore = (type === "task" ? filteredTasks : data).length > pageSize;

  const taskFilterChips = [
    { id: "all", label: "All" },
    { id: "today", label: "Today" },
    { id: "Todo", label: "Todo" },
    { id: "In Progress", label: "In Progress" },
    { id: "Done", label: "Done" },
  ];

  const loadMore = () => {
    setPageSize((prev) => prev + 10);
  };

  const handleCreate = async () => {
    const commonData = {
      id: Math.random().toString(),
      createdAt: new Date().toISOString(),
      createdBy: user?.username || "Me",
    };

    let newRecord: any;

    try {
      switch (type) {
        case "person":
          newRecord = await addPerson({
            ...commonData,
            name: "",
            email: "",
            jobTitle: "",
            companyId: "",
            companyName: "",
            phone: "",
            city: "",
            stage: "Lead",
            leadType: "Prospect",
          } as any);
          break;
        case "company":
          newRecord = await addCompany({
            ...commonData,
            name: "",
            domain: "",
            employees: "",
            location: "",
            arr: "",
            owner: user?.username || "Me",
          } as any);
          break;
        case "task":
          newRecord = await addTask({
            ...commonData,
            title: "",
            status: "Todo",
            dueDate: new Date().toISOString(),
          } as any);
          break;
        case "opportunity":
          newRecord = await addOpportunity({
            ...commonData,
            name: "",
            value: 0,
            companyName: "",
            contactName: "",
            stage: "Screening",
          } as any);
          break;
        case "note":
          newRecord = await addNote({
            ...commonData,
            title: "",
            content: "",
          } as any);
          break;
      }

      if (newRecord) {
        openDrawer({ id: newRecord.id, type: type as any });
      }
    } catch (error) {
      console.error("Failed to create record:", error);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    } catch (e) {
      return dateStr;
    }
  };

  const getIcon = () => {
    switch (type) {
      case "person":
        return <User size={18} />;
      case "company":
        return <Building2 size={18} />;
      case "opportunity":
        return <Target size={18} />;
      case "task":
        return <CheckSquare size={18} />;
      case "note":
        return <FileText size={18} />;
      case "activity":
        return <Activity size={18} />;
      default:
        return <User size={18} />;
    }
  };

  const renderPersonCard = (person: Person) => {
    const handleCardClick = () => {
      openDrawer({ id: person.id, type: "person" });
    };

    const handleWhatsApp = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (person.phone) {
        const cleanPhone = person.phone.replace(/\D/g, "");
        window.open(`https://wa.me/${cleanPhone}`, "_blank");
      }
    };

    const handleLinkedIn = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (person.linkedin) {
        const url = person.linkedin.startsWith("http")
          ? person.linkedin
          : `https://${person.linkedin}`;
        window.open(url, "_blank");
      }
    };

    return (
      <div
        key={person.id}
        onClick={handleCardClick}
        className="bg-[#1f1f1f] border border-border rounded-2xl p-4 mb-4 active:scale-[0.98] transition-all shadow-sm relative overflow-hidden group"
      >
        <div className="flex items-start justify-between">
          <div className="flex gap-4 items-start">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent shrink-0">
              <User size={24} />
            </div>
            <div className="flex flex-col min-w-0">
              <h4 className="font-bold text-textPrimary text-lg leading-tight truncate pr-4">
                {person.name || "Unnamed"}
              </h4>

              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                <span className="text-xs font-semibold text-accent uppercase tracking-wider">
                  {person.stage || "No Stage"}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-textSecondary font-medium">
                <div className="flex items-center gap-1">
                  <Tag size={10} className="text-textSecondary/60" />
                  <span>{person.leadType || "Type Unknown"}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Share2 size={10} className="text-textSecondary/60" />
                  <span>{person.leadSource || "Direct"}</span>
                </div>
              </div>
            </div>
          </div>
          <ChevronRight
            size={20}
            className="text-textSecondary/30 mt-1 shrink-0 group-active:translate-x-1 transition-transform"
          />
        </div>

        <div className="mt-4 pt-4 border-t border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-[#2a2a2a] flex items-center justify-center text-textSecondary shrink-0 border border-border/30">
              <Building2 size={14} />
            </div>
            <span className="text-xs text-textSecondary truncate font-medium">
              {person.companyName || "Independent"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {person.phone && (
              <button
                onClick={handleWhatsApp}
                className="w-9 h-9 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center active:scale-90 transition-transform border border-green-500/20"
              >
                <MessageCircle
                  size={18}
                  fill="currentColor"
                  fillOpacity={0.1}
                />
              </button>
            )}
            {person.linkedin && (
              <button
                onClick={handleLinkedIn}
                className="w-9 h-9 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center active:scale-90 transition-transform border border-blue-500/20"
              >
                <Linkedin size={18} fill="currentColor" fillOpacity={0.1} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderCompanyCard = (company: Company) => {
    const handleCardClick = () => {
      openDrawer({ id: company.id, type: "company" });
    };

    const handleWebsite = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (company.domain) {
        const url = company.domain.startsWith("http")
          ? company.domain
          : `https://${company.domain}`;
        window.open(url, "_blank");
      }
    };

    const handleLinkedIn = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (company.linkedin) {
        const url = company.linkedin.startsWith("http")
          ? company.linkedin
          : `https://${company.linkedin}`;
        window.open(url, "_blank");
      }
    };

    return (
      <div
        key={company.id}
        onClick={handleCardClick}
        className="bg-[#1f1f1f] border border-border rounded-2xl p-4 mb-4 active:scale-[0.98] transition-all shadow-sm relative overflow-hidden group"
      >
        <div className="flex items-start justify-between">
          <div className="flex gap-4 items-start">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
              <Building2 size={24} />
            </div>
            <div className="flex flex-col min-w-0">
              <h4 className="font-bold text-textPrimary text-lg leading-tight truncate pr-4">
                {company.name || "Unnamed"}
              </h4>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-textSecondary font-medium">
                {company.location && (
                  <div className="flex items-center gap-1">
                    <Globe size={10} className="text-textSecondary/60" />
                    <span>{company.location}</span>
                  </div>
                )}
                {company.arr && (
                  <div className="flex items-center gap-1">
                    <DollarSign size={10} className="text-green-500/60" />
                    <span>${company.arr}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <ChevronRight
            size={20}
            className="text-textSecondary/30 mt-1 shrink-0 group-active:translate-x-1 transition-transform"
          />
        </div>

        <div className="mt-4 pt-4 border-t border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {company.employees && (
              <div className="flex items-center gap-1.5">
                <Users size={12} className="text-textSecondary/60" />
                <span className="text-xs text-textSecondary font-medium">
                  {company.employees} employees
                </span>
              </div>
            )}
            {company.icp !== undefined && (
              <div className="flex items-center gap-1.5">
                <Target
                  size={12}
                  className={
                    company.icp ? "text-green-500" : "text-textSecondary/40"
                  }
                />
                <span
                  className={`text-xs font-bold ${company.icp ? "text-green-500" : "text-textSecondary/40"}`}
                >
                  {company.icp ? "ICP Match" : "Not ICP"}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {company.domain && (
              <button
                onClick={handleWebsite}
                className="w-9 h-9 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center active:scale-90 transition-transform border border-orange-500/20"
              >
                <Globe size={18} fill="currentColor" fillOpacity={0.1} />
              </button>
            )}
            {company.linkedin && (
              <button
                onClick={handleLinkedIn}
                className="w-9 h-9 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center active:scale-90 transition-transform border border-blue-500/20"
              >
                <Linkedin size={18} fill="currentColor" fillOpacity={0.1} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderTaskCard = (task: Task) => {
    const handleCardClick = () => {
      openDrawer({ id: task.id, type: "task" });
    };

    const getStatusStyles = (status: string) => {
      switch (status) {
        case "Done":
          return {
            icon: <CheckCircle2 size={20} className="text-green-500" />,
            text: "text-green-500/80",
          };
        case "In Progress":
          return {
            icon: <Clock size={20} className="text-amber-500" />,
            text: "text-amber-500/80",
          };
        case "Todo":
        default:
          return {
            icon: <Circle size={20} className="text-blue-500" />,
            text: "text-blue-500/80",
          };
      }
    };

    const styles = getStatusStyles(task.status);

    return (
      <div
        key={task.id}
        onClick={handleCardClick}
        className="bg-[#1f1f1f] border border-border rounded-2xl p-4 mb-4 active:scale-[0.98] transition-all relative overflow-hidden group"
      >
        <div className="flex items-start justify-between">
          <div className="flex gap-4 items-start">
            <div className="w-10 h-10 rounded-xl bg-[#2a2a2a] flex items-center justify-center shrink-0 border border-border/30">
              {styles.icon}
            </div>
            <div className="flex flex-col min-w-0">
              <h4 className="font-bold text-textPrimary text-base leading-snug truncate pr-2">
                {task.title || "Untitled Task"}
              </h4>
              <p
                className={cn(
                  "text-[10px] uppercase font-black tracking-widest mt-1",
                  styles.text,
                )}
              >
                {task.status}
              </p>
            </div>
          </div>
          <ChevronRight
            size={18}
            className="text-textSecondary/30 shrink-0 mt-1"
          />
        </div>

        <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            {task.personName ? (
              <>
                <User size={12} className="text-textSecondary/60 shrink-0" />
                <span className="text-[11px] text-textSecondary font-medium truncate">
                  {task.personName}
                </span>
              </>
            ) : task.companyName ? (
              <>
                <Building2
                  size={12}
                  className="text-textSecondary/60 shrink-0"
                />
                <span className="text-[11px] text-textSecondary font-medium truncate">
                  {task.companyName}
                </span>
              </>
            ) : (
              <div className="w-1 h-1" />
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0 bg-[#2a2a2a] px-2 py-1 rounded-md border border-border/50">
            <Calendar size={10} className="text-accent" />
            <span className="text-[10px] font-bold text-textPrimary uppercase">
              {formatDate(task.dueDate)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderGenericCard = (item: any) => {
    const handleClick = () => {
      openDrawer({ id: item.id, type: type as any });
    };

    return (
      <div
        key={item.id}
        onClick={handleClick}
        className="bg-[#1f1f1f] border border-border rounded-2xl p-4 mb-4 active:scale-[0.98] transition-all relative overflow-hidden group"
      >
        <div className="flex items-start justify-between">
          <div className="flex gap-4 items-center">
            <div className="w-10 h-10 rounded-xl bg-[#2a2a2a] flex items-center justify-center text-textSecondary shrink-0 border border-border/30">
              {getIcon()}
            </div>
            <div className="flex flex-col min-w-0">
              <h4 className="font-bold text-textPrimary text-base truncate">
                {item.name || item.title || item.subject || "Untitled"}
              </h4>
              <p className="text-[11px] text-textSecondary uppercase font-bold tracking-widest mt-0.5">
                {item.stage || item.status || type}
              </p>
            </div>
          </div>
          <ChevronRight size={18} className="text-textSecondary/30 shrink-0" />
        </div>

        {/* Simple details footer for generic cards */}
        {(item.companyName || item.value || item.dueDate) && (
          <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0 overflow-hidden">
              {item.companyName && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <Building2 size={12} className="text-textSecondary/60" />
                  <span className="text-[11px] text-textSecondary truncate">
                    {item.companyName}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {item.value && (
                <div className="flex items-center gap-1.5">
                  <DollarSign size={12} className="text-green-500/60" />
                  <span className="text-[11px] font-bold text-green-500">
                    ${item.value}
                  </span>
                </div>
              )}
              {item.dueDate && (
                <div className="flex items-center gap-1.5">
                  <Calendar size={12} className="text-textSecondary/60" />
                  <span className="text-[11px] text-textSecondary font-bold">
                    {formatDate(item.dueDate)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-background">
      <div className="flex items-center justify-between px-6 py-4 sticky top-0 bg-background/80 backdrop-blur-md z-10 border-b border-border/50">
        <h2 className="text-xl font-black text-textPrimary tracking-tight">
          {title}
        </h2>
        <div className="flex items-center gap-2 text-[10px] font-bold text-textSecondary bg-[#1f1f1f] px-2.5 py-1 rounded-full border border-border">
          {(type === "task" ? filteredTasks : data).length} <span className="opacity-50">ITEMS</span>
        </div>
      </div>

      {type === "task" && (
        <div className="px-4 pt-3 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
          {taskFilterChips.map((chip) => (
            <button
              key={chip.id}
              onClick={() => setTaskFilter(chip.id as any)}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap border",
                taskFilter === chip.id
                  ? "bg-accent text-white border-accent shadow-[0_0_12px_rgba(35,131,226,0.4)]"
                  : "bg-[#1f1f1f] text-textSecondary border-border hover:border-accent/50 hover:text-accent"
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4 no-scrollbar pb-32">
        {loading[type] ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-3 border-accent border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(35,131,226,0.3)]"></div>
            <p className="text-xs font-bold text-textSecondary tracking-widest uppercase animate-pulse">
              Synchronizing Data...
            </p>
          </div>
        ) : (
          <>
            {paginatedData.length > 0 ? (
              paginatedData.map((item) => {
                if (type === "person") return renderPersonCard(item as Person);
                if (type === "company")
                  return renderCompanyCard(item as Company);
                if (type === "task") return renderTaskCard(item as Task);
                return renderGenericCard(item);
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                <div className="w-20 h-20 bg-[#1f1f1f] rounded-3xl flex items-center justify-center mb-6 text-textSecondary border border-border/50">
                  {getIcon()}
                </div>
                <h3 className="text-lg font-bold text-textPrimary">
                  No {type}s found
                </h3>
                <p className="text-xs text-textSecondary mt-2 px-10 leading-relaxed font-medium">
                  We couldn't find any records matching this view.
                </p>
              </div>
            )}

            {hasMore && (
              <div className="flex justify-center mt-4 mb-10">
                <button
                  onClick={loadMore}
                  className="px-8 py-3 bg-[#1f1f1f] hover:bg-[#2a2a2a] active:scale-95 text-textPrimary rounded-full text-xs font-black tracking-widest transition-all border border-border shadow-lg uppercase"
                >
                  Load More Results
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating Action Button - Agent */}
      <a
        href="https://t.me/founderstackbot"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-24 right-6 w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 text-white rounded-[22px] flex items-center justify-center shadow-2xl active:scale-90 transition-all z-50 group hover:brightness-110"
        aria-label="Open AI Agent"
      >
        <Bot
          size={28}
          className="group-active:rotate-12 transition-transform"
        />
      </a>
    </div>
  );
};
