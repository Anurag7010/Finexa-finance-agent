# PRODUCTION_READINESS_CHECKLIST.md

# Finexa — Production Readiness Checklist

Each item is tagged with: [STAGE] when it should be completed, and [BLOCKER] if it must be done before any public exposure.

---

## Security

### Authentication & Authorization

- [ ] JWT tokens have expiry of 7 days maximum [STAGE 1]
- [ ] JWT secret is minimum 64 characters, randomly generated [STAGE 1] [BLOCKER]
- [ ] Password hashing uses bcrypt with minimum salt rounds of 10 [ALREADY DONE]
- [ ] All protected routes enforce JWT middleware — no unguarded routes [ALREADY DONE]
- [ ] No user can access another user's data — all queries include `user_id: req.user.id` filter [ALREADY DONE]
- [ ] Token is never logged, never returned in error responses [STAGE 1]

### Input Validation & Sanitization

- [ ] `express-mongo-sanitize` applied globally to prevent operator injection [STAGE 4] [BLOCKER]
- [ ] `xss-clean` applied globally to sanitize all string inputs [STAGE 4] [BLOCKER]
- [ ] All numeric inputs validated as numbers before DB insertion (Mongoose handles most of this) [STAGE 1]
- [ ] File upload (CSV) validates file type before parsing (accept only .csv and .xlsx) [STAGE 3]
- [ ] File upload enforces max size limit (5MB) [STAGE 3]
- [ ] Zod schema validation on all environment variables at startup [STAGE 1] [BLOCKER]

### HTTP Security Headers

- [ ] `helmet()` middleware applied with default config [STAGE 4] [BLOCKER]
- [ ] `Content-Security-Policy` set — blocks inline scripts [STAGE 4]
- [ ] `X-Frame-Options: DENY` set (helmet default) [STAGE 4]
- [ ] `X-Content-Type-Options: nosniff` set (helmet default) [STAGE 4]
- [ ] CORS origin restricted to specific allowed domains (not `*` in production) [STAGE 1] [BLOCKER]
- [ ] HTTPS enforced in production — Railway provides this automatically [STAGE 4]

### Rate Limiting [BLOCKER]

- [ ] Auth endpoints: 10 requests per 15 minutes per IP [STAGE 1]
- [ ] Chat endpoint: 30 requests per minute per authenticated user [STAGE 1]
- [ ] Insight refresh: 5 requests per minute per user [STAGE 1]
- [ ] General API: 200 requests per minute per IP [STAGE 1]
- [ ] Rate limit counters stored in Redis (not in-memory — survives restarts) [STAGE 1]
- [ ] Rate limit headers returned in all responses (X-RateLimit-Remaining, X-RateLimit-Reset) [STAGE 1]
- [ ] 429 responses return JSON error body, not default text [STAGE 1]

### Secrets Management

- [ ] No secrets committed to git — verify with `git log -p | grep -i "sk-"` [BLOCKER]
- [ ] `.env` in `.gitignore` — confirmed working [ALREADY DONE]
- [ ] `.env.production.example` committed with all keys stubbed (no values) [STAGE 1]
- [ ] OpenAI API key rotated before any public exposure [BEFORE PUBLIC DEMO]
- [ ] MongoDB URI uses a dedicated database user (not root/admin) [STAGE 1]
- [ ] MongoDB Atlas IP whitelist restricted from `0.0.0.0/0` to specific IPs in production [STAGE 4]
- [ ] JWT secret stored in Railway environment variables, not in code [STAGE 4]

---

## Rate Limits and Cost Control

- [ ] OpenAI API usage alert set at $10 (platform.openai.com billing alerts) [BLOCKER]
- [ ] OpenAI API hard limit set at $25 [BLOCKER]
- [ ] Background workers have maximum job concurrency set (max 2 concurrent insight jobs) [STAGE 1]
- [ ] Chat endpoint has max_tokens capped at 1000 per call [ALREADY DONE]
- [ ] Proactive alert worker runs maximum once per 6 hours per user [STAGE 2]
- [ ] Failed OpenAI calls do not retry more than 3 times [STAGE 1]
- [ ] All AI calls have a 30-second timeout [STAGE 1]

---

## Logging

- [ ] Pino structured JSON logging replaces all console.log [STAGE 1]
- [ ] Log levels: debug in development, info in production [STAGE 1]
- [ ] Every HTTP request logged: method, path, status, response time, user ID [STAGE 1]
- [ ] Every AI service call logged: endpoint, duration, success/failure [STAGE 1]
- [ ] Every BullMQ job logged: job ID, type, duration, result [STAGE 1]
- [ ] Every Socket.io alert push logged: user ID, alert type [STAGE 1]
- [ ] Errors include stack traces in development, sanitized messages in production [STAGE 1]
- [ ] Logs never contain: passwords, JWT tokens, full credit card numbers [STAGE 1] [BLOCKER]
- [ ] Railway log draining configured (optional: PaperTrail or LogTail free tier) [STAGE 4]

---

## Error Handling

