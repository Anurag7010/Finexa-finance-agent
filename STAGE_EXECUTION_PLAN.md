# STAGE_EXECUTION_PLAN.md

# Finexa — 4-Stage Production Upgrade Execution Plan

---

## Pre-Stage Requirements

Before any stage begins, confirm:

- All existing services start without errors (`backend`, `ai-service`, `frontend`)
- Demo login works end-to-end (`demo@smartspend.ai / demo1234`)
- Chat returns data-grounded responses with real ₹ amounts
- Health score for Priya is in 42-65 range
- `git status` is clean — commit all current work before starting Stage 1

---

# Stage 1 — Production Infrastructure Foundation

## Objective

Transform the engineering backbone from "works locally" to "deployable in production." Add async job processing, Redis pub/sub, rate limiting, structured logging, Docker, and environment separation. This stage has zero new product features — it is pure infrastructure hardening.

## Why This Stage First

Every Stage 2+ feature (proactive alerts, background AI analysis, subscription detection) requires async job processing. Building features on a synchronous blocking architecture creates technical debt that is extremely painful to refactor later. Infrastructure first is the senior engineering decision.

## Features Included

- BullMQ job queue backed by Redis for all async AI operations
- Background worker process for proactive insight refresh (runs every 6 hours per user)
- Redis pub/sub replacing direct Socket.io calls (decouples alert generation from websocket server)
- Rate limiting on all API endpoints (express-rate-limit + Redis store)
- Structured JSON logging with Pino (replaces console.log everywhere)
- OpenTelemetry tracing setup (traces span from HTTP request through DB query through AI call)
- Docker + docker-compose for local multi-service orchestration
- Environment separation (.env.development, .env.production, .env.test)
- Health check endpoints upgraded with dependency status (DB, Redis, AI service)

## Files Affected (Existing)

- `backend/server.js` — add Pino logger, rate limiter, upgraded health check
- `backend/routes/insights.js` — replace synchronous refresh with queue job dispatch
- `backend/services/socketService.js` — replace direct emit with Redis pub/sub publish
- `backend/services/aiService.js` — add retry logic with exponential backoff
- `backend/.env` — add new infrastructure variables

## New Files to Create

```
backend/
├── workers/
│   ├── insightWorker.js        ← BullMQ worker: processes insight refresh jobs
│   ├── alertWorker.js          ← BullMQ worker: processes alert generation jobs
│   └── index.js                ← starts all workers as a separate process
├── queues/
│   ├── insightQueue.js         ← BullMQ queue definition for insight jobs
│   └── alertQueue.js           ← BullMQ queue definition for alert jobs
├── middleware/
│   ├── rateLimiter.js          ← express-rate-limit configs per route type
│   └── requestLogger.js        ← Pino HTTP request logging middleware
├── lib/
│   ├── logger.js               ← Pino logger instance (used everywhere)
│   ├── redis.js                ← ioredis client singleton
│   └── tracing.js              ← OpenTelemetry setup
└── config/
    └── env.js                  ← validated environment config (zod schema)

docker/
├── Dockerfile.backend
├── Dockerfile.ai-service
├── Dockerfile.frontend
└── docker-compose.yml

.env.development
.env.production.example
.env.test
```

## Backend Changes

**Queue setup (BullMQ + Redis):**

```
npm install bullmq ioredis pino pino-http express-rate-limit rate-limit-redis zod
npm install @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
```

**`backend/queues/insightQueue.js`:**

- Create a BullMQ Queue named `insight-refresh`
- Default job options: attempts 3, backoff exponential 2000ms, removeOnComplete 100, removeOnFail 50

**`backend/queues/alertQueue.js`:**

- Create a BullMQ Queue named `alert-generation`
- Same retry config

**`backend/workers/insightWorker.js`:**

- BullMQ Worker consuming `insight-refresh` queue
- Job data: `{ userId, triggeredBy: 'scheduled' | 'manual' }`
- Worker logic: fetch user + last 90 days transactions → call aiService.analyze → save Insight → call buildAlerts → save Alerts → publish to Redis pub/sub channel `alerts:{userId}`
- Log job start, completion, and errors with Pino

**`backend/workers/alertWorker.js`:**

- BullMQ Worker consuming `alert-generation` queue
- Job data: `{ userId, analysisResult }`
- Worker logic: buildAlerts from analysis → save → publish to Redis

**`backend/workers/index.js`:**

- Entry point that starts insightWorker and alertWorker
- Add to `package.json` scripts: `"workers": "node workers/index.js"`

