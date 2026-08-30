import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { format, startOfWeek, addDays, isToday, parseISO, isAfter } from "date-fns";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { TaskCheckbox } from "@/components/TaskCheckbox";

const QUOTE = {
  text: "Almost everything will work again if you unplug it for a few minutes — including you.",
  author: "Anne Lamott",
};

const categoryDot = {
  work: "bg-accent",
  uni: "bg-primary",
  personal: "bg-muted-foreground/50",
};

export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Task.list("-due_date", 60)
      .then(setTasks)
      .finally(() => setLoading(false));
  }, []);

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const upcoming = tasks
    .filter((t) => !t.completed)
    .sort((a, b) => {
      const da = a.due_date ? new Date(a.due_date) : new Date(8640000000000000);
      const db = b.due_date ? new Date(b.due_date) : new Date(8640000000000000);
      return da - db;
    })
    .slice(0, 6);

  const toggle = async (task) => {
    const updated = await base44.entities.Task.update(task.id, { completed: !task.completed });
    setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
  };

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
          {format(today, "EEEE")}
        </p>
        <h1 className="mt-1 font-heading text-5xl md:text-6xl font-medium leading-tight text-foreground">
          {format(today, "MMMM d")}
        </h1>
        <p className="mt-2 text-muted-foreground">{format(today, "yyyy")}</p>
      </header>

      <section className="grid grid-cols-7 gap-2">
        {weekDays.map((d) => {
          const active = isToday(d);
          return (
            <div
              key={d.toISOString()}
              className={`flex flex-col items-center rounded-2xl py-3 transition-all duration-200 ${
                active ? "bg-primary text-primary-foreground shadow-soft" : "bg-card/60 hover:bg-card"
              }`}
            >
              <span className="text-[10px] uppercase tracking-wider opacity-70">
                {format(d, "EEE")}
              </span>
              <span className="mt-1 font-heading text-lg font-medium">{format(d, "d")}</span>
            </div>
          );
        })}
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="lg:col-span-3 rounded-3xl bg-card p-6 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-xl font-medium">Upcoming</h2>
            <Link to="/tasks" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
              all tasks <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => <div key={i} className="h-10 rounded-xl bg-muted animate-pulse" />)}
            </div>
          ) : upcoming.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground italic">
              Nothing pressing. Take a breath. 🌿
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {upcoming.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-background/60 transition-colors"
                >
                  <TaskCheckbox checked={t.completed} onChange={() => toggle(t)} />
                  <span className="flex-1 text-sm">{t.title}</span>
                  {t.due_date && (
                    <span className="text-xs text-muted-foreground">
                      {format(parseISO(t.due_date), "EEE, MMM d")}
                    </span>
                  )}
                  <span className={`h-2 w-2 rounded-full ${categoryDot[t.category] || "bg-muted"}`} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="lg:col-span-2 flex flex-col justify-between rounded-3xl bg-gradient-to-br from-primary/15 to-accent/10 p-6 shadow-soft">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Today's note</p>
          <blockquote className="my-4 font-heading text-xl italic leading-relaxed text-foreground">
            "{QUOTE.text}"
          </blockquote>
          <p className="text-sm text-muted-foreground">— {QUOTE.author}</p>
        </section>
      </div>
    </div>
  );
}
