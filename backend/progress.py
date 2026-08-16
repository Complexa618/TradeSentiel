"""Trading Progress engine — computes real-data stats, streaks, records,
discipline, XP/level, and evaluates achievements. Pure functions (no DB)."""
from datetime import datetime, timezone, timedelta
from collections import defaultdict

PLAN_TAG = "plan followed"
REVENGE_TAG = "revenge"
OVERTRADED_TAG = "overtraded"

LEVEL_TITLES = {
    1: "Rookie", 2: "Novice", 3: "Apprentice", 4: "Trader", 5: "Skilled",
    6: "Sharpshooter", 7: "Consistent Operator", 8: "Strategist",
    9: "Veteran", 10: "Elite Operator",
}

DEFAULT_XP = {"trade": 10, "journal": 5, "screenshot": 3, "plan": 10, "goal": 50, "achievement": 25}

# Default achievement definitions (seeded per-user, editable/deletable)
DEFAULT_ACHIEVEMENTS = [
    ("First Blood", "Log your first trade", "Trading", "Swords", "trade_count", 1, None),
    ("Getting Started", "Log 10 trades", "Trading", "TrendingUp", "trade_count", 10, None),
    ("Operator", "Log 30 trades", "Trading", "Award", "trade_count", 30, None),
    ("Century", "Log 100 trades", "Trading", "Trophy", "trade_count", 100, None),
    ("On Fire", "Hit a 5-trade win streak", "Trading", "Flame", "win_streak", 5, None),
    ("Unstoppable", "Hit a 10-trade win streak", "Trading", "Zap", "win_streak", 10, None),
    ("Sharpshooter", "Reach a 60% win rate (10+ trades)", "Profitability", "Target", "win_rate", 60, None),
    ("In Profit", "Reach $1,000 net P&L", "Profitability", "DollarSign", "profit", 1000, None),
    ("Five Figures", "Reach $10,000 net P&L", "Profitability", "Gem", "profit", 10000, None),
    ("Plan Master", "Follow your plan on 20 trades", "Discipline", "ShieldCheck", "plan_followed", 20, None),
    ("Cool Head", "Log 30 trades without a Revenge tag", "Discipline", "Brain", "no_revenge", 30, None),
    ("Journalist", "Add notes to 25 trades", "Journaling", "NotebookPen", "journal_trades", 25, None),
    ("Evidence Keeper", "Attach media to 15 trades", "Journaling", "Camera", "screenshots", 15, None),
    ("Consistent", "Trade on 15 active days", "Consistency", "CalendarCheck", "active_days", 15, None),
    ("Morning Master", "Complete 20 NY AM trades", "Sessions", "Sunrise", "session_count", 20, "NY AM"),
]


def _num(v):
    try:
        return float(v)
    except Exception:
        return 0.0


def _tags(t):
    return [str(x).strip().lower() for x in (t.get("tags") or [])]


def _has_notes(t):
    return bool((t.get("notes") or "").strip())


def _has_media(t):
    return int(t.get("photoCount") or 0) > 0 or bool(t.get("screenshot"))


def _sorted_closed(trades):
    closed = [t for t in trades if t.get("status") == "closed"]
    def key(t):
        return (t.get("date") or t.get("entryTime") or "", t.get("entryTime") or "")
    return sorted(closed, key=key)


def _day_of(t):
    return (t.get("day") or (t.get("date") or "")[:10]) or ""


def _iso_week(day_str):
    try:
        d = datetime.fromisoformat(day_str)
    except Exception:
        return day_str
    y, w, _ = d.isocalendar()
    return f"{y}-W{w:02d}"


def _month(day_str):
    return day_str[:7] if day_str else ""


def _group_pnl(closed, key_fn):
    g = defaultdict(lambda: {"pnl": 0.0, "count": 0, "wins": 0})
    for t in closed:
        k = key_fn(t)
        if not k:
            continue
        g[k]["pnl"] += _num(t.get("pnl"))
        g[k]["count"] += 1
        if _num(t.get("pnl")) > 0:
            g[k]["wins"] += 1
    return g


