# API Reference

Base URL (local): http://localhost:5000

Authentication

- JWT Bearer token in Authorization header for protected routes.

## Auth

- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me
- PATCH /api/auth/me

## Transactions

- GET /api/transactions
- GET /api/transactions/summary
- GET /api/transactions/anomalies
- POST /api/transactions

## Insights

- GET /api/insights
- POST /api/insights/refresh
- GET /api/insights/forecast
- GET /api/insights/monthly-plan

## Alerts

- GET /api/alerts
- PATCH /api/alerts/read-all
- PATCH /api/alerts/:id/read

## Chat

- POST /api/chat
- GET /api/chat/history
- DELETE /api/chat/history

## Goals

- GET /api/goals
- POST /api/goals
- PATCH /api/goals/:id
- DELETE /api/goals/:id
- GET /api/goals/:id/projection
- POST /api/goals/:id/contribute

## Subscriptions

- GET /api/subscriptions
- GET /api/subscriptions/total
- POST /api/subscriptions
- POST /api/subscriptions/:id/confirm
- POST /api/subscriptions/:id/dismiss

## Data Sources and Sync

- GET /api/datasources
- POST /api/datasources/connect
- DELETE /api/datasources/:id
- POST /api/datasources/aa/initiate-consent
- GET /api/datasources/aa/consent-status/:id
- POST /api/datasources/aa/fetch-data
- GET /api/datasources/upi/connect
- POST /api/datasources/upi/webhook
- POST /api/sync/trigger/:sourceId
- GET /api/sync/status/:jobId
- GET /api/sync/history
- POST /api/sync/csv-import
  - multipart/form-data with file field `file`
  - optional fields: `source_id`, `account_name`, `bank_name`

## Health

- GET /health

Response conventions

- Success responses are JSON objects with route-specific payload.
- Error responses use: { "error": "..." }
