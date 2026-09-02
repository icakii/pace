import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { recordAttempt, getTodayResult, attemptsRemaining, isGameOver } from "@/lib/gameResults";
import { ArrowLeft, Loader2, RotateCcw } from "lucide-react";

const SUITS = ["S", "H", "D", "C"];
const RED = new Set(["H", "D"]);
const SUIT_SYMBOL = { S: "♠", H: "♥", D: "♦", C: "♣" };

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
  const [selection, setSelection] = useState(null); // { source: 'tableau'|'waste', col }
  const [ended, setEnded] = useState(false);
  const [drag, setDrag] = useState(null); // { source, col, card, x, y }

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
    setState((s) => {
      if (s.stock.length === 0) {
        return { ...s, stock: s.waste.map((c) => ({ ...c, faceUp: false })).reverse(), waste: [] };
      }
      const [drawn, ...rest] = s.stock;
      return { ...s, stock: rest, waste: [...s.waste, { ...drawn, faceUp: true }] };
    });
  };

  const cardAt = (source, col) => {
    if (source === "waste") return state.waste[state.waste.length - 1];
    return state.tableau[col][state.tableau[col].length - 1];
  };

  const removeFrom = (source, col, nextState) => {
    if (source === "waste") {
      return { ...nextState, waste: nextState.waste.slice(0, -1) };
    }
    const pile = [...nextState.tableau[col]];
    pile.pop();
    if (pile.length > 0) pile[pile.length - 1] = { ...pile[pile.length - 1], faceUp: true };
    const tableau = [...nextState.tableau];
    tableau[col] = pile;
    return { ...nextState, tableau };
  };

  const moveToTableau = (source, sourceCol, destCol) => {
    const card = cardAt(source, sourceCol);
    if (!card || !canPlaceOnTableau(card, destCol)) return false;
    setState((s) => {
      const cleared = removeFrom(source, sourceCol, s);
      const tableau = [...cleared.tableau];
      tableau[destCol] = [...tableau[destCol], { ...card, faceUp: true }];
      return { ...cleared, tableau };
    });
    return true;
  };

  const moveToFoundation = (source, sourceCol) => {
    const card = cardAt(source, sourceCol);
    if (!card || !canPlaceOnFoundation(card)) return false;
    setState((s) => {
      const cleared = removeFrom(source, sourceCol, s);
      const foundations = { ...cleared.foundations, [card.suit]: [...cleared.foundations[card.suit], card] };
      return { ...cleared, foundations };
    });
    return true;
  };

  // Double-click: try foundation first, else a random valid tableau column.
  const autoMove = (source, col) => {
    const card = cardAt(source, col);
    if (!card) return;
    if (moveToFoundation(source, col)) return;
    const options = state.tableau
      .map((_, i) => i)
      .filter((i) => !(source === "tableau" && i === col) && canPlaceOnTableau(card, i));
    if (options.length > 0) {
      const choice = options[Math.floor(Math.random() * options.length)];
      moveToTableau(source, col, choice);
    }
  };

  const handleWasteClick = () => {
    if (state.waste.length === 0) return;
    if (selection?.source === "waste") { setSelection(null); return; }
    setSelection({ source: "waste" });
  };

  const handleTableauTopClick = (col) => {
    const pile = state.tableau[col];
    if (pile.length === 0) {
      if (selection) {
        if (moveToTableau(selection.source, selection.col, col)) setSelection(null);
      }
      return;
    }
    const top = pile[pile.length - 1];
    if (!top.faceUp) return;
    if (selection?.source === "tableau" && selection.col === col) { setSelection(null); return; }
    if (selection) {
      if (moveToTableau(selection.source, selection.col, col)) setSelection(null);
    } else {
      setSelection({ source: "tableau", col });
    }
  };

  const handleFoundationClick = (suit) => {
    if (!selection) return;
    const card = cardAt(selection.source, selection.col);
    if (card?.suit === suit && moveToFoundation(selection.source, selection.col)) {
      setSelection(null);
    }
  };

  // --- Drag and drop (pointer events, works for mouse + touch) ---
  const startDrag = (e, source, col) => {
    const card = cardAt(source, col);
    if (!card) return;
    e.preventDefault();
    setSelection(null);
    setDrag({ source, col, card, x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    if (!drag) return;
    const onMove = (e) => setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : d));
    const onUp = (e) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const target = el?.closest("[data-drop]");
      if (target) {
        const [kind, key] = target.dataset.drop.split(":");
        if (kind === "tableau") moveToTableau(drag.source, drag.col, Number(key));
        else if (kind === "foundation" && drag.card.suit === key) moveToFoundation(drag.source, drag.col);
      }
      setDrag(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [drag]);

  const giveUp = () => finishTry(false);

  const startNewTry = () => {
    setState(deal());
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

      <header>
        <h1 className="font-heading text-4xl font-medium">Solitaire</h1>
        <p className="mt-2 text-muted-foreground">Drag a card, or click it then click where it should go. Double-click to auto-play.</p>
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
                    dragging={drag?.source === "waste"}
                    onClick={handleWasteClick}
                    onDoubleClick={() => autoMove("waste")}
                    onPointerDown={(e) => startDrag(e, "waste")}
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
            {state.tableau.map((pile, col) => (
              <div key={col} data-drop={`tableau:${col}`} className="relative flex min-h-[8rem] flex-col items-center">
                {pile.length === 0 ? (
                  <div
                    onClick={() => handleTableauTopClick(col)}
                    className="h-16 w-12 rounded-md border border-dashed border-border sm:h-20 sm:w-14"
                  />
                ) : (
                  pile.map((card, i) => {
                    const isTop = i === pile.length - 1;
                    return (
                      <div key={card.id} style={{ marginTop: i === 0 ? 0 : -48 }} className="relative">
                        <Card
                          card={card}
                          onClick={isTop ? () => handleTableauTopClick(col) : undefined}
                          onDoubleClick={isTop ? () => autoMove("tableau", col) : undefined}
                          onPointerDown={isTop ? (e) => startDrag(e, "tableau", col) : undefined}
                          selected={selection?.source === "tableau" && selection.col === col && isTop}
                          dragging={drag?.source === "tableau" && drag.col === col}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            ))}
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
        </div>
      )}
    </div>
  );
}
