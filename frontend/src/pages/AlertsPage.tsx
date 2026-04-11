import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useStore } from "@/store/useStore";
import { getAlerts } from "@/lib/api";
import AlertsPanel from "@/components/alerts/AlertsPanel";

export default function AlertsPage() {
  const { alerts, setAlerts, setUnreadCount } = useStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { alerts, unreadCount } = await getAlerts();
        setAlerts(alerts);
        setUnreadCount(unreadCount);
      } catch {
        setAlerts([]);
        setUnreadCount(0);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [setAlerts, setUnreadCount]);

  const unreadCount = alerts.filter((a) => !a.read).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
            <Bell className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Alerts</h1>
            {unreadCount > 0 ? (
              <p className="text-sm text-gray-500">
                <span className="font-semibold text-red-500">
                  {unreadCount} unread
                </span>{" "}
                alert{unreadCount > 1 ? "s" : ""} waiting for your attention
              </p>
            ) : (
              <p className="text-sm text-gray-400">All caught up!</p>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-6">
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="divide-y divide-gray-100">
              {[1, 2, 3].map((i) => (
                <div key={i} className="px-4 py-4">
                  <div className="flex gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-gray-200 animate-pulse mt-1.5" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                      <div className="h-3 bg-gray-100 rounded animate-pulse w-full" />
                      <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <AlertsPanel />
          </div>
        )}
      </div>
    </div>
  );
}
