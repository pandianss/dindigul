# Agentic Fix Prompt — Dindigul Bank Portal

> **Instructions for the AI Agent:** Read this document fully before touching any file. Execute fixes in the order presented. After each section, verify no regressions. This is a full-stack React 19 + Vite 7 + Express 5 + Prisma 6 + PostgreSQL + Docker app for an Indian regional bank. The frontend uses Tailwind CSS v4, i18next, socket.io-client, and lucide-react. The backend uses TypeScript, Express 5, Prisma ORM, JWT auth, and socket.io.

---

## Priority 1 — Critical Build Errors (Server)

### 1.1 — Fix socket.io Type Declaration Error

**File:** `server/src/index.ts`

**Problem:** TypeScript build fails with:
```
error TS2307: Cannot find module 'socket.io' or its corresponding type declarations.
error TS7006: Parameter 'socket' implicitly has an 'any' type.
error TS7006: Parameter 'room' implicitly has an 'any' type.
error TS7006: Parameter 'data' implicitly has an 'any' type.
```

**Root cause:** `@types/socket.io` is a legacy package that does not cover the modern `socket.io` v4 API. Socket.io v4+ ships its own types bundled. Having the legacy types package installed causes a conflict.

**Fix:**
1. In `server/package.json`, remove `"@types/socket.io": "^3.0.1"` from `devDependencies`.
2. Add explicit types to the socket callback parameters in `server/src/index.ts`. Locate the `io.on('connection', ...)` block and apply the following pattern:

```typescript
import { Server, Socket } from 'socket.io'; // already imported — ensure this line exists

io.on('connection', (socket: Socket) => {
  socket.on('join-room', (room: string) => {
    socket.join(room);
  });

  socket.on('send-message', (data: { text: string; roomId: string }) => {
    io.to(data.roomId).emit('message', {
      user: 'Anonymous',
      text: data.text,
      timestamp: new Date().toISOString(),
    });
  });
});
```

3. Run `npm install` inside the `server/` directory to remove the stale `@types/socket.io` package, then re-run `npm run build` to confirm zero errors.

---

### 1.2 — Fix Unused Variable TypeScript Errors (Frontend)

**Files:** `src/modules/OfficeNoteManager.tsx`, `src/modules/AssetManager.tsx`

**Problem:**
- `OfficeNoteManager.tsx(2)`: `ChevronRight` is imported but never used → `TS6133`
- `AssetManager.tsx(272)`: Loop variable `i` is declared but never used → `TS6133`

**Fix for OfficeNoteManager.tsx:** Remove `ChevronRight` from the lucide-react import line at line 2.

**Fix for AssetManager.tsx:** Locate the loop at line 272. Replace the unused loop variable `i` with `_i` (TypeScript ignores prefixed-underscore variables), OR refactor the loop to use a functional `.map()` or `.forEach()` that doesn't require an index variable. Preferred:
```typescript
// Before (approximate):
for (let i = 0; i < items.length; i++) { ... }

// After if index not needed:
items.forEach((item) => { ... });
```

---

### 1.3 — Remove Obsolete `version` Key from docker-compose.yml

**File:** `docker-compose.yml` (project root)

**Problem:** Docker Compose emits a warning on every invocation:
```
the attribute `version` is obsolete, it will be ignored
```
This clutters logs and is being treated as an error in some CI pipelines.

**Fix:** Delete the first line of `docker-compose.yml`:
```yaml
version: '3.8'   ← DELETE THIS LINE
```
The file should begin directly with `services:`.

---

## Priority 2 — Non-Responsive UI Elements

### 2.1 — Settings Navigation: Broken Because Auth & Token Are Missing

**Files:** `src/main.tsx`, `src/App.tsx`, `src/modules/SettingsManager.tsx`

**Problem:** The **Settings** sidebar button does visually navigate (setting `activeView = 'settings'`), but the `SettingsManager` immediately calls `api.get('/departments')` (and other endpoints). These calls hit the Express server with a `Bearer` token from `localStorage.getItem('user')`. However:

1. `AuthProvider` and `SocketProvider` are **never mounted** — `src/main.tsx` wraps `<App />` with only `React.StrictMode`. This means `localStorage.getItem('user')` returns `null` on a fresh session.
2. With no token, the server's `authenticate` middleware (JWT guard) returns `401 Unauthorized`.
3. The `SettingsManager`'s `fetchData()` catches the error silently (`console.error`) and leaves `data = []`, `loading = false`. The UI renders an empty state with no error message — appearing broken/frozen to the user.

**Fixes:**

**Step A — Wrap app with providers in `src/main.tsx`:**
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './i18n/config'
import { AuthProvider } from './context/AuthContext'
import { SocketProvider } from './context/SocketContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <SocketProvider>
        <App />
      </SocketProvider>
    </AuthProvider>
  </React.StrictMode>,
)
```

**Step B — Add a Login gate in `src/App.tsx`:**
Import `useAuth` and conditionally render a login screen when `user` is null:
```tsx
import { useAuth } from './context/AuthContext';

