"""The real NSE trading day the app has downloaded (backend/scripts/fetch_market_day.py).

The Coach answers market questions from this file, so every price it quotes is real and was
computed here. Public prices are not personal and may appear in text; the user's own holdings
are still passed to any model only as placeholders (see services/assistant.py).
"""
import json
import re
from datetime import date
from pathlib import Path

from app.config import settings

DEFAULT_FILE = Path(__file__).resolve().parents[3] / "frontend" / "public" / "data" / "replay.json"
_cache: dict = {"key": None, "data": None}
# first words shared by several companies, or too generic to name one on their own
_GENERIC = {"tata", "state", "power", "coal", "asian", "sun", "bajaj", "adani", "hindustan", "larsen", "dr.", "bank", "india"}


def _path() -> Path:
    return Path(settings.MARKET_DATA_FILE) if settings.MARKET_DATA_FILE else DEFAULT_FILE


def load() -> dict | None:
    """The downloaded day, or None when there is no real file. Re-read only when the file changes."""
    p = _path()
    try:
        key = (str(p), p.stat().st_mtime)
    except OSError:
        return None
    if _cache["key"] != key:
        try:
            data = json.loads(p.read_text())
            ok = data.get("version") == 1 and not data.get("synthetic") and data.get("stocks") and data.get("times")
            _cache.update(key=key, data=data if ok else None)
        except (ValueError, OSError):
            _cache.update(key=key, data=None)
    return _cache["data"]


def quotes(data: dict) -> list[dict]:
    out = []
    for s in data["stocks"]:
        close = s["close"]
        price, prev = close[-1], s["prevClose"]
        out.append({"symbol": s["symbol"], "name": s["name"], "price": price, "prev": prev, "pct": (price / prev - 1) * 100,
                    "low": min(close), "high": max(close)})
    return out


def index_quote(data: dict) -> dict:
    ix = data["index"]
    return {"name": ix["name"], "price": ix["close"][-1], "prev": ix["prevClose"], "pct": (ix["close"][-1] / ix["prevClose"] - 1) * 100}


def day_label(data: dict) -> str:
    d = date.fromisoformat(data["date"])
    return d.strftime("%A, %d %B %Y").replace(" 0", " ")


def mentioned(data: dict, text: str) -> list[dict]:
    """Stocks named in the question, by symbol, full name or a distinctive first word."""
    s, found = text.lower(), []
    firsts = {}
    for q in quotes(data):
        firsts.setdefault(q["name"].split()[0].lower(), []).append(q["symbol"])
    for q in quotes(data):
        sym = q["symbol"].lower()
        first = q["name"].split()[0].lower()
        if (len(sym) >= 3 and re.search(rf"(?<![a-z]){re.escape(sym)}(?![a-z])", s)) or q["name"].lower() in s \
                or (len(first) >= 4 and first not in _GENERIC and len(firsts[first]) == 1 and re.search(rf"\b{re.escape(first)}\b", s)):
            found.append(q)
    return found


def linked_holdings(data: dict, assets: list[dict]) -> list[dict]:
    """The user's stocks linked to an NSE symbol with a share count, priced at the day's close."""
    by_sym = {q["symbol"]: q for q in quotes(data)}
    out = []
    for a in assets:
        if not isinstance(a, dict) or a.get("type") != "stocks":
            continue
        q, qty = by_sym.get(a.get("symbol") or ""), a.get("qty")
        if q and isinstance(qty, (int, float)) and qty > 0:
            out.append({"quote": q, "qty": float(qty), "value": qty * q["price"], "change": qty * (q["price"] - q["prev"])})
    return out
