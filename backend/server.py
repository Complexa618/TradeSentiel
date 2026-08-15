from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
import requests
import asyncio
import hashlib
import time as _time
from fastapi import UploadFile, File
from fastapi.responses import FileResponse
import shutil

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'trade-sentinel-secret-key-change-me')
JWT_ALG = 'HS256'
JWT_DAYS = 30

pwd = CryptContext(schemes=['bcrypt'], deprecated='auto')
security = HTTPBearer(auto_error=False)

app = FastAPI()
api = APIRouter(prefix="/api")

SESSIONS = ['NY AM', 'NY PM', 'NY Lunch', 'Asia', 'London', 'Pre Market']
DEFAULT_GOALS = [
    {"id": "g1", "label": "Monthly Net P&L", "target": 5000, "current": 0, "unit": "$"},
    {"id": "g2", "label": "Win Rate", "target": 60, "current": 0, "unit": "%"},
    {"id": "g3", "label": "Trades Logged", "target": 40, "current": 0, "unit": ""},
    {"id": "g4", "label": "Avg R:R", "target": 2, "current": 0, "unit": "R"},
]


# ---------------- Models ----------------
class SignupIn(BaseModel):
    name: str
    email: EmailStr
    password: str

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class TradeIn(BaseModel):
    symbol: str = ""
    direction: str = "long"
    risk: float = 0
    reward: float = 0
    status: str = "closed"
    strategies: List[str] = []
    session: str = "NY AM"
    day: Optional[str] = None
    entryTime: Optional[str] = None
    exitTime: Optional[str] = None
    tags: List[str] = []
    notes: str = ""
    screenshot: Optional[str] = None

class AccountIn(BaseModel):
    name: str
    broker: str = ""
    balance: float = 0

class SettingsIn(BaseModel):
    hideBalance: Optional[bool] = None
    hideUsername: Optional[bool] = None


# ---------------- Helpers ----------------
def now_iso():
    return datetime.now(timezone.utc).isoformat()

