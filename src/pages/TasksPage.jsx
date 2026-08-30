import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { format, parseISO } from "date-fns";
import { Plus, Trash2, Pencil, Loader2, X, Check } from "lucide-react";
import { TaskCheckbox } from "@/components/TaskCheckbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const CATEGORIES = [
  { value: "personal", label: "Personal" },
  { value: "work", label: "Work" },
  { value: "uni", label: "Uni" },
];

const categoryDot = {
  work: "bg-accent",
  uni: "bg-primary",
  personal: "bg-muted-foreground/50",
};

function selectClass() {
  return "flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";
}

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [category, setCategory] = useState("personal");

  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editCategory, setEditCategory] = useState("personal");

  const loadTasks = () => {
    if (!user) return;
    supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("due_date", { ascending: true, nullsFirst: false })
      .then(({ data }) => setTasks(data || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        user_id: user.id,
        title: title.trim(),
        due_date: dueDate || null,
        category,
        completed: false,
      })
      .select()
      .single();
    setSaving(false);
    if (!error && data) {
      setTasks((prev) => [...prev, data]);
      setTitle("");
      setDueDate("");
      setCategory("personal");
    }
  };

  const toggle = async (task) => {
    const { data } = await supabase
      .from("tasks")
      .update({ completed: !task.completed })
      .eq("id", task.id)
      .select()
      .single();
    if (data) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? data : t)));
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
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (task) => {
    const { data } = await supabase
      .from("tasks")
      .update({
        title: editTitle.trim() || task.title,
        due_date: editDueDate || null,
        category: editCategory,
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

      <form onSubmit={handleAdd} className="flex flex-col gap-3 rounded-3xl bg-card p-5 shadow-soft md:flex-row md:items-end">
        <div className="flex-1 space-y-1.5">
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Title</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add a task..."
            required
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Due date</label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full md:w-auto" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Category</label>
          <select className={selectClass()} value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={saving} className="shrink-0">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add task
        </Button>
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
            {tasks.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-3 py-3">
                {editingId === t.id ? (
                  <>
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="flex-1 min-w-[140px]"
                      autoFocus
                    />
                    <Input
                      type="date"
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                    />
                    <select className={selectClass()} value={editCategory} onChange={(e) => setEditCategory(e.target.value)}>
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                    <button onClick={() => saveEdit(t)} className="rounded-lg p-2 text-primary hover:bg-primary/10" aria-label="Save">
                      <Check className="h-4 w-4" />
                    </button>
                    <button onClick={cancelEdit} className="rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label="Cancel">
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <TaskCheckbox checked={t.completed} onChange={() => toggle(t)} />
                    <span className={`flex-1 text-sm ${t.completed ? "text-muted-foreground line-through" : ""}`}>
                      {t.title}
                    </span>
                    {t.due_date && (
                      <span className="text-xs text-muted-foreground">
                        {format(parseISO(t.due_date), "EEE, MMM d")}
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
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
