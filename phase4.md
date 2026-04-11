# SmartSpend AI — Phase 4 Kickoff Prompt

Read `SMARTSPEND_MASTER_PLAN.md` before starting. Integration is complete and verified.
One issue must be fixed before Phase 4 work begins. Fix it first, then proceed.

---

## Status coming in

Everything is working end-to-end. The one outstanding issue is:

**Health score is 26 — it must be in the 42-65 range for the demo.**

A score of 26 is too low. It makes Rohan look catastrophically broke rather than "at-risk but recoverable" which is the story we want to tell. Judges need to see a number that feels urgent but fixable — 42-65 hits that range perfectly.

---

## Fix 1 — Health score calibration (do this before anything else)

The problem is in `ai-service/main.py` in the `compute_health_score` function. The penalties are stacking too aggressively. Apply these specific changes:

**Current penalty logic is too harsh. Replace `compute_health_score` with this calibrated version:**

- Start at 100
- Spend ratio penalty: deduct 25 if spend ≥ budget, deduct 12 if ≥ 85%, deduct 5 if ≥ 70%
- Savings rate penalty: deduct 10 if savings rate < 10%, deduct 4 if < 20%
- Category breaches: deduct 3 per breach, capped at 12 total
- Anomaly penalty: deduct 2 per anomaly, capped at 10 total
- Clamp to 0-100

After changing the formula, also check the seed data. The issue may partly be that Rohan's transactions are generating too high a monthly spend relative to her budget. If after the formula fix the score is still below 42, adjust the seed by doing one of the following in `ai-service/generate_seed.py`:

- Reduce the frequency or max amount for the Shopping category (currently `max: 8000, freq: 15`)
- Or increase Rohan's `monthly_budget` from 45000 to 55000 in `seed_data.json` directly

After any change to seed data or the formula:

1. Re-run `cd backend && npm run seed`
2. Re-run `curl -X POST http://localhost:5000/api/insights/refresh -H "Authorization: Bearer $TOKEN"`
3. Confirm the returned `health_score` is between 42 and 65
4. Confirm `risk_level` is still `"high"` or `"medium"` — do not let it become `"low"`

Do not proceed to Phase 4 until health score is in range AND risk level is not "low".

---

## Fix 2 — CORS origin consistency

Ensure `CLIENT_URL` in `backend/.env` is set to `http://localhost:5173` and not `http://127.0.0.1:5173`. Always open the frontend at `http://localhost:5173` in the browser. Document this in a comment at the top of `backend/.env` so nobody forgets during the demo.

---

## Phase 4 — Polish + Demo Hardening

Now implement Phase 4 in full. Work through each section completely before moving to the next.

---

### 4.1 — Toast notifications

Install sonner if not already installed:

```bash
cd frontend && npm install sonner
```

Add `<Toaster />` from sonner in `App.tsx` at the root level (outside the router, inside the JSX return).

Add `toast()` calls at these exact moments:

- **Login success** — `toast.success('Welcome back, Rohan!')` after redirect to dashboard
- **Insight refresh complete** — `toast.success(`Health score updated: ${insight.health_score}/100`)` after `refreshInsights()` resolves in TopBar
- **Insight refresh error** — `toast.error('Analysis failed. Please try again.')` if refresh throws
- **New alert received via Socket.io** — `toast(alert.title, { description: alert.message.slice(0, 80) })` — triggered in the socket `new_alert` listener
- **Chat error** — `toast.error('Could not reach AI assistant. Please try again.')` if `sendChatMessage` throws
- **Mark all alerts read** — `toast.success('All alerts marked as read')`

Toasts must appear top-right. Duration 4000ms. Do not show a toast for every single action — only the ones listed above.

---

### 4.2 — Loading skeletons

Every page must show skeleton loaders while data is being fetched. Use the shadcn `Skeleton` component (`import { Skeleton } from '@/components/ui/skeleton'`).

**Dashboard:** While `getInsights()` is loading, show:

