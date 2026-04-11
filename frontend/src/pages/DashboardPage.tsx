import { useCallback, useEffect, useState } from "react";
import { useStore } from "../store/useStore";
import { getInsights, getTransactionSummary } from "../lib/api";
import HealthScoreCard from "../components/dashboard/HealthScoreCard";
import RiskCard from "../components/dashboard/RiskCard";
import StatsRow from "../components/dashboard/StatsRow";
import ForecastChart from "../components/dashboard/ForecastChart";
import CategoryBreakdown from "../components/dashboard/CategoryBreakdown";
import ScenarioSimulator from "../components/dashboard/ScenarioSimulator";
import { AlertCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";

function DashboardSkeleton() {
  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>

      <div className="grid grid-cols-5 gap-5">
        <div className="col-span-3 space-y-5">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
        <div className="col-span-2 space-y-5">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
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
        <div className="mx-auto max-w-xl rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertCircle className="mx-auto mb-3 h-6 w-6 text-red-600" />
          <p className="font-medium text-red-700">
            Failed to load dashboard data. Please try again.
          </p>
          <Button
            variant="outline"
            className="mt-4"
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
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center max-w-md">
          <div className="text-4xl mb-4">📊</div>
          <h2 className="text-xl font-bold text-slate-700 mb-2">
            No Analysis Yet
          </h2>
          <p className="text-slate-500 text-sm mb-6">
            Run your first financial analysis from the top bar to see your
            dashboard.
          </p>
          <Button
            onClick={() => window.location.reload()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
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
      <div className="grid grid-cols-5 gap-5">
        {/* Left column — 60% */}
        <div className="col-span-3 space-y-5">
          <ForecastChart data={insight.forecast} />
          <ScenarioSimulator />
          <CategoryBreakdown insight={insight} user={user} />
        </div>

        {/* Right column — 40% */}
        <div className="col-span-2 space-y-5">
          <HealthScoreCard score={insight.health_score} />
          <RiskCard insight={insight} />
        </div>
      </div>
    </div>
  );
}