**Rate limiting (`middleware/rateLimiter.js`):**

- Auth routes: 10 requests per 15 minutes per IP
- Chat routes: 30 requests per minute per authenticated user (use userId as key)
- Insights refresh: 5 requests per minute per user
- General API: 200 requests per minute per IP
- Use Redis store for rate limit counters (so limits work across multiple server instances)

**Structured logging (`lib/logger.js`):**

- Pino logger with level from env (debug in development, info in production)
- Include service name, version, environment in every log line
- Replace all `console.log`, `console.error`, `console.warn` in backend with `logger.info`, `logger.error`, `logger.warn`

**Upgraded `/health` endpoint:**

```javascript
GET /health → {
  status: 'ok' | 'degraded',
  timestamp: ISO string,
  dependencies: {
    mongodb: 'connected' | 'disconnected',
    redis: 'connected' | 'disconnected',
    aiService: 'reachable' | 'unreachable'
  },
  version: '2.0.0',
  uptime: seconds
}
```

**`config/env.js` — zod-validated environment:**

- Define zod schema for all required env variables
- Throw a clear error at startup if any required variable is missing
- Export typed config object used everywhere instead of `process.env.X` directly

## Frontend Changes

- None in Stage 1. Frontend is untouched.

## Database Changes

- No schema changes in Stage 1.
- Add a `job_logs` collection (optional, for BullMQ job audit if needed)

## AI Changes

- Add retry logic with exponential backoff to all `aiService.js` HTTP calls (use axios-retry)
- Add request timeout of 30 seconds on all Python service calls

## Infrastructure Changes

**`docker/Dockerfile.backend`:**

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["node", "server.js"]
```

**`docker/Dockerfile.ai-service`:**

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**`docker/docker-compose.yml`:**

- Services: mongodb, redis, backend, ai-service, frontend, workers
- Backend depends_on: mongodb, redis, ai-service
- Workers depends_on: mongodb, redis, ai-service
- Health checks on all services
- Volumes for MongoDB data persistence
- Environment loaded from .env.development

## Testing Checklist

- [ ] `docker-compose up` starts all 6 services without errors
- [ ] `curl http://localhost:5000/health` returns all dependencies as connected
- [ ] Rate limiter blocks the 31st chat request within a minute
- [ ] Insight refresh job is dispatched to BullMQ queue instead of running synchronously
- [ ] BullMQ worker picks up the job and processes it (check Redis for job status)
- [ ] Redis pub/sub publishes alert — Socket.io receives it and pushes to browser
- [ ] Pino logs appear in JSON format in terminal
- [ ] `node config/env.js` throws a clear error if MONGODB_URI is removed from .env

## Verification Checklist

- [ ] Full demo flow works end-to-end (login → dashboard → chat) with no regressions
- [ ] Health score still in 42-65 range for Priya
- [ ] Chat still returns data-grounded responses
- [ ] Socket.io alerts still push to browser within 3 seconds of refresh
- [ ] All rate limit headers present in API responses (X-RateLimit-Remaining etc.)
- [ ] `docker-compose up` and demo works entirely inside Docker

## Rollback Strategy

Stage 1 is purely additive — no existing files are deleted, only modified. If rollback is needed:

- Remove new middleware from `server.js` (rate limiter, request logger)
- Revert `insights.js` to synchronous refresh (remove queue dispatch, restore direct call)
- Revert `socketService.js` to direct emit (remove pub/sub)
- All queue/worker/docker files can be deleted without affecting existing functionality

## Completion Criteria

All testing and verification checklists pass. `git commit -m "stage1: production infrastructure"` committed.

---

# Stage 2 — Financial Intelligence Upgrade

## Objective

Transform Finexa from a diagnostic tool into a prescriptive Personal CFO. Add goal-setting, subscription detection, recurring expense intelligence, proactive alert engine, multi-month trend memory, and a genuinely context-aware chat assistant.

## Why This Stage Second

Stage 1's job queue is required for the proactive alert engine (background scheduled jobs). Stage 1's Redis pub/sub is required for real-time CFO nudges. Stage 1's structured logging is required for debugging the new AI features. Stage 2 is only safe to build on top of Stage 1.

## Features Included