def _best(group):
    if not group:
        return None
    k, v = max(group.items(), key=lambda kv: kv[1]["pnl"])
    return {"key": k, **v}


def _streaks(closed):
    cur_w = cur_l = best_w = best_l = 0
    for t in closed:
        p = _num(t.get("pnl"))
        if p > 0:
            cur_w += 1; best_w = max(best_w, cur_w); cur_l = 0
        elif p < 0:
            cur_l += 1; best_l = max(best_l, cur_l); cur_w = 0
    trail_w = trail_l = 0
    for t in reversed(closed):
        if _num(t.get("pnl")) > 0:
            trail_w += 1
        else:
            break
    for t in reversed(closed):
        if _num(t.get("pnl")) < 0:
            trail_l += 1
        else:
            break
    return {"currentWin": trail_w, "bestWin": best_w, "currentLoss": trail_l, "bestLoss": best_l}


def _level_from_xp(xp):
    lvl, req, prev = 1, 300, 0
    while xp >= prev + req:
        prev += req
        lvl += 1
        req = round(req * 1.3)
        if lvl >= 99:
            break
    return {
        "level": lvl,
        "title": LEVEL_TITLES.get(lvl, LEVEL_TITLES[10]),
        "xpTotal": int(xp),
        "xpInLevel": int(xp - prev),
        "xpForNext": int(req),
        "percent": round((xp - prev) / req * 100, 1) if req else 100,
    }


