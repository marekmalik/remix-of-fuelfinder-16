import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ViewMode, Activity } from "@/types/activity";
import { useAuth } from "@/contexts/AuthContext";
import { useActivities } from "@/hooks/useActivities";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import ActivityCard from "@/components/ActivityCard";
import AnalyticsView from "@/components/AnalyticsView";
import BottomNav from "@/components/BottomNav";
import PullToRefreshIndicator from "@/components/PullToRefreshIndicator";
import { BookOpen, Settings, Loader2 } from "lucide-react";
import appIcon from "@/assets/app-icon.png";

const Index = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('journal');
  const { user, loading: authLoading } = useAuth();
  const { activities, loading: activitiesLoading, deleteActivity, refetch } = useActivities();
  const navigate = useNavigate();

  const { pullDistance, isRefreshing, isPastThreshold } = usePullToRefresh({
    onRefresh: async () => {
      await refetch();
    },
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Handle viewMode 'add' by navigating to the activity page
  useEffect(() => {
    if (viewMode === 'add') {
      navigate('/activity/new');
      setViewMode('journal');
    }
  }, [viewMode, navigate]);

  const handleDeleteActivity = async (id: string) => {
    await deleteActivity(id);
  };

  const handleDuplicateActivity = (activity: Activity) => {
    navigate('/activity/new', { 
      state: { 
        duplicateFrom: {
          name: activity.name,
          engagement: activity.engagement,
          energy: activity.energy,
          inFlow: activity.inFlow,
          notes: activity.notes,
          topics: activity.topics,
          aeiou: activity.aeiou,
        }
      } 
    });
  };

  const handleSettings = () => {
    navigate('/settings');
  };

  if (authLoading || activitiesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-24 isolate">
      {viewMode === 'journal' && (
        <PullToRefreshIndicator 
          pullDistance={pullDistance} 
          isRefreshing={isRefreshing} 
          isPastThreshold={isPastThreshold} 
        />
      )}
      {/* Header */}
      <header className="sticky top-[env(safe-area-inset-top)] z-40 bg-background border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={appIcon} alt="FuelFinder" className="w-10 h-10" />
              <div>
                <h1 className="font-semibold text-foreground">FuelFinder</h1>
                <p className="text-xs text-muted-foreground">Track your energy & engagement</p>
              </div>
            </div>
            <button
              onClick={handleSettings}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
              title="Account Settings"
            >
              <Settings className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 relative">
        {/* Key forces full remount on tab switch to avoid iOS GPU cache artifacts */}
        <div 
          key={viewMode} 
          className="animate-fade-in bg-background"
          style={{ willChange: 'opacity, transform' }}
        >
          {viewMode === 'journal' && (
            <div className="space-y-4">
              {activities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                    <BookOpen className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium text-foreground mb-2">Your Journal is Empty</h3>
                  <p className="text-sm text-muted-foreground max-w-xs mb-6">
                    Start tracking your activities to discover patterns in your energy and engagement.
                  </p>
                  <button
                    onClick={() => setViewMode('add')}
                    className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium transition-transform hover:scale-105 active:scale-95"
                  >
                    Log Your First Activity
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-foreground">Recent Activities</h2>
                    <span className="text-sm text-muted-foreground">{activities.length} entries</span>
                  </div>
                  <div className="space-y-3">
                    {activities.map((activity, index) => (
                      <div 
                        key={activity.id}
                        className="animate-fade-in"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <ActivityCard 
                          activity={activity}
                          onDelete={handleDeleteActivity}
                          onDuplicate={handleDuplicateActivity}
                        />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {viewMode === 'analytics' && (
            <div className="min-h-[calc(100vh-200px)]">
              <AnalyticsView activities={activities} />
            </div>
          )}
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNav activeView={viewMode} onChange={setViewMode} />
    </div>
  );
};

export default Index;
