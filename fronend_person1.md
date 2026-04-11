# SmartSpend AI — Frontend Agent Prompt (Person B1)

You are building the frontend for SmartSpend AI, a personal finance intelligence platform.
Read both context documents in the project root fully before writing any code:

1. The initial strategy document (sections A through L)
2. `SMARTSPEND_MASTER_PLAN.md`

These are your source of truth. You are responsible for **B1 scope only** as defined below.

---

## Your scope (B1)

You own everything in this list. Do not touch anything outside it.

- `frontend/src/main.tsx`
- `frontend/src/App.tsx`
- `frontend/src/index.css`
- `frontend/src/lib/api.ts`
- `frontend/src/lib/socket.ts`
- `frontend/src/lib/utils.ts`
- `frontend/src/store/useStore.ts`
- `frontend/src/components/layout/Sidebar.tsx`
- `frontend/src/components/layout/TopBar.tsx`
- `frontend/src/pages/LoginPage.tsx`
- `frontend/src/pages/DashboardPage.tsx`
- `frontend/src/components/dashboard/HealthScoreCard.tsx`
- `frontend/src/components/dashboard/RiskCard.tsx`
- `frontend/src/components/dashboard/ForecastChart.tsx`
- `frontend/src/components/dashboard/CategoryBreakdown.tsx`
- `frontend/src/components/dashboard/StatsRow.tsx`
- `frontend/src/pages/TransactionsPage.tsx`
- `frontend/src/components/transactions/TransactionList.tsx`
- `frontend/src/components/transactions/TransactionRow.tsx`

**Never touch:** `AlertsPage.tsx`, `AlertsPanel.tsx`, `ChatPage.tsx`, `ChatPanel.tsx`, `ChatMessage.tsx` — those belong to B2.

---

## What is already done (do not redo)

- React + Vite + TypeScript scaffolded, Tailwind v4 configured
- shadcn/ui initialized with card, badge, button, progress, tabs, alert installed
- `frontend/.env` exists with `VITE_API_URL` and `VITE_WS_URL` already set
- Backend is being built in parallel by Person A — it may not be ready yet

---

## How to handle the backend not being ready yet

Build with mock data first. Define a `USE_MOCK` flag at the top of `api.ts`. When `USE_MOCK = true`, every API function returns hardcoded data matching the exact shape the real API will return. When Person A confirms the backend is live, flip `USE_MOCK = false` and everything wires up automatically.

Mock data must match these exact shapes:

**Login response:**

```json
{
  "token": "mock-jwt-token",
  "user": {
    "id": "1",
    "name": "Priya Sharma",
    "email": "demo@smartspend.ai",
    "income": 85000,
    "monthly_budget": 45000,
    "category_budgets": {
      "Food & Dining": 8000,
      "Transportation": 3000,
      "Shopping": 7000,
      "Entertainment": 3000,
      "Utilities": 4000,
      "Health": 3000,
      "Groceries": 6000,
      "Rent": 20000
    }
  }
}
```

**Insight response:**

```json
{
  "insight": {
    "health_score": 52,
    "risk_level": "high",
    "risk_factors": [
      "Spending 22% ahead of monthly pace",
      "Shopping budget at 94%",
      "Savings rate critically low at 6%"
    ],
    "monthly_spend": 38200,
    "monthly_budget": 45000,
    "overspend_amount": 6840,
    "savings_rate": 0.06,
    "top_category": "Shopping",
    "category_summary": {
      "Food & Dining": 7200,
      "Transportation": 2100,
      "Shopping": 6580,
      "Entertainment": 2800,
      "Utilities": 3200,
      "Health": 1800,
      "Groceries": 5100,
      "Rent": 20000
    },
    "forecast": []
  }
}
```

**Transaction summary:**

```json
{
  "totalSpend": 38200,
  "summary": [
    { "_id": "Shopping", "total": 6580, "count": 12 },
    { "_id": "Food & Dining", "total": 7200, "count": 38 },
    { "_id": "Rent", "total": 20000, "count": 1 }
  ]
}
```

**Transactions list:** Array of 20 objects each with: `_id`, `date`, `amount`, `merchant`, `category`, `channel`, `is_anomaly` (set 3-4 as true), `description`.

