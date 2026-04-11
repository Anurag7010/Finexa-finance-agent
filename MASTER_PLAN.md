
# SmartSpend AI — Hackathon Master Implementation Plan

> This document is the complete implementation guide for the SmartSpend AI hackathon project.
> It is written to be executed by an AI coding agent (Claude Code or equivalent).
> The agent should follow phases in strict order. Do not skip ahead.
> All code must be production-quality, not prototype-quality. The goal is first prize.

---

## Project Overview

**What we are building:** A proactive personal finance intelligence platform called SmartSpend AI. It monitors a user's transaction history, computes a financial health score, predicts overspending risk, detects anomalies, forecasts their 30-day balance, and provides a conversational AI finance assistant powered by OpenAI GPT-4o with tool use.

**Demo user:** rohan Sharma (`demo@smartspend.ai` / `demo1234`) — an at-risk user who is overspending. All demo interactions should tell her story.

**Winning criteria in priority order:** AI sophistication → demo polish → usefulness → technical depth → presentation clarity.

---

## Tech Stack (Non-negotiable)

| Layer | Technology |
|---|---|
| Frontend | React + Vite + TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Charts | Recharts |
| State management | Zustand |
| HTTP client | Axios |
| Real-time | Socket.io client |
| Backend | Node.js + Express |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcryptjs |
| Real-time server | Socket.io |
| AI/ML service | Python + FastAPI |
| ML models | scikit-learn (Isolation Forest, Linear Regression) |
| LLM | OpenAI API — GPT-4o for chat, GPT-4o-mini for categorization and nudges |
| Deployment | Railway (backend + AI service) + Vercel (frontend) |

---

## Pre-existing Setup (Already Done — Do Not Redo)

The following are already in place before the hackathon starts:

- `smartspend-ai/frontend/` — React + Vite + TypeScript scaffolded, Tailwind v4 configured, shadcn/ui initialized with card, badge, button, progress, tabs, alert components installed
- `smartspend-ai/backend/` — npm initialized, all dependencies listed in package.json
- `smartspend-ai/ai-service/` — Python venv created, all pip packages installed, `requirements.txt` frozen
- `smartspend-ai/ai-service/seed_data.json` — 600 synthetic transactions across two users (rohan = at-risk demo user, Alex = healthy user)
- `smartspend-ai/ai-service/generate_seed.py` — seed generator script
- All `.env` files exist with real values: MongoDB Atlas URI, OpenAI API key, JWT secret, service URLs
- MongoDB Atlas cluster is live and accessible
- OpenAI API key is active and has credit

**The agent's job is to write all application code from scratch across all three services.**

---

## Folder Structure to Build

```
smartspend-ai/
├── frontend/
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── index.css
│       ├── lib/
│       │   ├── api.ts              ← axios instance + all API calls
│       │   ├── socket.ts           ← socket.io client setup
│       │   └── utils.ts            ← formatCurrency, formatDate, getScoreColor helpers
│       ├── store/
│       │   └── useStore.ts         ← Zustand global store
│       ├── components/
│       │   ├── layout/
│       │   │   ├── Sidebar.tsx
│       │   │   └── TopBar.tsx
│       │   ├── dashboard/
│       │   │   ├── HealthScoreCard.tsx
│       │   │   ├── RiskCard.tsx
│       │   │   ├── ForecastChart.tsx
│       │   │   ├── CategoryBreakdown.tsx
│       │   │   └── StatsRow.tsx
│       │   ├── transactions/
│       │   │   ├── TransactionList.tsx
│       │   │   └── TransactionRow.tsx
│       │   ├── alerts/
│       │   │   └── AlertsPanel.tsx
│       │   └── chat/
│       │       ├── ChatPanel.tsx
│       │       └── ChatMessage.tsx
│       └── pages/
│           ├── LoginPage.tsx
│           ├── DashboardPage.tsx
│           ├── TransactionsPage.tsx
│           ├── AlertsPage.tsx
│           └── ChatPage.tsx
├── backend/
│   ├── server.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Transaction.js
│   │   ├── Insight.js
│   │   ├── Alert.js
│   │   └── ChatMessage.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── transactions.js
│   │   ├── insights.js
│   │   ├── alerts.js
│   │   └── chat.js
│   ├── middleware/
│   │   └── auth.js
│   ├── services/
│   │   ├── aiService.js
│   │   └── socketService.js
│   └── scripts/
│       └── seedDB.js
└── ai-service/
    └── main.py
```

---

## Phase 1 — Backend API + Database (Target: 90 minutes)

**Goal:** Fully working Express API with all routes, MongoDB models, JWT auth, Socket.io, and seed data loaded into MongoDB. At the end of this phase, every backend endpoint must return correct data when called with curl or Postman.

