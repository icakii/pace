import { format } from "date-fns";
import { supabase } from "@/lib/supabaseClient";
import { MAX_ATTEMPTS } from "@/lib/gameStats";

const todayStr = () => format(new Date(), "yyyy-MM-dd");

export async function getTodayResult(userId, game) {
  const { data } = await supabase
    .from("game_results")
    .select("*")
    .eq("user_id", userId)
    .eq("game", game)
    .eq("play_date", todayStr())
    .maybeSingle();
  return data;
}

// Call once per finished attempt (win or loss). Returns the updated row.
export async function recordAttempt(userId, game, { won, points }) {
  const existing = await getTodayResult(userId, game);
  const attemptsUsed = (existing?.attempts_used || 0) + 1;
  const bestPoints = Math.max(existing?.points || 0, points || 0);
  const status = won ? "completed" : attemptsUsed >= MAX_ATTEMPTS ? "lost" : "in_progress";

  const { data } = await supabase
    .from("game_results")
    .upsert(
      {
        user_id: userId,
        game,
        play_date: todayStr(),
        status,
        attempts_used: attemptsUsed,
        points: bestPoints,
      },
      { onConflict: "user_id,game,play_date" }
    )
    .select()
    .single();
  return data;
}

export function attemptsRemaining(result) {
  return MAX_ATTEMPTS - (result?.attempts_used || 0);
}

export function isGameOver(result) {
  return result?.status === "completed" || result?.status === "lost";
}
