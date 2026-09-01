import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { format, parseISO, isToday, isYesterday } from "date-fns";
import { Loader2, Pencil, Trash2, Check, X, Send } from "lucide-react";

const MOODS = [
  { value: "happy", emoji: "😊", label: "Happy" },
  { value: "calm", emoji: "😌", label: "Calm" },
  { value: "neutral", emoji: "😐", label: "Neutral" },
  { value: "down", emoji: "😔", label: "Down" },
  { value: "stressed", emoji: "😤", label: "Stressed" },
  { value: "inspired", emoji: "✨", label: "Inspired" },
];

const moodEmoji = (value) => MOODS.find((m) => m.value === value)?.emoji;

function dayLabel(date) {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMMM d, yyyy");
}

export default function ThoughtsPage() {
  const { user } = useAuth();
  const [thoughts, setThoughts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [content, setContent] = useState("");
  const [mood, setMood] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [editMood, setEditMood] = useState(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("thoughts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setThoughts(data || []))
      .finally(() => setLoading(false));
  }, [user]);

  const groups = useMemo(() => {
    const map = new Map();
    for (const t of thoughts) {
      const d = parseISO(t.created_at);
      const key = format(d, "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, { date: d, items: [] });
      map.get(key).items.push(t);
    }
    return Array.from(map.values());
  }, [thoughts]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("thoughts")
      .insert({ user_id: user.id, content: content.trim(), mood })
      .select()
      .single();
    setSaving(false);
    if (!error && data) {
      setThoughts((prev) => [data, ...prev]);
      setContent("");
      setMood(null);
    }
  };

  const startEdit = (t) => {
    setEditingId(t.id);
    setEditContent(t.content);
    setEditMood(t.mood);
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (t) => {
    const { data } = await supabase
      .from("thoughts")
      .update({ content: editContent.trim() || t.content, mood: editMood })
      .eq("id", t.id)
      .select()
      .single();
    if (data) setThoughts((prev) => prev.map((x) => (x.id === t.id ? data : x)));
    setEditingId(null);
  };

  const remove = async (t) => {
    await supabase.from("thoughts").delete().eq("id", t.id);
    setThoughts((prev) => prev.filter((x) => x.id !== t.id));
  };

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="font-heading text-4xl md:text-5xl font-medium">Thoughts</h1>
        <p className="mt-2 text-muted-foreground">A quiet place to put down what's on your mind.</p>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-3xl bg-card p-5 shadow-soft">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          rows={3}
          className="w-full resize-none rounded-xl border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {MOODS.map((m) => (
              <button
                type="button"
                key={m.value}
                onClick={() => setMood(mood === m.value ? null : m.value)}
                title={m.label}
                className={`grid h-9 w-9 place-items-center rounded-full text-lg transition-all duration-200 ${
                  mood === m.value ? "bg-primary/20 ring-1 ring-primary/50 scale-110" : "hover:bg-muted"
                }`}
              >
                {m.emoji}
              </button>
            ))}
          </div>
          <button
            type="submit"
            disabled={saving || !content.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Save
          </button>
        </div>
      </form>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-16 rounded-2xl bg-muted animate-pulse" />)}
        </div>
      ) : groups.length === 0 ? (
        <p className="rounded-3xl bg-card p-10 text-center text-sm italic text-muted-foreground shadow-soft">
          Nothing here yet. Your first thought is waiting above. 🌿
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map(({ date, items }) => (
            <div key={date.toISOString()}>
              <h2 className="mb-3 font-heading text-lg font-medium text-muted-foreground">{dayLabel(date)}</h2>
              <div className="flex flex-col gap-3">
                {items.map((t) => (
                  <div key={t.id} className="rounded-2xl bg-card p-4 shadow-soft">
                    {editingId === t.id ? (
                      <div className="flex flex-col gap-3">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={3}
                          autoFocus
                          className="w-full resize-none rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex flex-wrap gap-1.5">
                            {MOODS.map((m) => (
                              <button
                                type="button"
                                key={m.value}
                                onClick={() => setEditMood(editMood === m.value ? null : m.value)}
                                className={`grid h-8 w-8 place-items-center rounded-full text-base transition-all ${
                                  editMood === m.value ? "bg-primary/20 ring-1 ring-primary/50" : "hover:bg-muted"
                                }`}
                              >
                                {m.emoji}
                              </button>
                            ))}
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => saveEdit(t)} className="rounded-lg p-2 text-primary hover:bg-primary/10" aria-label="Save">
                              <Check className="h-4 w-4" />
                            </button>
                            <button onClick={cancelEdit} className="rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label="Cancel">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3">
                        {t.mood && <span className="text-xl leading-none">{moodEmoji(t.mood)}</span>}
                        <div className="flex-1">
                          <p className="whitespace-pre-wrap text-sm leading-relaxed">{t.content}</p>
                          <p className="mt-1.5 text-xs text-muted-foreground">{format(parseISO(t.created_at), "h:mm a")}</p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button onClick={() => startEdit(t)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted" aria-label="Edit">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => remove(t)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Delete">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
