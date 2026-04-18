import {
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Line,
  LineChart,
} from "recharts";
import type { Goal, GoalProjection } from "@/lib/api";

interface GoalProgressProps {
  goal: Goal;
  projection: GoalProjection;
  aiPlan: string | null;
}

export default function GoalProgress({
  goal,
  projection,
  aiPlan,
}: GoalProgressProps) {
  const radialData = [
    {
      name: "Progress",
      value: Math.min(goal.progress_pct, 100),
      fill: "#0d9e8a",
    },
  ];

  const timelineData = projection.labels.map((label, index) => ({
    label,
    amount: projection.projected_amounts[index] ?? 0,
  }));

  return (
    <div className="rounded-2xl border border-[var(--fingaurd-border)] bg-[var(--fingaurd-surface)] p-4">
      <h3 className="text-base font-semibold text-[var(--fingaurd-text)]">
        {goal.name} Progress
      </h3>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="h-56 rounded-xl border border-white/10 bg-[rgba(255,255,255,0.02)] p-3">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              innerRadius="65%"
              outerRadius="100%"
              data={radialData}
              startAngle={90}
              endAngle={-270}
            >
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar dataKey="value" cornerRadius={10} background />
              <Tooltip />
            </RadialBarChart>
          </ResponsiveContainer>
          <p className="-mt-3 text-center text-sm text-[var(--fingaurd-text-muted)]">
            {Math.round(goal.progress_pct)}% completed
          </p>
        </div>

        <div className="h-56 rounded-xl border border-white/10 bg-[rgba(255,255,255,0.02)] p-3">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timelineData}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#a8c5cf", fontSize: 11 }} />
              <YAxis tick={{ fill: "#a8c5cf", fontSize: 11 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#7db7cf"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {projection.projected_completion_date && (
        <p className="mt-3 text-xs text-[var(--fingaurd-text-muted)]">
          Projected completion date:{" "}
          {new Date(projection.projected_completion_date).toLocaleDateString()}
        </p>
      )}

      <div className="mt-4 rounded-xl border border-white/10 bg-[rgba(255,255,255,0.02)] p-3">
        <p className="mb-1 text-xs uppercase tracking-wide text-[var(--fingaurd-text-muted)]">
          AI Monthly Plan
        </p>
        <p className="text-sm leading-relaxed text-[var(--fingaurd-text)]">
          {aiPlan ||
            "Keep consistent monthly contributions and review category expenses weekly."}
        </p>
      </div>
    </div>
  );
}
