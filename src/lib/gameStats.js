import { format, subDays } from "date-fns";

const STREAK_THRESHOLD = 1;
const BASE_LEVEL_POINTS = 400;
const LEVEL_GROWTH = 1.15; // each level requires ~15% more points than the last

export function getCompletedGamesForDate(results, date) {
  const dateStr = format(date, "yyyy-MM-dd");
  return results.filter((r) => r.play_date === dateStr && r.status === "completed").length;
}

export function computeGameStreak(results) {
  let day = new Date();
  if (getCompletedGamesForDate(results, day) < STREAK_THRESHOLD) {
    day = subDays(day, 1);
  }

  let streak = 0;
  while (getCompletedGamesForDate(results, day) >= STREAK_THRESHOLD) {
    streak += 1;
    day = subDays(day, 1);
  }
  return streak;
}

export function getTotalPoints(results) {
  return results.reduce((sum, r) => sum + (r.points || 0), 0);
}

function pointsRequiredForLevel(level) {
  return Math.round(BASE_LEVEL_POINTS * Math.pow(LEVEL_GROWTH, level - 1));
}

export function getLevelProgress(points) {
  let level = 1;
  let cumulative = 0;
  let requirement = pointsRequiredForLevel(level);
  while (points >= cumulative + requirement) {
    cumulative += requirement;
    level += 1;
    requirement = pointsRequiredForLevel(level);
  }
  const currentLevelPoints = points - cumulative;
  const percent = Math.round((currentLevelPoints / requirement) * 100);
  return { level, currentLevelPoints, pointsPerLevel: requirement, percent };
}

export const GAME_STREAK_MIN = STREAK_THRESHOLD;
export const MAX_ATTEMPTS = 1;
