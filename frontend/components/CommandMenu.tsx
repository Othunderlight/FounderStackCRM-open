import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Users,
  Building2,
  CheckSquare,
  FileText,
  Settings,
  HelpCircle,
  X,
  ChevronRight,
  ChevronLeft,
  PieChart,
  Command,
  LogOut,
  User,
  Target,
  GitBranch,
  History,
  Bot,
  Home,
  LayoutDashboard,
  Loader2,
  Activity,
  MessageSquare,
} from "lucide-react";
import { useStore } from "../store";
import { globalSearch } from "../lib/api";
import { useTranslation } from "../src/i18n";

interface SearchResult {
  type: "person" | "company" | "task" | "note";
  id: string;
  label: string;
  sub_label: string;
  path: string;
}

const CommandMenu = () => {
  const navigate = useNavigate();
  const { isCommandMenuOpen, closeCommandMenu, openDrawer, language } = useStore();
  const { t } = useTranslation();
  const isRTL = language === "ar";

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keyboard shortcut to focus/open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        useStore.getState().toggleCommandMenu();
      }
      if (e.key === "Escape") {
        closeCommandMenu();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeCommandMenu]);

  // Reset query and focus on open
  useEffect(() => {
    if (isCommandMenuOpen) {
      setQuery("");
      setSearchResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isCommandMenuOpen]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Debounced backend search
  const performSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    try {
      const data = await globalSearch(q);
      setSearchResults(data.results || []);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!isCommandMenuOpen) return;

    debounceRef.current = setTimeout(() => {
      performSearch(query);
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, isCommandMenuOpen, performSearch]);

  // Scroll selected item into view
  useEffect(() => {
    if (isCommandMenuOpen) {
      const selectedElement = listRef.current?.querySelector(
        '[data-selected="true"]',
      );
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: "nearest",
          behavior: "auto",
        });
      }
    }
  }, [selectedIndex, isCommandMenuOpen]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeCommandMenu();
      }
    };
    if (isCommandMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isCommandMenuOpen, closeCommandMenu]);

  if (!isCommandMenuOpen) return null;

  const navigationItems = [
    {
      id: "nav-home",
      label: t("commandMenu.home"),
      icon: Home,
      path: "/",
      category: t("commandMenu.general"),
      type: "nav" as const,
    },
    {
      id: "nav-people",
      label: t("commandMenu.allPeople"),
      icon: Users,
      path: "/people/all",
      shortcut: "⇧P",
      category: t("commandMenu.general"),
      type: "nav" as const,
    },
    {
      id: "nav-leads",
      label: t("commandMenu.leads"),
      icon: Target,
      path: "/people/leads",
      category: t("commandMenu.general"),
      type: "nav" as const,
    },
    {
      id: "nav-clients",
      label: t("commandMenu.clients"),
      icon: User,
      path: "/people/clients",
      category: t("commandMenu.general"),
      type: "nav" as const,
    },
    {
      id: "nav-logs",
      label: t("commandMenu.allLogs"),
      icon: History,
      path: "/people/logs",
      shortcut: "⇧L",
      category: t("commandMenu.general"),
      type: "nav" as const,
    },
    {
      id: "nav-companies",
      label: t("commandMenu.companies"),
      icon: Building2,
      path: "/companies",
      shortcut: "⇧C",
      category: t("commandMenu.general"),
      type: "nav" as const,
    },
    {
      id: "nav-tasks",
      label: t("commandMenu.tasks"),
      icon: CheckSquare,
      path: "/tasks/all",
      shortcut: "⇧T",
      category: t("commandMenu.general"),
      type: "nav" as const,
    },
    {
      id: "nav-notes",
      label: t("commandMenu.notes"),
      icon: FileText,
      path: "/notes",
      category: t("commandMenu.general"),
      type: "nav" as const,
    },
    {
      id: "nav-reports",
      label: t("commandMenu.reports"),
      icon: PieChart,
      path: "/reports",
      category: t("commandMenu.general"),
      type: "nav" as const,
    },
    {
      id: "nav-support",
      label: t("commandMenu.support"),
      icon: HelpCircle,
      path: "#",
      category: t("commandMenu.settings"),
      type: "nav" as const,
    },
    {
      id: "nav-logout",
      label: t("commandMenu.logOut"),
      icon: LogOut,
      path: "#",
      category: t("commandMenu.settings"),
      type: "nav" as const,
    },
  ];

  const iconMap: Record<string, any> = {
    person: User,
    company: Building2,
    task: CheckSquare,
    note: FileText,
    activity: Activity,
    interaction: MessageSquare,
  };

  const mappedResults = searchResults.map((r) => ({
    id: `${r.type}-${r.id}`,
    originalId: r.id,
    label: r.label,
    subLabel: r.sub_label,
    icon: iconMap[r.type] || Search,
    path: r.path,
    category: t("commandMenu.searchResults"),
    type: r.type,
  }));

  const allItems = query.trim() === "" ? navigationItems : mappedResults;

  const handleSelect = (item: any) => {
    if (item.type === "nav") {
      if (item.path && item.path !== "#") {
        navigate(item.path);
      }
    } else if (item.type === "person") {
      if (item.path) {
        navigate(item.path);
      } else if (item.originalId) {
        navigate(`/people/${item.originalId}`);
      }
    } else if (item.type && item.originalId) {
      openDrawer({ id: item.originalId, type: item.type });
    }
    closeCommandMenu();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % allItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(
        (prev) => (prev - 1 + allItems.length) % allItems.length,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (allItems[selectedIndex]) {
        handleSelect(allItems[selectedIndex]);
      }
    }
  };

  const groupedItems = allItems.reduce((acc: any, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-[999] flex items-start justify-center pt-[15vh] px-4 backdrop-blur-sm bg-black/40">
      <div
        ref={menuRef}
        className="w-full max-w-[640px] bg-command-bg border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200"
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-command-header">
          <Search size={18} className="text-textSecondary" />
          <input
            ref={inputRef}
            type="text"
            dir={isRTL ? "rtl" : "auto"}
            className="flex-1 bg-transparent border-none outline-none text-textPrimary text-base placeholder:text-textSecondary"
            placeholder={t("commandMenu.searchPlaceholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="flex items-center gap-1.5">
            <kbd className="text-[10px] bg-card-hover text-textSecondary px-1.5 py-0.5 rounded border border-border">
              ESC
            </kbd>
          </div>
        </div>

        <div
          ref={listRef}
          className="max-h-[400px] overflow-y-auto py-2 custom-scrollbar"
        >
          {isSearching && query.trim() !== "" ? (
            <div className="px-4 py-12 text-center">
              <Loader2
                size={24}
                className="text-textSecondary mx-auto mb-3 animate-spin"
              />
              <p className="text-sm text-textSecondary">{t("commandMenu.searching")}</p>
            </div>
          ) : (
            <>
              {Object.entries(groupedItems).map(
                ([category, items]: [string, any]) => (
                  <div key={category}>
                    <div className="px-4 py-2 text-[11px] font-bold text-textSecondary uppercase tracking-widest bg-command-bg">
                      {category}
                    </div>
                    {items.map((item: any) => {
                      const globalIndex = allItems.indexOf(item);
                      const isSelected = globalIndex === selectedIndex;

                      return (
                        <div
                          key={item.id}
                          data-selected={isSelected}
                          className={`flex items-center gap-3 px-3 py-2 mx-2 rounded-md cursor-pointer transition-all duration-150 mb-0.5
                      ${isSelected ? "bg-card-hover text-textPrimary shadow-sm" : "text-textSecondary hover:text-textPrimary hover:bg-card-hover/40"}`}
                          onMouseMove={() => {
                            if (selectedIndex !== globalIndex)
                              setSelectedIndex(globalIndex);
                          }}
                          onClick={() => handleSelect(item)}
                        >
                          <item.icon
                            size={16}
                            className={
                              isSelected
                                ? "text-textPrimary"
                                : "text-textSecondary"
                            }
                          />
                          <div className="flex-1 flex flex-col min-w-0">
                            <span className="text-sm font-medium truncate">
                              {item.label}
                            </span>
                            {item.subLabel && (
                              <span className="text-[11px] opacity-60 truncate">
                                {item.subLabel}
                              </span>
                            )}
                          </div>
                          {item.shortcut && (
                            <kbd className="text-[10px] bg-command-bg text-textSecondary px-1.5 py-0.5 rounded border border-border ml-auto">
                              {item.shortcut}
                            </kbd>
                          )}
                          {isSelected && (
                            isRTL ? (
                              <ChevronLeft
                                size={14}
                                className="text-textPrimary ms-2"
                              />
                            ) : (
                              <ChevronRight
                                size={14}
                                className="text-textPrimary me-2"
                              />
                            )
                          )}
                        </div>
                      );
                    })}
                  </div>
                ),
              )}

              {allItems.length === 0 && (
                <div className="px-4 py-12 text-center">
                  <div className="w-12 h-12 bg-card-hover rounded-full flex items-center justify-center mx-auto mb-3">
                    <Search size={20} className="text-textSecondary" />
                  </div>
                  <p className="text-sm text-textSecondary">
                    {query.trim()
                      ? `${t("commandMenu.noResults")} "${query}"`
                      : t("commandMenu.typeToSearch")}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-4 py-3 border-t border-border bg-command-header flex items-center justify-between text-[11px] text-textSecondary">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="bg-card-hover px-1 rounded border border-border">
                ↵
              </kbd>
              {t("commandMenu.toSelect")}
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-card-hover px-1 rounded border border-border">
                ↑↓
              </kbd>
              {t("commandMenu.toNavigate")}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Command size={10} />
            <span>{t("commandMenu.searchAnything")}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandMenu;
