import { useEffect, useState, useCallback } from "react";
import { getAnomalies, getTransactions } from "../../lib/api";
import type { Transaction } from "../../lib/api";
import TransactionRow from "./TransactionRow";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import {
  Search,
  ChevronDown,
  AlertTriangle,
  Loader2,
  AlertCircle,
  Receipt,
  ShieldCheck,
} from "lucide-react";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";

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
    <div className="overflow-hidden rounded-2xl border border-[var(--fingaurd-border)] bg-[var(--fingaurd-surface)] shadow-sm">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-white/10 p-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fingaurd-text-muted)]"
          />
          <input
            id="txn-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search merchant or description…"
            className="w-full rounded-lg border border-white/15 bg-[rgba(255,255,255,0.03)] py-2 pl-8 pr-3 text-sm text-[var(--fingaurd-text)] placeholder:text-[var(--fingaurd-text-muted)] focus:border-[var(--fingaurd-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--fingaurd-brand)]"
          />
        </div>

        {/* Category filter */}
        <div className="relative">
          <select
            id="txn-category-filter"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="appearance-none rounded-lg border border-white/15 bg-[rgba(255,255,255,0.03)] px-3 py-2 pr-8 text-sm text-[var(--fingaurd-text)] focus:border-[var(--fingaurd-brand)] focus:outline-none"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <ChevronDown
            size={13}
            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[var(--fingaurd-text-muted)]"
          />
        </div>

        {/* Tab switcher */}
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as "all" | "anomalies")}
        >
          <TabsList className="h-9 border border-white/10 bg-[rgba(255,255,255,0.03)]">
            <TabsTrigger
              value="all"
              className="px-3 text-xs data-[state=active]:bg-[var(--fingaurd-brand)] data-[state=active]:text-white"
            >
              All ({total})
            </TabsTrigger>
            <TabsTrigger
              value="anomalies"
              className="gap-1.5 px-3 text-xs data-[state=active]:bg-[var(--fingaurd-coral)] data-[state=active]:text-white"
            >
              <AlertTriangle
                size={11}
                className="text-[var(--fingaurd-coral)]"
              />
              Anomalies ({anomalyTotal})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Transaction list */}
      <div className="p-4 space-y-2">
        {loading ? (
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-[rgba(227,107,99,0.45)] bg-[rgba(227,107,99,0.12)] px-4 py-6 text-center">
            <AlertCircle className="mx-auto mb-2 h-5 w-5 text-[var(--fingaurd-coral)]" />
            <p className="text-sm font-medium text-[#ffbeb8]">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 border-white/15 bg-[rgba(255,255,255,0.04)] text-[var(--fingaurd-text)] hover:bg-[rgba(255,255,255,0.1)]"
              onClick={() => fetchTransactions(true)}
            >
              Retry
            </Button>
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            {tab === "anomalies" ? (
              <ShieldCheck className="mb-3 h-8 w-8 text-[var(--fingaurd-success)]" />
            ) : (
              <Receipt className="mb-3 h-8 w-8 text-[var(--fingaurd-text-muted)]" />
            )}
            <p className="text-sm font-semibold text-[var(--fingaurd-text)]">
              {tab === "anomalies"
                ? "No anomalies detected"
                : "No transactions found"}
            </p>
            <p className="mt-1 text-xs text-[var(--fingaurd-text-muted)]">
              {tab === "anomalies"
                ? "Your recent transactions all look normal"
                : "Try adjusting your filters or date range"}
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
                  className="gap-2 border-white/15 bg-[rgba(255,255,255,0.03)] text-xs text-[var(--fingaurd-text)] hover:bg-[rgba(255,255,255,0.08)]"
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
