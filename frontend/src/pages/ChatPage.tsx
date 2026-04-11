import ChatPanel from "@/components/chat/ChatPanel";

export default function ChatPage() {
  return (
    <div className="h-[calc(100vh-8.5rem)] min-h-[560px] animate-in fade-in duration-200">
      <div className="h-full min-h-0 overflow-hidden rounded-2xl border border-[var(--fingaurd-border)] bg-[var(--fingaurd-surface)] shadow-[0_20px_45px_rgba(0,0,0,0.28)]">
        <ChatPanel />
      </div>
    </div>
  );
}
