"""Download one real NSE trading day for the Market Lab "Replay a real trading day" screen.

Run from backend/ on a computer with normal internet access:

    pip install yfinance pandas
    python -m scripts.fetch_market_day --date 2026-11-13

It writes ../frontend/public/data/replay.json, which the website loads. Nothing is fetched
while the app runs: you download once, and the screen replays the saved file.

    python -m scripts.fetch_market_day --sample      made-up prices, for testing the screen

About the data: prices come from Yahoo Finance through the unofficial `yfinance` library (NSE symbols
end in ".NS"). It is not an official exchange feed, it can break without notice, and Yahoo only keeps
1-minute bars for roughly the last week (5-minute bars for about 60 days). Download soon after the
trading day. The data is for learning only. Read NSE's data policy
(https://www.nseindia.com/market-data/nse-data-policy) before using or sharing it beyond a demo.
"""
import argparse
import json
import math
import random
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

TZ = "Asia/Kolkata"
DEFAULT_OUT = Path(__file__).resolve().parents[2] / "frontend" / "public" / "data" / "replay.json"
SAMPLE_OUT = DEFAULT_OUT.with_name("replay-sample.json")

# Large, widely held NSE stocks. A symbol that Yahoo has no data for is skipped with a message.
SYMBOLS = {
    "RELIANCE": "Reliance Industries", "TCS": "Tata Consultancy Services", "HDFCBANK": "HDFC Bank",
    "INFY": "Infosys", "ICICIBANK": "ICICI Bank", "HINDUNILVR": "Hindustan Unilever", "ITC": "ITC",
    "SBIN": "State Bank of India", "BHARTIARTL": "Bharti Airtel", "KOTAKBANK": "Kotak Mahindra Bank",
    "LT": "Larsen & Toubro", "AXISBANK": "Axis Bank", "ASIANPAINT": "Asian Paints", "MARUTI": "Maruti Suzuki",
    "SUNPHARMA": "Sun Pharma", "TITAN": "Titan Company", "ULTRACEMCO": "UltraTech Cement", "NESTLEIND": "Nestle India",
    "WIPRO": "Wipro", "HCLTECH": "HCL Technologies", "ONGC": "ONGC", "NTPC": "NTPC", "POWERGRID": "Power Grid",
    "TATASTEEL": "Tata Steel", "M&M": "Mahindra & Mahindra", "BAJFINANCE": "Bajaj Finance", "ADANIPORTS": "Adani Ports",
    "COALINDIA": "Coal India", "DRREDDY": "Dr. Reddy's Laboratories", "CIPLA": "Cipla",
}
INDEX = ("^NSEI", "NIFTY 50", "Nifty 50")
MIN_COVERAGE = 0.9   # a stock must have real bars for at least this share of the day


def _series(frame, ticker: str):
    """One ticker's frame out of a yfinance download, whichever column layout it used."""
    cols = frame.columns
    if getattr(cols, "nlevels", 1) > 1:
        for level in range(cols.nlevels):
            if ticker in cols.get_level_values(level):
                return frame.xs(ticker, axis=1, level=level)
        return None
    return frame


def build_payload(intraday, daily, day: date, interval: str, source: str) -> dict:
    """Turn raw yfinance frames into the JSON the website reads. Pure: no network."""
    import pandas as pd

    def on_day(df):
        if df is None or df.empty or "Close" not in df:
            return None
        idx = df.index.tz_localize("UTC") if df.index.tz is None else df.index
        df = df.copy()
        df.index = idx.tz_convert(TZ)
        df = df[(df.index.date == day)]
        df = df[df["Close"].notna()]
        return df if not df.empty else None

    def prev_close(ticker: str):
        d = _series(daily, ticker)
        if d is None or "Close" not in d:
            return None
        closes = d["Close"].dropna()
        idx = closes.index.tz_localize("UTC") if closes.index.tz is None else closes.index
        closes = closes.copy()
        closes.index = idx.tz_convert(TZ) if idx.tz is not None else idx
        before = closes[[x.date() < day for x in closes.index]]
        return float(before.iloc[-1]) if len(before) else None

    index_bars = on_day(_series(intraday, INDEX[0]))
    candidates = {}
    for sym in SYMBOLS:
        bars = on_day(_series(intraday, sym + ".NS"))
        if bars is not None:
            candidates[sym] = bars
    if index_bars is None and not candidates:
        raise SystemExit(
            f"Yahoo returned no data for {day}. Check it was a trading day. 1-minute data only goes back about a week "
            "(try --interval 5m for about 60 days), and the date must not be in the future.")
    grid = (index_bars if index_bars is not None else max(candidates.values(), key=len)).index
    times = [t.strftime("%H:%M") for t in grid]

    def align(bars, first_fallback: float):
        s = bars["Close"].reindex(grid).ffill().bfill()
        s = s.fillna(first_fallback)
        return [round(float(v), 2) for v in s.tolist()]

    stocks, skipped = [], []
    for sym, bars in candidates.items():
        coverage = bars["Close"].reindex(grid).notna().mean()
        pc = prev_close(sym + ".NS")
        if coverage < MIN_COVERAGE or pc is None or not math.isfinite(pc) or pc <= 0:
            skipped.append(sym)
            continue
        close = align(bars, pc)
        if abs(close[0] / pc - 1) > 0.25:     # a gap this large is far more likely bad data than a real open
            skipped.append(sym)
            continue
        stocks.append({"symbol": sym, "name": SYMBOLS[sym], "prevClose": round(pc, 2), "close": close})
    if not stocks:
        raise SystemExit("No stock had complete data for that day, so nothing was saved.")

    ipc = prev_close(INDEX[0])
    if index_bars is not None and ipc:
        index = {"symbol": INDEX[1], "name": INDEX[2], "prevClose": round(ipc, 2), "close": align(index_bars, ipc)}
    else:
        # no index bars: build a simple equal-weight stand-in so the screen still has a benchmark
        n = len(times)
        base = [sum(s["close"][i] / s["prevClose"] for s in stocks) / len(stocks) for i in range(n)]
        index = {"symbol": "BASKET", "name": "Average of these stocks", "prevClose": 100.0, "close": [round(100 * b, 2) for b in base]}
        print("Note: no Nifty bars for that day; using the average of the stocks as the benchmark.")
    return {
        "version": 1, "date": day.isoformat(), "interval": interval, "synthetic": False, "source": source,
        "fetchedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "times": times, "index": index, "stocks": stocks, "skipped": skipped,
    }


