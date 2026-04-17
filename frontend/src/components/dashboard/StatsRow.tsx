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
  iconWrapClass: string;
  iconColor: string;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  highlight?: boolean;
}

function StatCard({
  label,
  value,
  icon: Icon,
  iconWrapClass,
  iconColor,
  trend,
  trendLabel,
  highlight,
}: StatCardProps) {
  return (
    <div
      className={`rounded-2xl border p-5 flex flex-col gap-3 bg-(--fingaurd-surface) ${
        highlight
          ? "border-[rgba(227,107,99,0.35)] bg-[rgba(227,107,99,0.08)]"
          : "border-(--fingaurd-border)"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-(--fingaurd-text-muted)">
          {label}
        </p>
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center border ${iconWrapClass}`}
        >
          <Icon size={16} className={iconColor} />
        </div>
      </div>
      <p
        className={`text-2xl font-extrabold tracking-tight ${highlight ? "text-(--fingaurd-coral)" : "text-(--fingaurd-text)"}`}
      >
        {value}
      </p>
      {trend && trendLabel && (
        <div
          className={`flex items-center gap-1 text-xs font-medium ${
            trend === "up"
              ? "text-(--fingaurd-coral)"
              : trend === "down"
                ? "text-(--fingaurd-success)"
                : "text-(--fingaurd-text-muted)"
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
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Monthly Income"
        value={formatCurrency(user.income)}
        icon={DollarSign}
        iconWrapClass="border-[rgba(13,158,138,0.35)] bg-[rgba(13,158,138,0.14)]"
        iconColor="text-(--fingaurd-brand)"
        trend="neutral"
        trendLabel="Gross monthly salary"
      />
      <StatCard
        label="Monthly Budget"
        value={formatCurrency(insight.monthly_budget)}
        icon={Target}
        iconWrapClass="border-[rgba(125,183,207,0.35)] bg-[rgba(125,183,207,0.14)]"
        iconColor="text-[#7db7cf]"
        trend="neutral"
        trendLabel={`${Object.keys(user.category_budgets).length} categories`}
      />
      <StatCard
        label="Spent This Month"
        value={formatCurrency(insight.monthly_spend)}
        icon={Wallet}
        iconWrapClass="border-[rgba(207,164,74,0.35)] bg-[rgba(207,164,74,0.14)]"
        iconColor="text-(--fingaurd-amber)"
        trend="up"
        trendLabel={`${spentPct}% of budget used`}
        highlight={Number(spentPct) >= 90}
      />
      <StatCard
        label="Remaining Budget"
        value={formatCurrency(remaining)}
        icon={PiggyBank}
        iconWrapClass={
          remaining < 5000
            ? "border-[rgba(227,107,99,0.38)] bg-[rgba(227,107,99,0.14)]"
            : "border-[rgba(67,181,129,0.34)] bg-[rgba(67,181,129,0.14)]"
        }
        iconColor={
          remaining < 5000
            ? "text-[var(--fingaurd-coral)]"
            : "text-(--fingaurd-success)"
        }
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
