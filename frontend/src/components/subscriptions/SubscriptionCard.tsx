import {
  CalendarClock,
  CircleCheckBig,
  CircleX,
  IndianRupee,
  Repeat2,
} from "lucide-react";
import type { SubscriptionItem } from "@/lib/api";
import { Button } from "@/components/ui/button";

interface SubscriptionCardProps {
  item: SubscriptionItem;
  onConfirm: (id: string) => void;
  onDismiss: (id: string) => void;
}

export default function SubscriptionCard({
  item,
  onConfirm,
  onDismiss,
}: SubscriptionCardProps) {
  return (
    <div className="rounded-2xl border border-[var(--fingaurd-border)] bg-[var(--fingaurd-surface)] p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-[var(--fingaurd-text)]">
            {item.merchant}
          </h3>
          <p className="mt-1 text-xs text-[var(--fingaurd-text-muted)]">
            {item.category}
          </p>
        </div>
        <span className="rounded-full bg-[rgba(125,183,207,0.2)] px-2 py-1 text-xs text-[#b8dff0]">
          {(item.confidence_score * 100).toFixed(0)}% confidence
        </span>
      </div>

      <div className="space-y-1 text-xs text-[var(--fingaurd-text-muted)]">
        <p className="inline-flex items-center gap-1">
          <IndianRupee className="h-3.5 w-3.5" />
          Rs {Math.round(item.amount).toLocaleString()} / {item.frequency}
        </p>
        <p className="inline-flex items-center gap-1">
          <Repeat2 className="h-3.5 w-3.5" />
          Annual cost: Rs {Math.round(item.annual_cost).toLocaleString()}
        </p>
        <p className="inline-flex items-center gap-1">
          <CalendarClock className="h-3.5 w-3.5" />
          Next charge: {new Date(item.next_predicted_date).toLocaleDateString()}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          className="border-[rgba(13,158,138,0.45)] text-[#84f2de] hover:bg-[rgba(13,158,138,0.14)]"
          onClick={() => onConfirm(item._id)}
        >
          <CircleCheckBig className="mr-1 h-3.5 w-3.5" />
          Confirm
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-[var(--fingaurd-coral)] hover:text-[var(--fingaurd-coral)]"
          onClick={() => onDismiss(item._id)}
        >
          <CircleX className="mr-1 h-3.5 w-3.5" />
          Dismiss
        </Button>
      </div>
    </div>
  );
}
