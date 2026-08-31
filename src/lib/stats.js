import { format, parseISO, subDays, differenceInCalendarDays } from "date-fns";
import { isRecurring } from "@/lib/occurrences";

const STREAK_THRESHOLD = 3;

export function countTotalCompleted(tasks) {
  let total = 0;
  for (const t of tasks) {
    if (isRecurring(t)) {
      total += (t.completed_dates || []).length;
    } else if (t.completed) {
      total += 1;
    }
  }
  return total;
}

export function getCompletionsForDate(tasks, date) {
  const dateStr = format(date, "yyyy-MM-dd");
  let count = 0;
  for (const t of tasks) {
    if (isRecurring(t)) {
      if ((t.completed_dates || []).includes(dateStr)) count += 1;
    } else if (t.completed && t.completed_at) {
      if (format(parseISO(t.completed_at), "yyyy-MM-dd") === dateStr) count += 1;
    }
  }
  return count;
}

export function computeStreak(tasks) {
  let day = new Date();
  if (getCompletionsForDate(tasks, day) < STREAK_THRESHOLD) {
    day = subDays(day, 1);
  }

  let streak = 0;
  while (getCompletionsForDate(tasks, day) >= STREAK_THRESHOLD) {
    streak += 1;
    day = subDays(day, 1);
  }
  return streak;
}

export function daysSince(dateString) {
  if (!dateString) return 1;
  return differenceInCalendarDays(new Date(), parseISO(dateString)) + 1;
}

export const STREAK_MIN = STREAK_THRESHOLD;
