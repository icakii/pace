import { format, parseISO, addWeeks, addMonths, addYears, isBefore } from "date-fns";

export const CYCLES = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

export const COMMON_CURRENCIES = ["USD", "EUR", "GBP", "BGN"];

function addCycle(date, cycle) {
  if (cycle === "weekly") return addWeeks(date, 1);
  if (cycle === "yearly") return addYears(date, 1);
  return addMonths(date, 1);
}

export function nextOccurrence(nextChargeDate, cycle, from = new Date()) {
  let d = typeof nextChargeDate === "string" ? parseISO(nextChargeDate) : nextChargeDate;
  const today = new Date(from);
  today.setHours(0, 0, 0, 0);
  let guard = 0;
  while (isBefore(d, today) && guard < 1000) {
    d = addCycle(d, cycle);
    guard++;
  }
  return d;
}

export function monthlyEquivalent(amount, cycle) {
  if (cycle === "weekly") return (amount * 52) / 12;
  if (cycle === "yearly") return amount / 12;
  return amount;
}

export function yearlyEquivalent(amount, cycle) {
  if (cycle === "weekly") return amount * 52;
  if (cycle === "monthly") return amount * 12;
  return amount;
}

export function formatMoney(amount, currency) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function formatNextCharge(payment) {
  return format(nextOccurrence(payment.next_charge_date, payment.billing_cycle), "MMM d, yyyy");
}
