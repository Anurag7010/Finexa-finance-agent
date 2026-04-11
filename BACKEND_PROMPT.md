# SmartSpend AI — Backend Execution Prompt (Person A / Phase 1 + 2)

This is an addendum to the main kickoff prompt (`AGENT_KICKOFF_PROMPT.md`).
Read that file first, then read `SMARTSPEND_MASTER_PLAN.md`, then follow this document for Phase 1 and 2 execution detail.

---

## Your scope

You own everything in this list. Do not touch `frontend/` at all.

```
backend/
├── server.js
├── models/
│   ├── User.js
│   ├── Transaction.js
│   ├── Insight.js
│   ├── Alert.js
│   └── ChatMessage.js
├── routes/
│   ├── auth.js
│   ├── transactions.js
│   ├── insights.js
│   ├── alerts.js
│   └── chat.js
├── middleware/
│   └── auth.js
├── services/
│   ├── aiService.js
│   └── socketService.js
└── scripts/
    └── seedDB.js

ai-service/
└── main.py
```

---

## What is already in place

- `backend/package.json` exists with all dependencies defined
- `backend/.env` exists with real values: `MONGODB_URI`, `JWT_SECRET`, `OPENAI_API_KEY`, `AI_SERVICE_URL=http://localhost:8000`, `CLIENT_URL=http://localhost:5173`, `PORT=5000`
- `ai-service/.env` exists with `OPENAI_API_KEY`
- `ai-service/venv/` exists with all pip packages installed
- `ai-service/seed_data.json` exists with 600 transactions across two users
- `ai-service/requirements.txt` is frozen

**First commands to run before writing any code:**

```bash
# Install backend node dependencies
cd backend && npm install

# Confirm Python packages
cd ../ai-service && source venv/bin/activate && pip install -r requirements.txt
```

---

## Phase 1 — Backend execution order

Build files in exactly this order. Each file depends on the previous ones.

### Step 1 — Models (build all 5 before any routes)

Build in this order: `User.js` → `Transaction.js` → `Insight.js` → `Alert.js` → `ChatMessage.js`

**User.js critical details:**

- Password must be hashed in a Mongoose `pre('save')` hook using bcryptjs with salt rounds 10
- Add a `comparePassword(candidate)` instance method using `bcrypt.compare`
- `category_budgets` field is a `Map` type with `of: Number`
- Default category_budgets must include all 8 categories: Food & Dining, Transportation, Shopping, Entertainment, Utilities, Health, Groceries, Rent

**Transaction.js critical details:**

- `user_id` is `ObjectId` with `ref: 'User'`, marked as `index: true`
- Add a compound index: `{ user_id: 1, date: -1 }` — this makes the dashboard queries fast
- `channel` enum must be exactly: `['UPI', 'card', 'netbanking', 'cash', 'other']`
- `is_anomaly` defaults to `false`, `anomaly_score` defaults to `0`

**Insight.js critical details:**

- `forecast` is an array of objects with shape `{ date: Date, projected_balance: Number, projected_spend: Number }`
- `category_summary` is a `Map` type with `of: Number`
- `recommendations` is an array of objects with shape `{ category: String, message: String, potential_saving: Number }`
- `risk_factors` is a plain `[String]` array

**Alert.js critical details:**

- `type` enum must be exactly: `['overspend_pace', 'category_breach', 'anomaly', 'weekly_spike', 'nudge', 'risk_level']`
- `severity` enum: `['low', 'medium', 'high']`
- Both `category` and `amount` are nullable (no `required`)

**ChatMessage.js critical details:**

- `role` enum: `['user', 'assistant']` only
- `timestamp` defaults to `Date.now`

---

### Step 2 — Middleware

**middleware/auth.js:**

- Read `Authorization` header, split on space, take index 1 as token
- Verify with `jwt.verify(token, process.env.JWT_SECRET)`
- Attach `req.user = { id: decoded.id, email: decoded.email }`
- Return `401` with `{ error: 'No token provided' }` if header missing
- Return `401` with `{ error: 'Invalid or expired token' }` if verification fails

