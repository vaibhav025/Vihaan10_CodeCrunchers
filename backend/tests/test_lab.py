import pytest
from sqlalchemy import text

from app.limiter import limiter
from app.routers.lab import LAB_DAILY_XP_CAP
from tests.test_api_auth import api_client  # noqa: F401  (shared fixture)


@pytest.fixture(autouse=True)
def fresh_rate_limits():
    # sign-up is rate-limited per address, and every test here registers a user
    limiter.reset()
    yield
    limiter.reset()


def _user(email):
    return {"name": "Lab User", "email": email, "password": "strong-pass-123", "age": 28,
            "income_range": "50000-75000", "language": "en", "retirement_age": 60,
            "financial_data": {"income": 60000}, "consent": True}


@pytest.mark.asyncio
async def test_lab_progress_requires_login(api_client):
    client, _ = api_client
    assert (await client.get("/api/lab/progress")).status_code == 401
    assert (await client.post("/api/lab/progress", json={"module": "stocks", "score": 50, "outcome": "news_round"})).status_code == 401


@pytest.mark.asyncio
async def test_lab_progress_saves_and_loads(api_client):
    client, _ = api_client
    assert (await client.post("/api/auth/register", json=_user("lab@example.com"))).status_code == 201
    assert (await client.get("/api/lab/progress")).json()["progress"] == []

    first = await client.post("/api/lab/progress", json={"module": "stocks", "score": 50, "outcome": "news_round", "lessons": ["news"]})
    assert first.status_code == 200, first.text
    assert first.json()["xp_earned"] == 15  # 0 base + 50 * 0.3
    second = await client.post("/api/lab/progress", json={"module": "stocks", "score": 30, "outcome": "panic_hold", "lessons": ["panic"]})
    assert second.status_code == 200

    # log out and back in: progress is still there
    await client.post("/api/auth/logout")
    assert (await client.post("/api/auth/login", json={"email": "lab@example.com", "password": "strong-pass-123"})).status_code == 200
    rows = (await client.get("/api/lab/progress")).json()["progress"]
    assert len(rows) == 1
    row = rows[0]
    assert row["module"] == "stocks"
    assert row["best_score"] == 50          # the best score is kept, not the latest
    assert row["runs_completed"] == 2
    assert row["last_outcome"] == "panic_hold"
    assert row["last_lessons"] == ["panic"]


@pytest.mark.asyncio
async def test_lab_progress_is_private_to_each_user(api_client):
    client, _ = api_client
    assert (await client.post("/api/auth/register", json=_user("a-lab@example.com"))).status_code == 201
    await client.post("/api/lab/progress", json={"module": "retire", "score": 90, "outcome": "thriving", "lessons": ["early"]})
    await client.post("/api/auth/logout")

    assert (await client.post("/api/auth/register", json=_user("b-lab@example.com"))).status_code == 201
    assert (await client.get("/api/lab/progress")).json()["progress"] == []
    await client.post("/api/lab/progress", json={"module": "retire", "score": 10, "outcome": "critical"})
    mine = (await client.get("/api/lab/progress")).json()["progress"]
    assert [(r["module"], r["best_score"]) for r in mine] == [("retire", 10)]


@pytest.mark.asyncio
async def test_lab_xp_is_capped_per_day(api_client):
    client, _ = api_client
    assert (await client.post("/api/auth/register", json=_user("cap@example.com"))).status_code == 201
    total = 0
    last = None
    for _ in range(4):  # each full-score run asks for 100 XP
        last = (await client.post("/api/lab/progress", json={"module": "retire", "score": 100, "outcome": "thriving"})).json()
        total += last["xp_earned"]
    assert total == LAB_DAILY_XP_CAP
    assert last["xp_earned"] == 0 and last["xp_capped"] is True and last["daily_xp_left"] == 0
    assert (await client.get("/api/user/profile")).json()["total_xp"] == LAB_DAILY_XP_CAP
    # runs still count after the cap; only XP stops
    assert (await client.get("/api/lab/progress")).json()["progress"][0]["runs_completed"] == 4


@pytest.mark.asyncio
async def test_lab_rejects_bad_input_and_stores_no_money(api_client):
    client, engine = api_client
    assert (await client.post("/api/auth/register", json=_user("bad@example.com"))).status_code == 201
    for body in (
        {"module": "casino", "score": 50, "outcome": "x"},
        {"module": "stocks", "score": 101, "outcome": "x"},
        {"module": "stocks", "score": 50, "outcome": "Corpus 1,20,000"},
        {"module": "stocks", "score": 50, "outcome": "ok", "corpus": 5000000, "lessons": ["a"] * 9},
    ):
        assert (await client.post("/api/lab/progress", json=body)).status_code == 422
    ok = await client.post("/api/lab/progress", json={"module": "stocks", "score": 50, "outcome": "ok", "lessons": ["news", "Rs 5,00,000"]})
    assert ok.status_code == 200 and ok.json()["progress"]["last_lessons"] == ["news"]
    async with engine.connect() as conn:
        columns = {r[1] for r in (await conn.execute(text("PRAGMA table_info(lab_progress)"))).all()}
    assert columns == {"id", "user_id", "module", "best_score", "runs_completed", "last_outcome", "last_lessons", "created_at", "updated_at"}


@pytest.mark.asyncio
async def test_deleting_account_removes_lab_progress(api_client):
    client, engine = api_client
    assert (await client.post("/api/auth/register", json=_user("gone@example.com"))).status_code == 201
    await client.post("/api/lab/progress", json={"module": "stocks", "score": 50, "outcome": "news_round"})
    assert (await client.delete("/api/user/me")).status_code == 204
    async with engine.connect() as conn:
        assert (await conn.execute(text("SELECT COUNT(*) FROM lab_progress"))).scalar() == 0
        assert (await conn.execute(text("SELECT COUNT(*) FROM lab_xp_grants"))).scalar() == 0
