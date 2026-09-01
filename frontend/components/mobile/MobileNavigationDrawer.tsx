import React, { useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Building2,
  PieChart,
  Settings,
  HelpCircle,
  LogOut,
  MessageSquare,
  X,
  Target,
  List,
  ChevronRight,
  Sparkles,
  Bot,
} from "lucide-react";
import { useStore } from "../../store";
import { cn } from "../../lib/utils";

export const MobileNavigationDrawer: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useStore();
  const isMobileDrawerOpen = (useStore as any)(
    (state: any) => state.isMobileDrawerOpen,
  );
  const closeMobileDrawer = (useStore as any).getState().closeMobileDrawer;

  // Close drawer on location change
  useEffect(() => {
    closeMobileDrawer?.();
  }, [location.pathname, closeMobileDrawer]);

  if (!isMobileDrawerOpen) return null;

  const mainLinks = [
    { to: "/companies", icon: Building2, label: "Companies" },
    // { to: "/reports", icon: PieChart, label: "Reports" },
    // { to: '/ai-agent', icon: Bot, label: 'AI Agent' },
  ];

  const secondaryLinks = [
    { to: "/settings", icon: Settings, label: "Settings" },
    {
      to: "https://t.me/Omar_Gatara",
      icon: MessageSquare,
      label: "Chat Support",
      external: true,
    },
  ];

  return (
    <div className="fixed inset-0 z-[100] md:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={() => closeMobileDrawer?.()}
      />

      {/* Drawer */}
      <aside className="absolute top-0 left-0 bottom-0 w-[280px] bg-sidebar border-r border-border flex flex-col animate-in slide-in-from-left duration-300 ease-out">
        <div className="p-4 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-2">
            <span className="font-bold">
              Welcome,{" "}
              {user?.first_name ||
                user?.name?.split(" ")[0] ||
                user?.username ||
                "there"}
            </span>
          </div>
          <button
            onClick={() => closeMobileDrawer?.()}
            className="p-2 hover:bg-[#2f2f2f] rounded-full text-textSecondary"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <div className="mb-6">
            <h3 className="px-3 text-[10px] font-bold text-textSecondary uppercase tracking-widest mb-2">
              Navigation
            </h3>
            <div className="space-y-1">
              {mainLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                      isActive
                        ? "bg-accent/15 text-accent font-medium"
                        : "text-textSecondary hover:bg-[#2f2f2f]",
                    )
                  }
                >
                  <link.icon size={18} />
                  <span className="flex-1">{link.label}</span>
                </NavLink>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="px-3 text-[10px] font-bold text-textSecondary uppercase tracking-widest mb-2">
              Account & Support
            </h3>
            <div className="space-y-1">
              {secondaryLinks.map((link) =>
                link.external ? (
                  <a
                    key={link.to}
                    href={link.to}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-textSecondary hover:bg-[#2f2f2f] transition-colors"
                  >
                    <link.icon size={18} />
                    <span className="flex-1">{link.label}</span>
                  </a>
                ) : (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                        isActive
                          ? "bg-accent/15 text-accent font-medium"
                          : "text-textSecondary hover:bg-[#2f2f2f]",
                      )
                    }
                  >
                    <link.icon size={18} />
                    <span className="flex-1">{link.label}</span>
                  </NavLink>
                ),
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-[#2a2a2a]/30 border border-border/50 mb-3">
            <div className="w-10 h-10 bg-[#2f2f2f] rounded-lg flex items-center justify-center text-xs font-bold border border-border">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-textPrimary truncate">
                {user?.username}
              </p>
              <p className="text-[11px] text-textSecondary truncate">
                {user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-400/10 transition-colors border border-red-400/20"
          >
            <LogOut size={16} />
            <span>Log out</span>
          </button>
        </div>
      </aside>
    </div>
  );
};
