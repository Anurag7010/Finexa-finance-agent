import type { Insight } from "../../lib/api";
import { formatCurrency } from "../../lib/utils";
import { Badge } from "../ui/badge";
import { AlertTriangle, TrendingDown, ShieldAlert } from "lucide-react";

interface Props {
  insight: Insight;
}

const RISK_CONFIG = {
  high: {
    label: "High Risk",
    bg: "bg-red-50",
    border: "border-red-200",
    badgeClass: "bg-red-100 text-red-700 border-red-300",
    icon: ShieldAlert,
    iconColor: "text-red-500",
    dotColor: "bg-red-500",
  },
  medium: {
    label: "Medium Risk",
    bg: "bg-amber-50",
    border: "border-amber-200",
    badgeClass: "bg-amber-100 text-amber-700 border-amber-300",
    icon: AlertTriangle,
    iconColor: "text-amber-500",
    dotColor: "bg-amber-500",
  },
  low: {
    label: "Low Risk",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-300",
    icon: TrendingDown,
    iconColor: "text-emerald-500",
    dotColor: "bg-emerald-500",
  },
};

export default function RiskCard({ insight }: Props) {
  const cfg = RISK_CONFIG[insight.risk_level];
  const Icon = cfg.icon;

  // Projected end-of-month balance
  const remainingBudget = insight.monthly_budget - insight.monthly_spend;
  const projectedBalance = insight.monthly_budget - (insight.monthly_spend + insight.overspend_amount);

  return (
    <div className={`rounded-2xl border ${cfg.bg} ${cfg.border} p-6 shadow-sm`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon size={18} className={cfg.iconColor} />
          <h2 className="text-sm font-semibold text-slate-700">Risk Assessment</h2>
        </div>
        <Badge className={`${cfg.badgeClass} border text-xs font-bold uppercase tracking-wide`}>
          {cfg.label}
        </Badge>
      </div>

      {/* Overspend warning */}
      {insight.overspend_amount > 0 && (
        <div className="bg-white/70 border border-red-200 rounded-xl p-3.5 mb-4">
          <p className="text-xs text-slate-500 mb-0.5">On track to overspend by</p>
          <p className="text-2xl font-extrabold text-red-600">
            {formatCurrency(insight.overspend_amount)}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">this month</p>
        </div>
      )}

      {/* Risk factors */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Risk Factors
        </p>
        <ul className="space-y-1.5">
          {insight.risk_factors.map((factor, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
              <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${cfg.dotColor}`} />
              {factor}
            </li>
          ))}
        </ul>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/60">
        <div className="bg-white/60 rounded-lg p-3">
          <p className="text-[10px] text-slate-500 mb-1 uppercase tracking-wide">Remaining</p>
          <p className={`text-lg font-bold ${remainingBudget >= 0 ? "text-slate-800" : "text-red-600"}`}>
            {formatCurrency(Math.max(0, remainingBudget))}
          </p>
        </div>
        <div className="bg-white/60 rounded-lg p-3">
          <p className="text-[10px] text-slate-500 mb-1 uppercase tracking-wide">Proj. Balance</p>
          <p className={`text-lg font-bold ${projectedBalance >= 0 ? "text-slate-800" : "text-red-600"}`}>
            {projectedBalance < 0 ? "-" : ""}{formatCurrency(Math.abs(projectedBalance))}
          </p>
        </div>
        <div className="bg-white/60 rounded-lg p-3">
          <p className="text-[10px] text-slate-500 mb-1 uppercase tracking-wide">Savings Rate</p>
          <p className={`text-lg font-bold ${insight.savings_rate < 0.1 ? "text-red-600" : "text-slate-800"}`}>
            {(insight.savings_rate * 100).toFixed(1)}%
          </p>
        </div>
        <div className="bg-white/60 rounded-lg p-3">
          <p className="text-[10px] text-slate-500 mb-1 uppercase tracking-wide">Top Category</p>
          <p className="text-sm font-bold text-slate-800 truncate">{insight.top_category}</p>
        </div>
      </div>
    </div>
  );
}
