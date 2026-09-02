import React from "react";
import { getQuoteOfTheDay } from "@/lib/quotes";
import { format } from "date-fns";

export default function QuotePage() {
  const quote = getQuoteOfTheDay();

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="font-heading text-4xl md:text-5xl font-medium">Daily Quote</h1>
        <p className="mt-2 text-muted-foreground">{format(new Date(), "EEEE, MMMM d")}</p>
      </header>

      <div className="flex min-h-[50vh] items-center justify-center rounded-3xl bg-gradient-to-br from-primary/15 to-accent/10 p-8 shadow-soft md:p-16">
        <blockquote className="max-w-2xl text-center">
          <p className="font-heading text-2xl italic leading-relaxed text-foreground md:text-4xl">
            "{quote.text}"
          </p>
          <footer className="mt-6 text-sm uppercase tracking-[0.2em] text-muted-foreground">
            — {quote.author}
          </footer>
        </blockquote>
      </div>
    </div>
  );
}