- A rectangle skeleton where HealthScoreCard will be (h-48, rounded-xl)
- A rectangle skeleton where RiskCard will be (h-48, rounded-xl)
- A rectangle skeleton where ForecastChart will be (h-64, rounded-xl)
- Four small rectangle skeletons in a row where StatsRow will be

**Transactions:** While `getTransactions()` is loading, show 8 skeleton rows each h-14 with rounded-lg.

**Alerts:** While `getAlerts()` is loading, show 4 skeleton rows each h-16 with rounded-lg.

**Chat:** While `getChatHistory()` is loading on mount, show 3 skeleton bubbles alternating left and right alignment.

Implementation pattern — in each page component:

```tsx
if (isLoading) return <SkeletonLayout />; // render skeletons
if (error) return <ErrorState />; // render error
return <RealContent />; // render real data
```

---

### 4.3 — Empty states

Every list must have a meaningful empty state shown when the array is empty and loading is false.

**Transactions list empty:**
Icon: receipt or list icon (use lucide-react `Receipt` icon)
Heading: "No transactions found"
Subtext: "Try adjusting your filters or date range"

**Anomalies tab empty:**
Icon: shield check (lucide-react `ShieldCheck`)
Heading: "No anomalies detected"
Subtext: "Your recent transactions all look normal"

**Alerts page empty:**
Icon: bell (lucide-react `BellOff`)
Heading: "No alerts"
Subtext: "Your finances look quiet. Keep it up."

**Chat empty state:** Already has the 3 suggested prompt chips — that counts as the empty state. No change needed.

---

### 4.4 — Number formatting audit

Do a global find across all frontend `.tsx` files for any raw number being rendered without formatting. Every currency amount must go through `formatCurrency()` from `utils.ts`. Every percentage must show one decimal place. Health score is always a whole number (use `Math.round()`).

Specific places to check:

- StatsRow — all 4 metric values
- RiskCard — overspend amount
- ForecastChart — tooltip value
- CategoryBreakdown — amount and budget labels
- ScenarioSimulator — all before/after amounts
- AlertsPanel — amount field if shown
- ChatMessage — Claude may return raw numbers in its reply, that's fine — only fix component-rendered numbers

---

### 4.5 — Transition and animation polish

Add these subtle transitions — nothing heavy, nothing that slows the demo:

**Page transitions:** Wrap each page's root div with:

```tsx
<div className="animate-in fade-in duration-200">
```

This requires `tailwindcss-animate` — check if it's already installed (shadcn installs it). If not: `npm install tailwindcss-animate`.

**ForecastChart:** Recharts has built-in animation. Confirm `isAnimationActive` is not set to `false` on the Area or Line component. The chart should animate in on first render.

**HealthScoreCard:** If using a progress arc or radial chart, add a CSS transition on the fill/stroke-dashoffset so the score animates from 0 to the real value on mount. Keep duration under 800ms.

**Sidebar active state:** The currently active nav link must have a distinct background. Use `bg-slate-700` or equivalent for the active item. Ensure this updates correctly when navigating between pages.

Do not add any animation that requires a physics library or that lasts longer than 800ms.

---

### 4.6 — Error states

Every API call that can fail must have a visible error state — not just a console.error.

Pattern for each page:

- If the API call throws, set an `error` state variable
- Render a simple error card: red-tinted background, an `AlertCircle` icon from lucide-react, the message "Failed to load [data type]. Please try again.", and a **Retry** button that re-calls the fetch function

Apply this to: DashboardPage, TransactionsPage, AlertsPage, ChatPage (already has error handling — verify it shows in the UI).

---

### 4.7 — Sidebar and TopBar final polish

**Sidebar:**

- SmartSpend AI wordmark at top — use a simple bold text logo if no SVG is available. Add a small colored dot or icon before the name.
- Nav links must show the correct lucide-react icon beside each label: `LayoutDashboard` for Dashboard, `Receipt` for Transactions, `Bell` for Alerts, `MessageSquare` for Chat
- Active link: `bg-slate-700 text-white`, inactive: `text-slate-400 hover:text-white hover:bg-slate-800`
- Bottom of sidebar: user avatar (initials circle in teal), user name "Rohan Sharma", email in muted text, logout button

