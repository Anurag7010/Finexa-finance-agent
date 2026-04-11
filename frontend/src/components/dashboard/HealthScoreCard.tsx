import { getScoreStrokeColor, getScoreColor } from "../../lib/utils";

interface Props {
  score: number;
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

export default function HealthScoreCard({ score }: Props) {
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
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col items-center">
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
        Financial Health Score
      </h2>

      {/* Arc gauge */}
      <div className="relative">
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
            stroke="#e2e8f0"
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
              fontSize: "42px",
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
              fill: "#94a3b8",
              fontFamily: "Inter, sans-serif",
              fontWeight: "500",
            }}
          >
            out of 100
          </text>
        </svg>

        {/* Bottom range labels */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 text-[10px] text-slate-400 font-medium">
          <span>0</span>
          <span>100</span>
        </div>
      </div>

      {/* Label badge */}
      <div
        className="mt-2 px-4 py-1.5 rounded-full text-sm font-bold"
        style={{
          background: `${color}18`,
          color: color,
          border: `1px solid ${color}40`,
        }}
      >
        {label}
      </div>

      {/* Description */}
      <p className="text-slate-500 text-sm text-center mt-2 max-w-[220px]">
        {desc}
      </p>

      {/* Score breakdown mini bars */}
      <div className="w-full mt-5 pt-4 border-t border-slate-100 space-y-2">
        <ScoreBar
          label="Spending Rate"
          value={score >= 60 ? 70 : 35}
          color={color}
        />
        <ScoreBar
          label="Savings Rate"
          value={score >= 80 ? 85 : score >= 60 ? 55 : 20}
          color={color}
        />
        <ScoreBar
          label="Budget Control"
          value={score >= 80 ? 90 : score >= 60 ? 60 : 30}
          color={color}
        />
      </div>
    </div>
  );
}

function ScoreBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-slate-500 text-xs w-28 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
      <span className="text-xs text-slate-400 w-8 text-right">{value}%</span>
    </div>
  );
}