---

### Step 3 — Socket service

**services/socketService.js:**

- Maintain `const userSockets = new Map()` at module level (userId string → socketId string)
- `initSocket(io)` — sets up connection handler, registers `register` event listener, cleans up on disconnect
- `pushAlertToUser(userId, alert)` — looks up socketId from map, calls `io.to(socketId).emit('new_alert', alert)`
- `pushInsightUpdate(userId, insight)` — same pattern, emits `'insight_update'`
- Export all three functions

---

### Step 4 — AI service client

**services/aiService.js:**

- Uses `axios` to call `process.env.AI_SERVICE_URL`
- Export named async functions: `analyze`, `categorize`, `forecast`, `detectAnomalies`, `generateNudge`
- Each function wraps a specific POST endpoint on the Python service
- `analyze` sends: `{ user_id, transactions, monthly_budget, income, category_budgets }` — note `category_budgets` must be converted from Mongoose Map to plain object using `Object.fromEntries(user.category_budgets)` before sending

---

### Step 5 — Auth routes

**routes/auth.js:**

`POST /api/auth/register`:

- Check for duplicate email with `User.findOne({ email })` — return 400 if exists
- Create user with `User.create(...)` — the pre-save hook handles hashing
- Sign JWT: `jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' })`
- Return `{ token, user: { id, name, email, income, monthly_budget, category_budgets } }` — never return password field

`POST /api/auth/login`:

- Find user by email
- Call `user.comparePassword(password)` — return generic 401 on failure (do not say whether email or password was wrong)
- Sign JWT same as register
- Return same shape as register

`GET /api/auth/me` (protected):

- `User.findById(req.user.id).select('-password')`
- Return user object with `category_budgets: Object.fromEntries(user.category_budgets)`

---

### Step 6 — Transaction routes

**routes/transactions.js** — all routes use `authMiddleware`:

`GET /` — query params: `limit` (default 100), `skip` (default 0), `category`, `startDate`, `endDate`. Build query object dynamically. Return `{ transactions, total }`.

`GET /summary` — MongoDB aggregation pipeline:

```
$match: { user_id: ObjectId(req.user.id), date: { $gte: startOfMonth } }
$group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 }, avg: { $avg: '$amount' } }
$sort: { total: -1 }
```

Note: when constructing the ObjectId from `req.user.id` string use `mongoose.Types.ObjectId.createFromHexString(req.user.id)` — do not use `new mongoose.Types.ObjectId()` as it is deprecated.

`GET /anomalies` — `Transaction.find({ user_id: req.user.id, is_anomaly: true }).sort({ date: -1 }).limit(20)`

`POST /` — call `aiService.categorize(description, merchant, amount)` wrapped in try/catch (default to "Other" if it fails). Create and return transaction.

---

### Step 7 — Insights routes

**routes/insights.js** — this is the most complex route file:

`GET /` — `Insight.findOne({ user_id: req.user.id }).sort({ generated_at: -1 })`

`POST /refresh` — the full pipeline:

1. `User.findById(req.user.id)`
2. Fetch last 90 days: `Transaction.find({ user_id: req.user.id, date: { $gte: since } }).sort({ date: 1 })`
3. Call `aiService.analyze(req.user.id, transactions, user)` — pass raw transaction documents, the Python service handles serialization
4. `Insight.create({ user_id: req.user.id, ...analysis })` — spread the entire analysis response
5. Call `buildAlerts(req.user.id, analysis, user)` — returns array of alert objects
6. `Alert.insertMany(alertsToCreate)` if array is non-empty
7. Push each saved alert via `pushAlertToUser(req.user.id, alert)`
8. Push insight via `pushInsightUpdate(req.user.id, insight)`
9. Return `{ insight, alerts_generated: count }`

