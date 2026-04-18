import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, refreshInsights } from "../lib/api";
import { useStore } from "../store/useStore";
import { Button } from "../components/ui/button";
import {
  ShieldCheck,
  Mail,
  Lock,
  AlertCircle,
  Activity,
  Radar,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import CinematicVideoBackground from "@/components/ui/CinematicVideoBackground";

export default function LoginPage() {
  const navigate = useNavigate();
  const { setUser, setToken, setInsight } = useStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e?: React.FormEvent) {
    e?.preventDefault();
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const { token, user } = await login(email, password);
      setToken(token);
      setUser(user);
      // Pre-load insights
      const data = await refreshInsights();
      setInsight(data.insight);
      navigate("/home", { replace: true });
      toast.success(`Welcome back, ${user.name}!`);
    } catch (err: unknown) {
      const msg =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (err as any)?.response?.data?.message ??
        "Login failed. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleDemoLogin() {
    setEmail("demo@smartspend.ai");
    setPassword("demo1234");
    // Give React a tick to set state then submit
    setTimeout(() => {
      handleSubmitWithValues("demo@smartspend.ai", "demo1234");
    }, 50);
  }

  async function handleSubmitWithValues(e: string, p: string) {
    setError("");
    setLoading(true);
    try {
      const { token, user } = await login(e, p);
      setToken(token);
      setUser(user);
      const data = await refreshInsights();
      setInsight(data.insight);
      navigate("/home", { replace: true });
      toast.success(`Welcome back, ${user.name}!`);
    } catch {
      setError("Demo login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--fingaurd-bg)] px-4 py-6 md:px-8 md:py-8">
      <CinematicVideoBackground className="inset-0" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-120px] top-[-160px] h-[420px] w-[420px] rounded-full bg-[rgba(13,158,138,0.16)] blur-3xl" />
        <div className="absolute bottom-[-220px] right-[-140px] h-[500px] w-[500px] rounded-full bg-[rgba(17,43,52,0.4)] blur-3xl" />
      </div>

      <div className="relative mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-6xl grid-cols-1 overflow-hidden rounded-3xl border border-[var(--fingaurd-border)] bg-[rgba(16,27,31,0.44)] shadow-[0_40px_90px_rgba(0,0,0,0.34)] backdrop-blur-[1px] lg:grid-cols-2">
        <section className="relative overflow-hidden border-b border-[var(--fingaurd-border)] p-8 lg:border-b-0 lg:border-r lg:p-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(13,158,138,0.12),transparent_45%),radial-gradient(circle_at_85%_78%,rgba(35,65,74,0.22),transparent_52%)]" />
          <div className="relative z-10 flex h-full flex-col justify-between gap-10">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.13em] text-[var(--fingaurd-text-muted)]">
                <ShieldCheck className="h-3.5 w-3.5 text-[var(--fingaurd-brand)]" />
                Finexa
              </div>
              <div>
                <h1 className="type-display text-[var(--fingaurd-text)]">
                  <span className="block">Finexa</span>
                  <span className="block text-[rgba(232,245,244,0.9)]">
                    Finance Assistant
                  </span>
                </h1>
                <p className="type-body-lead mt-3 max-w-sm">
                  Your financial co-pilot for safer finance outcomes.
                </p>
              </div>
            </div>

            <ul className="space-y-4 text-sm text-[var(--fingaurd-text-muted)]">
              <li className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-4 w-4 text-[var(--fingaurd-brand)]" />
                AI-powered spending analysis
              </li>
              <li className="flex items-start gap-3">
                <Radar className="mt-0.5 h-4 w-4 text-[var(--fingaurd-amber)]" />
                Real-time risk prediction
              </li>
              <li className="flex items-start gap-3">
                <Activity className="mt-0.5 h-4 w-4 text-[var(--fingaurd-coral)]" />
                Personalized financial insights
              </li>
            </ul>

            <div className="rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.04)] p-5">
              <div className="mb-4 flex items-center justify-between text-[11px] uppercase tracking-[0.1em] text-[var(--fingaurd-text-muted)]">
                <span>Monthly Safety Index</span>
                <span>Live</span>
              </div>
              <div className="space-y-3">
                <div className="h-2 rounded-full bg-white/10">
                  <div className="h-full w-[72%] rounded-full bg-[linear-gradient(90deg,#0d9e8a,#53b596)]" />
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-[var(--fingaurd-text-muted)]">
                  <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-center">
                    Risk Monitor
                  </span>
                  <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-center">
                    Alert Engine
                  </span>
                  <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-center">
                    Fin Guardian
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center bg-[rgba(12,20,24,0.56)] p-8 lg:p-12">
          <div className="w-full max-w-md">
            <div className="mb-7">
              <h2 className="type-title text-[var(--fingaurd-text)]">
                Welcome back
              </h2>
              <p className="mt-1 text-sm text-[var(--fingaurd-text-muted)]">
                Sign in to continue into your Finexa safety workspace.
              </p>
            </div>

            {error && (
              <div role="alert" className="mb-5 flex items-center gap-2 rounded-lg border border-[rgba(227,107,99,0.42)] bg-[rgba(227,107,99,0.12)] px-4 py-3 text-sm text-[#ffbcb6]">
                <AlertCircle size={15} className="shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--fingaurd-text-muted)]">
                  Email address
                </label>
                <div className="relative">
                  <Mail
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fingaurd-text-muted)]"
                  />
                  <input
                    id="email-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="demo@finexa.ai"
                    className="w-full rounded-lg border border-white/15 bg-[rgba(255,255,255,0.03)] py-2.5 pl-9 pr-4 text-sm text-[var(--fingaurd-text)] placeholder:text-[var(--fingaurd-text-muted)] focus:border-[var(--fingaurd-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--fingaurd-brand)] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--fingaurd-text-muted)]">
                  Password
                </label>
                <div className="relative">
                  <Lock
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fingaurd-text-muted)]"
                  />
                  <input
                    id="password-input"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-white/15 bg-[rgba(255,255,255,0.03)] py-2.5 pl-9 pr-4 text-sm text-[var(--fingaurd-text)] placeholder:text-[var(--fingaurd-text-muted)] focus:border-[var(--fingaurd-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--fingaurd-brand)] transition-colors"
                  />
                </div>
              </div>

              <Button
                id="login-btn"
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-lg bg-[var(--fingaurd-brand)] py-2.5 font-semibold text-white transition-all duration-200 hover:bg-[var(--fingaurd-brand-strong)] shadow-[0_10px_24px_rgba(13,158,138,0.28)] disabled:opacity-60"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="animate-spin h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8z"
                      />
                    </svg>
                    Signing in…
                  </span>
                ) : (
                  "Log in"
                )}
              </Button>
            </form>

            <div className="flex items-center gap-3 my-5">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-[var(--fingaurd-text-muted)]">
                or
              </span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <Button
              id="demo-login-btn"
              type="button"
              variant="outline"
              onClick={handleDemoLogin}
              disabled={loading}
              className="w-full gap-2 border-white/15 bg-[rgba(255,255,255,0.03)] text-[var(--fingaurd-text)] hover:bg-[rgba(255,255,255,0.08)]"
            >
              Demo Login
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