- **Financial Goal System** — create/track/project savings goals with feasibility scores
- **Subscription Detection Engine** — automatic recurring charge detection and classification
- **Recurring Expense Intelligence** — identify, track, and forecast fixed monthly expenses
- **Proactive Alert Engine** — background workers that trigger alerts without user action
- **CFO Chat Memory** — persistent semantic memory across sessions using embeddings
- **Multi-Month Trend Analysis** — 6-month spending trend data powering the AI context
- **Smart Monthly Planning** — AI generates a month-ahead spending plan on the 1st of each month
- **Behavioral Pattern Learning** — detect spending spikes correlated with day-of-week/events

## New Files to Create

```
backend/
├── models/
│   ├── Goal.js                 ← savings goal schema
│   ├── Subscription.js         ← detected subscription schema
│   └── Memory.js               ← CFO chat memory schema (embeddings)
├── routes/
│   ├── goals.js                ← CRUD + progress + feasibility endpoints
│   └── subscriptions.js        ← subscription list + dismiss + track
├── services/
│   ├── subscriptionDetector.js ← recurring charge detection algorithm
│   ├── goalEngine.js           ← feasibility scoring + projection math
│   └── memoryService.js        ← embedding generation + similarity search
└── workers/
    ├── proactiveAlertWorker.js ← scheduled: runs every 6h, checks all users
    └── monthlyPlanWorker.js    ← scheduled: runs on 1st of month, generates plan

ai-service/
├── memory.py                   ← embedding endpoints for chat memory
└── cfo_insights.py             ← CFO-grade analysis endpoints

frontend/src/
├── pages/
│   ├── GoalsPage.tsx
│   └── SubscriptionsPage.tsx
└── components/
    ├── goals/
    │   ├── GoalCard.tsx
    │   ├── GoalForm.tsx
    │   └── GoalProgress.tsx
    └── subscriptions/
        ├── SubscriptionList.tsx
        └── SubscriptionCard.tsx
```

## Backend Changes

**`backend/models/Goal.js`:**

```
Fields: user_id, name, target_amount, current_amount, deadline, category (emergency/vacation/device/custom),
monthly_contribution_needed, feasibility_score (0-100), status (active/achieved/at_risk/paused),
ai_plan (text), created_at, updated_at
```

**`backend/models/Subscription.js`:**

```
Fields: user_id, merchant, amount, frequency (weekly/monthly/annual), detected_at,
last_charge_date, next_predicted_date, category, is_confirmed, is_dismissed, annual_cost
```

**`backend/models/Memory.js`:**

```
Fields: user_id, content (text chunk), embedding (array of floats), source (chat/insight/goal),
created_at, relevance_score
```

**`backend/routes/goals.js`:**

- `GET /api/goals` — list all goals for user with progress calculation
- `POST /api/goals` — create goal, immediately compute feasibility score
- `PATCH /api/goals/:id` — update target/deadline/contribution
- `DELETE /api/goals/:id` — soft delete
- `GET /api/goals/:id/projection` — AI-generated projection and monthly plan
- `POST /api/goals/:id/contribute` — manually log a contribution

**Goal feasibility score formula (`goalEngine.js`):**

```
monthly_available = income - current_monthly_spend
months_to_deadline = months between now and deadline
total_needed = target_amount - current_amount
required_monthly = total_needed / months_to_deadline
feasibility_ratio = monthly_available / required_monthly
score = clamp(feasibility_ratio * 80, 0, 100)
add 10 if user has consistent positive savings history
subtract 10 if risk_level is 'high'
```

**`backend/routes/subscriptions.js`:**

- `GET /api/subscriptions` — list detected subscriptions with annual cost total
- `POST /api/subscriptions/:id/confirm` — user confirms detection is correct
- `POST /api/subscriptions/:id/dismiss` — user dismisses as not a subscription
- `GET /api/subscriptions/total` — total monthly + annual subscription burn

**Subscription detection algorithm (`subscriptionDetector.js`):**

```
1. Group transactions by merchant name (normalized — lowercase, strip spaces)
2. For each merchant with 2+ transactions:
   a. Compute intervals between transaction dates
   b. If median interval is 28-31 days → monthly subscription
   c. If median interval is 6-8 days → weekly subscription
   d. If amounts are within 5% of each other → high confidence
3. Confidence score: amount_consistency (40%) + interval_consistency (40%) + known_subscription_merchant (20%)
4. Flag as subscription if confidence > 0.70
5. Predict next charge date = last_charge + median_interval
```

Known subscription merchants list (seed): Netflix, Spotify, Amazon Prime, Hotstar, Zee5, YouTube Premium, LinkedIn Premium, Notion, Figma, GitHub, Swiggy One, Zomato Gold.

**CFO Chat Memory (`memoryService.js`):**

