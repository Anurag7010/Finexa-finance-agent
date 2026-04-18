# Finexa Architecture Overview

Finexa is a full-stack personal finance application that utilizes AI for intelligent categorization, anomaly detection, and real-time insights. The architecture is designed to decouple the frontend presentation layer, backend orchestration, and AI-driven processing into distinct services.

## System Components

### 1. Frontend (React + TypeScript + Vite)
The frontend serves as the interactive dashboard for the user. It is a Single Page Application (SPA) built with React and styled using Tailwind CSS and custom design tokens (`fingaurd-*`).

**Key Technologies:**
- **React 19:** UI rendering and component architecture.
- **Zustand:** Lightweight global state management (handles user state, auth tokens, insights, and WebSocket alerts).
- **Socket.IO Client:** Enables real-time, bi-directional communication with the backend for live alerts and updates.
- **React Router:** Client-side routing with lazy loading (`Suspense`) for performance optimization.
- **Recharts:** For financial data visualization (forecasts, category breakdowns).

**Responsibilities:**
- Presentation of financial data.
- User interactions (login, chat, simulation).
- Handling real-time alerts.

### 2. Backend API (Node.js + Express)
The backend acts as the orchestrator and primary gateway for the frontend. It manages business logic, data persistence, and delegates intensive AI workloads to the AI Service.

**Key Technologies:**
- **Express.js:** API routing and middleware management.
- **MongoDB (Mongoose):** Primary database for storing users, transactions, insights, and chat histories.
- **Redis:** Caching layer for fast retrieval of insights and summary data. Also used for rate-limiting stores.
- **BullMQ:** Message queue for handling background jobs (e.g., live data integration and synchronization).
- **Socket.IO:** Pushes real-time alerts and refreshed insights to connected frontend clients.
- **Security Middleware:** Helmet, XSS-Clean, Express-Mongo-Sanitize, and Rate Limiting.

**Responsibilities:**
- Authentication and authorization (JWT).
- Database operations and caching (Redis).
- Acting as a proxy and orchestrator to the AI Service.
- Real-time WebSocket management.
- Background job processing for live data streams.

### 3. AI Service (Python + FastAPI)
The AI Service is a dedicated microservice that handles all complex computational tasks, machine learning models, and LLM (Large Language Model) integrations.

**Key Technologies:**
- **FastAPI:** High-performance API framework for Python.
- **scikit-learn:** Uses `IsolationForest` for detecting anomalous transactions based on historical patterns.
- **OpenAI API:** Powers intelligent transaction categorization, nudge generation, and the conversational "Fin Guardian" assistant.

**Responsibilities:**
- Intelligent transaction categorization (heuristics + OpenAI fallback).
- Anomaly detection scoring.
- Financial health scoring and forecasting.
- Natural language query processing for the CFO chat assistant.

## Data Flow & Architecture Diagram

```mermaid
graph TD
    Client[Frontend SPA - React]
    API[Backend API - Express/Node.js]
    AI[AI Service - FastAPI/Python]
    DB[(MongoDB)]
    Cache[(Redis)]
    Queue[(BullMQ - Redis)]

    %% Connections
    Client <-->|RESTful APIs| API
    Client <-->|Socket.IO (Real-time)| API
    API <-->|RESTful APIs| AI
    API <-->|Read/Write| DB
    API <-->|Cache & Rate Limit| Cache
    API <-->|Background Jobs| Queue
    
    %% AI connections
    AI -.->|External API Call| OpenAI[OpenAI API]
```

## Specific Workflows

### 1. Transaction Sync and Categorization
1. Backend retrieves raw transactions from an external source or mock seed.
2. Backend enqueues a job in **BullMQ**.
3. Worker processes the job, passing raw transactions to the **AI Service** (`/categorize-batch`).
4. AI Service evaluates transactions using heuristics or OpenAI and returns categories.
5. Backend saves the categorized transactions to **MongoDB** and invalidates related **Redis** caches.
6. Backend triggers an insight refresh if needed.

### 2. Insight Generation and Real-time Pushes
1. Frontend requests an insight refresh (or backend triggers it post-sync).
2. Backend aggregates the user's transactions and passes them to the **AI Service** (`/analyze`).
3. AI Service computes health scores, risk factors, forecasts, and detects anomalies using `IsolationForest`.
4. Backend saves the returned insights to **MongoDB**, caches them in **Redis**, and emits an `insight_update` via **Socket.IO**.
5. Frontend receives the WebSocket event and updates the Zustand store, immediately reflecting changes on the UI.

### 3. Conversational Assistant (Fin Guardian)
1. User sends a message via the frontend chat interface.
2. Backend receives the message and fetches necessary financial context (spending summary, goals, anomalies).
3. Backend sends the message + context to the **AI Service** (`/chat` or similar logic).
4. AI Service builds a comprehensive prompt and calls the OpenAI API to generate a personalized, data-aware response.
5. The response is saved to the chat history in **MongoDB** and returned to the frontend.

## Security & Performance Considerations

- **Caching:** The backend heavily utilizes Redis to cache computationally expensive aggregation and insight queries. Caches are intelligently invalidated upon data mutation (e.g., new transaction).
- **Security Headers:** Comprehensive OWASP guidelines are followed using Helmet for HTTP headers, `express-mongo-sanitize` for NoSQL injection prevention, and `xss-clean`.
- **Rate Limiting:** IP and User-based rate limiting are enforced via Redis to prevent abuse of the backend APIs and costly AI endpoints.
