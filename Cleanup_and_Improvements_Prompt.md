# Codebase Cleanup & Improvement Tasks
**dindigul-main · Bank RO Portal · React + TypeScript + Node/Express + Prisma**

You are working on this codebase. The issues below were identified by code review. Fix them in order of priority. Each issue includes the exact file and line reference. Do not make assumptions — read the referenced file before changing it.

---

## 🔴 CRITICAL — Security

### 1. Three route files have zero authentication

`server/src/routes/calendar.ts`, `server/src/routes/expenditure.ts`, and `server/src/routes/logistics.ts` have **no `authenticateToken` calls at all**. Any unauthenticated request can create/update/delete holidays, create expense sanctions, and manipulate stationery stock levels.

**Fix:** Import `authenticateToken` and apply it to every route in all three files. For calendar write routes (POST, DELETE), additionally require `role === 'ADMIN' || role === 'RO_USER'`. For expenditure and logistics, require at minimum a valid session.

### 2. Three MIS endpoints are publicly accessible

In `server/src/routes/mis.ts`:
- Line 38: `router.get('/snapshots', ...)` — no auth
- Line 56: `router.get('/snapshot', ...)` — no auth  
- Line 485: `router.get('/business-snapshot/:branchCode', ...)` — no auth

The first two expose internal branch MIS data. Add `authenticateToken` to `/snapshots` and `/snapshot`. The `/business-snapshot` endpoint is intentionally public (feeds the public portal) — add a comment confirming this is deliberate so the next developer doesn't remove it.

### 3. JWT token stored in localStorage — XSS vulnerable

`src/context/AuthContext.tsx` lines 82–83, 114–115, 132–133 write both `user` and `token` to `localStorage`. The token should be in an `httpOnly` cookie (server-managed) or at minimum `sessionStorage`. `localStorage` is accessible to any injected script.

Additionally, `src/modules/OfficeNoteManager.tsx` lines 1894, 2008, and 3023 read `localStorage.getItem('user')` directly, bypassing the `AuthContext`. This is both a security smell and a consistency bug — if the auth context updates the user, these three reads won't reflect it.

**Fix:**
- Move token to `sessionStorage` as an interim measure (prevents persistence across tabs and survives page reload within the session).
- Replace all three direct `localStorage.getItem('user')` calls in `OfficeNoteManager.tsx` with the `useAuth()` hook from `AuthContext`.
- Flag the ideal long-term fix: httpOnly cookie + `/api/auth/me` endpoint pattern.

---

## 🔴 CRITICAL — Will Break on Linux Deployment

### 4. PowerShell zip command in bulk letter download

`server/src/routes/mis.ts` line 696:
```ts
await execAsync(`powershell.exe -Command "Compress-Archive -Path '${baseDir}\\*' -DestinationPath '${zipPath}' -Force"`);
```

This is a Windows-only command. The server will be deployed on Linux. This will throw `ENOENT: powershell.exe` and crash the bulk download endpoint entirely.

**Fix:** Replace with the `archiver` npm package (already imported in `server/src/routes/letter.ts` — reuse it). The correct pattern is already in use for letter zipping in that file; copy the archiver stream approach.

Also: the `temp_zips/` directory is included in the repo with hundreds of MB of PDFs committed across multiple UUID-named subdirectories. These are runtime artefacts. Add `server/temp_zips/` to `server/.gitignore` and delete the committed files.

---

## 🟠 HIGH — Architecture / Reliability

### 5. Puppeteer launches a new browser instance per PDF call

`server/src/services/pdfService.ts` line 524–530, `getBrowser()` creates a new Chromium instance every time it's called with no `existingBrowser`. Routes that generate single PDFs call `getBrowser()` inline and close the browser immediately after. For bulk operations (50+ letters), the caller passes the browser through — but for single-PDF routes, a new instance is spawned and destroyed each time.

**Fix:** Implement a module-level browser singleton with lazy init and auto-restart on crash:
```ts
let _browser: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
    if (_browser && _browser.isConnected()) return _browser;
    _browser = await puppeteer.launch({ /* existing args */ });
    _browser.on('disconnected', () => { _browser = null; });
    return _browser;
}
```
Remove all `browser.close()` calls from single-PDF routes (the singleton stays alive). Only close it explicitly in process shutdown.

### 6. Raw SQL used to bypass Prisma type drift

Four locations use `(prisma as any).$executeRaw` with the comment "to bypass Prisma Client sync issues":
- `server/src/routes/officeNote.ts` lines 374, 477, 503
- `server/src/services/referenceService.ts` line 129

All four update a `referenceNo` column. This indicates the `referenceNo` field exists in the database (added via migration) but is missing or mistyped in `server/prisma/schema.prisma`. The `(prisma as any)` cast is a workaround for the generated client not knowing the field exists.

