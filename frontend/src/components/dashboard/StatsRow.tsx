import type { User, Insight } from "../../lib/api";
import { formatCurrency } from "../../lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Target,
  PiggyBank,
  DollarSign,
} from "lucide-react";

interface Props {
  user: User;
  insight: Insight;
}

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  highlight?: boolean;
}

function StatCard({
  label,
  value,
  icon: Icon,
  iconBg,
  iconColor,
  trend,
  trendLabel,
  highlight,
}: StatCardProps) {
  return (
    <div
      className={`bg-white rounded-2xl border shadow-sm p-5 flex flex-col gap-3 ${
        highlight ? "border-red-200 bg-red-50/30" : "border-slate-100"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {label}
        </p>
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}
        >
          <Icon size={16} className={iconColor} />
        </div>
      </div>
      <p
        className={`text-2xl font-extrabold tracking-tight ${highlight ? "text-red-600" : "text-slate-800"}`}
      >
        {value}
      </p>
      {trend && trendLabel && (
        <div
          className={`flex items-center gap-1 text-xs font-medium ${
            trend === "up"
              ? "text-red-500"
              : trend === "down"
                ? "text-emerald-500"
                : "text-slate-500"
          }`}
        >
          {trend === "up" ? (
            <TrendingUp size={12} />
          ) : trend === "down" ? (
            <TrendingDown size={12} />
          ) : null}
          {trendLabel}
        </div>
      )}
    </div>
  );
}

export default function StatsRow({ user, insight }: Props) {
  const remaining = insight.monthly_budget - insight.monthly_spend;
  const spentPct = (
    (insight.monthly_spend / insight.monthly_budget) *
    100
  ).toFixed(1);

  return (
    <div className="grid grid-cols-4 gap-4">
      <StatCard
        label="Monthly Income"
        value={formatCurrency(user.income)}
        icon={DollarSign}
        iconBg="bg-blue-50"
        iconColor="text-blue-600"
        trend="neutral"
        trendLabel="Gross monthly salary"
      />
      <StatCard
        label="Monthly Budget"
        value={formatCurrency(insight.monthly_budget)}
        icon={Target}
        iconBg="bg-indigo-50"
        iconColor="text-indigo-600"
        trend="neutral"
        trendLabel={`${Object.keys(user.category_budgets).length} categories`}
      />
      <StatCard
        label="Spent This Month"
        value={formatCurrency(insight.monthly_spend)}
        icon={Wallet}
        iconBg="bg-amber-50"
        iconColor="text-amber-600"
        trend="up"
        trendLabel={`${spentPct}% of budget used`}
        highlight={Number(spentPct) >= 90}
      />
      <StatCard
        label="Remaining Budget"
        value={formatCurrency(Math.max(0, remaining))}
        icon={PiggyBank}
        iconBg={remaining < 5000 ? "bg-red-50" : "bg-emerald-50"}
        iconColor={remaining < 5000 ? "text-red-600" : "text-emerald-600"}
        trend={remaining < 5000 ? "up" : "down"}
        trendLabel={
          remaining < 5000
            ? "Critically low"
            : "Savings rate " + (insight.savings_rate * 100).toFixed(1) + "%"
        }
        highlight={remaining < 0}
      />
    </div>
  );
}
