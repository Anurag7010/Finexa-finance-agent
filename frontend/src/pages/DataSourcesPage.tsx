import { useCallback, useEffect, useRef, useState } from "react";
import {
  Database,
  Plus,
  Smartphone,
  Zap,
  Link2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "../components/ui/button";
import ConnectorCard from "../components/datasources/ConnectorCard";
import {
  getDataSources,
  aaInitiateConsent,
  aaGetConsentStatus,
  aaFetchData,
  upiConnect,
  upiWebhook,
  type DataSource,
  type AaConsentResult,
} from "../lib/api";
import { toast } from "sonner";

// ─── AA Consent flow step labels ──────────────────────────────────────────────
type AaStep = "idle" | "initiating" | "pending" | "approved" | "fetching" | "done" | "error";

const AA_STEP_LABELS: Record<AaStep, string> = {
  idle: "Connect via Account Aggregator",
  initiating: "Initiating consent request...",
  pending: "Waiting for consent approval...",
  approved: "Consent approved — fetching transactions",
  fetching: "Fetching & categorizing transactions...",
  done: "Import complete!",
  error: "Consent flow failed",
};

// ─── Fake UPI demo payloads ───────────────────────────────────────────────────
const DEMO_UPI_PAYLOADS = [
  { payeeName: "Swiggy Food Delivery", payeeVpa: "swiggy@icici", amount: 385 },
  { payeeName: "Zepto Groceries", payeeVpa: "zepto@axis", amount: 892 },
  { payeeName: "Ola Cabs", payeeVpa: "ola@okaxis", amount: 156 },
  { payeeName: "Amazon India", payeeVpa: "amazon@apl", amount: 1299 },
  { payeeName: "Starbucks Coffee", payeeVpa: "starbucks@hdfcbank", amount: 510 },
  { payeeName: "Myntra Fashion", payeeVpa: "myntra@icici", amount: 799 },
];

export default function DataSourcesPage() {
  const [sources, setSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // AA consent flow state
  const [aaStep, setAaStep] = useState<AaStep>("idle");
  const [, setAaConsent] = useState<AaConsentResult | null>(null);
  const [aaResult, setAaResult] = useState<{ imported: number; skipped: number } | null>(null);
  const aaPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // UPI connect state
  const [upiConnecting, setUpiConnecting] = useState<"gpay" | "phonepe" | null>(null);

  // UPI demo webhook state
  const [simulatingUpi, setSimulatingUpi] = useState(false);

  const loadSources = useCallback(async () => {
    try {
      const { sources: fetched } = await getDataSources();
      setSources(fetched);
    } catch {
      setError("Failed to load data sources");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSources();
  }, [loadSources]);

  // ─── AA consent flow ──────────────────────────────────────────────────────

  async function startAaFlow() {
    setAaStep("initiating");
    setAaResult(null);
    try {
      const consent = await aaInitiateConsent();
      setAaConsent(consent);
      setAaStep("pending");
      startPollingConsent(consent.consent_id);
    } catch {
      setAaStep("error");
      toast.error("Failed to initiate AA consent");
    }
  }

  function startPollingConsent(consentId: string) {
    if (aaPollingRef.current) clearInterval(aaPollingRef.current);

    aaPollingRef.current = setInterval(async () => {
      try {
        const status = await aaGetConsentStatus(consentId);
        if (status.status === "approved") {
          clearInterval(aaPollingRef.current!);
          setAaStep("fetching");
          await fetchAaTransactions(consentId);
        }
      } catch {
        clearInterval(aaPollingRef.current!);
        setAaStep("error");
      }
    }, 1000);
  }

  async function fetchAaTransactions(consentId: string) {
    try {
      const result = await aaFetchData(consentId);
      setAaResult({ imported: result.imported, skipped: result.skipped });
      setAaStep("done");
      toast.success(
        `${result.imported} transactions imported from ${result.bank_name}`
      );
      void loadSources(); // refresh the card list
    } catch (err: unknown) {
      setAaStep("error");
      toast.error("Failed to fetch AA transactions");
    }
  }

  useEffect(() => {
    return () => {
      if (aaPollingRef.current) clearInterval(aaPollingRef.current);
    };
  }, []);

  // ─── UPI connect ──────────────────────────────────────────────────────────

  async function handleUpiConnect(provider: "gpay" | "phonepe") {
    setUpiConnecting(provider);
    try {
      await upiConnect(provider);
      toast.success(`${provider === "gpay" ? "Google Pay" : "PhonePe"} connected`);
      void loadSources();
    } catch {
      toast.error("Failed to connect UPI provider");
    } finally {
      setUpiConnecting(null);
    }
  }

  // ─── Simulate UPI transaction (demo moment) ───────────────────────────────

  async function simulateUpiTransaction() {
    setSimulatingUpi(true);
    const payload = DEMO_UPI_PAYLOADS[Math.floor(Math.random() * DEMO_UPI_PAYLOADS.length)];

    try {
      const result = await upiWebhook({
        provider: "gpay",
        ...payload,
        transactionId: `DEMO-${Date.now()}`,
        timestamp: new Date().toISOString(),
      });

      if (result.imported > 0) {
        toast.success(
          `💳 Live UPI transaction arrived! ₹${payload.amount} from ${payload.payeeName} imported`,
          { duration: 6000 }
        );
        void loadSources();
      } else {
        toast.info("Transaction was a duplicate — already in your history");
      }
    } catch {
      toast.error("Failed to simulate UPI transaction");
    } finally {
      setSimulatingUpi(false);
    }
  }

  function handleSourceDelete(id: string) {
    setSources((prev) => prev.filter((s) => s._id !== id));
  }

  function handleSyncComplete(updated: DataSource) {
    setSources((prev) => prev.map((s) => (s._id === updated._id ? updated : s)));
  }

  const totalTransactions = sources.reduce((sum, s) => sum + s.transactions_count, 0);
  const lastSyncedAt = sources
    .filter((s) => s.last_sync_at)
    .sort((a, b) => new Date(b.last_sync_at!).getTime() - new Date(a.last_sync_at!).getTime())[0]
    ?.last_sync_at;

  if (loading) {
    return (
      <div className="space-y-5 animate-in fade-in duration-200">
        <div className="h-8 w-48 rounded-xl bg-white/5 animate-pulse" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--fingaurd-text)] flex items-center gap-2">
            <Database size={20} className="text-[var(--fingaurd-brand)]" />
            Connected Accounts
          </h1>
          <p className="text-sm text-[var(--fingaurd-text-muted)] mt-0.5">
            {sources.length} source{sources.length !== 1 ? "s" : ""} ·{" "}
            {totalTransactions.toLocaleString()} total transactions
            {lastSyncedAt && (
              <>
                {" "}
                · Last sync{" "}
                <span className="text-[var(--fingaurd-text)]">
                  {new Date(lastSyncedAt).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </>
            )}
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-[rgba(227,107,99,0.4)] bg-[rgba(227,107,99,0.1)] px-4 py-3 text-sm text-[var(--fingaurd-coral)]">
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {/* Data source cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sources.map((source) => (
          <ConnectorCard
            key={source._id}
            source={source}
            onDelete={handleSourceDelete}
            onSyncComplete={handleSyncComplete}
          />
        ))}

        {sources.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-10 text-center">
            <Database size={28} className="mx-auto mb-3 text-[var(--fingaurd-text-muted)]" />
            <p className="text-sm text-[var(--fingaurd-text-muted)]">
              No data sources connected yet.
              <br />
              Connect a bank account or UPI app below.
            </p>
          </div>
        )}
      </div>

      {/* Connector panels */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {/* Account Aggregator panel */}
        <div className="rounded-2xl border border-[var(--fingaurd-border)] bg-[var(--fingaurd-surface)] p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="h-9 w-9 rounded-xl bg-[rgba(125,183,207,0.12)] border border-[rgba(125,183,207,0.25)] flex items-center justify-center">
              <Database size={16} className="text-[#7db7cf]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--fingaurd-text)]">
                Account Aggregator (AA)
              </p>
              <p className="text-xs text-[var(--fingaurd-text-muted)]">
                RBI-regulated bank data sharing
              </p>
            </div>
          </div>

          {/* AA step progress */}
          <div className="space-y-2 mb-4">
            {(["initiating", "pending", "approved", "fetching", "done"] as AaStep[]).map(
              (step) => {
                const stepOrder: AaStep[] = ["initiating", "pending", "approved", "fetching", "done"];
                const currentIdx = stepOrder.indexOf(aaStep);
                const isActive = step === aaStep;
                const isDone = stepOrder.indexOf(step) < currentIdx;

                return (
                  <div
                    key={step}
                    className={`flex items-center gap-2 text-xs transition-all ${
                      isActive
                        ? "text-[var(--fingaurd-text)]"
                        : isDone
                        ? "text-[var(--fingaurd-brand)]"
                        : "text-[var(--fingaurd-text-muted)] opacity-40"
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 size={13} className="shrink-0" />
                    ) : isActive && step !== "done" ? (
                      <Loader2 size={13} className="shrink-0 animate-spin" />
                    ) : step === "done" && isActive ? (
                      <CheckCircle2 size={13} className="shrink-0 text-[var(--fingaurd-brand)]" />
                    ) : (
                      <div className="h-3.5 w-3.5 shrink-0 rounded-full border border-current opacity-40" />
                    )}
                    <span>{AA_STEP_LABELS[step]}</span>
                  </div>
                );
              }
            )}
          </div>

          {aaStep === "error" && (
            <p className="text-xs text-[var(--fingaurd-coral)] mb-3 flex items-center gap-1">
              <AlertCircle size={11} /> Consent flow failed — please try again.
            </p>
          )}

          {aaStep === "done" && aaResult && (
            <div className="rounded-lg bg-[rgba(13,158,138,0.08)] border border-[rgba(13,158,138,0.2)] px-3 py-2 text-xs text-[var(--fingaurd-brand)] mb-3">
              ✓ {aaResult.imported} transactions imported, {aaResult.skipped} skipped as duplicates
            </div>
          )}

          <Button
            onClick={aaStep === "idle" || aaStep === "error" || aaStep === "done" ? startAaFlow : undefined}
            disabled={["initiating", "pending", "approved", "fetching"].includes(aaStep)}
            className="w-full bg-[rgba(125,183,207,0.15)] hover:bg-[rgba(125,183,207,0.25)] text-[#7db7cf] border border-[rgba(125,183,207,0.3)] text-xs h-9"
          >
            {["initiating", "pending", "approved", "fetching"].includes(aaStep) ? (
              <>
                <Loader2 size={12} className="mr-1.5 animate-spin" />
                {AA_STEP_LABELS[aaStep]}
              </>
            ) : aaStep === "done" ? (
              <>
                <RefreshCw size={12} className="mr-1.5" />
                Connect Another Bank
              </>
            ) : (
              <>
                <Link2 size={12} className="mr-1.5" />
                Connect via Account Aggregator
              </>
            )}
          </Button>
        </div>

        {/* UPI panel */}
        <div className="rounded-2xl border border-[var(--fingaurd-border)] bg-[var(--fingaurd-surface)] p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="h-9 w-9 rounded-xl bg-[rgba(245,166,35,0.12)] border border-[rgba(245,166,35,0.25)] flex items-center justify-center">
              <Smartphone size={16} className="text-[#f5a623]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--fingaurd-text)]">
                UPI Apps
              </p>
              <p className="text-xs text-[var(--fingaurd-text-muted)]">
                Connect Google Pay or PhonePe
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            {(["gpay", "phonepe"] as const).map((provider) => {
              const connected = sources.some(
                (s) => s.type === `upi_${provider}` && s.status === "connected"
              );
              return (
                <Button
                  key={provider}
                  onClick={() => handleUpiConnect(provider)}
                  disabled={!!upiConnecting || connected}
                  className={`text-xs h-9 ${
                    connected
                      ? "bg-[rgba(13,158,138,0.12)] border border-[rgba(13,158,138,0.3)] text-[var(--fingaurd-brand)]"
                      : "bg-[rgba(245,166,35,0.1)] hover:bg-[rgba(245,166,35,0.18)] border border-[rgba(245,166,35,0.25)] text-[#f5a623]"
                  }`}
                >
                  {upiConnecting === provider ? (
                    <Loader2 size={12} className="mr-1 animate-spin" />
                  ) : connected ? (
                    <CheckCircle2 size={12} className="mr-1" />
                  ) : (
                    <Plus size={12} className="mr-1" />
                  )}
                  {provider === "gpay" ? "Google Pay" : "PhonePe"}
                </Button>
              );
            })}
          </div>

          {/* Demo: Simulate a live UPI transaction */}
          <div className="rounded-xl border border-[rgba(245,166,35,0.2)] bg-[rgba(245,166,35,0.06)] p-3 mb-3">
            <p className="text-xs font-semibold text-[#f5a623] mb-1.5 flex items-center gap-1.5">
              <Zap size={11} />
              Live Demo Moment
            </p>
            <p className="text-xs text-[var(--fingaurd-text-muted)] mb-2.5">
              Simulate a real-time UPI transaction arriving — it will appear in your
              transaction list within 5 seconds.
            </p>
            <Button
              onClick={simulateUpiTransaction}
              disabled={simulatingUpi}
              className="w-full h-8 text-xs bg-[rgba(245,166,35,0.15)] hover:bg-[rgba(245,166,35,0.25)] text-[#f5a623] border border-[rgba(245,166,35,0.3)]"
            >
              {simulatingUpi ? (
                <>
                  <Loader2 size={11} className="mr-1.5 animate-spin" />
                  Sending transaction...
                </>
              ) : (
                <>
                  <Zap size={11} className="mr-1.5" />
                  Simulate UPI Transaction
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
