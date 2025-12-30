import { Activity } from "@/types/activity";
import { TrendingUp, TrendingDown, Sparkles, Zap, Battery, Heart, ChevronDown, ChevronUp, Download } from "lucide-react";
import { useState } from "react";
import { useStreak } from "@/hooks/useStreak";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import StreakSection from "@/components/StreakSection";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { toast } from "sonner";

interface AnalyticsViewProps {
  activities: Activity[];
}

const likertLabels = {
  energy: ['', 'Very Drained', 'Drained', 'Neutral', 'Energized', 'Very Energized'],
  engagement: ['', 'Very Disengaged', 'Disengaged', 'Neutral', 'Engaged', 'Very Engaged'],
};

const tagCategoryLabels: Record<string, string> = {
  topics: 'Topics',
  activities: 'Activities',
  environments: 'Environments',
  interactions: 'Interactions',
  objects: 'Objects',
  users: 'People',
};

interface TagInsight {
  category: string;
  tag: string;
  count: number;
}

const getTagInsights = (activities: Activity[], hideTopics: boolean): TagInsight[] => {
  const tagCounts: Record<string, { category: string; count: number }> = {};

  activities.forEach(a => {
    // Only include topics if not hidden
    if (!hideTopics) {
      a.topics?.forEach(tag => {
        const key = `topics:${tag}`;
        tagCounts[key] = tagCounts[key] || { category: 'topics', count: 0 };
        tagCounts[key].count++;
      });
    }

    if (a.aeiou) {
      (['activities', 'environments', 'interactions', 'objects', 'users'] as const).forEach(cat => {
        a.aeiou?.[cat]?.forEach(tag => {
          const key = `${cat}:${tag}`;
          tagCounts[key] = tagCounts[key] || { category: cat, count: 0 };
          tagCounts[key].count++;
        });
      });
    }
  });

  return Object.entries(tagCounts)
    .map(([key, { category, count }]) => ({
      category,
      tag: key.split(':').slice(1).join(':'),
      count,
    }))
    .sort((a, b) => b.count - a.count);
};

const MAX_TAGS_PER_CATEGORY = 5;
const MAX_ACTIVITIES_SHOWN = 5;

const exportToCSV = async (activities: Activity[]) => {
  if (activities.length === 0) {
    toast.error("No activities to export");
    return;
  }

  const likertEnergyLabels = ['', 'Very Drained', 'Drained', 'Neutral', 'Energized', 'Very Energized'];
  const likertEngagementLabels = ['', 'Very Disengaged', 'Disengaged', 'Neutral', 'Engaged', 'Very Engaged'];

  const escapeCSV = (value: string | undefined | null): string => {
    if (value === undefined || value === null) return '';
    const str = String(value);
    if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes(';')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headers = [
    'Date',
    'Time',
    'Entry Type',
    'Name',
    'Engagement (1-5)',
    'Engagement Level',
    'Energy (1-5)',
    'Energy Level',
    'In Flow',
    'Topics',
    'Feelings',
    'AEIOU Activities',
    'AEIOU Environments',
    'AEIOU Interactions',
    'AEIOU Objects',
    'AEIOU People',
    'Notes'
  ];

  const rows = activities.map(activity => {
    const date = new Date(activity.createdAt);
    return [
      format(date, 'yyyy-MM-dd'),
      format(date, 'HH:mm'),
      activity.entryType === 'event' ? 'Event' : 'Activity',
      escapeCSV(activity.name),
      activity.engagement,
      escapeCSV(likertEngagementLabels[activity.engagement]),
      activity.energy,
      escapeCSV(likertEnergyLabels[activity.energy]),
      activity.inFlow ? 'Yes' : 'No',
      escapeCSV(activity.topics?.join(', ')),
      escapeCSV(activity.feelings?.join(', ')),
      escapeCSV(activity.aeiou?.activities?.join(', ')),
      escapeCSV(activity.aeiou?.environments?.join(', ')),
      escapeCSV(activity.aeiou?.interactions?.join(', ')),
      escapeCSV(activity.aeiou?.objects?.join(', ')),
      escapeCSV(activity.aeiou?.users?.join(', ')),
      escapeCSV(activity.notes)
    ].join(';');
  });

  const csvContent = [headers.join(';'), ...rows].join('\n');
  
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
  const filename = `fuelfinder-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  
  try {
    if ('showSaveFilePicker' in window) {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [{
          description: 'CSV file',
          accept: { 'text/csv': ['.csv'] },
        }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      toast.success(`Exported ${activities.length} activities`);
    } else {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      
      setTimeout(() => {
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, 100);
      }, 0);
      
      toast.success(`Exported ${activities.length} activities`);
    }
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(`Exported ${activities.length} activities - check your downloads`);
    }
  }
};

const TagInsightsList = ({ insights, colorClass }: { insights: TagInsight[]; colorClass: string }) => {
  const [expanded, setExpanded] = useState(false);
  
  if (insights.length === 0) return null;

  const byCategory = insights.reduce((acc, insight) => {
    if (!acc[insight.category]) acc[insight.category] = [];
    acc[insight.category].push(insight);
    return acc;
  }, {} as Record<string, TagInsight[]>);

  const categories = Object.entries(byCategory);
  const hasMore = categories.some(([, items]) => items.length > MAX_TAGS_PER_CATEGORY);

  return (
    <div className="space-y-2">
      {categories.map(([category, categoryInsights]) => {
        const visibleTags = expanded ? categoryInsights : categoryInsights.slice(0, MAX_TAGS_PER_CATEGORY);
        const hiddenCount = categoryInsights.length - MAX_TAGS_PER_CATEGORY;
        
        return (
          <div key={category} className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              {tagCategoryLabels[category] || category}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {visibleTags.map(({ tag, count }) => (
                <span
                  key={`${category}-${tag}`}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-md ${colorClass} text-xs`}
                >
                  {tag}
                  <span className="opacity-70">({count})</span>
                </span>
              ))}
              {!expanded && hiddenCount > 0 && (
                <span className="text-xs text-muted-foreground py-1">
                  +{hiddenCount} more
                </span>
              )}
            </div>
          </div>
        );
      })}
      
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? 'Show less' : 'Show all tags'}
        </button>
      )}
    </div>
  );
};

