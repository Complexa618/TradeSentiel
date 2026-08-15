from datetime import datetime, timedelta, timezone


def demo_trades():
    now = datetime.now(timezone.utc)

    def mk(sym, direction, risk, reward, strategies, session, tags, d_off, hold_min):
        day = (now - timedelta(days=d_off)).date()
        entry = datetime(day.year, day.month, day.day, 9, 30, tzinfo=timezone.utc)
        exit_ = entry + timedelta(minutes=hold_min)
        return {
            "symbol": sym, "direction": direction, "risk": risk, "reward": reward,
            "strategies": strategies, "session": session, "tags": tags, "notes": "",
            "screenshot": None, "status": "closed",
            "day": day.isoformat(), "date": entry.isoformat(),
            "entryTime": entry.isoformat(), "exitTime": exit_.isoformat(),
        }

    return [
        mk("XAUUSD", "long", 200, 500, ["Order Block"], "London", ["A+ Setup", "Plan Followed"], 12, 95),
        mk("NAS100", "short", 300, 750, ["Reversal"], "NY PM", ["Patience"], 10, 130),
        mk("EURUSD", "long", 150, -150, ["FVG"], "London", ["FOMO"], 9, 40),
        mk("BTCUSD", "long", 400, 1200, ["Breakout", "Liquidity Sweep"], "NY AM", ["A+ Setup"], 7, 240),
        mk("GBPJPY", "short", 250, 500, ["Liquidity Sweep"], "Asia", ["Plan Followed"], 6, 180),
        mk("US30", "long", 200, -200, ["Trend Continuation"], "NY Lunch", ["Overtraded", "Revenge"], 5, 65),
        mk("XAUUSD", "short", 300, 900, ["Reversal"], "London", ["A+ Setup", "Patience"], 3, 150),
        mk("ETHUSD", "long", 350, 700, ["Breakout"], "NY AM", ["Plan Followed"], 2, 300),
        mk("EURUSD", "short", 150, -75, ["FVG"], "Pre Market", ["FOMO", "News"], 1, 55),
        mk("NAS100", "long", 300, 600, ["Order Block"], "NY AM", ["A+ Setup"], 0, 110),
    ]


def demo_accounts():
    return [
        {"name": "FTMO Challenge", "balance": 100000, "broker": "FTMO"},
        {"name": "Personal Live", "balance": 12480, "broker": "IC Markets"},
    ]
