#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_DIR="$ROOT_DIR/backend"
PORT="${PORT:-3000}"
BACKEND_PORT="${BACKEND_PORT:-8000}"

if [ -f "$FRONTEND_DIR/package.json" ] && [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  echo "Installing frontend dependencies..."
  (cd "$FRONTEND_DIR" && npm install --no-fund --no-audit >/dev/null 2>&1 || yarn install --frozen-lockfile >/dev/null 2>&1 || true)
fi

if [ -f "$FRONTEND_DIR/package.json" ] && [ ! -d "$FRONTEND_DIR/build" ]; then
  echo "Building frontend bundle..."
  (cd "$FRONTEND_DIR" && npm run build >/dev/null 2>&1 || yarn build >/dev/null 2>&1 || true)
fi

if [ -f "$BACKEND_DIR/requirements.txt" ] && [ ! -d "$BACKEND_DIR/.venv" ]; then
  echo "Installing backend dependencies..."
  python -m pip install -r "$BACKEND_DIR/requirements.txt" >/dev/null 2>&1 || true
fi

FRONTEND_PID=""
BACKEND_PID=""

if [ -n "${MONGO_URL:-}" ] && [ -n "${DB_NAME:-}" ]; then
  echo "Starting backend API on port ${BACKEND_PORT}"
  (cd "$BACKEND_DIR" && uvicorn server:app --host 0.0.0.0 --port "$BACKEND_PORT") &
  BACKEND_PID=$!
else
  echo "MONGO_URL/DB_NAME not set; backend will stay offline while the frontend serves static content."
fi

if [ -d "$FRONTEND_DIR/build" ]; then
  echo "Serving built frontend on port ${PORT}"
  (cd "$FRONTEND_DIR/build" && python -m http.server "$PORT" --bind 0.0.0.0) &
  FRONTEND_PID=$!
else
  echo "No frontend build found; serving repo root on port ${PORT}"
  (cd "$ROOT_DIR" && python -m http.server "$PORT" --bind 0.0.0.0) &
  FRONTEND_PID=$!
fi

cleanup() {
  if [ -n "$BACKEND_PID" ]; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
  if [ -n "$FRONTEND_PID" ]; then
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

if [ -n "$BACKEND_PID" ]; then
  wait "$BACKEND_PID"
else
  wait "$FRONTEND_PID"
fi
