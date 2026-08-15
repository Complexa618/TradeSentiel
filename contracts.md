# Trade Sentinel — API Contracts

Base: `${REACT_APP_BACKEND_URL}/api`  · Auth: Bearer JWT in `Authorization` header.

## Auth
- POST `/api/auth/signup` {name,email,password} -> {token, user}
- POST `/api/auth/login` {email,password} -> {token, user}
- GET  `/api/auth/me` -> {user}
Seed admin on startup: admin@tradesentinel.com / Sentinel@2025

user = {id, name, email, username}

## Trade model (per user)
Fields: symbol, direction(long|short), risk(number), reward(number), status(closed|open),
strategy(free text), session(one of NY AM|NY PM|NY Lunch|Asia|London|Pre Market),
day(YYYY-MM-DD), entryTime(ISO|null), exitTime(ISO|null), tags[], notes, screenshot(base64|null)
Server-derived: pnl = reward ; rMultiple = reward/risk (null if risk==0), date = day ISO.

## Trades
- GET    `/api/trades` -> [trade]
- POST   `/api/trades` (trade) -> trade
- PUT    `/api/trades/{id}` (patch) -> trade
- DELETE `/api/trades/{id}` -> {ok}
- POST   `/api/trades/demo` -> seeds demo trades+accounts, returns full data
- DELETE `/api/trades` -> clears all user trades

## Accounts / Goals / Settings
- GET/POST `/api/accounts`, DELETE `/api/accounts/{id}`
- GET/PUT  `/api/goals`  (goals array)
- GET/PUT  `/api/settings` {hideBalance, hideUsername}

## Aggregate
- GET `/api/data` -> {trades, accounts, goals, settings}  (single call used on load)

## Mocked -> Real
localStorage store in AppContext replaced by API calls. JWT stored in localStorage `ts_token`.
All analytics (stats, groupings, duration) stay CLIENT-side in lib/calc.js.
