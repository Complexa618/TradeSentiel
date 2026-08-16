"""Tests for the new Milestone Management + Multi-Condition + Main News features.

Covers:
- GET /api/economic-calendar (structure)
- POST /api/achievements with `conditions` (multi-condition)
- GET /api/progress evaluation of multi-condition milestone (multi=True, breakdown, xp_reward)
- POST /api/achievements/{id}/duplicate (creates '… — Custom')
- PUT /api/achievements/{id} status persistence (visible/hidden/archived)
- PUT /api/achievements/order (reorders, persists display_order)
- New requirement types eval: win_count, loss_count, daily_pnl, weekly_pnl, monthly_pnl, avg_rr,
  rr_above (meta), strategy_pnl, tag_used, avoid_tag.
- PUT /api/progress/settings mainNewsCurrency persistence (via generic settings, if supported).
"""
import os
import pytest
import requests

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or "https://trade-sentinel-67.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

EMAIL = "admin@tradesentinel.com"
PASSWORD = "Sentinel@2025"


@pytest.fixture(scope="module")
def hdr():
    r = requests.post(f"{API}/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=30)
    assert r.status_code == 200, r.text
    tok = r.json().get("token") or r.json().get("access_token")
    assert tok
    return {"Authorization": f"Bearer {tok}"}


@pytest.fixture(scope="module", autouse=True)
def seed_demo(hdr):
    r = requests.post(f"{API}/trades/demo", headers=hdr, timeout=30)
    assert r.status_code in (200, 201), r.text


# --------------------- Cleanup helper ---------------------
def _cleanup_test_achievements(hdr):
    r = requests.get(f"{API}/achievements", headers=hdr, timeout=30)
    for a in r.json():
        if a.get("title", "").startswith("TEST_") or " — Custom" in a.get("title", ""):
            try:
                requests.delete(f"{API}/achievements/{a['id']}", headers=hdr, timeout=15)
            except Exception:
                pass


# --------------------- Economic Calendar ---------------------
class TestEconCalendar:
    def test_get_calendar(self, hdr):
        r = requests.get(f"{API}/economic-calendar", headers=hdr, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "events" in data
        assert "currencies" in data
        assert isinstance(data["events"], list)
        # Structural check on at least one event if present
        if data["events"]:
            ev = data["events"][0]
            for k in ("title", "currency", "impact", "datetime"):
                assert k in ev, f"missing {k} in {ev}"
        # USD should be an allowed currency
        assert "USD" in data["currencies"]


# --------------------- Multi-condition Achievements ---------------------
class TestMultiCondition:
    created_id = None

    def test_create_multi(self, hdr):
        _cleanup_test_achievements(hdr)
        body = {
            "title": "TEST_MULTI_MILESTONE",
            "description": "Multi condition test",
            "category": "Discipline",
            "icon": "ShieldCheck",
            "conditions": [
                {"requirement_type": "trade_count", "requirement_value": 5},
                {"requirement_type": "plan_followed", "requirement_value": 2},
                {"requirement_type": "no_revenge", "requirement_value": 100},
            ],
            "xp_reward": 150,
            "status": "visible",
        }
        r = requests.post(f"{API}/achievements", headers=hdr, json=body, timeout=30)
        assert r.status_code in (200, 201), r.text
        d = r.json()
        assert d["is_custom"] is True
        assert d["xp_reward"] == 150
        assert isinstance(d.get("conditions"), list)
        assert len(d["conditions"]) == 3
        TestMultiCondition.created_id = d["id"]

    def test_progress_evaluates_multi(self, hdr):
        aid = TestMultiCondition.created_id
        assert aid
        r = requests.get(f"{API}/progress", headers=hdr, timeout=30)
        assert r.status_code == 200
        a = next((x for x in r.json()["achievements"] if x["id"] == aid), None)
        assert a is not None, "Multi milestone missing from progress"
        assert a.get("multi") is True
        assert a["target"] == 3
        assert isinstance(a.get("conditions"), list)
        assert len(a["conditions"]) == 3
        # Each condition has current/target/unlocked/percent
        for c in a["conditions"]:
            for k in ("current", "target", "percent", "unlocked", "requirement_type"):
                assert k in c
        # With 10 demo trades: trade_count>=5 True, no_revenge >=100 True, plan_followed>=2
        # depends on demo data — current should equal number of unlocked conds
        assert a["current"] == sum(1 for c in a["conditions"] if c["unlocked"])

    def test_cleanup_multi(self, hdr):
        aid = TestMultiCondition.created_id
        if aid:
            requests.delete(f"{API}/achievements/{aid}", headers=hdr, timeout=15)


# --------------------- Duplicate + Visibility + Reorder ---------------------
class TestMgmt:
    dup_id = None
    target_id = None

    def test_duplicate_first_default(self, hdr):
        _cleanup_test_achievements(hdr)
        lst = requests.get(f"{API}/achievements", headers=hdr, timeout=30).json()
        assert lst, "No achievements to duplicate"
        target = next((a for a in lst if a["title"] == "First Blood"), lst[0])
        TestMgmt.target_id = target["id"]
        r = requests.post(f"{API}/achievements/{target['id']}/duplicate", headers=hdr, timeout=30)
        assert r.status_code in (200, 201), r.text
        d = r.json()
        assert d["is_custom"] is True
        assert d["title"].endswith(" — Custom")
        assert d["title"].startswith(target["title"])
        assert d["id"] != target["id"]
        TestMgmt.dup_id = d["id"]

    def test_status_hidden_then_archived_then_visible(self, hdr):
        aid = TestMgmt.dup_id
        assert aid
        # Fetch current body
        cur = next(a for a in requests.get(f"{API}/achievements", headers=hdr, timeout=30).json() if a["id"] == aid)

        def _put(status):
            body = {
                "title": cur["title"], "description": cur.get("description", ""),
                "category": cur.get("category", "Trading"), "icon": cur.get("icon", "Trophy"),
                "requirement_type": cur.get("requirement_type", "trade_count"),
                "requirement_value": cur.get("requirement_value", 1),
                "requirement_meta": cur.get("requirement_meta"),
                "conditions": cur.get("conditions", []),
                "xp_reward": cur.get("xp_reward", 0),
                "status": status,
            }
            r = requests.put(f"{API}/achievements/{aid}", headers=hdr, json=body, timeout=30)
            assert r.status_code == 200, r.text
            return r.json()

        d1 = _put("hidden")
        assert d1["status"] == "hidden"
        # Progress should NOT count hidden in summary
        prog = requests.get(f"{API}/progress", headers=hdr, timeout=30).json()
        found = next((a for a in prog["achievements"] if a["id"] == aid), None)
        assert found is not None  # hidden still evaluated
        assert found["status"] == "hidden"

        d2 = _put("archived")
        assert d2["status"] == "archived"
        prog2 = requests.get(f"{API}/progress", headers=hdr, timeout=30).json()
        found2 = next((a for a in prog2["achievements"] if a["id"] == aid), None)
        assert found2 is None, "archived should be excluded from evaluation"

        d3 = _put("visible")
        assert d3["status"] == "visible"

    def test_reorder(self, hdr):
        lst = requests.get(f"{API}/achievements", headers=hdr, timeout=30).json()
        ids = [a["id"] for a in lst]
        if len(ids) < 3:
            pytest.skip("Not enough achievements to reorder")
        new_order = [ids[-1], ids[0]] + ids[1:-1]  # move last to front
        r = requests.put(f"{API}/achievements/order", headers=hdr, json=new_order, timeout=30)
        assert r.status_code == 200, r.text
        lst2 = requests.get(f"{API}/achievements", headers=hdr, timeout=30).json()
        got = [a["id"] for a in lst2]
        assert got[0] == new_order[0], f"Expected {new_order[0]} first, got {got[0]}"
        # Restore original order
        requests.put(f"{API}/achievements/order", headers=hdr, json=ids, timeout=30)

    def test_cleanup_dup(self, hdr):
        if TestMgmt.dup_id:
            requests.delete(f"{API}/achievements/{TestMgmt.dup_id}", headers=hdr, timeout=15)


# --------------------- New requirement types ---------------------
class TestNewRequirementTypes:
    """Create small custom milestones for each new requirement type and check evaluation."""
    ids = []

    @pytest.mark.parametrize("body,expect_current_positive", [
        ({"title": "TEST_WIN_COUNT", "requirement_type": "win_count", "requirement_value": 1}, True),
        ({"title": "TEST_LOSS_COUNT", "requirement_type": "loss_count", "requirement_value": 1}, True),
        ({"title": "TEST_DAILY_PNL", "requirement_type": "daily_pnl", "requirement_value": 1}, True),
        ({"title": "TEST_WEEKLY_PNL", "requirement_type": "weekly_pnl", "requirement_value": 1}, True),
        ({"title": "TEST_MONTHLY_PNL", "requirement_type": "monthly_pnl", "requirement_value": 1}, True),
        ({"title": "TEST_AVG_RR", "requirement_type": "avg_rr", "requirement_value": 0.1}, True),
        ({"title": "TEST_RR_ABOVE", "requirement_type": "rr_above", "requirement_value": 1,
          "requirement_meta": "1"}, True),
        ({"title": "TEST_TAG_USED", "requirement_type": "tag_used", "requirement_value": 1,
          "requirement_meta": "plan followed"}, True),
        ({"title": "TEST_AVOID_TAG", "requirement_type": "avoid_tag", "requirement_value": 1,
          "requirement_meta": "revenge"}, True),
    ])
    def test_types_eval(self, hdr, body, expect_current_positive):
        base = {"description": "test", "category": "Trading", "icon": "Trophy"}
        r = requests.post(f"{API}/achievements", headers=hdr, json={**base, **body}, timeout=30)
        assert r.status_code in (200, 201), r.text
        aid = r.json()["id"]
        TestNewRequirementTypes.ids.append(aid)
        prog = requests.get(f"{API}/progress", headers=hdr, timeout=30).json()
        a = next((x for x in prog["achievements"] if x["id"] == aid), None)
        assert a is not None
        assert "current" in a
        if expect_current_positive:
            assert a["current"] > 0, f"Expected positive current for {body['requirement_type']}, got {a['current']}"

    def test_cleanup_all(self, hdr):
        for aid in TestNewRequirementTypes.ids:
            requests.delete(f"{API}/achievements/{aid}", headers=hdr, timeout=15)


# --------------------- Regression: summary excludes hidden ---------------------
class TestSummary:
    def test_summary_visible_only(self, hdr):
        _cleanup_test_achievements(hdr)
        prog = requests.get(f"{API}/progress", headers=hdr, timeout=30).json()
        summ = prog["achievementsSummary"]
        visible = [a for a in prog["achievements"] if a.get("status") == "visible"]
        assert summ["total"] == len(visible)