### 1.1 — MongoDB Models

Create five Mongoose models. Each must have proper indexes for query performance.

**User model** must store: name, email, hashed password, income (Number), monthly_budget (Number), category_budgets (Map of String to Number with defaults for all 8 categories), currency (default "INR"), timestamps.

**Transaction model** must store: user_id (ObjectId ref User, indexed), date (Date, indexed), amount (Number), merchant (String), category (String), description (String), channel (enum: UPI/card/netbanking/cash/other), is_anomaly (Boolean default false), anomaly_score (Number default 0). Compound index on user_id + date descending.

**Insight model** must store: user_id (indexed), health_score (Number 0-100), risk_level (enum: low/medium/high), risk_factors (Array of Strings), recommendations (Array of objects with category/message/potential_saving), forecast (Array of objects with date/projected_balance/projected_spend), category_summary (Map), monthly_spend, monthly_budget, overspend_amount, savings_rate, top_category, generated_at.

**Alert model** must store: user_id (indexed), type (enum: overspend_pace/category_breach/anomaly/weekly_spike/nudge/risk_level), severity (enum: low/medium/high), title, message, category (nullable), amount (nullable), read (Boolean default false), triggered_at.

**ChatMessage model** must store: user_id (indexed), role (enum: user/assistant), content, timestamp.

### 1.2 — JWT Auth Middleware

Single middleware file that reads `Authorization: Bearer <token>` header, verifies the JWT using JWT_SECRET from .env, attaches `req.user = { id, email }` to the request, and returns 401 if missing or invalid.

### 1.3 — Auth Routes (`/api/auth`)

**POST /register** — accepts name, email, password, income, monthly_budget. Checks for duplicate email. Creates user (password hashed by Mongoose pre-save hook). Returns JWT token + user object (no password field).

**POST /login** — accepts email, password. Finds user, compares password with bcrypt. Returns JWT token + user object. Returns 401 on invalid credentials with generic message.

**GET /me** — protected route. Returns current user from token. Used by frontend on app load to restore session.

### 1.4 — Transaction Routes (`/api/transactions`) — all protected

