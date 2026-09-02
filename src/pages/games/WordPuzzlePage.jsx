import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { recordAttempt, getTodayResult, attemptsRemaining, isGameOver } from "@/lib/gameResults";
import { getWordOfTheDay, isValidWord } from "@/lib/wordList";
import { ArrowLeft, Loader2, Delete } from "lucide-react";

const MAX_GUESSES = 6;
const WORD = getWordOfTheDay();

function evaluateGuess(guess) {
  const result = Array(5).fill("absent");
  const letters = WORD.split("");
  const used = Array(5).fill(false);

  guess.split("").forEach((ch, i) => {
    if (ch === letters[i]) {
      result[i] = "correct";
      used[i] = true;
    }
  });
  guess.split("").forEach((ch, i) => {
    if (result[i] === "correct") return;
    const idx = letters.findIndex((l, j) => l === ch && !used[j]);
    if (idx !== -1) {
      result[i] = "present";
      used[idx] = true;
    }
  });
  return result;
}

const tileClass = {
  correct: "bg-primary text-primary-foreground border-primary",
  present: "bg-accent/70 text-accent-foreground border-accent",
  absent: "bg-muted text-muted-foreground border-muted",
};

const ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

export default function WordPuzzlePage() {
  const { user } = useAuth();
  const [result, setResult] = useState(undefined);
  const [guesses, setGuesses] = useState([]);
  const [current, setCurrent] = useState("");
  const [message, setMessage] = useState("");
  const [ended, setEnded] = useState(false);
  const [won, setWon] = useState(false);

  useEffect(() => {
    if (!user) return;
    getTodayResult(user.id, "wordle").then(setResult);
  }, [user]);

  const finishTry = useCallback(async (didWin, guessCount) => {
    const points = didWin ? Math.max(150 - (guessCount - 1) * 20, 50) : 0;
    const updated = await recordAttempt(user.id, "wordle", { won: didWin, points });
    setResult(updated);
    setEnded(true);
    setWon(didWin);
  }, [user]);

  const submitGuess = useCallback(() => {
    if (current.length !== 5) {
      setMessage("Not enough letters");
      return;
    }
    if (!isValidWord(current)) {
      setMessage("Not in word list");
      return;
    }
    setMessage("");
    const nextGuesses = [...guesses, current];
    setGuesses(nextGuesses);
    const isCorrect = current === WORD;
    setCurrent("");
    if (isCorrect || nextGuesses.length >= MAX_GUESSES) {
      finishTry(isCorrect, nextGuesses.length);
    }
  }, [current, guesses, finishTry]);

  const handleKey = useCallback((key) => {
    if (ended || isGameOver(result)) return;
    if (key === "ENTER") submitGuess();
    else if (key === "BACK") setCurrent((c) => c.slice(0, -1));
    else if (/^[A-Z]$/.test(key) && current.length < 5) setCurrent((c) => c + key);
  }, [ended, result, current, submitGuess]);

  useEffect(() => {
    const onKeyDown = (e) => {
      const k = e.key.toUpperCase();
      if (k === "ENTER") handleKey("ENTER");
      else if (k === "BACKSPACE") handleKey("BACK");
      else if (/^[A-Z]$/.test(k)) handleKey(k);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleKey]);

  if (result === undefined) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const remaining = attemptsRemaining(result);
  const over = isGameOver(result);
  const showBoard = !over;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex w-full max-w-sm items-center justify-between">
        <Link to="/games" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Games
        </Link>
        <span className="text-xs text-muted-foreground">
          {over ? (result.status === "completed" ? "Completed" : "Lost today") : `${remaining} tries left`}
        </span>
      </div>

      <header className="text-center">
        <h1 className="font-heading text-4xl font-medium">Word Puzzle</h1>
        <p className="mt-2 text-muted-foreground">Guess the 5-letter word in 6 tries.</p>
      </header>

      {over ? (
        <div className="w-full max-w-sm rounded-3xl bg-card p-10 text-center shadow-soft">
          <p className="font-heading text-2xl font-medium">
            {result.status === "completed" ? "Nicely done. 🌿" : "That's all your tries for today."}
          </p>
          <p className="mt-2 text-muted-foreground">Come back tomorrow for another word.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            {Array.from({ length: MAX_GUESSES }).map((_, r) => {
              const guess = guesses[r];
              const isCurrentRow = r === guesses.length && !ended;
              const evaluation = guess ? evaluateGuess(guess) : null;
              return (
                <div key={r} className="flex gap-1.5">
                  {Array.from({ length: 5 }).map((_, c) => {
                    const letter = guess ? guess[c] : isCurrentRow ? current[c] || "" : "";
                    return (
                      <div
                        key={c}
                        className={`flex h-12 w-12 items-center justify-center rounded-lg border-2 font-heading text-xl font-semibold uppercase sm:h-14 sm:w-14 ${
                          evaluation ? tileClass[evaluation[c]] : "border-border bg-card"
                        }`}
                      >
                        {letter}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {message && <p className="text-sm text-destructive">{message}</p>}

          {ended && (
            <div className="flex flex-col items-center gap-3 rounded-3xl bg-card p-6 text-center shadow-soft">
              <p className="font-heading text-lg font-medium">
                {won ? "Solved it! 🌿" : `The word was ${WORD}.`}
              </p>
              {remaining > 0 && (
                <button
                  onClick={() => { setGuesses([]); setCurrent(""); setEnded(false); setMessage(""); }}
                  className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90"
                >
                  Try again ({remaining} left)
                </button>
              )}
            </div>
          )}

          {!ended && (
            <div className="flex w-full max-w-md flex-col gap-1.5">
              {ROWS.map((row, i) => (
                <div key={i} className="flex justify-center gap-1.5">
                  {row.split("").map((k) => (
                    <button
                      key={k}
                      onClick={() => handleKey(k)}
                      className="h-11 flex-1 max-w-10 rounded-md bg-card text-sm font-medium shadow-soft hover:bg-muted"
                    >
                      {k}
                    </button>
                  ))}
                  {i === 2 && (
                    <>
                      <button
                        onClick={() => handleKey("BACK")}
                        className="flex h-11 flex-[1.6] max-w-16 items-center justify-center rounded-md bg-card shadow-soft hover:bg-muted"
                      >
                        <Delete className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              ))}
              <button
                onClick={() => handleKey("ENTER")}
                className="mt-1 rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90"
              >
                Enter
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