**`buildAlerts` helper function** (define in same file):

- Overspend pace: if `analysis.monthly_spend > (dayOfMonth/30) * user.monthly_budget * 1.15` → create alert type `overspend_pace` severity `high`
- Risk level: if `analysis.risk_level === 'high'` → create alert type `risk_level` severity `high`
- Category breaches: iterate `analysis.category_breaches` array → create alert type `category_breach` severity `medium` for each

`GET /forecast` — return `insight.forecast` from most recent insight

---

### Step 8 — Alerts routes

**routes/alerts.js** — straightforward:

- `GET /` → find + sort + limit 50 + count unread → return `{ alerts, unreadCount }`
- `PATCH /:id/read` → `findOneAndUpdate` with `{ user_id: req.user.id }` guard
- `PATCH /read-all` → `updateMany({ user_id: req.user.id, read: false }, { read: true })`

---

### Step 9 — Chat routes (most important)

**routes/chat.js** — this powers the entire AI assistant feature:

**Tool definitions array** — define all 5 tools with complete JSON schemas:

- `get_spending_summary` — parameter: `period` (enum string)
- `get_balance_forecast` — parameter: `days` (number)
- `get_risk_score` — no parameters
- `get_anomalies` — no parameters
- `simulate_scenario` — parameters: `category` (string), `adjustment_pct` (number)

**Tool execution function** `executeTool(toolName, args, userId)`:

Each case must query MongoDB directly and return a plain JS object:

- `get_spending_summary`: run the same aggregation as `/transactions/summary` but for the period specified in args. Map period strings to date ranges: `this_month` = start of current month, `last_30_days` = now minus 30 days, etc. Return `{ period, total_spend, breakdown: [{ category, amount, transactions }] }`

- `get_balance_forecast`: find latest Insight, return `insight.forecast.slice(0, days)` with currency field

- `get_risk_score`: find latest Insight, return `{ health_score, risk_level, risk_factors, monthly_spend, monthly_budget, overspend_amount, savings_rate }` — format savings_rate as percentage string

- `get_anomalies`: `Transaction.find({ user_id, is_anomaly: true }).sort({ date: -1 }).limit(10)` — map to `{ merchant, amount, category, date, channel }`

- `simulate_scenario`: find latest Insight + User, get `catSummary[args.category]` from insight, compute `adjustmentAmount = currentSpend * (pct/100)`, new monthly spend, new balance, annual saving, estimated health score delta. Return structured before/after object.

**`POST /` handler — agentic tool call loop:**

```
1. Save user message to ChatMessage
2. Fetch last 10 ChatMessages, reverse to chronological order
3. Fetch latest Insight for system context
4. Build system prompt with user's name, income, budget, health score, risk level, monthly spend, top category
5. First OpenAI call: model 'gpt-4o', messages: [system, ...history], tools, tool_choice: 'auto', max_tokens: 1000
6. While response has tool_calls:
   a. Execute each tool call in parallel with Promise.all
   b. Build tool result messages with role: 'tool', tool_call_id, content: JSON.stringify(result)
   c. Append assistant message + tool results to message array
   d. Make another OpenAI call with full updated message array
   e. Get new assistantMessage
7. Save final assistant content to ChatMessage
8. Return { reply: finalContent }
```

Critical: the OpenAI client must be initialized as `new OpenAI({ apiKey: process.env.OPENAI_API_KEY })` at the top of the file, outside the route handler.

---

### Step 10 — Main server

**server.js build order:**

1. `require('dotenv').config()` — must be the very first line
2. Create express app
3. Create `http.createServer(app)`
4. Create Socket.io server attached to httpServer with CORS config
5. Call `initSocket(io)` immediately
6. Apply middleware: `cors({ origin: process.env.CLIENT_URL })`, `express.json()`
7. Mount all 5 route files
8. Add `GET /health` returning `{ status: 'ok', timestamp: new Date() }`
9. Connect mongoose, then start `httpServer.listen` inside the `.then()` callback

