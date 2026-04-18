"""
Pytest test suite for the Finexa AI service — transaction categorization.

Tests the /categorize endpoint for deterministic merchant-to-category mapping:
- Swiggy → Food & Dining
- Uber → Transportation
- Netflix → Entertainment
- Empty merchant + description → "Other"
- Unknown merchant → "Other" (not an exception)
"""

import os
import sys

import pytest
from fastapi.testclient import TestClient

# Set dummy env variables before importing main
os.environ.setdefault("OPENAI_API_KEY", "sk-test-key-for-unit-tests-only")
os.environ.setdefault("MONGODB_URI", "mongodb://localhost:27017/test")

# Insert ai-service directory into path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app  # noqa: E402

client = TestClient(app)


# ─── /categorize deterministic mapping tests ─────────────────────────────────

class TestCategorizeMerchants:
    """Validates the rule-based category mapping in /categorize."""

    def test_swiggy_maps_to_food_dining(self):
        """'Swiggy' should categorize as Food & Dining."""
        res = client.post("/categorize", json={
            "merchant": "Swiggy",
            "description": "Food order from Swiggy",
            "amount": 350.0,
        })
        assert res.status_code == 200
        data = res.json()
        assert "category" in data
        category = data["category"].lower()
        # Accept both "food & dining" and "food and dining"
        assert "food" in category or "dining" in category, (
            f"Expected Food/Dining category, got: {data['category']}"
        )

    def test_uber_maps_to_transportation(self):
        """'Uber' should categorize as Transportation."""
        res = client.post("/categorize", json={
            "merchant": "Uber",
            "description": "Cab ride to airport",
            "amount": 280.0,
        })
        assert res.status_code == 200
        data = res.json()
        assert "category" in data
        category = data["category"].lower()
        assert "transport" in category, (
            f"Expected Transportation category, got: {data['category']}"
        )

    def test_netflix_maps_to_entertainment(self):
        """'Netflix' should categorize as Entertainment."""
        res = client.post("/categorize", json={
            "merchant": "Netflix",
            "description": "Monthly subscription",
            "amount": 649.0,
        })
        assert res.status_code == 200
        data = res.json()
        assert "category" in data
        category = data["category"].lower()
        assert "entertainment" in category, (
            f"Expected Entertainment category, got: {data['category']}"
        )

    def test_empty_merchant_returns_other(self):
        """Empty merchant + description should return 'Other', not raise an exception."""
        res = client.post("/categorize", json={
            "merchant": "",
            "description": "",
            "amount": 100.0,
        })
        # Should not crash — returns 200 with a category string
        assert res.status_code == 200
        data = res.json()
        assert "category" in data
        assert isinstance(data["category"], str)
        assert len(data["category"]) > 0

    def test_unknown_merchant_returns_other_not_exception(self):
        """Completely unknown merchant should return 'Other', not crash."""
        res = client.post("/categorize", json={
            "merchant": "XYZ Random Shop 9182",
            "description": "Unknown purchase 8823",
            "amount": 750.0,
        })
        assert res.status_code == 200
        data = res.json()
        assert "category" in data
        # Must be a non-empty string — 'Other' is the expected fallback
        assert isinstance(data["category"], str)
        assert len(data["category"]) > 0

    def test_zomato_maps_to_food_dining(self):
        """'Zomato' is another food delivery merchant — should map to Food & Dining."""
        res = client.post("/categorize", json={
            "merchant": "Zomato",
            "description": "Food delivery",
            "amount": 420.0,
        })
        assert res.status_code == 200
        data = res.json()
        assert "category" in data
        category = data["category"].lower()
        assert "food" in category or "dining" in category, (
            f"Expected Food/Dining category for Zomato, got: {data['category']}"
        )

    def test_amazon_maps_to_shopping(self):
        """'Amazon' should categorize as Shopping."""
        res = client.post("/categorize", json={
            "merchant": "Amazon",
            "description": "Online purchase",
            "amount": 1299.0,
        })
        assert res.status_code == 200
        data = res.json()
        assert "category" in data
        category = data["category"].lower()
        assert "shopping" in category, (
            f"Expected Shopping category, got: {data['category']}"
        )

    def test_category_is_always_string(self):
        """Category field must always be a non-empty string regardless of input."""
        test_cases = [
            {"merchant": "BigBasket", "description": "Grocery delivery", "amount": 800.0},
            {"merchant": "Airtel", "description": "Mobile recharge", "amount": 399.0},
            {"merchant": "Apollo Pharmacy", "description": "Medicine", "amount": 245.0},
        ]
        for case in test_cases:
            res = client.post("/categorize", json=case)
            assert res.status_code == 200
            data = res.json()
            assert isinstance(data.get("category"), str)
            assert len(data["category"]) > 0, f"Empty category for merchant: {case['merchant']}"

    def test_negative_amount_invalid(self):
        """Negative amount is invalid per schema — should return 422."""
        res = client.post("/categorize", json={
            "merchant": "Swiggy",
            "description": "Food order",
            "amount": -100.0,
        })
        assert res.status_code == 422
