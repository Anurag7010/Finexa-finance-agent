import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  TrendingDown,
  TrendingUp,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/store/useStore";
import { sendChatMessage } from "@/lib/api";
import { cn, formatCurrency } from "@/lib/utils";

interface SimulationResult {
  category: string;
  cutPct: number;
  currentMonthlySpend: number;
  newProjectedSpend: number;
  monthlySaving: number;
  annualSaving: number;
  newProjectedBalance: number;
  healthScoreChange: number;
}

// ─── Temporary mock simulation — remove when backend is live ───
function computeMockResult(
  category: string,
  pct: number,
  insight: {
    category_summary?: Record<string, number>;
    forecast?: Array<{ projected_balance: number }>;
    health_score?: number;
  } | null,
): SimulationResult {
  const categorySummary = insight?.category_summary || {
    "Food & Dining": 12400,
    Shopping: 6580,
    Transport: 3200,
    Utilities: 2800,
    Entertainment: 2100,
  };
  const currentMonthlySpend = categorySummary[category] ?? 5000;
  const saving = Math.round(currentMonthlySpend * (Math.abs(pct) / 100));
  const newProjectedSpend = currentMonthlySpend - saving;
  const lastProjectedBalance =
    insight?.forecast?.[insight.forecast.length - 1]?.projected_balance ?? 8200;
  const newProjectedBalance = lastProjectedBalance + saving;
  const healthScoreChange = Math.round(saving / 800);

  return {
    category,
    cutPct: Math.abs(pct),
    currentMonthlySpend,
    newProjectedSpend,
    monthlySaving: saving,
    annualSaving: saving * 12,
    newProjectedBalance,
    healthScoreChange,
  };
}

export default function ScenarioSimulator() {
  const { insight } = useStore();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [pct, setPct] = useState(-30);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);

  // Build category list from insight or fallback
  const categories = insight?.category_summary
    ? Object.keys(insight.category_summary)
    : ["Food & Dining", "Shopping", "Transport", "Utilities", "Entertainment"];

  const selectedCategory = category || categories[0];

  const handleRun = async () => {
    setLoading(true);
    setResult(null);
    try {
      try {
        await sendChatMessage(
          `What would happen if I cut my ${selectedCategory} budget by ${pct}%?`,
        );
      } catch {
        // Ignore chat errors and still provide an on-device what-if estimate.
      }
      const data = computeMockResult(
        selectedCategory,
        pct,
        insight as Parameters<typeof computeMockResult>[2],
      );
      setResult(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--fingaurd-border)] bg-[var(--fingaurd-surface)] shadow-sm">
      {/* Collapsible header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 transition-colors hover:bg-[rgba(255,255,255,0.04)]"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg border border-[rgba(13,158,138,0.35)] bg-[rgba(13,158,138,0.14)] flex items-center justify-center">
            <TrendingDown className="w-4 h-4 text-[var(--fingaurd-brand)]" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-bold text-[var(--fingaurd-text)]">
              What-if Simulator
            </h3>
            <p className="text-xs text-[var(--fingaurd-text-muted)]">
              Explore how budget cuts change your finances
            </p>
          </div>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-[var(--fingaurd-text-muted)]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[var(--fingaurd-text-muted)]" />
        )}
      </button>

      {/* Expanded content */}
      {open && (
        <div className="space-y-5 border-t border-white/10 px-5 py-4">
          {/* Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--fingaurd-text-muted)]">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm text-[var(--fingaurd-text)] focus:border-[var(--fingaurd-brand)] focus:outline-none focus:ring-2 focus:ring-[rgba(13,158,138,0.25)] transition-all"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Percentage slider */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--fingaurd-text-muted)]">
                Budget adjustment{" "}
                <span className="font-bold text-[var(--fingaurd-brand)]">
                  {pct}%
                </span>
              </label>
              <input
                type="range"
                min={-50}
                max={-5}
                step={5}
                value={pct}
                onChange={(e) => setPct(Number(e.target.value))}
                className="w-full accent-[var(--fingaurd-brand)]"
              />
              <div className="flex justify-between text-[10px] text-[var(--fingaurd-text-muted)]">
                <span>-50%</span>
                <span>-5%</span>
              </div>
            </div>
          </div>

          <Button
            onClick={handleRun}
            disabled={loading}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[var(--fingaurd-brand)] text-sm font-semibold text-white hover:bg-[var(--fingaurd-brand-strong)]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Running simulation…
              </>
            ) : (
              <>
                <TrendingDown className="w-4 h-4" />
                Run Simulation
              </>
            )}
          </Button>

          {/* Results card */}
          {result && (
            <div className="space-y-4 rounded-xl border border-white/12 bg-[rgba(7,13,15,0.42)] p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[var(--fingaurd-brand)]" />
                <h4 className="text-sm font-bold text-[var(--fingaurd-text)]">
                  If you cut {result.category} by {result.cutPct}%
                </h4>
              </div>

              {/* Before / After */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-lg p-3 border border-red-100">
                  <p className="text-[10px] font-semibold uppercase text-[var(--fingaurd-coral)] mb-1">
                    Current
                  </p>
                  <p className="text-sm font-bold text-[#111b1f]">
                    {formatCurrency(result.currentMonthlySpend)}
                  </p>
                  <p className="text-[10px] text-gray-400">monthly spend</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-green-100">
                  <p className="text-[10px] font-semibold uppercase text-[var(--fingaurd-success)] mb-1">
                    Projected
                  </p>
                  <p className="text-sm font-bold text-[#111b1f]">
                    {formatCurrency(result.newProjectedSpend)}
                  </p>
                  <p className="text-[10px] text-gray-400">monthly spend</p>
                </div>
              </div>

              {/* Key numbers */}
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-green-100">
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <TrendingDown className="w-3.5 h-3.5 text-[var(--fingaurd-success)]" />
                    Monthly saving
                  </div>
                  <span className="font-bold text-[var(--fingaurd-success)]">
                    {formatCurrency(result.monthlySaving)}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-green-100">
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <TrendingDown className="w-3.5 h-3.5 text-[var(--fingaurd-success)]" />
                    Annual saving
                  </div>
                  <span className="font-bold text-[var(--fingaurd-success)]">
                    {formatCurrency(result.annualSaving)}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-blue-100">
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <DollarSign className="w-3.5 h-3.5 text-blue-500" />
                    New projected balance
                  </div>
                  <span className="font-bold text-blue-600">
                    {formatCurrency(result.newProjectedBalance)}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-purple-100">
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <TrendingUp className="w-3.5 h-3.5 text-purple-500" />
                    Health score change
                  </div>
                  <span
                    className={cn(
                      "font-bold",
                      result.healthScoreChange > 0
                        ? "text-[var(--fingaurd-success)]"
                        : "text-gray-600",
                    )}
                  >
                    {result.healthScoreChange > 0 ? "+" : ""}
                    {result.healthScoreChange} pts
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
