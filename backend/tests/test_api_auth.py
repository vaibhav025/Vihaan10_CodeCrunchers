import base64
import secrets
import pytest
import pytest_asyncio
import httpx
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import text

from app.database import Base, get_db
from app.main import app
from app.config import settings
from app.models import user, contribution, quest, streak, badge

@pytest_asyncio.fixture
async def api_client():
    settings.JWT_SECRET = secrets.token_urlsafe(48)
    settings.DATA_ENCRYPTION_KEY = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode()
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async def override_db():
        async with factory() as session:
            yield session
    app.dependency_overrides[get_db] = override_db
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        yield client, engine
    app.dependency_overrides.clear()
    await engine.dispose()

@pytest.mark.asyncio
async def test_register_login_logout_and_ciphertext(api_client):
    client, engine = api_client
    payload = {"name":"Alice", "email":"alice@example.com", "password":"strong-pass-123", "age":30,
        "income_range":"50000-75000", "language":"en", "retirement_age":60,
        "financial_data":{"income":65000,"assets":[{"type":"fd","value":100000}]}, "consent":True}
    response = await client.post("/api/auth/register", json=payload)
    assert response.status_code == 201, response.text
    async with engine.connect() as conn:
        raw = (await conn.execute(text("SELECT name, email, financial_data FROM users"))).one()
    assert raw.name.startswith("enc:v1:primary:")
    assert raw.email.startswith("enc:v1:primary:")
    assert isinstance(raw.financial_data, str) and raw.financial_data.startswith("enc:v1:primary:")
    assert (await client.post("/api/auth/logout")).status_code == 204
    login = await client.post("/api/auth/login", json={"email":"alice@example.com","password":"strong-pass-123"})
    assert login.status_code == 200

@pytest.mark.asyncio
async def test_users_only_see_their_tracker(api_client):
    client, _ = api_client
    def payload(email):
        return {"name":"User", "email":email, "password":"strong-pass-123", "age":30,
          "income_range":"50000-75000", "language":"en", "retirement_age":60,
          "financial_data":{"income":10000 if email.startswith("a") else 90000}, "consent":True}
    a = await client.post("/api/auth/register", json=payload("a@example.com")); assert a.status_code == 201
    a_data = await client.get("/api/tracker"); assert a_data.status_code == 200
    await client.post("/api/auth/logout")
    b = await client.post("/api/auth/register", json=payload("b@example.com")); assert b.status_code == 201
    b_data = await client.get("/api/tracker"); assert b_data.status_code == 200
    assert a_data.json() != b_data.json()

@pytest.mark.asyncio
async def test_monthly_contribution_xp_is_awarded_once(api_client):
    client, _ = api_client
    payload = {"name":"Saver", "email":"saver@example.com", "password":"strong-pass-123", "age":30,
      "income_range":"50000-75000", "language":"en", "retirement_age":60,
      "financial_data":{}, "consent":True}
    assert (await client.post("/api/auth/register", json=payload)).status_code == 201
    one = await client.post("/api/contributions/add", json={"amount":1000})
    two = await client.post("/api/contributions/add", json={"amount":1000})
    assert one.status_code == two.status_code == 200
    assert one.json()["xp_eligible"] is True
    assert two.json()["xp_eligible"] is False
    profile = await client.get("/api/user/profile")
    assert profile.json()["total_xp"] == 500

@pytest.mark.asyncio
async def test_export_and_delete_account(api_client):
    client, _ = api_client
    payload = {"name":"Erase Me", "email":"erase@example.com", "password":"strong-pass-123", "age":30,
      "income_range":"50000-75000", "language":"en", "retirement_age":60,
      "financial_data":{"income":25000}, "consent":True}
    assert (await client.post("/api/auth/register", json=payload)).status_code == 201
    exported = await client.get("/api/user/export")
    assert exported.status_code == 200 and exported.json()["financial_data"]["income"] == 25000
    deleted = await client.delete("/api/user/me")
    assert deleted.status_code == 204
    assert (await client.get("/api/user/profile")).status_code == 401


@pytest.mark.asyncio
async def test_chat_answers_from_own_data_only(api_client):
    client, _ = api_client
    base = {"password": "strong-pass-123", "age": 30, "income_range": "50000-75000", "language": "en", "retirement_age": 60, "consent": True}
    await client.post("/api/auth/register", json={**base, "name": "Bob", "email": "bob@example.com",
                      "financial_data": {"income": 90000, "assets": [{"type": "fd", "value": 700000}]}})
    client.cookies.clear()
    await client.post("/api/auth/register", json={**base, "name": "Cara", "email": "cara@example.com",
                      "financial_data": {"income": 50000, "assets": [{"type": "ppf", "value": 300000}]}})
    response = await client.post("/api/ai/coach/chat", json={"message": "What is my net worth?"})
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["intent"] == "mine" and body["provider"] == "private"
    assert "₹3 L" in body["reply"] and "₹7 L" not in body["reply"]
    client.cookies.clear()
    assert (await client.post("/api/ai/coach/chat", json={"message": "What is my net worth?"})).status_code == 401
