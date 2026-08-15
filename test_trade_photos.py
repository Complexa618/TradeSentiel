#!/usr/bin/env python3
"""
Backend API Test Suite for Trade Sentinel - Trade Photos System
Tests the multi-photo upload/list/delete/serve functionality with per-user isolation
"""

import requests
import io
import os
from datetime import datetime

# Configuration
BASE_URL = "https://trade-sentinel-67.preview.emergentagent.com"
API_URL = f"{BASE_URL}/api"

# Test credentials
ADMIN_EMAIL = "admin@tradesentinel.com"
ADMIN_PASSWORD = "Sentinel@2025"

# Test counters
tests_passed = 0
tests_failed = 0
test_results = []

def log_test(name, passed, details=""):
    global tests_passed, tests_failed
    if passed:
        tests_passed += 1
        status = "✅ PASS"
    else:
        tests_failed += 1
        status = "❌ FAIL"
    result = f"{status}: {name}"
    if details:
        result += f" - {details}"
    test_results.append(result)
    print(result)

def create_1x1_png():
    """Create a minimal valid 1x1 PNG image (67 bytes)"""
    # This is a valid 1x1 transparent PNG
    png_bytes = bytes([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  # PNG signature
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,  # IHDR chunk
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,  # 1x1 dimensions
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
        0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,  # IDAT chunk
        0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
        0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,  # IEND chunk
        0x42, 0x60, 0x82
    ])
    return png_bytes

def create_text_file():
    """Create a text file for non-image upload test"""
    return b"This is a text file, not an image."

print("=" * 80)
print("TRADE PHOTOS BACKEND API TEST SUITE")
print("=" * 80)
print(f"Testing against: {API_URL}")
print(f"Timestamp: {datetime.now().isoformat()}")
print("=" * 80)

