import { Link, useLocation } from "react-router-dom";
import { useStore } from "../../store/useStore";
import { refreshInsights } from "../../lib/api";
import { Bell, Loader2, RefreshCw, Menu } from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { toast } from "sonner";

const PAGE_TITLES: Record<string, string> = {
  "/home": "Finexa",
  "/dashboard": "Dashboard",
  "/goals": "Goals",
  "/subscriptions": "Subscriptions",
  "/transactions": "Transactions",
  "/alerts": "Alerts",
  "/chat": "Fin Guardian",
};

export default function TopBar({ onMenuClick }: { onMenuClick?: () => void }) {
  const location = useLocation();
  const { unreadCount, setInsight, isRefreshing, setIsRefreshing } = useStore();

  const title = PAGE_TITLES[location.pathname] ?? "Finexa";

  async function handleRefresh() {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const data = await refreshInsights();
      setInsight(data.insight);
      toast.success(
        `Health score updated: ${Math.round(data.insight.health_score)}/100`,
      );
    } catch {
      toast.error("Analysis failed. Please try again.");
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <header className="h-16 flex-shrink-0 border-b border-[var(--fingaurd-border)] bg-[rgba(10,18,21,0.9)] backdrop-blur-sm flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden text-[var(--fingaurd-text)] hover:bg-[rgba(255,255,255,0.05)] p-2 rounded-md"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-[var(--fingaurd-text)]">
            {title}
          </h1>
          <p className="text-[11px] text-[var(--fingaurd-text-muted)]">
            Financial safety workspace
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Refresh Analysis */}
        <Button
          id="refresh-analysis-btn"
          size="sm"
          variant="outline"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="gap-2 text-xs border-white/15 bg-[rgba(255,255,255,0.03)] text-[var(--fingaurd-text)] hover:bg-[rgba(13,158,138,0.12)] hover:border-[rgba(13,158,138,0.45)]"
        >
          {isRefreshing ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <RefreshCw size={13} />
          )}
          {isRefreshing ? "Refreshing…" : "Refresh Analysis"}
        </Button>

        {/* Alert Bell */}
        <Link
          to="/alerts"
          className="relative p-2 rounded-lg border border-white/10 bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.08)] transition-colors"
          title="Alerts"
        >
          <Bell size={18} className="text-[var(--fingaurd-text)]" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 text-[10px] font-bold bg-[var(--fingaurd-coral)] text-white border-none rounded-full">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Link>
      </div>
    </header>
  );
}
