import { useEffect, useState } from "react";
import { useStore } from "../store/useStore";
import { getInsights, getTransactionSummary } from "../lib/api";
import HealthScoreCard from "../components/dashboard/HealthScoreCard";
import RiskCard from "../components/dashboard/RiskCard";
import StatsRow from "../components/dashboard/StatsRow";
import ForecastChart from "../components/dashboard/ForecastChart";
import CategoryBreakdown from "../components/dashboard/CategoryBreakdown";
import ScenarioSimulator from "../components/dashboard/ScenarioSimulator";
import { RefreshCw } from "lucide-react";
import { Button } from "../components/ui/button";
import { refreshInsights } from "../lib/api";

// ─── Skeleton placeholders ────────────────────────────────────────────────────
function SkeletonCard({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-2xl ${className}`} />;
}

export default function DashboardPage() {
  const { user, insight, setInsight, setIsRefreshing, isRefreshing } =
    useStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError("");
      try {
        const [insightData] = await Promise.all([
          getInsights(),
          getTransactionSummary(),
        ]);
        setInsight(insightData.insight);
      } catch {
        setError("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      const data = await refreshInsights();
      setInsight(data.insight);
    } catch {
      setError("Refresh failed. Please try again.");
    } finally {
      setIsRefreshing(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-5 page-enter">
        {/* Stats row skeletons */}
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <SkeletonCard key={i} className="h-28" />
          ))}
        </div>
        {/* Main grid skeletons */}
        <div className="grid grid-cols-5 gap-5">
          <div className="col-span-3 space-y-5">
            <SkeletonCard className="h-72" />
            <SkeletonCard className="h-64" />
          </div>
          <div className="col-span-2 space-y-5">
            <SkeletonCard className="h-72" />
            <SkeletonCard className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  if (!insight || !user) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 page-enter">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center max-w-md">
          <div className="text-4xl mb-4">📊</div>
          <h2 className="text-xl font-bold text-slate-700 mb-2">
            No Analysis Yet
          </h2>
          <p className="text-slate-500 text-sm mb-6">
            Run your first financial analysis to see your dashboard.
          </p>
          {error && <p className="text-red-500 text-xs mb-4">{error}</p>}
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <RefreshCw
              size={14}
              className={isRefreshing ? "animate-spin" : ""}
            />
            {isRefreshing ? "Analyzing…" : "Run Analysis"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 page-enter">
      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm flex items-center gap-2">
          ⚠️ {error}
        </div>
      )}

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
