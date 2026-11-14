"""Display raw ciphertext beside the API-level decrypted view for a demo user.
Run from backend/: python -m scripts.show_data_vault --user-id <uuid>
Use only a synthetic/demo account; output contains decrypted personal data.
"""
import argparse
import asyncio
import json
from sqlalchemy import text
from app.database import AsyncSessionLocal
from app.models.user import User
from app.utils.encryption import decrypt_data

async def show(user_id: str):
    async with AsyncSessionLocal() as session:
        raw = (await session.execute(text("SELECT id, name, email, age, financial_data FROM users WHERE id=:id"), {"id": user_id})).mappings().first()
        user = await session.get(User, user_id)
        if raw is None or user is None:
            raise SystemExit("No matching user")
        print(json.dumps({
            "raw_database_ciphertext": {key: raw[key] for key in ("name", "email", "age", "financial_data")},
            "decrypted_api_view": {"id": str(user.id), "name": user.name, "email": user.email,
                                   "age": user.age, "financial_data": decrypt_data(user.financial_data)},
        }, indent=2, ensure_ascii=False, default=str))

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--user-id", required=True)
    asyncio.run(show(parser.parse_args().user_id))
