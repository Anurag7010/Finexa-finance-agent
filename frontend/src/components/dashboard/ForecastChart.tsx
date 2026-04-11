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
    <div className="bg-slate-900/95 backdrop-blur border border-slate-700 rounded-xl px-4 py-3 shadow-xl">
      <p className="text-slate-400 text-xs mb-1">
        {label ? formatDate(label) : ""}
      </p>
      <p className="text-white font-bold text-base">
        {formatCurrency(payload[0]?.value ?? 0)}
      </p>
      {payload[1] && (
        <p className="text-slate-400 text-xs mt-0.5">
          Spend: {formatCurrency(payload[1]?.value ?? 0)}
        </p>
      )}
    </div>
  );
}

export default function ForecastChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">
          30-Day Balance Forecast
        </h2>
        <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
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
  const startColor = isCritical ? "#f97316" : "#6366f1";
  const endColor = isCritical ? "#ef4444" : "#8b5cf6";

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-sm font-semibold text-slate-700">
            30-Day Balance Forecast
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Projected daily remaining balance
          </p>
        </div>
        {isCritical && (
          <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs text-red-600 font-semibold">
              Balance approaching zero
            </span>
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={startColor} stopOpacity={0.25} />
              <stop offset="95%" stopColor={endColor} stopOpacity={0.03} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />

          <XAxis
            dataKey="shortDate"
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
            interval={4}
          />
          <YAxis
            tickFormatter={(v) =>
              v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`
            }
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
            width={48}
            domain={[Math.min(0, minBalance - 1000), maxBalance + 2000]}
          />

          <Tooltip content={<CustomTooltip />} />

          {/* Zero balance warning line */}
          <ReferenceLine
            y={0}
            stroke="#ef4444"
            strokeDasharray="5 4"
            strokeWidth={1.5}
            label={{
              value: "₹0",
              position: "left",
              fontSize: 10,
              fill: "#ef4444",
            }}
          />

          <Area
            type="monotone"
            dataKey="projected_balance"
            stroke={startColor}
            strokeWidth={2.5}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 5, fill: startColor, strokeWidth: 2, stroke: "#fff" }}
            animationDuration={1200}
            name="Balance"
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 pl-2">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 rounded" style={{ background: startColor }} />
          <span className="text-[11px] text-slate-500">Projected Balance</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0 border-t border-dashed border-red-400" />
          <span className="text-[11px] text-slate-500">Zero line</span>
        </div>
      </div>
    </div>
  );
}
