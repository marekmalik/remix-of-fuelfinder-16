import { useState, useEffect, useRef, useLayoutEffect, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { format, isToday, formatDistanceToNow, differenceInMinutes } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useActivities } from "@/hooks/useActivities";
import { useConfetti } from "@/hooks/useConfetti";
import { useScrollHeader } from "@/hooks/useScrollHeader";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Activity as ActivityType, AEIOUDetails, LikertLevel, EntryType } from "@/types/activity";
import LikertScale from "@/components/LikertScale";
import FlowToggle from "@/components/FlowToggle";
import AEIOUSection from "@/components/AEIOUSection";
import FeelingsSection from "@/components/FeelingsSection";
import TagInput from "@/components/TagInput";
import { useUserTags } from "@/hooks/useUserTags";
import { useTagFrequencies } from "@/hooks/useTagFrequencies";
import { ArrowLeft, Tag, CalendarIcon, Clock, Loader2, Save, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const Activity = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { activities, loading: activitiesLoading, addActivity, updateActivity } = useActivities();
  const { fire: fireConfetti } = useConfetti();
  const isHeaderVisible = useScrollHeader();
  const { preferences, loading: prefsLoading } = useUserPreferences();
  
  const isEditing = !!id;
  const existingActivity = isEditing ? activities.find(a => a.id === id) : null;

  const [entryType, setEntryType] = useState<EntryType>('activity');
  const [name, setName] = useState('');
  const [engagement, setEngagement] = useState<LikertLevel>(3);
  const [energy, setEnergy] = useState<LikertLevel>(3);
  const [inFlow, setInFlow] = useState(false);
  const [notes, setNotes] = useState('');
  const [aeiou, setAeiou] = useState<AEIOUDetails>({});
  const [topics, setTopics] = useState<string[]>([]);
  const [feelings, setFeelings] = useState<string[]>([]);
  const [activityDate, setActivityDate] = useState<Date>(new Date());
  const [timeValue, setTimeValue] = useState(format(new Date(), "HH:mm"));
  const [saving, setSaving] = useState(false);
  const [dateTimeExpanded, setDateTimeExpanded] = useState(false);
  const [dateTimeEdited, setDateTimeEdited] = useState(false);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const initialNotesLoadedRef = useRef(false);
  const lastEditIdRef = useRef<string | undefined>(undefined);
  
  // Reset the initial notes flag when switching between entries
  useEffect(() => {
    if (id !== lastEditIdRef.current) {
      initialNotesLoadedRef.current = false;
      lastEditIdRef.current = id;
    }
  }, [id]);
  
  const { getTagsByCategory, addTag } = useUserTags();
  const { sortByFrequency } = useTagFrequencies();
  const topicSuggestions = getTagsByCategory('topics');
  const sortedTopicSuggestions = sortByFrequency('topics', topicSuggestions);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Populate form when editing or duplicating
  useEffect(() => {
    const duplicateData = location.state?.duplicateFrom;
    
    if (duplicateData) {
      setEntryType(duplicateData.entryType || 'activity');
      setName(duplicateData.name || '');
      setEngagement(duplicateData.engagement || 3);
      setEnergy(duplicateData.energy || 3);
      setInFlow(duplicateData.inFlow || false);
      setNotes(''); // Clear notes when duplicating
      setAeiou(duplicateData.aeiou || {});
      setTopics(duplicateData.topics || []);
      setFeelings(duplicateData.feelings || []);
      // Keep current date/time for duplicates
    } else if (isEditing && existingActivity) {
      setEntryType(existingActivity.entryType || 'activity');
      setName(existingActivity.name);
      setEngagement(existingActivity.engagement);
      setEnergy(existingActivity.energy);
      setInFlow(existingActivity.inFlow);
      setNotes(existingActivity.notes || '');
      setAeiou(existingActivity.aeiou || {});
      setTopics(existingActivity.topics || []);
      setFeelings(existingActivity.feelings || []);
      setActivityDate(new Date(existingActivity.createdAt));
      setTimeValue(format(new Date(existingActivity.createdAt), "HH:mm"));
      setDateTimeEdited(true); // When editing, show as edited
      setDateTimeExpanded(true); // Auto-expand when editing
    }
  }, [isEditing, existingActivity, location.state]);

  // Debounce ref for shrink operations
  const shrinkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHeightRef = useRef<number>(80);

  // Auto-resize: grow immediately, shrink with debounce
  const adjustTextareaHeight = useCallback((textarea: HTMLTextAreaElement) => {
    // Clear any pending shrink
    if (shrinkTimeoutRef.current) {
      clearTimeout(shrinkTimeoutRef.current);
      shrinkTimeoutRef.current = null;
    }

    const currentHeight = textarea.offsetHeight;
    const scrollHeight = textarea.scrollHeight;

    if (scrollHeight > currentHeight) {
      // Growing: apply immediately
      textarea.style.height = scrollHeight + 'px';
      lastHeightRef.current = scrollHeight;
      
      // After resize, ensure cursor stays visible above the bottom nav
      // Only run for user-driven typing, not initial edit hydration
      if (initialNotesLoadedRef.current || !isEditing) {
        requestAnimationFrame(() => {
          const rect = textarea.getBoundingClientRect();
          const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
          const bottomNavHeight = 96; // pb-24 = 6rem = 96px
          const safePadding = 20;
          const visibleBottom = viewportHeight - bottomNavHeight - safePadding;
          
          if (rect.bottom > visibleBottom) {
            const overflow = rect.bottom - visibleBottom;
            window.scrollBy({ top: overflow, behavior: 'smooth' });
          }
        });
      }
    } else if (scrollHeight < lastHeightRef.current) {
      // Content deleted - debounce the shrink to avoid jumping
      shrinkTimeoutRef.current = setTimeout(() => {
        requestAnimationFrame(() => {
          if (notesRef.current) {
            // Measure true height by temporarily setting to min
            const minHeight = 80;
            notesRef.current.style.height = minHeight + 'px';
            const newHeight = Math.max(notesRef.current.scrollHeight, minHeight);
            notesRef.current.style.height = newHeight + 'px';
            lastHeightRef.current = newHeight;
          }
        });
      }, 500);
    }
  }, [isEditing]);

  // Initial resize for edit mode - runs once after notes state is synced
  useLayoutEffect(() => {
    // Only resize once: when editing, activity is loaded, and notes state matches persisted value
    const persistedNotes = existingActivity?.notes || '';
    if (isEditing && existingActivity && notes === persistedNotes && !initialNotesLoadedRef.current) {
      initialNotesLoadedRef.current = true;
      if (notesRef.current) {
        const textarea = notesRef.current;
        const minHeight = 80;
        textarea.style.height = minHeight + 'px';
        const newHeight = Math.max(textarea.scrollHeight, minHeight);
        textarea.style.height = newHeight + 'px';
        lastHeightRef.current = newHeight;
      }
    }
  }, [isEditing, existingActivity, notes]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (shrinkTimeoutRef.current) {
        clearTimeout(shrinkTimeoutRef.current);
      }
    };
  }, []);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const [hours, minutes] = timeValue.split(':').map(Number);
      date.setHours(hours, minutes);
      setActivityDate(date);
      setDateTimeEdited(true);
    }
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = e.target.value;
    setTimeValue(time);
    const [hours, minutes] = time.split(':').map(Number);
    const newDate = new Date(activityDate);
    newDate.setHours(hours, minutes);
    setActivityDate(newDate);
    setDateTimeEdited(true);
  };

  // Get display text for collapsed date/time
  const getDateTimeDisplayText = () => {
    if (!dateTimeEdited) {
      return "Now";
    }
    const now = new Date();
    const diffMinutes = Math.abs(differenceInMinutes(now, activityDate));
    
    if (diffMinutes < 2) {
      return "Now";
    }
    
    if (isToday(activityDate)) {
      return `Today, ${format(activityDate, "HH:mm")}`;
    }
    
    return format(activityDate, "MMM d, HH:mm");
  };

  const handleTopicsChange = async (newTopics: string[]) => {
    setTopics(newTopics);
    for (const topic of newTopics) {
      if (!topicSuggestions.includes(topic.toLowerCase())) {
        await addTag('topics', topic);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || saving) return;

    setSaving(true);

    // Auto-set flow state if engagement is 5 and flow toggle is hidden
    const finalInFlow = preferences.hideFlowToggle ? engagement === 5 : inFlow;

    const activityData: Omit<ActivityType, 'id'> = {
      name: name.trim(),
      entryType,
      engagement,
      energy,
      inFlow: entryType === 'event' ? false : finalInFlow,
      notes: notes.trim() || undefined,
      aeiou: Object.values(aeiou).some(v => v && v.length > 0) ? aeiou : undefined,
      topics: !preferences.hideTopics && topics.length > 0 ? topics : undefined,
      feelings: feelings.length > 0 ? feelings : undefined,
      createdAt: activityDate,
    };

    // Check if this is the first activity of the day (for confetti)
    const hadActivityToday = activities.some((a) => isToday(new Date(a.createdAt)));
    const isNewActivityForToday = !isEditing && isToday(activityDate);
    const shouldCelebrate = isNewActivityForToday && !hadActivityToday;

    let success = false;
    if (isEditing && id) {
      success = await updateActivity(id, activityData);
    } else {
      const result = await addActivity(activityData);
      success = !!result;
    }

    setSaving(false);
    if (success) {
      if (shouldCelebrate) {
        fireConfetti('firstDaily');
      }
      navigate('/');
    }
  };

  if (authLoading || activitiesLoading || prefsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // If editing but activity not found
  if (isEditing && !activitiesLoading && !existingActivity) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-[env(safe-area-inset-top)] z-40 bg-background/95 backdrop-blur-lg border-b border-border">
          <div className="max-w-lg mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/')}
                className="p-2 -ml-2 rounded-lg hover:bg-secondary transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-foreground" />
              </button>
              <h1 className="font-semibold text-foreground">Activity not found</h1>
            </div>
          </div>
        </header>
        <main className="max-w-lg mx-auto px-4 py-6">
          <p className="text-muted-foreground">This activity doesn't exist or was deleted.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header 
        className={cn(
          "fixed top-[env(safe-area-inset-top)] left-0 right-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border transition-transform duration-300",
          isHeaderVisible ? "translate-y-0" : "-translate-y-full"
        )}
      >
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-2 -ml-2 rounded-lg hover:bg-secondary transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="font-semibold text-foreground">
              {isEditing ? 'Edit Entry' : 'New Entry'}
            </h1>
          </div>
        </div>
      </header>

      {/* Spacer for fixed header */}
      <div className="h-[60px]" />

      <main className="max-w-lg mx-auto px-4 py-6 pb-24">
        <form onSubmit={handleSubmit} className="flex flex-col min-h-[calc(100vh-5rem)]">
          <div className="flex-1 space-y-6">
            {/* Entry Type Toggle */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                What are you logging?
              </label>
              <div className="flex items-center gap-1 p-1 rounded-full bg-secondary border border-border w-full">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEntryType('activity')}
                  className={`flex-1 rounded-full px-3 py-2 h-auto transition-all ${
                    entryType === 'activity'
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-transparent"
                  }`}
                  data-testid="button-entry-type-activity"
                >
                  I did something
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEntryType('event')}
                  className={`flex-1 rounded-full px-3 py-2 h-auto transition-all ${
                    entryType === 'event'
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-transparent"
                  }`}
                  data-testid="button-entry-type-event"
                >
                  Something happened
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {entryType === 'activity' ? 'What were you doing?' : 'What happened?'}
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={entryType === 'activity' ? 'e.g., Team brainstorming session' : 'e.g., Got unexpected feedback'}
                className="text-base"
                required
                data-testid="input-activity-name"
              />
            </div>

            {/* Collapsible Date/Time Picker */}
            <Collapsible open={dateTimeExpanded} onOpenChange={setDateTimeExpanded}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">
                      {getDateTimeDisplayText()}
                    </span>
                  </div>
                  {dateTimeExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "flex-1 justify-start text-left font-normal",
                          !activityDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(activityDate, "PPP")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={activityDate}
                        onSelect={handleDateSelect}
                        weekStartsOn={1}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      type="time"
                      step={60}
                      value={timeValue}
                      onChange={handleTimeChange}
                      className="pl-10 w-[130px]"
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Topics Tag Selector - conditionally rendered */}
            {!preferences.hideTopics && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-muted-foreground" />
                  <label className="text-sm font-medium text-foreground">
                    Topic
                  </label>
                </div>
                <TagInput
                  tags={topics}
                  onChange={handleTopicsChange}
                  suggestions={topicSuggestions}
                  sortedSuggestions={sortedTopicSuggestions}
                  placeholder="Add a topic..."
                />
              </div>
            )}

            <LikertScale
              value={engagement}
              onChange={setEngagement}
              label="Engagement Level"
              type="engagement"
              entryType={entryType}
            />

            <LikertScale
              value={energy}
              onChange={setEnergy}
              label="Energy Level"
              type="energy"
              entryType={entryType}
            />

            {/* Flow Toggle - conditionally rendered (hidden for events) */}
            {!preferences.hideFlowToggle && entryType === 'activity' && (
              <FlowToggle active={inFlow} onChange={setInFlow} />
            )}

            <AEIOUSection values={aeiou} onChange={setAeiou} />

            <FeelingsSection selectedFeelings={feelings} onChange={setFeelings} />

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Additional Notes (optional)
              </label>
              <Textarea
                ref={notesRef}
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  adjustTextareaHeight(e.target);
                }}
                placeholder="Any other thoughts or reflections..."
                className="min-h-[80px] resize-none overflow-hidden"
              />
            </div>
          </div>

          {/* Sticky Submit Button */}
          <div className="sticky bottom-0 z-[60] mt-6">
            <div className="-mx-4 px-4 py-3 bg-background/95 backdrop-blur-sm border-t border-border">
              <Button
                type="submit"
                className="w-full h-12 text-base font-medium shadow-lg"
                disabled={!name.trim() || saving}
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : isEditing ? (
                  <Save className="w-5 h-5 mr-2" />
                ) : (
                  <Plus className="w-5 h-5 mr-2" />
                )}
                {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Log Entry'}
              </Button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
};

export default Activity;