- `storeMemory(userId, content, source)` — generate embedding via OpenAI `text-embedding-3-small`, store in Memory collection
- `retrieveRelevantMemory(userId, query, topK=5)` — embed the query, cosine similarity search against stored memories, return top K
- Store memories for: significant insights (health score changes), goal milestones, user-expressed preferences in chat ("I want to save for a bike"), detected behavioral patterns
- Inject top 3 relevant memories into every chat system prompt

**Proactive Alert Worker (`proactiveAlertWorker.js`):**

- Runs every 6 hours via BullMQ scheduled repeat jobs
- For each active user (last login within 30 days):
  - Check if monthly spend pace is >15% over expected → queue alert
  - Check if any subscription charges in next 3 days → queue reminder alert
  - Check if any goal is at risk (feasibility score dropped below 40) → queue alert
  - Check for new anomalies since last check → queue alert
- All alerts generated here have source: 'proactive'

**Monthly Plan Worker (`monthlyPlanWorker.js`):**

- Runs on the 1st of every month at 9am IST
- For each active user: call GPT-4o with last 3 months of spending summary + goals + income
- Generate a structured monthly budget plan: category-level recommended spending + priority actions
- Store as a special Insight document with type: 'monthly_plan'
- Push to user via Socket.io + store as a high-priority alert

## Frontend Changes

**Sidebar:** Add "Goals" nav item (target icon) and "Subscriptions" nav item (repeat icon).

**`GoalsPage.tsx`:**

- List of goal cards with circular progress rings
- "Add Goal" button → GoalForm modal
- Each card: goal name, progress bar, ₹ current / ₹ target, deadline countdown, feasibility badge (green/amber/red), monthly contribution needed
- Clicking a goal: shows GoalProgress detail view with AI-generated plan

**`GoalForm.tsx`:**

- Fields: goal name, target amount (₹ input), deadline (date picker), category selector
- On submit: POST /api/goals → immediately shows feasibility score
- If feasibility < 40: show warning "This goal may be difficult to reach. Consider extending the deadline."

**`GoalProgress.tsx`:**

- Recharts RadialBarChart showing progress
- Timeline showing projected completion date
- Monthly contribution tracker (last 3 months)
- AI plan text rendered as formatted markdown
- "Mark contribution" button

**`SubscriptionsPage.tsx`:**

- Total monthly subscription burn (large number, top of page)
- Total annual cost projection
- List of detected subscriptions: merchant logo placeholder, name, amount, frequency, next charge date, confirm/dismiss buttons
- "Confirmed" vs "Detected" tabs
- Empty state: "No recurring charges detected yet"

**Dashboard additions:**

- Add a "Goals Summary" widget to the right column: shows top 2 goals with mini progress bars
- Add a "Subscriptions" widget: shows total monthly subscription burn + count

**Chat page additions:**

- Add 2 more suggested prompts for new features:
  - "Am I on track for my savings goals?"
  - "What subscriptions am I wasting money on?"

## Database Changes

New collections: `goals`, `subscriptions`, `memories`

Add index: `memories` collection needs a vector index for embedding similarity search. Since MongoDB Atlas free tier does not support vector search, implement cosine similarity in application code using lodash. For production, note that Atlas M10+ supports $vectorSearch.

Add to existing `Transaction` model: `is_recurring` (Boolean, default false), `subscription_id` (ObjectId ref Subscription, nullable).

## AI Changes

**New AI service endpoints (`ai-service/cfo_insights.py`):**

`POST /cfo-analysis` — takes 6 months of transaction data + goals + subscriptions, returns CFO-grade insight object:

```json
{
  "wasteful_expenses": [...],
  "subscription_recommendations": [...],
  "goal_feasibility_notes": [...],
  "behavioral_patterns": [...],
  "monthly_plan": {...},
  "coaching_message": "string"
}
```

`POST /goal-plan` — takes goal + user financial data, returns structured savings plan with monthly milestones.

`POST /embed` — takes text, returns OpenAI embedding vector (used by memoryService.js).

**Chat route upgrades (`backend/routes/chat.js`):**

- Before building system prompt: call `memoryService.retrieveRelevantMemory(userId, message, 3)`
- Inject retrieved memories into system prompt: "Relevant context from past conversations: ..."
- Add 2 new tools: `get_goals_status` and `get_subscriptions_summary`
- After each chat response: extract any user-stated preferences or goals → call `memoryService.storeMemory`

## Testing Checklist