interface ActivityListProps {
  activities: Activity[];
  colorClass: string;
  borderClass: string;
  labelFn: (a: Activity) => string;
  labelColorClass: string;
}

const ActivityList = ({ activities, colorClass, borderClass, labelFn, labelColorClass }: ActivityListProps) => {
  const [expanded, setExpanded] = useState(false);
  
  const visibleActivities = expanded ? activities : activities.slice(0, MAX_ACTIVITIES_SHOWN);
  const hiddenCount = activities.length - MAX_ACTIVITIES_SHOWN;

  return (
    <div className="space-y-2">
      {visibleActivities.map(activity => (
        <div 
          key={activity.id}
          className={`flex items-center justify-between p-3 rounded-lg ${colorClass} border ${borderClass}`}
        >
          <span className="text-sm text-foreground">{activity.name}</span>
          <span className={`text-xs font-medium ${labelColorClass}`}>
            {labelFn(activity)}
          </span>
        </div>
      ))}
      
      {hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full justify-center py-2"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? 'Show less' : `Show ${hiddenCount} more`}
        </button>
      )}
    </div>
  );
};

const AnalyticsView = ({ activities }: AnalyticsViewProps) => {
  const { currentStreak, hasActivityToday } = useStreak(activities);
  const { preferences } = useUserPreferences();

  if (activities.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Streak Section - always show */}
        <StreakSection 
          streak={currentStreak} 
          hasActivityToday={hasActivityToday} 
          activities={activities} 
        />

        {/* Export Button - always show, will show toast if no data */}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => exportToCSV(activities)}
          data-testid="button-export-csv"
        >
          <Download className="w-4 h-4 mr-2" />
          Export All Records (0)
        </Button>
        
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
            <TrendingUp className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-medium text-foreground mb-2">No data yet</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Start logging activities to see patterns in your energy and engagement.
          </p>
        </div>
      </div>
    );
  }

  const avgEnergy = activities.reduce((sum, a) => sum + a.energy, 0) / activities.length;
  const avgEngagement = activities.reduce((sum, a) => sum + a.engagement, 0) / activities.length;
  
  // If flow toggle is hidden, calculate flow based on engagement === 5
  const flowActivitiesForStats = preferences.hideFlowToggle 
    ? activities.filter(a => a.engagement === 5)
    : activities.filter(a => a.inFlow);
  const flowCount = flowActivitiesForStats.length;
  const flowPercentage = (flowCount / activities.length) * 100;

  const highEnergyActivities = activities
    .filter(a => a.energy >= 4)
    .sort((a, b) => b.energy - a.energy);

  const lowEnergyActivities = activities
    .filter(a => a.energy <= 2)
    .sort((a, b) => a.energy - b.energy);

  // Flow activities - use engagement === 5 if flow toggle is hidden
  const flowActivities = preferences.hideFlowToggle
    ? activities.filter(a => a.engagement === 5).sort((a, b) => (b.engagement + b.energy) - (a.engagement + a.energy))
    : activities.filter(a => a.inFlow).sort((a, b) => (b.engagement + b.energy) - (a.engagement + a.energy));

  const allEnergizingActivities = activities.filter(a => a.energy >= 4);
  const energizingTagInsights = getTagInsights(allEnergizingActivities, preferences.hideTopics);

  const allDrainingActivities = activities.filter(a => a.energy <= 2);
  const drainingTagInsights = getTagInsights(allDrainingActivities, preferences.hideTopics);

  const allFlowActivities = preferences.hideFlowToggle
    ? activities.filter(a => a.engagement === 5)
    : activities.filter(a => a.inFlow);
  const flowTagInsights = getTagInsights(allFlowActivities, preferences.hideTopics);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Streak Section */}
      <StreakSection 
        streak={currentStreak} 
        hasActivityToday={hasActivityToday} 
        activities={activities} 
      />

      {/* Export Button */}
      <Button
        variant="outline"
        className="w-full"
        onClick={() => exportToCSV(activities)}
        data-testid="button-export-csv"
      >
        <Download className="w-4 h-4 mr-2" />
        Export All Records ({activities.length})
      </Button>

      <h2 className="text-xl font-semibold text-foreground">Your Patterns</h2>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-engagement-high/10 border border-engagement-high/20">
          <Heart className="w-5 h-5 text-engagement-high mb-2" />
          <p className="text-2xl font-bold text-foreground">{avgEngagement.toFixed(1)}</p>
          <p className="text-xs text-muted-foreground">Avg Engagement</p>
        </div>
        
        <div className="p-4 rounded-xl bg-energy-high/10 border border-energy-high/20">
          <Zap className="w-5 h-5 text-energy-high mb-2" />
          <p className="text-2xl font-bold text-foreground">{avgEnergy.toFixed(1)}</p>
          <p className="text-xs text-muted-foreground">Avg Energy</p>
        </div>
        
        <div className="p-4 rounded-xl bg-flow-glow/10 border border-flow-glow/20">
          <Sparkles className="w-5 h-5 text-flow-glow mb-2" />
          <p className="text-2xl font-bold text-foreground">{flowPercentage.toFixed(0)}%</p>
          <p className="text-xs text-muted-foreground">In Flow</p>
        </div>
      </div>

      {/* What Energizes with Tag Insights */}
      {highEnergyActivities.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-energy-high" />
            <h3 className="font-medium text-foreground">What Energizes You</h3>
            <span className="text-xs text-muted-foreground">({allEnergizingActivities.length})</span>
          </div>
          
          {/* Tag insights first */}
          {energizingTagInsights.length > 0 && (
            <div className="p-3 rounded-lg bg-energy-high/5 border border-energy-high/10">
              <p className="text-xs font-medium text-foreground mb-3">
                Patterns across {allEnergizingActivities.length} energizing activit{allEnergizingActivities.length > 1 ? 'ies' : 'y'}
              </p>
              <TagInsightsList 
                insights={energizingTagInsights} 
                colorClass="bg-energy-high/20 text-foreground"
              />
            </div>
          )}
          
          {/* Activity list */}
          <ActivityList
            activities={highEnergyActivities}
            colorClass="bg-energy-high/5"
            borderClass="border-energy-high/10"
            labelFn={a => `${a.engagement + a.energy}/10`}
            labelColorClass="text-muted-foreground"
          />
        </div>
      )}

      {/* Flow State Activities with Tag Insights */}
      {flowActivities.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-flow-glow" />
            <h3 className="font-medium text-foreground">Flow State Activities</h3>
            <span className="text-xs text-muted-foreground">({allFlowActivities.length})</span>
          </div>
          
          {/* Tag insights first */}
          {flowTagInsights.length > 0 && (
            <div className="p-3 rounded-lg bg-flow-glow/5 border border-flow-glow/10">
              <p className="text-xs font-medium text-foreground mb-3">
                Patterns across {allFlowActivities.length} flow state{allFlowActivities.length > 1 ? 's' : ''}
              </p>
              <TagInsightsList 
                insights={flowTagInsights} 
                colorClass="bg-flow-glow/20 text-foreground"
              />
            </div>
          )}
          
          {/* Activity list */}
          <ActivityList
            activities={flowActivities}
            colorClass="bg-flow-glow/5"
            borderClass="border-flow-glow/10"
            labelFn={a => `${a.engagement + a.energy}/10`}
            labelColorClass="text-muted-foreground"
          />
        </div>
      )}

      {/* What Drains You - at bottom with Tag Insights */}
      {lowEnergyActivities.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-energy-low" />
            <h3 className="font-medium text-foreground">What Drains You</h3>
            <span className="text-xs text-muted-foreground">({allDrainingActivities.length})</span>
          </div>
          
          {/* Tag insights first */}
          {drainingTagInsights.length > 0 && (
            <div className="p-3 rounded-lg bg-energy-low/5 border border-energy-low/10">
              <p className="text-xs font-medium text-foreground mb-3">
                Patterns across {allDrainingActivities.length} draining activit{allDrainingActivities.length > 1 ? 'ies' : 'y'}
              </p>
              <TagInsightsList 
                insights={drainingTagInsights} 
                colorClass="bg-energy-low/20 text-foreground"
              />
            </div>
          )}
          
          {/* Activity list */}
          <ActivityList
            activities={lowEnergyActivities}
            colorClass="bg-energy-low/5"
            borderClass="border-energy-low/10"
            labelFn={a => likertLabels.energy[a.energy]}
            labelColorClass="text-energy-low"
          />
        </div>
      )}
    </div>
  );
};

export default AnalyticsView;
