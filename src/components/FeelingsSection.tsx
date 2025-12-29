import { useState } from "react";
import { ChevronDown, Heart, Sun, Cloud } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeelingsSectionProps {
  selectedFeelings: string[];
  onChange: (feelings: string[]) => void;
}

interface Feeling {
  name: string;
  description: string;
}

const PLEASANT_FEELINGS: Feeling[] = [
  { name: "Joyful", description: "I feel bright and happy inside, like I could smile or laugh easily." },
  { name: "Content", description: "I feel satisfied with how things are right now." },
  { name: "Peaceful", description: "I feel calm and settled in myself." },
  { name: "Relieved", description: "I feel tension leaving my body because something hard just got easier." },
  { name: "Grateful", description: "I feel thankful for what I got or what someone did for me." },
  { name: "Hopeful", description: "I feel like things can go well, and I can imagine a good next step." },
  { name: "Confident", description: "I feel sure I can handle this, even if it takes effort." },
  { name: "Safe", description: "I feel protected and not in danger, so I can relax." },
  { name: "Connected", description: "I feel close to someone, like we are together in this." },
  { name: "Loved", description: "I feel cared for and important to someone." },
  { name: "Inspired", description: "I feel energized by an idea or meaning, and I want to do something." },
  { name: "Curious", description: "I feel interested, and I want to learn more or understand." },
  { name: "Proud", description: "I feel good about what I did and how I showed up." },
  { name: "Eager", description: "I feel excited to start, and I want to move forward." },
  { name: "Playful", description: "I feel light and fun, like I want to joke or play." },
  { name: "Moved", description: "I feel my heart soften because something kind or beautiful happened." },
  { name: "Accepted", description: "I feel okay as I am, and I don't need to pretend." },
  { name: "Empowered", description: "I feel I have choices and I can make things happen." },
  { name: "Tender", description: "I feel gentle and warm, and I want to be kind." },
  { name: "Grounded", description: "I feel steady and present, like I'm here and I can breathe." },
];

const UNPLEASANT_FEELINGS: Feeling[] = [
  { name: "Sad", description: "I feel heavy inside, like something matters to me and it hurts." },
  { name: "Grief-stricken", description: "I feel deep pain and sorrow, like I lost something important." },
  { name: "Lonely", description: "I feel alone and not connected, like I'm on my own." },
  { name: "Anxious", description: "I feel worried and restless, like my mind can't stop thinking about what might happen." },
  { name: "Afraid", description: "I feel scared, like something could harm me or go badly." },
  { name: "Overwhelmed", description: "I feel like it's too much, and I can't take it all in right now." },
  { name: "Stressed", description: "I feel pressured and tight, like there's too much on me." },
  { name: "Frustrated", description: "I feel stuck, like I keep trying and it's not working." },
  { name: "Angry", description: "I feel hot or charged inside because something feels wrong or unfair." },
  { name: "Irritated", description: "I feel annoyed, and small things bother me more than usual." },
  { name: "Resentful", description: "I feel bitter because I think I'm carrying more than my share." },
  { name: "Hurt", description: "I feel a sting inside, like something someone did or said affected me." },
  { name: "Rejected", description: "I feel not wanted or not chosen, and it hurts." },
  { name: "Ashamed", description: "I feel like something is wrong with me, and I want to hide." },
  { name: "Guilty", description: "I feel bad about what I did because I think it hurt someone or broke my values." },
  { name: "Embarrassed", description: "I feel exposed and awkward, like people saw something I didn't want them to see." },
  { name: "Jealous", description: "I feel scared of losing someone's love or attention to someone else." },
  { name: "Envious", description: "I feel bad because I want what someone else has." },
  { name: "Disappointed", description: "I feel let down because I hoped for something different." },
  { name: "Numb", description: "I feel shut down, like I can't feel much right now." },
];

const FeelingTile = ({ 
  feeling, 
  isSelected, 
  onToggle 
}: { 
  feeling: Feeling; 
  isSelected: boolean; 
  onToggle: () => void;
}) => (
  <button
    type="button"
    onClick={onToggle}
    data-testid={`feeling-tile-${feeling.name.toLowerCase().replace(/\s+/g, '-')}`}
    className={cn(
      "w-full text-left p-3 rounded-lg border transition-all duration-200",
      isSelected 
        ? "border-primary bg-primary/10" 
        : "border-border bg-card hover:bg-secondary/50"
    )}
  >
    <p className={cn(
      "text-sm font-medium",
      isSelected ? "text-primary" : "text-foreground"
    )}>
      {feeling.name}
    </p>
    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
      {feeling.description}
    </p>
  </button>
);

const FeelingsCategory = ({
  title,
  icon: Icon,
  feelings,
  selectedFeelings,
  onToggle,
  iconColorClass,
}: {
  title: string;
  icon: typeof Sun;
  feelings: Feeling[];
  selectedFeelings: string[];
  onToggle: (feeling: string) => void;
  iconColorClass: string;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const selectedInCategory = feelings.filter(f => selectedFeelings.includes(f.name)).length;

  return (
    <div className={cn(
      "rounded-xl border overflow-hidden transition-all duration-300",
      selectedInCategory > 0 ? "border-primary/30 bg-primary/5" : "border-border bg-card"
    )}>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        data-testid={`button-feelings-${title.toLowerCase()}`}
        className="w-full flex items-center gap-3 p-3"
      >
        <Icon className={cn("w-4 h-4", iconColorClass)} />
        <span className={cn(
          "text-sm font-medium flex-1 text-left",
          selectedInCategory > 0 ? "text-foreground" : "text-muted-foreground"
        )}>
          {title}
          {selectedInCategory > 0 && (
            <span className="ml-2 text-xs text-primary">({selectedInCategory})</span>
          )}
        </span>
        <ChevronDown className={cn(
          "w-4 h-4 text-muted-foreground transition-transform duration-200",
          isExpanded && "rotate-180"
        )} />
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-2 animate-fade-in">
          <div className="grid gap-2">
            {feelings.map((feeling) => (
              <FeelingTile
                key={feeling.name}
                feeling={feeling}
                isSelected={selectedFeelings.includes(feeling.name)}
                onToggle={() => onToggle(feeling.name)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const FeelingsSection = ({ selectedFeelings, onChange }: FeelingsSectionProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleFeeling = (feeling: string) => {
    if (selectedFeelings.includes(feeling)) {
      onChange(selectedFeelings.filter(f => f !== feeling));
    } else {
      onChange([...selectedFeelings, feeling]);
    }
  };

  const totalSelected = selectedFeelings.length;

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        data-testid="button-feelings-section"
        className="w-full flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-secondary/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-pink-500/10 flex items-center justify-center">
            <Heart className="w-5 h-5 text-pink-500" />
          </div>
          <div className="text-left">
            <p className="font-medium text-foreground">Feelings</p>
            <p className="text-xs text-muted-foreground">
              {totalSelected > 0 ? `${totalSelected} feeling${totalSelected > 1 ? 's' : ''} selected` : 'Optional emotional awareness'}
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
          <FeelingsCategory
            title="Pleasant Feelings"
            icon={Sun}
            feelings={PLEASANT_FEELINGS}
            selectedFeelings={selectedFeelings}
            onToggle={toggleFeeling}
            iconColorClass="text-amber-500"
          />
          <FeelingsCategory
            title="Unpleasant Feelings"
            icon={Cloud}
            feelings={UNPLEASANT_FEELINGS}
            selectedFeelings={selectedFeelings}
            onToggle={toggleFeeling}
            iconColorClass="text-slate-500"
          />
        </div>
      )}
    </div>
  );
};

export default FeelingsSection;
