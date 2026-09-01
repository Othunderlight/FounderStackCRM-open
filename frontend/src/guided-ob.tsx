import * as React from "react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "../lib/utils";
import { MousePointer2 } from "lucide-react";

export type HighlightTarget = "import_btn" | "new_record" | "invite_usr" | "shortcuts" | "sidebar_search" | "manage_reports" | "create_report" | null;

export function useGuidedOnboarding() {
  const location = useLocation();
  const navigate = useNavigate();
  const [highlighted, setHighlighted] = useState<HighlightTarget>(null);
  const [isMouseMoving, setIsMouseMoving] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const isGuided = params.get("guided-ob") === "true";
    const highlight = params.get("highlight") as HighlightTarget;

    if (isGuided && highlight) {
      setHighlighted(highlight);
      if (highlight === "invite_usr" || highlight === "shortcuts" || highlight === "sidebar_search" || highlight === "manage_reports") {
        setIsMouseMoving(true);
      }
    } else {
      setHighlighted(null);
      setIsMouseMoving(false);
    }
  }, [location.search]);

  const clearHighlight = () => {
    const params = new URLSearchParams(location.search);
    params.delete("guided-ob");
    params.delete("highlight");
    
    const newSearch = params.toString();
    navigate({
      pathname: location.pathname,
      search: newSearch ? `?${newSearch}` : "",
    }, { replace: true });
    
    setHighlighted(null);
    setIsMouseMoving(false);
  };

  return { highlighted, clearHighlight, isMouseMoving, setIsMouseMoving };
}

export function GuidedOnboardingOverlay({ highlighted }: { highlighted: HighlightTarget }) {
  if (!highlighted) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-[80] pointer-events-none animate-in fade-in duration-500" 
      aria-hidden="true"
    />
  );
}

export function VirtualMouse({ targetRef, onComplete, active }: { targetRef: React.RefObject<HTMLElement>, onComplete: () => void, active: boolean }) {
  const [position, setPosition] = useState({ x: typeof window !== 'undefined' ? window.innerWidth / 2 : 500, y: typeof window !== 'undefined' ? window.innerHeight / 2 : 500 });
  const [isClicking, setIsClicking] = useState(false);

  useEffect(() => {
    if (!active || !targetRef.current) return;

    const targetRect = targetRef.current.getBoundingClientRect();
    const targetX = targetRect.left + targetRect.width / 2;
    const targetY = targetRect.top + targetRect.height / 2;

    const timer = setTimeout(() => {
      setPosition({ x: targetX, y: targetY });
      
      const clickTimer = setTimeout(() => {
        setIsClicking(true);
        const completeTimer = setTimeout(() => {
          setIsClicking(false);
          onComplete();
        }, 300);
        return () => clearTimeout(completeTimer);
      }, 1000);
      return () => clearTimeout(clickTimer);
    }, 100);

    return () => clearTimeout(timer);
  }, [active, targetRef]);

  if (!active) return null;

  return (
    <div 
      className="fixed z-[9999] pointer-events-none transition-all duration-1000 ease-in-out"
      style={{ 
        left: position.x, 
        top: position.y,
        transform: isClicking ? 'scale(0.8)' : 'scale(1)'
      }}
    >
      <MousePointer2 size={24} className="text-white fill-blue-600 stroke-blue-600 shadow-xl" />
      {isClicking && (
        <div className="absolute top-0 left-0 w-6 h-6 bg-blue-500/50 rounded-full animate-ping -translate-x-1/4 -translate-y-1/4" />
      )}
    </div>
  );
}