- [ ] Create a goal → feasibility score is computed and returned
- [ ] Subscription detector runs on Priya's transactions → finds at least 2 recurring charges
- [ ] Proactive alert worker runs and generates at least 1 alert for Priya without any user action
- [ ] Monthly plan worker generates a structured plan document
- [ ] Chat: "Am I on track for my savings goals?" calls `get_goals_status` tool and returns real data
- [ ] Memory service stores a memory after a chat about goals
- [ ] Memory is retrieved and injected in next relevant chat message
- [ ] Goal progress updates when a contribution is manually logged

## Verification Checklist

- [ ] All Stage 1 functionality still works (demo login, dashboard, chat tool calls)
- [ ] Goals page shows goal cards with progress rings and feasibility badges
- [ ] Subscriptions page shows detected recurring charges for Priya
- [ ] Proactive alerts appear in the alerts panel without the user clicking Refresh Analysis
- [ ] Chat memory makes the assistant remember "I want to save for a bike" in the next session
- [ ] Dashboard shows Goals Summary and Subscriptions widgets

## Rollback Strategy

All Stage 2 additions are new routes and new models. Rolling back means: removing `goals.js` and `subscriptions.js` from server.js routes, stopping proactive/monthly workers, removing the new model files. No existing models are modified except Transaction (add 2 nullable fields — safe to leave).

## Completion Criteria

All checklists pass. `git commit -m "stage2: financial intelligence upgrade"` committed.

---

# Stage 3 — Live Data Integration Layer

## Objective

Add a production-style bank data integration framework. Implement India's Account Aggregator (AA) framework as a mock connector, UPI app transaction sync simulation, manual income/salary input, and a data source management dashboard. The existing seed data system must remain fully working alongside the new connectors.

## Why This Stage Third

Stage 3 requires the goal and subscription systems from Stage 2 to populate correctly from real/simulated bank data. The infrastructure from Stage 1 (queues, workers) handles the async sync jobs safely.

## Features Included

- **Account Aggregator Framework** — mock AA connector with consent flow simulation
- **UPI App Connectors** — Google Pay, PhonePe simulation with webhook-style transaction push
- **Manual Sync Mode** — CSV upload for bank statements, Excel import
- **Data Source Dashboard** — manage connected accounts, sync status, last updated
- **Recurring Income Detection** — identify salary credits, freelance payments
- **Multi-Account Aggregation** — multiple bank accounts in one dashboard
- **Sync Job System** — background sync jobs with status tracking

## New Files to Create

```
backend/
├── models/
│   ├── DataSource.js           ← connected account/connector schema
│   ├── SyncJob.js              ← sync job status tracking
│   └── BankAccount.js          ← linked bank account metadata
├── routes/
│   ├── dataSources.js          ← connector management endpoints
│   └── sync.js                 ← trigger sync, check status, import CSV
├── services/
│   ├── connectors/
│   │   ├── accountAggregator.js ← AA mock connector
│   │   ├── upiConnector.js      ← UPI webhook simulation
│   │   └── csvParser.js         ← bank statement CSV parser
│   └── syncService.js          ← orchestrates sync jobs across connectors
└── workers/
    └── syncWorker.js           ← processes sync jobs from queue

frontend/src/
├── pages/
│   └── DataSourcesPage.tsx
└── components/
    └── datasources/
        ├── ConnectorCard.tsx
        ├── SyncStatus.tsx
        └── CSVImportModal.tsx
```

## Backend Changes

**`backend/models/DataSource.js`:**

```
Fields: user_id, type (account_aggregator/upi_gpay/upi_phonepe/csv/manual/seed),
status (connected/syncing/error/disconnected), last_sync_at, account_name,
masked_account_number, bank_name, consent_valid_until, metadata (JSON)
```

**`backend/models/SyncJob.js`:**

```
Fields: user_id, data_source_id, status (pending/running/completed/failed),
transactions_imported, transactions_skipped (duplicates), error_message,
started_at, completed_at
```

**Account Aggregator mock connector (`connectors/accountAggregator.js`):**

```
Simulates the AA consent + data fetch flow:
1. POST /api/datasources/aa/initiate-consent → returns mock consent URL + consent_id
2. GET /api/datasources/aa/consent-status/:id → returns 'pending' → then 'approved' after 3 seconds
3. POST /api/datasources/aa/fetch-data → returns mock transaction array in AA FIP format
   (AA format: txnId, amount, currency, narration, valueDate, mode, type)
4. syncService transforms AA format → internal Transaction format
5. Deduplication: skip transactions with same date+amount+merchant already in DB
```

**UPI connector simulation (`connectors/upiConnector.js`):**

