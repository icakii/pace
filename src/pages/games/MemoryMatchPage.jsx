import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import { recordAttempt, getTodayResult, attemptsRemaining, isGameOver } from "@/lib/gameResults";
import { ArrowLeft, Loader2, Sun, Moon, Star, Cloud, Heart, Leaf, Flower2, Snowflake } from "lucide-react";

const ICONS = [Sun, Moon, Star, Cloud, Heart, Leaf, Flower2, Snowflake];
const MAX_FLIPS = 20;

function shuffledDeck() {
  const deck = [...ICONS, ...ICONS].map((Icon, i) => ({ id: i, Icon }));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function MemoryCard({ card, isUp, onClick }) {
  const Icon = card.Icon;
  return (
    <button onClick={onClick} className="aspect-square" style={{ perspective: 800 }}>
      <motion.div
        className="relative h-full w-full"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: isUp ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
      >
        <div
          className="absolute inset-0 flex items-center justify-center rounded-2xl bg-card shadow-soft hover:bg-muted"
          style={{ backfaceVisibility: "hidden" }}
        />
        <div
          className="absolute inset-0 flex items-center justify-center rounded-2xl bg-primary/15 shadow-soft"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <Icon className="h-7 w-7 text-primary" strokeWidth={1.6} />
        </div>
      </motion.div>
    </button>
  );
}

export default function MemoryMatchPage() {
  const { user } = useAuth();
  const [result, setResult] = useState(undefined);
  const [deck, setDeck] = useState(shuffledDeck);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [flipCount, setFlipCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user) return;
    getTodayResult(user.id, "memory").then(setResult);
  }, [user]);

  const finished = matched.length === deck.length;

  const finishTry = async (won) => {
    const points = won ? Math.max(150 - Math.max(0, flipCount - 12) * 10, 50) : 0;
    const updated = await recordAttempt(user.id, "memory", { won, points });
    setResult(updated);
    setMessage(won ? `Matched! +${points} points` : "Out of flips for this try.");
  };

  useEffect(() => {
    if (finished && deck.length > 0) finishTry(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  useEffect(() => {
    if (flipCount >= MAX_FLIPS && !finished) finishTry(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipCount]);

  const startNewTry = () => {
    setDeck(shuffledDeck());
    setFlipped([]);
    setMatched([]);
    setFlipCount(0);
    setMessage("");
  };

  const handleFlip = (index) => {
    if (busy || flipped.includes(index) || matched.includes(index) || isGameOver(result)) return;
    const next = [...flipped, index];
    setFlipped(next);

    if (next.length === 2) {
      setFlipCount((c) => c + 1);
      setBusy(true);
      const [a, b] = next;
      if (deck[a].Icon === deck[b].Icon) {
        setTimeout(() => {
          setMatched((m) => [...m, a, b]);
          setFlipped([]);
          setBusy(false);
        }, 500);
      } else {
        setTimeout(() => {
          setFlipped([]);
          setBusy(false);
        }, 800);
      }
    }
  };

  if (result === undefined) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const remaining = attemptsRemaining(result);
  const over = isGameOver(result);
  const tryFailed = !over && flipCount >= MAX_FLIPS;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Link to="/games" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Games
        </Link>
        <span className="text-xs text-muted-foreground">
          {over ? (result.status === "completed" ? "Completed" : "Lost today") : "1 try today"}
        </span>
      </div>

      <header>
        <h1 className="font-heading text-4xl font-medium">Memory Match</h1>
        <p className="mt-2 text-muted-foreground">Find every pair within {MAX_FLIPS} flips.</p>
      </header>

      {over ? (
        <div className="rounded-3xl bg-card p-10 text-center shadow-soft">
          <p className="font-heading text-2xl font-medium">
            {result.status === "completed" ? "Nicely done. 🌿" : "That's all your tries for today."}
          </p>
          <p className="mt-2 text-muted-foreground">Come back tomorrow for another go.</p>
        </div>
      ) : tryFailed ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl bg-card p-10 text-center shadow-soft">
          <p className="font-heading text-xl font-medium">Out of flips for that try.</p>
          <button
            onClick={startNewTry}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90"
          >
            Try again ({remaining} left)
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            {message && <p>{message}</p>}
            <p className="ml-auto">{flipCount} / {MAX_FLIPS} flips</p>
          </div>
          <div className="grid grid-cols-4 gap-3 sm:gap-4">
            {deck.map((card, i) => (
              <MemoryCard
                key={card.id + "-" + i}
                card={card}
                isUp={flipped.includes(i) || matched.includes(i)}
                onClick={() => handleFlip(i)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
