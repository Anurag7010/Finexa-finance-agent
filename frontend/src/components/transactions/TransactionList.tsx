import { useEffect, useState, useCallback } from "react";
import { getAnomalies, getTransactions } from "../../lib/api";
import type { Transaction } from "../../lib/api";
import TransactionRow from "./TransactionRow";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { Search, ChevronDown, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "../ui/button";

const CATEGORIES = [
  "All",
  "Food & Dining",
  "Transportation",
  "Shopping",
  "Entertainment",
  "Utilities",
  "Health",
  "Groceries",
  "Rent",
];

const PAGE_SIZE = 10;

export default function TransactionList() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [anomalyTotal, setAnomalyTotal] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [tab, setTab] = useState<"all" | "anomalies">("all");
  const [skip, setSkip] = useState(0);

  const fetchTransactions = useCallback(
    async (reset = true, currentSkip = 0) => {
      if (reset) setLoading(true);
      else setLoadingMore(true);
      setError("");
      try {
        if (tab === "anomalies") {
          const anomalies = await getAnomalies();
          const filtered = anomalies.filter((t) => {
            const byCategory = category === "All" || t.category === category;
            const q = search.trim().toLowerCase();
            const bySearch =
              !q ||
              t.merchant.toLowerCase().includes(q) ||
              t.description.toLowerCase().includes(q);
            return byCategory && bySearch;
          });

          setAnomalyTotal(anomalies.length);
          setTransactions(filtered);
          setTotal(filtered.length);
          setSkip(filtered.length);
          return;
        }

        const catParam = category === "All" ? undefined : category;
        const { transactions: data, total: tot } = await getTransactions({
          limit: PAGE_SIZE,
          skip: currentSkip,
          category: catParam,
          search: search || undefined,
        });
        if (reset) {
          setTransactions(data);
          setSkip(PAGE_SIZE);
        } else {
          setTransactions((prev) => [...prev, ...data]);
          setSkip((s) => s + PAGE_SIZE);
        }
        setTotal(tot);

        const anomalies = await getAnomalies();
        setAnomalyTotal(anomalies.length);
      } catch {
        setError("Failed to load transactions.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [category, search, tab],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setSkip(0);
      fetchTransactions(true, 0);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, search, tab]);

  const displayed = transactions;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Filter bar */}
      <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            id="txn-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search merchant or description…"
            className="w-full border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
          />
        </div>

        {/* Category filter */}
        <div className="relative">
          <select
            id="txn-category-filter"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="appearance-none border border-slate-200 rounded-lg px-3 py-2 pr-8 text-sm text-slate-700 focus:outline-none focus:border-indigo-400 bg-white"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <ChevronDown
            size={13}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
        </div>

        {/* Tab switcher */}
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as "all" | "anomalies")}
        >
          <TabsList className="h-9">
            <TabsTrigger value="all" className="text-xs px-3">
              All ({total})
            </TabsTrigger>
            <TabsTrigger value="anomalies" className="text-xs px-3 gap-1.5">
              <AlertTriangle size={11} className="text-red-500" />
              Anomalies ({anomalyTotal})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Transaction list */}
      <div className="p-4 space-y-2">
        {loading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton h-16 rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-500 text-sm">
            <p>{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => fetchTransactions(true)}
            >
              Retry
            </Button>
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-slate-500 text-sm font-medium">
              {tab === "anomalies"
                ? "No anomalies found — your spending looks normal!"
                : "No transactions match your filters."}
            </p>
          </div>
        ) : (
          <>
            {displayed.map((t) => (
              <TransactionRow key={t._id} transaction={t} />
            ))}

            {/* Load more */}
            {tab === "all" && transactions.length < total && (
              <div className="pt-2 text-center">
                <Button
                  id="load-more-btn"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    fetchTransactions(false, skip);
                  }}
                  disabled={loadingMore}
                  className="gap-2 text-xs"
                >
                  {loadingMore ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : null}
                  {loadingMore
                    ? "Loading…"
                    : `Load more (${total - transactions.length} remaining)`}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