**Fix:** 
1. Check `server/prisma/schema.prisma` — confirm `referenceNo` is present in the `OfficeNote` model.
2. If missing, add it and run `npx prisma generate`.
3. Replace all four raw SQL calls with typed Prisma updates (`prisma.officeNote.update({ where: { id }, data: { referenceNo } })`).
4. Remove all `(prisma as any)` casts.

### 7. Multer configured inline in five separate route files

`multer` is independently configured in:
- `server/src/routes/letter.ts` (diskStorage to `uploads/letters/`)
- `server/src/routes/officeNote.ts` (diskStorage to `uploads/office-notes/`)
- `server/src/routes/department.ts` (diskStorage)
- `server/src/routes/mis.ts` (memoryStorage)
- `server/src/routes/budgetRoutes.ts` (memoryStorage)

Each defines its own `storage`, `limits`, and `fileFilter`. The `fs.existsSync` + `fs.mkdirSync` directory creation pattern is copy-pasted in three of them.

**Fix:** Create `server/src/middleware/upload.ts` that exports pre-configured multer instances:
```ts
export const diskUpload = (subdir: string) => multer({ storage: diskStorage(subdir), ... });
export const memUpload = multer({ storage: memoryStorage(), ... });
```
The directory creation should happen once at server startup (`ensureUploadDirs()`), not inside every multer `destination` callback.

---

## 🟠 HIGH — Duplicated Source Files

### 8. `authfiles/` directory is a stale shadow copy

The `authfiles/` directory contains diverged copies of production source files:

| File in `authfiles/` | Canonical file | Status |
|---|---|---|
| `AuthContext.tsx` (170 lines) | `src/context/AuthContext.tsx` (177 lines) | Diverged — missing `autoLogin`, `section`, `departmentId` |
| `LoginScreen.tsx` (351 lines) | `src/components/LoginScreen.tsx` (402 lines) | Diverged |
| `SettingsManager.tsx` (1309 lines) | `src/modules/SettingsManager.tsx` | Likely diverged |
| `schema.prisma` (1118 lines) | `server/prisma/schema.prisma` (1249 lines) | Diverged — missing 131 lines of models |
| `auth.ts`, `audit.ts`, `migration.sql` | `server/src/routes/auth.ts`, etc. | Unknown drift |

The `authfiles/` copies are being edited separately. This will cause confusion and bugs when someone edits the wrong file.

**Fix:** Delete the entire `authfiles/` directory. If any file there contains something not yet in the canonical location, merge it first. Add `authfiles/` to `.gitignore` to prevent re-introduction.

### 9. `dev.db` and Prisma generated client committed to git

`server/dev.db` (61 KB SQLite development database) is committed. It may contain test user credentials, real branch data used during development, or seeded personal data.

`server/src/generated/client/` (~15 MB including `.wasm` files) is committed. This is auto-generated by `prisma generate` and should never be in source control.

**Fix:**
- Delete `server/dev.db` from the repo.
- Delete `server/src/generated/client/` from the repo.
- Add both to `server/.gitignore`:
  ```
  dev.db
  *.db
  src/generated/
  temp_zips/
  ```
- Confirm `npx prisma generate` is run as part of the deployment/build step.

---

## 🟡 MEDIUM — Code Quality

### 10. Role guard logic duplicated across route files

The check `req.user.role !== 'ADMIN' && req.user.section?.toLowerCase() !== 'planning'` appears inline in at least `letter.ts` (lines 36, 52) and `mis.ts` in varied forms, even though `requireAdminOrPlanning` middleware already exists in `auth.ts` for exactly this purpose.

**Fix:** Audit every route file for inline role checks. Replace with the appropriate exported middleware: `requireAdminOrPlanning`, or a new `requireAdmin` middleware for admin-only routes. Inline role checks should only appear when logic is more nuanced than the middleware covers.

### 11. Pagination default limit of 2000 in letters route

`server/src/routes/letter.ts` line 98:
```ts
const { skip, take, page, limit } = parsePagination(req, 2000);
```

The default page size of 2000 means a single request can return 2000 letter records with full included relations. With 60+ branches generating letters monthly this will become a performance issue.

**Fix:** Lower the default to 50 and enforce a maximum of 200. If the frontend needs all letters for a bulk download, it should use the dedicated bulk-download endpoint, not the paginated list.

### 12. `GAP` comments throughout production code

`officeNote.ts` alone has 7 `// GAP N:` comments (GAP 15, GAP 19, etc.) that were development tracking notes. These add noise and suggest unfinished work to future readers.

**Fix:** Search the entire `server/src/` directory for `// GAP` and either:
- Convert to a proper `// TODO(issue#):` comment if the work is genuinely incomplete, or
- Remove the comment if the work is done.

Run: `grep -rn "GAP" server/src/ --include="*.ts"` to find all instances.

### 13. Deprecated helper still in production code

