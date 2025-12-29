import { useLayoutEffect, useRef } from "react";
import { ViewMode } from "@/types/activity";
import { cn } from "@/lib/utils";
import { BookOpen, Plus, BarChart3 } from "lucide-react";

interface BottomNavProps {
  activeView: ViewMode;
  onChange: (view: ViewMode) => void;
}

const BottomNav = ({ activeView, onChange }: BottomNavProps) => {
  const navRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const el = navRef.current;
    if (!el) return;

    const setBottomOffsetVar = () => {
      const rect = el.getBoundingClientRect();
      const offset = Math.max(0, window.innerHeight - rect.top);
      document.documentElement.style.setProperty("--bottom-nav-height", `${offset}px`);
    };

    setBottomOffsetVar();
    const ro = new ResizeObserver(setBottomOffsetVar);
    ro.observe(el);
    window.addEventListener("resize", setBottomOffsetVar);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", setBottomOffsetVar);
    };
  }, []);

  const navItems: { view: ViewMode; icon: typeof BookOpen; label: string }[] = [
    { view: 'journal', icon: BookOpen, label: 'Journal' },
    { view: 'add', icon: Plus, label: 'Add' },
    { view: 'analytics', icon: BarChart3, label: 'Insights' },
  ];

  return (
    <nav
      ref={navRef}
      className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-soft z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="max-w-lg mx-auto px-6 py-1.5">
        <div className="flex items-center justify-around">
          {navItems.map(({ view, icon: Icon, label }) => {
            const isActive = activeView === view;
            const isAddButton = view === 'add';

            return (
              <button
                key={view}
                onClick={() => onChange(view)}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all duration-300",
                  isAddButton && !isActive && "bg-primary text-primary-foreground -mt-4 shadow-card",
                  isAddButton && isActive && "bg-primary text-primary-foreground -mt-4 shadow-card scale-105",
                  !isAddButton && isActive && "text-primary",
                  !isAddButton && !isActive && "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "transition-all",
                    isAddButton ? "w-6 h-6" : "w-5 h-5"
                  )}
                />
                <span
                  className={cn(
                    "text-xs font-medium",
                    isAddButton && "sr-only"
                  )}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
