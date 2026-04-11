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
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-sm font-semibold text-slate-700">
            Category Breakdown
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">This month vs budget</p>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-emerald-500 inline-block" />
            &lt;70%
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-amber-500 inline-block" />
            70–90%
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-red-500 inline-block" />
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
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-base leading-none">
                    {getCategoryIcon(name)}
                  </span>
                  <span className="text-sm font-medium text-slate-700">
                    {name}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">
                    {formatCurrency(spent)}{" "}
                    <span className="text-slate-300">
                      / {formatCurrency(budget)}
                    </span>
                  </span>
                  <span
                    className={`text-xs font-bold w-10 text-right ${
                      pct >= 90
                        ? "text-red-600"
                        : pct >= 70
                          ? "text-amber-600"
                          : "text-emerald-600"
                    }`}
                  >
                    {pct.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Progress track */}
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                  style={{ width: `${cappedPct}%` }}
                />
              </div>

              {pct > 100 && (
                <p className="text-[10px] text-red-500 mt-0.5 font-medium">
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