`server/src/routes/user.ts` line 17:
```ts
// Helper to save base64 to disk (GAP 06) - DEPRECATED: see utils/image.ts
```

The function below this comment is still present and presumably still called somewhere (otherwise it would have caused a build error when removed). 

**Fix:** Confirm whether any route in `user.ts` still calls the deprecated helper. If so, migrate it to `utils/image.ts`. Remove the deprecated function and the comment.

### 14. `console.log` / `console.error` used as the only logging mechanism

Every route file uses bare `console.error(...)` for error logging, with no structured format, no log levels, and no correlation IDs. In production this makes log aggregation impossible.

**Fix (minimal):** At minimum, standardise the error logging format with a wrapper:
```ts
// server/src/lib/logger.ts
export const logger = {
  info: (msg: string, meta?: object) => console.log(JSON.stringify({ level: 'info', msg, ...meta, ts: new Date().toISOString() })),
  error: (msg: string, meta?: object) => console.error(JSON.stringify({ level: 'error', msg, ...meta, ts: new Date().toISOString() })),
};
```
Replace `console.log` and `console.error` throughout `server/src/` with `logger.info` / `logger.error`.

---

## 🟡 MEDIUM — Repository Hygiene

### 15. Hundreds of one-off debug/fix scripts cluttering the repo

The following directories are development artefacts and must not be in the production repo:

- `server/archive/` — 80+ one-off scripts (`check_*.js`, `fix_*.js`, `test_*.js`, `repair_db.js`, `nuke_letters.js`, etc.)
- `server/tmp/` — temporary diagnostic scripts
- `server/scripts/` — seed and check scripts that ran during development
- `scratch/` — extracted Word doc strings and one-off Python scripts
- Root-level files: `debug_db.cjs`, `check_params.ts`, `tmp_check_columns.js`, `tmp_sync.js`, `tmp_sync_rec.js`, `fix_schema.js`, `fix_schema.ts`, `fix_schema_pg.js`

These files reference hardcoded branch codes, personal names, and internal data from the development phase.

**Fix:** Move genuinely useful seed scripts to `server/src/scripts/` (already partially done — this is the right location). Delete everything else. The `server/archive/` directory should be removed entirely.

### 16. `mis_files/` with real data committed to the repo

`mis_files/` contains:
- Real MIS Excel files (`20240331.xlsx`, `20250331.xlsx`, `20260228.xlsx`, etc.)
- `Staff.csv` — staff data also duplicated at the root level
- `HighValueDD_Summary_monthly_2026-03-27.csv` — real high-value DD summary
- `Adobe Scan 16-Jun-2025.pdf` and `Proforma I.pdf` — scanned documents

These files contain real operational banking data and should never be in a git repository.

**Fix:** Delete `mis_files/` from the repo. Add to `.gitignore`. If sample/anonymised test data is needed for development, create a `mis_files/samples/` directory with fictitious data only.

Similarly, `Staff.csv` at the root should be deleted and gitignored.

---

## 🟢 LOW — Cleanup / Polish

### 17. `public/assets/DatePicker.jsx` — React component in the public static folder

`public/assets/DatePicker.jsx` is a React component sitting in the Vite `public/` directory. Files in `public/` are served as static assets, not compiled by Vite. This component is not importable via the module system and is effectively dead code in its current location.

**Fix:** Move it to `src/components/` or confirm it is unused and delete it.

### 18. `shree-devanagari-714.ttf` duplicated at root

`shree-devanagari-714.ttf` exists at both the root of the project and inside `public/assets/`. The root copy is unreachable by the frontend and serves no purpose.

**Fix:** Delete the root-level copy.

### 19. `docs/` spec files are outdated and partially redundant

`docs/` contains `.txt` and `.docx` pairs of the same documents. The `.txt` files are raw extracted text from the `.docx` files with no formatting. If the `.docx` is the source of truth, the `.txt` copies add nothing and will drift.

**Fix:** Delete the `.txt` duplicates in `docs/`. Keep only the `.docx` files (or move specs to a `docs/` wiki).

---

## Suggested order of execution

1. Fix the three unauthenticated route files (calendar, expenditure, logistics) — **15 minutes, zero risk of regression**
2. Add `authenticateToken` to the two unprotected MIS routes — **5 minutes**
3. Replace PowerShell zip with archiver — **30 minutes, prevents Linux deploy failure**
4. Fix localStorage → `useAuth()` in OfficeNoteManager — **20 minutes**
5. Implement Puppeteer browser singleton — **30 minutes**
6. Fix Prisma type drift + remove raw SQL — **45 minutes**
7. Delete `authfiles/`, `dev.db`, `server/src/generated/`, `mis_files/`, `Staff.csv`, `server/archive/`, `server/tmp/`, root-level debug scripts — **15 minutes of deletes**
8. Centralise multer middleware — **1 hour**
9. Replace inline role guards with existing middleware — **1 hour**
10. Standardise logging — **2 hours**
