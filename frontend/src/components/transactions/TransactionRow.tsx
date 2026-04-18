import { createElement } from "react";
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
  UPI: "bg-[rgba(13,158,138,0.16)] text-[var(--fingaurd-brand)] border-[rgba(13,158,138,0.34)]",
  card: "bg-[rgba(125,183,207,0.16)] text-[#7db7cf] border-[rgba(125,183,207,0.34)]",
  netbanking:
    "bg-[rgba(207,164,74,0.16)] text-[var(--fingaurd-amber)] border-[rgba(207,164,74,0.34)]",
  cash: "bg-[rgba(255,255,255,0.08)] text-[var(--fingaurd-text)] border-white/15",
  other:
    "bg-[rgba(255,255,255,0.08)] text-[var(--fingaurd-text)] border-white/15",
};

export default function TransactionRow({ transaction: t }: Props) {
  const channelColor = CHANNEL_COLORS[t.channel] ?? CHANNEL_COLORS.other;

  return (
    <div
      className={`flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-4 px-4 py-3.5 rounded-xl border transition-all hover:shadow-sm hover:-translate-y-px ${
        t.is_anomaly
          ? "border-[rgba(227,107,99,0.45)] border-l-4 border-l-[var(--fingaurd-coral)] bg-[rgba(227,107,99,0.08)]"
          : "border-white/10 bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.05)]"
      }`}
    >
      {/* Category icon */}
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg border ${
          t.is_anomaly
            ? "bg-[rgba(227,107,99,0.18)] border-[rgba(227,107,99,0.42)]"
            : "bg-[rgba(255,255,255,0.08)] border-white/10"
        }`}
      >
        {createElement(getCategoryIcon(t.category), {
          className: `h-[18px] w-[18px] ${
            t.is_anomaly
              ? "text-[var(--fingaurd-coral)]"
              : "text-[var(--fingaurd-text-muted)]"
          }`,
        })}
      </div>

      {/* Main info */}
      <div className="w-full sm:w-auto sm:flex-1 min-w-0 order-first sm:order-none flex sm:block items-center gap-2">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-[var(--fingaurd-text)]">
            {t.merchant}
          </p>
          {t.is_anomaly && (
            <span
              title="Flagged as unusual by AI"
              className="flex shrink-0 items-center gap-1 text-[var(--fingaurd-coral)] ml-auto sm:ml-0"
            >
              <AlertTriangle
                size={13}
                className="fill-[rgba(227,107,99,0.2)]"
              />
              <span className="text-[10px] font-bold uppercase tracking-wide">
                Flagged
              </span>
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-[var(--fingaurd-text-muted)] w-full sm:w-auto">
          {t.description}
        </p>
      </div>

      {/* Date */}
      <div className="text-right shrink-0 hidden sm:block">
        <p className="text-xs text-[var(--fingaurd-text-muted)]">
          {formatDate(t.date)}
        </p>
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
            t.is_anomaly
              ? "text-[var(--fingaurd-coral)]"
              : "text-[var(--fingaurd-text)]"
          }`}
        >
          − {formatCurrency(t.amount)}
        </p>
      </div>
    </div>
  );
}
