import { useEffect, useRef, useState } from "react";
import { getSyncStatus, type SyncJob } from "../../lib/api";
import { CheckCircle2, Loader2, XCircle, Clock } from "lucide-react";

interface SyncStatusProps {
  jobId: string;
  onComplete?: (job: SyncJob) => void;
}

/**
 * Real-time sync job status component.
 * Polls /api/sync/status/:jobId every 2 seconds until the job is done.
 */
export default function SyncStatus({ jobId, onComplete }: SyncStatusProps) {
  const [job, setJob] = useState<SyncJob | null>(null);
  const [error, setError] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let active = true;

    async function poll() {
      try {
        const { job: fetched } = await getSyncStatus(jobId);
        if (!active) return;
        setJob(fetched);
        if (fetched.status === "completed" || fetched.status === "failed") {
          if (intervalRef.current) clearInterval(intervalRef.current);
          if (fetched.status === "completed") onComplete?.(fetched);
        }
      } catch {
        if (!active) return;
        setError("Failed to fetch sync status");
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    }

    poll(); // immediate first check
    intervalRef.current = setInterval(poll, 2000);

    return () => {
      active = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [jobId, onComplete]);

  if (error) {
    return (
      <div className="flex items-center gap-2 text-xs text-[var(--fingaurd-coral)]">
        <XCircle size={13} />
        <span>{error}</span>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex items-center gap-2 text-xs text-[var(--fingaurd-text-muted)]">
        <Loader2 size={13} className="animate-spin" />
        <span>Connecting...</span>
      </div>
    );
  }

  const isRunning = job.status === "pending" || job.status === "running";
  const isComplete = job.status === "completed";
  const isFailed = job.status === "failed";

  return (
    <div
      className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs transition-all ${
        isComplete
          ? "border-[rgba(13,158,138,0.3)] bg-[rgba(13,158,138,0.08)] text-[var(--fingaurd-brand)]"
          : isFailed
          ? "border-[rgba(227,107,99,0.3)] bg-[rgba(227,107,99,0.08)] text-[var(--fingaurd-coral)]"
          : "border-[var(--fingaurd-border)] bg-[var(--fingaurd-surface)] text-[var(--fingaurd-text-muted)]"
      }`}
    >
      {isRunning && <Loader2 size={13} className="mt-0.5 shrink-0 animate-spin" />}
      {isComplete && <CheckCircle2 size={13} className="mt-0.5 shrink-0" />}
      {isFailed && <XCircle size={13} className="mt-0.5 shrink-0" />}
      {!isRunning && !isComplete && !isFailed && (
        <Clock size={13} className="mt-0.5 shrink-0" />
      )}

      <div className="space-y-0.5">
        <p className="font-medium leading-none">
          {isComplete
            ? `Done — ${job.transactions_imported} imported, ${job.transactions_skipped} skipped`
            : isFailed
            ? `Failed: ${job.error_message || "Unknown error"}`
            : job.current_step}
        </p>
        {isRunning && (
          <div className="mt-1.5 h-0.5 w-full overflow-hidden rounded bg-white/10">
            <div className="h-full w-1/2 animate-pulse rounded bg-[var(--fingaurd-brand)]" />
          </div>
        )}
      </div>
    </div>
  );
}
