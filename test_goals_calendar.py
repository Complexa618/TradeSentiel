#!/usr/bin/env python3
"""
Focused tests for Goals Persistence and Economic Calendar
Testing user-reported "Edit Goals doesn't persist" issue
"""
import requests
import json
import sys
from typing import Optional

# Backend URL from frontend/.env
BASE_URL = "https://trade-sentinel-67.preview.emergentagent.com/api"

# Admin credentials
ADMIN_EMAIL = "admin@tradesentinel.com"
ADMIN_PASSWORD = "Sentinel@2025"

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


def get_admin_token():
    """Login as admin and get token"""
    print("\n" + "="*80)
    print("ADMIN LOGIN")
    print("="*80)
    
    login_data = {
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/auth/login", json=login_data, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if "token" in data:
                print(f"✅ Admin login successful: {data['user']['email']}")
                return data["token"]
            else:
                print(f"❌ Admin login failed: No token in response")
                return None
        else:
            print(f"❌ Admin login failed: Status {resp.status_code}: {resp.text}")
            return None
    except Exception as e:
        print(f"❌ Admin login failed: Exception: {str(e)}")
        return None


def test_goals_persistence(token: str):
    """
    Test Goals Persistence - User reported "Edit Goals doesn't persist"
    
    This test verifies:
    1. GET /api/goals returns current goals
    2. PUT /api/goals with modified array (change ONE goal's target and label)
    3. GET /api/goals confirms the change
    4. GET /api/data also shows the change
    5. Other goals are unchanged (no deletion, duplication, or reset)
    6. Second independent GET confirms persistence
    7. PUT without token returns 401
    """
    print("\n" + "="*80)
    print("TESTING GOALS PERSISTENCE (User-reported issue)")
    print("="*80)
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test 1: GET /api/goals - capture current state
    print("\n[Step 1] GET /api/goals - Capture current goals")
    try:
        resp = requests.get(f"{BASE_URL}/goals", headers=headers, timeout=10)
        if resp.status_code == 200:
            original_goals = resp.json()
            if isinstance(original_goals, list) and len(original_goals) > 0:
                log_test("GET /api/goals - retrieve current goals", True, 
                        f"Retrieved {len(original_goals)} goals")
                print(f"    Original goals: {json.dumps(original_goals, indent=2)}")
                original_count = len(original_goals)
            else:
                log_test("GET /api/goals - retrieve current goals", False, 
                        f"Expected non-empty list, got {original_goals}")
                return
        else:
            log_test("GET /api/goals - retrieve current goals", False, 
                    f"Status {resp.status_code}: {resp.text}")
            return
    except Exception as e:
        log_test("GET /api/goals - retrieve current goals", False, f"Exception: {str(e)}")
        return
    
    # Test 2: Modify ONE goal (change target and label)
    print("\n[Step 2] Modify ONE goal - change target and label")
    modified_goals = [dict(g) for g in original_goals]  # Deep copy
    
    # Modify the first goal
    if len(modified_goals) > 0:
        modified_goals[0]["target"] = 12345
        modified_goals[0]["label"] = "Monthly Net P&L Custom"
        print(f"    Modified goal[0]: target={modified_goals[0]['target']}, label='{modified_goals[0]['label']}'")
    else:
        log_test("Modify goals array", False, "No goals to modify")
        return
    
    # Test 3: PUT /api/goals with modified array
    print("\n[Step 3] PUT /api/goals - send modified array")
    try:
        resp = requests.put(f"{BASE_URL}/goals", json=modified_goals, headers=headers, timeout=10)
        if resp.status_code == 200:
            returned_goals = resp.json()
            log_test("PUT /api/goals - update goals array", True, 
                    f"PUT returned {len(returned_goals)} goals")
            print(f"    PUT response: {json.dumps(returned_goals, indent=2)}")
        else:
            log_test("PUT /api/goals - update goals array", False, 
                    f"Status {resp.status_code}: {resp.text}")
            return
    except Exception as e:
        log_test("PUT /api/goals - update goals array", False, f"Exception: {str(e)}")
        return
    
    # Test 4: GET /api/goals - verify the change persisted
    print("\n[Step 4] GET /api/goals - verify change persisted")
    try:
        resp = requests.get(f"{BASE_URL}/goals", headers=headers, timeout=10)
        if resp.status_code == 200:
            updated_goals = resp.json()
            
            # Check if the modified goal has the new values
            if len(updated_goals) > 0:
                first_goal = updated_goals[0]
                if first_goal["target"] == 12345 and first_goal["label"] == "Monthly Net P&L Custom":
                    log_test("GET /api/goals - modified goal persisted (target + label)", True, 
                            f"Goal[0]: target={first_goal['target']}, label='{first_goal['label']}'")
                else:
                    log_test("GET /api/goals - modified goal persisted (target + label)", False, 
                            f"Expected target=12345, label='Monthly Net P&L Custom', got target={first_goal['target']}, label='{first_goal['label']}'")
            else:
                log_test("GET /api/goals - modified goal persisted (target + label)", False, 
                        "No goals returned after PUT")
            
            # Check if other goals are unchanged
            if len(updated_goals) == original_count:
                log_test("GET /api/goals - goal count unchanged", True, 
                        f"Count: {len(updated_goals)} (same as original {original_count})")
            else:
                log_test("GET /api/goals - goal count unchanged", False, 
                        f"Expected {original_count} goals, got {len(updated_goals)}")
            
            # Check if other goals have same IDs
            if len(updated_goals) >= 2 and len(original_goals) >= 2:
                other_goals_match = True
                for i in range(1, min(len(updated_goals), len(original_goals))):
                    if updated_goals[i]["id"] != original_goals[i]["id"]:
                        other_goals_match = False
                        break
                
                if other_goals_match:
                    log_test("GET /api/goals - other goals unchanged (no deletion/duplication)", True, 
                            "Other goals have same IDs")
                else:
                    log_test("GET /api/goals - other goals unchanged (no deletion/duplication)", False, 
                            "Other goals have different IDs - possible deletion/duplication")
            
            print(f"    Updated goals: {json.dumps(updated_goals, indent=2)}")
        else:
            log_test("GET /api/goals - verify change persisted", False, 
                    f"Status {resp.status_code}: {resp.text}")
            return
    except Exception as e:
        log_test("GET /api/goals - verify change persisted", False, f"Exception: {str(e)}")
        return
    
    # Test 5: GET /api/data - verify change also appears in aggregate endpoint
    print("\n[Step 5] GET /api/data - verify change in aggregate endpoint")
    try:
        resp = requests.get(f"{BASE_URL}/data", headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if "goals" in data:
                data_goals = data["goals"]
                if len(data_goals) > 0:
                    first_goal = data_goals[0]
                    if first_goal["target"] == 12345 and first_goal["label"] == "Monthly Net P&L Custom":
                        log_test("GET /api/data - modified goal appears in aggregate", True, 
                                f"Goal[0] in /data: target={first_goal['target']}, label='{first_goal['label']}'")
                    else:
                        log_test("GET /api/data - modified goal appears in aggregate", False, 
                                f"Expected target=12345, label='Monthly Net P&L Custom', got target={first_goal['target']}, label='{first_goal['label']}'")
                else:
                    log_test("GET /api/data - modified goal appears in aggregate", False, 
                            "No goals in /data response")
            else:
                log_test("GET /api/data - modified goal appears in aggregate", False, 
                        "No 'goals' key in /data response")
        else:
            log_test("GET /api/data - modified goal appears in aggregate", False, 
                    f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("GET /api/data - modified goal appears in aggregate", False, f"Exception: {str(e)}")
    
    # Test 6: Second independent GET /api/goals - confirm persistence across requests
    print("\n[Step 6] Second GET /api/goals - confirm persistence across requests")
    try:
        resp = requests.get(f"{BASE_URL}/goals", headers=headers, timeout=10)
        if resp.status_code == 200:
            final_goals = resp.json()
            if len(final_goals) > 0:
                first_goal = final_goals[0]
                if first_goal["target"] == 12345 and first_goal["label"] == "Monthly Net P&L Custom":
                    log_test("Second GET /api/goals - persistence confirmed", True, 
                            f"Goal[0] still has target={first_goal['target']}, label='{first_goal['label']}'")
                else:
                    log_test("Second GET /api/goals - persistence confirmed", False, 
                            f"Values changed! target={first_goal['target']}, label='{first_goal['label']}'")
            else:
                log_test("Second GET /api/goals - persistence confirmed", False, 
                        "No goals returned on second GET")
        else:
            log_test("Second GET /api/goals - persistence confirmed", False, 
                    f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("Second GET /api/goals - persistence confirmed", False, f"Exception: {str(e)}")
    
    # Test 7: PUT /api/goals without token - should return 401
    print("\n[Step 7] PUT /api/goals without token - should return 401")
    try:
        resp = requests.put(f"{BASE_URL}/goals", json=modified_goals, timeout=10)
        if resp.status_code == 401:
            log_test("PUT /api/goals - without token returns 401", True, "Correctly rejected")
        else:
            log_test("PUT /api/goals - without token returns 401", False, 
                    f"Expected 401, got {resp.status_code}")
    except Exception as e:
        log_test("PUT /api/goals - without token returns 401", False, f"Exception: {str(e)}")


def test_economic_calendar(token: str):
    """
    Test Economic Calendar endpoint
    
    This test verifies:
    1. GET /api/economic-calendar without token returns 401
    2. With token returns {events, currencies, updatedAt}
    3. Each event has ONLY {id, title, currency, impact, datetime}
    4. All event.currency values are in [USD,EUR,GBP,JPY,AUD,CAD,CHF,NZD]
    5. All event.impact values are in [High,Medium,Low]
    6. currencies field equals the 8 majors list
    """
    print("\n" + "="*80)
    print("TESTING ECONOMIC CALENDAR")
    print("="*80)
    
    headers = {"Authorization": f"Bearer {token}"}
    ALLOWED_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD']
    ALLOWED_IMPACTS = ['High', 'Medium', 'Low']
    
    # Test 1: GET /api/economic-calendar without token - should return 401
    print("\n[Step 1] GET /api/economic-calendar without token - should return 401")
    try:
        resp = requests.get(f"{BASE_URL}/economic-calendar", timeout=10)
        if resp.status_code == 401:
            log_test("GET /api/economic-calendar - without token returns 401", True, 
                    "Correctly rejected")
        else:
            log_test("GET /api/economic-calendar - without token returns 401", False, 
                    f"Expected 401, got {resp.status_code}")
    except Exception as e:
        log_test("GET /api/economic-calendar - without token returns 401", False, 
                f"Exception: {str(e)}")
    
    # Test 2: GET /api/economic-calendar with token
    print("\n[Step 2] GET /api/economic-calendar with token")
    try:
        resp = requests.get(f"{BASE_URL}/economic-calendar", headers=headers, timeout=20)
        if resp.status_code == 200:
            data = resp.json()
            
            # Check response structure
            if "events" in data and "currencies" in data and "updatedAt" in data:
                log_test("GET /api/economic-calendar - response structure", True, 
                        f"Has events, currencies, updatedAt")
                
                events = data["events"]
                currencies = data["currencies"]
                
                print(f"    Response: {len(events)} events, currencies={currencies}, updatedAt={data['updatedAt']}")
                
                # Test 3: Check currencies field
                if currencies == ALLOWED_CURRENCIES:
                    log_test("GET /api/economic-calendar - currencies field", True, 
                            f"currencies = {currencies}")
                else:
                    log_test("GET /api/economic-calendar - currencies field", False, 
                            f"Expected {ALLOWED_CURRENCIES}, got {currencies}")
                
                # Test 4: Check each event structure
                if len(events) > 0:
                    all_events_valid = True
                    invalid_events = []
                    
                    for i, event in enumerate(events):
                        # Check event has ONLY the required keys
                        required_keys = {"id", "title", "currency", "impact", "datetime"}
                        event_keys = set(event.keys())
                        
                        # Check for forbidden keys
                        forbidden_keys = {"forecast", "previous", "actual", "result"}
                        has_forbidden = event_keys & forbidden_keys
                        
                        if has_forbidden:
                            all_events_valid = False
                            invalid_events.append(f"Event {i} has forbidden keys: {has_forbidden}")
                        
                        # Check for missing required keys
                        missing_keys = required_keys - event_keys
                        if missing_keys:
                            all_events_valid = False
                            invalid_events.append(f"Event {i} missing keys: {missing_keys}")
                        
                        # Check extra keys (not forbidden but not required)
                        extra_keys = event_keys - required_keys
                        if extra_keys:
                            all_events_valid = False
                            invalid_events.append(f"Event {i} has extra keys: {extra_keys}")
                    
                    if all_events_valid:
                        log_test("GET /api/economic-calendar - event structure (ONLY id,title,currency,impact,datetime)", 
                                True, f"All {len(events)} events have correct structure")
                    else:
                        log_test("GET /api/economic-calendar - event structure (ONLY id,title,currency,impact,datetime)", 
                                False, f"Invalid events: {'; '.join(invalid_events[:5])}")
                    
                    # Test 5: Check all event.currency values
                    invalid_currencies = []
                    for i, event in enumerate(events):
                        if event.get("currency") not in ALLOWED_CURRENCIES:
                            invalid_currencies.append(f"Event {i}: currency='{event.get('currency')}'")
                    
                    if len(invalid_currencies) == 0:
                        log_test("GET /api/economic-calendar - all event.currency in allowed list", True, 
                                f"All currencies in {ALLOWED_CURRENCIES}")
                    else:
                        log_test("GET /api/economic-calendar - all event.currency in allowed list", False, 
                                f"Invalid currencies: {'; '.join(invalid_currencies[:5])}")
                    
                    # Test 6: Check all event.impact values
                    invalid_impacts = []
                    for i, event in enumerate(events):
                        if event.get("impact") not in ALLOWED_IMPACTS:
                            invalid_impacts.append(f"Event {i}: impact='{event.get('impact')}'")
                    
                    if len(invalid_impacts) == 0:
                        log_test("GET /api/economic-calendar - all event.impact in [High,Medium,Low]", True, 
                                f"All impacts in {ALLOWED_IMPACTS}")
                    else:
                        log_test("GET /api/economic-calendar - all event.impact in [High,Medium,Low]", False, 
                                f"Invalid impacts: {'; '.join(invalid_impacts[:5])}")
                    
                    # Print sample events for verification
                    print(f"\n    Sample events (first 3):")
                    for i, event in enumerate(events[:3]):
                        print(f"      Event {i}: {json.dumps(event, indent=8)}")
                
                else:
                    log_test("GET /api/economic-calendar - events array", False, 
                            "No events returned (empty array)")
            else:
                missing = []
                if "events" not in data:
                    missing.append("events")
                if "currencies" not in data:
                    missing.append("currencies")
                if "updatedAt" not in data:
                    missing.append("updatedAt")
                log_test("GET /api/economic-calendar - response structure", False, 
                        f"Missing keys: {missing}")
        else:
            log_test("GET /api/economic-calendar - with token", False, 
                    f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("GET /api/economic-calendar - with token", False, f"Exception: {str(e)}")


def main():
    print("\n" + "="*80)
    print("TRADE SENTINEL - GOALS PERSISTENCE & ECONOMIC CALENDAR TESTS")
    print(f"Testing: {BASE_URL}")
    print("="*80)
    
    # Get admin token
    token = get_admin_token()
    if not token:
        print("\n❌ Failed to get admin token. Cannot proceed with tests.")
        sys.exit(1)
    
    # Run tests
    test_goals_persistence(token)
    test_economic_calendar(token)
    
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
