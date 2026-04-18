import { useState } from "react";
import {
  Database,
  Smartphone,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Shield,
  Zap,
} from "lucide-react";
import { Button } from "../ui/button";
import SyncStatus from "./SyncStatus";
import {
  type DataSource,
  type SyncJob,
  triggerSync,
  deleteDataSource,
} from "../../lib/api";
import { toast } from "sonner";

interface ConnectorCardProps {
  source: DataSource;
  onDelete?: (id: string) => void;
  onSyncComplete?: (source: DataSource) => void;
}

/** Returns the display label for a connector type */
function getSourceLabel(type: DataSource["type"]): string {
  switch (type) {
    case "seed":
      return "Demo Data — Finexa Seed";
    case "account_aggregator":
      return "Account Aggregator";
    case "upi_gpay":
      return "Google Pay UPI";
    case "upi_phonepe":
      return "PhonePe UPI";
    case "manual":
      return "Manual Entry";
    default:
      return type;
  }
}

/** Returns a badge color class for connection status */
function getStatusColor(status: DataSource["status"]): string {
  switch (status) {
    case "connected":
      return "bg-[rgba(13,158,138,0.15)] text-[var(--fingaurd-brand)] border-[rgba(13,158,138,0.35)]";
    case "syncing":
      return "bg-[rgba(125,183,207,0.15)] text-[#7db7cf] border-[rgba(125,183,207,0.35)]";
    case "error":
      return "bg-[rgba(227,107,99,0.15)] text-[var(--fingaurd-coral)] border-[rgba(227,107,99,0.35)]";
    case "disconnected":
      return "bg-white/5 text-[var(--fingaurd-text-muted)] border-white/10";
    default:
      return "";
  }
}

/** Returns the icon for a connector type */
function SourceIcon({ type }: { type: DataSource["type"] }) {
  if (type === "seed") return <Shield size={20} className="text-[var(--fingaurd-brand)]" />;
  if (type === "account_aggregator") return <Database size={20} className="text-[#7db7cf]" />;
  if (type === "upi_gpay" || type === "upi_phonepe")
    return <Smartphone size={20} className="text-[#f5a623]" />;
  return <Database size={20} className="text-[var(--fingaurd-text-muted)]" />;
}

/** Formats a timestamp to relative time */
function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/**
 * ConnectorCard — displays a data source with status, sync button, and live job progress.
 */
export default function ConnectorCard({
  source,
  onDelete,
  onSyncComplete,
}: ConnectorCardProps) {
  const [syncing, setSyncing] = useState(false);
  const [syncJobId, setSyncJobId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [currentSource, setCurrentSource] = useState(source);

  const isSeed = currentSource.type === "seed";

  async function handleSync() {
    if (isSeed) {
      toast.info("Seed data source does not need manual sync.");
      return;
    }

    setSyncing(true);
    setSyncJobId(null);
    try {
      const result = await triggerSync(currentSource._id);
      setSyncJobId(result.sync_job_id);
    } catch {
      toast.error("Failed to start sync");
      setSyncing(false);
    }
  }

  function handleSyncComplete(job: SyncJob) {
    setSyncing(false);
    const updated = {
      ...currentSource,
      status: "connected" as const,
      last_sync_at: new Date().toISOString(),
      transactions_count:
        currentSource.transactions_count + job.transactions_imported,
    };
    setCurrentSource(updated);
    onSyncComplete?.(updated);
    if (job.transactions_imported > 0) {
      toast.success(
        `Sync complete — ${job.transactions_imported} new transactions imported`
      );
    } else {
      toast.info("Sync complete — all transactions already up to date");
    }
  }

  async function handleDelete() {
    if (isSeed) return;
    setDeleting(true);
    try {
      await deleteDataSource(currentSource._id);
      onDelete?.(currentSource._id);
      toast.success("Data source disconnected");
    } catch {
      toast.error("Failed to disconnect data source");
      setDeleting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[var(--fingaurd-border)] bg-[var(--fingaurd-surface)] p-4 transition-all hover:border-white/20 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl border border-white/10 bg-white/[0.04] flex items-center justify-center shrink-0">
            <SourceIcon type={currentSource.type} />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--fingaurd-text)] leading-tight">
              {currentSource.account_name || getSourceLabel(currentSource.type)}
            </p>
            {currentSource.bank_name && currentSource.bank_name !== currentSource.account_name && (
              <p className="text-xs text-[var(--fingaurd-text-muted)] mt-0.5">
                {currentSource.bank_name}
              </p>
            )}
            {currentSource.masked_account_number && (
              <p className="text-xs text-[var(--fingaurd-text-muted)] font-mono">
                {currentSource.masked_account_number}
              </p>
            )}
          </div>
        </div>

        {/* Status badge */}
        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border tracking-wide uppercase flex items-center gap-1 shrink-0 ${getStatusColor(
            currentSource.status
          )}`}
        >
          {currentSource.status === "syncing" && (
            <Loader2 size={9} className="animate-spin" />
          )}
          {currentSource.status === "connected" && <CheckCircle2 size={9} />}
          {currentSource.status === "error" && <AlertCircle size={9} />}
          {currentSource.status}
        </span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-2.5 py-2">
          <p className="text-[10px] uppercase tracking-wider text-[var(--fingaurd-text-muted)]">
            Transactions
          </p>
          <p className="text-sm font-bold text-[var(--fingaurd-text)] mt-0.5">
            {currentSource.transactions_count.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-2.5 py-2">
          <p className="text-[10px] uppercase tracking-wider text-[var(--fingaurd-text-muted)]">
            Last Synced
          </p>
          <p className="text-sm font-medium text-[var(--fingaurd-text)] mt-0.5">
            {relativeTime(currentSource.last_sync_at)}
          </p>
        </div>
      </div>

      {/* Seed badge */}
      {isSeed && (
        <div className="flex items-center gap-1.5 rounded-lg bg-[rgba(13,158,138,0.08)] border border-[rgba(13,158,138,0.2)] px-2.5 py-1.5 text-xs text-[var(--fingaurd-brand)]">
          <Zap size={11} />
          <span>Persistent demo source — always connected</span>
        </div>
      )}

      {/* Sync job status (live polling) */}
      {syncJobId && (
        <SyncStatus jobId={syncJobId} onComplete={handleSyncComplete} />
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-0.5">
        <Button
          size="sm"
          onClick={handleSync}
          disabled={syncing || isSeed}
          className="flex-1 bg-[var(--fingaurd-brand)] hover:bg-[var(--fingaurd-brand-strong)] text-white text-xs h-8 disabled:opacity-40"
        >
          {syncing ? (
            <>
              <Loader2 size={12} className="mr-1 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw size={12} className="mr-1" />
              {isSeed ? "Auto-synced" : "Sync Now"}
            </>
          )}
        </Button>

        {!isSeed && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleDelete}
            disabled={deleting}
            aria-label="Disconnect data source"
            className="h-8 w-8 p-0 border-white/15 bg-[rgba(255,255,255,0.03)] text-[var(--fingaurd-text-muted)] hover:bg-[rgba(227,107,99,0.12)] hover:text-[var(--fingaurd-coral)] hover:border-[rgba(227,107,99,0.4)] transition-all"
          >
            {deleting ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Trash2 size={12} />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
