import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import {
  Send,
  Trash2,
  Loader2,
  Sparkles,
  AlertCircle,
  Search,
  Scissors,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { sendChatMessage, getChatHistory, clearChatHistory } from "@/lib/api";
import ChatMessage from "./ChatMessage";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";

const SUGGESTED_PROMPTS = [
  "Why am I spending so much this month?",
  "What if I cut my grocery budget by 30%?",
  "Show me my most suspicious transactions",
];

const SUGGESTED_PROMPT_ICONS = [Wallet, Scissors, Search] as const;

interface LocalMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  isTyping?: boolean;
  isError?: boolean;
  pendingMessage?: string;
}

function TypingIndicator() {
  return (
    <div className="mb-3 flex items-start gap-2.5">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[rgba(13,158,138,0.35)] bg-[rgba(13,158,138,0.2)]">
        <span className="text-[10px] font-bold text-(--fingaurd-text)">FG</span>
      </div>
      <div className="rounded-[18px] rounded-tl-sm border border-white/10 bg-[rgba(255,255,255,0.04)] px-4 py-3">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((dot) => (
            <motion.span
              key={dot}
              className="h-1.5 w-1.5 rounded-full bg-(--fingaurd-brand)"
              animate={{ opacity: [0.35, 1, 0.35], y: [0, -1.5, 0] }}
              transition={{ duration: 1, repeat: Infinity, delay: dot * 0.12 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ChatPanel() {
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadHistory = useCallback(async () => {
    setHistoryLoaded(false);
    setHistoryError("");
    try {
      const history = await getChatHistory();
      if (history && history.length > 0) {
        setMessages(
          history.map(
            (m: {
              role: "user" | "assistant";
              content: string;
              timestamp?: string;
              _id?: string;
            }) => ({
              id: m._id || String(Date.now() + Math.random()),
              role: m.role,
              content: m.content,
              timestamp: m.timestamp || new Date().toISOString(),
            }),
          ),
        );
      }
    } catch {
      setHistoryError("Failed to load chat history. Please try again.");
    } finally {
      setHistoryLoaded(true);
    }
  }, []);

  // Load history on mount
  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: LocalMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };

    const typingId = `typing-${Date.now()}`;
    const typingMsg: LocalMessage = {
      id: typingId,
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
      isTyping: true,
      pendingMessage: text.trim(),
    };

    // Optimistic: add user message + typing indicator immediately
    setMessages((prev) => [...prev, userMsg, typingMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const result = await sendChatMessage(text.trim());

      const assistantMsg: LocalMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: result.reply,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) =>
        prev.filter((m) => m.id !== typingId).concat(assistantMsg),
      );
    } catch {
      toast.error("Could not reach Fin Guardian. Please try again.");
      const errorMsg: LocalMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "Sorry, I couldn't connect. Please try again.",
        timestamp: new Date().toISOString(),
        isError: true,
        pendingMessage: text.trim(),
      };
      setMessages((prev) =>
        prev.filter((m) => m.id !== typingId).concat(errorMsg),
      );
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleRetry = (pendingMessage: string) => {
    setMessages((prev) => prev.filter((m) => !m.isError));
    sendMessage(pendingMessage);
  };

  const handleClear = async () => {
    setMessages([]);
    try {
      await clearChatHistory();
    } catch {
      /* ignore */
    }
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const isEmpty = historyLoaded && messages.length === 0;

  if (!historyLoaded) {
    return (
      <div className="flex h-full flex-col bg-(--fingaurd-surface) p-4">
        <div className="space-y-3">
          <div className="flex justify-start">
            <Skeleton className="h-12 w-2/3 rounded-2xl rounded-tl-sm" />
          </div>
          <div className="flex justify-end">
            <Skeleton className="h-12 w-1/2 rounded-2xl rounded-br-sm" />
          </div>
          <div className="flex justify-start">
            <Skeleton className="h-12 w-3/5 rounded-2xl rounded-tl-sm" />
          </div>
        </div>
      </div>
    );
  }

  if (historyError) {
    return (
      <div className="flex h-full items-center justify-center bg-(--fingaurd-surface) p-6">
        <div className="w-full max-w-md rounded-xl border border-[rgba(227,107,99,0.45)] bg-[rgba(227,107,99,0.12)] p-6 text-center">
          <AlertCircle className="mx-auto mb-3 h-6 w-6 text-(--fingaurd-coral)" />
          <p className="font-medium text-[#ffbeb8]">
            Failed to load chat history. Please try again.
          </p>
          <Button
            variant="outline"
            className="mt-4 border-white/15 bg-[rgba(255,255,255,0.04)] text-(--fingaurd-text) hover:bg-[rgba(255,255,255,0.1)]"
            onClick={() => void loadHistory()}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[radial-gradient(circle_at_15%_0%,rgba(13,158,138,0.12),transparent_40%),radial-gradient(circle_at_88%_100%,rgba(19,44,52,0.35),transparent_48%),#0f1a1e]">
      {/* ── Header ── */}
      <div className="z-10 flex flex-none items-center justify-between border-b border-white/10 bg-[rgba(9,16,19,0.72)] px-4 py-3 backdrop-blur-lg">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(13,158,138,0.35)] bg-[rgba(13,158,138,0.2)] shadow-sm">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="leading-tight text-sm font-bold text-(--fingaurd-text)">
                Fin Guardian
              </h2>
              <motion.span
                className="h-2 w-2 rounded-full bg-(--fingaurd-brand)"
                animate={{ opacity: [0.5, 1, 0.5], scale: [0.9, 1.08, 0.9] }}
                transition={{ duration: 1.3, repeat: Infinity }}
              />
            </div>
            <Badge className="border border-white/15 bg-[rgba(255,255,255,0.03)] px-1.5 py-0 text-[10px] font-normal text-(--fingaurd-text-muted)">
              Powered by GPT-4o
            </Badge>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="flex h-8 items-center gap-1.5 px-2 text-xs text-(--fingaurd-text-muted) hover:bg-[rgba(255,255,255,0.07)] hover:text-(--fingaurd-coral)"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear conversation
        </Button>
      </div>

      {/* ── Message area ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {/* Suggested prompts — only when empty */}
        {isEmpty && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex h-full flex-col items-center justify-center space-y-6 py-8"
          >
            <div className="text-center space-y-2">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[rgba(13,158,138,0.35)] bg-[rgba(13,158,138,0.2)] shadow-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-base font-semibold text-(--fingaurd-text)">
                Ask me anything about your finances
              </h3>
              <p className="text-sm text-(--fingaurd-text-muted)">
                Try one of these to get started:
              </p>
            </div>
            <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-center gap-2.5">
              {SUGGESTED_PROMPTS.map((prompt, idx) => {
                const PromptIcon = SUGGESTED_PROMPT_ICONS[idx] ?? Sparkles;
                return (
                  <motion.button
                    key={prompt}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.08 }}
                    onClick={() => sendMessage(prompt)}
                    className={cn(
                      "rounded-full border border-white/15 bg-[rgba(255,255,255,0.03)] px-4 py-2 text-sm text-(--fingaurd-text)",
                      "hover:border-[rgba(13,158,138,0.42)] hover:bg-[rgba(13,158,138,0.15)] hover:text-white transition-all duration-150",
                    )}
                  >
                    <PromptIcon className="mr-2 inline-flex h-3.5 w-3.5 text-(--fingaurd-brand)" />
                    {prompt}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Messages */}
        {messages.map((msg) =>
          msg.isTyping ? (
            <TypingIndicator key={msg.id} />
          ) : (
            <ChatMessage
              key={msg.id}
              role={msg.role}
              content={msg.content}
              timestamp={msg.timestamp}
              isError={msg.isError}
              onRetry={
                msg.pendingMessage
                  ? () => handleRetry(msg.pendingMessage!)
                  : undefined
              }
            />
          ),
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Input bar ── */}
      <div className="flex-none border-t border-white/10 bg-[rgba(9,16,19,0.72)] px-4 py-3 backdrop-blur-lg">
        <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-[rgba(255,255,255,0.03)] px-3 py-1.5 transition-all focus-within:border-(--fingaurd-brand) focus-within:ring-2 focus-within:ring-[rgba(13,158,138,0.2)]">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Press Enter to send"
            disabled={isLoading}
            className="flex-1 bg-transparent py-2 text-sm text-(--fingaurd-text) placeholder:text-(--fingaurd-text-muted) outline-none disabled:opacity-50"
          />
          <Button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            size="sm"
            className="h-9 w-9 shrink-0 rounded-lg bg-(--fingaurd-brand) p-0 text-white hover:bg-(--fingaurd-brand-strong) disabled:opacity-40"
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-(--fingaurd-text-muted)">
          AI can make mistakes. Verify important financial decisions
          independently.
        </p>
      </div>

      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="pointer-events-none absolute bottom-16 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-[rgba(9,16,19,0.8)] px-3 py-1 text-xs text-(--fingaurd-text-muted)"
          >
            Fin Guardian is thinking...
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
