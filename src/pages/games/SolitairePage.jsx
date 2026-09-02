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

function Card({ card, onClick, selected }) {
  if (!card) return null;
  if (!card.faceUp) {
    return (
      <div
        onClick={onClick}
        className="flex h-16 w-12 items-center justify-center rounded-md border border-border bg-primary/30 sm:h-20 sm:w-14"
      />
    );
  }
  const isRed = RED.has(card.suit);
  return (
    <div
      onClick={onClick}
      className={`flex h-16 w-12 cursor-pointer flex-col items-center justify-center rounded-md border-2 bg-card font-heading text-sm font-semibold shadow-soft transition-transform sm:h-20 sm:w-14 sm:text-base ${
        isRed ? "text-destructive" : "text-foreground"
      } ${selected ? "-translate-y-2 border-primary" : "border-border"}`}
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

  const selectedCard = () => {
    if (!selection) return null;
    if (selection.source === "waste") return state.waste[state.waste.length - 1];
    return state.tableau[selection.col][state.tableau[selection.col].length - 1];
  };

  const clearSelectionFrom = (nextState) => {
    if (!selection) return nextState;
    if (selection.source === "waste") {
      return { ...nextState, waste: nextState.waste.slice(0, -1) };
    }
    const col = [...nextState.tableau[selection.col]];
    col.pop();
    if (col.length > 0) col[col.length - 1] = { ...col[col.length - 1], faceUp: true };
    const tableau = [...nextState.tableau];
    tableau[selection.col] = col;
    return { ...nextState, tableau };
  };

  const handleWasteClick = () => {
    if (state.waste.length === 0) return;
    if (selection?.source === "waste") { setSelection(null); return; }
    setSelection({ source: "waste" });
  };

  const handleTableauTopClick = (col) => {
    const pile = state.tableau[col];
    if (pile.length === 0) {
      handleTableauDrop(col);
      return;
    }
    const top = pile[pile.length - 1];
    if (!top.faceUp) return;
    if (selection?.source === "tableau" && selection.col === col) { setSelection(null); return; }
    if (selection) {
      handleTableauDrop(col);
    } else {
      setSelection({ source: "tableau", col });
    }
  };

  const handleTableauDrop = (col) => {
    const card = selectedCard();
    if (!card) return;
    if (!canPlaceOnTableau(card, col)) return;
    setState((s) => {
      const cleared = clearSelectionFrom(s);
      const tableau = [...cleared.tableau];
      tableau[col] = [...tableau[col], { ...card, faceUp: true }];
      return { ...cleared, tableau };
    });
    setSelection(null);
  };

  const handleFoundationClick = (suit) => {
    const card = selectedCard();
    if (!card || card.suit !== suit) return;
    if (!canPlaceOnFoundation(card)) return;
    setState((s) => {
      const cleared = clearSelectionFrom(s);
      const foundations = { ...cleared.foundations, [suit]: [...cleared.foundations[suit], card] };
      return { ...cleared, foundations };
    });
    setSelection(null);
  };

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
          {over ? (result.status === "completed" ? "Completed" : "Lost today") : `${remaining} tries left`}
        </span>
      </div>

      <header>
        <h1 className="font-heading text-4xl font-medium">Solitaire</h1>
        <p className="mt-2 text-muted-foreground">Click a card, then click where it should go.</p>
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
              <div onClick={handleWasteClick}>
                {state.waste.length > 0 ? (
                  <Card card={state.waste[state.waste.length - 1]} selected={selection?.source === "waste"} />
                ) : (
                  <div className="h-16 w-12 rounded-md border border-dashed border-border sm:h-20 sm:w-14" />
                )}
              </div>
            </div>

            <div className="ml-auto flex gap-2">
              {SUITS.map((suit) => (
                <div
                  key={suit}
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
              <div key={col} className="relative flex min-h-[8rem] flex-col items-center">
                {pile.length === 0 ? (
                  <div
                    onClick={() => handleTableauTopClick(col)}
                    className="h-16 w-12 rounded-md border border-dashed border-border sm:h-20 sm:w-14"
                  />
                ) : (
                  pile.map((card, i) => (
                    <div key={card.id} style={{ marginTop: i === 0 ? 0 : -48 }} className="relative">
                      <Card
                        card={card}
                        onClick={() => (i === pile.length - 1 ? handleTableauTopClick(col) : undefined)}
                        selected={selection?.source === "tableau" && selection.col === col && i === pile.length - 1}
                      />
                    </div>
                  ))
                )}
              </div>
            ))}
          </div>

          <button onClick={giveUp} className="self-start text-sm text-muted-foreground underline">
            Give up this try
          </button>
        </div>
      )}
    </div>
  );
}
