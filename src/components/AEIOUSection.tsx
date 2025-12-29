import { useState, useEffect, useRef } from "react";
import { ChevronDown, Activity, MapPin, Users, Box, User, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { AEIOUDetails } from "@/types/activity";
import TagInput from "./TagInput";
import { useUserTags, TagCategory } from "@/hooks/useUserTags";
import { useTagFrequencies } from "@/hooks/useTagFrequencies";

interface AEIOUSectionProps {
  values: AEIOUDetails;
  onChange: (values: AEIOUDetails) => void;
}

// These will be auto-saved as user tags on first load
const AEIOU_SEED_TAGS: Record<TagCategory, string[]> = {
  topics: [],
  activities: ['writing', 'reading', 'coding', 'designing', 'meeting', 'brainstorming', 'presenting', 'reviewing', 'planning', 'researching'],
  environments: ['home', 'office', 'coffee shop', 'outdoors', 'meeting room', 'co-working', 'library', 'commute', 'remote', 'quiet'],
  interactions: ['solo', '1:1', 'small group', 'large group', 'collaborative', 'mentoring', 'learning', 'teaching', 'virtual', 'in-person'],
  objects: ['laptop', 'phone', 'whiteboard', 'notebook', 'pen', 'tablet', 'camera', 'microphone', 'headphones', 'software'],
  users: ['colleagues', 'manager', 'clients', 'stakeholders', 'team', 'mentor', 'mentee', 'customers', 'partners', 'executives'],
};

const aeiouQuestions = [
  {
    key: 'activities' as const,
    tagCategory: 'activities' as TagCategory,
    label: 'Activities',
    icon: Activity,
    question: 'What were you doing? What actions or tasks were involved?',
    placeholder: 'e.g., writing, brainstorming, presenting...',
  },
  {
    key: 'environments' as const,
    tagCategory: 'environments' as TagCategory,
    label: 'Environments',
    icon: MapPin,
    question: 'Where were you? What was the setting like?',
    placeholder: 'e.g., home, office, coffee shop...',
  },
  {
    key: 'interactions' as const,
    tagCategory: 'interactions' as TagCategory,
    label: 'Interactions',
    icon: Users,
    question: 'What interactions took place? Collaboration, solo work?',
    placeholder: 'e.g., 1:1, team, solo...',
  },
  {
    key: 'objects' as const,
    tagCategory: 'objects' as TagCategory,
    label: 'Objects',
    icon: Box,
    question: 'What objects or tools were you using?',
    placeholder: 'e.g., laptop, whiteboard, notebook...',
  },
  {
    key: 'users' as const,
    tagCategory: 'users' as TagCategory,
    label: 'Users',
    icon: User,
    question: 'Who was involved? What were their roles?',
    placeholder: 'e.g., colleagues, clients, manager...',
  }
];

const AEIOUSection = ({ values, onChange }: AEIOUSectionProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const { tags, loading, getTagsByCategory, addTag, seedTags } = useUserTags();
  const { sortByFrequency } = useTagFrequencies();
  const hasSeeded = useRef(false);

  // Auto-seed AEIOU tags on first load if user has no AEIOU tags
  useEffect(() => {
    if (loading || hasSeeded.current) return;
    
    // Check if user has any AEIOU tags (excluding topics)
    const aeiouCategories: TagCategory[] = ['activities', 'environments', 'interactions', 'objects', 'users'];
    const hasAeiouTags = tags.some(t => aeiouCategories.includes(t.category));
    
    if (!hasAeiouTags) {
      hasSeeded.current = true;
      seedTags(AEIOU_SEED_TAGS);
    }
  }, [loading, tags, seedTags]);

  const toggleItem = (key: string) => {
    setExpandedItems(prev => 
      prev.includes(key) 
        ? prev.filter(k => k !== key)
        : [...prev, key]
    );
  };

  const handleChange = async (key: keyof AEIOUDetails, tagCategory: TagCategory, tags: string[]) => {
    onChange({ ...values, [key]: tags.length > 0 ? tags : undefined });
    
    // Auto-save new tags to user's tag library
    const userTags = getTagsByCategory(tagCategory);
    for (const tag of tags) {
      if (!userTags.includes(tag.toLowerCase())) {
        await addTag(tagCategory, tag);
      }
    }
  };

  const filledCount = Object.values(values).filter(v => v && v.length > 0).length;
  const totalTags = Object.values(values).reduce((sum, arr) => sum + (arr?.length || 0), 0);

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-secondary/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Layers className="w-5 h-5 text-primary" />
          </div>
          <div className="text-left">
            <p className="font-medium text-foreground">AEIOU Details</p>
            <p className="text-xs text-muted-foreground">
              {totalTags > 0 ? `${totalTags} tags in ${filledCount}/5 categories` : 'Optional deeper reflection'}
            </p>
          </div>
        </div>
        <ChevronDown className={cn(
          "w-5 h-5 text-muted-foreground transition-transform duration-300",
          isExpanded && "rotate-180"
        )} />
      </button>

      {isExpanded && (
        <div className="space-y-2 animate-fade-in">
          {aeiouQuestions.map((item) => {
            const Icon = item.icon;
            const isItemExpanded = expandedItems.includes(item.key);
            const currentTags = values[item.key] || [];
            const hasValue = currentTags.length > 0;
            const suggestions = getTagsByCategory(item.tagCategory);
            const sortedSuggestions = sortByFrequency(item.tagCategory, suggestions);

            return (
              <div 
                key={item.key}
                className={cn(
                  "rounded-xl border overflow-visible transition-all duration-300",
                  hasValue ? "border-primary/30 bg-primary/5" : "border-border bg-card"
                )}
              >
                <button
                  type="button"
                  onClick={() => toggleItem(item.key)}
                  className="w-full flex items-center gap-3 p-3"
                >
                  <Icon className={cn(
                    "w-4 h-4",
                    hasValue ? "text-primary" : "text-muted-foreground"
                  )} />
                  <span className={cn(
                    "text-sm font-medium flex-1 text-left",
                    hasValue ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {item.label}
                    {hasValue && (
                      <span className="ml-2 text-xs text-primary">({currentTags.length})</span>
                    )}
                  </span>
                  <ChevronDown className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform duration-200",
                    isItemExpanded && "rotate-180"
                  )} />
                </button>

                {isItemExpanded && (
                  <div className="px-3 pb-3 space-y-2 animate-fade-in">
                    <p className="text-xs text-muted-foreground">{item.question}</p>
                    <TagInput
                      tags={currentTags}
                      onChange={(tags) => handleChange(item.key, item.tagCategory, tags)}
                      placeholder={item.placeholder}
                      suggestions={suggestions}
                      sortedSuggestions={sortedSuggestions}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AEIOUSection;
