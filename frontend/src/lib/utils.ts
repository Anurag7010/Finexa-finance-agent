import { clsx, type ClassValue } from "clsx";
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
  if (score >= 80) return "text-emerald-500";
  if (score >= 60) return "text-amber-500";
  return "text-red-500";
}

/** Returns Tailwind background + text classes for risk badge */
export function getRiskBadgeColor(level: "low" | "medium" | "high"): string {
  switch (level) {
    case "low":
      return "bg-emerald-100 text-emerald-700 border-emerald-300";
    case "medium":
      return "bg-amber-100 text-amber-700 border-amber-300";
    case "high":
      return "bg-red-100 text-red-700 border-red-300";
    default:
      return "bg-gray-100 text-gray-700 border-gray-300";
  }
}

/** Returns an emoji icon for a spending category */
export function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    "Food & Dining": "🍽️",
    Transportation: "🚗",
    Shopping: "🛍️",
    Entertainment: "🎬",
    Utilities: "⚡",
    Health: "💊",
    Groceries: "🛒",
    Rent: "🏠",
    Other: "📦",
  };
  return icons[category] ?? "💳";
}

/** Returns color class for a progress bar based on % used */
export function getBudgetBarColor(pct: number): string {
  if (pct >= 90) return "bg-red-500";
  if (pct >= 70) return "bg-amber-500";
  return "bg-emerald-500";
}

/** Returns a stroke color for the health score arc */
export function getScoreStrokeColor(score: number): string {
  if (score >= 80) return "#10b981"; // emerald-500
  if (score >= 60) return "#f59e0b"; // amber-500
  return "#ef4444"; // red-500
}