**Forecast:** Array of 30 objects each with `date` (YYYY-MM-DD), `projected_balance` (start at 46800, decline to ~8000 by day 30), `projected_spend`.

---

## Build order within your scope

### Step 1 — Foundation (do this first, ~20 min)

Build `utils.ts`, `api.ts` (with mock), `socket.ts`, `useStore.ts`, `App.tsx` with routing, `index.css`. Verify the app runs at localhost:5173 without errors.

### Step 2 — Layout shell (~20 min)

Build `Sidebar.tsx` and `TopBar.tsx`. Sidebar: dark background (slate-900), SmartSpend logo, nav links for Dashboard / Transactions / Alerts / Chat, user name at bottom, logout. TopBar: page title, Refresh Analysis button, alert bell with badge. Verify layout renders correctly with placeholder page content.

### Step 3 — Login page (~20 min)

Build `LoginPage.tsx`. Centered card, email + password inputs, Login button with loading state, Demo Login button that pre-fills `demo@smartspend.ai` / `demo1234` and auto-submits, error message on failure. On success: save token to localStorage + Zustand, call `refreshInsights()`, redirect to `/dashboard`. Verify mock login works and redirects.

### Step 4 — Dashboard components (~60 min)

Build all 5 dashboard components. Priority order:

**HealthScoreCard** — most important visual. Large arc or circular gauge, score number centered, color green/amber/red based on score (≥80/≥60/<60), label below. For score 52 it must show red. This is the first thing a judge sees.

**RiskCard** — risk level badge, overspend amount ("On track to overspend by ₹6,840"), top 3 risk factors as bullet points, projected end-of-month balance. Red background tint for high risk.

**StatsRow** — 4 metric cards: Monthly Income / Monthly Budget / Spent This Month / Remaining. Large ₹ number, muted label above.

**ForecastChart** — Recharts AreaChart, 30 data points, x-axis dates, y-axis ₹ balance, area fill red/amber for declining trend, dashed line at ₹0, hover tooltip with exact amount.

**CategoryBreakdown** — list of categories with progress bar per category. Color: green <70%, amber 70-90%, red >90%. Sort by spend descending, show top 6.

### Step 5 — Dashboard page composition (~20 min)

Compose `DashboardPage.tsx`: StatsRow full width at top, two columns below (60/40 split) — left has ForecastChart + CategoryBreakdown, right has HealthScoreCard + RiskCard. Skeleton loaders while data loads. Verify full dashboard renders with mock data.

### Step 6 — Transactions page (~30 min)

Build `TransactionRow.tsx`: category emoji, merchant name, date, channel badge, amount in red ₹ format, anomaly warning icon with tooltip for flagged rows (subtle red left border). Build `TransactionList.tsx`: search bar, category filter dropdown, All/Anomalies tab, load more pagination. Build `TransactionsPage.tsx`: summary banner + TransactionList. Verify anomaly rows are visually distinct.

### Step 7 — Wire to real backend (do when Person A confirms backend is live)

Flip `USE_MOCK = false` in `api.ts`. Test login, dashboard data, transactions all load from real API. Fix any shape mismatches. Register Socket.io on login. Verify forecast chart shows real 30-day data.

---

## Verification before handoff to B2

- [ ] Login with mock works, redirects to dashboard
- [ ] Dashboard shows health score 52 in red gauge
- [ ] ForecastChart renders 30 data points with declining trend
- [ ] CategoryBreakdown shows Shopping and Food bars in red/amber
- [ ] RiskCard shows "high" badge and overspend amount
- [ ] Transaction list shows rows with anomaly badges on flagged items
- [ ] Layout (sidebar + topbar) is consistent across all pages
- [ ] No console errors on any page
- [ ] When backend is live: real data flows end to end

---

## Non-negotiable rules

- Use shadcn/ui components everywhere. No custom CSS for buttons, cards, badges, inputs.
- Every ₹ amount formatted with Indian locale: `formatCurrency()` from utils.ts always.
- Health score gauge must be visually prominent — it is the hero element of the entire app.
- No blank white areas during loading — skeleton loaders on every data fetch.
- After each step, tell me what was built and confirm it renders before moving on.
