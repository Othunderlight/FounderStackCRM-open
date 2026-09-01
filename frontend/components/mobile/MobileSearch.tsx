import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Users,
  Building2,
  CheckSquare,
  FileText,
  X,
  ChevronRight,
  User,
  Target,
  Home,
  Settings,
  History,
  ArrowLeft,
} from "lucide-react";
import { useStore } from "../../store";

const MobileSearch: React.FC = () => {
  const navigate = useNavigate();
  const { people, companies, tasks, notes } = useStore();

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const navigationItems = [
    {
      id: "nav-home",
      label: "Home",
      icon: Home,
      path: "/",
      category: "Navigation",
    },
    {
      id: "nav-people",
      label: "All People",
      icon: Users,
      path: "/people/all",
      category: "Navigation",
    },
    {
      id: "nav-leads",
      label: "Leads",
      icon: Target,
      path: "/people/leads",
      category: "Navigation",
    },
    {
      id: "nav-clients",
      label: "Clients",
      icon: User,
      path: "/people/clients",
      category: "Navigation",
    },
    {
      id: "nav-companies",
      label: "Companies",
      icon: Building2,
      path: "/companies",
      category: "Navigation",
    },
    {
      id: "nav-tasks",
      label: "Tasks",
      icon: CheckSquare,
      path: "/tasks/all",
      category: "Navigation",
    },
    {
      id: "nav-settings",
      label: "Settings",
      icon: Settings,
      path: "/settings",
      category: "Navigation",
    },
  ];

  const searchResults =
    query.trim() === ""
      ? []
      : [
          ...navigationItems
            .filter((nav) =>
              nav.label?.toLowerCase().includes(query.toLowerCase()),
            )
            .map((nav) => ({ ...nav, category: "Navigation" })),
          ...people
            .filter(
              (p) =>
                p.name?.toLowerCase().includes(query.toLowerCase()) ||
                p.email?.toLowerCase().includes(query.toLowerCase()) ||
                p.jobTitle?.toLowerCase().includes(query.toLowerCase()) ||
                p.companyName?.toLowerCase().includes(query.toLowerCase()),
            )
            .map((p) => ({
              id: p.id,
              label: p.name,
              subLabel: `${p.jobTitle || ""} • ${p.companyName || ""}`,
              icon: User,
              path: `/people/${p.id}`,
              category: "People",
            })),
          ...companies
            .filter(
              (c) =>
                c.name?.toLowerCase().includes(query.toLowerCase()) ||
                c.domain?.toLowerCase().includes(query.toLowerCase()) ||
                c.location?.toLowerCase().includes(query.toLowerCase()),
            )
            .map((c) => ({
              id: c.id,
              label: c.name,
              subLabel: `${c.domain || ""} • ${c.location || ""}`,
              icon: Building2,
              path: `/companies/${c.id}`,
              category: "Companies",
            })),
          ...tasks
            .filter(
              (t) =>
                t.title?.toLowerCase().includes(query.toLowerCase()) ||
                t.description?.toLowerCase().includes(query.toLowerCase()),
            )
            .map((t) => ({
              id: t.id,
              label: t.title,
              subLabel: `Task • ${t.status || ""}`,
              icon: CheckSquare,
              path: `/tasks/${t.id}`,
              category: "Tasks",
            })),
          ...notes
            .filter(
              (n) =>
                n.title?.toLowerCase().includes(query.toLowerCase()) ||
                n.content?.toLowerCase().includes(query.toLowerCase()),
            )
            .map((n) => ({
              id: n.id,
              label: n.title,
              subLabel: "Note",
              icon: FileText,
              path: `/notes/${n.id}`,
              category: "Notes",
            })),
        ].slice(0, 15);

  const allItems = query.trim() === "" ? navigationItems : searchResults;

  const handleSelect = (item: any) => {
    if (item.path) {
      navigate(item.path);
    }
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
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header className="flex items-center px-2 h-14 border-b border-border">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-[#2f2f2f] rounded-full text-textSecondary active:bg-[#3f3f3f]"
        >
          <ArrowLeft size={22} />
        </button>
        <div className="flex-1 flex items-center gap-2 bg-[#1c1c1c] rounded-lg px-3 py-2">
          <input
            ref={inputRef}
            type="text"
            dir="auto"
            className="flex-1 bg-transparent border-none outline-none text-textPrimary text-base placeholder:text-textSecondary"
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 hover:bg-[#333] rounded text-textSecondary"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </header>

      {/* Results */}
      <div className="flex-1 overflow-y-auto mt-8">
        {Object.entries(groupedItems).map(
          ([category, items]: [string, any]) => (
            <div key={category}>
              <div className="px-4 py-2 mb-2 text-[11px] font-bold text-textSecondary uppercase tracking-widest bg-background sticky top-0">
                {category}
              </div>
              {items.map((item: any) => {
                const globalIndex = allItems.indexOf(item);
                const isSelected = globalIndex === selectedIndex;

                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-lg cursor-pointer transition-all duration-150 mb-0.5 ${
                      isSelected ? "bg-[#2f2f2f]" : "hover:bg-[#1f1f1f]"
                    }`}
                    onClick={() => handleSelect(item)}
                  >
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center ${
                        isSelected
                          ? "bg-accent/20 text-accent"
                          : "bg-[#2f2f2f] text-textSecondary"
                      }`}
                    >
                      <item.icon size={18} />
                    </div>
                    <div className="flex-1 flex flex-col min-w-0">
                      <span className="text-sm font-medium text-textPrimary truncate">
                        {item.label}
                      </span>
                      {item.subLabel && (
                        <span className="text-xs text-textSecondary truncate">
                          {item.subLabel}
                        </span>
                      )}
                    </div>
                    <ChevronRight size={18} className="text-textSecondary" />
                  </div>
                );
              })}
            </div>
          ),
        )}

        {allItems.length === 0 && query && (
          <div className="px-4 py-12 text-center">
            <p className="text-sm text-textSecondary">
              No results for "{query}"
            </p>
          </div>
        )}

        {query.trim() === "" && (
          <div className="px-4 py-6 text-center">
            <Search
              size={32}
              className="text-textSecondary mx-auto mb-3 opacity-50"
            />
            <p className="text-sm text-textSecondary">
              Search for people, companies, tasks, or navigation
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileSearch;
