# Trade Sentinel — PRD

## Problem Statement
Clone the Trade Sentinel app (https://tradesentinelg.lovable.app/) as a 1:1 full-stack MVP
(React + FastAPI + MongoDB). Premium dark SaaS aesthetic (Notion-style interactions, no
white browser-default components).

## Core Requirements
- JWT auth with per-user data isolation.
- Trade Journal using Risk/Reward logic (NO entry/exit price fields).
  - Profit (pnl) = Reward (a win has positive Reward, a loss has negative Reward).
  - RR (rMultiple) = Reward / Risk (null when Risk is 0/invalid).
- Dynamic free-text Strategy tags (multiple per trade).
- Live Economic News Calendar (Forex Factory / TradingView, keyless public feeds) + countdown ticker.
- Multi-photo screenshot gallery stored in DB, with a true full-screen viewer.
- Milestones page, Trading Goals, Session/Strategy analytics.
- Custom dark UI components (DarkSelect, DatePicker, TimeField) — no native browser pickers.

## Financial Model (source of truth)
- Starting Balance = sum of account balances (set in Manage Accounts).
- Realized P&L = sum of pnl across CLOSED trades.
- Total Balance = Starting Balance + Realized P&L.
- Equity Curve starts at Starting Balance (anchored one day before first trade) and cumulates
  pnl chronologically. All balance figures use the SAME source (calc.js helpers).

## Architecture
- Frontend `/app/frontend/`: React, Tailwind, Radix UI, lucide-react, Axios, Context API (AppContext.js).
- Backend `/app/backend/`: FastAPI, Motor (async MongoDB), Passlib/Bcrypt, PyJWT.
- Key files:
  - `src/lib/calc.js` — analytics + financial calculations.
  - `src/pages/Dashboard.jsx` — dashboard, filters, analytics tabs.
  - `src/components/EquityChart.jsx` — premium equity curve (SVG, crosshair, tooltip, animation).
  - `src/components/Charts.jsx` — AreaChart/LineChart/BarChart/Gauge.
  - `src/components/TradePhotos.jsx` — upload gallery + fullscreen Lightbox (portal).
  - `src/context/AppContext.js` — state + API calls.
  - `backend/server.py` — API + photo routes.

## Key API Endpoints
- `POST /api/auth/login`, `POST /api/auth/signup`, `GET /api/auth/me`
- `GET /api/data`
- `GET/POST /api/trades`, `PUT/DELETE /api/trades/{id}`, `POST /api/trades/demo`, `DELETE /api/trades`
- `POST /api/trades/{id}/photos`, `GET /api/trades/{id}/photos`, `DELETE /api/photos/{id}`, `PUT /api/trades/{id}/photos/order`
- `POST /api/accounts`, `DELETE /api/accounts/{id}`, `PUT /api/goals`, `PUT /api/settings`
- `GET /api/economic-calendar`

## Credentials
See `/app/memory/test_credentials.md`.

## Changelog
- 2026-06 (this session):
  - Fixed Dashboard Total Balance = starting balance + realized P&L (was sum of account balances only).
  - Fixed Equity Curve to baseline at starting balance and cumulate chronologically (was starting at $0).
  - Fullscreen Photo Viewer: rendered Lightbox via React portal to document.body (escapes transformed
    ancestors) with a single flex-centered image — perfectly centered for any aspect ratio / window size.
  - REDESIGNED Equity Curve (new `EquityChart.jsx`): single green line, subtle green gradient fill,
    dark premium bg, subtle horizontal grid, right-side currency Y-axis (niceScale), auto date X-axis,
    draw-in animation, hover crosshair + tooltip (Date + Equity only). No red/Minimum series. Real data,
    working range/strategy/session filters, premium empty state. Verified 100% (iteration_2.json).
  - Added data-testids: equity-chart, equity-chart-empty, total-balance-value, chart-tab-*, filter-range-*, analytics-range-*.
  - Added **Emergent-managed Google sign-in** alongside email/password JWT:
    - Backend (`server.py`): `POST /api/auth/session` (exchange Emergent `X-Session-ID` -> user + httpOnly
      `session_token` cookie, 7-day, upsert by email), `POST /api/auth/logout`, rewritten `get_current_user`
      accepting cookie/bearer session token OR legacy JWT. New `user_sessions` collection + unique index.
    - Frontend: `AuthCallback.jsx` (reads `session_id` from `useLocation().hash`), `AppRoutes` in `App.js`
      detects OAuth fragment before guards, `AppContext` uses `withCredentials` + `googleLogin` + logout->`/auth/logout`,
      `Login.jsx` "Continue with Google" button. Playbook at `/app/auth_testing.md`.
    - Verified via curl: cookie session, bearer session, no-auth 401, logout invalidation, legacy JWT login all pass.
      Full external Google redirect needs a real Google account (follows Emergent playbook exactly).
  - Added durable **object storage** for trade media (`server.py` init_storage/storage_put/storage_get):
    migrated photo uploads off local disk, added **video** support (MP4/WebM), 15MB image / 100MB video
    limits, upload progress bar; media served by unguessable token (image or video). Redesigned the Trade Log
    gallery to a uniform aspect-tile grid with video badge/play overlay. Verified 100% (iteration_3.json).
  - Built **Trading Progress** (Milestones 2.0):
    - Backend (`progress.py` + `server.py`): `GET /api/progress` (real-data stats, streaks, personal records,
      daily/weekly/monthly, discipline score, XP/level, goals integration, achievement evaluation, history,
      auto-seed 15 defaults, persists unlocked_at). Fully customizable DB-backed achievements:
      GET/POST/PUT/DELETE `/api/achievements`. `PUT /api/progress/settings` (toggles + XP values). New
      `achievements` collection. requirement_types: trade_count, win_streak, profit, win_rate, session_count,
      strategy_count, journal_trades, plan_followed, no_revenge, active_days, screenshots.
    - Frontend (`pages/Milestones.jsx` + `components/progress/*`): premium page — hero, 4 stat cards,
      level/XP bar, personal records, Today/Week/Month, discipline breakdown, current goals, achievements
      grid (locked/unlocked, category filter, detail dialog), achievement builder, customize panel, history,
      count-up + animated bars, unlock toasts, real-time refetch on data.trades change, empty state.
      Nav label 'Progress', page title 'Trading Progress'. Verified 100% (iteration_4.json).

## Backlog / Notes
- P2: `DELETE /api/trades` currently also deletes accounts (semantically overloaded). Consider splitting
  so clearing the journal keeps the starting balance intact. (Minor; not user-blocking.)
