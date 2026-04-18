import { useEffect, useMemo, useState } from "react";
import {
  contributeToGoal,
  createGoal,
  deleteGoal,
  getGoalProjection,
  getGoals,
  updateGoal,
  type Goal,
  type GoalProjection,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import GoalCard from "@/components/goals/GoalCard";
import GoalForm from "@/components/goals/GoalForm";
import GoalProgress from "@/components/goals/GoalProgress";
import { Target } from "lucide-react";
import { toast } from "sonner";

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [projection, setProjection] = useState<GoalProjection | null>(null);
  const [aiPlan, setAiPlan] = useState<string | null>(null);

  async function loadGoals() {
    setLoading(true);
    try {
      const response = await getGoals();
      setGoals(response.goals || []);
    } catch {
      toast.error("Failed to load goals.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadGoals();
  }, []);

  const stats = useMemo(() => {
    const totalTarget = goals.reduce(
      (acc, goal) => acc + goal.target_amount,
      0,
    );
    const totalSaved = goals.reduce(
      (acc, goal) => acc + goal.current_amount,
      0,
    );
    const atRisk = goals.filter((goal) => goal.status === "at_risk").length;

    return {
      totalTarget,
      totalSaved,
      atRisk,
    };
  }, [goals]);

  async function handleCreate(values: {
    name: string;
    target_amount: number;
    current_amount: number;
    deadline: string;
    category: "emergency" | "vacation" | "device" | "custom";
  }) {
    setCreating(true);
    try {
      const response = await createGoal(values);
      setGoals((prev) => [response.goal, ...prev]);
      setShowForm(false);

      if (response.goal.feasibility_score < 40) {
        toast.warning(
          "This goal may be difficult to reach. Consider extending the deadline.",
        );
      } else {
        toast.success("Goal created.");
      }
    } catch (error: unknown) {
      const message =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error as any)?.response?.data?.error || "Failed to create goal.";
      toast.error(message);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(goalId: string) {
    try {
      await deleteGoal(goalId);
      setGoals((prev) => prev.filter((goal) => goal._id !== goalId));
      if (selectedGoal?._id === goalId) {
        setSelectedGoal(null);
        setProjection(null);
        setAiPlan(null);
      }
      toast.success("Goal deleted.");
    } catch {
      toast.error("Failed to delete goal.");
    }
  }

  async function handleContribute(goalId: string) {
    const raw = window.prompt("Contribution amount in Rs");
    const amount = Number(raw || 0);

    if (!(amount > 0)) {
      return;
    }

    try {
      const response = await contributeToGoal(goalId, amount);
      setGoals((prev) =>
        prev.map((goal) => (goal._id === goalId ? response.goal : goal)),
      );

      if (selectedGoal?._id === goalId) {
        await handleViewProjection(goalId);
      } else {
        setSelectedGoal(response.goal);
      }

      toast.success("Contribution recorded.");
    } catch (error: unknown) {
      const message =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error as any)?.response?.data?.error || "Failed to add contribution.";
      toast.error(message);
    }
  }

  async function handleAdjustGoal(goalId: string) {
    const goal = goals.find((item) => item._id === goalId);
    if (!goal) {
      return;
    }

    const targetRaw = window.prompt(
      "New target amount in Rs",
      String(Math.round(goal.target_amount)),
    );
    const deadlineRaw = window.prompt(
      "New deadline (YYYY-MM-DD)",
      new Date(goal.deadline).toISOString().slice(0, 10),
    );

    if (!targetRaw || !deadlineRaw) {
      return;
    }

    const target = Number(targetRaw);
    if (!(target > 0)) {
      toast.error("Target amount must be greater than 0.");
      return;
    }

    try {
      const response = await updateGoal(goalId, {
        target_amount: target,
        deadline: deadlineRaw,
      });

      setGoals((prev) =>
        prev.map((item) => (item._id === goalId ? response.goal : item)),
      );

      if (selectedGoal?._id === goalId) {
        await handleViewProjection(goalId);
      }

      if (response.goal.status === "at_risk") {
        toast.warning("Goal updated, but it is still at risk.");
      } else {
        toast.success("Goal updated and now looks achievable.");
      }
    } catch (error: unknown) {
      const message =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error as any)?.response?.data?.error || "Failed to adjust goal.";
      toast.error(message);
    }
  }

  async function handleViewProjection(goalId: string) {
    try {
      const response = await getGoalProjection(goalId);
      setSelectedGoal(response.goal);
      setProjection(response.projection);
      setAiPlan(response.ai_plan);
    } catch {
      toast.error("Failed to load goal projection.");
    }
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <div className="rounded-2xl border border-[var(--fingaurd-border)] bg-[var(--fingaurd-surface)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 text-sm text-[var(--fingaurd-text-muted)]">
              <Target className="h-4 w-4 text-[var(--fingaurd-brand)]" />
              Goals Center
            </div>
            <h1 className="mt-1 text-2xl font-bold text-[var(--fingaurd-text)]">
              Savings Goals
            </h1>
          </div>
          <Button
            onClick={() => setShowForm((prev) => !prev)}
            className="bg-[var(--fingaurd-brand)] text-white hover:bg-[var(--fingaurd-brand-strong)]"
          >
            {showForm ? "Close" : "Add Goal"}
          </Button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-[rgba(255,255,255,0.02)] p-3">
            <p className="text-xs text-[var(--fingaurd-text-muted)]">
              Total Target
            </p>
            <p className="mt-1 text-lg font-semibold text-[var(--fingaurd-text)]">
              Rs {Math.round(stats.totalTarget).toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[rgba(255,255,255,0.02)] p-3">
            <p className="text-xs text-[var(--fingaurd-text-muted)]">
              Saved So Far
            </p>
            <p className="mt-1 text-lg font-semibold text-[var(--fingaurd-text)]">
              Rs {Math.round(stats.totalSaved).toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[rgba(255,255,255,0.02)] p-3">
            <p className="text-xs text-[var(--fingaurd-text-muted)]">
              At Risk Goals
            </p>
            <p className="mt-1 text-lg font-semibold text-[var(--fingaurd-text)]">
              {stats.atRisk}
            </p>
          </div>
        </div>
      </div>

      {showForm && (
        <GoalForm
          loading={creating}
          onCancel={() => setShowForm(false)}
          onSubmit={handleCreate}
        />
      )}

      {selectedGoal && projection && (
        <GoalProgress
          goal={selectedGoal}
          projection={projection}
          aiPlan={aiPlan}
        />
      )}

      {loading ? (
        <div className="rounded-2xl border border-[var(--fingaurd-border)] bg-[var(--fingaurd-surface)] p-6 text-sm text-[var(--fingaurd-text-muted)]">
          Loading goals...
        </div>
      ) : goals.length === 0 ? (
        <div className="rounded-2xl border border-[var(--fingaurd-border)] bg-[var(--fingaurd-surface)] p-8 text-center text-sm text-[var(--fingaurd-text-muted)]">
          No goals yet. Add your first savings goal.
        </div>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {goals.map((goal) => (
            <GoalCard
              key={goal._id}
              goal={goal}
              onViewProjection={handleViewProjection}
              onContribute={handleContribute}
              onAdjust={handleAdjustGoal}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
