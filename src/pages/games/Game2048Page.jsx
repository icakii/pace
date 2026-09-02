import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import { recordAttempt, getTodayResult, attemptsRemaining, isGameOver } from "@/lib/gameResults";
import { ArrowLeft, Loader2 } from "lucide-react";

const SIZE = 4;
const TARGET_SCORE = 1000;
const MAX_MOVES = 300;

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

let idCounter = 1;
const nextId = () => idCounter++;

function emptyCells(tiles) {
  const occupied = new Set(tiles.map((t) => `${t.r}-${t.c}`));
  const cells = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (!occupied.has(`${r}-${c}`)) cells.push([r, c]);
    }
  }
  return cells;
}

function spawnTile(tiles) {
  const cells = emptyCells(tiles);
  if (cells.length === 0) return tiles;
  const [r, c] = cells[Math.floor(Math.random() * cells.length)];
  const value = Math.random() < 0.9 ? 2 : 4;
  return [...tiles, { id: nextId(), r, c, value }];
}

function initTiles() {
  return spawnTile(spawnTile([]));
}

function getLineCells(dir, lineIdx) {
  const cells = [];
  for (let i = 0; i < SIZE; i++) {
    if (dir === "left") cells.push([lineIdx, i]);
    else if (dir === "right") cells.push([lineIdx, SIZE - 1 - i]);
    else if (dir === "up") cells.push([i, lineIdx]);
    else if (dir === "down") cells.push([SIZE - 1 - i, lineIdx]);
  }
  return cells;
}

function move(tiles, dir) {
  const grid = {};
  tiles.forEach((t) => { grid[`${t.r}-${t.c}`] = t; });

  const nextTiles = [];
  const removedIds = new Set();
  let gained = 0;
  let moved = false;

  for (let lineIdx = 0; lineIdx < SIZE; lineIdx++) {
    const cells = getLineCells(dir, lineIdx);
    const lineTiles = cells.map(([r, c]) => grid[`${r}-${c}`]).filter(Boolean);

    let k = 0;
    let i = 0;
    while (i < lineTiles.length) {
      const cur = lineTiles[i];
      const [newR, newC] = cells[k];
      if (i + 1 < lineTiles.length && lineTiles[i + 1].value === cur.value) {
        const merged = lineTiles[i + 1];
        gained += cur.value * 2;
        nextTiles.push({ id: cur.id, r: newR, c: newC, value: cur.value * 2 });
        removedIds.add(merged.id);
        if (cur.r !== newR || cur.c !== newC || merged.r !== newR || merged.c !== newC) moved = true;
        i += 2;
      } else {
        nextTiles.push({ id: cur.id, r: newR, c: newC, value: cur.value });
        if (cur.r !== newR || cur.c !== newC) moved = true;
        i += 1;
      }
      k += 1;
    }
  }

  return { tiles: nextTiles, gained, moved };
}

function hasMoves(tiles) {
  if (tiles.length < SIZE * SIZE) return true;
  const grid = {};
  tiles.forEach((t) => { grid[`${t.r}-${t.c}`] = t.value; });
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const v = grid[`${r}-${c}`];
      if (c < SIZE - 1 && grid[`${r}-${c + 1}`] === v) return true;
      if (r < SIZE - 1 && grid[`${r + 1}-${c}`] === v) return true;
    }
  }
  return false;
}

export default function Game2048Page() {
  const { user } = useAuth();
  const [result, setResult] = useState(undefined);
  const [tiles, setTiles] = useState(initTiles);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
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
    setTiles((prev) => {
      const { tiles: moved, gained, moved: didMove } = move(prev, dir);
      if (!didMove) return prev;
      const withTile = spawnTile(moved);
      const newMoveCount = moves + 1;
      setMoves(newMoveCount);
      setScore((s) => {
        const newScore = s + gained;
        if (newScore >= TARGET_SCORE) finishTry(true, newScore);
        else if (!hasMoves(withTile) || newMoveCount >= MAX_MOVES) finishTry(false, newScore);
        return newScore;
      });
      return withTile;
    });
  }, [ended, result, finishTry, moves]);

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
    setTiles(initTiles());
    setScore(0);
    setMoves(0);
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
          {over ? (result.status === "completed" ? "Completed" : "Lost today") : "1 try today"}
        </span>
      </div>

      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-4xl font-medium">2048</h1>
          <p className="mt-2 text-muted-foreground">Reach {TARGET_SCORE} points within {MAX_MOVES} moves.</p>
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
            className="relative mx-auto grid aspect-square w-full max-w-md grid-cols-4 grid-rows-4 gap-2 rounded-3xl bg-card p-3 shadow-soft sm:gap-3 sm:p-4"
          >
            {Array.from({ length: SIZE * SIZE }).map((_, i) => (
              <div key={i} className="rounded-xl bg-background/60" />
            ))}
            <AnimatePresence>
              {tiles.map((t) => (
                <motion.div
                  key={t.id}
                  layout
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  style={{ gridRow: t.r + 1, gridColumn: t.c + 1 }}
                  className={`flex items-center justify-center rounded-xl font-heading text-lg font-semibold sm:text-2xl ${
                    TILE_COLORS[t.value] || "bg-accent text-accent-foreground"
                  }`}
                >
                  {t.value}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {ended && (
            <div className="flex flex-col items-center gap-4 rounded-3xl bg-card p-8 text-center shadow-soft">
              <p className="font-heading text-xl font-medium">
                {moves >= MAX_MOVES ? "Out of moves for that try." : "No more moves for that try."}
              </p>
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
