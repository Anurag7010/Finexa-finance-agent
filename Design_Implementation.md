# SmartSpend AI — Design Implementation Prompt (Claude Code)

You are receiving design output from Stitch AI — complete React + TypeScript + Tailwind component code for a premium redesigned frontend. Your job is to surgically apply this design to the existing working SmartSpend AI codebase without breaking any functionality.

Read `SMARTSPEND_MASTER_PLAN.md` and the frontend context document before starting. Understand what is already working before touching anything.

---

## The golden rule

**Functionality is sacred. Design is additive.**

Every feature listed below must continue to work after the redesign:
- Demo login flow and JWT auth
- Dashboard data loading (real health score, forecast, categories, risk)
- Transaction list with filters, search, anomaly tab, load more
- Alerts with mark read / mark all read / unread count
- Chat with history, suggested prompts, typing indicator, retry, clear
- Socket.io real-time alert push and insight update
- Protected routing and 401 redirect
- All loading skeletons, empty states, error states

If any of these breaks during the redesign, stop and fix it before continuing.

---

## What Stitch has given you

Stitch has generated new component files with redesigned visual implementation. These files contain:
- New color system (CSS variables)
- New typography scale
- New card styles, spacing, and layout
- Redesigned versions of all 5 pages and shared components

What Stitch has NOT changed (and you must preserve):
- All API calls and data fetching logic
- All Zustand store interactions
- All Socket.io event handlers
- All routing logic
- All TypeScript interfaces and prop types
- All conditional rendering logic (loading / empty / error states)

---

## Implementation strategy

Do not do a full file replacement. Use a surgical merge approach for every file:

1. Open the existing file
2. Open the Stitch design file for the same component
3. Identify which parts are **visual only** (className strings, layout JSX structure, color values, typography) vs **logic** (useState, useEffect, API calls, event handlers, conditional rendering)
4. Keep all logic from the existing file
5. Replace visual parts with the Stitch design
6. Verify the component still renders correctly with real data

This approach takes longer than a copy-paste but is the only safe method when working on a live codebase.

---

## Step-by-step implementation order

Work through files in exactly this order. The order matters — shared styles and tokens affect everything above them.

### Step 1 — CSS variables and global tokens

Open `frontend/src/index.css`.

From the Stitch output, extract the CSS custom properties (color variables, typography variables, spacing tokens). Add them to the `:root` block in `index.css`.

Do not delete any existing animation keyframes (`page-enter`, skeleton pulse, arc animation) — these are used by existing components.

If Stitch defines a new font import (e.g. Geist or Plus Jakarta Sans), add the `@import` at the top of `index.css` and update the `font-family` in the base styles.

Verify: run the frontend. It must still load without errors after only CSS changes.

---

### Step 2 — Sidebar

File: `frontend/src/components/layout/Sidebar.tsx`

The existing Sidebar has: route links with active state, unread badge on Alerts, user profile block, logout button.

Apply the Stitch design:
- New background color (from CSS variables)
- New nav link active state (teal left border + background)
- New inactive link style (muted text, hover state)
- New logo/wordmark presentation
- New user profile block styling at the bottom
- New icon treatments if Stitch specified them

Preserve exactly:
- `useLocation()` for active route detection
- `unreadCount` from Zustand store for the badge
- `logout()` action from Zustand store
- All `<Link>` components and their `to` props
- The navigation items and their order

Verify: navigate between all 4 routes. Active state must update correctly. Unread badge must show/hide correctly.

---

### Step 3 — TopBar

File: `frontend/src/components/layout/TopBar.tsx`

Apply Stitch design:
- New height and background
- New page title typography
- New Refresh Analysis button style (must still show spinner while loading)
- New alert bell badge style

Preserve exactly:
- Route-aware title logic
- `isRefreshing` state and `refreshInsights()` call
- `unreadCount` badge display
- `navigate('/alerts')` on bell click if implemented

---

### Step 4 — Login page

File: `frontend/src/pages/LoginPage.tsx`

This is a full layout redesign — split screen with brand panel on left, form on right.

Apply Stitch design fully. The login page has no complex state besides form validation, so this is the safest file to do a more complete replacement.

