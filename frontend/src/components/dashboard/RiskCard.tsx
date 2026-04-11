import type { Insight } from "../../lib/api";
import { formatCurrency } from "../../lib/utils";
import { Badge } from "../ui/badge";
import { AlertTriangle, TrendingDown, ShieldAlert } from "lucide-react";

interface Props {
  insight: Insight;
}

const RISK_CONFIG = {
  high: {
    label: "HIGH",
    bg: "bg-[rgba(227,107,99,0.12)]",
    border: "border-[rgba(227,107,99,0.5)]",
    badgeClass:
      "bg-[rgba(227,107,99,0.2)] text-[var(--fingaurd-coral)] border-[rgba(227,107,99,0.45)]",
    icon: ShieldAlert,
    iconColor: "text-[var(--fingaurd-coral)]",
    dotColor: "bg-[var(--fingaurd-coral)]",
  },
  medium: {
    label: "MEDIUM",
    bg: "bg-[rgba(207,164,74,0.12)]",
    border: "border-[rgba(207,164,74,0.42)]",
    badgeClass:
      "bg-[rgba(207,164,74,0.2)] text-[var(--fingaurd-amber)] border-[rgba(207,164,74,0.4)]",
    icon: AlertTriangle,
    iconColor: "text-[var(--fingaurd-amber)]",
    dotColor: "bg-[var(--fingaurd-amber)]",
  },
  low: {
    label: "LOW",
    bg: "bg-[rgba(13,158,138,0.12)]",
    border: "border-[rgba(13,158,138,0.42)]",
    badgeClass:
      "bg-[rgba(13,158,138,0.2)] text-[var(--fingaurd-brand)] border-[rgba(13,158,138,0.42)]",
    icon: TrendingDown,
    iconColor: "text-[var(--fingaurd-brand)]",
    dotColor: "bg-[var(--fingaurd-brand)]",
  },
};

export default function RiskCard({ insight }: Props) {
  const cfg = RISK_CONFIG[insight.risk_level];
  const Icon = cfg.icon;

  // Projected end-of-month balance
  const remainingBudget = insight.monthly_budget - insight.monthly_spend;
  const projectedBalance =
    insight.monthly_budget - (insight.monthly_spend + insight.overspend_amount);
  const isHigh = insight.risk_level === "high";

  return (
    <div
      className={`rounded-2xl border ${cfg.bg} ${cfg.border} p-6 shadow-sm ${isHigh ? "animate-[pulse_2.6s_ease-in-out_infinite]" : ""}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon size={18} className={cfg.iconColor} />
          <h2 className="text-sm font-semibold text-[var(--fingaurd-text)]">
            Risk Assessment
          </h2>
        </div>
        <Badge
          className={`${cfg.badgeClass} border text-xs font-bold uppercase tracking-wide`}
        >
          {cfg.label}
        </Badge>
      </div>

      {/* Overspend warning */}
      {insight.overspend_amount > 0 && (
        <div className="bg-[rgba(0,0,0,0.16)] border border-[rgba(227,107,99,0.35)] rounded-xl p-3.5 mb-4">
          <p className="text-xs text-[var(--fingaurd-text-muted)] mb-0.5">
            On track to overspend by
          </p>
          <p className="text-2xl font-extrabold text-[var(--fingaurd-coral)]">
            {formatCurrency(insight.overspend_amount)}
          </p>
          <p className="text-xs text-[var(--fingaurd-text-muted)] mt-0.5">
            this month
          </p>
        </div>
      )}

      {/* Risk factors */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-[var(--fingaurd-text-muted)] uppercase tracking-wider mb-2">
          Risk Factors
        </p>
        <ul className="space-y-1.5">
          {insight.risk_factors.map((factor, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-sm text-[var(--fingaurd-text)]"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${cfg.dotColor}`}
              />
              {factor}
            </li>
          ))}
        </ul>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/15">
        <div className="bg-[rgba(0,0,0,0.16)] rounded-lg p-3 border border-white/10">
          <p className="text-[10px] text-[var(--fingaurd-text-muted)] mb-1 uppercase tracking-wide">
            Remaining
          </p>
          <p
            className={`text-lg font-bold ${remainingBudget >= 0 ? "text-[var(--fingaurd-text)]" : "text-[var(--fingaurd-coral)]"}`}
          >
            {formatCurrency(remainingBudget)}
          </p>
        </div>
        <div className="bg-[rgba(0,0,0,0.16)] rounded-lg p-3 border border-white/10">
          <p className="text-[10px] text-[var(--fingaurd-text-muted)] mb-1 uppercase tracking-wide">
            Proj. Balance
          </p>
          <p
            className={`text-lg font-bold ${projectedBalance >= 0 ? "text-[var(--fingaurd-text)]" : "text-[var(--fingaurd-coral)]"}`}
          >
            {projectedBalance < 0 ? "-" : ""}
            {formatCurrency(Math.abs(projectedBalance))}
          </p>
        </div>
        <div className="bg-[rgba(0,0,0,0.16)] rounded-lg p-3 border border-white/10">
          <p className="text-[10px] text-[var(--fingaurd-text-muted)] mb-1 uppercase tracking-wide">
            Savings Rate
          </p>
          <p
            className={`text-lg font-bold ${insight.savings_rate < 0.1 ? "text-[var(--fingaurd-coral)]" : "text-[var(--fingaurd-text)]"}`}
          >
            {(insight.savings_rate * 100).toFixed(1)}%
          </p>
        </div>
        <div className="bg-[rgba(0,0,0,0.16)] rounded-lg p-3 border border-white/10">
          <p className="text-[10px] text-[var(--fingaurd-text-muted)] mb-1 uppercase tracking-wide">
            Top Category
          </p>
          <p className="text-sm font-bold text-[var(--fingaurd-text)] truncate">
            {insight.top_category}
          </p>
        </div>
      </div>
    </div>
  );
}
