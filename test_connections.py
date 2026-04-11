import os, sys
from dotenv import load_dotenv
from openai import OpenAI

# Try loading from multiple possible locations
load_dotenv(".env")
load_dotenv("ai-service/.env")
load_dotenv("backend/.env")

print("--- SmartSpend Connection Test ---")

# 1. Test OpenAI
api_key = os.getenv("OPENAI_API_KEY")
if not api_key or "your-key-here" in api_key:
    print("❌ OpenAI API Key is missing or using placeholder in .env")
else:
    try:
        client = OpenAI(api_key=api_key)
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": "Reply with just the word READY"}]
        )
        print("✅ OpenAI Chat:", resp.choices[0].message.content)
    except Exception as e:
        print(f"❌ OpenAI Error: {e}")

# 2. Test MongoDB URI
uri = os.getenv("MONGODB_URI")
if not uri or "your-password" in uri:
    print("❌ MongoDB URI is missing or using placeholder in .env")
else:
    is_cloud = uri.startswith("mongodb+srv") if uri else False
    print(f"✅ MongoDB URI found (Cloud: {is_cloud})")

print("\n--- Summary ---")
print("If you see ❌, update your .env files with actual credentials.")

