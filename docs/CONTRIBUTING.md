# Contributing to Finexa

## How to add a new chat tool

1. Define the tool schema in `backend/routes/chat.js` in the `tools` array (follow the existing OpenAI function-calling schema format).
2. Add the execution case in the `executeTool` switch statement in the same file.
3. Add a test case in `backend/tests/chat.test.js` that sends a message triggering the tool.
4. Update `docs/API.md` with the new tool name, description, and parameters.

## How to add a new AI service endpoint

1. Add the Pydantic request/response models in `ai-service/main.py`.
2. Implement the endpoint function with `try/except` — every endpoint must return a fallback, never a 500 from an LLM timeout.
3. Add the caller function in `backend/services/aiService.js` so the backend proxies the call.
4. Add tests in `ai-service/tests/` following the existing pattern in `test_analyze.py`.

## Developer setup

```bash
# Backend
cd backend && npm install && npm run dev

# Frontend (separate terminal)
cd frontend && npm install && npm run dev

# AI service (separate terminal)
cd ai-service && pip install -r requirements.txt && uvicorn main:app --reload --port 8000
```

## Test commands

```bash
cd backend && npm test          # Jest tests with mongodb-memory-server
cd frontend && npm run test      # Vitest tests
cd ai-service && pytest          # Python tests
```

## Commit message format

```
feat: short description
fix: short description
test: short description
docs: short description
infra: short description
security: short description
```

## Coding standards

- Never use `console.log` — use `logger.info` / `logger.warn` / `logger.error` (Pino).
- Every new route must have try/catch with `{ error: string }` response shape.
- Every new function must have a JSDoc or Python docstring comment.
- Never hardcode values that belong in config — use `config/env.js`.
- Never commit real secrets, API keys, or credentials.
- All new MongoDB queries must use projection to return only needed fields.
- All new async functions must be awaited — no floating promises.

## Pull request rules

- Keep PRs focused: one feature, one fix, or one refactor per PR.
- All tests must pass before requesting review.
- Add test coverage for any new route or tool.
- Reference the relevant stage or issue in the PR description.

