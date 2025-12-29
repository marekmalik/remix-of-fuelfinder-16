import { useState } from "react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Activity, AEIOUDetails, LikertLevel } from "@/types/activity";
import LikertScale from "./LikertScale";
import FlowToggle from "./FlowToggle";
import AEIOUSection from "./AEIOUSection";
import FeelingsSection from "./FeelingsSection";
import TagInput from "./TagInput";
import { useUserTags } from "@/hooks/useUserTags";
import { useTagFrequencies } from "@/hooks/useTagFrequencies";
import { Plus, X, Tag, CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActivityFormProps {
  onSubmit: (activity: Omit<Activity, 'id'>) => void;
  onCancel: () => void;
}

const ActivityForm = ({ onSubmit, onCancel }: ActivityFormProps) => {
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
  
  const { getTagsByCategory, addTag } = useUserTags();
  const { sortByFrequency } = useTagFrequencies();
  const topicSuggestions = getTagsByCategory('topics');
  const sortedTopicSuggestions = sortByFrequency('topics', topicSuggestions);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const [hours, minutes] = timeValue.split(':').map(Number);
      date.setHours(hours, minutes);
      setActivityDate(date);
    }
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = e.target.value;
    setTimeValue(time);
    const [hours, minutes] = time.split(':').map(Number);
    const newDate = new Date(activityDate);
    newDate.setHours(hours, minutes);
    setActivityDate(newDate);
  };

  const handleTopicsChange = async (newTopics: string[]) => {
    setTopics(newTopics);
    // Auto-save new topics to user's tag library
    for (const topic of newTopics) {
      if (!topicSuggestions.includes(topic.toLowerCase())) {
        await addTag('topics', topic);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSubmit({
      name: name.trim(),
      engagement,
      energy,
      inFlow,
      notes: notes.trim() || undefined,
      aeiou: Object.values(aeiou).some(v => v && v.length > 0) ? aeiou : undefined,
      topics: topics.length > 0 ? topics : undefined,
      feelings: feelings.length > 0 ? feelings : undefined,
      createdAt: activityDate,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="animate-slide-up min-h-[calc(100vh-11rem)] flex flex-col pb-[calc(var(--bottom-nav-height)+1rem)]"
    >
      <div className="flex-1 space-y-6 pb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">New Activity</h2>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-full hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            What were you doing?
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Team brainstorming session"
            className="text-base"
            required
          />
        </div>

        {/* Date/Time Picker */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-muted-foreground" />
            <label className="text-sm font-medium text-foreground">
              When did this happen?
            </label>
          </div>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
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
        </div>

        {/* Topics Tag Selector */}
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

        <div className="space-y-5 p-4 rounded-xl bg-secondary/30">
          <LikertScale
            value={engagement}
            onChange={setEngagement}
            label="Engagement Level"
            type="engagement"
          />

          <div className="border-t border-border/50" />

          <LikertScale
            value={energy}
            onChange={setEnergy}
            label="Energy Level"
            type="energy"
          />
        </div>

        <FlowToggle active={inFlow} onChange={setInFlow} />

        <AEIOUSection values={aeiou} onChange={setAeiou} />

        <FeelingsSection selectedFeelings={feelings} onChange={setFeelings} />

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Additional Notes (optional)
          </label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any other thoughts or reflections..."
            className="min-h-[80px] resize-none"
          />
        </div>
      </div>

      {/* Sticky Submit Button: stays at viewport bottom while scrolling; docks at end of form */}
      <div className="sticky bottom-[var(--bottom-nav-height)] z-[60]">
        <div className="-mx-4 px-4 py-2 bg-background/95 backdrop-blur-sm border-t border-border">
          <Button
            type="submit"
            className="w-full h-12 text-base font-medium shadow-lg"
            disabled={!name.trim()}
          >
            <Plus className="w-5 h-5 mr-2" />
            Log Activity
          </Button>
        </div>
      </div>
    </form>
  );
};

export default ActivityForm;
