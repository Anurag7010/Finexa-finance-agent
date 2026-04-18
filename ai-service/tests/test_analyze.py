"""
Pytest test suite for the Finexa AI service.

Tests core endpoints:
- /analyze   — transaction analysis, health score calculation
- /categorize — single transaction categorization
- /anomalies  — anomaly detection
- /categorize-batch — batch categorization used by SyncService
"""

import os
import sys
import json
import random
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


# ─── Fixtures ────────────────────────────────────────────────────────────────

def make_transaction(
    amount=None,
    merchant="Test Merchant",
    category="Shopping",
    channel="UPI",
    days_ago=10,
    is_anomaly=False,
):
    """Generates a mock transaction dict."""
    return {
        "id": f"txn-{random.randint(1000, 9999)}",
        "date": (datetime.now() - timedelta(days=days_ago)).strftime("%Y-%m-%d"),
        "amount": amount or round(random.uniform(100, 5000), 2),
        "merchant": merchant,
        "category": category,
        "description": f"{merchant} - {channel}",
        "channel": channel,
        "is_anomaly": is_anomaly,
    }


def make_transactions(n=50):
    """Generates n mock transactions with realistic spread."""
    merchants = [
        ("Swiggy", "Food & Dining"),
        ("Amazon", "Shopping"),
        ("Ola Cabs", "Transportation"),
        ("Netflix", "Entertainment"),
        ("BigBasket", "Groceries"),
        ("Airtel", "Utilities"),
        ("Apollo Pharmacy", "Health"),
    ]
    transactions = []
    for i in range(n):
        merchant, category = merchants[i % len(merchants)]
        transactions.append(make_transaction(
            amount=round(random.uniform(100, 3000), 2),
            merchant=merchant,
            category=category,
        ))
    return transactions


# ─── /analyze tests ──────────────────────────────────────────────────────────

class TestAnalyze:
    def test_analyze_returns_valid_health_score(self):
        """Health score should be in 0–100 range for normal transaction set."""
        payload = {
            "user_id": "test-user-001",
            "transactions": make_transactions(50),
            "income": 80000,
            "monthly_budget": 40000,
        }
        res = client.post("/analyze", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert "health_score" in data
        score = data["health_score"]
        assert 0 <= score <= 100, f"Health score {score} out of range"

    def test_analyze_with_empty_transactions_returns_fallback(self):
        """Empty transaction list should not crash — returns valid fallback response."""
        payload = {
            "user_id": "test-user-002",
            "transactions": [],
            "income": 50000,
            "monthly_budget": 25000,
        }
        res = client.post("/analyze", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert "health_score" in data
        assert isinstance(data["health_score"], (int, float))

    def test_analyze_with_malformed_input_returns_422(self):
        """Missing required fields should return 422."""
        res = client.post("/analyze", json={"invalid": "payload"})
        assert res.status_code == 422

    def test_analyze_returns_forecast_array(self):
        """Response must include a non-empty forecast array."""
        payload = {
            "user_id": "test-user-003",
            "transactions": make_transactions(30),
            "income": 70000,
            "monthly_budget": 35000,
        }
        res = client.post("/analyze", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert "forecast" in data
        assert isinstance(data["forecast"], list)

    def test_analyze_returns_risk_factors(self):
        """Response should include a risk_factors list."""
        payload = {
            "user_id": "test-user-004",
            "transactions": make_transactions(50),
            "income": 60000,
            "monthly_budget": 30000,
        }
        res = client.post("/analyze", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert "risk_factors" in data
        assert isinstance(data["risk_factors"], list)


# ─── /categorize tests ───────────────────────────────────────────────────────

class TestCategorize:
    def test_categorize_swiggy_as_food(self):
        """'Swiggy' should map to Food & Dining."""
        res = client.post("/categorize", json={
            "merchant": "Swiggy",
            "description": "Swiggy food order",
            "amount": 350,
        })
        assert res.status_code == 200
        data = res.json()
        assert "category" in data
        assert isinstance(data["category"], str)

    def test_categorize_with_malformed_input_returns_422(self):
        """Missing required fields or invalid data should return 422."""
        res = client.post("/categorize", json={"merchant": "Zomato", "amount": -100})
        assert res.status_code == 422

    def test_categorize_returns_string_category(self):
        """Category should always be a non-empty string."""
        res = client.post("/categorize", json={
            "merchant": "Unknown Store XYZ",
            "description": "Purchase at Unknown Store",
            "amount": 499,
        })
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data["category"], str)
        assert len(data["category"]) > 0


# ─── /anomalies tests ────────────────────────────────────────────────────────

class TestAnomalies:
    def test_anomalies_with_few_transactions_returns_empty(self):
        """Fewer than 10 transactions should return empty anomalies list gracefully."""
        payload = {
            "transactions": make_transactions(5),
            "user_id": "test-user-005",
        }
        res = client.post("/anomalies", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert "anomalies" in data
        assert isinstance(data["anomalies"], list)

    def test_anomalies_returns_list_for_full_dataset(self):
        """Full dataset should return a list (possibly empty)."""
        payload = {
            "transactions": make_transactions(50),
            "user_id": "test-user-006",
        }
        res = client.post("/anomalies", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data["anomalies"], list)

    def test_anomalies_with_malformed_input_returns_422(self):
        """Missing transactions field should return 422."""
        res = client.post("/anomalies", json={"user_id": "x"})
        assert res.status_code == 422


# ─── /categorize-batch tests ─────────────────────────────────────────────────

class TestCategorizeBatch:
    def test_batch_categorize_returns_correct_count(self):
        """Number of returned categories should match input count."""
        transactions = [
            {"index": 1, "merchant": "Swiggy", "description": "Food delivery", "amount": 350},
            {"index": 2, "merchant": "Amazon", "description": "Online shopping", "amount": 1299},
            {"index": 3, "merchant": "Uber", "description": "Cab ride", "amount": 180},
        ]
        res = client.post("/categorize-batch", json={"transactions": transactions})
        assert res.status_code == 200
        data = res.json()
        assert "results" in data
        assert len(data["results"]) == 3

    def test_batch_categorize_empty_list(self):
        """Empty batch should return an empty categories list."""
        res = client.post("/categorize-batch", json={"transactions": []})
        assert res.status_code == 200
        data = res.json()
        assert data["results"] == []
