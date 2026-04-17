# Finexa

AI-powered personal finance safety platform for proactive budgeting, anomaly detection, and real-time coaching.

## Overview

Finexa helps users avoid month-end money surprises by combining transaction intelligence, risk scoring, anomaly detection, and a conversational financial assistant (`fingaurdian` / Fin Guardian).

This project was built for fast iteration and demo impact, while keeping a realistic full-stack architecture:

- Frontend dashboard for live financial visibility
- Backend APIs for auth, transactions, insights, alerts, and chat orchestration
- Dedicated AI service for categorization, scoring, forecasting, anomaly detection, and nudge generation
- Socket.IO for real-time alert and insight pushes

## Key Features

- JWT-based authentication with demo-friendly seeded user
- AI-powered monthly insight generation (`/api/insights/refresh`)
- Financial health score and risk level classification
- Category budget breach detection and recommendation generation
- 30-day projected balance forecast
- Anomaly detection pipeline for suspicious transactions
- Real-time alerts + insight updates over Socket.IO
- Tool-augmented chat assistant (Fin Guardian / `fingaurdian`)
- What-if scenario simulation in the frontend
- Mock mode fallback for frontend development (`USE_MOCK`)

## Demo Flow

1. Login
   - Use `demo@smartspend.ai / demo1234` after seeding.
2. Landing (`/home`)
   - Choose Dashboard or Fin Guardian Chat.
3. Dashboard
   - Review health score, risk factors, forecast, category breakdown, and simulator.
4. Transactions
   - Inspect spend summary, anomalies, and filtered transaction list.
5. Alerts
   - View severity-based alerts and mark as read.
6. Chat
   - Ask Fin Guardian questions; backend executes data tools before answering.

## Tech Stack

### Frontend

- React 19 + TypeScript
- Vite + Tailwind CSS
- Zustand (state)
- Recharts (visualization)
- Socket.IO client
- Framer Motion (chat interactions)

### Backend

- Node.js + Express
- MongoDB + Mongoose
- JWT auth
- Socket.IO server

### AI Service

- FastAPI (Python)
- OpenAI API integration (optional with fallback behavior)
- scikit-learn (IsolationForest for anomaly detection)

## Architecture Overview

```text
Browser (React)
	|
	| REST (auth, tx, insights, alerts, chat)
	v
Backend API (Express)
	|\
	| \__ MongoDB (users, tx, insights, alerts, chat history)
	|
	\____ AI Service (FastAPI) for analyze/categorize/forecast/anomalies/nudges

Socket.IO:
Backend --> Frontend events: new_alert, insight_update
```

## Folder Structure

```text
.
├── ai-service/
│   ├── main.py
│   ├── generate_seed.py
│   ├── seed_data.json
│   └── requirements.txt
├── backend/
│   ├── server.js
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── scripts/
│   └── services/
├── frontend/
│   ├── index.html
│   ├── public/
│   └── src/
│       ├── components/
│       ├── lib/
│       ├── pages/
│       ├── store/
│       ├── App.tsx
│       └── main.tsx
├── PROJECT_DOCUMENTATION.md
└── test_connections.py
```

## Local Setup

### 1. Clone and install

```bash
git clone <your-repo-url>
cd smartspend-ai

cd backend && npm install && cd ..
cd frontend && npm install && cd ..
cd ai-service && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt && cd ..
```

### 2. Configure environment variables

Create these files:

- `backend/.env`
- `frontend/.env`
- `ai-service/.env`

You can copy from the included `.env.example` files.

### 3. Seed demo data

```bash
cd backend
npm run seed
```

### 4. Run services

Terminal 1:

```bash
cd ai-service
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

Alternative (from project root):

```bash
source .venv/bin/activate
uvicorn main:app --reload --port 8000
```

If this exits with code 137 on macOS, use one of these stable options:

```bash
# Option 1: run without reload (most stable)
uvicorn main:app --port 8000

# Option 2: keep reload but limit watched files
uvicorn main:app --reload --reload-dir ai-service --port 8000
```

Terminal 2:

```bash
cd backend
npm run dev
```

If you see `EADDRINUSE: address already in use :::5000`, another backend process is already running.
Stop it first:

```bash
lsof -ti tcp:5000 | xargs kill -9
```

Terminal 3:

```bash
cd frontend
npm run dev
```

## Environment Variables

### backend/.env

| Variable         | Required | Description                                        |
| ---------------- | -------- | -------------------------------------------------- |
| `PORT`           | No       | Backend port (default `5000`)                      |
| `CLIENT_URL`     | Yes      | Frontend origin for CORS and Socket.IO             |
| `MONGODB_URI`    | Yes      | MongoDB connection string                          |
| `JWT_SECRET`     | Yes      | JWT signing secret                                 |
| `AI_SERVICE_URL` | Yes      | AI service base URL (e.g. `http://127.0.0.1:8000`) |
| `OPENAI_API_KEY` | Optional | Needed for backend chat LLM calls                  |

### frontend/.env

| Variable       | Required | Description           |
| -------------- | -------- | --------------------- |
| `VITE_API_URL` | Yes      | Backend base URL      |
| `VITE_WS_URL`  | Yes      | Backend Socket.IO URL |

### ai-service/.env

| Variable         | Required | Description                                          |
| ---------------- | -------- | ---------------------------------------------------- |
| `OPENAI_API_KEY` | Optional | Enables OpenAI-powered categorization/nudges/summary |

## API Overview

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Transactions

- `GET /api/transactions`
- `GET /api/transactions/summary`
- `GET /api/transactions/anomalies`
- `POST /api/transactions`

### Insights

- `GET /api/insights`
- `POST /api/insights/refresh`
- `GET /api/insights/forecast`

### Alerts

- `GET /api/alerts`
- `PATCH /api/alerts/read-all`
- `PATCH /api/alerts/:id/read`

### Chat

- `POST /api/chat`
- `GET /api/chat/history`
- `DELETE /api/chat/history`

### Service Health

- `GET /health` (backend)
- `GET /health` (ai-service)

## Future Improvements

- Introduce background jobs for insight generation and alert fanout
- Add refresh token flow and session management
- Add integration tests for all critical API flows
- Improve Socket.IO multi-device support (user -> multiple socket IDs)
- Add role-based telemetry, monitoring, and audit trails
- Add CI pipeline for lint/build/test/docs checks

## License

MIT — see `LICENSE`.
