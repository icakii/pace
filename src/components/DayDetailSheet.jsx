import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { TaskCheckbox } from "@/components/TaskCheckbox";
import { getTasksForDate, isOccurrenceCompleted, isRecurring, describeRecurrence } from "@/lib/occurrences";

const categoryDot = {
  work: "bg-accent",
  uni: "bg-primary",
  personal: "bg-muted-foreground/50",
};

function formatTime(t) {
  const [h, m] = t.split(":");
  const hour = ((+h + 11) % 12) + 1;
  const suffix = +h < 12 ? "AM" : "PM";
  return `${hour}:${m} ${suffix}`;
}

export default function DayDetailSheet({ date, tasks, onClose, onTaskUpdated }) {
  const handleToggle = async (task) => {
    if (isRecurring(task)) {
      const dateStr = format(date, "yyyy-MM-dd");
      const already = (task.completed_dates || []).includes(dateStr);
      const newDates = already
        ? task.completed_dates.filter((d) => d !== dateStr)
        : [...(task.completed_dates || []), dateStr];
      const { data } = await supabase
        .from("tasks")
        .update({ completed_dates: newDates })
        .eq("id", task.id)
        .select()
        .single();
      if (data) onTaskUpdated(data);
    } else {
      const { data } = await supabase
        .from("tasks")
        .update({ completed: !task.completed })
        .eq("id", task.id)
        .select()
        .single();
      if (data) onTaskUpdated(data);
    }
  };

  const dayTasks = date ? getTasksForDate(tasks, date) : [];

  return (
    <AnimatePresence>
      {date && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[80vh] overflow-y-auto rounded-t-3xl bg-card p-6 shadow-soft-lg md:left-1/2 md:right-auto md:w-full md:max-w-lg md:-translate-x-1/2"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-heading text-2xl font-medium">{format(date, "EEEE, MMMM d")}</h2>
              <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>

            {dayTasks.length === 0 ? (
              <p className="py-10 text-center text-sm italic text-muted-foreground">
                Nothing scheduled — enjoy the quiet. 🌿
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {dayTasks.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 py-3">
                    <TaskCheckbox
                      checked={isOccurrenceCompleted(t, date)}
                      onChange={() => handleToggle(t)}
                    />
                    <div className="flex-1">
                      <span className={`text-sm ${isOccurrenceCompleted(t, date) ? "text-muted-foreground line-through" : ""}`}>
                        {t.title}
                      </span>
                      {isRecurring(t) && (
                        <span className="ml-2 text-xs text-muted-foreground">{describeRecurrence(t)}</span>
                      )}
                    </div>
                    {t.start_time && (
                      <span className="text-xs text-muted-foreground">
                        {formatTime(t.start_time)}{t.end_time ? ` – ${formatTime(t.end_time)}` : ""}
                      </span>
                    )}
                    <span className={`h-2 w-2 rounded-full ${categoryDot[t.category] || "bg-muted"}`} />
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
