"""The market-day downloader: turning raw yfinance frames into the file the website reads."""
from datetime import date

import pytest

pd = pytest.importorskip("pandas")

from scripts import fetch_market_day as fm  # noqa: E402

DAY = date(2026, 11, 13)


def _bars(start_price, n=375, minute_gap=None):
    idx = pd.date_range("2026-11-13 09:15", periods=n, freq="min", tz="Asia/Kolkata")
    close = [start_price * (1 + 0.0001 * i) for i in range(n)]
    df = pd.DataFrame({"Close": close}, index=idx)
    if minute_gap:
        df = df.drop(df.index[minute_gap[0]:minute_gap[1]])
    return df


def _frames(symbols, bad=None):
    """Fake yfinance output: intraday and daily frames with a (ticker, field) column layout."""
    intra, daily = {}, {}
    for sym in symbols:
        gap = (100, 150) if sym == bad else None
        for field, col in _bars(100.0, minute_gap=gap).items():
            intra[(sym, field)] = col
        d = pd.DataFrame({"Close": [99.0, 100.0, 101.0]}, index=pd.to_datetime(["2026-11-11", "2026-11-12", "2026-11-13"]))
        for field, col in d.items():
            daily[(sym, field)] = col
    return pd.DataFrame(intra), pd.DataFrame(daily)


def test_payload_shape_and_alignment():
    syms = ["^NSEI", "RELIANCE.NS", "TCS.NS"]
    intra, daily = _frames(syms)
    out = fm.build_payload(intra, daily, DAY, "1m", "test")
    assert out["times"][0] == "09:15" and out["times"][-1] == "15:29" and len(out["times"]) == 375
    assert [s["symbol"] for s in out["stocks"]] == ["RELIANCE", "TCS"]
    for s in out["stocks"]:
        assert len(s["close"]) == 375 and s["prevClose"] == 100.0   # previous session, not the day itself
    assert out["index"]["symbol"] == "NIFTY 50" and len(out["index"]["close"]) == 375
    assert out["synthetic"] is False


def test_stock_with_too_many_missing_bars_is_skipped():
    syms = ["^NSEI", "RELIANCE.NS", "TCS.NS"]
    intra, daily = _frames(syms, bad="TCS.NS")
    intra = intra.copy()
    # remove 60% of TCS bars
    drop = intra[("TCS.NS", "Close")].index[::2]
    intra.loc[drop, ("TCS.NS", "Close")] = float("nan")
    drop = intra[("TCS.NS", "Close")].index[1:200:2]
    intra.loc[drop, ("TCS.NS", "Close")] = float("nan")
    out = fm.build_payload(intra, daily, DAY, "1m", "test")
    assert "TCS" in out["skipped"] and [s["symbol"] for s in out["stocks"]] == ["RELIANCE"]


def test_no_data_for_the_day_is_a_clear_error():
    intra, daily = _frames(["^NSEI", "RELIANCE.NS"])
    with pytest.raises(SystemExit, match="no data"):
        fm.build_payload(intra, daily, date(2026, 11, 12), "1m", "test")   # bars exist only for the 13th


def test_sample_is_labelled_and_consistent():
    s = fm.sample()
    assert s["synthetic"] is True and len(s["times"]) == 375
    assert all(len(x["close"]) == 375 for x in s["stocks"]) and len(s["index"]["close"]) == 375
    assert not any(x["symbol"] in fm.SYMBOLS for x in s["stocks"])   # never real tickers with fake prices
