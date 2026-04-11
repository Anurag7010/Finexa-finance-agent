import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, refreshInsights } from "../lib/api";
import { useStore } from "../store/useStore";
import { Button } from "../components/ui/button";
import { TrendingUp, Mail, Lock, Zap, AlertCircle } from "lucide-react";

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
      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      const msg =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (err as any)?.response?.data?.message ?? "Login failed. Please try again.";
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
      navigate("/dashboard", { replace: true });
    } catch {
      setError("Demo login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 px-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/3 w-[300px] h-[300px] rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg mb-4">
              <TrendingUp size={28} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">SmartSpend AI</h1>
            <p className="text-slate-400 text-sm mt-1">
              Your personal finance co-pilot
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 mb-5 text-red-400 text-sm">
              <AlertCircle size={15} className="shrink-0" />
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  id="email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="demo@smartspend.ai"
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  id="password-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>
            </div>

            {/* Login button */}
            <Button
              id="login-btn"
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-2.5 rounded-lg mt-2 transition-all duration-200 shadow-lg disabled:opacity-60"
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
                "Sign in"
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-slate-500 text-xs">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Demo Login */}
          <Button
            id="demo-login-btn"
            type="button"
            variant="outline"
            onClick={handleDemoLogin}
            disabled={loading}
            className="w-full border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white gap-2"
          >
            <Zap size={14} className="text-amber-400" />
            Demo Login
          </Button>

          <p className="text-center text-slate-600 text-xs mt-4">
            demo@smartspend.ai · demo1234
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-600 text-xs mt-6">
          SmartSpend AI · Hackathon Demo · 2025
        </p>
      </div>
    </div>
  );
}
