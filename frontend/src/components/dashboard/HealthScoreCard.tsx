import { getScoreStrokeColor, getScoreColor } from "../../lib/utils";

interface Props {
  score: number;
  savingsRate?: number;
  budgetUsedPct?: number;
  anomaliesCount?: number;
}

const RADIUS = 90;
const STROKE = 12;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
// We use a 240-degree arc (from 150° to 390°)
const ARC_LENGTH = (240 / 360) * CIRCUMFERENCE;

function getScoreLabel(score: number): { label: string; desc: string } {
  if (score >= 80)
    return { label: "Excellent", desc: "You're on track — keep it up!" };
  if (score >= 60)
    return { label: "Fair", desc: "Needs attention this month." };
  return { label: "At Risk", desc: "Immediate action recommended." };
}

export default function HealthScoreCard({
  score,
  savingsRate,
  budgetUsedPct,
  anomaliesCount,
}: Props) {
  const roundedScore = Math.round(score);
  const color = getScoreStrokeColor(roundedScore);
  const textColorClass = getScoreColor(roundedScore);
  const { label, desc } = getScoreLabel(roundedScore);

  // Compute how much of the arc to fill
  const fillLength = (roundedScore / 100) * ARC_LENGTH;
  const dashOffset = ARC_LENGTH - fillLength;

  // SVG viewBox is 220×220; center is (110,110)
  // Rotate so the arc starts at bottom-left (150°)
  const rotation = 150;

  return (
    <div className="rounded-2xl border border-[var(--fingaurd-border)] bg-[var(--fingaurd-surface)] p-6 shadow-[0_18px_36px_rgba(0,0,0,0.22)]">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--fingaurd-text-muted)]">
        Financial Health Score
      </h2>

      {/* Arc gauge */}
      <div className="relative mx-auto w-fit">
        <svg
          width="220"
          height="180"
          viewBox="0 0 220 200"
          aria-label={`Health score: ${roundedScore} out of 100`}
        >
          {/* Track */}
          <circle
            cx="110"
            cy="110"
            r={RADIUS}
            fill="none"
            stroke="rgba(232,245,244,0.16)"
            strokeWidth={STROKE}
            strokeDasharray={`${ARC_LENGTH} ${CIRCUMFERENCE}`}
            strokeDashoffset={0}
            strokeLinecap="round"
            transform={`rotate(${rotation} 110 110)`}
          />
          {/* Fill */}
          <circle
            cx="110"
            cy="110"
            r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth={STROKE}
            strokeDasharray={`${ARC_LENGTH} ${CIRCUMFERENCE}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform={`rotate(${rotation} 110 110)`}
            className="arc-animate"
            style={{
              filter: `drop-shadow(0 0 8px ${color}88)`,
              transition: "stroke-dashoffset 700ms cubic-bezier(0.4,0,0.2,1)",
            }}
          />
          {/* Score number centered */}
          <text
            x="110"
            y="105"
            textAnchor="middle"
            dominantBaseline="middle"
            className={textColorClass}
            style={{
              fontSize: "52px",
              fontWeight: "800",
              fontFamily: "Inter, sans-serif",
              fill: color,
            }}
          >
            {roundedScore}
          </text>
          <text
            x="110"
            y="142"
            textAnchor="middle"
            style={{
              fontSize: "12px",
              fill: "rgba(232,245,244,0.58)",
              fontFamily: "Inter, sans-serif",
              fontWeight: "500",
            }}
          >
            Financial Health
          </text>
        </svg>

        {/* Bottom range labels */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 text-[10px] text-[var(--fingaurd-text-muted)] font-medium">
          <span>0</span>
          <span>100</span>
        </div>
      </div>

      {/* Label badge */}
      <div
        className="mx-auto mt-2 w-fit rounded-full px-4 py-1.5 text-sm font-bold"
        style={{
          background: `${color}18`,
          color: color,
          border: `1px solid ${color}40`,
        }}
      >
        {label}
      </div>

      {/* Description */}
      <p className="mx-auto mt-2 max-w-[230px] text-center text-sm text-[var(--fingaurd-text-muted)]">
        {desc}
      </p>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-2 border-t border-white/10 pt-4">
        <MetricPill
          label="Savings Rate"
          value={
            typeof savingsRate === "number"
              ? `${(savingsRate * 100).toFixed(1)}%`
              : "--"
          }
        />
        <MetricPill
          label="Budget Used"
          value={
            typeof budgetUsedPct === "number"
              ? `${budgetUsedPct.toFixed(1)}%`
              : "--"
          }
        />
        <MetricPill
          label="Anomalies"
          value={
            typeof anomaliesCount === "number" ? String(anomaliesCount) : "--"
          }
        />
      </div>

      <p className={`mt-4 text-center text-xs font-semibold ${textColorClass}`}>
        Score status: {label}
      </p>
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[rgba(255,255,255,0.02)] px-3 py-2 text-center">
      <p className="text-[10px] uppercase tracking-[0.1em] text-[var(--fingaurd-text-muted)]">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-[var(--fingaurd-text)]">
        {value}
      </p>
    </div>
  );
}