```
Simulates UPI app transaction export:
1. GET /api/datasources/upi/connect?provider=gpay|phonepe → mock OAuth redirect simulation
2. POST /api/datasources/upi/webhook → accepts UPI transaction push (used in demo to simulate live transaction)
3. Transforms UPI format (payeeName, payeeVpa, amount, transactionId, timestamp) → Transaction
4. Auto-categorizes using existing /categorize-batch endpoint
```

**CSV Parser (`connectors/csvParser.js`):**

```
Accepts: HDFC, ICICI, SBI, Axis, Kotak statement CSV formats
Each bank has a column mapping definition:
  HDFC: Date, Narration, Value Dat, Debit Amount, Credit Amount, Chq./Ref.No., Closing Balance
  ICICI: Transaction Date, Value Date, Description, Ref No., Debit, Credit, Balance
Auto-detects bank format from column headers
Transforms to internal Transaction format
Returns: { imported, skipped, errors }
```

**`backend/routes/sync.js`:**

- `POST /api/sync/trigger/:sourceId` — enqueue a sync job for a data source
- `GET /api/sync/status/:jobId` — poll sync job status
- `POST /api/sync/csv-import` — multipart upload, parse CSV, import transactions
- `GET /api/sync/history` — list recent sync jobs for user

**`backend/routes/dataSources.js`:**

- `GET /api/datasources` — list all connected sources for user
- `POST /api/datasources/connect` — connect a new source (type + credentials)
- `DELETE /api/datasources/:id` — disconnect a source
- `GET /api/datasources/:id/status` — real-time sync status

**Deduplication logic (in syncService.js):**

- Before inserting any imported transaction, check: does a Transaction exist with same user_id + date (within 1 day) + amount (within 1%) + merchant (fuzzy match >80% similarity)?
- If yes → skip (log as duplicate)
- If no → insert

**Seed data source:**

- On user creation, automatically create a DataSource record with type: 'seed', status: 'connected'
- This ensures the data source dashboard always shows at least one connected source
- Seed connector is non-deletable

## Frontend Changes

**`DataSourcesPage.tsx`:**

- Header: "Connected Accounts" + "Add Account" button
- Grid of ConnectorCard components
- Each card: bank/app logo, account name (masked), last sync time, transaction count, sync status badge, "Sync Now" button, "Disconnect" button
- Seed data card always present: "Demo Data — Finexaxxs Seed" with a "seed" badge

**`ConnectorCard.tsx`:**

- Shows connector type with logo placeholder
- Status badge: green "Connected" / amber "Syncing..." with spinner / red "Error"
- Last synced: relative time ("2 hours ago")
- Transactions imported count

**`CSVImportModal.tsx`:**

- Drag-and-drop or file picker
- Bank auto-detection from column headers
- Preview: shows first 5 rows after parse
- Import button → shows progress → completion summary (X imported, Y skipped as duplicates)

**`SyncStatus.tsx`:**

- Real-time sync job status component
- Polls `GET /api/sync/status/:jobId` every 2 seconds
- Shows: "Fetching transactions...", "Categorizing 47 transactions...", "Done — 47 imported, 3 skipped"

**Dashboard changes:**

- Add "Data Sources" widget to the stats row (4 → 5 tiles or replace Remaining Budget with data source count)
- "Last synced" timestamp shown subtly below the dashboard title

**Sidebar:** Add "Accounts" nav item (database icon).

## Database Changes

New collections: `datasources`, `syncjobs`, `bankaccounts`

Add to Transaction model: `source` field (enum: seed/account_aggregator/upi_gpay/upi_phonepe/csv/manual), `external_id` (string, the ID from the source system for deduplication), `raw_data` (JSON, original format stored for audit).

## AI Changes

No new AI endpoints in Stage 3. Existing categorize-batch endpoint is used by sync service for auto-categorization of imported transactions.

Update chat tool `get_spending_summary` to include a `source` breakdown — how much came from each connected data source.

## Testing Checklist

- [ ] AA mock consent flow completes: initiate → status pending → status approved → fetch data
- [ ] Fetched AA transactions are imported, categorized, and appear in transaction list
- [ ] UPI webhook endpoint accepts a test transaction and it appears in the dashboard within 5 seconds
- [ ] CSV import: upload an HDFC sample CSV → correct column mapping detected → transactions imported
- [ ] Deduplication: import the same CSV twice → second import shows 0 imported, all skipped
- [ ] Seed data source card always present on data sources page
- [ ] Sync job status polling shows real-time progress

