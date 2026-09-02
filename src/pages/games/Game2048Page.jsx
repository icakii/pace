import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { recordAttempt, getTodayResult, attemptsRemaining, isGameOver } from "@/lib/gameResults";
import { ArrowLeft, Loader2 } from "lucide-react";

const SIZE = 4;
const TARGET_SCORE = 1000;

const TILE_COLORS = {
  2: "bg-card text-foreground",
  4: "bg-card text-foreground",
  8: "bg-primary/25 text-foreground",
  16: "bg-primary/35 text-foreground",
  32: "bg-primary/50 text-primary-foreground",
  64: "bg-primary/70 text-primary-foreground",
  128: "bg-accent/50 text-accent-foreground",
  256: "bg-accent/65 text-accent-foreground",
  512: "bg-accent/80 text-accent-foreground",
  1024: "bg-accent text-accent-foreground",
  2048: "bg-accent text-accent-foreground",
};

function emptyBoard() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

function addRandomTile(board) {
  const empty = [];
  board.forEach((row, r) => row.forEach((v, c) => { if (!v) empty.push([r, c]); }));
  if (empty.length === 0) return board;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const next = board.map((row) => [...row]);
  next[r][c] = Math.random() < 0.9 ? 2 : 4;
  return next;
}

function slideRow(row) {
  const nums = row.filter((v) => v);
  let gained = 0;
  for (let i = 0; i < nums.length - 1; i++) {
    if (nums[i] === nums[i + 1]) {
      nums[i] *= 2;
      gained += nums[i];
      nums.splice(i + 1, 1);
    }
  }
  while (nums.length < SIZE) nums.push(0);
  return { row: nums, gained };
}

function move(board, dir) {
  let rotated = board.map((r) => [...r]);
  const rotate = (b) => b[0].map((_, c) => b.map((r) => r[c]).reverse());

  let turns = 0;
  if (dir === "up") turns = 1;
  if (dir === "right") turns = 2;
  if (dir === "down") turns = 3;
  for (let i = 0; i < turns; i++) rotated = rotate(rotated);

  let gained = 0;
  let moved = false;
  const result = rotated.map((row) => {
    const { row: newRow, gained: g } = slideRow(row);
    gained += g;
    if (newRow.some((v, i) => v !== row[i])) moved = true;
    return newRow;
  });

  let finalBoard = result;
  const backTurns = (4 - turns) % 4;
  for (let i = 0; i < backTurns; i++) finalBoard = rotate(finalBoard);

  return { board: finalBoard, gained, moved };
}

function hasMoves(board) {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (!board[r][c]) return true;
      if (c < SIZE - 1 && board[r][c] === board[r][c + 1]) return true;
      if (r < SIZE - 1 && board[r][c] === board[r + 1][c]) return true;
    }
  }
  return false;
}

function initBoard() {
  return addRandomTile(addRandomTile(emptyBoard()));
}

export default function Game2048Page() {
  const { user } = useAuth();
  const [result, setResult] = useState(undefined);
  const [board, setBoard] = useState(initBoard);
  const [score, setScore] = useState(0);
  const [ended, setEnded] = useState(false);
  const finishedRef = useRef(false);
  const touchStart = useRef(null);

  useEffect(() => {
    if (!user) return;
    getTodayResult(user.id, "2048").then(setResult);
  }, [user]);

  const finishTry = useCallback(async (won, finalScore) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const points = won ? Math.min(finalScore, 300) : Math.min(Math.floor(finalScore / 5), 100);
    const updated = await recordAttempt(user.id, "2048", { won, points });
    setResult(updated);
    setEnded(true);
  }, [user]);

  const handleMove = useCallback((dir) => {
    if (ended || isGameOver(result)) return;
    setBoard((prev) => {
      const { board: next, gained, moved } = move(prev, dir);
      if (!moved) return prev;
      const withTile = addRandomTile(next);
      setScore((s) => {
        const newScore = s + gained;
        if (newScore >= TARGET_SCORE) finishTry(true, newScore);
        else if (!hasMoves(withTile)) finishTry(false, newScore);
        return newScore;
      });
      return withTile;
    });
  }, [ended, result, finishTry]);

  useEffect(() => {
    const onKey = (e) => {
      const map = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
      if (map[e.key]) {
        e.preventDefault();
        handleMove(map[e.key]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleMove]);

  const onTouchStart = (e) => { touchStart.current = e.touches[0]; };
  const onTouchEnd = (e) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.clientX;
    const dy = e.changedTouches[0].clientY - touchStart.current.clientY;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
    if (Math.abs(dx) > Math.abs(dy)) handleMove(dx > 0 ? "right" : "left");
    else handleMove(dy > 0 ? "down" : "up");
    touchStart.current = null;
  };

  const startNewTry = () => {
    setBoard(initBoard());
    setScore(0);
    setEnded(false);
    finishedRef.current = false;
  };

  if (result === undefined) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const remaining = attemptsRemaining(result);
  const over = isGameOver(result);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Link to="/games" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Games
        </Link>
        <span className="text-xs text-muted-foreground">
          {over ? (result.status === "completed" ? "Completed" : "Lost today") : `${remaining} tries left`}
        </span>
      </div>

      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-4xl font-medium">2048</h1>
          <p className="mt-2 text-muted-foreground">Reach {TARGET_SCORE} points to win a try.</p>
        </div>
        <div className="rounded-2xl bg-card px-4 py-2 text-center shadow-soft">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Score</p>
          <p className="font-heading text-xl font-medium">{score}</p>
        </div>
      </header>

      {over ? (
        <div className="rounded-3xl bg-card p-10 text-center shadow-soft">
          <p className="font-heading text-2xl font-medium">
            {result.status === "completed" ? "Nicely done. 🌿" : "That's all your tries for today."}
          </p>
          <p className="mt-2 text-muted-foreground">Come back tomorrow for another go.</p>
        </div>
      ) : (
        <>
          <div
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            className="mx-auto grid w-full max-w-md grid-cols-4 gap-2 rounded-3xl bg-card p-3 shadow-soft sm:gap-3 sm:p-4"
          >
            {board.map((row, r) =>
              row.map((v, c) => (
                <div
                  key={`${r}-${c}`}
                  className={`flex aspect-square items-center justify-center rounded-xl font-heading text-lg font-semibold transition-all sm:text-2xl ${
                    v ? TILE_COLORS[v] || "bg-accent text-accent-foreground" : "bg-background/60"
                  }`}
                >
                  {v || ""}
                </div>
              ))
            )}
          </div>

          {ended && (
            <div className="flex flex-col items-center gap-4 rounded-3xl bg-card p-8 text-center shadow-soft">
              <p className="font-heading text-xl font-medium">No more moves for that try.</p>
              <button
                onClick={startNewTry}
                className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90"
              >
                Try again ({remaining} left)
              </button>
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground sm:hidden">Swipe to move tiles.</p>
          <p className="hidden text-center text-xs text-muted-foreground sm:block">Use arrow keys to move tiles.</p>
        </>
      )}
    </div>
  );
}
