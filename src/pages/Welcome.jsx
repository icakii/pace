import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  CheckSquare,
  BookOpen,
  Gamepad2,
  CreditCard,
  MoreVertical,
  Share,
  SquarePlus,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { useInstallPrompt, isStandalone } from "@/lib/installPrompt";

const SLIDES = [
  {
    kind: "intro",
    title: "Welcome to Pace",
    subtitle: "Your calendar, tasks, thoughts, and a bit of fun — all in one calm place.",
    features: [
      { icon: CalendarDays, label: "Calendar & tasks with reminders" },
      { icon: CreditCard, label: "Track subscriptions & recurring bills" },
      { icon: CheckSquare, label: "Daily thoughts journal" },
      { icon: BookOpen, label: "An e-book library and reader" },
      { icon: Gamepad2, label: "A few games to unwind" },
    ],
  },
  {
    kind: "install",
    platform: "android",
    title: "Add it to your Android home screen",
    subtitle: "Pace works best installed like a real app — it's free and takes a few seconds.",
    steps: [
      { icon: MoreVertical, text: "Open Pace in Chrome and tap the ⋮ menu (top right)" },
      { icon: SquarePlus, text: 'Tap "Add to Home screen" or "Install app"' },
      { icon: CheckSquare, text: 'Confirm by tapping "Install"' },
    ],
  },
  {
    kind: "install",
    platform: "ios",
    title: "Add it to your iPhone home screen",
    subtitle: "On iOS, installing to your home screen is what unlocks notifications.",
    steps: [
      { icon: Share, text: "Open Pace in Safari and tap the Share icon" },
      { icon: SquarePlus, text: 'Scroll down and tap "Add to Home Screen"' },
      { icon: CheckSquare, text: 'Tap "Add" in the top right' },
    ],
  },
];

export default function Welcome() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [installed, setInstalled] = useState(false);
  const { canInstall, promptInstall } = useInstallPrompt();

  const handleInstallClick = async () => {
    const accepted = await promptInstall();
    if (accepted) {
      setInstalled(true);
      setTimeout(() => navigate("/login"), 1200);
    }
  };

  const goNext = () => {
    if (step === SLIDES.length - 1) {
      navigate("/register");
      return;
    }
    setDirection(1);
    setStep((s) => s + 1);
  };

  const goBack = () => {
    setDirection(-1);
    setStep((s) => Math.max(0, s - 1));
  };

  const slide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;

  return (
    <div className="min-h-screen flex flex-col bg-background px-4 py-8">
      <div className="flex items-center justify-between max-w-md w-full mx-auto">
        <div className="inline-flex items-center gap-2.5">
          <Logo />
          <span className="font-heading text-lg font-medium">Pace</span>
        </div>
        <button
          onClick={() => navigate("/login")}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Skip
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-md overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              initial={{ opacity: 0, x: direction * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -40 }}
              transition={{ duration: 0.25 }}
              className="bg-card rounded-3xl shadow-soft p-8"
            >
              <h1 className="font-heading text-2xl font-medium text-center">{slide.title}</h1>
              <p className="mt-2 text-center text-sm text-muted-foreground">{slide.subtitle}</p>

              <div className="mt-8 space-y-4">
                {(slide.features || slide.steps).map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-9 h-9 shrink-0 rounded-xl bg-primary/10">
                      <item.icon className="w-4 h-4 text-primary" aria-hidden="true" />
                    </div>
                    <p className="text-sm">{item.label || item.text}</p>
                  </div>
                ))}
              </div>

              {slide.platform === "android" && (
                <div className="mt-6">
                  {isStandalone() ? (
                    <p className="text-center text-sm text-primary">You're already using the installed app 🎉</p>
                  ) : installed ? (
                    <p className="text-center text-sm text-primary">Installed! Taking you to log in…</p>
                  ) : canInstall ? (
                    <Button variant="secondary" className="w-full h-11" onClick={handleInstallClick}>
                      Install now
                    </Button>
                  ) : (
                    <p className="text-center text-xs text-muted-foreground">
                      Or use the steps above — your browser will show its own "Install" option if it supports it.
                    </p>
                  )}
                </div>
              )}

              {slide.platform === "ios" && (
                <div className="mt-6">
                  {isStandalone() ? (
                    <p className="text-center text-sm text-primary">You're already using the installed app 🎉</p>
                  ) : (
                    <p className="text-center text-xs text-muted-foreground">
                      Apple doesn't allow apps to trigger this automatically — the steps above are the only way on iPhone.
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-6 flex items-center justify-center gap-2">
            {SLIDES.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-6 bg-primary" : "w-1.5 bg-muted"
                }`}
              />
            ))}
          </div>

          <div className="mt-8 flex items-center gap-3">
            {step > 0 && (
              <Button variant="outline" className="flex-1 h-12" onClick={goBack}>
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            )}
            <Button className="flex-1 h-12 font-medium" onClick={goNext}>
              {isLast ? "Get started" : "Next"}
              {!isLast && <ArrowRight className="w-4 h-4" />}
            </Button>
          </div>

          {isLast && (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-primary font-medium hover:underline">
                Log in
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
