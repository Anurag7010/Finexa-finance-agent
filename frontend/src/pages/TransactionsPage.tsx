import { useEffect, useState } from "react";
import TransactionList from "../components/transactions/TransactionList";
import { getTransactionSummary, getAnomalies } from "../lib/api";
import type { TransactionSummary } from "../lib/api";
import { formatCurrency, getCategoryIcon } from "../lib/utils";
import { AlertTriangle, ShoppingBag, Receipt } from "lucide-react";

export default function TransactionsPage() {
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [anomalyCount, setAnomalyCount] = useState(0);

  useEffect(() => {
    getTransactionSummary().then(setSummary).catch(() => {});
    getAnomalies().then((a) => setAnomalyCount(a.length)).catch(() => {});
  }, []);

  const topCategory = summary?.summary.sort((a, b) => b.total - a.total)[0];

  return (
    <div className="space-y-5 page-enter">
      {/* Summary banner */}
      <div className="grid grid-cols-3 gap-4">
        {/* Total spend */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center">
            <Receipt size={20} className="text-indigo-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total This Month</p>
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
            {topCategory ? getCategoryIcon(topCategory._id) : <ShoppingBag size={20} className="text-amber-600" />}
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">
              Top Spending Category
            </p>
            <p className="text-xl font-extrabold text-slate-800">
              {topCategory
                ? `${topCategory._id} (${formatCurrency(topCategory.total)})`
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