# ============================================================================
# STEP 1: Admin Login
# ============================================================================
print("\n[STEP 1] Admin Login")
try:
    response = requests.post(f"{API_URL}/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        admin_token = data.get("token")
        admin_user = data.get("user")
        log_test("Admin login", True, f"User: {admin_user.get('email')}")
    else:
        log_test("Admin login", False, f"Status {response.status_code}: {response.text}")
        print("CRITICAL: Cannot proceed without admin login")
        exit(1)
except Exception as e:
    log_test("Admin login", False, f"Exception: {e}")
    exit(1)

admin_headers = {"Authorization": f"Bearer {admin_token}"}

# ============================================================================
# STEP 2: Create a Trade
# ============================================================================
print("\n[STEP 2] Create Trade")
try:
    trade_data = {
        "symbol": "XAUUSD",
        "direction": "long",
        "risk": 100,
        "reward": 250,
        "status": "closed",
        "strategies": ["Breakout"],
        "session": "NY AM",
        "day": "2026-08-15"
    }
    response = requests.post(f"{API_URL}/trades", json=trade_data, headers=admin_headers)
    if response.status_code == 200:
        trade = response.json()
        trade_id = trade.get("id")
        log_test("Create trade", True, f"Trade ID: {trade_id}")
    else:
        log_test("Create trade", False, f"Status {response.status_code}: {response.text}")
        exit(1)
except Exception as e:
    log_test("Create trade", False, f"Exception: {e}")
    exit(1)

# ============================================================================
# STEP 3: Upload TWO PNG Images
# ============================================================================
print("\n[STEP 3] Upload 2 PNG Images")
try:
    png1 = create_1x1_png()
    png2 = create_1x1_png()
    
    files = [
        ('files', ('test_chart1.png', io.BytesIO(png1), 'image/png')),
        ('files', ('test_chart2.png', io.BytesIO(png2), 'image/png'))
    ]
    
    response = requests.post(
        f"{API_URL}/trades/{trade_id}/photos",
        files=files,
        headers=admin_headers
    )
    
    if response.status_code == 200:
        photos = response.json()
        if len(photos) == 2:
            photo1 = photos[0]
            photo2 = photos[1]
            
            # Validate structure
            required_keys = {'id', 'trade_id', 'file_url', 'file_name', 'mime_type', 'file_size', 'display_order'}
            has_all_keys = all(key in photo1 for key in required_keys) and all(key in photo2 for key in required_keys)
            
            if has_all_keys:
                log_test("Upload 2 PNG images", True, 
                        f"Photo1 ID: {photo1['id']}, Photo2 ID: {photo2['id']}")
                photo1_id = photo1['id']
                photo2_id = photo2['id']
                photo1_url = photo1['file_url']
                photo2_url = photo2['file_url']
            else:
                log_test("Upload 2 PNG images", False, "Missing required keys in response")
                exit(1)
        else:
            log_test("Upload 2 PNG images", False, f"Expected 2 photos, got {len(photos)}")
            exit(1)
    else:
        log_test("Upload 2 PNG images", False, f"Status {response.status_code}: {response.text}")
        exit(1)
except Exception as e:
    log_test("Upload 2 PNG images", False, f"Exception: {e}")
    exit(1)

# ============================================================================
# STEP 4: GET /api/trades/{id}/photos - Should Return 2 Photos Ordered
# ============================================================================
print("\n[STEP 4] List Photos for Trade")
try:
    response = requests.get(f"{API_URL}/trades/{trade_id}/photos", headers=admin_headers)
    if response.status_code == 200:
        photos = response.json()
        if len(photos) == 2:
            # Check ordering
            if photos[0]['display_order'] <= photos[1]['display_order']:
                log_test("List photos (2 photos, ordered)", True, 
                        f"Orders: {photos[0]['display_order']}, {photos[1]['display_order']}")
            else:
                log_test("List photos (2 photos, ordered)", False, "Photos not properly ordered")
        else:
            log_test("List photos (2 photos, ordered)", False, f"Expected 2 photos, got {len(photos)}")
    else:
        log_test("List photos (2 photos, ordered)", False, f"Status {response.status_code}: {response.text}")
except Exception as e:
    log_test("List photos (2 photos, ordered)", False, f"Exception: {e}")

# ============================================================================
# STEP 5: GET /api/trades - Verify photoCount=2 and coverUrl Set
# ============================================================================
print("\n[STEP 5] Verify Trade Has photoCount=2 and coverUrl")
try:
    response = requests.get(f"{API_URL}/trades", headers=admin_headers)
    if response.status_code == 200:
        trades = response.json()
        our_trade = next((t for t in trades if t['id'] == trade_id), None)
        if our_trade:
            photo_count = our_trade.get('photoCount')
            cover_url = our_trade.get('coverUrl')
            
            if photo_count == 2 and cover_url is not None:
                log_test("Trade has photoCount=2 and coverUrl", True, 
                        f"photoCount={photo_count}, coverUrl={cover_url}")
            else:
                log_test("Trade has photoCount=2 and coverUrl", False, 
                        f"photoCount={photo_count}, coverUrl={cover_url}")
        else:
            log_test("Trade has photoCount=2 and coverUrl", False, "Trade not found in list")
    else:
        log_test("Trade has photoCount=2 and coverUrl", False, f"Status {response.status_code}: {response.text}")
except Exception as e:
    log_test("Trade has photoCount=2 and coverUrl", False, f"Exception: {e}")

# ============================================================================
# STEP 6: Fetch file_url WITHOUT Auth Header (Token-Based Access)
# ============================================================================
print("\n[STEP 6] Fetch Photo File Without Auth (Token-Based)")
try:
    # Construct full URL
    full_photo_url = f"{BASE_URL}{photo1_url}"
    
    # Request WITHOUT Authorization header
    response = requests.get(full_photo_url)
    
    if response.status_code == 200:
        content_type = response.headers.get('content-type', '')
        if 'image' in content_type.lower():
            log_test("Fetch photo without auth (token-based)", True, 
                    f"Content-Type: {content_type}, Size: {len(response.content)} bytes")
        else:
            log_test("Fetch photo without auth (token-based)", False, 
                    f"Wrong content-type: {content_type}")
    else:
        log_test("Fetch photo without auth (token-based)", False, 
                f"Status {response.status_code}: {response.text}")
except Exception as e:
    log_test("Fetch photo without auth (token-based)", False, f"Exception: {e}")

# ============================================================================
# STEP 7: Upload Non-Image File (Should Return 400)
# ============================================================================
print("\n[STEP 7] Upload Non-Image File (Expect 400)")
try:
    text_file = create_text_file()
    files = [('files', ('test.txt', io.BytesIO(text_file), 'text/plain'))]
    
    response = requests.post(
        f"{API_URL}/trades/{trade_id}/photos",
        files=files,
        headers=admin_headers
    )
    
    if response.status_code == 400:
        log_test("Upload non-image file rejected (400)", True, f"Error: {response.json().get('detail', '')}")
    else:
        log_test("Upload non-image file rejected (400)", False, 
                f"Expected 400, got {response.status_code}")
except Exception as e:
    log_test("Upload non-image file rejected (400)", False, f"Exception: {e}")

# ============================================================================
# STEP 8: DELETE /api/photos/{id} - Delete One Photo
# ============================================================================
print("\n[STEP 8] Delete One Photo")
try:
    response = requests.delete(f"{API_URL}/photos/{photo1_id}", headers=admin_headers)
    if response.status_code == 200:
        data = response.json()
        if data.get('ok'):
            log_test("Delete photo", True, f"Deleted photo {photo1_id}")
        else:
            log_test("Delete photo", False, "Response missing 'ok' field")
    else:
        log_test("Delete photo", False, f"Status {response.status_code}: {response.text}")
except Exception as e:
    log_test("Delete photo", False, f"Exception: {e}")

# ============================================================================
# STEP 9: Verify List Now Returns 1 Photo
# ============================================================================
print("\n[STEP 9] Verify List Now Returns 1 Photo")
try:
    response = requests.get(f"{API_URL}/trades/{trade_id}/photos", headers=admin_headers)
    if response.status_code == 200:
        photos = response.json()
        if len(photos) == 1:
            log_test("List photos after delete (1 photo)", True, f"Remaining photo: {photos[0]['id']}")
        else:
            log_test("List photos after delete (1 photo)", False, f"Expected 1 photo, got {len(photos)}")
    else:
        log_test("List photos after delete (1 photo)", False, f"Status {response.status_code}: {response.text}")
except Exception as e:
    log_test("List photos after delete (1 photo)", False, f"Exception: {e}")

# ============================================================================
# STEP 10: Verify Trade Now Has photoCount=1
# ============================================================================
print("\n[STEP 10] Verify Trade Now Has photoCount=1")
try:
    response = requests.get(f"{API_URL}/trades", headers=admin_headers)
    if response.status_code == 200:
        trades = response.json()
        our_trade = next((t for t in trades if t['id'] == trade_id), None)
        if our_trade:
            photo_count = our_trade.get('photoCount')
            if photo_count == 1:
                log_test("Trade photoCount updated to 1", True, f"photoCount={photo_count}")
            else:
                log_test("Trade photoCount updated to 1", False, f"Expected 1, got {photo_count}")
        else:
            log_test("Trade photoCount updated to 1", False, "Trade not found")
    else:
        log_test("Trade photoCount updated to 1", False, f"Status {response.status_code}: {response.text}")
except Exception as e:
    log_test("Trade photoCount updated to 1", False, f"Exception: {e}")

# ============================================================================
# STEP 11: AUTH TESTS - POST/GET/DELETE Without Token (Expect 401)
# ============================================================================
print("\n[STEP 11] Auth Tests - Endpoints Without Token")

# POST /api/trades/{id}/photos without token
try:
    png = create_1x1_png()
    files = [('files', ('test.png', io.BytesIO(png), 'image/png'))]
    response = requests.post(f"{API_URL}/trades/{trade_id}/photos", files=files)
    if response.status_code == 401:
        log_test("POST photos without token (401)", True)
    else:
        log_test("POST photos without token (401)", False, f"Got {response.status_code}")
except Exception as e:
    log_test("POST photos without token (401)", False, f"Exception: {e}")

# GET /api/trades/{id}/photos without token
try:
    response = requests.get(f"{API_URL}/trades/{trade_id}/photos")
    if response.status_code == 401:
        log_test("GET photos without token (401)", True)
    else:
        log_test("GET photos without token (401)", False, f"Got {response.status_code}")
except Exception as e:
    log_test("GET photos without token (401)", False, f"Exception: {e}")

# DELETE /api/photos/{id} without token
try:
    response = requests.delete(f"{API_URL}/photos/{photo2_id}")
    if response.status_code == 401:
        log_test("DELETE photo without token (401)", True)
    else:
        log_test("DELETE photo without token (401)", False, f"Got {response.status_code}")
except Exception as e:
    log_test("DELETE photo without token (401)", False, f"Exception: {e}")

# ============================================================================
# STEP 12: PER-USER ISOLATION - Create Second User
# ============================================================================
print("\n[STEP 12] Per-User Isolation Tests")

# Create User B
try:
    user_b_email = f"testuser_photos_{datetime.now().timestamp()}@test.com"
    response = requests.post(f"{API_URL}/auth/signup", json={
        "name": "Test User B",
        "email": user_b_email,
        "password": "TestPass123!"
    })
    if response.status_code == 200:
        data = response.json()
        user_b_token = data.get("token")
        log_test("Create User B", True, f"Email: {user_b_email}")
    else:
        log_test("Create User B", False, f"Status {response.status_code}: {response.text}")
        user_b_token = None
except Exception as e:
    log_test("Create User B", False, f"Exception: {e}")
    user_b_token = None

if user_b_token:
    user_b_headers = {"Authorization": f"Bearer {user_b_token}"}
    
    # User B tries to GET User A's trade photos (should return empty list)
    try:
        response = requests.get(f"{API_URL}/trades/{trade_id}/photos", headers=user_b_headers)
        if response.status_code == 200:
            photos = response.json()
            if len(photos) == 0:
                log_test("User B cannot list User A's photos (empty list)", True)
            else:
                log_test("User B cannot list User A's photos (empty list)", False, 
                        f"Got {len(photos)} photos (should be 0)")
        else:
            log_test("User B cannot list User A's photos (empty list)", False, 
                    f"Status {response.status_code}")
    except Exception as e:
        log_test("User B cannot list User A's photos (empty list)", False, f"Exception: {e}")
    
    # User B tries to DELETE User A's photo (should return 404)
    try:
        response = requests.delete(f"{API_URL}/photos/{photo2_id}", headers=user_b_headers)
        if response.status_code == 404:
            log_test("User B cannot delete User A's photo (404)", True)
        else:
            log_test("User B cannot delete User A's photo (404)", False, 
                    f"Expected 404, got {response.status_code}")
    except Exception as e:
        log_test("User B cannot delete User A's photo (404)", False, f"Exception: {e}")

# ============================================================================
# FINAL SUMMARY
# ============================================================================
print("\n" + "=" * 80)
print("TEST SUMMARY")
print("=" * 80)
print(f"Total Tests: {tests_passed + tests_failed}")
print(f"✅ Passed: {tests_passed}")
print(f"❌ Failed: {tests_failed}")
print(f"Success Rate: {(tests_passed / (tests_passed + tests_failed) * 100):.1f}%")
print("=" * 80)

if tests_failed > 0:
    print("\n❌ FAILED TESTS:")
    for result in test_results:
        if "❌ FAIL" in result:
            print(f"  {result}")
    print("=" * 80)
    exit(1)
else:
    print("\n✅ ALL TESTS PASSED!")
    print("=" * 80)
    exit(0)
