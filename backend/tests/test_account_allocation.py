"""Trade account ownership + allocation tests."""
import os
import pytest
import requests
from pathlib import Path

def _load_url():
    env = Path("/app/frontend/.env").read_text()
    for line in env.splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            return line.split("=", 1)[1].strip().rstrip("/")
    raise RuntimeError("REACT_APP_BACKEND_URL missing")

BASE = os.environ.get("REACT_APP_BACKEND_URL", _load_url()).rstrip("/")


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE}/api/auth/login", json={"email": "admin@tradesentinel.com", "password": "Sentinel@2025"})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def demo_accounts(headers):
    r = requests.post(f"{BASE}/api/trades/demo", headers=headers)
    assert r.status_code == 200, r.text
    r = requests.get(f"{BASE}/api/data", headers=headers)
    assert r.status_code == 200
    accts = r.json()["accounts"]
    assert len(accts) >= 2, f"expected 2 demo accounts, got {accts}"
    return accts


def _create_trade(headers, body):
    r = requests.post(f"{BASE}/api/trades", headers=headers, json=body)
    assert r.status_code == 200, r.text
    return r.json()


def test_even_split_default(headers, demo_accounts):
    A, B = demo_accounts[0]["id"], demo_accounts[1]["id"]
    body = {"symbol": "TEST_ES", "direction": "long", "risk": 100, "reward": 300,
            "accounts": [{"account_id": A}, {"account_id": B}]}
    t = _create_trade(headers, body)
    assert t["pnl"] == 300
    assert len(t["accounts"]) == 2
    for a in t["accounts"]:
        assert a["allocated_pnl"] == 150
    # GET verify persistence
    r = requests.get(f"{BASE}/api/trades", headers=headers)
    found = next(x for x in r.json() if x["id"] == t["id"])
    assert len(found["accounts"]) == 2
    assert all(a["allocated_pnl"] == 150 for a in found["accounts"])
    # cleanup
    requests.delete(f"{BASE}/api/trades/{t['id']}", headers=headers)


def test_independent_full_pnl(headers, demo_accounts):
    A, B = demo_accounts[0]["id"], demo_accounts[1]["id"]
    body = {"symbol": "TEST_NQ", "direction": "long", "risk": 100, "reward": 300,
            "accounts": [{"account_id": A}, {"account_id": B}], "independent": True}
    t = _create_trade(headers, body)
    assert t["independent"] is True
    assert all(a["allocated_pnl"] == 300 for a in t["accounts"])
    requests.delete(f"{BASE}/api/trades/{t['id']}", headers=headers)


def test_foreign_account_dropped(headers, demo_accounts):
    A = demo_accounts[0]["id"]
    body = {"symbol": "TEST_FX", "direction": "long", "risk": 50, "reward": 200,
            "accounts": [{"account_id": A}, {"account_id": "a_FAKE1234"}, {"account_id": "a_notreal"}]}
    t = _create_trade(headers, body)
    assert len(t["accounts"]) == 1
    assert t["accounts"][0]["account_id"] == A
    # allocated to full pnl since only 1 remains
    assert t["accounts"][0]["allocated_pnl"] == 200
    requests.delete(f"{BASE}/api/trades/{t['id']}", headers=headers)


def test_explicit_allocation_preserved(headers, demo_accounts):
    A, B = demo_accounts[0]["id"], demo_accounts[1]["id"]
    body = {"symbol": "TEST_YM", "direction": "long", "risk": 100, "reward": 500,
            "accounts": [{"account_id": A, "allocated_pnl": 200},
                         {"account_id": B, "allocated_pnl": 300}]}
    t = _create_trade(headers, body)
    allocs = {a["account_id"]: a["allocated_pnl"] for a in t["accounts"]}
    assert allocs[A] == 200 and allocs[B] == 300
    requests.delete(f"{BASE}/api/trades/{t['id']}", headers=headers)


def test_update_trade_accounts(headers, demo_accounts):
    A, B = demo_accounts[0]["id"], demo_accounts[1]["id"]
    t = _create_trade(headers, {"symbol": "TEST_UPD", "risk": 50, "reward": 400,
                                "accounts": [{"account_id": A}, {"account_id": B}]})
    # PUT to remove B - should re-sanitize to full pnl on A
    r = requests.put(f"{BASE}/api/trades/{t['id']}", headers=headers,
                     json={"accounts": [{"account_id": A}]})
    assert r.status_code == 200
    upd = r.json()
    assert len(upd["accounts"]) == 1
    assert upd["accounts"][0]["account_id"] == A
    assert upd["accounts"][0]["allocated_pnl"] == 400

    # PUT to set explicit allocation
    r = requests.put(f"{BASE}/api/trades/{t['id']}", headers=headers,
                     json={"accounts": [{"account_id": A, "allocated_pnl": 100},
                                         {"account_id": B, "allocated_pnl": 300}]})
    upd = r.json()
    allocs = {a["account_id"]: a["allocated_pnl"] for a in upd["accounts"]}
    assert allocs[A] == 100 and allocs[B] == 300

    # Delete removes trade
    r = requests.delete(f"{BASE}/api/trades/{t['id']}", headers=headers)
    assert r.status_code == 200
    r = requests.get(f"{BASE}/api/trades", headers=headers)
    assert not any(x["id"] == t["id"] for x in r.json())


def test_reset_demo_cleanup(headers):
    # restore demo state so downstream flows / regression stays clean
    r = requests.post(f"{BASE}/api/trades/demo", headers=headers)
    assert r.status_code == 200
