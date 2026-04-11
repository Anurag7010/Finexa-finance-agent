import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { ForecastPoint } from "../../lib/api";
import { formatCurrency, formatDate } from "../../lib/utils";

interface Props {
  data: ForecastPoint[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/15 bg-[rgba(8,13,16,0.96)] px-4 py-3 shadow-xl backdrop-blur">
      <p className="mb-1 text-xs text-[var(--fingaurd-text-muted)]">
        {label ? formatDate(label) : ""}
      </p>
      <p className="text-base font-bold text-[var(--fingaurd-text)]">
        {formatCurrency(payload[0]?.value ?? 0)}
      </p>
      {payload[1] && (
        <p className="mt-0.5 text-xs text-[var(--fingaurd-text-muted)]">
          Spend: {formatCurrency(payload[1]?.value ?? 0)}
        </p>
      )}
    </div>
  );
}

export default function ForecastChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--fingaurd-border)] bg-[var(--fingaurd-surface)] p-6">
        <h2 className="mb-2 text-sm font-semibold text-[var(--fingaurd-text)]">
          30-Day Balance Forecast
        </h2>
        <div className="flex h-48 items-center justify-center text-sm text-[var(--fingaurd-text-muted)]">
          No forecast data available. Click Refresh Analysis.
        </div>
      </div>
    );
  }

  // Format dates for display (short: "Apr 12")
  const chartData = data.map((d) => {
    const date = new Date(d.date);
    const shortDate = date.toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
    });
    return { ...d, shortDate };
  });

  const maxBalance = Math.max(...data.map((d) => d.projected_balance));
  const minBalance = Math.min(...data.map((d) => d.projected_balance));
  const isCritical = minBalance < 5000;

  // Gradient colors: amber→red for declining trend
  const gradientId = "balanceGradient";
  const startColor = isCritical ? "#e36b63" : "#0d9e8a";
  const endColor = isCritical ? "#d6544c" : "#3eb29f";

  return (
    <div className="rounded-2xl border border-[var(--fingaurd-border)] bg-[var(--fingaurd-surface)] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-sm font-semibold text-[var(--fingaurd-text)]">
            30-Day Balance Forecast
          </h2>
          <p className="text-xs text-[var(--fingaurd-text-muted)] mt-0.5">
            Projected daily remaining balance
          </p>
        </div>
        {isCritical && (
          <div className="flex items-center gap-1.5 rounded-lg border border-[rgba(227,107,99,0.4)] bg-[rgba(227,107,99,0.12)] px-3 py-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-[var(--fingaurd-coral)] animate-pulse" />
            <span className="text-xs font-semibold text-[var(--fingaurd-coral)]">
              Balance approaching zero
            </span>
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart
          data={chartData}
          margin={{ top: 5, right: 10, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={startColor} stopOpacity={0.25} />
              <stop offset="95%" stopColor={endColor} stopOpacity={0.03} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(232,245,244,0.08)"
          />

          <XAxis
            dataKey="shortDate"
            tick={{ fontSize: 10, fill: "rgba(232,245,244,0.56)" }}
            tickLine={false}
            axisLine={false}
            interval={4}
          />
          <YAxis
            tickFormatter={(v) =>
              v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`
            }
            tick={{ fontSize: 10, fill: "rgba(232,245,244,0.56)" }}
            tickLine={false}
            axisLine={false}
            width={48}
            domain={[Math.min(0, minBalance - 1000), maxBalance + 2000]}
          />

          <Tooltip content={<CustomTooltip />} />

          {/* Zero balance warning line */}
          <ReferenceLine
            y={0}
            stroke="rgba(227,107,99,0.9)"
            strokeDasharray="5 4"
            strokeWidth={1.5}
            label={{
              value: "Zero balance",
              position: "left",
              fontSize: 10,
              fill: "rgba(227,107,99,0.9)",
            }}
          />

          <Area
            type="monotone"
            dataKey="projected_balance"
            stroke={startColor}
            strokeWidth={2.5}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{
              r: 5,
              fill: startColor,
              strokeWidth: 2,
              stroke: "#0b1114",
            }}
            animationDuration={1200}
            name="Balance"
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-2 flex items-center gap-4 pl-2">
        <div className="flex items-center gap-1.5">
          <div
            className="w-4 h-0.5 rounded"
            style={{ background: startColor }}
          />
          <span className="text-[11px] text-[var(--fingaurd-text-muted)]">
            Projected Balance
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0 border-t border-dashed border-[rgba(227,107,99,0.9)]" />
          <span className="text-[11px] text-[var(--fingaurd-text-muted)]">
            Zero line
          </span>
        </div>
      </div>
    </div>
  );
}
