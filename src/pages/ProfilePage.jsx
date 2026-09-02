import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { Flame, CalendarDays, CheckCircle2, Gamepad2, Loader2, LogOut, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { countTotalCompleted, computeStreak, daysSince, STREAK_MIN } from "@/lib/stats";
import { computeGameStreak, getTotalPoints, GAME_STREAK_MIN } from "@/lib/gameStats";
import { pushSupported, getNotificationSettings, enablePush, disablePush, setThoughtsReminderTime } from "@/lib/push";
import XPBar from "@/components/XPBar";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [gameResults, setGameResults] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  const [notifSettings, setNotifSettings] = useState(null);
  const [notifError, setNotifError] = useState("");
  const [notifLoadingKind, setNotifLoadingKind] = useState(null);

  useEffect(() => {
    if (!user) return;
    getNotificationSettings(user.id).then(setNotifSettings);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("tasks").select("*").eq("user_id", user.id),
      supabase.from("game_results").select("*").eq("user_id", user.id),
    ])
      .then(([tasksRes, gamesRes]) => {
        setTasks(tasksRes.data || []);
        setGameResults(gamesRes.data || []);
      })
      .finally(() => setLoading(false));
  }, [user]);

  const streak = computeStreak(tasks);
  const streakActive = streak >= STREAK_MIN;
  const totalCompleted = countTotalCompleted(tasks);
  const activeDays = daysSince(user?.created_at);
  const gameStreak = computeGameStreak(gameResults);
  const gameStreakActive = gameStreak >= GAME_STREAK_MIN;
  const totalPoints = getTotalPoints(gameResults);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess(false);
    if (newPassword.length < 6) {
      setPwError("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("Passwords do not match");
      return;
    }
    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwLoading(false);
    if (error) {
      setPwError(error.message || "Failed to update password");
      return;
    }
    setPwSuccess(true);
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleToggle = async (kind, checked) => {
    if (!user) return;
    setNotifError("");
    setNotifLoadingKind(kind);
    try {
      const updated = checked ? await enablePush(user.id, kind) : await disablePush(user.id, kind);
      setNotifSettings(updated);
    } catch (err) {
      setNotifError(err.message || "Something went wrong");
    } finally {
      setNotifLoadingKind(null);
    }
  };

  const handleThoughtsTime = async (e) => {
    if (!user) return;
    const time = e.target.value;
    setNotifSettings((prev) => ({ ...prev, thoughts_reminder_time: time }));
    try {
      const updated = await setThoughtsReminderTime(user.id, time);
      setNotifSettings(updated);
    } catch {
      // keep optimistic value; will resync on next load
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="font-heading text-4xl md:text-5xl font-medium">Profile</h1>
        <p className="mt-2 text-muted-foreground">{user?.email}</p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl bg-card p-6 shadow-soft">
          <CalendarDays className="h-6 w-6 text-primary" strokeWidth={1.6} />
          <p className="mt-4 font-heading text-3xl font-medium">{loading ? "—" : activeDays}</p>
          <p className="mt-1 text-sm text-muted-foreground">Days with Pace</p>
        </div>
        <div className="rounded-3xl bg-card p-6 shadow-soft">
          <CheckCircle2 className="h-6 w-6 text-primary" strokeWidth={1.6} />
          <p className="mt-4 font-heading text-3xl font-medium">{loading ? "—" : totalCompleted}</p>
          <p className="mt-1 text-sm text-muted-foreground">Tasks completed</p>
        </div>
        <div className="rounded-3xl bg-card p-6 shadow-soft">
          <Flame
            className={`h-6 w-6 ${streakActive ? "text-accent" : "text-muted-foreground"}`}
            strokeWidth={1.6}
            fill={streakActive ? "currentColor" : "none"}
          />
          <p className={`mt-4 font-heading text-3xl font-medium ${streakActive ? "text-accent" : "text-muted-foreground"}`}>
            {loading ? "—" : streak}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Day streak</p>
          <p className="mt-1 text-xs text-muted-foreground/70">Complete a task each day to count</p>
        </div>
        <div className="rounded-3xl bg-card p-6 shadow-soft">
          <Gamepad2
            className={`h-6 w-6 ${gameStreakActive ? "text-accent" : "text-muted-foreground"}`}
            strokeWidth={1.6}
          />
          <p className={`mt-4 font-heading text-3xl font-medium ${gameStreakActive ? "text-accent" : "text-muted-foreground"}`}>
            {loading ? "—" : gameStreak}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Game streak</p>
          <p className="mt-1 text-xs text-muted-foreground/70">Win a game each day to count</p>
        </div>
      </div>

      {!loading && <XPBar points={totalPoints} />}

      <section className="max-w-md rounded-3xl bg-card p-6 shadow-soft">
        <h2 className="font-heading text-xl font-medium">Change password</h2>
        <p className="mt-1 text-sm text-muted-foreground">Update the password for your account.</p>

        {pwError && (
          <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{pwError}</div>
        )}
        {pwSuccess && (
          <div className="mt-4 rounded-lg bg-primary/10 p-3 text-sm text-primary">Password updated.</div>
        )}

        <form onSubmit={handlePasswordChange} className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-10"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-10"
                required
              />
            </div>
          </div>
          <Button type="submit" disabled={pwLoading}>
            {pwLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Update password
          </Button>
        </form>
      </section>

      <section className="max-w-md rounded-3xl bg-card p-6 shadow-soft">
        <h2 className="font-heading text-xl font-medium">Notifications</h2>
        <p className="mt-1 text-sm text-muted-foreground">Get reminders even when Pace isn't open.</p>

        {!pushSupported() ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Push notifications aren't supported in this browser. On iPhone, install Pace to your home screen first (Share → Add to Home Screen).
          </p>
        ) : (
          <div className="mt-4 space-y-5">
            {notifError && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{notifError}</div>
            )}

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Task reminders</p>
                <p className="text-xs text-muted-foreground">
                  An hour before a timed task, or a midday nudge for tasks without a set time.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {notifLoadingKind === "task_reminders" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                <Switch
                  checked={!!notifSettings?.task_reminders}
                  onCheckedChange={(checked) => handleToggle("task_reminders", checked)}
                  disabled={notifLoadingKind === "task_reminders" || !notifSettings}
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Write your thoughts</p>
                <p className="text-xs text-muted-foreground">Daily reminder if you haven't written a thought yet.</p>
              </div>
              <div className="flex items-center gap-2">
                {notifLoadingKind === "thoughts_reminder" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                <Switch
                  checked={!!notifSettings?.thoughts_reminder}
                  onCheckedChange={(checked) => handleToggle("thoughts_reminder", checked)}
                  disabled={notifLoadingKind === "thoughts_reminder" || !notifSettings}
                />
              </div>
            </div>

            {notifSettings?.thoughts_reminder && (
              <div className="flex items-center justify-between gap-4 pl-1">
                <Label htmlFor="thoughts-time" className="text-xs text-muted-foreground">
                  Reminder time
                </Label>
                <Input
                  id="thoughts-time"
                  type="time"
                  value={notifSettings?.thoughts_reminder_time?.slice(0, 5) || "20:00"}
                  onChange={handleThoughtsTime}
                  className="w-32"
                />
              </div>
            )}
          </div>
        )}
      </section>

      <div>
        <Button variant="outline" onClick={() => logout()}>
          <LogOut className="h-4 w-4" />
          Log out
        </Button>
      </div>
    </div>
  );
}
