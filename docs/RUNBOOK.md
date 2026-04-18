# Finexa — Operations Runbook

> Use this document when something is broken in production. Check the health endpoint first, then follow the relevant section.

---

## Quick health check

```bash
curl https://your-api.railway.app/health
# Expected: { "status": "ok", "dependencies": { "mongodb": "connected", "redis": "connected", "aiService": "reachable" } }
```

If `status` is `degraded`, read `dependencies` to identify the failing component, then follow the relevant section below.

---

## Health check failing

### MongoDB disconnected

1. `curl /health` → confirm `mongodb: "disconnected"`
2. Log into MongoDB Atlas → check cluster is not paused (free tier auto-pauses after 60 days of inactivity)
3. If paused: click "Resume" in Atlas dashboard
4. Check `MONGODB_URI` env var in Railway — must point to correct cluster and include credentials

### Redis disconnected

1. `curl /health` → confirm `redis: "disconnected"`
2. Log into Railway → check the Redis service is running and not out of memory
3. Check `REDIS_URL` env var in the backend service matches the Railway Redis internal URL
4. Note: Redis failure degrades gracefully — rate limiting is skipped but the app still works

### AI service unreachable

1. `curl /health` → confirm `aiService: "unreachable"`
2. Check Railway AI service logs for Python startup errors
3. Verify `AI_SERVICE_URL` env var in the backend points to the correct Railway internal URL
4. Check `OPENAI_API_KEY` is set in the AI service Railway environment

---

## Login not working

**Step 1**: Try curl directly
```bash
curl -X POST https://your-api.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@smartspend.ai","password":"demo1234"}'
```

**If 401**: Check the demo user was seeded — run seed script on the database.

**If 429**: Rate limit hit. Check Redis is connected. If Redis is down, rate limiting should be skipped (see rateLimiter.js `skip` function).

**If CORS error in browser**: Check `CLIENT_URL` and `CORS_ORIGINS` env vars include the frontend's URL. Both `localhost` and `127.0.0.1` are always included in development.

---

## Chat returning generic responses (not using real data)

1. Check `OPENAI_API_KEY` is set in Railway backend environment and is valid (not expired/rotated)
2. Verify the key is not the placeholder `ROTATE_THIS_KEY_AT_PLATFORM_OPENAI_COM...` — rotate it at [platform.openai.com/api-keys](https://platform.openai.com/api-keys) if so
3. In `backend/routes/chat.js`: check `dataKeywords` array includes the keyword from the failing message
4. Check `executeTool` is returning data: add `logger.info` temporarily on tool results if needed
5. If OpenAI is down: the CFO fallback (`buildCfoFallbackReply`) should kick in with real DB data

---

## Health score out of expected range (should be 42–65 for demo user)

1. Run `POST /api/insights/refresh` manually with the demo token to force a recalculation
2. Check AI service logs for `/analyze` endpoint — look for timeout or model error
3. Verify seed data is present: `GET /api/transactions` with the demo token should return ~300 results
4. If seed data is missing: re-run the seed script (`cd backend && node scripts/seed.js`)
5. The health score is deterministic from transaction data — if transactions are correct, the score should be consistent

---

## BullMQ jobs stacking up (queue backlog)

1. Check workers process is running: `ps aux | grep "workers/index"`
2. If not running: start it with `node workers/index.js` (separate process from the backend)
3. Check Redis connection in the workers process — workers need their own Redis connection
4. To manually inspect the queue: use Redis CLI `redis-cli llen bull:insight-refresh:wait`
5. To clear a stuck queue: `redis-cli del bull:insight-refresh:wait` (drops all pending jobs — use with care)

---

## Rate limit blocking legitimate requests

1. Check Redis is connected (`redis-cli ping` → should return `PONG`)
2. If Redis is down, the `skip` function in `rateLimiter.js` should bypass rate limiting automatically
3. If Redis is up but limits are too low: temporarily increase `max` values in `rateLimiter.js` for investigation
4. Auth limiter: 10 requests per 15 minutes per IP
5. Chat limiter: 30 requests per minute per authenticated user
6. General API limiter: 200 requests per minute per IP

---

## Deployment failed on Railway

1. Check GitHub Actions CI workflow passed — deploy only triggers after CI success
2. Check Railway deploy logs for the specific service
3. If backend: verify `NODE_ENV`, `MONGODB_URI`, `JWT_SECRET`, `OPENAI_API_KEY`, `AI_SERVICE_URL`, `CLIENT_URL`, `REDIS_URL` are all set
4. If ai-service: verify `OPENAI_API_KEY` is set and requirements.txt includes all dependencies
5. If frontend (Vercel): verify `VITE_API_URL` points to the Railway backend URL

---

## WebSocket / Socket.io alerts not pushing

1. Check that the Socket.io CORS config in `server.js` includes the frontend origin
2. Check Redis pub/sub: the `redisPublisher.publish` call in `dataSources.js` should log a warning if it fails but not crash
3. Check `socketService.js` is subscribed to the correct Redis channels
4. Test manually: `POST /api/datasources/upi/webhook` with a valid body should trigger a Socket.io event within 5 seconds

---

## Emergency rollback

```bash
# Roll back backend to previous Railway deploy
# Railway dashboard → service → Deployments → click previous deploy → Rollback

# Roll back frontend to previous Vercel deploy
# Vercel dashboard → project → Deployments → click previous deploy → Promote to Production

# Roll back database (if seed data was corrupted)
cd backend && node scripts/seed.js  # re-seeds demo user and 300 transactions
```
