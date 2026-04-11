import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { useStore } from "./store/useStore";
import { getMe, getAlerts } from "./lib/api";
import { getSocket, registerSocket } from "./lib/socket";
import { USE_MOCK } from "./lib/api";

// Pages
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import TransactionsPage from "./pages/TransactionsPage";
import AlertsPage from "./pages/AlertsPage";
import ChatPage from "./pages/ChatPage";

// Layout
import Sidebar from "./components/layout/Sidebar";
import TopBar from "./components/layout/TopBar";

// ─── Protected Route ───────────────────────────────────────────────────────────
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// ─── App Shell with Sidebar + TopBar ──────────────────────────────────────────
function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const { token, setUser, setAlerts, setUnreadCount } = useStore();

  // Restore session on load
  useEffect(() => {
    if (!token) return;

    getMe()
      .then((user) => {
        useStore.getState().setUser(user);
        if (!USE_MOCK) registerSocket(user.id);
      })
      .catch(() => {
        useStore.getState().logout();
      });

    getAlerts()
      .then(({ alerts, unreadCount }) => {
        setAlerts(alerts);
        setUnreadCount(unreadCount);
      })
      .catch(() => {});
  }, [token]);

  // Socket listeners for real-time alerts
  useEffect(() => {
    if (USE_MOCK) return;
    const socket = getSocket();

    socket.on("new_alert", (alert) => {
      const { alerts, setAlerts, setUnreadCount, unreadCount } =
        useStore.getState();
      setAlerts([alert, ...alerts]);
      setUnreadCount(unreadCount + 1);
    });

    socket.on("insight_update", (insight) => {
      useStore.getState().setInsight(insight);
    });

    return () => {
      socket.off("new_alert");
      socket.off("insight_update");
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Root redirect */}
        <Route
          path="/"
          element={
            token ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <AppShell>
                <DashboardPage />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/transactions"
          element={
            <ProtectedRoute>
              <AppShell>
                <TransactionsPage />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/alerts"
          element={
            <ProtectedRoute>
              <AppShell>
                <AlertsPage />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <AppShell>
                <ChatPage />
              </AppShell>
            </ProtectedRoute>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
