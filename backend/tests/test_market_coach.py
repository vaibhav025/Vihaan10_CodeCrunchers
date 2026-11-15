"""Coach answers about the real downloaded NSE day: exact public prices, private holdings."""
import json

import pytest

from app.services import assistant, market_day
from app.services.assistant import answer, detect_intent

DAY = {"version": 1, "date": "2026-11-13", "interval": "1m", "synthetic": False, "source": "test", "times": ["09:15", "09:16"],
       "index": {"symbol": "NIFTY 50", "name": "Nifty 50", "prevClose": 100.0, "close": [100.0, 101.0]},
       "stocks": [{"symbol": "RELIANCE", "name": "Reliance Industries", "prevClose": 1000.0, "close": [990.0, 1020.0]},
                  {"symbol": "INFY", "name": "Infosys", "prevClose": 1500.0, "close": [1500.0, 1470.0]},
                  {"symbol": "TCS", "name": "Tata Consultancy Services", "prevClose": 3000.0, "close": [3000.0, 3030.0]}]}
PROFILE = {"age": 28, "retirement_age": 60, "risk_profile": "moderate"}
MONEY = {"assets": [{"id": "s1", "type": "stocks", "value": 10200, "monthly": 0, "symbol": "RELIANCE", "qty": 10},
                    {"id": "s2", "type": "stocks", "value": 14700, "monthly": 0, "symbol": "INFY", "qty": 10}],
         "income": 80000, "expenses": 40000, "emi": 0, "loans": 0, "costs": []}


@pytest.fixture
def day_file(tmp_path, monkeypatch):
    f = tmp_path / "replay.json"
    f.write_text(json.dumps(DAY))
    monkeypatch.setattr(market_day.settings, "MARKET_DATA_FILE", str(f))
    market_day._cache.update(key=None, data=None)
    return f


@pytest.mark.parametrize("q", ["How did the market do on Friday?", "What did Nifty close at?", "How did Infosys do?",
                               "Reliance share price", "How did my stocks do today?", "TCS kaisa raha"])
def test_market_questions_route_to_market(day_file, q):
    assert detect_intent(q) == "market"


@pytest.mark.parametrize("q,intent", [("What is my net worth?", "mine"), ("What is a mutual fund?", "general"),
                                      ("How much do I have in stocks?", "mine")])
def test_other_questions_are_unchanged(day_file, q, intent):
    assert detect_intent(q) == intent


@pytest.mark.asyncio
async def test_named_stock_uses_real_prices(day_file):
    r = await answer("How did Reliance do?", [], PROFILE, MONEY, {}, allow_ai=False)
    assert r["intent"] == "market"
    assert "₹1,020.00" in r["reply"] and "+2.00%" in r["reply"] and "Nifty 50" in r["reply"]
    assert "Friday, 13 November 2026" in r["reply"]


@pytest.mark.asyncio
async def test_my_stocks_are_valued_from_linked_holdings(day_file):
    r = await answer("How did my stocks do today?", [], PROFILE, MONEY, {}, allow_ai=False)
    # 10 × 1020 + 10 × 1470 = 24,900; change 10 × 20 − 10 × 30 = −100
    assert "₹24,900" in r["reply"] and "-₹100" in r["reply"]


@pytest.mark.asyncio
async def test_market_answers_never_go_to_a_model(day_file, monkeypatch):
    async def boom(*a, **k):
        raise AssertionError("market answers must stay local")
    monkeypatch.setattr(assistant, "complete", boom)
    r = await answer("How did my stocks do today?", [], PROFILE, MONEY, {}, allow_ai=True)
    assert r["provider"] == "private"


@pytest.mark.asyncio
async def test_missing_or_sample_file_is_said_plainly(tmp_path, monkeypatch):
    sample = dict(DAY, synthetic=True)
    f = tmp_path / "s.json"
    f.write_text(json.dumps(sample))
    monkeypatch.setattr(market_day.settings, "MARKET_DATA_FILE", str(f))
    market_day._cache.update(key=None, data=None)
    r = await answer("How did the market do?", [], PROFILE, MONEY, {}, allow_ai=False)
    assert "not been downloaded" in r["reply"]
