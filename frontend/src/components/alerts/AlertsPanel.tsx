import {
  Bell,
  BellOff,
  CheckCheck,
  AlertTriangle,
  ShoppingCart,
  Activity,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useStore } from "@/store/useStore";
import { markAlertRead, markAllAlertsRead } from "@/lib/api";
import { cn, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  return `${Math.floor(diff / 86400)} day${Math.floor(diff / 86400) > 1 ? "s" : ""} ago`;
}

const severityConfig = {
  high: {
    borderClass: "border-l-[3px] border-[var(--fingaurd-coral)]",
    bgClass: "bg-[rgba(227,107,99,0.13)]",
    dotClass: "bg-[var(--fingaurd-coral)]",
  },
  medium: {
    borderClass: "border-l-[3px] border-[var(--fingaurd-amber)]",
    bgClass: "bg-[rgba(207,164,74,0.13)]",
    dotClass: "bg-[var(--fingaurd-amber)]",
  },
  low: {
    borderClass: "border-l-[3px] border-[var(--fingaurd-brand)]",
    bgClass: "bg-[rgba(13,158,138,0.12)]",
    dotClass: "bg-[var(--fingaurd-brand)]",
  },
} as const;

const typeIcons: Record<string, React.ReactNode> = {
  overspend_pace: <Activity className="w-4 h-4" />,
  category_breach: <ShoppingCart className="w-4 h-4" />,
  anomaly: <AlertTriangle className="w-4 h-4" />,
};

interface AlertsPanelProps {
  compact?: boolean;
}

export default function AlertsPanel({ compact = false }: AlertsPanelProps) {
  const { alerts, setAlerts, unreadCount, setUnreadCount } = useStore();

  const sorted = [...alerts].sort(
    (a, b) =>
      new Date(b.triggered_at).getTime() - new Date(a.triggered_at).getTime(),
  );

  const handleMarkRead = async (id: string) => {
    const beforeUnread = unreadCount;
    setAlerts(alerts.map((a) => (a._id === id ? { ...a, read: true } : a)));
    setUnreadCount(Math.max(0, beforeUnread - 1));
    try {
      await markAlertRead(id);
    } catch {
      setAlerts(alerts);
      setUnreadCount(beforeUnread);
    }
  };

  const handleMarkAllRead = async () => {
    const beforeAlerts = alerts;
    const beforeUnread = unreadCount;
    setAlerts(alerts.map((a) => ({ ...a, read: true })));
    setUnreadCount(0);
    try {
      await markAllAlertsRead();
      toast.success("All alerts marked as read");
    } catch {
      setAlerts(beforeAlerts);
      setUnreadCount(beforeUnread);
    }
  };

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[rgba(13,158,138,0.34)] bg-[rgba(13,158,138,0.14)]">
          <BellOff className="h-7 w-7 text-[var(--fingaurd-brand)]" />
        </div>
        <p className="text-base font-medium text-[var(--fingaurd-text)]">
          No alerts
        </p>
        <p className="text-sm text-[var(--fingaurd-text-muted)]">
          Your finances are looking healthy.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-[var(--fingaurd-text-muted)]" />
          <span className="text-sm font-semibold text-[var(--fingaurd-text)]">
            Alerts
          </span>
          {unreadCount > 0 && (
            <Badge className="rounded-full bg-[var(--fingaurd-coral)] px-2 py-0 text-xs text-white">
              {unreadCount}
            </Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllRead}
            className="flex h-7 items-center gap-1 px-2 text-xs text-[var(--fingaurd-brand)] hover:bg-[rgba(13,158,138,0.12)] hover:text-[var(--fingaurd-brand)]"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all read
          </Button>
        )}
      </div>

      <div
        className={cn(
          "divide-y divide-white/10",
          compact && "max-h-72 overflow-y-auto",
        )}
      >
        {sorted.map((alert) => {
          const cfg = severityConfig[alert.severity] || severityConfig.low;
          const isUnread = !alert.read;

          return (
            <div
              key={alert._id}
              onClick={() => !alert.read && handleMarkRead(alert._id)}
              className={cn(
                "flex gap-3 px-4 py-3 cursor-pointer transition-all duration-200",
                cfg.borderClass,
                isUnread
                  ? `${cfg.bgClass} hover:brightness-95`
                  : "bg-[rgba(255,255,255,0.01)] hover:bg-[rgba(255,255,255,0.05)]",
              )}
            >
              <div className="flex-shrink-0 mt-1.5">
                <span
                  className={cn(
                    "inline-block w-2.5 h-2.5 rounded-full",
                    cfg.dotClass,
                  )}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "text-[var(--fingaurd-text-muted)]",
                        cfg.dotClass.replace("bg-", "text-"),
                      )}
                    >
                      {typeIcons[alert.type] || <Bell className="w-4 h-4" />}
                    </span>
                    <p
                      className={cn(
                        "text-sm leading-tight",
                        isUnread
                          ? "font-bold text-[var(--fingaurd-text)]"
                          : "font-semibold text-[var(--fingaurd-text-muted)]",
                      )}
                    >
                      {alert.title}
                    </p>
                  </div>
                  <span className="flex-shrink-0 whitespace-nowrap text-xs text-[var(--fingaurd-text-muted)]">
                    {timeAgo(alert.triggered_at)}
                  </span>
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-[var(--fingaurd-text-muted)]">
                  {alert.message}
                </p>
                {typeof alert.amount === "number" && (
                  <p className="mt-1 text-xs font-medium text-[var(--fingaurd-text)]">
                    Amount: {formatCurrency(alert.amount)}
                  </p>
                )}
                {!alert.read && (
                  <span className="mt-1.5 inline-block text-xs font-medium text-[var(--fingaurd-brand)]">
                    Click to mark as read
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
