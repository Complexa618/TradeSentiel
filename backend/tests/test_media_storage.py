"""Backend tests for trade media (image/video) object-storage flow."""
import io
import os
import struct
import zlib
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    # fallback: read frontend/.env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL"):
                BASE_URL = line.strip().split("=", 1)[1].strip().strip('"')
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"

EMAIL = "admin@tradesentinel.com"
PASSWORD = "Sentinel@2025"


def _png_bytes(w=8, h=8):
    def chunk(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)
    raw = b"".join(b"\x00" + b"\xff\x00\x00" * w for _ in range(h))
    idat = zlib.compress(raw)
    return sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")


def _fake_mp4():
    # Minimal ftyp box; not truly playable but has correct mime for upload validation
    return (b"\x00\x00\x00\x20ftypisom\x00\x00\x02\x00isomiso2mp41" + b"\x00" * 32)


@pytest.fixture(scope="session")
def token():
    r = requests.post(f"{API}/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def auth(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def trade_id(auth):
    # Ensure demo data exists
    requests.post(f"{API}/trades/demo", headers=auth, timeout=30)
    r = requests.get(f"{API}/trades", headers=auth, timeout=30)
    assert r.status_code == 200
    trades = r.json()
    assert trades, "No trades available"
    return trades[0]["id"]


def test_login_ok(token):
    assert isinstance(token, str) and len(token) > 10


def test_upload_image(auth, trade_id):
    files = {"files": ("test.png", _png_bytes(), "image/png")}
    r = requests.post(f"{API}/trades/{trade_id}/photos", headers=auth, files=files, timeout=60)
    assert r.status_code == 200, r.text
    data = r.json()
    assert len(data) == 1
    p = data[0]
    assert p["kind"] == "image"
    assert p["mime_type"] == "image/png"
    assert p["file_url"].startswith("/api/photos/") and p["file_url"].endswith("/file")

    # Serve URL (no auth) returns image
    url = BASE_URL + p["file_url"]
    s = requests.get(url, timeout=30)
    assert s.status_code == 200
    assert s.headers.get("content-type", "").startswith("image/")
    assert len(s.content) == p["file_size"]

    # Persistence: list photos
    lr = requests.get(f"{API}/trades/{trade_id}/photos", headers=auth, timeout=30)
    assert lr.status_code == 200
    assert any(x["id"] == p["id"] for x in lr.json())

    # Trade metadata updated
    tr = requests.get(f"{API}/trades", headers=auth, timeout=30)
    trade = next(t for t in tr.json() if t["id"] == trade_id)
    assert trade.get("photoCount", 0) >= 1
    assert trade.get("coverUrl", "").startswith("/api/photos/")

    # Delete and confirm 404 on serve
    dr = requests.delete(f"{API}/photos/{p['id']}", headers=auth, timeout=30)
    assert dr.status_code == 200
    s2 = requests.get(url, timeout=30)
    assert s2.status_code == 404


def test_upload_video(auth, trade_id):
    files = {"files": ("clip.mp4", _fake_mp4(), "video/mp4")}
    r = requests.post(f"{API}/trades/{trade_id}/photos", headers=auth, files=files, timeout=60)
    assert r.status_code == 200, r.text
    p = r.json()[0]
    assert p["kind"] == "video"
    assert p["mime_type"] == "video/mp4"

    url = BASE_URL + p["file_url"]
    s = requests.get(url, timeout=30)
    assert s.status_code == 200
    assert s.headers.get("content-type", "").startswith("video/")
    # cleanup
    requests.delete(f"{API}/photos/{p['id']}", headers=auth, timeout=30)


def test_upload_rejects_bad_mime(auth, trade_id):
    files = {"files": ("x.txt", b"hello", "text/plain")}
    r = requests.post(f"{API}/trades/{trade_id}/photos", headers=auth, files=files, timeout=30)
    assert r.status_code == 400


def test_serve_requires_no_auth_but_valid_token(auth, trade_id):
    # Invalid token -> 404
    r = requests.get(f"{API}/photos/deadbeefdeadbeef/file", timeout=30)
    assert r.status_code == 404


def test_upload_endpoint_requires_auth(trade_id):
    files = {"files": ("test.png", _png_bytes(), "image/png")}
    r = requests.post(f"{API}/trades/{trade_id}/photos", files=files, timeout=30)
    assert r.status_code in (401, 403)


def test_reorder_and_persistence(auth, trade_id):
    # Upload two images
    ids = []
    urls = []
    for i in range(2):
        files = {"files": (f"t{i}.png", _png_bytes(), "image/png")}
        r = requests.post(f"{API}/trades/{trade_id}/photos", headers=auth, files=files, timeout=60)
        assert r.status_code == 200
        p = r.json()[0]
        ids.append(p["id"])
        urls.append(BASE_URL + p["file_url"])

    # Reverse order
    rr = requests.put(f"{API}/trades/{trade_id}/photos/order", headers=auth, json=list(reversed(ids)), timeout=30)
    assert rr.status_code == 200
    ordered = [x["id"] for x in rr.json()]
    # The reversed ids should appear before others in the list
    idx = [ordered.index(i) for i in ids]
    assert idx[0] > idx[1]  # first uploaded now after second

    # Cleanup
    for pid in ids:
        requests.delete(f"{API}/photos/{pid}", headers=auth, timeout=30)
