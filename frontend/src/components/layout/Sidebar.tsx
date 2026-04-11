import { NavLink, useNavigate } from "react-router-dom";
import { useStore } from "../../store/useStore";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Bell,
  MessageSquare,
  LogOut,
  TrendingUp,
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/transactions", icon: ArrowLeftRight, label: "Transactions" },
  { to: "/alerts", icon: Bell, label: "Alerts" },
  { to: "/chat", icon: MessageSquare, label: "AI Chat" },
];

export default function Sidebar() {
  const { user, unreadCount, logout } = useStore();
  const navigate = useNavigate();

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "?";

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <aside
      className="w-64 flex-shrink-0 flex flex-col h-full"
      style={{ background: "var(--sidebar)" }}
    >
      {/* Logo */}
      <div className="px-6 py-5 border-b border-[oklch(0.25_0.02_264)]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <TrendingUp size={16} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">
              SmartSpend
            </p>
            <p className="text-[oklch(0.6_0.12_264)] text-[10px] font-medium mt-0.5 leading-none">
              AI Finance
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group relative ${
                isActive
                  ? "bg-[oklch(0.6_0.18_264)] text-white shadow-md"
                  : "text-[oklch(0.7_0_0)] hover:bg-[oklch(0.22_0.025_264)] hover:text-white"
              }`
            }
          >
            <Icon size={17} className="shrink-0" />
            <span>{label}</span>
            {label === "Alerts" && unreadCount > 0 && (
              <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="px-3 py-4 border-t border-[oklch(0.25_0.02_264)]">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">
              {user?.name ?? "Loading…"}
            </p>
            <p className="text-[oklch(0.55_0_0)] text-[11px] truncate">
              {user?.email ?? ""}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[oklch(0.6_0_0)] hover:bg-[oklch(0.22_0.025_264)] hover:text-red-400 transition-all duration-150"
        >
          <LogOut size={15} />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}
