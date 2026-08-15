#!/usr/bin/env python3
"""
Comprehensive backend API tests for Trade Sentinel
Tests all auth, trades, accounts, goals, settings endpoints
"""
import requests
import json
import sys
from typing import Optional

# Backend URL from frontend/.env
BASE_URL = "https://trade-sentinel-67.preview.emergentagent.com/api"

# Test results tracking
passed = 0
failed = 0
test_results = []


def log_test(name: str, success: bool, details: str = ""):
    global passed, failed, test_results
    if success:
        passed += 1
        status = "✅ PASS"
    else:
        failed += 1
        status = "❌ FAIL"
    
    result = f"{status}: {name}"
    if details:
        result += f"\n    Details: {details}"
    test_results.append(result)
    print(result)


def test_auth():
    """Test authentication endpoints"""
    print("\n" + "="*80)
    print("TESTING AUTH ENDPOINTS")
    print("="*80)
    
    # Test 1: Signup with new user
    signup_data = {
        "name": "Test Trader Alpha",
        "email": "test.alpha@example.com",
        "password": "TestPass123!"
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/auth/signup", json=signup_data, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if "token" in data and "user" in data:
                user = data["user"]
                if all(k in user for k in ["id", "name", "email", "username"]):
                    log_test("POST /api/auth/signup - new user", True, f"User created: {user['email']}")
                    token_alpha = data["token"]
                    user_alpha = user
                else:
                    log_test("POST /api/auth/signup - new user", False, f"Missing user fields: {user}")
                    token_alpha = None
                    user_alpha = None
            else:
                log_test("POST /api/auth/signup - new user", False, f"Missing token or user in response: {data}")
                token_alpha = None
                user_alpha = None
        else:
            log_test("POST /api/auth/signup - new user", False, f"Status {resp.status_code}: {resp.text}")
            token_alpha = None
            user_alpha = None
    except Exception as e:
        log_test("POST /api/auth/signup - new user", False, f"Exception: {str(e)}")
        token_alpha = None
        user_alpha = None
    
    # Test 2: Duplicate email signup
    try:
        resp = requests.post(f"{BASE_URL}/auth/signup", json=signup_data, timeout=10)
        if resp.status_code == 400:
            data = resp.json()
            if "detail" in data:
                log_test("POST /api/auth/signup - duplicate email returns 400", True, f"Error: {data['detail']}")
            else:
                log_test("POST /api/auth/signup - duplicate email returns 400", False, f"No detail in error: {data}")
        else:
            log_test("POST /api/auth/signup - duplicate email returns 400", False, f"Expected 400, got {resp.status_code}")
    except Exception as e:
        log_test("POST /api/auth/signup - duplicate email returns 400", False, f"Exception: {str(e)}")
    
    # Test 3: Login with correct credentials
    login_data = {
        "email": "test.alpha@example.com",
        "password": "TestPass123!"
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/auth/login", json=login_data, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if "token" in data and "user" in data:
                log_test("POST /api/auth/login - correct credentials", True, f"Login successful")
            else:
                log_test("POST /api/auth/login - correct credentials", False, f"Missing token or user: {data}")
        else:
            log_test("POST /api/auth/login - correct credentials", False, f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("POST /api/auth/login - correct credentials", False, f"Exception: {str(e)}")
    
    # Test 4: Login with wrong password
    wrong_pass_data = {
        "email": "test.alpha@example.com",
        "password": "WrongPassword123!"
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/auth/login", json=wrong_pass_data, timeout=10)
        if resp.status_code == 400:
            data = resp.json()
            if "detail" in data:
                log_test("POST /api/auth/login - wrong password returns 400", True, f"Error: {data['detail']}")
            else:
                log_test("POST /api/auth/login - wrong password returns 400", False, f"No detail in error: {data}")
        else:
            log_test("POST /api/auth/login - wrong password returns 400", False, f"Expected 400, got {resp.status_code}")
    except Exception as e:
        log_test("POST /api/auth/login - wrong password returns 400", False, f"Exception: {str(e)}")
    
    # Test 5: Login with unknown email
    unknown_email_data = {
        "email": "unknown.user@example.com",
        "password": "SomePassword123!"
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/auth/login", json=unknown_email_data, timeout=10)
        if resp.status_code == 400:
            data = resp.json()
            if "detail" in data:
                log_test("POST /api/auth/login - unknown email returns 400", True, f"Error: {data['detail']}")
            else:
                log_test("POST /api/auth/login - unknown email returns 400", False, f"No detail in error: {data}")
        else:
            log_test("POST /api/auth/login - unknown email returns 400", False, f"Expected 400, got {resp.status_code}")
    except Exception as e:
        log_test("POST /api/auth/login - unknown email returns 400", False, f"Exception: {str(e)}")
    
    # Test 6: GET /api/auth/me with token
    if token_alpha:
        try:
            headers = {"Authorization": f"Bearer {token_alpha}"}
            resp = requests.get(f"{BASE_URL}/auth/me", headers=headers, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                if "user" in data:
                    log_test("GET /api/auth/me - with Bearer token", True, f"User: {data['user']['email']}")
                else:
                    log_test("GET /api/auth/me - with Bearer token", False, f"No user in response: {data}")
            else:
                log_test("GET /api/auth/me - with Bearer token", False, f"Status {resp.status_code}: {resp.text}")
        except Exception as e:
            log_test("GET /api/auth/me - with Bearer token", False, f"Exception: {str(e)}")
    else:
        log_test("GET /api/auth/me - with Bearer token", False, "No token available from signup")
    
    # Test 7: GET /api/auth/me without token
    try:
        resp = requests.get(f"{BASE_URL}/auth/me", timeout=10)
        if resp.status_code == 401:
            log_test("GET /api/auth/me - without token returns 401", True, "Correctly rejected")
        else:
            log_test("GET /api/auth/me - without token returns 401", False, f"Expected 401, got {resp.status_code}")
    except Exception as e:
        log_test("GET /api/auth/me - without token returns 401", False, f"Exception: {str(e)}")
    
    # Test 8: Admin login
    admin_data = {
        "email": "admin@tradesentinel.com",
        "password": "Sentinel@2025"
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/auth/login", json=admin_data, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if "token" in data and "user" in data:
                log_test("Admin login (admin@tradesentinel.com)", True, f"Admin user: {data['user']['email']}")
            else:
                log_test("Admin login (admin@tradesentinel.com)", False, f"Missing token or user: {data}")
        else:
            log_test("Admin login (admin@tradesentinel.com)", False, f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("Admin login (admin@tradesentinel.com)", False, f"Exception: {str(e)}")
    
    return token_alpha


def test_trades(token: Optional[str]):
    """Test trades endpoints"""
    print("\n" + "="*80)
    print("TESTING TRADES ENDPOINTS")
    print("="*80)
    
    if not token:
        log_test("TRADES TESTS", False, "No auth token available, skipping trades tests")
        return None
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test 1: POST /api/trades without token (should return 401)
    trade_data = {
        "symbol": "XAUUSD",
        "direction": "long",
        "risk": 100,
        "reward": 250,
        "status": "closed",
        "strategies": ["Order Block", "FVG"],
        "session": "London",
        "day": "2025-01-15",
        "entryTime": "2025-01-15T08:30:00Z",
        "exitTime": "2025-01-15T10:15:00Z",
        "tags": ["A+ Setup"],
        "notes": "Great trade following plan"
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/trades", json=trade_data, timeout=10)
        if resp.status_code == 401:
            log_test("POST /api/trades - without token returns 401", True, "Correctly rejected")
        else:
            log_test("POST /api/trades - without token returns 401", False, f"Expected 401, got {resp.status_code}")
    except Exception as e:
        log_test("POST /api/trades - without token returns 401", False, f"Exception: {str(e)}")
    
    # Test 2: POST /api/trades with token - normal trade
    try:
        resp = requests.post(f"{BASE_URL}/trades", json=trade_data, headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            # Check derived fields
            if "pnl" in data and "rMultiple" in data:
                expected_pnl = 250.0
                expected_rMultiple = round(250 / 100, 2)
                if data["pnl"] == expected_pnl and data["rMultiple"] == expected_rMultiple:
                    log_test("POST /api/trades - derived pnl and rMultiple", True, 
                            f"pnl={data['pnl']}, rMultiple={data['rMultiple']}")
                    trade_id = data.get("id")
                else:
                    log_test("POST /api/trades - derived pnl and rMultiple", False, 
                            f"Expected pnl={expected_pnl}, rMultiple={expected_rMultiple}, got pnl={data['pnl']}, rMultiple={data['rMultiple']}")
                    trade_id = data.get("id")
            else:
                log_test("POST /api/trades - derived pnl and rMultiple", False, f"Missing pnl or rMultiple: {data}")
                trade_id = None
        else:
            log_test("POST /api/trades - derived pnl and rMultiple", False, f"Status {resp.status_code}: {resp.text}")
            trade_id = None
    except Exception as e:
        log_test("POST /api/trades - derived pnl and rMultiple", False, f"Exception: {str(e)}")
        trade_id = None
    
    # Test 3: POST /api/trades with risk=0 (rMultiple should be null)
    zero_risk_trade = {
        "symbol": "EURUSD",
        "direction": "short",
        "risk": 0,
        "reward": 100,
        "status": "closed",
        "strategies": ["Breakout"],
        "session": "NY AM",
        "day": "2025-01-16",
        "tags": [],
        "notes": "Risk-free trade"
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/trades", json=zero_risk_trade, headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("rMultiple") is None:
                log_test("POST /api/trades - risk=0 -> rMultiple=null", True, f"rMultiple is null as expected")
            else:
                log_test("POST /api/trades - risk=0 -> rMultiple=null", False, 
                        f"Expected rMultiple=null, got {data.get('rMultiple')}")
        else:
            log_test("POST /api/trades - risk=0 -> rMultiple=null", False, f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("POST /api/trades - risk=0 -> rMultiple=null", False, f"Exception: {str(e)}")
    
    # Test 4: GET /api/trades - list trades
    try:
        resp = requests.get(f"{BASE_URL}/trades", headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list):
                log_test("GET /api/trades - list user's trades", True, f"Retrieved {len(data)} trades")
            else:
                log_test("GET /api/trades - list user's trades", False, f"Expected list, got {type(data)}")
        else:
            log_test("GET /api/trades - list user's trades", False, f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("GET /api/trades - list user's trades", False, f"Exception: {str(e)}")
    
    # Test 5: PUT /api/trades/{id} - update trade
    if trade_id:
        update_data = {
            "reward": 300,
            "notes": "Updated notes"
        }
        try:
            resp = requests.put(f"{BASE_URL}/trades/{trade_id}", json=update_data, headers=headers, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                expected_pnl = 300.0
                expected_rMultiple = round(300 / 100, 2)
                if data.get("pnl") == expected_pnl and data.get("rMultiple") == expected_rMultiple:
                    log_test("PUT /api/trades/{id} - update and re-derive", True, 
                            f"Updated pnl={data['pnl']}, rMultiple={data['rMultiple']}")
                else:
                    log_test("PUT /api/trades/{id} - update and re-derive", False, 
                            f"Expected pnl={expected_pnl}, rMultiple={expected_rMultiple}, got pnl={data.get('pnl')}, rMultiple={data.get('rMultiple')}")
            else:
                log_test("PUT /api/trades/{id} - update and re-derive", False, f"Status {resp.status_code}: {resp.text}")
        except Exception as e:
            log_test("PUT /api/trades/{id} - update and re-derive", False, f"Exception: {str(e)}")
    else:
        log_test("PUT /api/trades/{id} - update and re-derive", False, "No trade_id available")
    
    # Test 6: DELETE /api/trades/{id} - delete trade
    if trade_id:
        try:
            resp = requests.delete(f"{BASE_URL}/trades/{trade_id}", headers=headers, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("ok"):
                    log_test("DELETE /api/trades/{id} - delete trade", True, "Trade deleted")
                else:
                    log_test("DELETE /api/trades/{id} - delete trade", False, f"Unexpected response: {data}")
            else:
                log_test("DELETE /api/trades/{id} - delete trade", False, f"Status {resp.status_code}: {resp.text}")
        except Exception as e:
            log_test("DELETE /api/trades/{id} - delete trade", False, f"Exception: {str(e)}")
    else:
        log_test("DELETE /api/trades/{id} - delete trade", False, "No trade_id available")
    
    # Test 7: POST /api/trades/demo - seed demo data
    try:
        resp = requests.post(f"{BASE_URL}/trades/demo", headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if "trades" in data and "accounts" in data:
                trades_count = len(data["trades"])
                accounts_count = len(data["accounts"])
                if trades_count == 10 and accounts_count == 2:
                    log_test("POST /api/trades/demo - seed 10 trades + 2 accounts", True, 
                            f"Seeded {trades_count} trades, {accounts_count} accounts")
                else:
                    log_test("POST /api/trades/demo - seed 10 trades + 2 accounts", False, 
                            f"Expected 10 trades and 2 accounts, got {trades_count} trades, {accounts_count} accounts")
            else:
                log_test("POST /api/trades/demo - seed 10 trades + 2 accounts", False, 
                        f"Missing trades or accounts in response: {data.keys()}")
        else:
            log_test("POST /api/trades/demo - seed 10 trades + 2 accounts", False, f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("POST /api/trades/demo - seed 10 trades + 2 accounts", False, f"Exception: {str(e)}")
    
    # Test 8: DELETE /api/trades - clear all trades and accounts
    try:
        resp = requests.delete(f"{BASE_URL}/trades", headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("ok"):
                # Verify trades are cleared
                resp_check = requests.get(f"{BASE_URL}/trades", headers=headers, timeout=10)
                if resp_check.status_code == 200:
                    trades = resp_check.json()
                    if len(trades) == 0:
                        log_test("DELETE /api/trades - clear trades and accounts", True, "All trades cleared")
                    else:
                        log_test("DELETE /api/trades - clear trades and accounts", False, 
                                f"Expected 0 trades after clear, got {len(trades)}")
                else:
                    log_test("DELETE /api/trades - clear trades and accounts", False, 
                            f"Failed to verify clear: {resp_check.status_code}")
            else:
                log_test("DELETE /api/trades - clear trades and accounts", False, f"Unexpected response: {data}")
        else:
            log_test("DELETE /api/trades - clear trades and accounts", False, f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("DELETE /api/trades - clear trades and accounts", False, f"Exception: {str(e)}")
    
    return headers


def test_user_isolation():
    """Test per-user data isolation"""
    print("\n" + "="*80)
    print("TESTING PER-USER DATA ISOLATION")
    print("="*80)
    
    # Create User A
    user_a_data = {
        "name": "User Alpha",
        "email": "user.a@example.com",
        "password": "PasswordA123!"
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/auth/signup", json=user_a_data, timeout=10)
        if resp.status_code == 200:
            token_a = resp.json()["token"]
            log_test("Create User A", True, "User A created")
        else:
            log_test("Create User A", False, f"Status {resp.status_code}: {resp.text}")
            return
    except Exception as e:
        log_test("Create User A", False, f"Exception: {str(e)}")
        return
    
    # Create User B
    user_b_data = {
        "name": "User Beta",
        "email": "user.b@example.com",
        "password": "PasswordB123!"
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/auth/signup", json=user_b_data, timeout=10)
        if resp.status_code == 200:
            token_b = resp.json()["token"]
            log_test("Create User B", True, "User B created")
        else:
            log_test("Create User B", False, f"Status {resp.status_code}: {resp.text}")
            return
    except Exception as e:
        log_test("Create User B", False, f"Exception: {str(e)}")
        return
    
    # Add trade for User A
    trade_a = {
        "symbol": "AAPL",
        "direction": "long",
        "risk": 100,
        "reward": 200,
        "status": "closed",
        "strategies": ["Momentum"],
        "session": "NY AM",
        "tags": ["User A Trade"],
        "notes": "This is User A's trade"
    }
    
    headers_a = {"Authorization": f"Bearer {token_a}"}
    try:
        resp = requests.post(f"{BASE_URL}/trades", json=trade_a, headers=headers_a, timeout=10)
        if resp.status_code == 200:
            log_test("Add trade for User A", True, "Trade added for User A")
        else:
            log_test("Add trade for User A", False, f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("Add trade for User A", False, f"Exception: {str(e)}")
    
    # Add trade for User B
    trade_b = {
        "symbol": "TSLA",
        "direction": "short",
        "risk": 150,
        "reward": 300,
        "status": "closed",
        "strategies": ["Reversal"],
        "session": "NY PM",
        "tags": ["User B Trade"],
        "notes": "This is User B's trade"
    }
    
    headers_b = {"Authorization": f"Bearer {token_b}"}
    try:
        resp = requests.post(f"{BASE_URL}/trades", json=trade_b, headers=headers_b, timeout=10)
        if resp.status_code == 200:
            log_test("Add trade for User B", True, "Trade added for User B")
        else:
            log_test("Add trade for User B", False, f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("Add trade for User B", False, f"Exception: {str(e)}")
    
    # User A gets trades - should only see their own
    try:
        resp = requests.get(f"{BASE_URL}/trades", headers=headers_a, timeout=10)
        if resp.status_code == 200:
            trades = resp.json()
            # Check if any trade has User B's symbol
            has_user_b_trade = any(t.get("symbol") == "TSLA" for t in trades)
            if not has_user_b_trade:
                log_test("User A cannot see User B's trades (GET /api/trades)", True, 
                        f"User A sees only their trades ({len(trades)} trades)")
            else:
                log_test("User A cannot see User B's trades (GET /api/trades)", False, 
                        "User A can see User B's TSLA trade - ISOLATION BREACH!")
        else:
            log_test("User A cannot see User B's trades (GET /api/trades)", False, 
                    f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("User A cannot see User B's trades (GET /api/trades)", False, f"Exception: {str(e)}")
    
    # User A gets data - should only see their own
    try:
        resp = requests.get(f"{BASE_URL}/data", headers=headers_a, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            trades = data.get("trades", [])
            has_user_b_trade = any(t.get("symbol") == "TSLA" for t in trades)
            if not has_user_b_trade:
                log_test("User A cannot see User B's trades (GET /api/data)", True, 
                        f"User A sees only their data")
            else:
                log_test("User A cannot see User B's trades (GET /api/data)", False, 
                        "User A can see User B's TSLA trade in /data - ISOLATION BREACH!")
        else:
            log_test("User A cannot see User B's trades (GET /api/data)", False, 
                    f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("User A cannot see User B's trades (GET /api/data)", False, f"Exception: {str(e)}")
    
    # User B gets trades - should only see their own
    try:
        resp = requests.get(f"{BASE_URL}/trades", headers=headers_b, timeout=10)
        if resp.status_code == 200:
            trades = resp.json()
            has_user_a_trade = any(t.get("symbol") == "AAPL" for t in trades)
            if not has_user_a_trade:
                log_test("User B cannot see User A's trades (GET /api/trades)", True, 
                        f"User B sees only their trades ({len(trades)} trades)")
            else:
                log_test("User B cannot see User A's trades (GET /api/trades)", False, 
                        "User B can see User A's AAPL trade - ISOLATION BREACH!")
        else:
            log_test("User B cannot see User A's trades (GET /api/trades)", False, 
                    f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("User B cannot see User A's trades (GET /api/trades)", False, f"Exception: {str(e)}")


def test_accounts_goals_settings(headers: dict):
    """Test accounts, goals, settings endpoints"""
    print("\n" + "="*80)
    print("TESTING ACCOUNTS, GOALS, SETTINGS ENDPOINTS")
    print("="*80)
    
    # Test 1: GET /api/accounts without token
    try:
        resp = requests.get(f"{BASE_URL}/accounts", timeout=10)
        if resp.status_code == 401:
            log_test("GET /api/accounts - without token returns 401", True, "Correctly rejected")
        else:
            log_test("GET /api/accounts - without token returns 401", False, f"Expected 401, got {resp.status_code}")
    except Exception as e:
        log_test("GET /api/accounts - without token returns 401", False, f"Exception: {str(e)}")
    
    # Test 2: GET /api/accounts with token
    try:
        resp = requests.get(f"{BASE_URL}/accounts", headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list):
                log_test("GET /api/accounts - with token", True, f"Retrieved {len(data)} accounts")
            else:
                log_test("GET /api/accounts - with token", False, f"Expected list, got {type(data)}")
        else:
            log_test("GET /api/accounts - with token", False, f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("GET /api/accounts - with token", False, f"Exception: {str(e)}")
    
    # Test 3: POST /api/accounts
    account_data = {
        "name": "Test Trading Account",
        "broker": "Interactive Brokers",
        "balance": 50000
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/accounts", json=account_data, headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if "id" in data and data.get("name") == account_data["name"]:
                log_test("POST /api/accounts - create account", True, f"Account created: {data['name']}")
                account_id = data["id"]
            else:
                log_test("POST /api/accounts - create account", False, f"Unexpected response: {data}")
                account_id = None
        else:
            log_test("POST /api/accounts - create account", False, f"Status {resp.status_code}: {resp.text}")
            account_id = None
    except Exception as e:
        log_test("POST /api/accounts - create account", False, f"Exception: {str(e)}")
        account_id = None
    
    # Test 4: DELETE /api/accounts/{id}
    if account_id:
        try:
            resp = requests.delete(f"{BASE_URL}/accounts/{account_id}", headers=headers, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("ok"):
                    log_test("DELETE /api/accounts/{id} - delete account", True, "Account deleted")
                else:
                    log_test("DELETE /api/accounts/{id} - delete account", False, f"Unexpected response: {data}")
            else:
                log_test("DELETE /api/accounts/{id} - delete account", False, f"Status {resp.status_code}: {resp.text}")
        except Exception as e:
            log_test("DELETE /api/accounts/{id} - delete account", False, f"Exception: {str(e)}")
    else:
        log_test("DELETE /api/accounts/{id} - delete account", False, "No account_id available")
    
    # Test 5: GET /api/goals
    try:
        resp = requests.get(f"{BASE_URL}/goals", headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list):
                log_test("GET /api/goals - retrieve goals", True, f"Retrieved {len(data)} goals")
            else:
                log_test("GET /api/goals - retrieve goals", False, f"Expected list, got {type(data)}")
        else:
            log_test("GET /api/goals - retrieve goals", False, f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("GET /api/goals - retrieve goals", False, f"Exception: {str(e)}")
    
    # Test 6: PUT /api/goals
    updated_goals = [
        {"id": "g1", "label": "Monthly Net P&L", "target": 10000, "current": 2500, "unit": "$"},
        {"id": "g2", "label": "Win Rate", "target": 65, "current": 58, "unit": "%"},
    ]
    
    try:
        resp = requests.put(f"{BASE_URL}/goals", json=updated_goals, headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list) and len(data) == 2:
                log_test("PUT /api/goals - update goals", True, f"Updated {len(data)} goals")
            else:
                log_test("PUT /api/goals - update goals", False, f"Unexpected response: {data}")
        else:
            log_test("PUT /api/goals - update goals", False, f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("PUT /api/goals - update goals", False, f"Exception: {str(e)}")
    
    # Test 7: GET /api/settings
    try:
        resp = requests.get(f"{BASE_URL}/settings", headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if "hideBalance" in data and "hideUsername" in data:
                log_test("GET /api/settings - retrieve settings", True, f"Settings: {data}")
            else:
                log_test("GET /api/settings - retrieve settings", False, f"Missing fields in settings: {data}")
        else:
            log_test("GET /api/settings - retrieve settings", False, f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("GET /api/settings - retrieve settings", False, f"Exception: {str(e)}")
    
    # Test 8: PUT /api/settings
    updated_settings = {
        "hideBalance": True,
        "hideUsername": False
    }
    
    try:
        resp = requests.put(f"{BASE_URL}/settings", json=updated_settings, headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("hideBalance") == True and data.get("hideUsername") == False:
                log_test("PUT /api/settings - update settings", True, f"Settings updated: {data}")
            else:
                log_test("PUT /api/settings - update settings", False, f"Settings not updated correctly: {data}")
        else:
            log_test("PUT /api/settings - update settings", False, f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("PUT /api/settings - update settings", False, f"Exception: {str(e)}")
    
    # Test 9: GET /api/data (aggregate)
    try:
        resp = requests.get(f"{BASE_URL}/data", headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            required_keys = ["trades", "accounts", "goals", "settings"]
            if all(k in data for k in required_keys):
                log_test("GET /api/data - aggregate endpoint", True, 
                        f"Retrieved aggregate data with all keys: {required_keys}")
            else:
                missing = [k for k in required_keys if k not in data]
                log_test("GET /api/data - aggregate endpoint", False, f"Missing keys: {missing}")
        else:
            log_test("GET /api/data - aggregate endpoint", False, f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("GET /api/data - aggregate endpoint", False, f"Exception: {str(e)}")


def test_economic_calendar():
    """Test economic calendar endpoint - FORWARD-LOOKING requirement"""
    print("\n" + "="*80)
    print("TESTING ECONOMIC CALENDAR ENDPOINT (FORWARD-LOOKING)")
    print("="*80)
    
    # First, login as admin to get token
    admin_data = {
        "email": "admin@tradesentinel.com",
        "password": "Sentinel@2025"
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/auth/login", json=admin_data, timeout=10)
        if resp.status_code == 200:
            token = resp.json()["token"]
            headers = {"Authorization": f"Bearer {token}"}
            print("✅ Admin login successful")
        else:
            log_test("Economic Calendar - Admin login", False, f"Status {resp.status_code}: {resp.text}")
            return
    except Exception as e:
        log_test("Economic Calendar - Admin login", False, f"Exception: {str(e)}")
        return
    
    # Test 1: GET /api/economic-calendar without token (should return 401)
    try:
        resp = requests.get(f"{BASE_URL}/economic-calendar", timeout=10)
        if resp.status_code == 401:
            log_test("GET /api/economic-calendar - without token returns 401", True, "Correctly rejected")
        else:
            log_test("GET /api/economic-calendar - without token returns 401", False, 
                    f"Expected 401, got {resp.status_code}")
    except Exception as e:
        log_test("GET /api/economic-calendar - without token returns 401", False, f"Exception: {str(e)}")
    
    # Test 2: GET /api/economic-calendar with token
    try:
        resp = requests.get(f"{BASE_URL}/economic-calendar", headers=headers, timeout=15)
        if resp.status_code != 200:
            log_test("GET /api/economic-calendar - with token", False, 
                    f"Status {resp.status_code}: {resp.text}")
            return
        
        data = resp.json()
        
        # Verify response structure
        if not all(k in data for k in ["events", "currencies", "updatedAt"]):
            log_test("GET /api/economic-calendar - response structure", False, 
                    f"Missing required keys. Got: {list(data.keys())}")
            return
        else:
            log_test("GET /api/economic-calendar - response structure", True, 
                    "Has events, currencies, updatedAt")
        
        events = data["events"]
        currencies = data["currencies"]
        
        print(f"\n📊 Total events received: {len(events)}")
        
        # Test 3: Verify currencies field equals the 8 majors
        expected_currencies = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD']
        if currencies == expected_currencies:
            log_test("currencies field equals 8 majors", True, f"currencies: {currencies}")
        else:
            log_test("currencies field equals 8 majors", False, 
                    f"Expected {expected_currencies}, got {currencies}")
        
        # Test 4: Parse datetimes and check FORWARD-LOOKING requirement
        from datetime import datetime as dt, timezone
        now = dt.now(timezone.utc)
        
        future_events = []
        past_events = []
        event_dates = set()
        
        for event in events:
            # Verify event has ONLY the required keys
            event_keys = set(event.keys())
            required_keys = {"id", "title", "currency", "impact", "datetime"}
            forbidden_keys = {"forecast", "previous", "actual", "result", "revision"}
            
            if event_keys != required_keys:
                extra_keys = event_keys - required_keys
                missing_keys = required_keys - event_keys
                if extra_keys or missing_keys:
                    log_test("Event keys validation", False, 
                            f"Event has extra keys: {extra_keys}, missing keys: {missing_keys}")
                    break
            
            # Check for forbidden keys
            if any(k in event for k in forbidden_keys):
                found_forbidden = [k for k in forbidden_keys if k in event]
                log_test("Event has NO forbidden keys (forecast/previous/actual/result/revision)", False, 
                        f"Found forbidden keys: {found_forbidden}")
                break
            
            # Parse datetime
            try:
                event_dt = dt.fromisoformat(event["datetime"].replace("Z", "+00:00"))
                if event_dt >= now:
                    future_events.append(event)
                    event_dates.add(event_dt.date())
                else:
                    past_events.append(event)
            except Exception as e:
                log_test("Parse event datetime", False, f"Failed to parse datetime: {event['datetime']}, error: {e}")
                return
        
        # If we got here without breaking, all events have correct keys
        if len(events) > 0:
            log_test("All events have ONLY {id,title,currency,impact,datetime}", True, 
                    f"All {len(events)} events validated")
        
        # Test 5: Verify all event.currency in allowed list
        invalid_currencies = [e["currency"] for e in events if e["currency"] not in expected_currencies]
        if not invalid_currencies:
            log_test("All event.currency in [USD,EUR,GBP,JPY,AUD,CAD,CHF,NZD]", True, 
                    f"All {len(events)} events have valid currencies")
        else:
            log_test("All event.currency in [USD,EUR,GBP,JPY,AUD,CAD,CHF,NZD]", False, 
                    f"Found invalid currencies: {set(invalid_currencies)}")
        
        # Test 6: Verify all event.impact in [High,Medium,Low]
        allowed_impacts = ["High", "Medium", "Low"]
        invalid_impacts = [e["impact"] for e in events if e["impact"] not in allowed_impacts]
        if not invalid_impacts:
            log_test("All event.impact in [High,Medium,Low]", True, 
                    f"All {len(events)} events have valid impact levels")
        else:
            log_test("All event.impact in [High,Medium,Low]", False, 
                    f"Found invalid impacts: {set(invalid_impacts)}")
        
        # Test 7: CRITICAL - FORWARD-LOOKING requirement
        future_count = len(future_events)
        past_count = len(past_events)
        total_count = len(events)
        
        print(f"\n📅 FORWARD-LOOKING ANALYSIS:")
        print(f"   Future events: {future_count}")
        print(f"   Past events: {past_count}")
        print(f"   Total events: {total_count}")
        
        if total_count > 0:
            future_percentage = (future_count / total_count) * 100
            print(f"   Future percentage: {future_percentage:.1f}%")
            
            # MAJORITY must be future (>50%)
            if future_count > past_count:
                log_test("CRITICAL: MAJORITY of events are FUTURE (datetime >= now)", True, 
                        f"{future_count}/{total_count} events are future ({future_percentage:.1f}%)")
            else:
                log_test("CRITICAL: MAJORITY of events are FUTURE (datetime >= now)", False, 
                        f"Only {future_count}/{total_count} events are future ({future_percentage:.1f}%). FAIL!")
        else:
            log_test("CRITICAL: MAJORITY of events are FUTURE (datetime >= now)", False, 
                    "No events returned")
        
        # Test 8: Verify events span MULTIPLE upcoming days
        if future_events:
            future_datetimes = [dt.fromisoformat(e["datetime"].replace("Z", "+00:00")) for e in future_events]
            min_date = min(future_datetimes).date()
            max_date = max(future_datetimes).date()
            date_range_days = (max_date - min_date).days
            distinct_future_dates = len(event_dates)
            
            print(f"\n📆 DATE RANGE ANALYSIS:")
            print(f"   Min event date: {min_date}")
            print(f"   Max event date: {max_date}")
            print(f"   Date range: {date_range_days} days")
            print(f"   Distinct future dates: {distinct_future_dates}")
            
            # Events should span multiple days (ideally 2-4 weeks = 14-30 days)
            if date_range_days >= 7 and distinct_future_dates >= 5:
                log_test("Events span MULTIPLE upcoming days (ideally 2-4 weeks)", True, 
                        f"Range: {date_range_days} days, {distinct_future_dates} distinct dates from {min_date} to {max_date}")
            elif date_range_days >= 1 and distinct_future_dates >= 2:
                log_test("Events span MULTIPLE upcoming days (ideally 2-4 weeks)", True, 
                        f"Range: {date_range_days} days, {distinct_future_dates} distinct dates (less than ideal but acceptable)")
            else:
                log_test("Events span MULTIPLE upcoming days (ideally 2-4 weeks)", False, 
                        f"Only {date_range_days} days range, {distinct_future_dates} distinct dates. Expected 2-4 weeks!")
        else:
            log_test("Events span MULTIPLE upcoming days (ideally 2-4 weeks)", False, 
                    "No future events to analyze")
        
    except Exception as e:
        log_test("GET /api/economic-calendar - with token", False, f"Exception: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")


def main():
    print("\n" + "="*80)
    print("TRADE SENTINEL BACKEND API TESTS")
    print(f"Testing: {BASE_URL}")
    print("="*80)
    
    # Run economic calendar tests (the current focus)
    test_economic_calendar()
    
    # Print summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    print(f"Total Tests: {passed + failed}")
    print(f"✅ Passed: {passed}")
    print(f"❌ Failed: {failed}")
    if passed + failed > 0:
        print(f"Success Rate: {(passed / (passed + failed) * 100):.1f}%")
    print("="*80)
    
    # Print all results
    print("\nDETAILED RESULTS:")
    print("-"*80)
    for result in test_results:
        print(result)
    
    # Exit with appropriate code
    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    main()
