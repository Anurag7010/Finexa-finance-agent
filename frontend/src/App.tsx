import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useEffect, useState, lazy, Suspense } from "react";
import { Toaster, toast } from "sonner";
import { useStore } from "./store/useStore";
import { getAlerts, getMe, USE_MOCK } from "./lib/api";
import { getSocket, registerSocket } from "./lib/socket";

const LoginPage = lazy(() => import("./pages/LoginPage"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const TransactionsPage = lazy(() => import("./pages/TransactionsPage"));
const AlertsPage = lazy(() => import("./pages/AlertsPage"));
const ChatPage = lazy(() => import("./pages/ChatPage"));
const GoalsPage = lazy(() => import("./pages/GoalsPage"));
const SubscriptionsPage = lazy(() => import("./pages/SubscriptionsPage"));
const DataSourcesPage = lazy(() => import("./pages/DataSourcesPage"));

import Sidebar from "./components/layout/Sidebar";
import TopBar from "./components/layout/TopBar";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-7">{children}</main>
      </div>
    </div>
  );
}

export default function App() {
  const { token, setAlerts, setUnreadCount } = useStore();

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
      .catch(() => {
        // Keep app usable even if initial alert preload fails.
      });
  }, [token, setAlerts, setUnreadCount]);

  useEffect(() => {
    if (USE_MOCK) return;
    const socket = getSocket();

    socket.on("new_alert", (alert) => {
      const { alerts, setAlerts, setUnreadCount, unreadCount } =
        useStore.getState();
      setAlerts([alert, ...alerts]);
      setUnreadCount(unreadCount + 1);
      toast(alert.title, {
        description: (alert.message ?? "").slice(0, 80),
      });
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
    <>
      <BrowserRouter>
        <Suspense fallback={<div className="flex h-screen items-center justify-center text-[var(--fingaurd-text-muted)]">Loading workspace...</div>}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route
              path="/"
              element={
                token ? (
                  <Navigate to="/home" replace />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            <Route
              path="/home"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <LandingPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />

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
            <Route
              path="/goals"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <GoalsPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/subscriptions"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <SubscriptionsPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounts"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <DataSourcesPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      <Toaster position="top-right" duration={4000} richColors />
    </>
  );
}
