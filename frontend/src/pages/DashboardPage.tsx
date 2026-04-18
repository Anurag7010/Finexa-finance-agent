import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useStore } from "../store/useStore";
import {
  getGoals,
  getInsights,
  refreshInsights,
  getSubscriptionTotals,
  getDataSources,
  updateProfile,
  type Goal,
} from "../lib/api";
import HealthScoreCard from "../components/dashboard/HealthScoreCard";
import RiskCard from "../components/dashboard/RiskCard";
import StatsRow from "../components/dashboard/StatsRow";
import ForecastChart from "../components/dashboard/ForecastChart";
import CategoryBreakdown from "../components/dashboard/CategoryBreakdown";
import ScenarioSimulator from "../components/dashboard/ScenarioSimulator";
import { AlertCircle, BarChart3 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { toast } from "sonner";

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
  const { user, insight, setInsight, setUser } = useStore();
  const [topGoals, setTopGoals] = useState<Goal[]>([]);
  const [subscriptionTotals, setSubscriptionTotals] = useState({
    monthly: 0,
    annual: 0,
    count: 0,
  });
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [dataSourceCount, setDataSourceCount] = useState(0);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [incomeInput, setIncomeInput] = useState(0);
  const [budgetInput, setBudgetInput] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) {
      return;
    }
    setIncomeInput(Number(user.income || 0));
    setBudgetInput(Number(user.monthly_budget || 0));
  }, [user]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [insightData, goalsData, subTotals, sourcesData] = await Promise.all([
        getInsights(),
        getGoals().catch(() => ({ goals: [] })),
        getSubscriptionTotals().catch(() => ({
          monthly: 0,
          annual: 0,
          count: 0,
        })),
        getDataSources().catch(() => ({ sources: [] })),
      ]);
      setInsight(insightData.insight);
      const sortedGoals = [...(goalsData.goals || [])].sort(
        (a, b) => b.progress_pct - a.progress_pct,
      );
      setTopGoals(sortedGoals.slice(0, 2));
      setSubscriptionTotals(subTotals);
      // Data sources summary for dashboard header
      const allSources = sourcesData.sources || [];
      setDataSourceCount(allSources.length);
      const latestSync = allSources
        .filter((s) => s.last_sync_at)
        .sort((a, b) => new Date(b.last_sync_at!).getTime() - new Date(a.last_sync_at!).getTime())[0]
        ?.last_sync_at ?? null;
      setLastSyncedAt(latestSync);
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

  async function handleProfileSave(e: FormEvent) {
    e.preventDefault();

    if (!(incomeInput >= 0) || !(budgetInput >= 0)) {
      toast.error("Income and budget must be non-negative.");
      return;
    }

    setSavingProfile(true);
    try {
      const updatedUser = await updateProfile({
        income: incomeInput,
        monthly_budget: budgetInput,
      });
      setUser(updatedUser);

      const refreshed = await refreshInsights({ force: true });
      setInsight(refreshed.insight);

      toast.success("Income and budget updated. Analysis refreshed.");
      setShowProfileForm(false);
      await loadData();
    } catch (err: unknown) {
      const message =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (err as any)?.response?.data?.error ||
        "Failed to update income/budget.";
      toast.error(message);
    } finally {
      setSavingProfile(false);
    }
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <div className="rounded-2xl border border-[var(--fingaurd-border)] bg-[var(--fingaurd-surface)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.08em] text-[var(--fingaurd-text-muted)]">
              Profile Finance Inputs
            </p>
            <p className="text-sm text-[var(--fingaurd-text)]">
              Keep salary and monthly budget updated for accurate analysis.
            </p>
            {lastSyncedAt && (
              <p className="text-[11px] text-[var(--fingaurd-text-muted)] mt-0.5">
                Last synced:{" "}
                <span className="text-[var(--fingaurd-brand)]">
                  {new Date(lastSyncedAt).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
                {" "}&middot;{" "}
                <span className="text-[var(--fingaurd-text-muted)]">
                  {dataSourceCount} source{dataSourceCount !== 1 ? "s" : ""} connected
                </span>
              </p>
            )}
          </div>
          <Button
            variant="outline"
            onClick={() => setShowProfileForm((prev) => !prev)}
            className="border-white/15 bg-[rgba(255,255,255,0.04)] text-[var(--fingaurd-text)] hover:bg-[rgba(255,255,255,0.08)]"
          >
            {showProfileForm ? "Close" : "Update Salary & Budget"}
          </Button>
        </div>

        {showProfileForm && (
          <form
            onSubmit={handleProfileSave}
            className="mt-3 grid gap-3 md:grid-cols-3"
          >
            <input
              type="number"
              min={0}
              step="1"
              value={incomeInput}
              onChange={(e) => setIncomeInput(Number(e.target.value || 0))}
              placeholder="Monthly income"
              className="rounded-lg border border-white/15 bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[var(--fingaurd-text)] outline-none focus:border-[var(--fingaurd-brand)]"
            />
            <input
              type="number"
              min={0}
              step="1"
              value={budgetInput}
              onChange={(e) => setBudgetInput(Number(e.target.value || 0))}
              placeholder="Monthly budget"
              className="rounded-lg border border-white/15 bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[var(--fingaurd-text)] outline-none focus:border-[var(--fingaurd-brand)]"
            />
            <Button
              type="submit"
              disabled={savingProfile}
              className="bg-[var(--fingaurd-brand)] text-white hover:bg-[var(--fingaurd-brand-strong)]"
            >
              {savingProfile ? "Saving..." : "Save & Recalculate"}
            </Button>
          </form>
        )}
      </div>

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
          <div className="rounded-2xl border border-[var(--fingaurd-border)] bg-[var(--fingaurd-surface)] p-4">
            <h3 className="text-sm font-semibold text-[var(--fingaurd-text)]">
              Goals Summary
            </h3>
            <div className="mt-3 space-y-3">
              {topGoals.length === 0 ? (
                <p className="text-xs text-[var(--fingaurd-text-muted)]">
                  No goals yet. Create one in Goals.
                </p>
              ) : (
                topGoals.map((goal) => (
                  <div key={goal._id}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-[var(--fingaurd-text)]">
                        {goal.name}
                      </span>
                      <span className="text-[var(--fingaurd-text-muted)]">
                        {goal.progress_pct}%
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded bg-[rgba(255,255,255,0.08)]">
                      <div
                        className="h-full rounded bg-[var(--fingaurd-brand)]"
                        style={{
                          width: `${Math.min(goal.progress_pct, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--fingaurd-border)] bg-[var(--fingaurd-surface)] p-4">
            <h3 className="text-sm font-semibold text-[var(--fingaurd-text)]">
              Subscriptions
            </h3>
            <p className="mt-2 text-2xl font-bold text-[var(--fingaurd-text)]">
              Rs {Math.round(subscriptionTotals.monthly).toLocaleString()}
            </p>
            <p className="text-xs text-[var(--fingaurd-text-muted)]">
              Monthly burn from {subscriptionTotals.count} recurring charge(s)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
