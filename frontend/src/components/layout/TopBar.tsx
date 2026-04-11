import { useLocation } from "react-router-dom";
import { useStore } from "../../store/useStore";
import { refreshInsights } from "../../lib/api";
import { Bell, RefreshCw } from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/transactions": "Transactions",
  "/alerts": "Alerts",
  "/chat": "AI Chat",
};

export default function TopBar() {
  const location = useLocation();
  const { unreadCount, setInsight, setUnreadCount, isRefreshing, setIsRefreshing } =
    useStore();

  const title = PAGE_TITLES[location.pathname] ?? "SmartSpend AI";

  async function handleRefresh() {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const data = await refreshInsights();
      setInsight(data.insight);
    } catch (e) {
      console.error("Refresh failed", e);
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <header className="h-14 flex-shrink-0 border-b border-slate-200 bg-white/80 backdrop-blur-sm flex items-center justify-between px-6">
      <h1 className="text-lg font-semibold text-slate-800">{title}</h1>

      <div className="flex items-center gap-3">
        {/* Refresh Analysis */}
        <Button
          id="refresh-analysis-btn"
          size="sm"
          variant="outline"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="gap-2 text-xs"
        >
          <RefreshCw
            size={13}
            className={isRefreshing ? "animate-spin" : ""}
          />
          {isRefreshing ? "Refreshing…" : "Refresh Analysis"}
        </Button>

        {/* Alert Bell */}
        <a
          href="/alerts"
          className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
          title="Alerts"
        >
          <Bell size={18} className="text-slate-600" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 text-[10px] font-bold bg-red-500 text-white border-none rounded-full">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </a>
      </div>
    </header>
  );
}
