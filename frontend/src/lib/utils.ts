import { clsx, type ClassValue } from "clsx";
import type { LucideIcon } from "lucide-react";
import {
  Car,
  Clapperboard,
  CreditCard,
  HeartPulse,
  House,
  Package,
  ShoppingBag,
  ShoppingBasket,
  UtensilsCrossed,
  Zap,
} from "lucide-react";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formats a number as Indian-locale currency: ₹1,23,456 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Formats a Date or ISO string as "12 Jan 2025" */
export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Returns Tailwind text-color class based on health score */
export function getScoreColor(score: number): string {
  if (score >= 80) return "text-[var(--fingaurd-success)]";
  if (score >= 60) return "text-[var(--fingaurd-amber)]";
  return "text-[var(--fingaurd-coral)]";
}

/** Returns Tailwind background + text classes for risk badge */
export function getRiskBadgeColor(level: "low" | "medium" | "high"): string {
  switch (level) {
    case "low":
      return "bg-[rgba(13,158,138,0.2)] text-[var(--fingaurd-brand)] border-[rgba(13,158,138,0.42)]";
    case "medium":
      return "bg-[rgba(207,164,74,0.2)] text-[var(--fingaurd-amber)] border-[rgba(207,164,74,0.42)]";
    case "high":
      return "bg-[rgba(227,107,99,0.2)] text-[var(--fingaurd-coral)] border-[rgba(227,107,99,0.44)]";
    default:
      return "bg-[rgba(255,255,255,0.08)] text-[var(--fingaurd-text)] border-white/15";
  }
}

/** Returns a lucide icon component for a spending category */
export function getCategoryIcon(category: string): LucideIcon {
  const icons: Record<string, LucideIcon> = {
    "Food & Dining": UtensilsCrossed,
    Transportation: Car,
    Shopping: ShoppingBag,
    Entertainment: Clapperboard,
    Utilities: Zap,
    Health: HeartPulse,
    Groceries: ShoppingBasket,
    Rent: House,
    Other: Package,
  };
  return icons[category] ?? CreditCard;
}

/** Returns color class for a progress bar based on % used */
export function getBudgetBarColor(pct: number): string {
  if (pct >= 90) return "bg-[var(--fingaurd-coral)]";
  if (pct >= 70) return "bg-[var(--fingaurd-amber)]";
  return "bg-[var(--fingaurd-success)]";
}

/** Returns a stroke color for the health score arc */
export function getScoreStrokeColor(score: number): string {
  if (score >= 80) return "#43b581";
  if (score >= 60) return "#cfa44a";
  return "#e36b63";
}
