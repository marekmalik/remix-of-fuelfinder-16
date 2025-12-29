import { Activity } from "@/types/activity";
import { cn } from "@/lib/utils";
import { Sparkles, ChevronDown, MoreVertical, Pencil, Copy, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ActivityCardProps {
  activity: Activity;
  onDelete: (id: string) => void;
  onDuplicate: (activity: Activity) => void;
}

const likertLabels = {
  energy: ['', 'Very Drained', 'Drained', 'Neutral', 'Energized', 'Very Energized'],
  engagement: ['', 'Very Disengaged', 'Disengaged', 'Neutral', 'Engaged', 'Very Engaged'],
};

const ActivityCard = ({ activity, onDelete, onDuplicate }: ActivityCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const navigate = useNavigate();

  const getEnergyColor = () => {
    if (activity.energy <= 2) return 'bg-energy-low';
    if (activity.energy === 3) return 'bg-energy-medium';
    return 'bg-energy-high';
  };

  const getEngagementColor = () => {
    if (activity.engagement <= 2) return 'bg-engagement-low';
    if (activity.engagement === 3) return 'bg-engagement-medium';
    return 'bg-engagement-high';
  };

  const hasAeiou = activity.aeiou && Object.values(activity.aeiou).some(v => v && v.length > 0);

  return (
    <div className={cn(
      "rounded-xl border bg-card shadow-soft overflow-hidden transition-all duration-300",
      activity.inFlow && "ring-2 ring-flow-glow/50"
    )}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {activity.inFlow && (
                <Sparkles className="w-4 h-4 text-flow-glow flex-shrink-0" />
              )}
              <h3 className="font-medium text-foreground truncate">{activity.name}</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              {format(new Date(activity.createdAt), 'MMM d, yyyy • HH:mm')}
            </p>
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate(`/activity/${activity.id}`)}
              className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover border-border">
                <DropdownMenuItem onClick={() => onDuplicate(activity)}>
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Activity</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{activity.name}"? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(activity.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="flex gap-3 mt-3">
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Engagement</span>
              <span className={cn(
                "font-medium px-1.5 py-0.5 rounded text-[10px]",
                getEngagementColor(),
                "text-primary-foreground"
              )}>
                {likertLabels.engagement[activity.engagement]}
              </span>
            </div>
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <div 
                className={cn("h-full rounded-full transition-all", getEngagementColor())}
                style={{ width: `${activity.engagement * 20}%` }}
              />
            </div>
          </div>
          
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Energy</span>
              <span className={cn(
                "font-medium px-1.5 py-0.5 rounded text-[10px]",
                getEnergyColor(),
                "text-primary-foreground"
              )}>
                {likertLabels.energy[activity.energy]}
              </span>
            </div>
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <div 
                className={cn("h-full rounded-full transition-all", getEnergyColor())}
                style={{ width: `${activity.energy * 20}%` }}
              />
            </div>
          </div>
        </div>

        {(activity.notes || hasAeiou) && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>Details</span>
            <ChevronDown className={cn(
              "w-3 h-3 transition-transform duration-200",
              isExpanded && "rotate-180"
            )} />
          </button>
        )}
      </div>

      {isExpanded && (activity.notes || hasAeiou) && (
        <div className="px-4 pb-4 space-y-3 animate-fade-in border-t border-border/50 pt-3">
          {activity.notes && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
              <p className="text-sm text-foreground">{activity.notes}</p>
            </div>
          )}
          
          {hasAeiou && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">AEIOU Tags</p>
              {activity.aeiou?.activities && activity.aeiou.activities.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-primary font-medium text-xs">A:</span>
                  {activity.aeiou.activities.map(tag => (
                    <span key={tag} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">{tag}</span>
                  ))}
                </div>
              )}
              {activity.aeiou?.environments && activity.aeiou.environments.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-primary font-medium text-xs">E:</span>
                  {activity.aeiou.environments.map(tag => (
                    <span key={tag} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">{tag}</span>
                  ))}
                </div>
              )}
              {activity.aeiou?.interactions && activity.aeiou.interactions.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-primary font-medium text-xs">I:</span>
                  {activity.aeiou.interactions.map(tag => (
                    <span key={tag} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">{tag}</span>
                  ))}
                </div>
              )}
              {activity.aeiou?.objects && activity.aeiou.objects.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-primary font-medium text-xs">O:</span>
                  {activity.aeiou.objects.map(tag => (
                    <span key={tag} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">{tag}</span>
                  ))}
                </div>
              )}
              {activity.aeiou?.users && activity.aeiou.users.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-primary font-medium text-xs">U:</span>
                  {activity.aeiou.users.map(tag => (
                    <span key={tag} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ActivityCard;
