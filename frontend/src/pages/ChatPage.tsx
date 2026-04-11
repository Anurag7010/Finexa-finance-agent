import ChatPanel from "@/components/chat/ChatPanel";

export default function ChatPage() {
  return (
    <div className="h-[calc(100vh-7.5rem)] min-h-[540px] animate-in fade-in duration-200">
      <div className="h-full min-h-0 rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        <ChatPanel />
      </div>
    </div>
  );
}
