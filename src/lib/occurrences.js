import { format, parseISO, getISODay, differenceInCalendarWeeks } from "date-fns";

export function isRecurring(task) {
  return Array.isArray(task.recurrence_days) && task.recurrence_days.length > 0;
}

export function occursOnDate(task, date) {
  const dateStr = format(date, "yyyy-MM-dd");

  if (!isRecurring(task)) {
    return task.due_date === dateStr;
  }

  if (!task.due_date) return false;
  const anchor = parseISO(task.due_date);
  if (date < anchor) return false;

  const isoWeekday = getISODay(date);
  if (!task.recurrence_days.includes(isoWeekday)) return false;

  const weeksSinceAnchor = differenceInCalendarWeeks(date, anchor, { weekStartsOn: 1 });
  const interval = task.recurrence_interval || 1;
  return weeksSinceAnchor % interval === 0;
}

export function isOccurrenceCompleted(task, date) {
  if (!isRecurring(task)) return !!task.completed;
  const dateStr = format(date, "yyyy-MM-dd");
  return (task.completed_dates || []).includes(dateStr);
}

export function getTasksForDate(tasks, date) {
  return tasks
    .filter((t) => occursOnDate(t, date))
    .sort((a, b) => {
      if (!a.start_time && !b.start_time) return 0;
      if (!a.start_time) return -1;
      if (!b.start_time) return 1;
      return a.start_time.localeCompare(b.start_time);
    });
}

const WEEKDAY_LABELS = { 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat", 7: "Sun" };

export function describeRecurrence(task) {
  if (!isRecurring(task)) return null;
  const days = task.recurrence_days.map((d) => WEEKDAY_LABELS[d]).join(", ");
  const interval = task.recurrence_interval || 1;
  if (interval === 1) return `Every ${days}`;
  if (interval === 2) return `Every other ${days}`;
  return `Every ${interval} weeks on ${days}`;
}
