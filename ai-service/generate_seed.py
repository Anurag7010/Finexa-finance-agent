import random, json, os
from datetime import datetime, timedelta
from pathlib import Path
from faker import Faker

# Setup paths relative to the script location
BASE_DIR = Path(__file__).resolve().parent
OUTPUT_FILE = BASE_DIR / "seed_data.json"

fake = Faker('en_IN')

categories = {
    "Food & Dining":    {"min": 200,   "max": 2000,  "freq": 40},
    "Transportation":   {"min": 50,    "max": 800,   "freq": 35},
    "Shopping":         {"min": 500,   "max": 8000,  "freq": 15},
    "Entertainment":    {"min": 200,   "max": 3000,  "freq": 8},
    "Utilities":        {"min": 500,   "max": 2500,  "freq": 4},
    "Health":           {"min": 200,   "max": 5000,  "freq": 5},
    "Groceries":        {"min": 300,   "max": 3000,  "freq": 20},
    "Rent":             {"min": 15000, "max": 25000, "freq": 1},
}

def generate_user_transactions(user_id, num=300, anomaly_count=8):
    txns = []
    cat_names = list(categories.keys())
    weights = [c["freq"] for c in categories.values()]

    for i in range(num):
        cat = random.choices(cat_names, weights=weights)[0]
        c = categories[cat]
        txns.append({
            "user_id": user_id,
            "date": (datetime.now() - timedelta(days=random.randint(0, 90))).isoformat(),
            "amount": round(random.uniform(c["min"], c["max"]), 2),
            "merchant": fake.company(),
            "category": cat,
            "description": f"{fake.bs()}",
            "channel": random.choice(["UPI", "card", "netbanking"]),
            "is_anomaly": False
        })

    # Inject anomalies (large amounts, odd hours)
    for i in range(anomaly_count):
        idx = random.randint(0, num - 1)
        txns[idx]["amount"] = round(txns[idx]["amount"] * random.uniform(6, 18), 2)
        txns[idx]["is_anomaly"] = True
        txns[idx]["merchant"] = random.choice([
            "UNKNOWN MERCHANT 4821", "INTL TXN - SINGAPORE",
            "CRYPTO EXCHANGE XY", "WIRE TRANSFER OUT"
        ])

    return txns

# rohan — at-risk user (use for demo)
rohan_txns = generate_user_transactions("rohan_demo", num=300, anomaly_count=8)

# Alex — healthy user
alex_txns = generate_user_transactions("alex_demo", num=300, anomaly_count=2)

output = {
    "users": [
        {
            "id": "rohan_demo",
            "name": "Rohan Sharma",
            "email": "demo@smartspend.ai",
            "password": "demo1234",
            "monthly_budget": 45000,
            "income": 85000,
            "category_budgets": {
                "Food & Dining": 8000, "Transportation": 3000,
                "Shopping": 7000, "Entertainment": 3000,
                "Utilities": 4000, "Health": 3000,
                "Groceries": 6000, "Rent": 20000
            }
        },
        {
            "id": "alex_demo",
            "name": "Alex Verma",
            "email": "alex@smartspend.ai",
            "password": "demo1234",
            "monthly_budget": 50000,
            "income": 120000,
            "category_budgets": {
                "Food & Dining": 8000, "Transportation": 4000,
                "Shopping": 8000, "Entertainment": 4000,
                "Utilities": 4000, "Health": 4000,
                "Groceries": 8000, "Rent": 22000
            }
        }
    ],
    "transactions": rohan_txns + alex_txns
}

try:
    with open(OUTPUT_FILE, "w") as f:
        json.dump(output, f, indent=2)
    print(f"✅ Generated {len(rohan_txns) + len(alex_txns)} transactions")
    print(f"✅ Saved to {OUTPUT_FILE}")
except Exception as e:
    print(f"❌ Failed to save seed data: {e}")