## Verification Checklist

- [ ] All Stage 1 and Stage 2 functionality still works
- [ ] Data Sources page shows at least the seed connector
- [ ] Connecting AA mock connector imports transactions that appear in the transaction list
- [ ] Dashboard shows "Last synced" timestamp that updates after a sync
- [ ] Chat: asking about spending includes data from imported transactions, not just seed data

## Rollback Strategy

All Stage 3 additions are new routes and new models. Rolling back: remove datasources.js and sync.js from server.js routes, stop syncWorker. Transaction model additions (source, external_id, raw_data) are nullable — existing transactions unaffected.

## Completion Criteria

All checklists pass. `git commit -m "stage3: live data integration layer"` committed.

---

# Stage 4 — Polish, Testing, and Portfolio Presentation

## Objective

Make the project recruiter-ready, technically auditable, and publicly showcaseable. Add a comprehensive test suite, professional README, API documentation, accessibility improvements, mobile responsiveness, performance optimization, security hardening, and live deployment.

## Why This Stage Last

Testing and documentation are most valuable when the feature set is stable. Writing tests for unstable features wastes time. Stage 4 assumes Stages 1-3 are complete and stable.

## Features Included

- Jest + Supertest test suite for all backend API routes
- Pytest test suite for all Python AI service endpoints
- Vitest + React Testing Library for critical frontend flows
- Professional README with architecture diagram (Mermaid)
- OpenAPI documentation (auto-generated + annotated)
- Accessibility pass (aria-labels, keyboard navigation, focus management)
- Mobile responsive layout (768px breakpoint)
- Performance optimization (React.memo, useMemo, lazy loading, image optimization)
- Security hardening (Helmet, CORS tightening, input sanitization, SQL injection equivalent protection)
- GitHub Actions CI/CD pipeline
- Railway one-click deployment configuration
- Vercel deployment configuration for frontend
- Lighthouse score optimization (target: >90 performance, >90 accessibility)
- Environment variable documentation

## New Files to Create

```
backend/
└── tests/
    ├── auth.test.js
    ├── transactions.test.js
    ├── insights.test.js
    ├── goals.test.js
    ├── chat.test.js
    └── setup.js

ai-service/
└── tests/
    ├── test_analyze.py
    ├── test_categorize.py
    ├── test_anomalies.py
    └── test_cfo_insights.py

frontend/
└── src/tests/
    ├── LoginPage.test.tsx
    ├── Dashboard.test.tsx
    └── ChatPanel.test.tsx

.github/
└── workflows/
    ├── ci.yml                  ← runs tests on every PR
    └── deploy.yml              ← deploys on merge to main

docs/
├── API.md                      ← full API reference
├── ARCHITECTURE.md             ← system design doc
└── CONTRIBUTING.md             ← contribution guide

README.md                       ← professional README (replace default)
SECURITY.md                     ← security policy
railway.toml                    ← Railway deployment config
vercel.json                     ← Vercel deployment config
```

## Backend Changes

**Security hardening:**

```
npm install helmet hpp express-mongo-sanitize xss-clean
```

- Add `helmet()` middleware (sets 15 security headers automatically)
- Add `express-mongo-sanitize()` (prevents MongoDB operator injection)
- Add `xss-clean` (sanitizes request body/query for XSS)
- Add `hpp()` (prevents HTTP parameter pollution)
- Tighten CORS: only allow specific origins from config, not `*`
- Add `Content-Security-Policy` header

**Test setup (`backend/tests/setup.js`):**

- Connect to test MongoDB (in-memory using `mongodb-memory-server`)
- Seed minimal test data before each test suite
- Clean up after each test

**`backend/tests/auth.test.js`:**

- POST /api/auth/register — success, duplicate email, missing fields
- POST /api/auth/login — success, wrong password, nonexistent email
- GET /api/auth/me — valid token, expired token, missing token

**`backend/tests/chat.test.js`:**

- POST /api/chat — mock OpenAI (jest.mock), verify tool dispatch
- Verify tool_choice is 'required' for data questions
- Verify tool_choice is 'auto' for non-data questions
- Verify conversation history is trimmed correctly

**Performance optimization (backend):**

- Add Redis cache for `GET /api/insights` with 5-minute TTL
- Add Redis cache for `GET /api/transactions/summary` with 2-minute TTL
- Cache invalidated on insight refresh or new transaction

## Frontend Changes

**Accessibility:**

