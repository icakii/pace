import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { format } from "date-fns";
import { Spade, Type, Grid3x3, Hash, CheckCircle2, XCircle } from "lucide-react";
import { MAX_ATTEMPTS } from "@/lib/gameStats";
import { getTotalPoints } from "@/lib/gameStats";
import XPBar from "@/components/XPBar";

const GAMES = [
  { key: "solitaire", label: "Solitaire", to: "/games/solitaire", icon: Spade },
  { key: "wordle", label: "Word Puzzle", to: "/games/wordle", icon: Type },
  { key: "memory", label: "Memory Match", to: "/games/memory", icon: Grid3x3 },
  { key: "2048", label: "2048", to: "/games/2048", icon: Hash },
];

export default function GamesPage() {
  const { user } = useAuth();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("game_results")
      .select("*")
      .eq("user_id", user.id)
      .then(({ data }) => setResults(data || []))
      .finally(() => setLoading(false));
  }, [user]);

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayResults = results.filter((r) => r.play_date === todayStr);
  const totalPoints = getTotalPoints(results);

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="font-heading text-4xl md:text-5xl font-medium">Games</h1>
        <p className="mt-2 text-muted-foreground">A few minutes to reset. One try a day, each.</p>
      </header>

      {!loading && <XPBar points={totalPoints} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {GAMES.map((g) => {
          const result = todayResults.find((r) => r.game === g.key);
          const Icon = g.icon;
          const status = result?.status;
          return (
            <Link
              key={g.key}
              to={g.to}
              className="flex flex-col gap-3 rounded-3xl bg-card p-6 shadow-soft transition-transform hover:-translate-y-1"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15">
                <Icon className="h-5 w-5 text-primary" strokeWidth={1.6} />
              </div>
              <p className="font-heading text-lg font-medium">{g.label}</p>
              {status === "completed" ? (
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Completed{result.points ? ` · ${result.points} pts` : ""}
                </span>
              ) : status === "lost" ? (
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
                  <XCircle className="h-3.5 w-3.5" /> Lost today
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {MAX_ATTEMPTS - (result?.attempts_used || 0)} tries left today
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
