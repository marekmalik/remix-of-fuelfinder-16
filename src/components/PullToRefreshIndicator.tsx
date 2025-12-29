import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  isPastThreshold: boolean;
}

const PullToRefreshIndicator = ({ 
  pullDistance, 
  isRefreshing, 
  isPastThreshold 
}: PullToRefreshIndicatorProps) => {
  if (pullDistance === 0 && !isRefreshing) return null;

  const rotation = Math.min(pullDistance * 3, 360);
  const opacity = Math.min(pullDistance / 40, 1);
  const scale = Math.min(0.5 + (pullDistance / 160), 1);

  return (
    <div 
      className="fixed left-1/2 -translate-x-1/2 z-50 flex items-center justify-center pointer-events-none"
      style={{ 
        top: Math.max(pullDistance - 40, 8),
        opacity,
        transform: `translateX(-50%) scale(${scale})`,
      }}
    >
      <div className={cn(
        "w-10 h-10 rounded-full bg-background border border-border shadow-lg flex items-center justify-center",
        isPastThreshold && "bg-primary/10 border-primary/30"
      )}>
        <RefreshCw 
          className={cn(
            "w-5 h-5 text-muted-foreground transition-colors",
            isPastThreshold && "text-primary",
            isRefreshing && "animate-spin"
          )}
          style={{ 
            transform: isRefreshing ? undefined : `rotate(${rotation}deg)`,
          }}
        />
      </div>
    </div>
  );
};

export default PullToRefreshIndicator;