- Add `aria-label` to all icon-only buttons (bell, send, clear, logout)
- Add `role="main"` to main content area
- Add `aria-current="page"` to active sidebar link
- Add `aria-live="polite"` to the alerts bell badge
- Ensure all form inputs have associated `<label>` elements
- Add keyboard navigation to the chat suggested prompt chips (Tab + Enter)
- Ensure health score gauge has `aria-valuenow`, `aria-valuemin`, `aria-valuemax`

**Mobile responsiveness (768px breakpoint):**

- Sidebar: collapses to an icon-only rail on mobile, burger menu to expand
- Dashboard: single column layout on mobile (stack all cards)
- Transaction rows: condense to 3 lines stacked (merchant + amount, category + date)
- Chat: full-screen on mobile, input pinned to bottom
- Goals page: single column card grid on mobile

**Performance:**

- Lazy load pages using `React.lazy` + `Suspense`
- `React.memo` on TransactionRow (renders 100+ times)
- `useMemo` on category breakdown sort computation
- `useCallback` on all event handlers passed as props
- Add `loading="lazy"` to any images

**`frontend/src/tests/LoginPage.test.tsx`:**

- Renders login form
- Demo login button fills credentials
- Shows error on failed login (mock API)
- Redirects to dashboard on success (mock API)

## Database Changes

No new collections. Add MongoDB indexes for performance:

- `transactions`: add index on `{ user_id: 1, category: 1, date: -1 }` for category filter queries
- `memories`: add index on `{ user_id: 1, created_at: -1 }` for memory retrieval
- `goals`: add index on `{ user_id: 1, status: 1 }`

## AI Changes

**Pytest test suite (`ai-service/tests/test_analyze.py`):**

- Test `/analyze` with 50 mock transactions → health_score in valid range
- Test `/analyze` with empty transactions → returns valid fallback
- Test `/categorize` with known merchants → correct categories
- Test `/anomalies` with < 10 transactions → returns empty gracefully
- Test all endpoints with malformed input → returns 422 with clear message

## Infrastructure Changes

**`/.github/workflows/ci.yml`:**

```yaml
name: CI
on: [pull_request]
jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "22" }
      - run: cd backend && npm ci && npm test
  test-ai-service:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - run: cd ai-service && pip install -r requirements.txt && pytest
  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - run: cd frontend && npm ci && npm test
```

**`railway.toml`:**

```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "node server.js"
healthcheckPath = "/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
```

**Professional `README.md` sections:**

1. Project banner (app screenshot)
2. One-line description
3. Feature list with emoji bullets
4. Architecture diagram (Mermaid)
5. Tech stack table
6. Quick start (3 commands)
7. Environment variables table
8. API documentation link
9. Demo credentials
10. Screenshots (dashboard, chat, goals)
11. Deployment guide (Railway + Vercel)
12. Contributing
13. License

**`docs/ARCHITECTURE.md`:**

- Mermaid system diagram showing: Browser → Vercel → Railway (Express + BullMQ + Workers) → MongoDB + Redis → FastAPI
- Data flow: transaction → sync worker → categorize → insight refresh queue → worker → AI service → insight saved → Redis pub/sub → Socket.io → browser
- Decision log: why FastAPI for AI, why BullMQ over plain setTimeout, why MongoDB over PostgreSQL

## Testing Checklist

- [ ] `npm test` in backend passes all tests with >80% coverage on routes
- [ ] `pytest` in ai-service passes all tests
- [ ] `npm test` in frontend passes LoginPage and Dashboard tests
- [ ] GitHub Actions CI workflow triggers on a test PR and all jobs pass
- [ ] Lighthouse score: >90 performance, >90 accessibility on Dashboard page
- [ ] Mobile layout (768px): all pages usable without horizontal scroll
- [ ] All icon-only buttons have aria-label (check with axe DevTools)
- [ ] `docker-compose up` still works end-to-end

## Verification Checklist

- [ ] All Stage 1, 2, 3 functionality still works
- [ ] README renders correctly on GitHub with architecture diagram
- [ ] Live URL accessible (Railway backend + Vercel frontend)
- [ ] API documentation accessible at /api-docs (Swagger UI from FastAPI)
- [ ] Test coverage badge shows in README
- [ ] Security headers present in production responses (check with securityheaders.com)

## Rollback Strategy

Stage 4 is entirely additive (tests, docs, configs). Nothing breaks if rolled back. Security middleware can be removed from server.js if it causes issues with existing functionality.

## Completion Criteria

All checklists pass. `git commit -m "stage4: production polish and portfolio presentation"` committed. Live URL shared.
