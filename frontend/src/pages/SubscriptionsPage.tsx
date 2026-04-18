import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  createSubscription,
  confirmSubscription,
  dismissSubscription,
  getSubscriptions,
  type SubscriptionItem,
} from "@/lib/api";
import { toast } from "sonner";
import { Repeat2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SubscriptionList from "@/components/subscriptions/SubscriptionList";

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    merchant: "",
    amount: "",
    frequency: "monthly" as "weekly" | "monthly" | "annual",
    category: "Other",
    next_predicted_date: "",
  });

  async function loadSubscriptions() {
    setLoading(true);
    try {
      const response = await getSubscriptions();
      setSubscriptions(response.subscriptions || []);
    } catch {
      toast.error("Failed to load subscriptions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSubscriptions();
  }, []);

  const confirmed = useMemo(
    () => subscriptions.filter((item) => item.is_confirmed),
    [subscriptions],
  );

  const detected = useMemo(
    () => subscriptions.filter((item) => !item.is_confirmed),
    [subscriptions],
  );

  const totals = useMemo(() => {
    const monthly = subscriptions.reduce((acc, item) => {
      if (item.frequency === "weekly") {
        return acc + (Number(item.amount || 0) * 52) / 12;
      }
      if (item.frequency === "annual") {
        return acc + Number(item.amount || 0) / 12;
      }
      return acc + Number(item.amount || 0);
    }, 0);

    const annual = subscriptions.reduce(
      (acc, item) => acc + Number(item.annual_cost || 0),
      0,
    );

    return {
      monthly,
      annual,
    };
  }, [subscriptions]);

  async function handleConfirm(id: string) {
    try {
      await confirmSubscription(id);
      setSubscriptions((prev) =>
        prev.map((item) =>
          item._id === id
            ? { ...item, is_confirmed: true, is_dismissed: false }
            : item,
        ),
      );
      toast.success("Subscription confirmed.");
    } catch {
      toast.error("Failed to confirm subscription.");
    }
  }

  async function handleDismiss(id: string) {
    try {
      await dismissSubscription(id);
      setSubscriptions((prev) => prev.filter((item) => item._id !== id));
      toast.success("Subscription dismissed.");
    } catch {
      toast.error("Failed to dismiss subscription.");
    }
  }

  async function handleCreateSubscription(e: FormEvent) {
    e.preventDefault();

    const merchant = form.merchant.trim();
    const amount = Number(form.amount || 0);

    if (!merchant) {
      toast.error("Merchant name is required.");
      return;
    }

    if (!(amount > 0)) {
      toast.error("Amount must be greater than 0.");
      return;
    }

    setAdding(true);
    try {
      const response = await createSubscription({
        merchant,
        amount,
        frequency: form.frequency,
        category: form.category,
        next_predicted_date: form.next_predicted_date || undefined,
      });

      setSubscriptions((prev) => {
        const withoutSame = prev.filter(
          (item) => item._id !== response.subscription._id,
        );
        return [response.subscription, ...withoutSame];
      });

      setForm({
        merchant: "",
        amount: "",
        frequency: "monthly",
        category: "Other",
        next_predicted_date: "",
      });
      setShowAddForm(false);
      toast.success("Subscription added.");
    } catch (error: unknown) {
      const message =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error as any)?.response?.data?.error || "Failed to add subscription.";
      toast.error(message);
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <div className="rounded-2xl border border-[var(--fingaurd-border)] bg-[var(--fingaurd-surface)] p-5">
        <div className="inline-flex items-center gap-2 text-sm text-[var(--fingaurd-text-muted)]">
          <Repeat2 className="h-4 w-4 text-[var(--fingaurd-brand)]" />
          Recurring Expense Intelligence
        </div>
        <h1 className="mt-1 text-2xl font-bold text-[var(--fingaurd-text)]">
          Subscriptions
        </h1>

        <button
          type="button"
          onClick={() => setShowAddForm((prev) => !prev)}
          className="mt-3 rounded-lg border border-white/15 bg-[rgba(255,255,255,0.04)] px-3 py-2 text-xs font-medium text-[var(--fingaurd-text)] hover:bg-[rgba(255,255,255,0.08)]"
        >
          {showAddForm ? "Close" : "Add Subscription"}
        </button>

        {showAddForm && (
          <form
            onSubmit={handleCreateSubscription}
            className="mt-3 grid gap-2 rounded-xl border border-white/10 bg-[rgba(255,255,255,0.03)] p-3 md:grid-cols-2"
          >
            <input
              value={form.merchant}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, merchant: e.target.value }))
              }
              placeholder="Merchant (e.g., Netflix)"
              className="rounded-lg border border-white/15 bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[var(--fingaurd-text)] outline-none focus:border-[var(--fingaurd-brand)]"
            />

            <input
              type="number"
              min={0}
              step="0.01"
              value={form.amount}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, amount: e.target.value }))
              }
              placeholder="Amount"
              className="rounded-lg border border-white/15 bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[var(--fingaurd-text)] outline-none focus:border-[var(--fingaurd-brand)]"
            />

            <select
              value={form.frequency}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  frequency: e.target.value as "weekly" | "monthly" | "annual",
                }))
              }
              className="rounded-lg border border-white/15 bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[var(--fingaurd-text)] outline-none focus:border-[var(--fingaurd-brand)]"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="annual">Annual</option>
            </select>

            <input
              value={form.category}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, category: e.target.value }))
              }
              placeholder="Category (optional)"
              className="rounded-lg border border-white/15 bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[var(--fingaurd-text)] outline-none focus:border-[var(--fingaurd-brand)]"
            />

            <input
              type="date"
              value={form.next_predicted_date}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  next_predicted_date: e.target.value,
                }))
              }
              className="rounded-lg border border-white/15 bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[var(--fingaurd-text)] outline-none focus:border-[var(--fingaurd-brand)]"
            />

            <button
              type="submit"
              disabled={adding}
              className="rounded-lg bg-[var(--fingaurd-brand)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--fingaurd-brand-strong)] disabled:opacity-70"
            >
              {adding ? "Adding..." : "Save Subscription"}
            </button>
          </form>
        )}

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-[rgba(255,255,255,0.02)] p-3">
            <p className="text-xs text-[var(--fingaurd-text-muted)]">
              Monthly Burn
            </p>
            <p className="mt-1 text-xl font-semibold text-[var(--fingaurd-text)]">
              Rs {Math.round(totals.monthly).toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[rgba(255,255,255,0.02)] p-3">
            <p className="text-xs text-[var(--fingaurd-text-muted)]">
              Annual Cost
            </p>
            <p className="mt-1 text-xl font-semibold text-[var(--fingaurd-text)]">
              Rs {Math.round(totals.annual).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-[var(--fingaurd-border)] bg-[var(--fingaurd-surface)] p-6 text-sm text-[var(--fingaurd-text-muted)]">
          Scanning recurring charges...
        </div>
      ) : (
        <Tabs defaultValue="detected">
          <TabsList className="bg-[rgba(255,255,255,0.06)] text-[var(--fingaurd-text-muted)]">
            <TabsTrigger value="detected">Detected</TabsTrigger>
            <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
          </TabsList>

          <TabsContent value="detected">
            <SubscriptionList
              subscriptions={detected}
              onConfirm={handleConfirm}
              onDismiss={handleDismiss}
            />
          </TabsContent>

          <TabsContent value="confirmed">
            <SubscriptionList
              subscriptions={confirmed}
              onConfirm={handleConfirm}
              onDismiss={handleDismiss}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
