import React from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  CheckSquare,
  BookOpen,
  Gamepad2,
  Bell,
  Quote,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";

const FEATURES = [
  {
    icon: CalendarDays,
    title: "Calendar & tasks",
    body: "Plan your days and weeks, set recurring tasks, and never lose track of what's due.",
  },
  {
    icon: Bell,
    title: "Reminders that reach you",
    body: "An hour before a task, or a nudge for the ones without a set time — installed as an app, so it works on your phone.",
  },
  {
    icon: CheckSquare,
    title: "Daily thoughts",
    body: "A quiet place to jot down how the day went, with streaks to keep you coming back.",
  },
  {
    icon: BookOpen,
    title: "E-book library",
    body: "Bring your own EPUBs or borrow from the shared classics shelf, and read right in the app.",
  },
  {
    icon: Gamepad2,
    title: "Games hub",
    body: "Solitaire, a word puzzle, memory match, and 2048 — a short break, built in.",
  },
  {
    icon: Quote,
    title: "A quote to start the day",
    body: "One small, deliberate thought waiting for you each morning.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="inline-flex items-center gap-2.5">
          <Logo />
          <span className="font-heading text-lg font-medium">Pace</span>
        </div>
        <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">
          Log in
        </Link>
      </header>

      <section className="max-w-5xl mx-auto px-6 pt-10 pb-20 grid gap-14 lg:grid-cols-2 lg:items-center">
        <div>
          <h1 className="font-heading text-4xl sm:text-5xl font-medium leading-tight">
            A calmer way to organize your day.
          </h1>
          <p className="mt-5 text-lg text-muted-foreground max-w-md">
            Calendar, tasks, a thoughts journal, an e-reader, and a few games to unwind —
            one quiet app instead of five noisy ones.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button asChild size="lg" className="h-12 px-6 font-medium">
              <Link to="/welcome">
                Get started — it's free
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Link to="/welcome" className="text-sm text-muted-foreground hover:text-foreground">
              See how it works
            </Link>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-sm">
          <div className="rounded-3xl bg-card shadow-soft p-6">
            <div className="flex items-center justify-between">
              <p className="font-heading text-lg font-medium">Today</p>
              <div className="flex items-center gap-1.5 text-xs text-accent">
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                4 day streak
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {[
                { time: "9:00", label: "Morning walk", done: true },
                { time: "13:30", label: "Write the proposal", done: true },
                { time: "18:00", label: "Read a chapter", done: false },
              ].map((t) => (
                <div key={t.label} className="flex items-center gap-3 rounded-xl bg-background p-3">
                  <span
                    className={`w-4 h-4 shrink-0 rounded-full border-2 ${
                      t.done ? "bg-primary border-primary" : "border-muted-foreground/40"
                    }`}
                  />
                  <span className={`text-sm flex-1 ${t.done ? "line-through text-muted-foreground" : ""}`}>
                    {t.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{t.time}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-xl bg-primary/10 p-3 text-xs text-foreground/80 italic">
              "Almost everything will work again if you unplug it for a few minutes."
            </div>
          </div>
          <div className="absolute -bottom-4 -right-4 rounded-2xl bg-accent text-accent-foreground shadow-soft px-4 py-3 text-xs font-medium">
            ⏰ Task due in 1 hour
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-24">
        <h2 className="font-heading text-2xl sm:text-3xl font-medium text-center">
          Everything you need, nothing you don't
        </h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-3xl bg-card p-6 shadow-soft">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
                <f.icon className="w-5 h-5 text-primary" aria-hidden="true" />
              </div>
              <p className="mt-4 font-medium">{f.title}</p>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 pb-24 text-center">
        <h2 className="font-heading text-2xl sm:text-3xl font-medium">Ready to slow down, a little?</h2>
        <p className="mt-3 text-muted-foreground">Free to use, installs like an app, no clutter.</p>
        <Button asChild size="lg" className="mt-6 h-12 px-6 font-medium">
          <Link to="/welcome">
            Get started
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </section>

      <footer className="max-w-5xl mx-auto px-6 pb-10 text-center text-xs text-muted-foreground">
        Pace · built for calmer days
      </footer>
    </div>
  );
}
