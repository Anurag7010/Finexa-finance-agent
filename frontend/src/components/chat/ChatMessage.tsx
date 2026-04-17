import React from "react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  isError?: boolean;
  onRetry?: () => void;
}

const IMPORTANT_TOKEN_REGEX =
  /(₹\s?\d[\d,]*(?:\.\d+)?|\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b|\b\d+(?:\.\d+)?%|\b\d{1,3}\/100\b|\b(?:high|medium|low)\s+risk\b)/gi;

function renderHighlightedText(
  text: string,
  keyPrefix: string,
): React.ReactNode[] {
  const parts = text.split(IMPORTANT_TOKEN_REGEX);

  return parts.map((part, idx) => {
    if (!part) {
      return null;
    }

    if (/^₹\s?\d[\d,]*(?:\.\d+)?$/i.test(part)) {
      return (
        <span
          key={`${keyPrefix}-money-${idx}`}
          className="font-semibold text-(--fingaurd-brand)"
        >
          {part}
        </span>
      );
    }

    if (/^\d+(?:\.\d+)?%$/i.test(part)) {
      return (
        <span
          key={`${keyPrefix}-pct-${idx}`}
          className="font-semibold text-[rgba(125,183,207,0.98)]"
        >
          {part}
        </span>
      );
    }

    if (/^\d{1,3}\/100$/i.test(part)) {
      return (
        <span
          key={`${keyPrefix}-score-${idx}`}
          className="font-semibold text-[rgba(240,245,248,0.98)]"
        >
          {part}
        </span>
      );
    }

    if (/^(high|medium|low)\s+risk$/i.test(part)) {
      const severity = part.toLowerCase();
      const severityClass = severity.startsWith("high")
        ? "text-(--fingaurd-coral)"
        : severity.startsWith("medium")
          ? "text-[rgba(207,164,74,0.98)]"
          : "text-(--fingaurd-success)";

      return (
        <span
          key={`${keyPrefix}-risk-${idx}`}
          className={cn("font-semibold", severityClass)}
        >
          {part}
        </span>
      );
    }

    if (/^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/i.test(part)) {
      return (
        <span
          key={`${keyPrefix}-num-${idx}`}
          className="font-semibold text-[rgba(232,239,243,0.98)]"
        >
          {part}
        </span>
      );
    }

    return (
      <React.Fragment key={`${keyPrefix}-text-${idx}`}>{part}</React.Fragment>
    );
  });
}

