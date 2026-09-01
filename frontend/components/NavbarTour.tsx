import React, { useEffect, useState } from "react";
import { useStore } from "../store";
import { cn } from "../lib/utils";
import { X, ChevronRight, Sparkles } from "lucide-react";

interface TourStep {
  targetId: string;
  title: string;
  content: string;
  position: "right" | "bottom" | "left" | "top";
}

const tourSteps: TourStep[] = [
  {
    targetId: "sidebar-search",
    title: "Global Search",
    content: "Press ⌘K to search for anything in your CRM or run AI commands.",
    position: "right",
  },
  {
    targetId: "sidebar-people",
    title: "Manage People",
    content: "Access your leads and clients. Use filters to find high-intent prospects.",
    position: "right",
  },
  {
    targetId: "sidebar-ai-agent",
    title: "AI Agent",
    content: "New: Ask our AI to generate reports or summarize your meetings.",
    position: "right",
  },
  {
    targetId: "sidebar-getting-started",
    title: "Setup Progress",
    content: "Track your onboarding progress and unlock pro features as you go.",
    position: "right",
  },
];

const NavbarTour = () => {
  const { tourStep, setTourStep } = useStore();
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (tourStep !== null) {
      const element = document.getElementById(tourSteps[tourStep].targetId);
      if (element) {
        const rect = element.getBoundingClientRect();
        setCoords({
          top: rect.top + rect.height / 2,
          left: rect.right + 12,
        });
      }
    } else {
      setCoords(null);
    }
  }, [tourStep]);

  if (tourStep === null || !coords) return null;

  const step = tourSteps[tourStep];

  return (
    <div className="fixed inset-0 z-[10000] pointer-events-none">
      {/* Backdrop with hole */}
      <div className="absolute inset-0 bg-black/40 pointer-events-auto" onClick={() => setTourStep(null)} />
      
      <div 
        className="absolute z-[10001] pointer-events-auto animate-in fade-in zoom-in duration-300"
        style={{ top: coords.top, left: coords.left, transform: "translateY(-50%)" }}
      >
        <div className="w-[280px] bg-[#1a1a1a] border border-blue-500/30 rounded-xl shadow-2xl overflow-hidden">
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-blue-500" />
                <h4 className="text-sm font-bold text-textPrimary">{step.title}</h4>
              </div>
              <button 
                onClick={() => setTourStep(null)}
                className="p-1 hover:bg-[#2f2f2f] rounded text-textSecondary transition-colors"
              >
                <X size={14} />
              </button>
            </div>
            <p className="text-xs text-textSecondary leading-relaxed mb-4">
              {step.content}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-textSecondary/60 font-medium">
                {tourStep + 1} of {tourSteps.length}
              </span>
              <button 
                onClick={() => {
                  if (tourStep < tourSteps.length - 1) {
                    setTourStep(tourStep + 1);
                  } else {
                    setTourStep(null);
                  }
                }}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold py-1 px-3 rounded-lg transition-all"
              >
                {tourStep === tourSteps.length - 1 ? "Got it" : "Next"}
                <ChevronRight size={12} />
              </button>
            </div>
          </div>
          <div className="h-1 bg-[#2f2f2f]">
            <div 
              className="h-full bg-blue-500 transition-all duration-300" 
              style={{ width: `${((tourStep + 1) / tourSteps.length) * 100}%` }} 
            />
          </div>
        </div>
        
        {/* Arrow */}
        <div className="absolute left-[-6px] top-1/2 -translate-y-1/2 w-3 h-3 bg-[#1a1a1a] border-l border-b border-blue-500/30 rotate-45" />
      </div>
    </div>
  );
};

export default NavbarTour;