---

### Step 11 — Seed script

**scripts/seedDB.js:**

- Load `.env` using `require('dotenv').config({ path: path.join(__dirname, '../.env') })`
- Read `../../ai-service/seed_data.json`
- For each user in `data.users`: delete existing by email, create fresh user
- For each transaction where `t.user_id === userData.id`: map to MongoDB document with the new `user._id`
- Set `anomaly_score` on each: `is_anomaly ? Math.random() * 0.4 + 0.6 : Math.random() * 0.3`
- `Transaction.insertMany(userTxns)` in bulk
- Add `"seed": "node scripts/seedDB.js"` to package.json scripts
- Log: `"Demo login: demo@smartspend.ai / demo1234"`

---

## Phase 1 verification sequence

Run these in order. Do not move to Phase 2 until all pass.

```bash
# Start the server
cd backend && npm run dev

# 1. Health check
curl http://localhost:5000/health
# Expected: { "status": "ok", "timestamp": "..." }

# 2. Seed the database
npm run seed
# Expected: "Created user: demo@smartspend.ai" + "Inserted 300 transactions"

# 3. Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@smartspend.ai","password":"demo1234"}'
# Expected: { "token": "eyJ...", "user": { "name": "Rohan Sharma", ... } }

# Save the token from above response, then:
export TOKEN="eyJ..."

# 4. Get transactions
curl http://localhost:5000/api/transactions \
  -H "Authorization: Bearer $TOKEN"
# Expected: { "transactions": [...300 items...], "total": 300 }

# 5. Get transaction summary
curl http://localhost:5000/api/transactions/summary \
  -H "Authorization: Bearer $TOKEN"
# Expected: { "summary": [...categories...], "totalSpend": ... }

# 6. Get anomalies
curl http://localhost:5000/api/transactions/anomalies \
  -H "Authorization: Bearer $TOKEN"
# Expected: { "anomalies": [...8 flagged transactions...] }

# 7. Get alerts (empty is fine at this point)
curl http://localhost:5000/api/alerts \
  -H "Authorization: Bearer $TOKEN"
# Expected: { "alerts": [], "unreadCount": 0 }
```

When all 7 pass, notify Person B1 that login and transactions are live — they can start wiring real data immediately.

Then move to Phase 2 (Python AI service). After Phase 2 is done, run:

```bash
# 8. Trigger insight refresh (requires Python service running on port 8000)
curl -X POST http://localhost:5000/api/insights/refresh \
  -H "Authorization: Bearer $TOKEN"
# Expected: { "insight": { "health_score": 42-65, "risk_level": "high"/"medium", ... }, "alerts_generated": 2-4 }

# 9. Get insights
curl http://localhost:5000/api/insights \
  -H "Authorization: Bearer $TOKEN"
# Expected: insight object with health_score, forecast array of 30 items, category_summary

# 10. Test chat (requires insight to exist)
curl -X POST http://localhost:5000/api/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"What is my current risk level?"}'
# Expected: { "reply": "..." } — reply must contain specific numbers from Rohan's data
```

All 10 checks passing = Phase 1 + 2 complete. Notify the team.

---

## Common mistakes to avoid

- Never use `new mongoose.Types.ObjectId(str)` — use `mongoose.Types.ObjectId.createFromHexString(str)` for converting string IDs in aggregation pipelines
- Never return the `password` field from any user query — always `.select('-password')` or manually exclude it
- Always call `Object.fromEntries(user.category_budgets)` before sending the Map to the Python service or to the frontend — Mongoose Maps do not serialize to plain JSON automatically
- The `initSocket(io)` call must happen before `mongoose.connect()` — socket setup is synchronous, DB connection is async
- In the chat agentic loop, append both the assistant's tool_call message AND the tool results to the messages array before the next API call — missing either breaks the loop
- Wrap the entire chat handler in try/catch — a crashed chat route during the demo is catastrophic