Preserve exactly:
- `email` and `password` state variables
- `handleLogin()` function and its API call sequence
- `handleDemoLogin()` function
- Error state display
- Loading state on the login button
- `navigate('/dashboard')` after successful login
- `localStorage.setItem('token', ...)` and Zustand `setToken`, `setUser` calls

The visual output should be the split-screen design from Stitch. The functional behavior must be identical to before.

Verify: demo login must work and redirect to dashboard. A failed login must show an error message.

---

### Step 5 — Dashboard components (do these in sub-order)

#### 5a — StatsRow

File: `frontend/src/components/dashboard/StatsRow.tsx`

Apply new KPI tile design — new card style, new typography scale for the ₹ numbers, new conditional color on the Remaining Budget tile.

Preserve: all props, all `formatCurrency()` calls, all conditional styling logic based on values.

#### 5b — HealthScoreCard

File: `frontend/src/components/dashboard/HealthScoreCard.tsx`

This is the highest-stakes component. The Stitch design has a premium arc gauge. Apply it carefully.

If Stitch used an SVG arc approach: integrate it but keep the score value coming from `props.score` (from Zustand insight store). The color of the arc must still change based on score thresholds (≥80 green, ≥60 amber, <60 coral-red).

If Stitch used a canvas or third-party gauge: evaluate if it can be implemented without a new npm package. If a new package is needed, install it (`npm install <package>`) and confirm it builds.

Preserve: `props.score`, `props.riskLevel`, the sub-metric pills content (savings rate, budget used, anomalies count).

The arc animation must fire on mount. This is a demo moment — the gauge animating in from 0 to the real score is visually impressive.

Verify: score of 52 must show the arc in coral-red, stopping at the correct position.

#### 5c — RiskCard

File: `frontend/src/components/dashboard/RiskCard.tsx`

Apply new design: new severity badge, new overspend statement typography, new risk factors list style, new conditional red tint for HIGH risk.

Preserve: all props from insight store (risk_level, risk_factors, overspend_amount, savings_rate).

#### 5d — ForecastChart

File: `frontend/src/components/dashboard/ForecastChart.tsx`

Apply new design: new card background, new chart color scheme (teal positive / coral-red declining), new axis label styles, new tooltip style, new zero-balance reference line.

Preserve: the Recharts `<AreaChart>` component structure, `data` prop from insight forecast, all `<XAxis>` `<YAxis>` `<Tooltip>` `<Area>` configurations. Only change `stroke`, `fill`, `className` and tooltip formatter styling.

#### 5e — CategoryBreakdown

File: `frontend/src/components/dashboard/CategoryBreakdown.tsx`

Apply new row design: new category icon treatment, new progress bar style, new color thresholds.

Preserve: the category data mapping, `formatCurrency()` calls, sort order, the 6-item limit.

#### 5f — ScenarioSimulator

File: `frontend/src/components/dashboard/ScenarioSimulator.tsx`

Apply new design: new collapsible panel style, new slider and dropdown styling, new before/after results card.

Preserve: all state (selectedCategory, adjustmentPct, results, isLoading), the simulation calculation logic, the API call if implemented.

---

### Step 6 — Dashboard page

File: `frontend/src/pages/DashboardPage.tsx`

Apply the new grid layout (60/40 column split, component ordering from Stitch design).

Preserve exactly: all `useEffect` data fetching, all Zustand store reads, all loading/empty/error conditional renders, skeleton components, the `refreshInsights` call.

Only change: the wrapping layout divs and their className values. Do not touch any logic.

Verify: all 5 dashboard components render with real data. Skeleton shows while loading. Empty state CTA shows if no insight exists.

---

### Step 7 — Transactions page

Files: `TransactionsPage.tsx`, `TransactionList.tsx`, `TransactionRow.tsx`

Apply Stitch design:
- New summary strip styling (TransactionsPage)
- New filter bar and tab switcher styling (TransactionList)
- New transaction row design with anomaly indicator (TransactionRow)

Preserve in TransactionList: search debounce logic, category filter state, tab state (all vs anomalies), pagination / load more, `getTransactions()` API call with params, all loading/empty/error states.