**GET /** — returns paginated transactions for the logged-in user. Supports query params: limit, skip, category, startDate, endDate. Returns `{ transactions, total }`.

**GET /summary** — aggregates transactions from the current calendar month using MongoDB aggregation pipeline. Groups by category, computes total spend and count per category. Returns `{ summary, totalSpend, month }`.

**GET /anomalies** — returns transactions where is_anomaly is true, sorted by date descending, limited to 20.

**POST /** — accepts amount, merchant, description, channel, date. Calls the Python AI service `/categorize` endpoint to auto-assign category. Creates and returns the transaction.

### 1.5 — Insights Routes (`/api/insights`) — all protected

**GET /** — returns the most recent Insight document for the logged-in user sorted by generated_at descending. Returns 404 if none exists yet.

**POST /refresh** — this is the core pipeline trigger. Fetches user from DB, fetches last 90 days of transactions, calls the Python AI service `/analyze` endpoint with full transaction data and user budget info, saves the returned analysis as a new Insight document, generates Alert documents from the analysis results using a `buildAlerts` helper function, saves alerts to DB, pushes each new alert to the connected Socket.io client via `pushAlertToUser`, pushes the new insight via `pushInsightUpdate`, returns the insight and alert count.

The `buildAlerts` helper must generate alerts for: overspend pace (if current spend > expected pace by 15%), high risk level, and each category breach returned by the AI service.

**GET /forecast** — returns the forecast array from the most recent Insight document.

### 1.6 — Alerts Routes (`/api/alerts`) — all protected

**GET /** — returns all alerts for user sorted by triggered_at descending, limited to 50. Also returns unreadCount.

**PATCH /:id/read** — marks a single alert as read.

**PATCH /read-all** — marks all unread alerts as read.

### 1.7 — Chat Routes (`/api/chat`) — all protected

This is the most important route. It implements an OpenAI GPT-4o agent with tool use.

**Define 5 tools with full JSON schemas:**
- `get_spending_summary` — params: period (enum: this_month/last_month/last_30_days/last_90_days)
- `get_balance_forecast` — params: days (number, max 30)
- `get_risk_score` — no params
- `get_anomalies` — no params
- `simulate_scenario` — params: category (string), adjustment_pct (number, negative = cut)

**Tool execution functions** must query MongoDB directly and return structured JSON:
- `get_spending_summary` runs a MongoDB aggregation grouped by category for the given period
- `get_balance_forecast` reads forecast array from latest Insight document
- `get_risk_score` reads health_score, risk_level, risk_factors, monthly_spend, monthly_budget, overspend_amount, savings_rate from latest Insight
- `get_anomalies` queries Transaction collection for is_anomaly: true
- `simulate_scenario` reads current category spend from latest Insight, computes impact of the adjustment on monthly spend and projected balance, estimates new health score

**POST /** — the main chat endpoint:
1. Save user message to ChatMessage collection
2. Fetch last 10 ChatMessages for conversation history
3. Fetch latest Insight for system context
4. Build system prompt including user's name, income, monthly budget, health score, risk level, this month's spend, top category
5. Call GPT-4o with system prompt + conversation history + tool definitions + `tool_choice: "auto"`
6. If response contains tool_calls, execute each tool against the DB, collect results, make a second GPT-4o call with tool results appended to messages
7. Repeat tool call loop until no more tool calls in response (agentic loop)
8. Save final assistant message to ChatMessage collection
9. Return `{ reply: finalContent }`

**GET /history** — returns all ChatMessages for user sorted by timestamp ascending.

**DELETE /history** — deletes all ChatMessages for user.

### 1.8 — Socket.io Service

Initialize Socket.io server attached to the HTTP server. Maintain a Map of userId to socketId. On `register` event from client, store the mapping. On `disconnect`, clean up. Export `pushAlertToUser(userId, alert)` and `pushInsightUpdate(userId, insight)` functions that emit to the correct socket.

### 1.9 — Main Server File

Express app with CORS configured for CLIENT_URL. Socket.io attached to http.createServer. All routes mounted. MongoDB connected on startup. Server listens only after successful DB connection.

### 1.10 — Seed Script

Script at `backend/scripts/seedDB.js` that reads `ai-service/seed_data.json`, deletes existing demo users and their transactions, creates both users (password hashing via model pre-save), inserts all transactions mapped to the correct MongoDB ObjectId user references, logs completion with demo credentials. Run with `npm run seed`.

### 1.11 — Phase 1 Completion Check

All of the following curl commands must return valid non-error JSON before moving to Phase 2:
- `curl http://localhost:5000/health` → `{ status: "ok" }`
- `curl -X POST /api/auth/login` with demo credentials → returns token
- `curl /api/transactions` with Bearer token → returns 300 transactions
- `curl /api/insights` with Bearer token → may return 404 (no insights yet, that's fine)
- Socket.io connection must accept `register` event without errors

---

## Phase 2 — Python AI Service (Target: 60 minutes)

**Goal:** Fully working FastAPI service at port 8000 with all 5 endpoints returning correct structured data. This service is the intelligence layer — every endpoint must return production-quality outputs that look credible in the demo.

### 2.1 — FastAPI App Setup

FastAPI app with CORS middleware allowing all origins. All request and response bodies defined as Pydantic models. Environment loaded from .env using python-dotenv. OpenAI client initialized from OPENAI_API_KEY.

### 2.2 — `/analyze` — Full Analysis Pipeline (most important endpoint)

Accepts: user_id, transactions array, monthly_budget, income, category_budgets dict.

Must compute and return all of the following:

**Category spend this month** — filter transactions to current calendar month, group by category, sum amounts.

**Health score (0-100)** — computed by a deterministic formula:
- Start at 100
- Deduct 30 if monthly spend ≥ budget, 15 if ≥ 85%, 7 if ≥ 70%
- Deduct 15 if savings rate < 10%, 7 if < 20%
- Deduct 5 per category breach (capped at 20)
- Deduct 3 per anomaly (capped at 15)
- Clamp result to 0-100

**Risk level** — "high" if score < 50, "medium" if < 75, "low" otherwise.

**Risk factors** — human-readable strings describing what's driving the risk. Include: spending pace vs expected, categories at or above 90% of budget, savings rate if critically low. Return up to 4 factors.

**Category breaches** — list of categories where spend ≥ 80% of category budget, including category name, spent amount, budget amount, and percentage.

**30-day forecast** — array of 30 objects each with date, projected_balance, projected_spend. Compute average daily spend from last 30 days of transaction history. Project forward with slight random variance (±5%) using numpy. Running balance starts at current month's remaining income and decrements daily.

**Recommendations** — top 3 categories by spend that are over 75% of budget. For each, compute a 15% reduction saving amount and return a human-readable recommendation string.

**Overspend amount** — project current month's spend to end of month using daily pace, subtract budget, floor at 0.

**Savings rate** — (income - monthly_spend) / income, floored at 0.

**Top category** — category with highest spend this month.

Return all of the above as a single JSON object.

### 2.3 — `/categorize` — LLM Zero-Shot Categorization

Accepts: description, merchant, amount.

Calls GPT-4o-mini with a strict system prompt that instructs it to return ONLY one category name from the fixed list: Food & Dining, Transportation, Shopping, Entertainment, Utilities, Health, Groceries, Rent, Other.

Temperature 0, max_tokens 20. If the response is not in the allowed list, return "Other". Never fail — always return a category string.

### 2.4 — `/forecast` — Standalone Forecast Endpoint

Accepts: user_id, transactions array, income, monthly_budget.

Calls the same `build_forecast` function used in `/analyze`. Returns 30-day forecast array. Used when the backend needs forecast data independently.

### 2.5 — `/anomalies` — Isolation Forest Anomaly Detection

Accepts: transactions array.

If fewer than 10 transactions, return empty result.

Otherwise:
- Build a feature matrix with 4 columns: amount, hour of day (from transaction date), day of week, category (label-encoded)
- Train an IsolationForest with contamination=0.05, random_state=42, n_estimators=100
- Get predictions and raw scores
- Normalize scores to 0-1 range (higher = more anomalous)
- Return all transactions flagged as anomalies (predict == -1) with their anomaly score, merchant, amount, category, and index

### 2.6 — `/nudge-message` — LLM-Generated Alert Messages

Accepts: trigger_type (one of: overspend_pace/category_breach/anomaly/weekly_spike), context dict.

Build a specific prompt for each trigger type using context values (amounts, category names, percentages). Call GPT-4o-mini with a system prompt instructing it to be a friendly financial wellness coach and return exactly 1 sentence. Temperature 0.7, max_tokens 80.

Must have hardcoded fallback messages for each trigger type in case the API call fails. Never raise an exception — always return a message string.

### 2.7 — Phase 2 Completion Check

All of the following must work before moving to Phase 3:
- `curl http://localhost:8000/health` → `{ status: "ok" }`
- POST `/analyze` with sample transaction payload → returns object with health_score, risk_level, forecast array of 30 items, category_summary
- POST `/categorize` with `{ merchant: "Swiggy", description: "food order", amount: 450 }` → returns `{ category: "Food & Dining" }`
- POST `/anomalies` with 50 transactions → returns anomalies array
- POST `/nudge-message` with trigger_type "overspend_pace" → returns message string

Also run `POST /api/insights/refresh` from the backend — this must complete without error and return a valid insight with health_score visible. This seeds the insight data that the frontend will display.

---

## Phase 3 — React Frontend: Core Dashboard (Target: 90 minutes)

**Goal:** A fully working, visually polished React application with login, dashboard, and transaction pages. At the end of this phase the demo user rohan can log in and see her health score, risk card, forecast chart, category breakdown, and transaction feed — all with real data.

### 3.1 — Global Setup

**`src/index.css`** — import Tailwind v4, set global font to Inter or system sans-serif, set background to a very light gray (`#f8f9fa` or similar) so the sidebar and cards pop.

**`src/lib/api.ts`** — create an axios instance with `baseURL` from `VITE_API_URL`. Add a request interceptor that reads the JWT token from localStorage and attaches it as `Authorization: Bearer <token>` on every request. Add a response interceptor that redirects to `/login` on 401 responses.

Export named async functions for every API call the frontend needs:
- `login(email, password)` → POST /api/auth/login
- `getMe()` → GET /api/auth/me
- `getTransactions(params?)` → GET /api/transactions
- `getTransactionSummary()` → GET /api/transactions/summary
- `getAnomalies()` → GET /api/transactions/anomalies
- `getInsights()` → GET /api/insights
- `refreshInsights()` → POST /api/insights/refresh
- `getForecast()` → GET /api/insights/forecast
- `getAlerts()` → GET /api/alerts
- `markAlertRead(id)` → PATCH /api/alerts/:id/read
- `markAllRead()` → PATCH /api/alerts/read-all
- `sendChatMessage(message)` → POST /api/chat
- `getChatHistory()` → GET /api/chat/history
- `clearChatHistory()` → DELETE /api/chat/history

**`src/lib/socket.ts`** — create and export a socket.io client instance connecting to `VITE_WS_URL`. Export a `registerSocket(userId)` function that emits the `register` event.

**`src/lib/utils.ts`** — export helper functions:
- `formatCurrency(amount)` → formats as ₹1,23,456 using Indian locale
- `formatDate(date)` → formats as "12 Jan 2025"
- `getScoreColor(score)` → returns Tailwind color class: green for ≥80, amber for ≥60, red for <60
- `getRiskBadgeColor(level)` → returns color classes for low/medium/high
- `getCategoryIcon(category)` → returns an emoji or icon for each spending category

**`src/store/useStore.ts`** — Zustand store with the following state slices and setters:
- `user` — the logged-in user object, `setUser`
- `token` — JWT string, `setToken`
- `insight` — latest Insight object, `setInsight`
- `transactions` — array of transactions, `setTransactions`
- `alerts` — array of alerts, `setAlerts`
- `unreadCount` — number, `setUnreadCount`
- `isLoading` — boolean for global loading state
- `logout` — clears user, token, redirects to login

### 3.2 — App Shell and Routing

**`src/App.tsx`** — set up React Router with these routes:
- `/login` → LoginPage (public)
- `/` → redirect to `/dashboard` if logged in, else `/login`
- `/dashboard` → DashboardPage (protected)
- `/transactions` → TransactionsPage (protected)
- `/alerts` → AlertsPage (protected)
- `/chat` → ChatPage (protected)

Wrap protected routes in a `ProtectedRoute` component that checks for token in Zustand store and redirects to `/login` if absent.

On app load, if a token exists in localStorage, call `getMe()` to restore the user session and store it in Zustand.

**`src/components/layout/Sidebar.tsx`** — fixed left sidebar, dark background (slate-900 or similar). Contains: SmartSpend logo/wordmark at top, navigation links (Dashboard, Transactions, Alerts, Chat), active link highlighted, user name + avatar initials at bottom, logout button.

**`src/components/layout/TopBar.tsx`** — top bar showing current page title, a "Refresh Analysis" button that calls `refreshInsights()` with a loading spinner while running, and an alert bell icon showing unread count badge.

### 3.3 — Login Page

Clean centered card. SmartSpend AI logo/wordmark. Email and password inputs. Login button with loading state. On success: save token to localStorage and Zustand, call `refreshInsights()` to generate first insight, redirect to `/dashboard`. Show error message on failed login. Include a "Demo Login" button that pre-fills `demo@smartspend.ai` / `demo1234` and submits automatically.

### 3.4 — Dashboard Components

**`StatsRow`** — a row of 4 metric cards showing: Monthly Income, Monthly Budget, Spent This Month, Remaining Budget. Each card has a label, a large number in ₹ format, and a subtle trend indicator. Pull data from the Zustand insight store.

**`HealthScoreCard`** — the hero card. Large circular or arc gauge showing the health score (0-100). Color changes based on score: green/amber/red. Below the gauge: the score number in large text, a label ("Financial Health Score"), and a 1-line description based on score range ("You're on track" / "Needs attention" / "At risk"). This card should be visually prominent — the first thing a judge sees.

**`RiskCard`** — shows risk level badge (low/medium/high with color), overspend amount if any ("On track to overspend by ₹6,840 this month"), top 2-3 risk factors as bullet points, and a projected end-of-month balance. Use red background tint for high risk. This card must feel urgent for the demo user rohan.

**`ForecastChart`** — Recharts AreaChart showing 30-day projected balance. X-axis: dates, Y-axis: balance in ₹. Fill area green if trending positive, red/amber if declining. Add a dashed horizontal line at ₹0 (zero balance warning). Include a tooltip showing exact projected balance on hover. The chart must show real forecast data from the insight — not dummy data.

**`CategoryBreakdown`** — for each spending category, show: category name, amount spent, budget for that category, a progress bar (full width = 100% of budget), percentage label. Color the progress bar green below 70%, amber 70-90%, red above 90%. Sort by spend amount descending. Show top 6 categories.

**`DashboardPage`** — compose all the above. Layout: StatsRow at top (full width), then two columns below — left column (60%) has ForecastChart then CategoryBreakdown, right column (40%) has HealthScoreCard then RiskCard. On mount: call `getInsights()` and `getTransactionSummary()`, store results in Zustand. Show skeleton loaders while loading. If no insight exists yet, show a banner prompting the user to click "Refresh Analysis".

### 3.5 — Transactions Page

**`TransactionRow`** — single row showing: category emoji/icon, merchant name, description (truncated), date, channel badge (UPI/card/etc), amount in ₹ (red text since it's a debit), anomaly warning icon if `is_anomaly` is true with a tooltip "Flagged as unusual by AI". Anomaly rows should have a subtle red left border.

**`TransactionList`** — renders a list of TransactionRow components. Includes: a search/filter bar with category dropdown filter and date range picker, a tab row for All / Anomalies only, count of displayed transactions. Calls `getTransactions()` on mount and on filter change. Paginate with a "Load more" button (don't over-engineer infinite scroll).

**`TransactionsPage`** — full page with TransactionList. Show a summary banner at the top: total transactions this month, total anomalies flagged, top spending category.

### 3.6 — Socket.io Integration

After login, call `registerSocket(user.id)` to register the user's socket connection. Listen for `new_alert` events — when received, add the alert to Zustand alerts array, increment unreadCount, and show a toast notification in the top-right corner with the alert title and message. Listen for `insight_update` events — when received, update the Zustand insight state so the dashboard refreshes automatically.

### 3.7 — Phase 3 Completion Check

Before moving to Phase 4, all of the following must work end-to-end with real data:
- Login with `demo@smartspend.ai` / `demo1234` works and redirects to dashboard
- Dashboard shows rohan's real health score (should be in the 40-65 range)
- ForecastChart renders 30 data points from the insight
- CategoryBreakdown shows at least 5 categories with real amounts
- RiskCard shows risk_level "high" or "medium" for rohan with at least 2 risk factors
- Transactions page shows 100+ transactions with anomaly badges visible on flagged rows
- Clicking "Refresh Analysis" triggers the pipeline and updates the dashboard

---

## Phase 4 — AI Chat Assistant + Alerts Panel (Target: 60 minutes)

**Goal:** The AI chat assistant and alerts panel fully working. These two features are the highest-impact demo moments. The chat must feel intelligent, fast, and personal. Alerts must feel urgent and actionable.

### 4.1 — Alerts Panel

**`AlertsPanel`** — shows list of alerts sorted by triggered_at descending. Each alert item: severity icon (colored dot), alert title in bold, message text, time ago label ("2 hours ago"), read/unread state (unread items have darker background). Click to mark as read. "Mark all read" button at top. Empty state if no alerts.

Color-code by severity: red background tint for high, amber for medium, blue for low.

**`AlertsPage`** — full page wrapping AlertsPanel with a header showing total unread count. On mount: call `getAlerts()` and store in Zustand. Alerts arrive in real-time via Socket.io (wired in Phase 3).

For the demo, after login and refresh, rohan should have at least 3 alerts generated: one overspend pace alert, one or two category breach alerts. These come from the `buildAlerts` function in the backend insights route.

### 4.2 — Chat Panel

**`ChatMessage`** — renders a single chat message bubble. User messages: right-aligned, dark background. Assistant messages: left-aligned, light background, with a small SmartSpend AI avatar/icon. Render assistant message text with basic markdown support (bold, line breaks). If the message contains currency amounts, they should display clearly.

**`ChatPanel`** — the main chat interface:
- Message list area that auto-scrolls to bottom on new messages
- Fixed input area at bottom: text input + send button
- On send: immediately add the user message to the UI optimistically, show a typing indicator (animated dots) while waiting for response, replace with actual response when received
- Load chat history on mount via `getChatHistory()`
- "Clear conversation" button in the header
- The input must support pressing Enter to send

The chat must feel fast. Show the typing indicator within 200ms of sending. The backend call may take 3-8 seconds for GPT-4o with tool calls — this is acceptable as long as the typing indicator is visible.

**`ChatPage`** — full page layout with ChatPanel taking the full content area height. Add 3 suggested prompt chips at the top (shown only when chat is empty) that the user can click to auto-send:
- "Why am I spending so much this month?"
- "What would happen if I cut my dining budget by 30%?"
- "Show me my most suspicious transactions"

These three prompts are specifically chosen to trigger tool calls and produce impressive responses in the demo.

### 4.3 — Suggested Prompts Strategy (Demo-Critical)

The three suggested prompts are carefully designed to showcase the AI's tool use capability:

"Why am I spending so much this month?" → triggers `get_spending_summary` + `get_risk_score` → Claude returns a specific, personalized breakdown with category names and amounts.

"What would happen if I cut my dining budget by 30%?" → triggers `simulate_scenario` → Claude returns projected monthly saving, new balance, and improved health score estimate. This is the #1 wow moment.

"Show me my most suspicious transactions" → triggers `get_anomalies` → Claude returns a list of specific merchants and amounts that were flagged, with explanation.

Each of these must work end-to-end and return personalized, non-generic responses. Test all three before the demo.

### 4.4 — Phase 4 Completion Check

- AlertsPage shows at least 3 real alerts for rohan with correct severity colors
- Socket.io alert push works: triggering a refresh should push a new alert as a toast within 2 seconds
- Chat sends a message and receives a response with real data (not a generic response)
- "What would happen if I cut my dining budget by 30%?" returns specific ₹ amounts
- Typing indicator appears immediately after sending
- Chat history persists across page navigation

---

## Phase 5 — Polish, Scenario Simulator + Demo Hardening (Target: 60 minutes)

**Goal:** Make the product feel like a real product, not a hackathon prototype. Fix every rough edge. Add the scenario simulator. Verify the complete demo flow end-to-end 3 times without any errors or awkward loading states.

### 5.1 — Scenario Simulator

Add a "Simulator" section to the Dashboard page (below the ForecastChart, collapsible panel or modal).

It contains:
- A category dropdown populated with the user's actual spending categories
- A slider from -50% to +50% with a label showing the selected adjustment ("Cut by 30%" or "Increase by 20%")
- A "Run Simulation" button
- Results display: shows Original Monthly Spend vs Projected Monthly Spend, Monthly Saving, Annual Saving, New Projected Balance, Estimated New Health Score

On "Run Simulation": call the backend chat route or create a dedicated `/api/insights/simulate` route that calls the Python service. Display results in a clean before/after card layout.

This feature directly serves the demo moment where a judge asks "what if I changed my spending?" and you show them live.

### 5.2 — UI Polish Checklist

Every item in this list must be completed:

**Loading states** — every data fetch must show a skeleton loader or spinner. No blank white areas during loading. Use shadcn Skeleton component for card placeholders.

**Empty states** — every list (transactions, alerts, chat) must have a meaningful empty state with an icon and helpful message. Not just blank.

**Error states** — if any API call fails, show a visible error message with a retry button. Do not silently fail.

**Toast notifications** — install and configure a toast library (react-hot-toast or sonner). Show toasts for: login success, insight refresh complete (with new health score), new alert received, chat errors. Toasts should appear top-right and auto-dismiss after 4 seconds.

**Numbers** — every currency amount must be formatted as ₹X,XX,XXX (Indian locale). Every percentage must show one decimal place. Health score is always a whole number.

**Responsive layout** — the app must work at 1280px minimum width. This is a laptop demo, not mobile. Do not break the layout at common laptop resolutions.

**Transitions** — add subtle fade-in transitions (150-200ms) when pages load. The ForecastChart should animate in using Recharts built-in animation. Do not add heavy animations — they slow down the demo.

**Dark sidebar contrast** — the sidebar must have high contrast with the main content area. This creates the professional product feel. Slate-900 sidebar with white text against a light gray content background works well.

### 5.3 — Demo Data Verification

Before the demo, verify these specific data points for rohan's account are realistic and impressive:

- Health score: should be 42-65 (visually concerning, not catastrophic)
- Risk level: "high" or "medium"
- This month's spend: should be ≥75% of monthly budget by day 15-20
- At least 8 anomaly-flagged transactions visible in the transaction list
- At least one anomaly from a suspicious merchant (e.g., "UNKNOWN MERCHANT 4821" or "INTL TXN")
- ForecastChart should show a declining trend that hits a low point near end of month
- CategoryBreakdown should show at least 2 categories in red (>90% of budget)
- At least 3 alerts generated after a fresh refresh

If any of these are not showing correctly, manually adjust the seed data or re-run the seed script before the hackathon presentation.

### 5.4 — Full Demo Run (3x)

Run the complete demo flow 3 times without touching anything outside the UI:

1. Open the app at the login page
2. Click "Demo Login" button — verify it auto-fills and submits
3. Dashboard loads — verify health score, risk card, forecast chart all show data within 3 seconds
4. Navigate to Transactions — verify anomaly badges visible
5. Navigate to Alerts — verify at least 3 alerts showing
6. Navigate to Chat — click the "What would happen if I cut my dining budget by 30%?" suggested prompt
7. Verify the response contains specific ₹ amounts and a health score estimate
8. Type "Show me my most suspicious transactions" — verify it returns actual merchant names
9. Navigate back to Dashboard — click "Refresh Analysis" — verify a toast appears and the alert bell increments

All 9 steps must complete without any console errors, broken UI, or awkward pauses (beyond the expected 3-8 second AI response time).

### 5.5 — Deployment (if time permits)

**Railway — Backend:**
- Create new Railway project
- Add backend as a service from the GitHub repo, set root to `/backend`
- Set all environment variables from backend/.env
- Set start command: `node server.js`

**Railway — AI Service:**
- Add a second service in the same Railway project, set root to `/ai-service`
- Set start command: `uvicorn main:app --host 0.0.0.0 --port 8000`
- Update `AI_SERVICE_URL` in backend environment variables to the Railway URL

**Vercel — Frontend:**
- Import project, set root to `/frontend`
- Set `VITE_API_URL` and `VITE_WS_URL` to the Railway backend URL
- Deploy

If deployment is causing issues and time is short, skip it. A localhost demo is perfectly acceptable for a hackathon. Never sacrifice demo stability for a deployed URL.

---

## Critical Rules for the Agent

1. **Never use placeholder or dummy data in any component.** Every number on screen must come from a real API call. Judges will ask questions about specific numbers they see — those numbers must be real.

2. **The health score and risk card are the most important visual elements.** If time is short, these must be perfect before anything else.

3. **The chat assistant must use tool calls.** A chat that just calls GPT-4o without tools and returns generic financial advice will not impress judges. Every response must pull real data from the database.

4. **Test the demo flow after every phase.** Do not wait until Phase 5 to discover something is broken.

5. **Use shadcn/ui components everywhere possible.** Do not write custom CSS for things shadcn already provides (buttons, cards, badges, progress bars, tabs). Time saved on UI is time spent on AI features.

6. **The Python AI service must never crash.** Every endpoint must have try/except with a meaningful fallback. A crashed AI service during the demo is a disqualification-level event.

7. **Socket.io alert pushes must work in the demo.** The moment a judge sees an alert pop up in real-time is worth more than any technical explanation. Wire this in Phase 3 and test it repeatedly.

8. **Every phase must be fully verified before starting the next.** Skipping verification and discovering broken foundations in Phase 4 wastes more time than verification takes.

---

## Pitch Narrative (For Presentation)

The agent does not write the pitch — this is for the human to deliver. But the product must support this exact story:

**Opening:** "Imagine you had a financial advisor who watched every transaction, never slept, and could tell you what's about to go wrong before it happens. That's SmartSpend."

**Screen 1 — Dashboard:** Point to health score first. "63 out of 100. rohan is financially stressed but doesn't know it yet. She's going to overspend by ₹6,800 this month."

**Screen 2 — Transactions:** "Every transaction is automatically understood. No manual tagging. Our AI categorized 300 transactions instantly. See this one? ₹11,400 at 2am at an unknown merchant — our anomaly detector caught it."

**Screen 3 — Forecast chart:** "This isn't history. This is the future. Without intervention, rohan hits near-zero by the 28th."

**Screen 4 — Chat (the wow moment):** Type "What would happen if I cut my dining budget by 30%?" Live tool calls, live data, specific ₹ amounts in the response. "The AI just ran a real simulation on rohan's actual data."

**Closing:** "We built a financial co-pilot that thinks alongside you. Not a dashboard — a co-pilot."

---

## File Reference Summary

| File | Phase | Purpose |
|---|---|---|
| `backend/server.js` | 1 | Main Express + Socket.io server |
| `backend/models/*.js` | 1 | All 5 Mongoose models |
| `backend/middleware/auth.js` | 1 | JWT verification middleware |
| `backend/routes/auth.js` | 1 | Register, login, me endpoints |
| `backend/routes/transactions.js` | 1 | Transaction CRUD + aggregation |
| `backend/routes/insights.js` | 1 | Insight fetch + refresh pipeline |
| `backend/routes/alerts.js` | 1 | Alert list + mark read |
| `backend/routes/chat.js` | 1 | GPT-4o agent with tool use |
| `backend/services/socketService.js` | 1 | Socket.io push service |
| `backend/services/aiService.js` | 1 | Python microservice HTTP client |
| `backend/scripts/seedDB.js` | 1 | MongoDB seeder from JSON |
| `ai-service/main.py` | 2 | Full FastAPI AI service |
| `frontend/src/lib/api.ts` | 3 | Axios instance + all API functions |
| `frontend/src/lib/socket.ts` | 3 | Socket.io client |
| `frontend/src/lib/utils.ts` | 3 | Formatting helpers |
| `frontend/src/store/useStore.ts` | 3 | Zustand global store |
| `frontend/src/App.tsx` | 3 | Router + protected routes |
| `frontend/src/components/layout/*` | 3 | Sidebar + TopBar |
| `frontend/src/pages/LoginPage.tsx` | 3 | Login with demo button |
| `frontend/src/pages/DashboardPage.tsx` | 3 | Main dashboard composition |
| `frontend/src/components/dashboard/*` | 3 | All 5 dashboard components |
| `frontend/src/pages/TransactionsPage.tsx` | 3 | Transaction list page |
| `frontend/src/pages/AlertsPage.tsx` | 4 | Alerts list page |
| `frontend/src/pages/ChatPage.tsx` | 4 | Chat interface page |
| `frontend/src/components/chat/*` | 4 | Chat panel + message bubble |
| `frontend/src/components/alerts/*` | 4 | Alerts panel component |

---

*End of SmartSpend AI Master Implementation Plan*
*Total estimated time: 5.5–6 hours of implementation + 0.5 hours demo rehearsal = 6–6.5 hours of the 8-hour window*
*Buffer: 1.5–2 hours for debugging, unexpected issues, and deployment*