def _discipline(closed):
    n = len(closed)
    if n == 0:
        return {"score": 0, "label": "No data", "factors": {"planFollowed": 0, "riskDiscipline": 0, "journal": 0, "overtrading": 0}}
    plan = sum(1 for t in closed if PLAN_TAG in _tags(t)) / n * 100
    journal = sum(1 for t in closed if _has_notes(t)) / n * 100
    overtrading = 100 - (sum(1 for t in closed if OVERTRADED_TAG in _tags(t)) / n * 100)
    risks = sorted(_num(t.get("risk")) for t in closed if _num(t.get("risk")) > 0)
    if len(risks) >= 3:
        median = risks[len(risks) // 2]
        within = sum(1 for r in risks if 0.5 * median <= r <= 1.5 * median)
        risk_disc = within / len(risks) * 100
    else:
        risk_disc = 100.0
    factors = {
        "planFollowed": round(plan),
        "riskDiscipline": round(risk_disc),
        "journal": round(journal),
        "overtrading": round(overtrading),
    }
    score = round(sum(factors.values()) / len(factors))
    label = "Excellent" if score >= 85 else "Strong" if score >= 70 else "Developing" if score >= 50 else "Needs Work"
    return {"score": score, "label": label, "factors": factors}


def _eval_single(rtype, target, meta, ctx):
    closed = ctx["closed"]
    current = 0.0
    unlocked = False
    if rtype == "trade_count":
        current = ctx["total"]
    elif rtype == "win_count":
        current = ctx["wins"]
    elif rtype == "loss_count":
        current = ctx["losses"]
    elif rtype == "win_streak":
        current = ctx["streaks"]["bestWin"]
    elif rtype == "profit":
        current = ctx["netPL"]
    elif rtype == "daily_pnl":
        current = ctx["bestDayPnl"]
    elif rtype == "weekly_pnl":
        current = ctx["bestWeekPnl"]
    elif rtype == "monthly_pnl":
        current = ctx["bestMonthPnl"]
    elif rtype == "win_rate":
        current = ctx["winRate"]
        unlocked = ctx["total"] >= 10 and current >= target
    elif rtype == "avg_rr":
        current = ctx["avgR"]
    elif rtype == "rr_above":
        thr = _num(meta) if meta else 1
        current = sum(1 for t in closed if _num(t.get("rMultiple")) >= thr)
    elif rtype == "session_count":
        current = sum(1 for t in closed if (t.get("session") or "") == meta)
    elif rtype == "strategy_count":
        m = (meta or "").strip().lower()
        current = sum(1 for t in closed if m in [str(s).strip().lower() for s in (t.get("strategies") or [])])
    elif rtype == "strategy_pnl":
        m = (meta or "").strip().lower()
        current = round(sum(_num(t.get("pnl")) for t in closed if m in [str(s).strip().lower() for s in (t.get("strategies") or [])]), 2)
    elif rtype == "journal_trades":
        current = ctx["journalTrades"]
    elif rtype == "screenshots":
        current = ctx["mediaTrades"]
    elif rtype == "plan_followed":
        current = ctx["planFollowed"]
    elif rtype == "no_revenge":
        current = ctx["noRevenge"]
    elif rtype == "avoid_tag":
        m = (meta or "").strip().lower()
        current = sum(1 for t in closed if m and m not in _tags(t))
    elif rtype == "tag_used":
        m = (meta or "").strip().lower()
        current = sum(1 for t in closed if m and m in _tags(t))
    elif rtype == "active_days":
        current = ctx["activeDays"]
    if rtype != "win_rate":
        unlocked = target > 0 and current >= target
    pct = 100.0 if unlocked else (min(current / target, 1.0) * 100 if target > 0 else 0)
    return {"current": round(current, 2), "target": round(target, 2), "percent": round(pct, 1),
            "unlocked": unlocked, "remaining": round(max(target - current, 0), 2)}


def evaluate_achievement(defn, ctx):
    conds = defn.get("conditions") or []
    if conds:
        results, done = [], 0
        for c in conds:
            r = _eval_single(c.get("requirement_type"), _num(c.get("requirement_value")), c.get("requirement_meta"), ctx)
            if r["unlocked"]:
                done += 1
            results.append({"requirement_type": c.get("requirement_type"), "requirement_meta": c.get("requirement_meta"), "label": c.get("label"), **r})
        total = len(conds)
        return {"current": done, "target": total, "percent": round(done / total * 100, 1) if total else 0,
                "unlocked": done == total and total > 0, "remaining": total - done, "conditions": results, "multi": True}
    r = _eval_single(defn.get("requirement_type"), _num(defn.get("requirement_value")), defn.get("requirement_meta"), ctx)
    return {**r, "conditions": [], "multi": False}


def compute_context(trades):
    closed = _sorted_closed(trades)
    n = len(closed)
    wins = [t for t in closed if _num(t.get("pnl")) > 0]
    losses = [t for t in closed if _num(t.get("pnl")) < 0]
    net = round(sum(_num(t.get("pnl")) for t in closed), 2)
    rmults = [_num(t.get("rMultiple")) for t in closed if t.get("rMultiple") is not None]
    by_day = _group_pnl(closed, _day_of)
    by_week = _group_pnl(closed, lambda t: _iso_week(_day_of(t)))
    by_month = _group_pnl(closed, lambda t: _month(_day_of(t)))
    return {
        "closed": closed,
        "total": n,
        "wins": len(wins),
        "losses": len(losses),
        "winRate": round(len(wins) / n * 100, 1) if n else 0,
        "netPL": net,
        "avgR": round(sum(rmults) / len(rmults), 2) if rmults else 0,
        "streaks": _streaks(closed),
        "journalTrades": sum(1 for t in closed if _has_notes(t)),
        "planFollowed": sum(1 for t in closed if PLAN_TAG in _tags(t)),
        "noRevenge": sum(1 for t in closed if REVENGE_TAG not in _tags(t)),
        "activeDays": len({_day_of(t) for t in closed if _day_of(t)}),
        "mediaTrades": sum(1 for t in closed if _has_media(t)),
        "bestDayPnl": round(max((v["pnl"] for v in by_day.values()), default=0), 2),
        "bestWeekPnl": round(max((v["pnl"] for v in by_week.values()), default=0), 2),
        "bestMonthPnl": round(max((v["pnl"] for v in by_month.values()), default=0), 2),
    }


def _records(closed):
    if not closed:
        return {}
    by_day = _group_pnl(closed, _day_of)
    by_week = _group_pnl(closed, lambda t: _iso_week(_day_of(t)))
    by_month = _group_pnl(closed, lambda t: _month(_day_of(t)))
    by_strat = defaultdict(lambda: {"pnl": 0.0, "count": 0, "wins": 0})
    for t in closed:
        for s in (t.get("strategies") or ["Unspecified"]):
            k = str(s).strip() or "Unspecified"
            by_strat[k]["pnl"] += _num(t.get("pnl"))
            by_strat[k]["count"] += 1
            if _num(t.get("pnl")) > 0:
                by_strat[k]["wins"] += 1
    by_sess = _group_pnl(closed, lambda t: t.get("session") or "Unknown")
    best_trade = max(closed, key=lambda t: _num(t.get("pnl")))
    worst_trade = min(closed, key=lambda t: _num(t.get("pnl")))
    largest_r = max(closed, key=lambda t: _num(t.get("rMultiple")))
    day_counts = defaultdict(int)
    for t in closed:
        day_counts[_day_of(t)] += 1
    most_day = max(day_counts.items(), key=lambda kv: kv[1]) if day_counts else ("", 0)
    st = _streaks(closed)

    def daycard(g):
        if not g:
            return None
        return {"label": g["key"], "value": round(g["pnl"], 2), "count": g["count"],
                "wins": g["wins"], "losses": g["count"] - g["wins"],
                "winRate": round(g["wins"] / g["count"] * 100, 1) if g["count"] else 0}

    return {
        "bestTrade": {"value": round(_num(best_trade.get("pnl")), 2), "symbol": best_trade.get("symbol"), "date": _day_of(best_trade)},
        "worstLoss": {"value": round(_num(worst_trade.get("pnl")), 2), "symbol": worst_trade.get("symbol"), "date": _day_of(worst_trade)},
        "bestDay": daycard(_best(by_day)),
        "worstDay": (lambda g: {"label": g[0], "value": round(g[1]["pnl"], 2), "count": g[1]["count"]} if g else None)(min(by_day.items(), key=lambda kv: kv[1]["pnl"]) if by_day else None),
        "bestWeek": daycard(_best(by_week)),
        "bestMonth": daycard(_best(by_month)),
        "bestStrategy": (lambda b: {"label": b["key"], "value": round(b["pnl"], 2), "count": b["count"]} if b else None)(_best(by_strat)),
        "bestSession": (lambda b: {"label": b["key"], "value": round(b["pnl"], 2), "count": b["count"]} if b else None)(_best(by_sess)),
        "longestWinStreak": st["bestWin"],
        "longestLossStreak": st["bestLoss"],
        "largestR": {"value": round(_num(largest_r.get("rMultiple")), 2), "symbol": largest_r.get("symbol")},
        "mostTradesOneDay": {"label": most_day[0], "value": most_day[1]},
    }


def _period(closed, start):
    sub = [t for t in closed if _day_of(t) >= start]
    n = len(sub)
    wins = sum(1 for t in sub if _num(t.get("pnl")) > 0)
    net = round(sum(_num(t.get("pnl")) for t in sub), 2)
    rmults = [_num(t.get("rMultiple")) for t in sub if t.get("rMultiple") is not None]
    by_sess = _group_pnl(sub, lambda t: t.get("session") or "Unknown")
    by_strat = defaultdict(lambda: {"pnl": 0.0, "count": 0, "wins": 0})
    for t in sub:
        for s in (t.get("strategies") or ["Unspecified"]):
            by_strat[str(s).strip() or "Unspecified"]["pnl"] += _num(t.get("pnl"))
    bs = _best(by_sess)
    bstr = max(by_strat.items(), key=lambda kv: kv[1]["pnl"]) if by_strat else None
    return {
        "trades": n,
        "winRate": round(wins / n * 100, 1) if n else 0,
        "netPL": net,
        "avgR": round(sum(rmults) / len(rmults), 2) if rmults else 0,
        "bestSession": bs["key"] if bs else "—",
        "bestStrategy": bstr[0] if bstr else "—",
    }


def compute_goals(goals, ctx):
    out = []
    completed = 0
    for g in goals:
        unit = g.get("unit", "")
        target = _num(g.get("target"))
        if unit == "$":
            current = ctx["netPL"]
        elif unit == "%":
            current = ctx["winRate"]
        elif unit == "R":
            current = ctx["avgR"]
        else:
            current = ctx["total"]
        pct = min(current / target, 1.0) * 100 if target > 0 else 0
        done = target > 0 and current >= target
        if done:
            completed += 1
        out.append({"id": g.get("id"), "label": g.get("label"), "unit": unit,
                    "target": target, "current": round(current, 2), "percent": round(pct, 1), "completed": done})
    return out, completed


def compute_progress(trades, goals, achievements, prefs):
    ctx = compute_context(trades)
    closed = ctx["closed"]
    xp_cfg = {**DEFAULT_XP, **(prefs.get("xp") or {})}

    goal_list, completed_goals = compute_goals(goals, ctx)

    # Evaluate achievements (skip archived; hidden are evaluated but excluded from the grid summary)
    evaluated = []
    unlocked_count = 0        # visible unlocked (for summary)
    xp_from_ach = 0
    newly_unlocked = []
    for a in achievements:
        status = a.get("status") or ("visible" if a.get("is_active", True) else "hidden")
        if status == "archived":
            continue
        res = evaluate_achievement(a, ctx)
        item = {**a, **res, "status": status, "is_system": not a.get("is_custom", False)}
        was_unlocked = bool(a.get("unlocked_at"))
        if res["unlocked"]:
            xp_from_ach += _num(a.get("xp_reward")) or xp_cfg["achievement"]
            if status == "visible":
                unlocked_count += 1
            if not was_unlocked:
                newly_unlocked.append(a["id"])
                item["_set_unlocked_at"] = True
        elif was_unlocked:
            item["_clear_unlocked_at"] = True
        evaluated.append(item)

    visible_total = len([a for a in evaluated if a.get("status") == "visible"])

    xp = (ctx["total"] * xp_cfg["trade"] + ctx["journalTrades"] * xp_cfg["journal"] +
          ctx["mediaTrades"] * xp_cfg["screenshot"] + ctx["planFollowed"] * xp_cfg["plan"] +
          completed_goals * xp_cfg["goal"] + xp_from_ach)

    # Daily / weekly / monthly
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    monday = (datetime.now(timezone.utc) - timedelta(days=datetime.now(timezone.utc).weekday())).strftime("%Y-%m-%d")
    month_start = datetime.now(timezone.utc).strftime("%Y-%m-01")
    today_trades = [t for t in closed if _day_of(t) == today]
    daily = {
        "trades": len(today_trades),
        "pnl": round(sum(_num(t.get("pnl")) for t in today_trades), 2),
        "journalComplete": bool(today_trades) and all(_has_notes(t) for t in today_trades),
        "planFollowed": sum(1 for t in today_trades if PLAN_TAG in _tags(t)),
        "screenshots": sum(1 for t in today_trades if _has_media(t)),
    }

    return {
        "stats": {
            "total": ctx["total"], "wins": ctx["wins"], "losses": ctx["losses"],
            "winRate": ctx["winRate"], "netPL": ctx["netPL"], "avgR": ctx["avgR"],
            "activeDays": ctx["activeDays"],
        },
        "streaks": ctx["streaks"],
        "records": _records(closed),
        "discipline": _discipline(closed),
        "level": _level_from_xp(xp),
        "xpConfig": xp_cfg,
        "daily": daily,
        "weekly": _period(closed, monday),
        "monthly": _period(closed, month_start),
        "goals": goal_list,
        "completedGoals": completed_goals,
        "achievements": evaluated,
        "achievementsSummary": {"unlocked": unlocked_count, "total": visible_total},
        "newlyUnlocked": newly_unlocked,
        "prefs": prefs,
    }
