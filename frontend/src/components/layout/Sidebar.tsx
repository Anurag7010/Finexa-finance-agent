import { NavLink } from "react-router-dom";
import { useStore } from "../../store/useStore";
import {
  LayoutDashboard,
  Receipt,
  Bell,
  MessageSquare,
  LogOut,
  Circle,
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/transactions", icon: Receipt, label: "Transactions" },
  { to: "/alerts", icon: Bell, label: "Alerts" },
  { to: "/chat", icon: MessageSquare, label: "Chat" },
];

export default function Sidebar() {
  const { user, unreadCount, logout } = useStore();

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "?";

  function handleLogout() {
    logout();
  }

  return (
    <aside
      className="w-64 flex-shrink-0 flex flex-col h-full bg-slate-900"
      style={{ background: "var(--sidebar)" }}
    >
      {/* Logo */}
      <div className="px-6 py-5 border-b border-[oklch(0.25_0.02_264)]">
        <div className="flex items-center gap-2">
          <Circle size={8} className="fill-teal-400 text-teal-400" />
          <p className="text-white font-bold text-sm leading-none">
            SmartSpend AI
          </p>
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
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
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
          <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">
              {user?.name ?? "Rohan Sharma"}
            </p>
            <p className="text-[oklch(0.55_0_0)] text-[11px] truncate">
              {user?.email ?? "demo@smartspend.ai"}
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
