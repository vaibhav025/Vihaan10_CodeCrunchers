"""One-off encryption pass for installations that predate encrypted DB columns.
Run with: python -m scripts.migrate_legacy_encryption (from backend/).
"""
import asyncio
import json
from sqlalchemy import text, JSON, String, bindparam
from app.database import AsyncSessionLocal
from app.utils.encryption import CONTRIBUTION_AAD, encrypt, decrypt, email_fingerprint, encrypt_data

async def migrate():
    # Encrypt data from pre-encryption installs before the API begins serving requests.
    async with AsyncSessionLocal() as session:
        users = (await session.execute(text("SELECT id, name, email, phone, age, income_range, risk_profile, retirement_age, fcm_token, city, email_lookup, financial_data FROM users"))).all()
        user_aad = {
            "name": b"pensionquest:user:name:v1", "email": b"pensionquest:user:email:v1",
            "phone": b"pensionquest:user:phone:v1", "age": b"pensionquest:user:age:v1",
            "income_range": b"pensionquest:user:income_range:v1", "risk_profile": b"pensionquest:user:risk_profile:v1",
            "retirement_age": b"pensionquest:user:retirement_age:v1", "fcm_token": b"pensionquest:user:fcm_token:v1",
            "city": b"pensionquest:user:city:v1",
        }
        for row in users:
            values = {field: getattr(row, field) for field in user_aad}
            for field, aad in user_aad.items():
                value = values[field]
                if value is not None and not (isinstance(value, str) and value.startswith("enc:v1:")):
                    values[field] = encrypt(str(value), aad)
            email = row.email
            if isinstance(email, str) and email.startswith("enc:v1:"):
                email = decrypt(email, user_aad["email"])
            lookup = row.email_lookup or email_fingerprint(email)
            financial_data = row.financial_data
            if isinstance(financial_data, str):
                try:
                    financial_data = json.loads(financial_data)
                except json.JSONDecodeError:
                    pass
            if isinstance(financial_data, dict):
                financial_data = encrypt_data(financial_data)
            elif isinstance(financial_data, str) and not financial_data.startswith("enc:v1:"):
                try:
                    parsed = json.loads(financial_data)
                    if isinstance(parsed, dict):
                        financial_data = encrypt_data(parsed)
                except json.JSONDecodeError:
                    pass
            update_user = text("""UPDATE users SET name=:name, email=:email, phone=:phone, age=:age,
                income_range=:income_range, risk_profile=:risk_profile, retirement_age=:retirement_age,
                fcm_token=:fcm_token, city=:city, email_lookup=:email_lookup, financial_data=:financial_data WHERE id=:id""").bindparams(
                bindparam("financial_data", type_=String)
                )
            await session.execute(update_user,
                {**values, "email_lookup": lookup, "financial_data": financial_data, "id": row.id})

        rows = (await session.execute(text("SELECT id, amount FROM contributions WHERE amount NOT LIKE 'enc:v1:%'"))).all()
        for row in rows:
            protected = encrypt(str(float(row.amount)), CONTRIBUTION_AAD)
            await session.execute(text("UPDATE contributions SET amount = :amount WHERE id = :id"), {"amount": protected, "id": row.id})
        await session.commit()

if __name__ == "__main__":
    asyncio.run(migrate())
