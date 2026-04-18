import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";

interface GoalFormValues {
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string;
  category: "emergency" | "vacation" | "device" | "custom";
}

interface GoalFormProps {
  loading?: boolean;
  onSubmit: (values: GoalFormValues) => Promise<void>;
  onCancel: () => void;
}

const DEFAULT_VALUES: GoalFormValues = {
  name: "",
  target_amount: 0,
  current_amount: 0,
  deadline: "",
  category: "custom",
};

export default function GoalForm({
  loading = false,
  onSubmit,
  onCancel,
}: GoalFormProps) {
  const [values, setValues] = useState<GoalFormValues>(DEFAULT_VALUES);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!values.name.trim()) {
      setError("Goal name is required.");
      return;
    }

    if (!(values.target_amount > 0)) {
      setError("Target amount must be greater than 0.");
      return;
    }

    if (!values.deadline) {
      setError("Deadline is required.");
      return;
    }

    await onSubmit(values);
    setValues(DEFAULT_VALUES);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-[var(--fingaurd-border)] bg-[var(--fingaurd-surface)] p-4"
    >
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-[var(--fingaurd-text-muted)]">
            Goal Name
          </label>
          <input
            value={values.name}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="Emergency fund"
            className="w-full rounded-lg border border-white/15 bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[var(--fingaurd-text)] outline-none focus:border-[var(--fingaurd-brand)]"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-[var(--fingaurd-text-muted)]">
            Category
          </label>
          <select
            value={values.category}
            onChange={(e) =>
              setValues((prev) => ({
                ...prev,
                category: e.target.value as GoalFormValues["category"],
              }))
            }
            className="w-full rounded-lg border border-white/15 bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[var(--fingaurd-text)] outline-none focus:border-[var(--fingaurd-brand)]"
          >
            <option value="custom">Custom</option>
            <option value="emergency">Emergency</option>
            <option value="vacation">Vacation</option>
            <option value="device">Device</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs text-[var(--fingaurd-text-muted)]">
            Target Amount (Rs)
          </label>
          <input
            type="number"
            min={0}
            value={values.target_amount || ""}
            onChange={(e) =>
              setValues((prev) => ({
                ...prev,
                target_amount: Number(e.target.value || 0),
              }))
            }
            className="w-full rounded-lg border border-white/15 bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[var(--fingaurd-text)] outline-none focus:border-[var(--fingaurd-brand)]"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-[var(--fingaurd-text-muted)]">
            Current Amount (Rs)
          </label>
          <input
            type="number"
            min={0}
            value={values.current_amount || ""}
            onChange={(e) =>
              setValues((prev) => ({
                ...prev,
                current_amount: Number(e.target.value || 0),
              }))
            }
            className="w-full rounded-lg border border-white/15 bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[var(--fingaurd-text)] outline-none focus:border-[var(--fingaurd-brand)]"
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-xs text-[var(--fingaurd-text-muted)]">
            Deadline
          </label>
          <input
            type="date"
            value={values.deadline}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, deadline: e.target.value }))
            }
            className="w-full rounded-lg border border-white/15 bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[var(--fingaurd-text)] outline-none focus:border-[var(--fingaurd-brand)]"
          />
        </div>
      </div>

      {error && (
        <p className="mt-3 text-xs text-[var(--fingaurd-coral)]">{error}</p>
      )}

      <div className="mt-4 flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="bg-[var(--fingaurd-brand)] text-white hover:bg-[var(--fingaurd-brand-strong)]"
        >
          {loading ? "Creating..." : "Create Goal"}
        </Button>
      </div>
    </form>
  );
}
