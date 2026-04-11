import { cn } from '@/lib/utils'

export interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  isError?: boolean
  onRetry?: () => void
}

function formatContent(text: string): React.ReactNode {
  // Split by **bold** markers
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    // Replace \n with <br/>
    const lines = part.split('\n')
    return lines.map((line, j) => (
      <span key={`${i}-${j}`}>
        {line}
        {j < lines.length - 1 && <br />}
      </span>
    ))
  })
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

export default function ChatMessage({ role, content, timestamp, isError, onRetry }: ChatMessageProps) {
  const isUser = role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end mb-3 group">
        <div className="max-w-[75%] flex flex-col items-end gap-1">
          <div className="bg-slate-800 text-white px-4 py-2.5 rounded-2xl rounded-br-sm shadow-sm text-sm leading-relaxed break-words">
            {content}
          </div>
          <span className="text-[11px] text-gray-400 px-1">{formatTime(timestamp)}</span>
        </div>
      </div>
    )
  }

  // Assistant message
  return (
    <div className="flex items-start gap-2.5 mb-3 group">
      {/* Avatar */}
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-teal-500 flex items-center justify-center shadow-sm mt-0.5">
        <span className="text-white text-xs font-bold leading-none">S</span>
      </div>

      <div className="max-w-[75%] flex flex-col gap-1">
        <div
          className={cn(
            'px-4 py-2.5 rounded-2xl rounded-tl-sm shadow-sm text-sm leading-relaxed break-words',
            isError
              ? 'bg-red-50 border border-red-200 text-red-700'
              : 'bg-slate-100 text-gray-800'
          )}
        >
          {formatContent(content)}
          {isError && onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 block text-xs font-semibold text-red-600 hover:text-red-800 underline underline-offset-2"
            >
              ↻ Retry
            </button>
          )}
        </div>
        <span className="text-[11px] text-gray-400 px-1">{formatTime(timestamp)}</span>
      </div>
    </div>
  )
}
