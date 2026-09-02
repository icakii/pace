import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { recordAttempt, getTodayResult, attemptsRemaining, isGameOver } from "@/lib/gameResults";
import { ArrowLeft, Loader2, RotateCcw, Undo2 } from "lucide-react";

const SUITS = ["S", "H", "D", "C"];
const RED = new Set(["H", "D"]);
const SUIT_SYMBOL = { S: "♠", H: "♥", D: "♦", C: "♣" };
const MAX_HISTORY = 60;

function rankLabel(rank) {
  if (rank === 1) return "A";
  if (rank === 11) return "J";
  if (rank === 12) return "Q";
  if (rank === 13) return "K";
  return String(rank);
}

function freshDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 13; rank++) deck.push({ suit, rank, id: `${suit}${rank}` });
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function deal() {
  const deck = freshDeck();
  const tableau = Array.from({ length: 7 }, () => []);
  let idx = 0;
  for (let col = 0; col < 7; col++) {
    for (let row = 0; row <= col; row++) {
      const card = deck[idx++];
      tableau[col].push({ ...card, faceUp: row === col });
    }
  }
  const stock = deck.slice(idx).map((c) => ({ ...c, faceUp: false }));
  return { tableau, stock, waste: [], foundations: { S: [], H: [], D: [], C: [] } };
}

// Earliest index in `pile` such that pile[index..end] is a valid, all-face-up,
// alternating-color, descending-rank run that can be picked up and moved together.
function movableStartIndex(pile) {
  if (pile.length === 0) return -1;
  let i = pile.length - 1;
  while (i > 0) {
    const cur = pile[i];
    const prev = pile[i - 1];
    if (!cur.faceUp || !prev.faceUp) break;
    if (RED.has(cur.suit) === RED.has(prev.suit)) break;
    if (prev.rank !== cur.rank + 1) break;
    i -= 1;
  }
  return i;
}

function Card({ card, onClick, onDoubleClick, onPointerDown, selected, dragging }) {
  if (!card) return null;
  if (!card.faceUp) {
    return <div className="flex h-16 w-12 items-center justify-center rounded-md border border-border bg-primary/30 sm:h-20 sm:w-14" />;
  }
  const isRed = RED.has(card.suit);
  return (
    <div
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onPointerDown={onPointerDown}
      className={`flex h-16 w-12 cursor-pointer touch-none select-none flex-col items-center justify-center rounded-md border-2 bg-card font-heading text-sm font-semibold shadow-soft transition-transform duration-150 sm:h-20 sm:w-14 sm:text-base ${
        isRed ? "text-destructive" : "text-foreground"
      } ${selected ? "-translate-y-2 border-primary" : "border-border"} ${dragging ? "opacity-30" : ""}`}
    >
      <span>{rankLabel(card.rank)}</span>
      <span>{SUIT_SYMBOL[card.suit]}</span>
    </div>
  );
}

