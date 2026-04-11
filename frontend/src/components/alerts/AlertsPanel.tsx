import { useEffect, useState } from "react";
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
import { getAlerts, markAlertRead, markAllAlertsRead } from "@/lib/api";
import { cn } from "@/lib/utils";

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  return `${Math.floor(diff / 86400)} day${Math.floor(diff / 86400) > 1 ? "s" : ""} ago`;
}

const severityConfig = {
  high: {
    borderClass: "border-l-4 border-red-500",
    bgClass: "bg-red-50",
    dotClass: "bg-red-500",
  },
  medium: {
    borderClass: "border-l-4 border-amber-500",
    bgClass: "bg-amber-50",
    dotClass: "bg-amber-500",
  },
  low: {
    borderClass: "border-l-4 border-blue-500",
    bgClass: "bg-blue-50",
    dotClass: "bg-blue-500",
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await getAlerts();
        setAlerts(data.alerts);
        setUnreadCount(data.unreadCount);
      } finally {
        setLoading(false);
      }
    };

    if (alerts.length === 0) {
      load().catch(() => {
        setAlerts([]);
        setUnreadCount(0);
      });
    }
  }, [alerts.length, setAlerts, setUnreadCount]);

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
    } catch {
      setAlerts(beforeAlerts);
      setUnreadCount(beforeUnread);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-lg bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
        <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
          <BellOff className="w-7 h-7 text-green-500" />
        </div>
        <p className="text-base font-medium text-gray-700">No alerts yet.</p>
        <p className="text-sm text-gray-400">Your finances look quiet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-700">Alerts</span>
          {unreadCount > 0 && (
            <Badge className="px-2 py-0 text-xs bg-red-500 text-white rounded-full">
              {unreadCount}
            </Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllRead}
            className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 h-7 px-2"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all read
          </Button>
        )}
      </div>

      <div
        className={cn(
          "divide-y divide-gray-100",
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
                isUnread ? cfg.bgClass : "bg-white hover:bg-gray-50",
                isUnread && "hover:brightness-95",
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
                        "text-gray-500",
                        cfg.dotClass.replace("bg-", "text-"),
                      )}
                    >
                      {typeIcons[alert.type] || <Bell className="w-4 h-4" />}
                    </span>
                    <p
                      className={cn(
                        "text-sm leading-tight",
                        isUnread
                          ? "font-bold text-gray-900"
                          : "font-semibold text-gray-600",
                      )}
                    >
                      {alert.title}
                    </p>
                  </div>
                  <span className="flex-shrink-0 text-xs text-gray-400 whitespace-nowrap">
                    {timeAgo(alert.triggered_at)}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">
                  {alert.message}
                </p>
                {!alert.read && (
                  <span className="inline-block mt-1.5 text-xs font-medium text-blue-500">
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
