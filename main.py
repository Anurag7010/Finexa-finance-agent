"""ASGI entrypoint shim for running the AI service from repository root.

This allows commands like:
    uvicorn main:app --reload --port 8000
while keeping the real FastAPI app in ai-service/main.py.
"""

from __future__ import annotations

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parent
AI_SERVICE_MAIN = ROOT / "ai-service" / "main.py"

if not AI_SERVICE_MAIN.exists():
    raise FileNotFoundError(f"Expected AI service entrypoint at: {AI_SERVICE_MAIN}")

spec = importlib.util.spec_from_file_location("smartspend_ai_service_main", AI_SERVICE_MAIN)
if spec is None or spec.loader is None:
    raise ImportError(f"Unable to load module from: {AI_SERVICE_MAIN}")

module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

app = module.app
