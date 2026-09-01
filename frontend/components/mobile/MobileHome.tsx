import React, { useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../../store";
import {
  CheckSquare,
  Upload,
  User,
  Plus,
  ArrowRight,
  Target,
  Building2,
} from "lucide-react";

const MobileHome: React.FC = () => {
  const navigate = useNavigate();
  const { user, myAccess, fetchMyAccess } = useStore();

  // RBAC Permissions
  const canReadTasks = useMemo(() => 
    myAccess?.permissions?.includes('*') || myAccess?.permissions?.includes('tasks.read'), 
  [myAccess]);

  const canWritePeople = useMemo(() => 
    myAccess?.permissions?.includes('*') || myAccess?.permissions?.includes('people.write'), 
  [myAccess]);

  // Fetch permissions if they haven't been loaded yet
  useEffect(() => {
    if (!myAccess) {
      fetchMyAccess();
    }
  }, [myAccess, fetchMyAccess]);

  const greeting = user?.first_name || user?.name?.split(" ")[0] || "there";

  const allQuickActions = [
    {
      id: "tasks",
      title: "Today's Tasks",
      description: "View and complete your tasks",
      icon: CheckSquare,
      color: "bg-blue-500/10 text-blue-500",
      onClick: () =>
        navigate("/tasks/all", {
          state: {
            initialFilterRules: [
              {
                id: "status-filter",
                field: "status",
                operator: "is",
                value: "Todo",
              },
            ],
            initialSortRules: [
              { id: "due-date-sort", field: "dueDate", direction: "asc" },
            ],
          },
        }),
    },
    {
      id: "create-person",
      title: "View all People",
      description: "Create a new contact",
      icon: User,
      color: "bg-accent/10 text-accent",
      onClick: () =>
        navigate("/people/all", { state: { highlightNewRecord: true } }),
    },
    {
      id: "create-company",
      title: "View Companies",
      description: "Create a new company",
      icon: Building2,
      color: "bg-orange-500/10 text-orange-500",
      onClick: () =>
        navigate("/companies/all", { state: { highlightNewRecord: true } }),
    },
  ];

  const quickActions = useMemo(() => {
    return allQuickActions.filter(action => {
      if (action.id === 'tasks') return canReadTasks;
      if (action.id === 'create-person' || action.id === 'create-company') return canWritePeople;
      return true;
    });
  }, [canReadTasks, canWritePeople]);

  return (
    <div className="flex flex-col min-h-full bg-background">
      {/* Header */}
      <header className="px-4 pt-6 pb-4 mb-16 mt-6">
        <h1 className="text-2xl font-bold text-textPrimary flex items-center gap-2">
          Hey {greeting} 👋
        </h1>
        <p className="text-sm text-textSecondary mt-1">
          What would you like to do today?
        </p>
      </header>

      {/* Quick Actions Grid */}
      <div className="px-4">
        <div className="grid grid-cols-1 gap-4">
          {quickActions.map((action) => (
            <button
              key={action.id}
              onClick={action.onClick}
              className="flex items-center p-4 bg-[#1c1c1c] border border-border rounded-xl hover:border-textSecondary/50 active:bg-[#252525] transition-all duration-150"
            >
              <div
                className={`w-10 h-10 rounded-lg ${action.color} flex items-center justify-center mr-3`}
              >
                <action.icon size={20} />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-sm font-semibold text-textPrimary">
                  {action.title}
                </span>
                <span className="text-xs text-textSecondary mt-0.5">
                  {action.description}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Spacer for Navigation Bar */}
      <div className="h-24" />
    </div>
  );
};

export default MobileHome;
