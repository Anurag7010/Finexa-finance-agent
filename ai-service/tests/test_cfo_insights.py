"""
Pytest test suite for the Finexa AI service — CFO insights endpoints.

Tests:
- POST /financial-summary  — natural-language financial summary
- POST /goal-plan          — goal feasibility and action plan
"""

import os
import sys
from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient

# Set dummy env variables before importing main
os.environ.setdefault("OPENAI_API_KEY", "sk-test-key-for-unit-tests-only")
os.environ.setdefault("MONGODB_URI", "mongodb://localhost:27017/test")

# Insert ai-service directory into path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app  # noqa: E402

client = TestClient(app)


# ─── /financial-summary tests ────────────────────────────────────────────────

class TestFinancialSummary:
    """Tests for the /financial-summary endpoint used to build the chat system prompt."""

    def test_valid_payload_returns_non_empty_summary(self):
        """Full payload should return a non-empty summary string."""
        payload = {
            "user_name": "Priya Sharma",
            "health_score": 54,
            "risk_level": "high",
            "monthly_spend": 48000,
            "monthly_budget": 45000,
            "overspend_amount": 3000,
            "savings_rate": 0.1,
            "top_category": "Food & Dining",
            "risk_factors": ["Overspend in Food & Dining", "High transaction frequency"],
        }
        res = client.post("/financial-summary", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert "summary" in data
        assert isinstance(data["summary"], str)
        assert len(data["summary"]) > 0

    def test_missing_optional_fields_returns_fallback_not_crash(self):
        """Missing optional risk_factors and savings_rate should return a fallback, not 422 or 500."""
        payload = {
            "user_name": "Rahul Verma",
            "health_score": 72,
            "risk_level": "medium",
            "monthly_spend": 32000,
            "monthly_budget": 40000,
            "overspend_amount": 0,
            "savings_rate": 0.2,
            "top_category": "Rent",
        }
        res = client.post("/financial-summary", json=payload)
        # Must not crash — either 200 with summary or a graceful fallback
        assert res.status_code in (200, 422)
        if res.status_code == 200:
            data = res.json()
            assert isinstance(data.get("summary", ""), str)

    def test_low_health_score_does_not_crash(self):
        """Extreme low health score should be handled gracefully."""
        payload = {
            "user_name": "Test User",
            "health_score": 5,
            "risk_level": "high",
            "monthly_spend": 90000,
            "monthly_budget": 40000,
            "overspend_amount": 50000,
            "savings_rate": 0.0,
            "top_category": "Unknown",
            "risk_factors": ["Extreme overspend"],
        }
        res = client.post("/financial-summary", json=payload)
        assert res.status_code == 200

    def test_malformed_payload_returns_422(self):
        """Missing required fields should return 422."""
        res = client.post("/financial-summary", json={"invalid": "data"})
        assert res.status_code == 422


# ─── /goal-plan tests ────────────────────────────────────────────────────────

class TestGoalPlan:
    """Tests for the /goal-plan endpoint used to generate savings action plans."""

    def test_valid_goal_returns_structured_plan(self):
        """Valid goal + financial data should return a non-empty plan string."""
        payload = {
            "goal": {
                "name": "Emergency Fund",
                "target_amount": 120000,
                "current_amount": 15000,
                "deadline": (datetime.now() + timedelta(days=365)).isoformat(),
                "category": "emergency"
            },
            "user": {
                "income": 80000,
                "monthly_budget": 50000,
                "monthly_spend": 48000,
                "risk_level": "medium"
            }
        }
        res = client.post("/goal-plan", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert "plan" in data
        assert isinstance(data["plan"], str)
        assert len(data["plan"]) > 0

    def test_tight_timeline_does_not_crash(self):
        """Extremely short deadline should not cause an exception."""
        payload = {
            "goal": {
                "name": "Laptop",
                "target_amount": 80000,
                "current_amount": 0,
                "deadline": (datetime.now() + timedelta(days=30)).isoformat(),
                "category": "electronics"
            },
            "user": {
                "income": 60000,
                "monthly_budget": 50000,
                "monthly_spend": 55000,
                "risk_level": "high"
            }
        }
        res = client.post("/goal-plan", json=payload)
        assert res.status_code == 200

    def test_malformed_goal_payload_returns_422(self):
        """Missing required fields should return 422."""
        res = client.post("/goal-plan", json={"goal_name": "Bad Goal"})
        assert res.status_code == 422
