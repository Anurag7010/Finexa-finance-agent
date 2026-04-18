import { CalendarDays, Flag, PiggyBank } from "lucide-react";
import type { Goal } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface GoalCardProps {
  goal: Goal;
  onViewProjection: (goalId: string) => void;
  onContribute: (goalId: string) => void;
  onAdjust: (goalId: string) => void;
  onDelete: (goalId: string) => void;
}

function badgeTone(status: Goal["status"]) {
  if (status === "achieved") {
    return "bg-[rgba(13,158,138,0.2)] text-[#67e8d5]";
  }

  if (status === "at_risk") {
    return "bg-[rgba(227,107,99,0.2)] text-[#ffbeb8]";
  }

  if (status === "paused") {
    return "bg-[rgba(255,255,255,0.12)] text-[var(--fingaurd-text-muted)]";
  }

  return "bg-[rgba(125,183,207,0.2)] text-[#b8dff0]";
}

export default function GoalCard({
  goal,
  onViewProjection,
  onContribute,
  onAdjust,
  onDelete,
}: GoalCardProps) {
  const deadline = new Date(goal.deadline);

  return (
    <div className="rounded-2xl border border-[var(--fingaurd-border)] bg-[var(--fingaurd-surface)] p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-[var(--fingaurd-text)]">
            {goal.name}
          </h3>
          <p className="mt-1 text-xs text-[var(--fingaurd-text-muted)] capitalize">
            {goal.category}
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${badgeTone(goal.status)}`}
        >
          {goal.status.replace("_", " ")}
        </span>
      </div>

      <div className="mb-2 flex items-center justify-between text-xs text-[var(--fingaurd-text-muted)]">
        <span className="inline-flex items-center gap-1">
          <PiggyBank className="h-3.5 w-3.5" />
          Rs {Math.round(goal.current_amount).toLocaleString()} saved
        </span>
        <span>Rs {Math.round(goal.target_amount).toLocaleString()} target</span>
      </div>

      <Progress value={Math.min(goal.progress_pct, 100)} className="h-2" />

      <div className="mt-3 space-y-1 text-xs text-[var(--fingaurd-text-muted)]">
        <p className="inline-flex items-center gap-1">
          <CalendarDays className="h-3.5 w-3.5" />
          Deadline: {deadline.toLocaleDateString()}
        </p>
        <p className="inline-flex items-center gap-1">
          <Flag className="h-3.5 w-3.5" />
          Feasibility: {Math.round(goal.feasibility_score)} / 100
        </p>
        <p>
          Needed per month: Rs{" "}
          {Math.round(goal.monthly_contribution_needed).toLocaleString()}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onViewProjection(goal._id)}
        >
          View Plan
        </Button>
        <Button
          size="sm"
          className="bg-[var(--fingaurd-brand)] text-white hover:bg-[var(--fingaurd-brand-strong)]"
          onClick={() => onContribute(goal._id)}
        >
          Add Contribution
        </Button>
        <Button size="sm" variant="outline" onClick={() => onAdjust(goal._id)}>
          Adjust Target
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-[var(--fingaurd-coral)] hover:text-[var(--fingaurd-coral)]"
          onClick={() => onDelete(goal._id)}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