def fetch(day: date, interval: str) -> dict:
    try:
        import yfinance as yf
    except ImportError:
        raise SystemExit("Install the data libraries first:  pip install yfinance pandas")
    tickers = [s + ".NS" for s in SYMBOLS] + [INDEX[0]]
    # Ask for a window around the day, then keep only the day itself, so time zones cannot cut the session.
    start, end = day - timedelta(days=1), day + timedelta(days=2)
    print(f"Downloading {len(tickers)} symbols for {day} ({interval} bars)…")
    intraday = yf.download(tickers, start=start.isoformat(), end=end.isoformat(), interval=interval,
                           group_by="ticker", auto_adjust=False, progress=False, threads=True)
    daily = yf.download(tickers, start=(day - timedelta(days=12)).isoformat(), end=(day + timedelta(days=1)).isoformat(),
                        interval="1d", group_by="ticker", auto_adjust=False, progress=False, threads=True)
    return build_payload(intraday, daily, day, interval, "Yahoo Finance via yfinance (unofficial), NSE prices")


def sample(seed: int = 2026) -> dict:
    """Made-up prices for the fictional companies, to test the screen without any download."""
    rng = random.Random(seed)
    base = [("Nirmaan Setu Buildcon", 420), ("Shilaprastha Cement", 1850), ("Lohagarh Steel", 640), ("Saksham Janata Bank", 980),
            ("TapPe Payments", 310), ("Sanganak Infotech", 1420), ("Ghar-Ghar Foods", 2260), ("Aarogyam Pharma", 760)]
    n = 375
    times = [f"{9 + (15 + i) // 60:02d}:{(15 + i) % 60:02d}" for i in range(n)]
    market = [0.0]
    for _ in range(n - 1):
        market.append(market[-1] + rng.gauss(0, 0.0004))
    stocks = []
    for k, (name, price) in enumerate(base):
        pc = float(price)
        beta, own, x, close = rng.uniform(0.6, 1.4), rng.uniform(0.0003, 0.0009), 0.0, []
        for i in range(n):
            x += rng.gauss(0, own)
            close.append(round(pc * math.exp(beta * market[i] + x), 2))
        stocks.append({"symbol": f"SAMPLE{k + 1}", "name": name, "prevClose": pc, "close": close})
    index_close = [round(100 * math.exp(m), 2) for m in market]
    return {"version": 1, "date": "2026-01-01", "interval": "1m", "synthetic": True,
            "source": "Made-up sample prices (not real)", "fetchedAt": "", "times": times,
            "index": {"symbol": "SAMPLE", "name": "Sample market", "prevClose": 100.0, "close": index_close},
            "stocks": stocks, "skipped": []}


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    p.add_argument("--date", help="trading day, YYYY-MM-DD")
    p.add_argument("--interval", default="1m", choices=["1m", "2m", "5m"], help="bar size (default 1m)")
    p.add_argument("--out", type=Path, help="output file")
    p.add_argument("--sample", action="store_true", help="write made-up sample data instead of downloading")
    a = p.parse_args()
    if a.sample:
        payload, out = sample(), a.out or SAMPLE_OUT
    else:
        if not a.date:
            p.error("--date is required (for example --date 2026-11-13)")
        day = date.fromisoformat(a.date)
        if day.weekday() >= 5:
            p.error(f"{day} is a weekend; the NSE is closed")
        payload = fetch(day, a.interval)
        out = a.out or DEFAULT_OUT
        if len(payload["stocks"]) < 5:
            print("Warning: fewer than 5 stocks had usable data.", file=sys.stderr)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, separators=(",", ":")))
    print(f"\nSaved {out}  ({out.stat().st_size / 1024:.0f} KB, {len(payload['times'])} bars, {len(payload['stocks'])} stocks)")
    if payload.get("skipped"):
        print("Skipped (no complete data): " + ", ".join(payload["skipped"]))
    idx = payload["index"]
    print(f"{idx['name']}: {(idx['close'][-1] / idx['prevClose'] - 1) * 100:+.2f}% on the day")
    for s in payload["stocks"]:
        print(f"  {s['symbol']:<11} {s['close'][0]:>9.2f} -> {s['close'][-1]:>9.2f}  {(s['close'][-1] / s['prevClose'] - 1) * 100:+6.2f}% vs previous close")


if __name__ == "__main__":
    main()
