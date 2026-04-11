import { createElement, useEffect, useState } from "react";
import TransactionList from "../components/transactions/TransactionList";
import { getTransactionSummary, getAnomalies } from "../lib/api";
import type { TransactionSummary } from "../lib/api";
import { formatCurrency, getCategoryIcon } from "../lib/utils";
import { AlertCircle, AlertTriangle, ShoppingBag, Receipt } from "lucide-react";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";

export default function TransactionsPage() {
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [anomalyCount, setAnomalyCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadPageData() {
    setLoading(true);
    setError("");
    try {
      const [summaryData, anomalies] = await Promise.all([
        getTransactionSummary(),
        getAnomalies(),
      ]);
      setSummary(summaryData);
      setAnomalyCount(anomalies.length);
    } catch {
      setError("Failed to load transaction data. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPageData();
  }, []);

  const topCategory = summary
    ? [...summary.summary].sort((a, b) => b.total - a.total)[0]
    : undefined;

  if (loading) {
    return (
      <div className="space-y-5 animate-in fade-in duration-200">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <div className="space-y-2 rounded-2xl border border-[var(--fingaurd-border)] bg-[var(--fingaurd-surface)] p-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-in fade-in duration-200">
        <div className="mx-auto max-w-xl rounded-xl border border-[rgba(227,107,99,0.45)] bg-[rgba(227,107,99,0.12)] p-6 text-center">
          <AlertCircle className="mx-auto mb-3 h-6 w-6 text-[var(--fingaurd-coral)]" />
          <p className="font-medium text-[#ffbeb8]">
            Failed to load transaction data. Please try again.
          </p>
          <Button
            variant="outline"
            className="mt-4 border-white/15 bg-[rgba(255,255,255,0.04)] text-[var(--fingaurd-text)] hover:bg-[rgba(255,255,255,0.1)]"
            onClick={() => void loadPageData()}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Summary banner */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Total spend */}
        <div className="rounded-2xl border border-[var(--fingaurd-border)] bg-[var(--fingaurd-surface)] p-5 flex items-center gap-4">
          <div className="h-11 w-11 rounded-xl border border-[rgba(13,158,138,0.35)] bg-[rgba(13,158,138,0.14)] flex items-center justify-center">
            <Receipt size={20} className="text-[var(--fingaurd-brand)]" />
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--fingaurd-text-muted)]">
              Total This Month
            </p>
            <p className="text-xl font-extrabold text-[var(--fingaurd-text)]">
              {summary ? formatCurrency(summary.totalSpend) : "—"}
            </p>
          </div>
        </div>

        {/* Anomalies */}
        <div
          className={`rounded-2xl border shadow-sm p-5 flex items-center gap-4 ${
            anomalyCount > 0
              ? "bg-[rgba(227,107,99,0.12)] border-[rgba(227,107,99,0.45)]"
              : "bg-[var(--fingaurd-surface)] border-[var(--fingaurd-border)]"
          }`}
        >
          <div
            className={`h-11 w-11 rounded-xl flex items-center justify-center ${
              anomalyCount > 0
                ? "bg-[rgba(227,107,99,0.2)]"
                : "bg-[rgba(255,255,255,0.06)]"
            }`}
          >
            <AlertTriangle
              size={20}
              className={anomalyCount > 0 ? "text-red-600" : "text-slate-400"}
            />
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--fingaurd-text-muted)]">
              AI-Flagged Anomalies
            </p>
            <p
              className={`text-xl font-extrabold ${
                anomalyCount > 0
                  ? "text-[var(--fingaurd-coral)]"
                  : "text-[var(--fingaurd-text)]"
              }`}
            >
              {anomalyCount} transactions
            </p>
          </div>
        </div>

        {/* Top category */}
        <div className="rounded-2xl border border-[var(--fingaurd-border)] bg-[var(--fingaurd-surface)] p-5 flex items-center gap-4">
          <div className="h-11 w-11 rounded-xl border border-[rgba(207,164,74,0.35)] bg-[rgba(207,164,74,0.14)] flex items-center justify-center text-xl">
            {createElement(
              topCategory ? getCategoryIcon(topCategory.category) : ShoppingBag,
              {
                size: 20,
                className: "text-[var(--fingaurd-amber)]",
              },
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--fingaurd-text-muted)]">
              Top Spending Category
            </p>
            <p className="text-xl font-extrabold text-[var(--fingaurd-text)]">
              {topCategory
                ? `${topCategory.category} (${formatCurrency(topCategory.total)})`
                : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Transaction list */}
      <TransactionList />
    </div>
  );
}
