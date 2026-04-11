import { cn } from "@/lib/utils";

export interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  isError?: boolean;
  onRetry?: () => void;
}

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const currencyRegex = /(₹\s?\d[\d,]*(?:\.\d+)?)/g;
  const chunks = text.split(currencyRegex);
  return chunks.map((chunk, idx) => {
    if (/^₹\s?\d[\d,]*(?:\.\d+)?$/.test(chunk)) {
      return (
        <span
          key={`${keyPrefix}-${idx}`}
          className="font-semibold text-[var(--fingaurd-brand)]"
        >
          {chunk}
        </span>
      );
    }
    return <span key={`${keyPrefix}-${idx}`}>{chunk}</span>;
  });
}

function formatAssistantContent(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong
          key={`b-${i}`}
          className="font-semibold text-[var(--fingaurd-text)]"
        >
          {part.slice(2, -2)}
        </strong>
      );
    }

    const lines = part.split("\n");
    return (
      <span key={`t-${i}`}>
        {lines.map((line, j) => (
          <span key={`line-${i}-${j}`}>
            {renderInline(line, `money-${i}-${j}`)}
            {j < lines.length - 1 && <br />}
          </span>
        ))}
      </span>
    );
  });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export default function ChatMessage({
  role,
  content,
  timestamp,
  isError,
  onRetry,
}: ChatMessageProps) {
  const isUser = role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end mb-3 group">
        <div className="max-w-[75%] flex flex-col items-end gap-1">
          <div className="rounded-[18px] rounded-br-sm bg-[var(--fingaurd-brand)] px-4 py-2.5 text-sm leading-relaxed text-white shadow-[0_12px_28px_rgba(13,158,138,0.2)] break-words">
            {content}
          </div>
          <span className="px-1 text-[11px] text-[var(--fingaurd-text-muted)]">
            {formatTime(timestamp)}
          </span>
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="flex items-start gap-2.5 mb-3 group">
      {/* Avatar */}
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[rgba(13,158,138,0.35)] bg-[rgba(13,158,138,0.2)] shadow-sm">
        <span className="text-[10px] font-bold leading-none text-[var(--fingaurd-text)]">
          FG
        </span>
      </div>

      <div className="max-w-[75%] flex flex-col gap-1">
        <div
          className={cn(
            "rounded-[18px] rounded-tl-sm px-4 py-2.5 text-sm leading-relaxed shadow-sm break-words border",
            isError
              ? "border-[rgba(227,107,99,0.45)] bg-[rgba(227,107,99,0.14)] text-[#ffbeb8]"
              : "border-white/10 bg-[rgba(255,255,255,0.04)] text-[var(--fingaurd-text)]",
          )}
        >
          {formatAssistantContent(content)}
          {isError && onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 block text-xs font-semibold text-[var(--fingaurd-coral)] underline underline-offset-2 hover:opacity-90"
            >
              Retry
            </button>
          )}
        </div>
        <span className="px-1 text-[11px] text-[var(--fingaurd-text-muted)]">
          {formatTime(timestamp)}
        </span>
      </div>
    </div>
  );
}
