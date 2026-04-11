import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { Bell, MessageSquare, LayoutDashboard, CreditCard } from 'lucide-react'
import AlertsPage from './pages/AlertsPage'
import ChatPage from './pages/ChatPage'
import { useStore } from './useStore'

// ─── Sidebar nav ────────────────────────────────────────────────
const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transactions', icon: CreditCard, label: 'Transactions' },
  { to: '/alerts', icon: Bell, label: 'Alerts' },
  { to: '/chat', icon: MessageSquare, label: 'AI Assistant' },
]

function Sidebar() {
  const alerts = useStore((s) => s.alerts)
  const unread = alerts.filter((a) => !a.read).length

  return (
    <nav className="flex flex-col w-56 min-h-screen bg-gray-900 text-white px-3 py-6 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-2 mb-8">
        <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center font-bold text-sm text-white">
          SS
        </div>
        <span className="font-bold text-sm tracking-wide">SmartSpend AI</span>
      </div>

      {/* Links */}
      <div className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-teal-500 text-white shadow-sm'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="flex-1">{label}</span>
            {to === '/alerts' && unread > 0 && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold">
                {unread}
              </span>
            )}
          </NavLink>
        ))}
      </div>

      <div className="mt-auto px-2">
        <p className="text-[10px] text-gray-600">© 2025 SmartSpend AI</p>
      </div>
    </nav>
  )
}

// ─── Placeholder pages for B1 routes ────────────────────────────
function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center space-y-2">
        <h2 className="text-lg font-bold text-gray-700">{title}</h2>
        <p className="text-sm text-gray-400">This page is being built by B1.</p>
      </div>
    </div>
  )
}

// Chat page — full screen (no sidebar)
function ChatRoute() {
  return <ChatPage />
}

// Layout with sidebar
function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Sidebar layout pages */}
        <Route
          path="/dashboard"
          element={
            <AppLayout>
              <PlaceholderPage title="Dashboard" />
            </AppLayout>
          }
        />
        <Route
          path="/transactions"
          element={
            <AppLayout>
              <PlaceholderPage title="Transactions" />
            </AppLayout>
          }
        />
        <Route
          path="/alerts"
          element={
            <AppLayout>
              <AlertsPage />
            </AppLayout>
          }
        />

        {/* Chat — full screen, no sidebar */}
        <Route path="/chat" element={<ChatRoute />} />
      </Routes>
    </BrowserRouter>
  )
}
