import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { format, parseISO } from "date-fns";
import { Plus, Trash2, Pencil, Loader2, X, Check, Repeat } from "lucide-react";
import { TaskCheckbox } from "@/components/TaskCheckbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { isRecurring, isOccurrenceCompleted, describeRecurrence } from "@/lib/occurrences";
import { CATEGORIES, categoryDot } from "@/lib/categories";

const WEEKDAYS = [
  { value: "1", label: "Mon" },
  { value: "2", label: "Tue" },
  { value: "3", label: "Wed" },
  { value: "4", label: "Thu" },
  { value: "5", label: "Fri" },
  { value: "6", label: "Sat" },
  { value: "7", label: "Sun" },
];

const INTERVALS = [
  { value: "1", label: "Every week" },
  { value: "2", label: "Every 2 weeks" },
  { value: "3", label: "Every 3 weeks" },
  { value: "4", label: "Every 4 weeks" },
];

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [category, setCategory] = useState("personal");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [repeatOn, setRepeatOn] = useState(false);
  const [repeatDays, setRepeatDays] = useState([]);
  const [repeatInterval, setRepeatInterval] = useState("1");

  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editCategory, setEditCategory] = useState("personal");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("due_date", { ascending: true, nullsFirst: false })
      .then(({ data }) => setTasks(data || []))
      .finally(() => setLoading(false));
  }, [user]);

  const resetForm = () => {
    setTitle("");
    setDueDate("");
    setCategory("personal");
    setStartTime("");
    setEndTime("");
    setRepeatOn(false);
    setRepeatDays([]);
    setRepeatInterval("1");
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (repeatOn && repeatDays.length === 0) return;

    const anchorDate = dueDate || (repeatOn ? format(new Date(), "yyyy-MM-dd") : null);

    setSaving(true);
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        user_id: user.id,
        title: title.trim(),
        due_date: anchorDate,
        category,
        completed: false,
        start_time: startTime || null,
        end_time: startTime && endTime ? endTime : null,
        recurrence_days: repeatOn ? repeatDays.map(Number) : null,
        recurrence_interval: repeatOn ? Number(repeatInterval) : 1,
      })
      .select()
      .single();
    setSaving(false);
    if (!error && data) {
      setTasks((prev) => [...prev, data]);
      resetForm();
    }
  };

  const toggle = async (task) => {
    if (isRecurring(task)) {
      const dateStr = format(new Date(), "yyyy-MM-dd");
      const already = (task.completed_dates || []).includes(dateStr);
      const newDates = already
        ? task.completed_dates.filter((d) => d !== dateStr)
        : [...(task.completed_dates || []), dateStr];
      const { data } = await supabase.from("tasks").update({ completed_dates: newDates }).eq("id", task.id).select().single();
      if (data) setTasks((prev) => prev.map((t) => (t.id === task.id ? data : t)));
    } else {
      const nowCompleted = !task.completed;
      const { data } = await supabase
        .from("tasks")
        .update({ completed: nowCompleted, completed_at: nowCompleted ? new Date().toISOString() : null })
        .eq("id", task.id)
        .select()
        .single();
      if (data) setTasks((prev) => prev.map((t) => (t.id === task.id ? data : t)));
    }
  };

  const remove = async (task) => {
    await supabase.from("tasks").delete().eq("id", task.id);
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
  };

  const startEdit = (task) => {
    setEditingId(task.id);
    setEditTitle(task.title);
    setEditDueDate(task.due_date || "");
    setEditCategory(task.category || "personal");
    setEditStartTime(task.start_time || "");
    setEditEndTime(task.end_time || "");
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (task) => {
    const { data } = await supabase
      .from("tasks")
      .update({
        title: editTitle.trim() || task.title,
        due_date: editDueDate || null,
        category: editCategory,
        start_time: editStartTime || null,
        end_time: editStartTime && editEndTime ? editEndTime : null,
      })
      .eq("id", task.id)
      .select()
      .single();
    if (data) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? data : t)));
    }
    setEditingId(null);
  };

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="font-heading text-4xl md:text-5xl font-medium">Tasks</h1>
        <p className="mt-2 text-muted-foreground">Everything on your plate, in one place.</p>
      </header>

      <form onSubmit={handleAdd} className="flex flex-col gap-4 rounded-3xl bg-card p-5 shadow-soft">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1 space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a task..." required />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              {repeatOn ? "Starts on (optional, defaults to today)" : "Due date"}
            </label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Category</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full md:w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Start time</label>
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">End time</label>
            <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} disabled={!startTime} />
          </div>
          <div className="flex items-center gap-2 pb-1.5">
            <Switch checked={repeatOn} onCheckedChange={setRepeatOn} id="repeat" />
            <label htmlFor="repeat" className="text-sm text-muted-foreground">Repeat</label>
          </div>
          <Button type="submit" disabled={saving} className="md:ml-auto">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add task
          </Button>
        </div>

        {repeatOn && (
          <div className="flex flex-col gap-3 rounded-2xl bg-background/60 p-4 md:flex-row md:items-center">
            <ToggleGroup
              type="multiple"
              value={repeatDays}
              onValueChange={setRepeatDays}
              className="flex-wrap justify-start"
            >
              {WEEKDAYS.map((d) => (
                <ToggleGroupItem key={d.value} value={d.value} variant="outline" size="sm">
                  {d.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <Select value={repeatInterval} onValueChange={setRepeatInterval}>
              <SelectTrigger className="w-full md:w-[160px] md:ml-auto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTERVALS.map((i) => (
                  <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </form>

      <section className="rounded-3xl bg-card p-4 shadow-soft md:p-6">
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-12 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : tasks.length === 0 ? (
          <p className="py-10 text-center text-sm italic text-muted-foreground">No tasks yet — add your first one above. 🌿</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {tasks.map((t) => {
              const completedToday = isOccurrenceCompleted(t, new Date());
              return (
                <li key={t.id} className="flex flex-wrap items-center gap-3 py-3">
                  {editingId === t.id ? (
                    <>
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="flex-1 min-w-[140px]"
                        autoFocus
                      />
                      <Input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} />
                      <Input type="time" value={editStartTime} onChange={(e) => setEditStartTime(e.target.value)} />
                      <Input type="time" value={editEndTime} onChange={(e) => setEditEndTime(e.target.value)} disabled={!editStartTime} />
                      <Select value={editCategory} onValueChange={setEditCategory}>
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((c) => (
                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <button onClick={() => saveEdit(t)} className="rounded-lg p-2 text-primary hover:bg-primary/10" aria-label="Save">
                        <Check className="h-4 w-4" />
                      </button>
                      <button onClick={cancelEdit} className="rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label="Cancel">
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <TaskCheckbox checked={completedToday} onChange={() => toggle(t)} />
                      <div className="flex-1">
                        <span className={`text-sm ${completedToday ? "text-muted-foreground line-through" : ""}`}>
                          {t.title}
                        </span>
                        {isRecurring(t) && (
                          <span className="ml-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Repeat className="h-3 w-3" />{describeRecurrence(t)}
                          </span>
                        )}
                      </div>
                      {t.due_date && !isRecurring(t) && (
                        <span className="text-xs text-muted-foreground">
                          {format(parseISO(t.due_date), "EEE, MMM d")}
                        </span>
                      )}
                      {t.start_time && (
                        <span className="text-xs text-muted-foreground">
                          {t.start_time.slice(0, 5)}{t.end_time ? `–${t.end_time.slice(0, 5)}` : ""}
                        </span>
                      )}
                      <span className={`h-2 w-2 rounded-full ${categoryDot[t.category] || "bg-muted"}`} />
                      <button onClick={() => startEdit(t)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => remove(t)} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
