import ChatPanel from '@/components/chat/ChatPanel'

export default function ChatPage() {
  return (
    <div className="flex flex-col h-screen bg-white" style={{ height: '100dvh' }}>
      {/* TopBar */}
      <div className="flex-none bg-gray-900 text-white px-4 py-3 flex items-center justify-between border-b border-gray-800">
        <h1 className="text-sm font-semibold tracking-wide">AI Assistant</h1>
        <span className="text-xs text-gray-400">SmartSpend AI</span>
      </div>

      {/* Chat fills remaining height */}
      <div className="flex-1 min-h-0">
        <ChatPanel />
      </div>
    </div>
  )
}