function highlightChildren(
  children: React.ReactNode,
  keyPrefix = "node",
): React.ReactNode {
  return React.Children.map(children, (child, idx) => {
    const key = `${keyPrefix}-${idx}`;

    if (typeof child === "string") {
      return renderHighlightedText(child, key);
    }

    if (typeof child === "number") {
      return renderHighlightedText(String(child), key);
    }

    if (React.isValidElement(child)) {
      const element = child as React.ReactElement<{
        children?: React.ReactNode;
      }>;
      if (element.props?.children == null) {
        return child;
      }

      return React.cloneElement(element, {
        ...element.props,
        children: highlightChildren(element.props.children, key),
      });
    }

    return child;
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
  const markdownComponents = {
    h1: ({ children }: any) => (
      <h1 className="mb-3 mt-1 border-b border-white/12 pb-1 text-xl font-extrabold tracking-tight text-white">
        {highlightChildren(children, "h1")}
      </h1>
    ),
    h2: ({ children }: any) => (
      <h2 className="mb-2 mt-3 text-lg font-bold tracking-tight text-[rgba(235,241,244,0.98)]">
        {highlightChildren(children, "h2")}
      </h2>
    ),
    h3: ({ children }: any) => (
      <h3 className="mb-1.5 mt-2 text-sm font-semibold uppercase tracking-[0.06em] text-[rgba(204,216,223,0.95)]">
        {highlightChildren(children, "h3")}
      </h3>
    ),
    p: ({ children }: any) => (
      <p className="mb-2 leading-relaxed text-(--fingaurd-text)">
        {highlightChildren(children, "p")}
      </p>
    ),
    ul: ({ children }: any) => (
      <ul className="mb-2 list-disc space-y-1 pl-5 marker:text-(--fingaurd-brand)">
        {highlightChildren(children, "ul")}
      </ul>
    ),
    ol: ({ children }: any) => (
      <ol className="mb-2 list-decimal space-y-1 pl-5 marker:font-semibold marker:text-(--fingaurd-brand)">
        {highlightChildren(children, "ol")}
      </ol>
    ),
    li: ({ children }: any) => (
      <li className="text-(--fingaurd-text)">
        {highlightChildren(children, "li")}
      </li>
    ),
    strong: ({ children }: any) => (
      <strong className="font-semibold text-(--fingaurd-text)">
        {highlightChildren(children, "strong")}
      </strong>
    ),
    em: ({ children }: any) => (
      <em className="italic text-[rgba(230,236,239,0.95)]">
        {highlightChildren(children, "em")}
      </em>
    ),
    blockquote: ({ children }: any) => (
      <blockquote className="mb-2 border-l-2 border-(--fingaurd-brand) bg-[rgba(13,158,138,0.08)] px-3 py-2 italic text-[rgba(230,236,239,0.92)]">
        {highlightChildren(children, "blockquote")}
      </blockquote>
    ),
    code: ({ inline, children }: any) =>
      inline ? (
        <code className="rounded bg-[rgba(255,255,255,0.08)] px-1 py-0.5 font-mono text-[12px] text-[rgba(237,242,245,0.95)]">
          {children}
        </code>
      ) : (
        <code className="block overflow-x-auto rounded-lg bg-[rgba(7,12,15,0.85)] p-3 font-mono text-[12px] text-[rgba(237,242,245,0.95)]">
          {children}
        </code>
      ),
    pre: ({ children }: any) => <>{children}</>,
    a: ({ href, children }: any) => (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="font-medium text-(--fingaurd-brand) underline decoration-[rgba(13,158,138,0.55)] underline-offset-2 hover:opacity-90"
      >
        {highlightChildren(children, "a")}
      </a>
    ),
    hr: () => <hr className="my-3 border-white/15" />,
  } as const;

  if (isUser) {
    return (
      <div className="flex justify-end mb-3 group">
        <div className="max-w-[75%] flex flex-col items-end gap-1">
          <div className="rounded-[18px] rounded-br-sm bg-(--fingaurd-brand) px-4 py-2.5 text-sm leading-relaxed text-white shadow-[0_12px_28px_rgba(13,158,138,0.2)] wrap-break-word">
            {content}
          </div>
          <span className="px-1 text-[11px] text-(--fingaurd-text-muted)">
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
        <span className="text-[10px] font-bold leading-none text-(--fingaurd-text)">
          FG
        </span>
      </div>

      <div className="max-w-[75%] flex flex-col gap-1">
        <div
          className={cn(
            "rounded-[18px] rounded-tl-sm border px-4 py-2.5 text-sm leading-relaxed shadow-sm wrap-break-word",
            isError
              ? "border-[rgba(227,107,99,0.45)] bg-[rgba(227,107,99,0.14)] text-[#ffbeb8]"
              : "border-white/10 bg-[rgba(255,255,255,0.04)] text-(--fingaurd-text)",
          )}
        >
          <div className="[&>*:last-child]:mb-0">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={markdownComponents}
            >
              {content}
            </ReactMarkdown>
          </div>
          {isError && onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 block text-xs font-semibold text-(--fingaurd-coral) underline underline-offset-2 hover:opacity-90"
            >
              Retry
            </button>
          )}
        </div>
        <span className="px-1 text-[11px] text-(--fingaurd-text-muted)">
          {formatTime(timestamp)}
        </span>
      </div>
    </div>
  );
}
