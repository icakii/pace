import React from "react";

export default function Logo({ className = "" }) {
  return (
    <div
      className={`flex items-center justify-center w-11 h-11 rounded-2xl bg-primary shrink-0 ${className}`}
    >
      <span className="font-heading text-2xl font-bold leading-none text-primary-foreground">P</span>
    </div>
  );
}