def make_token(uid: str) -> str:
    payload = {"sub": uid, "exp": datetime.now(timezone.utc) + timedelta(days=JWT_DAYS)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

def public_user(u: dict) -> dict:
    return {"id": u["id"], "name": u["name"], "email": u["email"], "username": u["username"]}

def derive(trade: dict) -> dict:
    risk = float(trade.get("risk") or 0)
    reward = float(trade.get("reward") or 0)
    trade["pnl"] = round(reward, 2)
    trade["rMultiple"] = round(reward / risk, 2) if risk != 0 else None
    if trade.get("day"):
        try:
            trade["date"] = datetime.fromisoformat(trade["day"] + "T00:00:00").astimezone(timezone.utc).isoformat()
        except Exception:
            trade["date"] = now_iso()
    else:
        trade["date"] = trade.get("date") or now_iso()
    return trade

async def get_current_user(cred: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> dict:
    if cred is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(cred.credentials, JWT_SECRET, algorithms=[JWT_ALG])
        uid = payload.get("sub")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    u = await db.users.find_one({"id": uid})
    if not u:
        raise HTTPException(status_code=401, detail="User not found")
    return u

def clean(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


# ---------------- Auth ----------------
@api.post("/auth/signup")
async def signup(body: SignupIn):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
    uid = "u_" + uuid.uuid4().hex[:10]
    username = "".join(c for c in (body.name or email).lower() if c.isalnum())[:14] or "trader"
    user = {
        "id": uid, "name": body.name, "email": email, "username": username,
        "password_hash": pwd.hash(body.password),
        "goals": DEFAULT_GOALS, "settings": {"hideBalance": False, "hideUsername": False},
        "created_at": now_iso(),
    }
    await db.users.insert_one(user)
    return {"token": make_token(uid), "user": public_user(user)}

@api.post("/auth/login")
async def login(body: LoginIn):
    u = await db.users.find_one({"email": body.email.lower()})
    if not u:
        raise HTTPException(status_code=400, detail="No account found with that email.")
    if not pwd.verify(body.password, u["password_hash"]):
        raise HTTPException(status_code=400, detail="Incorrect password.")
    return {"token": make_token(u["id"]), "user": public_user(u)}

@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return {"user": public_user(user)}


# ---------------- Aggregate ----------------
@api.get("/data")
async def get_data(user: dict = Depends(get_current_user)):
    trades = await db.trades.find({"user_id": user["id"]}).sort("date", -1).to_list(2000)
    accounts = await db.accounts.find({"user_id": user["id"]}).to_list(200)
    return {
        "trades": [clean(t) for t in trades],
        "accounts": [clean(a) for a in accounts],
        "goals": user.get("goals", DEFAULT_GOALS),
        "settings": user.get("settings", {"hideBalance": False, "hideUsername": False}),
    }


# ---------------- Trades ----------------
@api.get("/trades")
async def list_trades(user: dict = Depends(get_current_user)):
    trades = await db.trades.find({"user_id": user["id"]}).sort("date", -1).to_list(2000)
    return [clean(t) for t in trades]

@api.post("/trades")
async def create_trade(body: TradeIn, user: dict = Depends(get_current_user)):
    trade = body.dict()
    trade["id"] = "t_" + uuid.uuid4().hex[:10]
    trade["user_id"] = user["id"]
    trade["createdAt"] = now_iso()
    derive(trade)
    await db.trades.insert_one(dict(trade))
    return clean(trade)

@api.put("/trades/{trade_id}")
async def update_trade(trade_id: str, patch: dict, user: dict = Depends(get_current_user)):
    existing = await db.trades.find_one({"id": trade_id, "user_id": user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Trade not found")
    existing.update(patch)
    derive(existing)
    await db.trades.replace_one({"id": trade_id, "user_id": user["id"]}, {k: v for k, v in existing.items() if k != "_id"})
    return clean(existing)

@api.delete("/trades/{trade_id}")
async def delete_trade(trade_id: str, user: dict = Depends(get_current_user)):
    await db.trades.delete_one({"id": trade_id, "user_id": user["id"]})
    return {"ok": True}

@api.delete("/trades")
async def clear_trades(user: dict = Depends(get_current_user)):
    await db.trades.delete_many({"user_id": user["id"]})
    await db.accounts.delete_many({"user_id": user["id"]})
    return {"ok": True}

@api.post("/trades/demo")
async def load_demo(user: dict = Depends(get_current_user)):
    from demo_data import demo_trades, demo_accounts
    await db.trades.delete_many({"user_id": user["id"]})
    await db.accounts.delete_many({"user_id": user["id"]})
    trades = demo_trades()
    for t in trades:
        t["id"] = "t_" + uuid.uuid4().hex[:10]
        t["user_id"] = user["id"]
        t["createdAt"] = now_iso()
        derive(t)
        await db.trades.insert_one(dict(t))
    accts = demo_accounts()
    for a in accts:
        a["id"] = "a_" + uuid.uuid4().hex[:8]
        a["user_id"] = user["id"]
        await db.accounts.insert_one(dict(a))
    return await get_data(user)


# ---------------- Accounts ----------------
@api.get("/accounts")
async def list_accounts(user: dict = Depends(get_current_user)):
    accts = await db.accounts.find({"user_id": user["id"]}).to_list(200)
    return [clean(a) for a in accts]

@api.post("/accounts")
async def create_account(body: AccountIn, user: dict = Depends(get_current_user)):
    acc = body.dict()
    acc["id"] = "a_" + uuid.uuid4().hex[:8]
    acc["user_id"] = user["id"]
    await db.accounts.insert_one(dict(acc))
    return clean(acc)

@api.delete("/accounts/{account_id}")
async def delete_account(account_id: str, user: dict = Depends(get_current_user)):
    await db.accounts.delete_one({"id": account_id, "user_id": user["id"]})
    return {"ok": True}


# ---------------- Goals / Settings ----------------
@api.get("/goals")
async def get_goals(user: dict = Depends(get_current_user)):
    return user.get("goals", DEFAULT_GOALS)

@api.put("/goals")
async def put_goals(goals: List[dict], user: dict = Depends(get_current_user)):
    await db.users.update_one({"id": user["id"]}, {"$set": {"goals": goals}})
    return goals

@api.get("/settings")
async def get_settings(user: dict = Depends(get_current_user)):
    return user.get("settings", {"hideBalance": False, "hideUsername": False})

@api.put("/settings")
async def put_settings(body: SettingsIn, user: dict = Depends(get_current_user)):
    settings = user.get("settings", {"hideBalance": False, "hideUsername": False})
    for k, v in body.dict().items():
        if v is not None:
            settings[k] = v
    await db.users.update_one({"id": user["id"]}, {"$set": {"settings": settings}})
    return settings


# ---------------- Economic Calendar (live, cached, modular) ----------------
# Provider integration lives in backend only; no API key required for this feed,
# so no secret is ever exposed to the frontend. Add more providers here later.
ALLOWED_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD']
_econ_cache = {"data": None, "ts": 0}
_ECON_TTL = 60 * 30  # 30 minutes

def _normalize_impact(v: str) -> str:
    v = (v or "").lower()
    if v == "high":
        return "High"
    if v == "medium":
        return "Medium"
    return "Low"  # Low + Holiday -> Low

# TradingView economic calendar: keyless, supports future date ranges (forward-looking).
_TV_COUNTRY_CUR = {"US": "USD", "EU": "EUR", "GB": "GBP", "JP": "JPY", "AU": "AUD", "CA": "CAD", "CH": "CHF", "NZ": "NZD"}
_TV_IMPACT = {1: "High", 0: "Medium", -1: "Low"}

def _fetch_tradingview():
    from datetime import datetime as _dt, timedelta as _td
    now = _dt.utcnow()
    # PAST <- TODAY -> FUTURE: 30 days back, 45 days forward
    frm = (now - _td(days=30)).strftime("%Y-%m-%dT00:00:00.000Z")
    to = (now + _td(days=45)).strftime("%Y-%m-%dT00:00:00.000Z")
    r = requests.get(
        "https://economic-calendar.tradingview.com/events",
        params={"from": frm, "to": to, "countries": ",".join(_TV_COUNTRY_CUR.keys())},
        headers={"User-Agent": "Mozilla/5.0", "Origin": "https://www.tradingview.com"},
        timeout=25,
    )
    r.raise_for_status()
    result = r.json().get("result", [])
    events = []
    for ev in result:
        cur = ev.get("currency") or _TV_COUNTRY_CUR.get(ev.get("country"))
        if cur not in ALLOWED_CURRENCIES:
            continue
        title = ev.get("title", "")
        dt = ev.get("date", "")  # ISO Z
        key = f"{title}{cur}{dt}"
        events.append({
            "id": hashlib.md5(key.encode()).hexdigest()[:12],
            "title": title,
            "currency": cur,
            "impact": _TV_IMPACT.get(ev.get("importance"), "Low"),
            "datetime": dt,
        })
    events.sort(key=lambda e: e["datetime"])
    return events

def _fetch_faireconomy():
    r = requests.get("https://nfs.faireconomy.media/ff_calendar_thisweek.json",
                     headers={"User-Agent": "Mozilla/5.0"}, timeout=20)
    r.raise_for_status()
    events = []
    for ev in r.json():
        cur = ev.get("country")
        if cur not in ALLOWED_CURRENCIES:
            continue
        title, dt = ev.get("title", ""), ev.get("date", "")
        key = f"{title}{cur}{dt}"
        events.append({"id": hashlib.md5(key.encode()).hexdigest()[:12], "title": title,
                       "currency": cur, "impact": _normalize_impact(ev.get("impact")), "datetime": dt})
    return events

def _fetch_forexfactory():
    # Primary: TradingView (forward-looking). Fallback: faireconomy (current week only).
    try:
        events = _fetch_tradingview()
        if events:
            return events
    except Exception as e:
        logger.warning(f"TradingView calendar failed, falling back: {e}")
    return _fetch_faireconomy()

def _get_events(force=False):
    now = _time.time()
    if not force and _econ_cache["data"] is not None and (now - _econ_cache["ts"] < _ECON_TTL):
        return _econ_cache["data"]
    try:
        data = _fetch_forexfactory()
        _econ_cache["data"] = data
        _econ_cache["ts"] = now
        return data
    except Exception as e:
        logger.warning(f"Economic calendar fetch failed: {e}")
        # serve stale cache if available
        return _econ_cache["data"] or []

@api.get("/economic-calendar")
async def economic_calendar(user: dict = Depends(get_current_user)):
    loop = asyncio.get_event_loop()
    events = await loop.run_in_executor(None, _get_events, False)
    return {"events": events, "currencies": ALLOWED_CURRENCIES, "updatedAt": _econ_cache["ts"]}


@api.get("/")
async def root():
    return {"message": "Trade Sentinel API"}


app.include_router(api)
app.add_middleware(
    CORSMiddleware, allow_credentials=True, allow_origins=["*"],
    allow_methods=["*"], allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.trades.create_index("user_id")
    await db.accounts.create_index("user_id")
    admin_email = "admin@tradesentinel.com"
    if not await db.users.find_one({"email": admin_email}):
        await db.users.insert_one({
            "id": "u_admin", "name": "Admin", "email": admin_email, "username": "admin",
            "password_hash": pwd.hash("Sentinel@2025"),
            "goals": DEFAULT_GOALS, "settings": {"hideBalance": False, "hideUsername": False},
            "created_at": now_iso(),
        })
        logger.info("Seeded admin user")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
