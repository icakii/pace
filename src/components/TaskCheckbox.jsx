import React from "react";
import { Check } from "lucide-react";

export function TaskCheckbox({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onChange}
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all duration-200 ${
        checked
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input bg-card hover:border-primary/60"
      } ${disabled ? "opacity-50" : ""}`}
      aria-pressed={checked}
    >
      {checked && <Check className="h-3.5 w-3.5" strokeWidth={2.5} />}
    </button>
  );
}
