import React from "react";
import { getLevelProgress } from "@/lib/gameStats";

export default function XPBar({ points }) {
  const { level, currentLevelPoints, pointsPerLevel, percent } = getLevelProgress(points);

  return (
    <div className="rounded-3xl bg-card p-6 shadow-soft">
      <div className="flex items-baseline justify-between">
        <p className="font-heading text-lg font-medium">Level {level}</p>
        <p className="text-xs text-muted-foreground">{currentLevelPoints} / {pointsPerLevel} XP</p>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{points} total points earned</p>
    </div>
  );
}
