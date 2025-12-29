import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Activity } from '@/types/activity';
import { startOfDay, subDays, format, isSameDay } from 'date-fns';

interface StreakSectionProps {
  streak: number;
  hasActivityToday: boolean;
  activities: Activity[];
}

const StreakSection = ({ streak, hasActivityToday, activities }: StreakSectionProps) => {
  const today = new Date();
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(today, 6 - i);
    return {
      date,
      dayName: format(date, 'EEE').toUpperCase().slice(0, 2),
      dayNumber: format(date, 'd'),
      isToday: isSameDay(date, today),
      hasActivity: activities.some(a => 
        isSameDay(startOfDay(new Date(a.createdAt)), startOfDay(date))
      ),
    };
  });

  return (
    <div className="rounded-xl border border-border p-4 space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground">Streak</h3>
      
      {/* Streak Display */}
      <div className="flex items-center justify-center gap-3 py-2">
        <Flame className={cn(
          'w-8 h-8',
          streak > 0 ? 'text-orange-500' : 'text-muted-foreground'
        )} />
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold tabular-nums text-foreground">
            {streak}
          </span>
          <span className="text-lg text-muted-foreground">
            day{streak !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Week Calendar */}
      <div className="flex justify-between gap-1">
        {weekDays.map(({ date, dayName, dayNumber, isToday, hasActivity }) => (
          <div
            key={date.toISOString()}
            className="flex-1 flex flex-col items-center gap-1.5"
          >
            <span className="text-xs text-muted-foreground">
              {dayName}
            </span>
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center text-sm transition-all',
                hasActivity
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'bg-transparent text-muted-foreground border-2 border-dashed border-muted-foreground/30',
                isToday && !hasActivity && 'border-primary/50'
              )}
            >
              {dayNumber}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StreakSection;