Preserve in TransactionRow: anomaly detection (`transaction.is_anomaly`), channel badge text, `formatCurrency()` and `formatDate()` calls.

The anomaly row treatment is demo-critical — red left border and "⚠ Flagged" badge must be immediately visible at a glance.

---

### Step 8 — Alerts page

Files: `AlertsPage.tsx`, `AlertsPanel.tsx`

Apply Stitch design:
- New page header with unread count badge (AlertsPage)
- New alert item row design with left severity bar, typography, time label (AlertsPanel)
- New unread/read visual distinction
- New empty state design

Preserve in AlertsPanel: `markAlertRead()` API call, `markAllAlertsRead()` API call, optimistic UI update logic, `unreadCount` Zustand update, severity-based color selection logic.

---

### Step 9 — Chat page

Files: `ChatPage.tsx`, `ChatPanel.tsx`, `ChatMessage.tsx`

This screen gets the most visible redesign upgrade. Apply it fully.

**ChatPage:** Apply new full-height layout container.

**ChatPanel:** Apply new design:
- New top bar (AI online indicator, GPT-4o badge, clear button)
- New message area background
- New suggested prompt chip design (3 chips, prominent, centered)
- New typing indicator (3-dot animation)
- New input area design (dark input, teal send button)

Preserve in ChatPanel: history loading on mount, `sendMessage()` handler, optimistic user message add, typing indicator state, `clearHistory()` handler, Enter key submit, retry logic on failed responses.

**ChatMessage:** Apply new bubble designs:
- User: right-aligned, teal background
- Assistant: left-aligned, dark surface, "S" avatar circle

Preserve: role-based rendering, text formatting (line breaks, bold), timestamp display, retry button for error messages.

The 3 suggested prompt chips are demo-critical — clicking one must auto-send that exact message text. Verify this still works after the redesign.

Verify: type a message, send it, typing indicator appears, response arrives, chat scrolls to bottom. All 3 suggested prompts trigger real API calls and return data-grounded responses.

---

### Step 10 — Final integration verification

After all files are updated, run the complete demo sequence in the browser:

1. `http://localhost:5173` → see new login split-screen design
2. Click Demo Login → redirects to new dashboard design
3. Health score arc animates in, shows 42-65 range in coral-red
4. ForecastChart renders with correct colors
5. Navigate Transactions → anomaly rows visually distinct
6. Navigate Alerts → severity bars and unread styling correct
7. Navigate Chat → 3 chips visible, send a message, typing indicator, response arrives
8. Back to Dashboard → Refresh Analysis → toast appears → alert bell increments

Check browser console — zero errors allowed.

---

## If Stitch generated styles that conflict with existing logic

Common conflicts and how to resolve them:

**Conflict: Stitch uses hardcoded color hex values but existing code uses CSS variables**
→ Replace Stitch hex values with the CSS variables you defined in Step 1. Never use hardcoded hex in component files.

**Conflict: Stitch restructured JSX in a way that removes a conditional render**
→ Keep the existing conditional (loading/empty/error) — wrap the Stitch JSX inside the existing conditional structure.

**Conflict: Stitch used a different prop name for a component**
→ Keep the existing prop name. Update only the JSX className/style that consumes it.

**Conflict: Stitch added an animation that fights the existing arc animation in HealthScoreCard**
→ Keep the existing arc animation. Use Stitch's visual style (colors, sizing) but not its animation approach if it conflicts.

**Conflict: Stitch removed the suggested prompt chips from ChatPanel**
→ Add them back. They are non-negotiable for the demo.

---

## Do not do any of the following

- Do not `npm install` any package that adds more than 50KB to the bundle without confirming it is necessary
- Do not change any file in `backend/` or `ai-service/`
- Do not change `api.ts`, `useStore.ts`, `socket.ts`, or `utils.ts` unless Stitch specifically requires a new CSS utility
- Do not remove any TypeScript interface or prop type
- Do not change any route path in `App.tsx`
- Do not touch `package.json` scripts
- Do not apply the design to one file and then move to the next without verifying the first file renders correctly
