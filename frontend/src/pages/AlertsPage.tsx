import { useEffect, useState } from "react";
import { AlertCircle, Bell } from "lucide-react";
import { useStore } from "@/store/useStore";
import { getAlerts } from "@/lib/api";
import AlertsPanel from "@/components/alerts/AlertsPanel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function AlertsPage() {
  const { alerts, setAlerts, setUnreadCount } = useStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadAlerts = async () => {
    setLoading(true);
    setError("");
    try {
      const { alerts, unreadCount } = await getAlerts();
      setAlerts(alerts);
      setUnreadCount(unreadCount);
    } catch {
      setError("Failed to load alerts. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAlerts();
  }, [setAlerts, setUnreadCount]);

  const unreadCount = alerts.filter((a) => !a.read).length;

  return (
    <div className="min-h-screen bg-gray-50 animate-in fade-in duration-200">
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden p-4 space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
            <AlertCircle className="mx-auto mb-3 h-6 w-6 text-red-600" />
            <p className="font-medium text-red-700">
              Failed to load alerts. Please try again.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => void loadAlerts()}
            >
              Retry
            </Button>
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
