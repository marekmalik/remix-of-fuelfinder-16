import { useMemo } from 'react';
import { Activity } from '@/types/activity';
import { startOfDay, differenceInCalendarDays, isToday, isYesterday } from 'date-fns';

interface StreakData {
  currentStreak: number;
  hasActivityToday: boolean;
  longestStreak: number;
}

export const useStreak = (activities: Activity[]): StreakData => {
  return useMemo(() => {
    if (activities.length === 0) {
      return { currentStreak: 0, hasActivityToday: false, longestStreak: 0 };
    }

    // Group activities by day (using start of day for consistent comparison)
    const activityDays = new Set<string>();
    activities.forEach((activity) => {
      const dayKey = startOfDay(new Date(activity.createdAt)).toISOString();
      activityDays.add(dayKey);
    });

    // Convert to sorted array of dates (most recent first)
    const sortedDays = Array.from(activityDays)
      .map((d) => new Date(d))
      .sort((a, b) => b.getTime() - a.getTime());

    if (sortedDays.length === 0) {
      return { currentStreak: 0, hasActivityToday: false, longestStreak: 0 };
    }

    const today = startOfDay(new Date());
    const mostRecentDay = sortedDays[0];
    const hasActivityToday = isToday(mostRecentDay);

    // Calculate current streak
    let currentStreak = 0;
    let checkDate = today;

    // If no activity today, start checking from yesterday
    if (!hasActivityToday) {
      if (!isYesterday(mostRecentDay)) {
        // Streak is broken - most recent activity is older than yesterday
        currentStreak = 0;
      } else {
        checkDate = startOfDay(new Date(Date.now() - 24 * 60 * 60 * 1000));
      }
    }

    // Count consecutive days
    if (hasActivityToday || isYesterday(mostRecentDay)) {
      for (const day of sortedDays) {
        const diff = differenceInCalendarDays(checkDate, day);
        if (diff === 0) {
          currentStreak++;
          checkDate = startOfDay(new Date(checkDate.getTime() - 24 * 60 * 60 * 1000));
        } else if (diff > 0) {
          // Gap found, streak ends
          break;
        }
      }
    }

    // Calculate longest streak
    let longestStreak = 0;
    let tempStreak = 1;
    
    for (let i = 0; i < sortedDays.length - 1; i++) {
      const diff = differenceInCalendarDays(sortedDays[i], sortedDays[i + 1]);
      if (diff === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak, currentStreak);

    return { currentStreak, hasActivityToday, longestStreak };
  }, [activities]);
};
