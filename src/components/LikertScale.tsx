import { cn } from "@/lib/utils";
import { LikertLevel, EntryType } from "@/types/activity";

interface LikertScaleProps {
  value: LikertLevel;
  onChange: (value: LikertLevel) => void;
  label: string;
  type: 'energy' | 'engagement';
  entryType?: EntryType;
}

const likertLabels = {
  energy: [
    { level: 1, label: 'Very Drained', short: 'Very Low' },
    { level: 2, label: 'Drained', short: 'Low' },
    { level: 3, label: 'Neutral', short: 'Neutral' },
    { level: 4, label: 'Energized', short: 'High' },
    { level: 5, label: 'Very Energized', short: 'Very High' },
  ],
  engagement: [
    { level: 1, label: 'Very Disengaged', short: 'Very Low' },
    { level: 2, label: 'Disengaged', short: 'Low' },
    { level: 3, label: 'Neutral', short: 'Neutral' },
    { level: 4, label: 'Engaged', short: 'High' },
    { level: 5, label: 'Very Engaged', short: 'Very High' },
  ],
};

const behavioralIndicators = {
  activity: {
    energy: {
      1: "The activity takes energy from me; I feel heavy and my energy drops fast.",
      2: "The activity slowly drains me; I can continue, but I feel myself fading.",
      3: "The activity neither drains nor fuels me; my energy stays about the same.",
      4: "The activity gives me energy; I feel more awake and lively while doing it.",
      5: "The activity strongly fuels me; I feel driven, could go faster or longer, and my energy stays high or even grows.",
    },
    engagement: {
      1: "My mind is somewhere else; I avoid the activity or push myself to get through it.",
      2: "I touch the activity briefly, but my attention keeps drifting away.",
      3: "I stay with the activity and do what's needed, without pulling away or going deeper.",
      4: "I'm focused on the activity and can stay with it without effort.",
      5: "I'm fully absorbed; I naturally go deeper and forget about other things.",
    },
  },
  event: {
    energy: {
      1: "This left me feeling heavy and depleted; my energy dropped fast.",
      2: "This slowly drained me; I felt myself fading afterward.",
      3: "This didn't really affect my energy; I felt about the same.",
      4: "This gave me a boost; I felt more awake and lively.",
      5: "This strongly energized me; I felt driven and my energy stayed high or even grew.",
    },
    engagement: {
      1: "My mind was somewhere else; I couldn't focus on what was happening.",
      2: "I noticed it briefly, but my attention kept drifting away.",
      3: "I was present and aware, without pulling away or going deeper.",
      4: "I was focused on what happened and could stay with it without effort.",
      5: "I was fully absorbed; I naturally went deeper and forgot about other things.",
    },
  },
};

const LikertScale = ({ value, onChange, label, type, entryType = 'activity' }: LikertScaleProps) => {
  const labels = likertLabels[type];
  const indicators = behavioralIndicators[entryType][type];
  
  const getColorClass = (level: number) => {
    if (type === 'energy') {
      if (level <= 2) return { bg: 'bg-energy-low', border: 'border-energy-low', text: 'text-energy-low' };
      if (level === 3) return { bg: 'bg-energy-medium', border: 'border-energy-medium', text: 'text-energy-medium' };
      return { bg: 'bg-energy-high', border: 'border-energy-high', text: 'text-energy-high' };
    }
    if (level <= 2) return { bg: 'bg-engagement-low', border: 'border-engagement-low', text: 'text-engagement-low' };
    if (level === 3) return { bg: 'bg-engagement-medium', border: 'border-engagement-medium', text: 'text-engagement-medium' };
    return { bg: 'bg-engagement-high', border: 'border-engagement-high', text: 'text-engagement-high' };
  };

  const selectedLabel = labels.find(l => l.level === value);
  const selectedColors = getColorClass(value);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">{label}</label>
        <span className={cn(
          "text-xs font-medium px-2.5 py-1 rounded-full transition-colors duration-300",
          selectedColors.bg,
          "text-primary-foreground"
        )}>
          {selectedLabel?.label}
        </span>
      </div>
      
      <div className="flex gap-2">
        {labels.map((item) => {
          const isSelected = value === item.level;
          const colors = getColorClass(item.level);
          
          return (
            <button
              key={item.level}
              type="button"
              onClick={() => onChange(item.level as LikertLevel)}
              className={cn(
                "flex-1 py-3 px-2 rounded-lg border-2 transition-all duration-200 text-center",
                isSelected 
                  ? cn(colors.bg, "border-transparent text-primary-foreground shadow-md scale-105")
                  : "bg-secondary/30 border-border hover:border-primary/30 text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="text-lg font-bold block">{item.level}</span>
              <span className="text-[10px] leading-tight block mt-0.5">{item.short}</span>
            </button>
          );
        })}
      </div>
      
      <p className="text-xs text-muted-foreground italic leading-relaxed">
        {indicators[value as keyof typeof indicators]}
      </p>
    </div>
  );
};

export default LikertScale;
