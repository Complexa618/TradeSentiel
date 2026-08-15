# Auth-Gated App Testing Playbook (Emergent Google Auth)

This app supports TWO auth methods on the same endpoints:
1. Existing email/password JWT (Bearer token in `Authorization` header, stored in localStorage `ts_token`).
2. Emergent Google OAuth — session token stored in an httpOnly cookie `session_token` (also accepted as Bearer).

Backend authenticator (`get_current_user`) resolves a token by:
- Looking up `db.user_sessions` by `session_token` (checks tz-aware `expires_at`), then
- Falling back to JWT decode (email/password users).

## Step 1: Create Test User & Session (mongosh)
```
mongosh "$MONGO_URL" --eval "
const dbName = '$DB_NAME';
const d = db.getSiblingDB(dbName);
const userId = 'u_test' + Date.now();
const sessionToken = 'test_session_' + Date.now();
d.users.insertOne({ id: userId, name: 'Test User', email: 'test.user.'+Date.now()+'@example.com', username: 'testuser', picture: null, auth:'google', goals: [], settings: {hideBalance:false, hideUsername:false}, created_at: new Date().toISOString() });
d.user_sessions.insertOne({ user_id: userId, session_token: sessionToken, expires_at: new Date(Date.now()+7*24*60*60*1000), created_at: new Date() });
print('Session token: ' + sessionToken);
print('User ID: ' + userId);
"
```
Note: this app uses a custom `id` field (e.g. `u_xxx`) as the user key, and `user_sessions.user_id` must match that `id`.

## Step 2: Test Backend API
```
API=$(grep REACT_APP_BACKEND_URL /app/frontend/.env | cut -d '=' -f2)
# Session token via Bearer:
curl -s "$API/api/auth/me" -H "Authorization: Bearer <SESSION_TOKEN>"
curl -s "$API/api/data"    -H "Authorization: Bearer <SESSION_TOKEN>"
# Session token via cookie:
curl -s "$API/api/auth/me" -H "Cookie: session_token=<SESSION_TOKEN>"
```
Expected: 200 with `{"user": {...}}`.

## Step 3: Browser Testing (Playwright)
```
await page.context.add_cookies([{ "name":"session_token","value":"<SESSION_TOKEN>",
  "domain":"<preview-host>","path":"/","httpOnly":True,"secure":True,"sameSite":"None" }])
await page.goto("<preview-url>/dashboard")
```
Expected: dashboard loads (no redirect to /login).

## OAuth callback flow (real Google)
- Login page button redirects to `https://auth.emergentagent.com/?redirect=<origin>/dashboard`.
- Provider returns to `<origin>/dashboard#session_id=...`.
- `AppRoutes` detects `session_id` in `useLocation().hash` and renders `AuthCallback`,
  which POSTs `/api/auth/session` with header `X-Session-ID`, sets the cookie, and navigates to `/dashboard`.

## Cleanup
```
mongosh "$MONGO_URL" --eval "const d=db.getSiblingDB('$DB_NAME'); d.users.deleteMany({email:/test\\.user\\./}); d.user_sessions.deleteMany({session_token:/test_session/});"
```

## Success / Failure
- ✅ `/api/auth/me` returns user; dashboard loads; CRUD works.
- ❌ 401 / redirect to /login / "Not authenticated".