- [ ] Every Express route has try/catch returning structured `{ error: string }` JSON [STAGE 1]
- [ ] Global error handler middleware catches any unhandled errors [STAGE 1]
- [ ] Unhandled promise rejections caught globally with `process.on('unhandledRejection')` [STAGE 1]
- [ ] Python AI service has try/except on every endpoint with fallback return [ALREADY DONE]
- [ ] Frontend API errors surface as user-visible toast or error state — never silent [ALREADY DONE]
- [ ] 404 handler returns JSON `{ error: 'Not found' }` (not HTML) [STAGE 1]
- [ ] BullMQ failed jobs are logged with full error context [STAGE 1]
- [ ] AI service unavailability returns a graceful degraded insight (already fallback mode exists) [ALREADY DONE]

---

## Performance

### Backend

- [ ] MongoDB Atlas M0 (free) is sufficient for demo/portfolio — upgrade to M10 for real traffic [NOTE]
- [ ] Compound indexes on Transaction: `{ user_id: 1, date: -1 }` [ALREADY DONE]
- [ ] Additional index: `{ user_id: 1, category: 1, date: -1 }` for category filter queries [STAGE 4]
- [ ] Redis caching on `GET /api/insights` with 5-minute TTL [STAGE 4]
- [ ] Redis caching on `GET /api/transactions/summary` with 2-minute TTL [STAGE 4]
- [ ] Cache invalidated on insight refresh or new transaction insert [STAGE 4]
- [ ] Mongoose `lean()` used on read-only queries (returns plain JS objects, 2x faster) [STAGE 4]
- [ ] AI service response time < 5 seconds for `/analyze` under normal load [VERIFY]
- [ ] Chat response time < 10 seconds (including GPT-4o tool calls) [VERIFY]

### Frontend

- [ ] React.lazy + Suspense for page-level code splitting [STAGE 4]
- [ ] React.memo on TransactionRow (renders 100+ instances) [STAGE 4]
- [ ] useMemo on category sort computation in CategoryBreakdown [STAGE 4]
- [ ] Recharts charts are not re-rendered on unrelated state changes [STAGE 4]
- [ ] Vite production build: `npm run build` completes without warnings [STAGE 4]
- [ ] Bundle size < 500KB gzipped (check with `npx vite-bundle-analyzer`) [STAGE 4]
- [ ] Lighthouse Performance score > 90 on Dashboard page [STAGE 4]
- [ ] First Contentful Paint < 1.5 seconds on Railway-hosted deployment [STAGE 4]

---

## Testing

- [ ] Backend: Jest + Supertest — minimum 80% line coverage on routes [STAGE 4]
- [ ] Backend: Auth routes fully tested (register, login, me, invalid token) [STAGE 4]
- [ ] Backend: Chat route tested with mocked OpenAI (verify tool dispatch logic) [STAGE 4]
- [ ] Python AI service: Pytest — all 5 endpoints tested with valid + invalid input [STAGE 4]
- [ ] Python AI service: `/analyze` tested with empty transaction list → returns fallback [STAGE 4]
- [ ] Frontend: Vitest + RTL — LoginPage and ChatPanel critical paths tested [STAGE 4]
- [ ] Integration test: full demo flow (login → refresh → chat) runs in CI [STAGE 4]
- [ ] No tests marked as `.skip` or `.todo` in the main branch [STAGE 4]
- [ ] Test coverage badge displayed in README [STAGE 4]

---

## CI/CD

- [ ] GitHub Actions workflow triggers on every pull request [STAGE 4]
- [ ] CI runs: backend tests, Python tests, frontend tests, Docker build [STAGE 4]
- [ ] PR merge blocked if CI fails [STAGE 4]
- [ ] Deployment workflow triggers on merge to `main` [STAGE 4]
- [ ] Deployment to Railway is automatic after CI passes [STAGE 4]
- [ ] Frontend deployment to Vercel is automatic after CI passes [STAGE 4]
- [ ] Environment variables managed in Railway dashboard — not in workflow files [STAGE 4]
- [ ] Rollback: Railway supports one-click rollback to previous deployment [VERIFY]

---

## Monitoring

- [ ] `/health` endpoint returns dependency status (MongoDB, Redis, AI service) [STAGE 1]
- [ ] UptimeRobot free tier monitoring on `/health` — alerts on downtime [STAGE 4]
- [ ] BullMQ queue depth monitored — alert if queue > 100 jobs (indicates backlog) [STAGE 1]
- [ ] OpenTelemetry traces exported (optional: Jaeger locally, Grafana Cloud free tier in production) [STAGE 1]
- [ ] Railway metrics dashboard monitored for memory and CPU [STAGE 4]
- [ ] Error rate tracked — if >5% of requests are 5xx in a 5-minute window, investigate [STAGE 4]

---

## Docker

- [ ] `Dockerfile.backend` builds successfully: `docker build -f docker/Dockerfile.backend .` [STAGE 1]
- [ ] `Dockerfile.ai-service` builds successfully [STAGE 1]
- [ ] `Dockerfile.frontend` builds and serves static files via nginx [STAGE 1]
- [ ] `docker-compose up` starts all services and demo flow works [STAGE 1]
- [ ] `.dockerignore` excludes: node_modules, .env, venv, **pycache**, dist [STAGE 1]
- [ ] Docker images use specific version tags (not `latest`) for reproducibility [STAGE 1]
- [ ] Multi-stage builds used for frontend (build stage + nginx serve stage) [STAGE 4]
- [ ] Docker images are < 500MB (use alpine/slim base images) [STAGE 1]

