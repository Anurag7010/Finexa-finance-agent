import { useEffect, useRef, useState, KeyboardEvent } from 'react'
import { Send, Trash2, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useStore } from '@/useStore'
import { sendChatMessage, getChatHistory, clearChatHistory } from '@/api'
import ChatMessage from './ChatMessage'
import { cn } from '@/lib/utils'

// ─── Temporary mock — remove when backend is live ───
const mockReply = async (msg: string): Promise<{ reply: string }> => {
  await new Promise((r) => setTimeout(r, 1500))

  // Demo-quality mock responses with ₹ amounts
  if (msg.toLowerCase().includes('spending so much') || msg.toLowerCase().includes('spending this month')) {
    return {
      reply: `Great question! Here's your **spending breakdown** for April:\n\n- **Food & Dining**: ₹12,400 (↑34% vs last month)\n- **Shopping**: ₹6,580 (94% of ₹7,000 budget)\n- **Transport**: ₹3,200\n- **Utilities**: ₹2,800\n\nYour biggest overspend is **Dining** — you're ₹3,200 over budget. Consider cooking at home 3 more days a week to save ~₹1,500.`,
    }
  }
  if (msg.toLowerCase().includes('cut') && msg.toLowerCase().includes('dining')) {
    return {
      reply: `**Scenario: Cut Dining budget by 30%**\n\nCurrent dining spend: ₹12,400/month\nNew projectedspend: ₹8,680/month\n**Monthly saving: ₹3,720**\n**Annual saving: ₹44,640**\n\nYour projected end-of-month balance would improve from ₹8,200 → **₹11,920**.\nEstimated health score improvement: **+8 points** (52 → 60).`,
    }
  }
  if (msg.toLowerCase().includes('suspicious') || msg.toLowerCase().includes('anomaly')) {
    return {
      reply: `🚨 **Most suspicious transactions this month:**\n\n1. ₹11,400 · UNKNOWN MERCHANT 4821 · 2am on Apr 9 — **High risk**\n2. ₹4,200 · INTL TXN PROC SRVCS · Apr 7 — unfamiliar merchant\n3. ₹2,150 · ATM WITHDRAWAL · 11:47pm · Apr 5\n\nTransaction 1 is the most concerning. I recommend checking with your bank and enabling 2FA on your account.`,
    }
  }
  return {
    reply: `Mock response to: "${msg}". Real AI connecting soon. Backend is not yet live.`,
  }
}

const SUGGESTED_PROMPTS = [
  'Why am I spending so much this month?',
  'What would happen if I cut my dining budget by 30%?',
  'Show me my most suspicious transactions',
]

interface LocalMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  isTyping?: boolean
  isError?: boolean
  pendingMessage?: string
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-2.5 mb-3">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-teal-500 flex items-center justify-center shadow-sm mt-0.5">
        <span className="text-white text-xs font-bold">S</span>
      </div>
      <div className="bg-slate-100 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm">
        <div className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full bg-teal-500 animate-bounce"
            style={{ animationDelay: '0ms' }}
          />
          <span
            className="w-2 h-2 rounded-full bg-teal-500 animate-bounce"
            style={{ animationDelay: '150ms' }}
          />
          <span
            className="w-2 h-2 rounded-full bg-teal-500 animate-bounce"
            style={{ animationDelay: '300ms' }}
          />
        </div>
      </div>
    </div>
  )
}

export default function ChatPanel() {
  const { chatMessages, setChatMessages, clearChat } = useStore()
  const [messages, setMessages] = useState<LocalMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load history on mount
  useEffect(() => {
    const load = async () => {
      try {
        const history = await getChatHistory()
        if (history && history.length > 0) {
          setMessages(
            history.map((m: { role: string; content: string; timestamp?: string; _id?: string }) => ({
              id: m._id || String(Date.now() + Math.random()),
              role: m.role,
              content: m.content,
              timestamp: m.timestamp || new Date().toISOString(),
            }))
          )
        }
      } catch {
        // Backend not live — start with empty history
      } finally {
        setHistoryLoaded(true)
      }
    }
    load()
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMsg: LocalMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    }

    const typingId = `typing-${Date.now()}`
    const typingMsg: LocalMessage = {
      id: typingId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isTyping: true,
      pendingMessage: text.trim(),
    }

    // Optimistic: add user message + typing indicator immediately
    setMessages((prev) => [...prev, userMsg, typingMsg])
    setInput('')
    setIsLoading(true)

    try {
      let result: { reply: string }
      try {
        result = await sendChatMessage(text.trim())
      } catch {
        // Backend not live — use mock
        result = await mockReply(text.trim())
      }

      const assistantMsg: LocalMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: result.reply,
        timestamp: new Date().toISOString(),
      }

      setMessages((prev) => prev.filter((m) => m.id !== typingId).concat(assistantMsg))
    } catch {
      const errorMsg: LocalMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "Sorry, I couldn't connect. Please try again.",
        timestamp: new Date().toISOString(),
        isError: true,
        pendingMessage: text.trim(),
      }
      setMessages((prev) => prev.filter((m) => m.id !== typingId).concat(errorMsg))
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleRetry = (pendingMessage: string) => {
    setMessages((prev) => prev.filter((m) => !m.isError))
    sendMessage(pendingMessage)
  }

  const handleClear = async () => {
    setMessages([])
    clearChat()
    try {
      await clearChatHistory()
    } catch {/* ignore */}
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const isEmpty = historyLoaded && messages.length === 0

  return (
    <div className="flex flex-col h-full bg-white">
      {/* ── Header ── */}
      <div className="flex-none flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white shadow-sm z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-sm">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900 leading-tight">SmartSpend AI</h2>
            <Badge className="text-[10px] px-1.5 py-0 bg-teal-50 text-teal-700 border border-teal-200 font-normal">
              Powered by GPT-4o
            </Badge>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1.5 h-8 px-2"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear
        </Button>
      </div>

      {/* ── Message area ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {/* Suggested prompts — only when empty */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full space-y-6 py-8">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center mx-auto shadow-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-base font-semibold text-gray-800">Ask me anything about your finances</h3>
              <p className="text-sm text-gray-400">Try one of these to get started:</p>
            </div>
            <div className="flex flex-col gap-2.5 w-full max-w-sm">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className={cn(
                    'w-full text-left px-4 py-3 rounded-xl border-2 border-dashed border-teal-200',
                    'bg-teal-50 text-teal-800 text-sm font-medium',
                    'hover:bg-teal-100 hover:border-teal-400 hover:shadow-sm',
                    'transition-all duration-150 cursor-pointer'
                  )}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
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
              onRetry={msg.pendingMessage ? () => handleRetry(msg.pendingMessage!) : undefined}
            />
          )
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Input bar ── */}
      <div className="flex-none border-t border-gray-100 px-4 py-3 bg-white">
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl border border-gray-200 px-3 py-1.5 focus-within:border-teal-400 focus-within:ring-2 focus-within:ring-teal-100 transition-all">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your finances..."
            disabled={isLoading}
            className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none py-1 disabled:opacity-50"
          />
          <Button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            size="sm"
            className="h-8 w-8 p-0 rounded-lg bg-teal-500 hover:bg-teal-600 text-white flex-shrink-0 disabled:opacity-40"
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>
        <p className="text-center text-[10px] text-gray-300 mt-1.5">
          AI can make mistakes. Verify important financial decisions independently.
        </p>
      </div>
    </div>
  )
}
