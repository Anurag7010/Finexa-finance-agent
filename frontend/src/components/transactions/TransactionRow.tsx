import type { Transaction } from "../../lib/api";
import { formatCurrency, formatDate, getCategoryIcon } from "../../lib/utils";
import { Badge } from "../ui/badge";
import { AlertTriangle } from "lucide-react";

interface Props {
  transaction: Transaction;
}

const CHANNEL_LABELS: Record<string, string> = {
  UPI: "UPI",
  card: "Card",
  netbanking: "NetBanking",
  cash: "Cash",
  other: "Other",
};

const CHANNEL_COLORS: Record<string, string> = {
  UPI: "bg-blue-50 text-blue-700 border-blue-200",
  card: "bg-purple-50 text-purple-700 border-purple-200",
  netbanking: "bg-indigo-50 text-indigo-700 border-indigo-200",
  cash: "bg-slate-50 text-slate-700 border-slate-200",
  other: "bg-gray-50 text-gray-700 border-gray-200",
};

export default function TransactionRow({ transaction: t }: Props) {
  const channelColor = CHANNEL_COLORS[t.channel] ?? CHANNEL_COLORS.other;

  return (
    <div
      className={`flex items-center gap-4 px-4 py-3.5 bg-white rounded-xl border transition-all hover:shadow-sm hover:-translate-y-px ${
        t.is_anomaly
          ? "border-red-200 border-l-4 border-l-red-500"
          : "border-slate-100"
      }`}
    >
      {/* Category icon */}
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg ${
          t.is_anomaly ? "bg-red-50" : "bg-slate-50"
        }`}
      >
        {getCategoryIcon(t.category)}
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-slate-800 text-sm truncate">
            {t.merchant}
          </p>
          {t.is_anomaly && (
            <span
              title="Flagged as unusual by AI"
              className="flex items-center gap-1 text-red-500 shrink-0"
            >
              <AlertTriangle size={13} className="fill-red-100" />
              <span className="text-[10px] font-bold uppercase tracking-wide">
                Flagged
              </span>
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400 truncate mt-0.5">{t.description}</p>
      </div>

      {/* Date */}
      <div className="text-right shrink-0 hidden sm:block">
        <p className="text-xs text-slate-500">{formatDate(t.date)}</p>
      </div>

      {/* Channel badge */}
      <Badge
        className={`shrink-0 border text-[10px] font-semibold px-2 py-0.5 ${channelColor}`}
      >
        {CHANNEL_LABELS[t.channel] ?? t.channel}
      </Badge>

      {/* Amount */}
      <div className="text-right shrink-0 min-w-[80px]">
        <p
          className={`font-bold text-sm ${
            t.is_anomaly ? "text-red-600" : "text-slate-800"
          }`}
        >
          − {formatCurrency(t.amount)}
        </p>
      </div>
    </div>
  );
}