**TopBar:**

- "Refresh Analysis" button must show a spinning loader icon while `refreshInsights()` is in progress — use `Loader2` from lucide-react with `animate-spin` class
- Alert bell icon must show a red badge with unread count — badge must disappear when count is 0
- Page title must update correctly for each route (Dashboard, Transactions, Alerts, AI Assistant)

---

### 4.8 — Demo data final verification

After all polish is applied, verify Rohan's data produces these specific outputs. If any are off, adjust seed data and re-run seed + refresh.

| Check                    | Expected                               | How to fix if wrong                           |
| ------------------------ | -------------------------------------- | --------------------------------------------- |
| Health score             | 42-65, red or amber color              | Adjust `compute_health_score` penalties       |
| Risk level               | "high" or "medium"                     | Ensure score stays below 75                   |
| Overspend amount         | ₹3,000-₹8,000 projected                | Adjust transaction amounts in seed            |
| Anomalies count          | 6-10 flagged transactions              | Check `is_anomaly` in seedDB.js               |
| Alerts after refresh     | 2-4 alerts                             | Check `buildAlerts` thresholds in insights.js |
| Category in red          | At least 2 categories >90% of budget   | Adjust Shopping/Food amounts in seed          |
| Forecast trend           | Declining — balance drops over 30 days | Verify avg daily spend > daily income/30      |
| Chat — dining simulation | Returns specific ₹ saving              | Test the prompt, check simulate_scenario tool |

---

### 4.9 — Full demo rehearsal (3 runs)

Run the complete demo sequence 3 times without touching any code. All 3 runs must complete without errors.

**Demo sequence:**

1. Open `http://localhost:5173` — login page visible
2. Click **Demo Login** — submits automatically
3. Dashboard loads — health score visible in red/amber within 3 seconds
4. Point out: health score, overspend amount in RiskCard, declining ForecastChart
5. Navigate to **Transactions** — anomaly badges visible on flagged rows
6. Navigate to **Alerts** — 2-4 alerts with severity colors
7. Navigate to **Chat** — 3 suggested chips visible
8. Click: **"What would happen if I cut my dining budget by 30%?"**
9. Typing indicator appears → response arrives with specific ₹ amounts
10. Navigate to **Dashboard** — open Scenario Simulator — run a simulation — see results
11. Click **Refresh Analysis** in TopBar — toast appears — alert bell increments

**Timing targets:**

- Steps 1-4: under 30 seconds
- Steps 5-7: under 45 seconds
- Steps 8-9: under 15 seconds (AI response time)
- Steps 10-11: under 30 seconds

Total demo should run in under 3 minutes leaving time for judge questions.

After 3 clean runs: Phase 4 is complete. The product is demo-ready.

---

## Phase 4 completion checklist

- [ ] Health score is in 42-65 range and colored red or amber
- [ ] Risk level is "high" or "medium" — never "low" for Rohan
- [ ] Toast appears on login, refresh, new alert, and chat error
- [ ] Every page shows skeleton loaders during data fetch
- [ ] Every empty list state has an icon, heading, and subtext
- [ ] All currency amounts use Indian locale ₹ formatting
- [ ] Page transitions fade in smoothly (200ms)
- [ ] ForecastChart animates on load
- [ ] Sidebar shows correct active link highlight on each page
- [ ] TopBar Refresh button shows spinner while running
- [ ] Alert bell badge shows unread count and disappears at 0
- [ ] Error states render with retry button on all pages
- [ ] All 3 chat suggested prompts return data-grounded responses
- [ ] ScenarioSimulator shows specific ₹ before/after amounts
- [ ] Socket.io toast fires within 3 seconds of refresh trigger
- [ ] 3 full demo runs completed without console errors
