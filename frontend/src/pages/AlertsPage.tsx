import { useCallback, useEffect, useState } from "react";
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

  const loadAlerts = useCallback(async () => {
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
  }, [setAlerts, setUnreadCount]);

  useEffect(() => {
    void loadAlerts();
  }, [loadAlerts]);

  const unreadCount = alerts.filter((a) => !a.read).length;

  return (
    <div className="min-h-full animate-in fade-in duration-200">
      {/* Page header */}
      <div className="rounded-2xl border border-[var(--fingaurd-border)] bg-[var(--fingaurd-surface)] px-6 py-5">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="h-10 w-10 rounded-xl border border-[rgba(227,107,99,0.35)] bg-[rgba(227,107,99,0.14)] flex items-center justify-center">
            <Bell className="h-5 w-5 text-[var(--fingaurd-coral)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--fingaurd-text)]">
              Alerts
            </h1>
            {unreadCount > 0 ? (
              <p className="text-sm text-[var(--fingaurd-text-muted)]">
                <span className="font-semibold text-[var(--fingaurd-coral)]">
                  {unreadCount} unread
                </span>{" "}
                alert{unreadCount > 1 ? "s" : ""} waiting for your attention
              </p>
            ) : (
              <p className="text-sm text-[var(--fingaurd-text-muted)]">
                All caught up!
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-3xl py-5">
        {loading ? (
          <div className="space-y-3 overflow-hidden rounded-xl border border-[var(--fingaurd-border)] bg-[var(--fingaurd-surface)] p-4 shadow-sm">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-[rgba(227,107,99,0.45)] bg-[rgba(227,107,99,0.12)] p-6 text-center">
            <AlertCircle className="mx-auto mb-3 h-6 w-6 text-[var(--fingaurd-coral)]" />
            <p className="font-medium text-[#ffbeb8]">
              Failed to load alerts. Please try again.
            </p>
            <Button
              variant="outline"
              className="mt-4 border-white/15 bg-[rgba(255,255,255,0.04)] text-[var(--fingaurd-text)] hover:bg-[rgba(255,255,255,0.1)]"
              onClick={() => void loadAlerts()}
            >
              Retry
            </Button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[var(--fingaurd-border)] bg-[var(--fingaurd-surface)] shadow-sm">
            <AlertsPanel />
          </div>
        )}
      </div>
    </div>
  );
}
