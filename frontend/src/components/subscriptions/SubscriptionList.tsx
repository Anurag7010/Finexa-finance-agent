import type { SubscriptionItem } from "@/lib/api";
import SubscriptionCard from "./SubscriptionCard";

interface SubscriptionListProps {
  subscriptions: SubscriptionItem[];
  onConfirm: (id: string) => void;
  onDismiss: (id: string) => void;
}

export default function SubscriptionList({
  subscriptions,
  onConfirm,
  onDismiss,
}: SubscriptionListProps) {
  if (subscriptions.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--fingaurd-border)] bg-[var(--fingaurd-surface)] p-8 text-center text-sm text-[var(--fingaurd-text-muted)]">
        No recurring charges detected yet.
      </div>
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {subscriptions.map((item) => (
        <SubscriptionCard
          key={item._id}
          item={item}
          onConfirm={onConfirm}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
}
