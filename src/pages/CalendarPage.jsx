import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, isSameMonth, isToday,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { occursOnDate } from "@/lib/occurrences";
import DayDetailSheet from "@/components/DayDetailSheet";

const categoryDot = {
  work: "bg-accent",
  uni: "bg-primary",
  personal: "bg-muted-foreground/50",
};

export default function CalendarPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .then(({ data }) => setTasks(data || []))
      .finally(() => setLoading(false));
  }, [user]);

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = useMemo(() => {
    const arr = [];
    let d = gridStart;
    while (d <= gridEnd) {
      arr.push(d);
      d = addDays(d, 1);
    }
    return arr;
  }, [gridStart, gridEnd]);

  const tasksByDay = useMemo(() => {
    const map = {};
    days.forEach((d) => {
      const key = format(d, "yyyy-MM-dd");
      map[key] = tasks.filter((t) => occursOnDate(t, d));
    });
    return map;
  }, [tasks, days]);

  const handleTaskUpdated = (updated) => {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-4xl font-medium">{format(cursor, "MMMM yyyy")}</h1>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCursor(addDays(monthStart, -1))}
            className="rounded-lg p-2 text-muted-foreground hover:bg-card hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => setCursor(new Date())}
            className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-card hover:text-foreground transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => setCursor(addDays(monthEnd, 1))}
            className="rounded-lg p-2 text-muted-foreground hover:bg-card hover:text-foreground transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="pb-2 text-center text-xs uppercase tracking-wider text-muted-foreground">
            {d}
          </div>
        ))}
        {days.map((d) => {
          const key = format(d, "yyyy-MM-dd");
          const dayTasks = tasksByDay[key] || [];
          const inMonth = isSameMonth(d, cursor);
          const today = isToday(d);
          return (
            <button
              key={d.toISOString()}
              onClick={() => setSelectedDate(d)}
              className={`flex min-h-[84px] flex-col items-start rounded-2xl p-2.5 text-left transition-all duration-200 ${
                today
                  ? "bg-primary/15 ring-1 ring-primary/40"
                  : inMonth
                  ? "bg-card/60 hover:bg-card"
                  : "bg-transparent text-muted-foreground/50 hover:bg-card/30"
              }`}
            >
              <span className={`font-heading text-sm ${today ? "font-semibold text-primary" : ""}`}>
                {format(d, "d")}
              </span>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {dayTasks.slice(0, 4).map((t) => (
                  <span
                    key={t.id}
                    className={`h-1.5 w-1.5 rounded-full ${categoryDot[t.category] || "bg-muted"}`}
                    title={t.title}
                  />
                ))}
                {dayTasks.length > 4 && (
                  <span className="text-[10px] text-muted-foreground">+{dayTasks.length - 4}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" /> Uni</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-accent" /> Work</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-muted-foreground/50" /> Personal</span>
      </div>

      <DayDetailSheet
        date={selectedDate}
        tasks={tasks}
        onClose={() => setSelectedDate(null)}
        onTaskUpdated={handleTaskUpdated}
      />
    </div>
  );
}