---

## Scalability

- [ ] Backend is stateless — no in-memory state that would break with multiple instances [STAGE 1]
- [ ] Socket.io sessions backed by Redis adapter (required for multiple backend instances) [STAGE 1]
- [ ] BullMQ queue is Redis-backed — workers can run on separate machines [STAGE 1]
- [ ] Rate limiting uses Redis store — works across multiple server instances [STAGE 1]
- [ ] MongoDB connection uses connection pooling (Mongoose default: 5 connections) [VERIFY]
- [ ] AI service is stateless — can be horizontally scaled [VERIFY]
- [ ] File uploads (CSV) stored temporarily — not in memory — use `tmp` directory [STAGE 3]

---

## Accessibility

- [ ] All interactive elements reachable by keyboard (Tab, Enter, Space, Escape) [STAGE 4]
- [ ] All icon-only buttons have `aria-label` [STAGE 4]
- [ ] All form inputs have associated `<label>` elements [STAGE 4]
- [ ] Health score gauge has `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label` [STAGE 4]
- [ ] Alerts panel has `aria-live="polite"` for dynamic updates [STAGE 4]
- [ ] Color is never the only differentiator (anomaly rows use border + icon, not just color) [ALREADY DONE]
- [ ] Focus indicators visible on all interactive elements (not `outline: none`) [STAGE 4]
- [ ] axe DevTools browser extension shows 0 critical violations on Dashboard [STAGE 4]
- [ ] Lighthouse Accessibility score > 90 [STAGE 4]

---

## Mobile Responsiveness

- [ ] App usable at 768px width without horizontal scroll [STAGE 4]
- [ ] Sidebar collapses to icon rail on mobile [STAGE 4]
- [ ] Dashboard stacks to single column on mobile [STAGE 4]
- [ ] Chat is full-screen on mobile with pinned input [STAGE 4]
- [ ] Transaction rows adapt to 3-line compact layout on mobile [STAGE 4]
- [ ] Touch targets minimum 44x44px on mobile [STAGE 4]
- [ ] No fixed-width elements that break mobile layout [STAGE 4]

---

## Deployment Checklist (Run Before Going Live)

### Environment verification

- [ ] All env variables set in Railway dashboard (confirm with `railway variables`)
- [ ] MONGODB_URI points to production cluster (not development)
- [ ] OPENAI_API_KEY is active and has sufficient credit
- [ ] JWT_SECRET is unique to production (not the same as development)
- [ ] CLIENT_URL set to Vercel frontend URL (not localhost)
- [ ] AI_SERVICE_URL set to Railway AI service URL (not localhost)

### Smoke test (run after each deployment)

```bash
# 1. Health check
curl https://your-backend.railway.app/health

# 2. Login
curl -X POST https://your-backend.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@smartspend.ai","password":"demo1234"}'

# 3. Confirm token works and transactions load
# 4. Open frontend URL in browser — confirm login and dashboard load
# 5. Send a chat message — confirm GPT-4o responds with real ₹ data
```

### Final checklist before sharing the URL

- [ ] Demo login works on production URL
- [ ] Chat returns data-grounded responses (not generic)
- [ ] Health score shows in 42-65 range for Priya
- [ ] No CORS errors in browser console
- [ ] SSL certificate valid (Railway provides this automatically)
- [ ] README on GitHub has the live URL in the project description
- [ ] GitHub repo is public (or shared with recruiters)
- [ ] Demo video recorded and linked in README

---

## SEO (Relevant for Public-Facing Portfolio)

- [ ] `<title>Finexa — Personal Finance Intelligence</title>` in index.html [ALREADY SET]
- [ ] Meta description set in index.html [STAGE 4]
- [ ] Open Graph tags for LinkedIn/Twitter sharing [STAGE 4]
- [ ] Favicon present and correct [ALREADY DONE]
- [ ] robots.txt allows indexing of the login page [STAGE 4]
- [ ] Google Search Console verified (optional — only if you want search traffic) [OPTIONAL]

---

## Portfolio Presentation

- [ ] README has a clear hero screenshot (Dashboard with real data) [STAGE 4]
- [ ] README has a Mermaid architecture diagram [STAGE 4]
- [ ] README has a "Quick Start" section with 3 commands [STAGE 4]
- [ ] README has a tech stack table [STAGE 4]
- [ ] README has a live demo link [STAGE 4]
- [ ] Demo video (2-3 minutes) showing: login → dashboard → chat wow moment [STAGE 4]
- [ ] GitHub repo has topics/tags: fintech, ai, react, typescript, openai, mongodb [STAGE 4]
- [ ] GitHub repo has a description that includes the live URL [STAGE 4]
- [ ] LinkedIn post drafted about the project [AFTER STAGE 4]
- [ ] Project added to resume with: tech stack, key features, live URL, GitHub URL [AFTER STAGE 4]
