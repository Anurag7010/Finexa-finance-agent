import { useCallback, useEffect, useState } from "react";
import { useStore } from "../store/useStore";
import { getInsights, getTransactionSummary } from "../lib/api";
import HealthScoreCard from "../components/dashboard/HealthScoreCard";
import RiskCard from "../components/dashboard/RiskCard";
import StatsRow from "../components/dashboard/StatsRow";
import ForecastChart from "../components/dashboard/ForecastChart";
import CategoryBreakdown from "../components/dashboard/CategoryBreakdown";
import ScenarioSimulator from "../components/dashboard/ScenarioSimulator";
import { AlertCircle, BarChart3 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";

function DashboardSkeleton() {
  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
        <div className="space-y-5 xl:col-span-3">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
        <div className="space-y-5 xl:col-span-2">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, insight, setInsight } = useStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [insightData] = await Promise.all([
        getInsights(),
        getTransactionSummary(),
      ]);
      setInsight(insightData.insight);
    } catch (err: unknown) {
      // 404 means no insight exists yet; this should show the CTA state instead of an error card.
      const status =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (err as any)?.response?.status;
      if (status === 404) {
        setInsight(null);
      } else {
        setError("Failed to load dashboard data. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [setInsight]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="animate-in fade-in duration-200">
        <div className="mx-auto max-w-xl rounded-xl border border-[rgba(227,107,99,0.45)] bg-[rgba(227,107,99,0.12)] p-6 text-center">
          <AlertCircle className="mx-auto mb-3 h-6 w-6 text-[var(--fingaurd-coral)]" />
          <p className="font-medium text-[#ffbeb8]">
            Failed to load dashboard data. Please try again.
          </p>
          <Button
            variant="outline"
            className="mt-4 border-white/15 bg-[rgba(255,255,255,0.04)] text-[var(--fingaurd-text)] hover:bg-[rgba(255,255,255,0.1)]"
            onClick={() => void loadData()}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!insight || !user) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 animate-in fade-in duration-200">
        <div className="max-w-md rounded-2xl border border-[var(--fingaurd-border)] bg-[var(--fingaurd-surface)] p-10 text-center shadow-sm">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-[rgba(125,183,207,0.35)] bg-[rgba(125,183,207,0.14)]">
            <BarChart3 className="h-7 w-7 text-[#7db7cf]" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-[var(--fingaurd-text)]">
            No Analysis Yet
          </h2>
          <p className="mb-6 text-sm text-[var(--fingaurd-text-muted)]">
            Run your first financial analysis from the top bar to see your
            dashboard.
          </p>
          <Button
            onClick={() => window.location.reload()}
            className="bg-[var(--fingaurd-brand)] hover:bg-[var(--fingaurd-brand-strong)] text-white"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Stats row */}
      <StatsRow user={user} insight={insight} />

      {/* Main 3/5 + 2/5 layout */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
        {/* Left column — 60% */}
        <div className="space-y-5 xl:col-span-3">
          <HealthScoreCard
            score={insight.health_score}
            savingsRate={insight.savings_rate}
            budgetUsedPct={
              (insight.monthly_spend / insight.monthly_budget) * 100
            }
            anomaliesCount={insight.risk_factors.length}
          />
          <ForecastChart data={insight.forecast} />
          <ScenarioSimulator />
        </div>

        {/* Right column — 40% */}
        <div className="space-y-5 xl:col-span-2">
          <RiskCard insight={insight} />
          <CategoryBreakdown insight={insight} user={user} />
        </div>
      </div>
    </div>
  );
}
