import { Link, NavLink } from "react-router-dom";
import { useStore } from "../../store/useStore";
import {
  Sparkles,
  LayoutDashboard,
  Receipt,
  Bell,
  MessageSquare,
  Target,
  Repeat2,
  Database,
  LogOut,
  Circle,
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/transactions", icon: Receipt, label: "Transactions" },
  { to: "/goals", icon: Target, label: "Goals" },
  { to: "/subscriptions", icon: Repeat2, label: "Subscriptions" },
  { to: "/accounts", icon: Database, label: "Accounts" },
  { to: "/alerts", icon: Bell, label: "Alerts" },
  { to: "/chat", icon: MessageSquare, label: "Fin Guardian" },
];

export default function Sidebar({ open, setOpen }: { open?: boolean; setOpen?: (val: boolean) => void }) {
  const { user, unreadCount, logout } = useStore();

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "?";

  const displayEmail =
    user?.email === "demo@smartspend.ai" ? "demo@finexa.ai" : user?.email;

  function handleLogout() {
    logout();
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setOpen?.(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-60 flex-shrink-0 flex flex-col h-full border-r transition-transform duration-300 md:static md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ background: "var(--sidebar)" }}
      >
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[var(--sidebar-border)]">
        <Link to="/home" className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-[rgba(13,158,138,0.2)] border border-[rgba(13,158,138,0.4)] flex items-center justify-center">
            <Circle
              size={8}
              className="fill-[var(--fingaurd-brand)] text-[var(--fingaurd-brand)]"
            />
          </div>
          <div>
            <p className="text-[13px] font-bold leading-none text-[var(--sidebar-foreground)]">
              Finexa
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-[var(--fingaurd-text-muted)]">
              Financial Safety
            </p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1.5">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                isActive
                  ? "bg-[var(--sidebar-accent)] text-[var(--sidebar-foreground)] shadow-[inset_2px_0_0_var(--fingaurd-brand)]"
                  : "text-[var(--fingaurd-text-muted)] hover:text-[var(--sidebar-foreground)] hover:bg-[rgba(255,255,255,0.05)]"
              }`
            }
            onClick={() => setOpen?.(false)}
          >
            <Icon size={17} className="shrink-0" />
            <span>{label}</span>
            {label === "Alerts" && unreadCount > 0 && (
              <span className="ml-auto bg-[var(--fingaurd-coral)] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="px-3 py-4 border-t border-[var(--sidebar-border)]">
        <div className="mb-1 flex items-center gap-3 rounded-xl border border-white/10 bg-[rgba(255,255,255,0.03)] px-3 py-2.5">
          <div className="w-8 h-8 rounded-full bg-[var(--fingaurd-brand)] flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[var(--sidebar-foreground)] text-sm font-medium truncate">
              {user?.name ?? "Rohan Sharma"}
            </p>
            <p className="text-[var(--fingaurd-text-muted)] text-[11px] truncate">
              {displayEmail ?? "demo@finexa.ai"}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-[var(--fingaurd-text-muted)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[var(--fingaurd-coral)] transition-all duration-150"
        >
          <LogOut size={15} />
          <span>Log out</span>
        </button>
        <div className="mt-3 flex items-center gap-1.5 px-2 text-[10px] text-[var(--fingaurd-text-muted)] uppercase tracking-[0.12em]">
          <Sparkles size={11} className="text-[var(--fingaurd-brand)]" />
          Fin Guardian Online
        </div>
      </div>
    </aside>
    </>
  );
}
