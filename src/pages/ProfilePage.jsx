import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { Flame, CalendarDays, CheckCircle2, Loader2, LogOut, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { countTotalCompleted, computeStreak, daysSince, STREAK_MIN } from "@/lib/stats";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .then(({ data }) => setTasks(data || []))
      .finally(() => setLoading(false));
  }, [user]);

  const streak = computeStreak(tasks);
  const streakActive = streak >= STREAK_MIN;
  const totalCompleted = countTotalCompleted(tasks);
  const activeDays = daysSince(user?.created_at);

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

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="font-heading text-4xl md:text-5xl font-medium">Profile</h1>
        <p className="mt-2 text-muted-foreground">{user?.email}</p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
          <p className="mt-1 text-xs text-muted-foreground/70">Complete 3+ tasks in a day to count</p>
        </div>
      </div>

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

      <div>
        <Button variant="outline" onClick={() => logout()}>
          <LogOut className="h-4 w-4" />
          Log out
        </Button>
      </div>
    </div>
  );
}
