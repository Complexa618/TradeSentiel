"""Tests for /api/progress, /api/achievements CRUD, and /api/progress/settings."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://trade-sentinel-67.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

EMAIL = "admin@tradesentinel.com"
PASSWORD = "Sentinel@2025"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{API}/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    tok = data.get("token") or data.get("access_token")
    assert tok, f"no token in {data}"
    return tok


@pytest.fixture(scope="module")
def hdr(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module", autouse=True)
def seed_demo(hdr):
    r = requests.post(f"{API}/trades/demo", headers=hdr, timeout=30)
    assert r.status_code in (200, 201), r.text


# ---- Progress endpoint ----
class TestProgress:
    def test_get_progress_basic(self, hdr):
        r = requests.get(f"{API}/progress", headers=hdr, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["stats"]["total"] == 10
        assert d["stats"]["winRate"] == 70
        assert d["stats"]["netPL"] == 4725
        assert "streaks" in d and "bestWin" in d["streaks"]
        assert "discipline" in d and "score" in d["discipline"] and "factors" in d["discipline"]
        for k in ("planFollowed", "riskDiscipline", "journal", "overtrading"):
            assert k in d["discipline"]["factors"]
        assert "level" in d and "level" in d["level"] and "xpTotal" in d["level"]
        for k in ("daily", "weekly", "monthly"):
            assert k in d
        assert "goals" in d and isinstance(d["goals"], list)
        for g in d["goals"]:
            assert "completed" in g
        # 15 default achievements auto-seeded
        assert len(d["achievements"]) >= 15
        for a in d["achievements"]:
            for k in ("current", "target", "percent", "unlocked"):
                assert k in a


# ---- Achievements CRUD ----
class TestAchievementsCRUD:
    created_id = None

    def test_list(self, hdr):
        r = requests.get(f"{API}/achievements", headers=hdr, timeout=30)
        assert r.status_code == 200
        arr = r.json()
        assert len(arr) >= 15

    def test_create_custom(self, hdr):
        body = {
            "title": "TEST_NY_AM_3",
            "description": "Complete 3 NY AM trades",
            "category": "Sessions",
            "icon": "Sunrise",
            "requirement_type": "session_count",
            "requirement_meta": "NY AM",
            "requirement_value": 3,
        }
        r = requests.post(f"{API}/achievements", headers=hdr, json=body, timeout=30)
        assert r.status_code in (200, 201), r.text
        d = r.json()
        assert d["is_custom"] is True
        assert d["title"] == "TEST_NY_AM_3"
        assert d["requirement_type"] == "session_count"
        assert d["requirement_meta"] == "NY AM"
        assert d["requirement_value"] == 3
        assert "id" in d
        TestAchievementsCRUD.created_id = d["id"]

        # Verify it shows up in list
        r2 = requests.get(f"{API}/achievements", headers=hdr, timeout=30)
        titles = [a["title"] for a in r2.json()]
        assert "TEST_NY_AM_3" in titles

        # And in progress evaluation
        rp = requests.get(f"{API}/progress", headers=hdr, timeout=30)
        assert any(a["id"] == d["id"] for a in rp.json()["achievements"])

    def test_update(self, hdr):
        aid = TestAchievementsCRUD.created_id
        assert aid
        body = {
            "title": "TEST_NY_AM_3_UPDATED",
            "description": "Updated",
            "category": "Sessions",
            "icon": "Sunrise",
            "requirement_type": "session_count",
            "requirement_meta": "NY AM",
            "requirement_value": 5,
        }
        r = requests.put(f"{API}/achievements/{aid}", headers=hdr, json=body, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["title"] == "TEST_NY_AM_3_UPDATED"
        assert d["requirement_value"] == 5

    def test_delete(self, hdr):
        aid = TestAchievementsCRUD.created_id
        r = requests.delete(f"{API}/achievements/{aid}", headers=hdr, timeout=30)
        assert r.status_code in (200, 204)
        # Verify gone
        r2 = requests.get(f"{API}/achievements", headers=hdr, timeout=30)
        ids = [a["id"] for a in r2.json()]
        assert aid not in ids


# ---- Progress settings ----
class TestProgressSettings:
    def test_toggle_achievements_off_then_on(self, hdr):
        r = requests.put(f"{API}/progress/settings", headers=hdr,
                         json={"achievementsEnabled": False}, timeout=30)
        assert r.status_code == 200, r.text

        rp = requests.get(f"{API}/progress", headers=hdr, timeout=30)
        assert rp.status_code == 200
        prefs = rp.json().get("prefs", {})
        assert prefs.get("achievementsEnabled") is False

        # Toggle back on
        r2 = requests.put(f"{API}/progress/settings", headers=hdr,
                          json={"achievementsEnabled": True}, timeout=30)
        assert r2.status_code == 200
        rp2 = requests.get(f"{API}/progress", headers=hdr, timeout=30)
        assert rp2.json()["prefs"]["achievementsEnabled"] is True
