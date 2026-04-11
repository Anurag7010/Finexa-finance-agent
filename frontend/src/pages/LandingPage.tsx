import { Link } from "react-router-dom";
import {
  ArrowRight,
  ShieldCheck,
  LayoutDashboard,
  MessageSquareMore,
  Sparkles,
} from "lucide-react";
import CinematicVideoBackground from "@/components/ui/CinematicVideoBackground";

const ACTIONS = [
  {
    to: "/dashboard",
    title: "Dashboard",
    subtitle: "Track budget health, risk signals, and spending trends.",
    icon: LayoutDashboard,
  },
  {
    to: "/chat",
    title: "Fin Guardian Chat",
    subtitle: "Ask Fin Guardian for smart guidance and safety insights.",
    icon: MessageSquareMore,
  },
];

export default function LandingPage() {
  return (
    <section className="page-enter relative min-h-full overflow-hidden">
      <CinematicVideoBackground className="inset-0" />
      <div className="relative overflow-hidden rounded-3xl border border-[var(--fingaurd-border)] bg-[linear-gradient(170deg,rgba(15,31,36,0.4)_0%,rgba(11,22,26,0.36)_50%,rgba(8,17,20,0.44)_100%)] p-8 shadow-[0_24px_64px_rgba(0,0,0,0.32)] backdrop-blur-[1px] lg:p-10">
        <div className="pointer-events-none absolute -left-16 -top-20 h-72 w-72 rounded-full bg-[rgba(13,158,138,0.12)] blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-1/4 h-72 w-72 rounded-full bg-[rgba(22,47,56,0.24)] blur-3xl" />

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--fingaurd-text-muted)]">
            <ShieldCheck className="h-3.5 w-3.5 text-[var(--fingaurd-brand)]" />
            Finexa Financial Safety Hub
          </div>

          <div className="space-y-3">
            <h1 className="type-display-hero text-[var(--fingaurd-text)]">
              <span className="block">Money clarity for</span>
              <span className="block text-[rgba(232,245,244,0.93)]">
                every decision.
              </span>
            </h1>
            <p className="type-body-lead max-w-2xl">
              Finexa helps you spot risk early, understand overspending signals,
              and take focused action before month-end surprises happen.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 pt-3 md:grid-cols-2">
            {ACTIONS.map(({ to, title, subtitle, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="group rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.03)] p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgba(13,158,138,0.55)] hover:bg-[rgba(13,158,138,0.12)] hover:shadow-[0_16px_32px_rgba(13,158,138,0.15)]"
              >
                <div className="mb-6 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-[rgba(9,26,31,0.8)] text-[var(--fingaurd-brand)]">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-xl font-semibold text-[var(--fingaurd-text)]">
                  {title}
                </p>
                <p className="mt-2 text-sm text-[var(--fingaurd-text-muted)]">
                  {subtitle}
                </p>
                <div className="mt-6 flex items-center gap-2 text-sm font-medium text-[var(--fingaurd-brand)]">
                  Open
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2 border-t border-white/10 pt-5 text-xs text-[var(--fingaurd-text-muted)]">
            <Sparkles className="h-3.5 w-3.5 text-[var(--fingaurd-amber)]" />
            Your financial co-pilot is live and monitoring in real time.
          </div>
        </div>
      </div>
    </section>
  );
}
