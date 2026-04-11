# SmartSpend AI — Agent Kickoff Prompt

You are going to build SmartSpend AI, a personal finance intelligence platform, during an 8-hour hackathon. Two context documents are in this project root — read both of them fully before writing a single line of code:

1. The initial strategy document 'INITIAL_PLAN.md' (the long plan with sections A through L)
2. `SMARTSPEND_MASTER_PLAN.md` (the phase-by-phase implementation guide)

These two documents are your complete source of truth. Follow them exactly.

---

## What is already done (do not redo any of this)

- `frontend/` is scaffolded with React + Vite + TypeScript. Tailwind v4 is configured. shadcn/ui is initialized with card, badge, button, progress, tabs, and alert components already installed.
- `backend/` has `package.json` with all dependencies listed. Run `npm install` once at the start — do not modify `package.json`.
- `ai-service/` has a Python venv created and all pip packages installed. `requirements.txt` is frozen. Run `pip install -r requirements.txt` once if needed.
- `ai-service/seed_data.json` exists with 600 synthetic transactions across two users (Rohan = at-risk demo user, Alex = healthy user). Do not regenerate this file.
- All `.env` files exist in `backend/` and `ai-service/` with real values already filled in: MongoDB Atlas URI, OpenAI API key, JWT secret, and service URLs. Do not overwrite these files.
- MongoDB Atlas cluster is live and reachable. OpenAI API key is active with credit loaded.

---

## How to work

Work phase by phase as defined in `SMARTSPEND_MASTER_PLAN.md`. There are 5 phases:

- Phase 1: Backend API + Database
- Phase 2: Python AI Service
- Phase 3: React Frontend Core Dashboard
- Phase 4: AI Chat Assistant + Alerts Panel
- Phase 5: Polish + Demo Hardening

**Do not start the next phase until the current phase passes its verification checklist.** Each phase in the plan ends with explicit checks — run them, confirm they pass, then proceed.

After completing each phase, tell me:

- What was built
- What the verification results were
- What you are starting next

Wait for my confirmation before moving to the next phase.

---

## Non-negotiable rules

- Never use hardcoded dummy data in any component. Every number on screen must come from a real API call.
- The Python AI service must never crash. Every endpoint needs try/except with a fallback.
- The GPT-4o chat assistant must use tool calls — not generic responses. This is the most important demo feature.
- Use shadcn/ui components for all UI elements. Do not write custom CSS for things shadcn already provides.
- The demo user is Rohan Sharma (`demo@smartspend.ai` / `demo1234`). All demo flows use her account.

---

Start now by reading both context documents, then begin Phase 1.
