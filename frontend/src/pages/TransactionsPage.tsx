import { useEffect, useState } from "react";
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
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="space-y-2 rounded-2xl border border-slate-100 bg-white p-4">
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
        <div className="mx-auto max-w-xl rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertCircle className="mx-auto mb-3 h-6 w-6 text-red-600" />
          <p className="font-medium text-red-700">
            Failed to load transaction data. Please try again.
          </p>
          <Button
            variant="outline"
            className="mt-4"
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
      <div className="grid grid-cols-3 gap-4">
        {/* Total spend */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center">
            <Receipt size={20} className="text-indigo-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">
              Total This Month
            </p>
            <p className="text-xl font-extrabold text-slate-800">
              {summary ? formatCurrency(summary.totalSpend) : "—"}
            </p>
          </div>
        </div>

        {/* Anomalies */}
        <div
          className={`rounded-2xl border shadow-sm p-5 flex items-center gap-4 ${
            anomalyCount > 0
              ? "bg-red-50 border-red-200"
              : "bg-white border-slate-100"
          }`}
        >
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center ${
              anomalyCount > 0 ? "bg-red-100" : "bg-slate-50"
            }`}
          >
            <AlertTriangle
              size={20}
              className={anomalyCount > 0 ? "text-red-600" : "text-slate-400"}
            />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">
              AI-Flagged Anomalies
            </p>
            <p
              className={`text-xl font-extrabold ${
                anomalyCount > 0 ? "text-red-600" : "text-slate-800"
              }`}
            >
              {anomalyCount} transactions
            </p>
          </div>
        </div>

        {/* Top category */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center text-xl">
            {topCategory ? (
              getCategoryIcon(topCategory.category)
            ) : (
              <ShoppingBag size={20} className="text-amber-600" />
            )}
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">
              Top Spending Category
            </p>
            <p className="text-xl font-extrabold text-slate-800">
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