function App() {
  const { user, login, isLoading } = useAuth();
  // ...existing state...

  if (isLoading) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  if (!user) {
    // Render a simple login form or redirect
    return <LoginScreen onLogin={login} />;
  }

  // ...rest of App return (Layout + views)...
}
```
Create a minimal `src/components/LoginScreen.tsx` that calls `onLogin({ username, password })`.

**Step C — Add user-facing error display to `SettingsManager.tsx`:**
Add an `error` state and display a message when fetch fails, instead of silent failure:
```tsx
const [error, setError] = useState<string | null>(null);

// In fetchData():
} catch (err) {
  console.error('Fetch error:', err);
  setError('Failed to load data. Please check your connection or login again.');
} finally {
  setLoading(false);
}

// In render, before the table:
{error && (
  <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">{error}</div>
)}
```

---

### 2.2 — Logout Button Is a Dead Element

**File:** `src/components/Layout.tsx`

**Problem:** The **Logout** `<SidebarItem>` at the bottom of the sidebar has no `onClick` handler. Clicking it does nothing.

**Fix:** Wrap it in a `<button>` and call `logout()` from `useAuth()`:
```tsx
// Add to imports:
import { useAuth } from '../context/AuthContext';

// Inside Layout component:
const { logout } = useAuth();

// Replace the bare <SidebarItem> with:
<button onClick={logout} className="w-full text-left">
  <SidebarItem icon={LogOut} label={isSidebarOpen ? t('nav.logout') : ''} />
</button>
```

---

### 2.3 — Header Title Is Always "Dashboard" Regardless of Active View

**File:** `src/components/Layout.tsx`

**Problem:** The `<h1>` in the header is hardcoded to `{t('nav.dashboard')}`. When users navigate to Settings, Calendar, etc., the header still reads "Dashboard".

**Fix:** Pass `activeView` as a prop to Layout (it's already received) and derive the current title from the `menuItems` array plus the settings item:
```tsx
const allItems = [
  ...menuItems,
  { key: 'settings', label: t('nav.settings') }
];
const currentTitle = allItems.find(item => item.key === activeView)?.label ?? t('nav.dashboard');

// In JSX:
<h1 className="text-xl font-bold text-bank-navy truncate">{currentTitle}</h1>
```

---

### 2.4 — Socket.io WebSocket Not Proxied Through Nginx

**File:** `nginx.conf`

**Problem:** The Nginx proxy block for `/api/` does not include WebSocket upgrade headers for the Socket.io path (`/socket.io/`). This means real-time features (chat, live notifications) will silently fail in production Docker deployment.

**Fix:** Add a dedicated WebSocket proxy block in `nginx.conf`:
```nginx
location /socket.io/ {
    proxy_pass http://api:5000/socket.io/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```
Place this block after the existing `/api/` block and before the `error_page` directive.

---

## Priority 3 — Security & Configuration Hardening

### 3.1 — Hardcoded Secrets in docker-compose.yml

**File:** `docker-compose.yml`

**Problem:** Production secrets are committed in plain text:
- `POSTGRES_PASSWORD: secureadminpassword`
- `JWT_SECRET=strong_production_secret_key_123!`

**Fix:**
1. Create a `.env` file at the project root (add `.env` to `.gitignore` immediately):
```env
POSTGRES_PASSWORD=<generate a strong random password>
JWT_SECRET=<generate a 64-char random hex string using: openssl rand -hex 32>
```

2. Update `docker-compose.yml` to reference env vars:
```yaml
environment:
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
  # ...
  JWT_SECRET: ${JWT_SECRET}
```

### 3.2 — Prisma Version: Major Update Available

**Files:** `server/package.json`

**Problem:** The API logs show Prisma 6.2.1 is installed but **Prisma 7.4.1** is available. This is a major version bump.

**Action:**
1. Read the migration guide at https://pris.ly/d/major-version-upgrade before upgrading.
2. When ready, run inside `server/`:
```bash
npm i --save-dev prisma@latest
npm i @prisma/client@latest
npx prisma generate
```
3. Test all CRUD operations before deploying.

### 3.3 — JWT_SECRET Has No Expiry on Tokens

**File:** `server/src/routes/auth.ts`

**Check:** Open `server/src/routes/auth.ts` and locate the `jwt.sign()` call. Confirm `expiresIn` is set. If missing, add it:
```typescript
const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '8h' });
```
8 hours is appropriate for a working-hours banking portal.

---

## Priority 4 — Code Quality & Type Safety

### 4.1 — Replace All `any` Types in SettingsManager

**File:** `src/modules/SettingsManager.tsx`

All state variables use `any[]` and `any | null`. Define proper interfaces for each tab's data type:

```typescript
interface Department { id: string; nameEn: string; nameTa?: string; code?: string; }
interface Branch { id: string; code: string; nameEn: string; type: string; }
interface Designation { id: string; nameEn: string; grade?: string; }
interface StaffUser { id: string; username: string; fullNameEn: string; role: string; branchId?: string; }

type TabData = Department | Branch | Designation | StaffUser;
```

Replace `useState<any[]>([])` with `useState<TabData[]>([])` and narrow the type when rendering each tab.

### 4.2 — Eliminate Silent `console.error` Pattern

**Files:** All modules (`AssetManager.tsx`, `AuditManager.tsx`, `CommitteeManager.tsx`, etc.)

Every module uses the same silent catch pattern:
```typescript
} catch (error) {
  console.error('Error ...:', error);
}
```

Implement a shared error handler utility at `src/utils/handleError.ts`:
```typescript
import { AxiosError } from 'axios';

export function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    if (error.response?.status === 401) return 'Session expired. Please log in again.';
    if (error.response?.status === 403) return 'You do not have permission to perform this action.';
    if (error.response?.status === 404) return 'The requested resource was not found.';
    return error.response?.data?.message ?? 'Server error. Please try again.';
  }
  return 'An unexpected error occurred.';
}
```

Then in each module replace the catch block with:
```typescript
} catch (error) {
  setError(getErrorMessage(error));
}
```

### 4.3 — Hardcoded User in Header

**File:** `src/components/Layout.tsx`

The header shows `"Anand Kumar"` and `"Regional Manager"` as static strings. These should come from `useAuth()`:

```tsx
const { user } = useAuth();
// ...
<span className="text-sm font-bold text-gray-900">{user?.name ?? 'User'}</span>
<span className="text-[11px] text-gray-500">{user?.role ?? ''}</span>
```

---

## Priority 5 — Architecture Improvements

### 5.1 — Add a Vite Dev Proxy (for local development without Docker)

**File:** `vite.config.ts`

**Problem:** Currently, running `npm run dev` (outside Docker) will cause all API calls to fail because there's no proxy from `localhost:5173` to `localhost:5000`. Developers must run inside Docker even for frontend-only changes.

**Fix:**
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true,
      },
    },
  },
})
```

### 5.2 — Add Global Error Boundary

**File:** Create `src/components/ErrorBoundary.tsx`

The app has no React Error Boundary. A crash in any module (e.g., SettingsManager, AssetManager) will white-screen the entire app with no recovery path.

```tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error?: Error; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Boundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="p-8 text-center">
          <h2 className="text-xl font-bold text-red-700 mb-2">Something went wrong</h2>
          <p className="text-gray-500 mb-4">{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false })} className="btn-primary">
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

