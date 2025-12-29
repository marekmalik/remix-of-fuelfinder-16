import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

interface FlowToggleProps {
  active: boolean;
  onChange: (active: boolean) => void;
}

const FlowToggle = ({ active, onChange }: FlowToggleProps) => {
  return (
    <button
      type="button"
      onClick={() => onChange(!active)}
      className={cn(
        "w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-300 overflow-visible",
        active 
          ? "border-flow-glow bg-flow-glow/10 shadow-[0_0_20px_hsl(var(--flow-glow)/0.4)]" 
          : "border-border bg-card hover:border-muted-foreground/30"
      )}
    >
      <div className={cn(
        "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
        active 
          ? "bg-flow-glow text-primary-foreground" 
          : "bg-secondary text-muted-foreground"
      )}>
        <Sparkles className="w-5 h-5" />
      </div>
      
      <div className="text-left flex-1">
        <p className={cn(
          "font-medium transition-colors",
          active ? "text-foreground" : "text-muted-foreground"
        )}>
          Flow State
        </p>
        <p className="text-xs text-muted-foreground">
          Were you fully immersed and focused?
        </p>
      </div>
      
      <div className={cn(
        "w-12 h-7 rounded-full p-1 transition-colors duration-300",
        active ? "bg-flow-glow" : "bg-secondary"
      )}>
        <div className={cn(
          "w-5 h-5 rounded-full bg-primary-foreground transition-transform duration-300 shadow-sm",
          active ? "translate-x-5" : "translate-x-0"
        )} />
      </div>
    </button>
  );
};

export default FlowToggle;
