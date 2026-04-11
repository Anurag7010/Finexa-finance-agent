import { createElement } from "react";
import type { Insight, User } from "../../lib/api";
import {
  formatCurrency,
  getCategoryIcon,
  getBudgetBarColor,
} from "../../lib/utils";

interface Props {
  insight: Insight;
  user: User;
}

export default function CategoryBreakdown({ insight, user }: Props) {
  const categoryBudgets = user.category_budgets;

  // Build sorted list with % used
  const categories = Object.entries(insight.category_summary)
    .map(([name, spent]) => {
      const budget = categoryBudgets[name] ?? 1;
      const pct = (spent / budget) * 100;
      return { name, spent, budget, pct };
    })
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 6);

  return (
    <div className="rounded-2xl border border-[var(--fingaurd-border)] bg-[var(--fingaurd-surface)] p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-sm font-semibold text-[var(--fingaurd-text)]">
            Category Breakdown
          </h2>
          <p className="mt-0.5 text-xs text-[var(--fingaurd-text-muted)]">
            This month vs budget
          </p>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-[var(--fingaurd-text-muted)]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-[var(--fingaurd-success)] inline-block" />
            &lt;70%
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-[var(--fingaurd-amber)] inline-block" />
            70–90%
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-[var(--fingaurd-coral)] inline-block" />
            &gt;90%
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {categories.map(({ name, spent, budget, pct }) => {
          const barColor = getBudgetBarColor(pct);
          const cappedPct = Math.min(pct, 100);

          return (
            <div key={name}>
              <div className="mb-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[rgba(255,255,255,0.06)] text-base leading-none">
                    {createElement(getCategoryIcon(name), {
                      className: "h-4 w-4 text-[var(--fingaurd-text-muted)]",
                    })}
                  </span>
                  <span className="text-sm font-medium text-[var(--fingaurd-text)]">
                    {name}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[var(--fingaurd-text-muted)]">
                    {formatCurrency(spent)}{" "}
                    <span className="text-[rgba(232,245,244,0.34)]">
                      / {formatCurrency(budget)}
                    </span>
                  </span>
                  <span
                    className={`text-xs font-bold w-10 text-right ${
                      pct >= 90
                        ? "text-[var(--fingaurd-coral)]"
                        : pct >= 70
                          ? "text-[var(--fingaurd-amber)]"
                          : "text-[var(--fingaurd-success)]"
                    }`}
                  >
                    {pct.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Progress track */}
              <div className="h-2 rounded-full overflow-hidden bg-[rgba(232,245,244,0.12)]">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                  style={{ width: `${cappedPct}%` }}
                />
              </div>

              {pct > 100 && (
                <p className="mt-0.5 text-[10px] font-medium text-[var(--fingaurd-coral)]">
                  Over budget by {formatCurrency(spent - budget)}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