export default function SolitairePage() {
  const { user } = useAuth();
  const [result, setResult] = useState(undefined);
  const [state, setState] = useState(deal);
  const [history, setHistory] = useState([]);
  const [selection, setSelection] = useState(null); // { source: 'tableau'|'waste', col, startIndex }
  const [ended, setEnded] = useState(false);
  const [drag, setDrag] = useState(null); // { card, count, x, y }
  const dragInfoRef = useRef(null); // { source, col, startIndex, card }

  useEffect(() => {
    if (!user) return;
    getTodayResult(user.id, "solitaire").then(setResult);
  }, [user]);

  const totalFoundation = useMemo(
    () => Object.values(state.foundations).reduce((s, p) => s + p.length, 0),
    [state.foundations]
  );
  const won = totalFoundation === 52;

  const finishTry = async (didWin) => {
    const updated = await recordAttempt(user.id, "solitaire", { won: didWin, points: didWin ? 150 : 0 });
    setResult(updated);
    setEnded(true);
  };

  useEffect(() => {
    if (won) finishTry(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [won]);

  const pushHistory = () => {
    setHistory((h) => [...h.slice(-(MAX_HISTORY - 1)), state]);
  };

  const undo = () => {
    setHistory((h) => {
      if (h.length === 0) return h;
      setState(h[h.length - 1]);
      setSelection(null);
      return h.slice(0, -1);
    });
  };

  const canPlaceOnTableau = (card, col) => {
    const pile = state.tableau[col];
    if (pile.length === 0) return card.rank === 13;
    const top = pile[pile.length - 1];
    return top.faceUp && RED.has(card.suit) !== RED.has(top.suit) && card.rank === top.rank - 1;
  };

  const canPlaceOnFoundation = (card) => {
    const pile = state.foundations[card.suit];
    if (pile.length === 0) return card.rank === 1;
    return pile[pile.length - 1].rank === card.rank - 1;
  };

  const drawStock = () => {
    pushHistory();
    setState((s) => {
      if (s.stock.length === 0) {
        return { ...s, stock: s.waste.map((c) => ({ ...c, faceUp: false })).reverse(), waste: [] };
      }
      const [drawn, ...rest] = s.stock;
      return { ...s, stock: rest, waste: [...s.waste, { ...drawn, faceUp: true }] };
    });
  };

  const sequenceAt = (source, col, startIndex) => {
    if (source === "waste") {
      const card = state.waste[state.waste.length - 1];
      return card ? [card] : [];
    }
    return state.tableau[col].slice(startIndex);
  };

  const removeSequence = (source, col, count, nextState) => {
    if (source === "waste") {
      return { ...nextState, waste: nextState.waste.slice(0, -1) };
    }
    const pile = nextState.tableau[col].slice(0, -count);
    if (pile.length > 0) pile[pile.length - 1] = { ...pile[pile.length - 1], faceUp: true };
    const tableau = [...nextState.tableau];
    tableau[col] = pile;
    return { ...nextState, tableau };
  };

  const moveToTableau = (source, col, startIndex, destCol) => {
    const seq = sequenceAt(source, col, startIndex);
    if (seq.length === 0 || !canPlaceOnTableau(seq[0], destCol)) return false;
    if (source === "tableau" && destCol === col) return false;
    pushHistory();
    setState((s) => {
      const cleared = removeSequence(source, col, seq.length, s);
      const tableau = [...cleared.tableau];
      tableau[destCol] = [...tableau[destCol], ...seq.map((c) => ({ ...c, faceUp: true }))];
      return { ...cleared, tableau };
    });
    return true;
  };

  const moveToFoundation = (source, col, startIndex) => {
    const seq = sequenceAt(source, col, startIndex);
    if (seq.length !== 1 || !canPlaceOnFoundation(seq[0])) return false;
    const card = seq[0];
    pushHistory();
    setState((s) => {
      const cleared = removeSequence(source, col, 1, s);
      const foundations = { ...cleared.foundations, [card.suit]: [...cleared.foundations[card.suit], card] };
      return { ...cleared, foundations };
    });
    return true;
  };

  // Double-click: try foundation first (single card only), else a random valid tableau column.
  // startIndex is the specific card double-clicked, not necessarily the top of the pile,
  // so double-clicking anywhere in a movable stack moves that whole stack.
  const autoMove = (source, col, startIndex) => {
    if (moveToFoundation(source, col, startIndex)) return;
    const seq = sequenceAt(source, col, startIndex);
    if (seq.length === 0) return;
    const options = state.tableau
      .map((_, i) => i)
      .filter((i) => !(source === "tableau" && i === col) && canPlaceOnTableau(seq[0], i));
    if (options.length > 0) {
      const choice = options[Math.floor(Math.random() * options.length)];
      moveToTableau(source, col, startIndex, choice);
    }
  };

  const handleWasteClick = () => {
    if (state.waste.length === 0) return;
    if (selection?.source === "waste") { setSelection(null); return; }
    setSelection({ source: "waste" });
  };

  const handleTableauCardClick = (col, cardIndex) => {
    const pile = state.tableau[col];
    const minMovable = movableStartIndex(pile);

    if (selection) {
      if (selection.source === "tableau" && selection.col === col) { setSelection(null); return; }
      const moved = moveToTableau(selection.source, selection.col, selection.startIndex, col);
      setSelection(null);
      if (moved) return;
    }

    if (cardIndex < minMovable) return; // buried card, not part of a movable run
    setSelection({ source: "tableau", col, startIndex: cardIndex });
  };

  const handleEmptyColumnClick = (col) => {
    if (!selection) return;
    if (moveToTableau(selection.source, selection.col, selection.startIndex, col)) {
      setSelection(null);
    }
  };

  const handleFoundationClick = (suit) => {
    if (!selection) return;
    const seq = sequenceAt(selection.source, selection.col, selection.startIndex);
    if (seq.length === 1 && seq[0].suit === suit && moveToFoundation(selection.source, selection.col, selection.startIndex)) {
      setSelection(null);
    }
  };

  // --- Drag and drop (pointer events) ---
  const startDrag = (e, source, col, cardIndex) => {
    const pile = source === "tableau" ? state.tableau[col] : null;
    if (source === "tableau") {
      const minMovable = movableStartIndex(pile);
      if (cardIndex < minMovable) return;
    }
    const seq = sequenceAt(source, col, cardIndex);
    if (seq.length === 0) return;
    e.preventDefault();
    setSelection(null);
    dragInfoRef.current = { source, col, startIndex: cardIndex, card: seq[0] };
    setDrag({ card: seq[0], count: seq.length, x: e.clientX, y: e.clientY });

    const onMove = (ev) => setDrag((d) => (d ? { ...d, x: ev.clientX, y: ev.clientY } : d));
    const onUp = (ev) => {
      window.removeEventListener("pointermove", onMove);
      const info = dragInfoRef.current;
      dragInfoRef.current = null;
      setDrag(null);
      if (!info) return;
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      const target = el?.closest("[data-drop]");
      if (!target) return;
      const [kind, key] = target.dataset.drop.split(":");
      if (kind === "tableau") moveToTableau(info.source, info.col, info.startIndex, Number(key));
      else if (kind === "foundation" && info.card.suit === key) moveToFoundation(info.source, info.col, info.startIndex);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
  };

  const giveUp = () => finishTry(false);

  const startNewTry = () => {
    setState(deal());
    setHistory([]);
    setSelection(null);
    setEnded(false);
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

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-4xl font-medium">Solitaire</h1>
          <p className="mt-2 text-muted-foreground">Drag a card (or a stack), or click then click a destination. Double-click to auto-play.</p>
        </div>
        {!over && !ended && (
          <button
            onClick={undo}
            disabled={history.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-card px-3 py-2 text-sm text-muted-foreground shadow-soft hover:text-foreground disabled:opacity-40"
          >
            <Undo2 className="h-4 w-4" /> Undo
          </button>
        )}
      </header>

      {over ? (
        <div className="rounded-3xl bg-card p-10 text-center shadow-soft">
          <p className="font-heading text-2xl font-medium">
            {result.status === "completed" ? "Nicely done. 🌿" : "That's all your tries for today."}
          </p>
          <p className="mt-2 text-muted-foreground">Come back tomorrow for another deal.</p>
        </div>
      ) : ended ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl bg-card p-10 text-center shadow-soft">
          <p className="font-heading text-xl font-medium">That deal's done.</p>
          {remaining > 0 && (
            <button
              onClick={startNewTry}
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90"
            >
              Try again ({remaining} left)
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-6 overflow-x-auto pb-4">
          <div className="flex items-start gap-6">
            <div className="flex gap-2">
              <div
                onClick={drawStock}
                className="flex h-16 w-12 cursor-pointer items-center justify-center rounded-md border border-border bg-muted text-xs text-muted-foreground sm:h-20 sm:w-14"
              >
                {state.stock.length === 0 ? <RotateCcw className="h-4 w-4" /> : state.stock.length}
              </div>
              <div>
                {state.waste.length > 0 ? (
                  <Card
                    card={state.waste[state.waste.length - 1]}
                    selected={selection?.source === "waste"}
                    dragging={drag && dragInfoRef.current?.source === "waste"}
                    onClick={handleWasteClick}
                    onDoubleClick={() => autoMove("waste", null, 0)}
                    onPointerDown={(e) => startDrag(e, "waste", null, 0)}
                  />
                ) : (
                  <div className="h-16 w-12 rounded-md border border-dashed border-border sm:h-20 sm:w-14" />
                )}
              </div>
            </div>

            <div className="ml-auto flex gap-2">
              {SUITS.map((suit) => (
                <div
                  key={suit}
                  data-drop={`foundation:${suit}`}
                  onClick={() => handleFoundationClick(suit)}
                  className={`flex h-16 w-12 items-center justify-center rounded-md border border-dashed sm:h-20 sm:w-14 ${
                    RED.has(suit) ? "text-destructive" : "text-foreground"
                  } border-border font-heading text-lg`}
                >
                  {state.foundations[suit].length > 0
                    ? `${rankLabel(state.foundations[suit][state.foundations[suit].length - 1].rank)}${SUIT_SYMBOL[suit]}`
                    : SUIT_SYMBOL[suit]}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {state.tableau.map((pile, col) => {
              const minMovable = movableStartIndex(pile);
              return (
                <div key={col} data-drop={`tableau:${col}`} className="relative flex min-h-[8rem] flex-col items-center">
                  {pile.length === 0 ? (
                    <div
                      onClick={() => handleEmptyColumnClick(col)}
                      className="h-16 w-12 rounded-md border border-dashed border-border sm:h-20 sm:w-14"
                    />
                  ) : (
                    pile.map((card, i) => {
                      const isMovable = i >= minMovable && card.faceUp;
                      const isSelected = selection?.source === "tableau" && selection.col === col && i >= selection.startIndex;
                      return (
                        <div key={card.id} style={{ marginTop: i === 0 ? 0 : -48 }} className="relative">
                          <Card
                            card={card}
                            onClick={isMovable ? () => handleTableauCardClick(col, i) : undefined}
                            onDoubleClick={isMovable ? () => autoMove("tableau", col, i) : undefined}
                            onPointerDown={isMovable ? (e) => startDrag(e, "tableau", col, i) : undefined}
                            selected={isSelected}
                            dragging={drag && dragInfoRef.current?.source === "tableau" && dragInfoRef.current?.col === col && i >= dragInfoRef.current?.startIndex}
                          />
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })}
          </div>

          <button onClick={giveUp} className="self-start text-sm text-muted-foreground underline">
            Give up this try
          </button>
        </div>
      )}

      {drag && (
        <div
          className="pointer-events-none fixed z-50 flex h-16 w-12 flex-col items-center justify-center rounded-md border-2 border-primary bg-card font-heading text-sm font-semibold shadow-soft-lg sm:h-20 sm:w-14 sm:text-base"
          style={{
            left: drag.x - 24,
            top: drag.y - 32,
            color: RED.has(drag.card.suit) ? "hsl(var(--destructive))" : "hsl(var(--foreground))",
          }}
        >
          <span>{rankLabel(drag.card.rank)}</span>
          <span>{SUIT_SYMBOL[drag.card.suit]}</span>
          {drag.count > 1 && (
            <span className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-primary text-[10px] text-primary-foreground">
              {drag.count}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