Wrap each module in `App.tsx` with the boundary:
```tsx
{activeView === 'settings' && <ErrorBoundary><SettingsManager /></ErrorBoundary>}
```

### 5.3 — Add Health Check to docker-compose for DB Dependency

**File:** `docker-compose.yml`

**Problem:** The `api` service starts immediately but may fail because Postgres hasn't finished initializing yet. `depends_on: db` only waits for the container to start, not for Postgres to be ready.

**Fix:** Add a healthcheck on `db` and `condition: service_healthy` on `api`:
```yaml
db:
  image: postgres:15-alpine
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U admin -d dindigul_db"]
    interval: 10s
    timeout: 5s
    retries: 5
  # ...

api:
  depends_on:
    db:
      condition: service_healthy
  # ...
```

---

## Execution Order Summary

| Step | File(s) | Change | Impact |
|------|---------|--------|--------|
| 1 | `server/package.json` | Remove `@types/socket.io` | Fixes server build |
| 2 | `server/src/index.ts` | Add Socket types | Fixes server build |
| 3 | `src/modules/OfficeNoteManager.tsx` | Remove unused `ChevronRight` import | Fixes frontend build |
| 4 | `src/modules/AssetManager.tsx` | Fix unused `i` variable | Fixes frontend build |
| 5 | `docker-compose.yml` | Remove `version:` key | Removes Docker warning |
| 6 | `src/main.tsx` | Add `AuthProvider` + `SocketProvider` | Fixes Settings & all API calls |
| 7 | `src/App.tsx` | Add login gate via `useAuth()` | Fixes unauthenticated API calls |
| 8 | `src/components/Layout.tsx` | Fix Logout + dynamic header title | Fixes non-responsive UI |
| 9 | `nginx.conf` | Add `/socket.io/` proxy block | Fixes WebSocket in production |
| 10 | `.env` + `docker-compose.yml` | Externalize secrets | Security hardening |
| 11 | `vite.config.ts` | Add dev proxy | Fixes local dev workflow |
| 12 | Create `src/components/ErrorBoundary.tsx` | Add error boundary | Prevents white-screen crashes |
| 13 | `docker-compose.yml` | Add DB healthcheck | Prevents race condition on startup |

---

## Verification Checklist

After completing all fixes, verify the following:

- [ ] `cd server && npm run build` exits with **0 errors**
- [ ] `npm run build` (frontend root) exits with **0 errors**
- [ ] `docker compose up --build` starts without warnings
- [ ] Navigate to `http://localhost:5173` — login screen appears
- [ ] After login, all sidebar items respond correctly
- [ ] **Settings** page loads departments/units/designations/staff
- [ ] **Logout** button clears session and returns to login screen
- [ ] Header title updates to match the active section
- [ ] Real-time socket connection shows as "connected" in browser DevTools Network tab
- [ ] No unhandled promise rejections in browser console
