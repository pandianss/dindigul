# Dindigul Project — Consolidation & Simplification Prompt

## Context

This is a full-stack Bank Regional Office Portal built with:
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express 5 + Prisma ORM + PostgreSQL
- **Real-time**: Socket.io
- **PDF generation**: Puppeteer + jsPDF
- **i18n**: i18next (English, Tamil, Hindi)

The project currently has 322 files spread across a confusing structure with duplicate files, misplaced files, ad-hoc scripts, and bloated modules. The goal is to consolidate into a clean, maintainable structure without breaking any functionality.

---

## Problem Areas — Diagnose and Fix Each

### 1. Root-Level Junk Files

The following files are sitting at the project root and **do not belong there**. Handle each:

| File | Action |
|------|--------|
| `CONSOLIDATED MONTHLY REPORT LIST (002).docx` | Move to `docs/` or delete if unused |
| `CONSOLIDATED MONTHLY REPORT LIST.doc` | Move to `docs/` or delete if unused |
| `Cleanup_and_Improvements_Prompt.md` | Move to `docs/` or delete |
| `merge_react.cjs` | Evaluate if still needed; if yes, move to `scripts/`, else delete |
| `merge_routes.cjs` | Evaluate if still needed; if yes, move to `scripts/`, else delete |
| `shree-devanagari-714.ttf` | **Duplicate** — same file exists at `public/assets/`. Delete root copy |

**Instruction**: Scan the root directory. Any file that is not a standard config file (`package.json`, `vite.config.ts`, `tsconfig*.json`, `eslint.config.js`, `.gitignore`, `.npmrc`, `index.html`, `README.md`) should be moved to the appropriate subdirectory or deleted.

---

### 2. Misplaced Public Assets

`public/assets/DatePicker.jsx` is a React component file incorrectly placed in the `public/` folder. The `public/` folder is for static assets served as-is (images, fonts, SVGs) — not for source code.

**Action**:
- Move `public/assets/DatePicker.jsx` to `src/components/DatePicker.tsx` (rename to `.tsx`)
- Audit every existing import of this component and update the import path
- Also delete `public/vite.svg` and `src/assets/react.svg` — these are default Vite boilerplate files that have no role in this banking portal

---

### 3. Duplicate Font Files

`public/assets/shree-devanagari-714.ttf` and `shree-devanagari-714.ttf` (root) are the same file.

**Action**:
- Ensure only one copy exists at `public/fonts/shree-devanagari-714.ttf` (consolidate all fonts under `public/fonts/`)
- Move `public/assets/shree-devanagari-714.ttf` → `public/fonts/shree-devanagari-714.ttf`
- Delete the root-level copy
- Search the codebase for all references to this font path and update them

---

### 4. Docs Folder — Duplicate .docx and .txt Pairs

The `docs/` folder contains paired duplicates of the same documents in both `.docx` and `.txt` format:
- `Addendum_Photo_Trilingual_Specification.docx` + `.txt`
- `Bank_Regional_Office_Portal_Build_Prompt.docx` + `.txt`
- `MIS_Business_Snapshot_Specification.docx` + `.txt`
- `docs/extract_text.py` — a Python utility script (wrong location)

**Action**:
- Keep only the `.docx` files (they are the source of truth)
- Delete all `.txt` duplicates in `docs/`
- Move `docs/extract_text.py` → `scripts/extract_text.py` or delete if one-off
- The `scripts/create-oprisk-reference-docx.ps1` at root `scripts/` is fine — keep it

---

### 5. Server Scripts — Separate Dev/Debug Scripts from Seed Scripts

`server/scripts/` contains two kinds of files mixed together:
- **Seed scripts** (needed for setup): `seed-atms.ts`, `seed-branches.ts`, `seed-dashboard.ts`, `seed_achievements.js`, `seed_notices.js`, `seedTemplates.ts` (in src/scripts)
- **One-off debug/check scripts** (ad-hoc, not production): `check_admin.js`, `check_cm_roles.js`, `check_names.js`, `check_notices.js`, `check_seals.js`, `find_ro_cms.js`, `find_signatories.js`, `temp-user.js`, `test-api.js`, `test-auth.js`, `test_add_event.js`

**Action**:
- Create `server/scripts/seed/` and move all seed scripts into it
- Create `server/scripts/debug/` and move all one-off check/test scripts into it (or delete them if they are truly one-time-use)
- There are also two scripts locations: `server/scripts/` and `server/src/scripts/`. Consolidate all scripts under `server/scripts/` and remove `server/src/scripts/` entirely
- Update `package.json` script references accordingly

**Specifically evaluate for deletion** (these appear to be one-off debugging tools):
```
check_admin.js, check_cm_roles.js, check_names.js, check_notices.js,
check_seals.js, find_ro_cms.js, find_signatories.js, temp-user.js,
test-api.js, test-auth.js, test_add_event.js
```

---

### 6. Committed Generated Files — Remove from Version Control

`server/src/generated/client/` contains Prisma auto-generated client code (~15MB+). This should **never** be committed to version control.

**Action**:
- Add `server/src/generated/` to `server/.gitignore` (it should already be, verify)
- Verify `prisma generate` is part of the build/setup process in `package.json`
- Do NOT delete these files from disk (they are needed), just ensure `.gitignore` excludes them

---

### 7. Frontend Source Structure — Flatten and Clarify

Currently the frontend has three parallel layers that serve overlapping purposes:
```
src/components/     ← shared UI components
src/ui/             ← more UI components (charts, chat, dashboards, layout, notes, notice)
src/modules/        ← feature modules
```

The `src/ui/` folder creates confusion — some items there are layout components (Header, Sidebar), some are feature-specific views (ChatPanel, NoticeBoardView).

**Action — Consolidate `src/ui/` into appropriate locations**:

| Current Location | Move To | Reason |
|-----------------|---------|--------|
| `src/ui/layout/Header.tsx` | `src/components/layout/Header.tsx` | Shared layout |
| `src/ui/layout/Sidebar.tsx` | `src/components/layout/Sidebar.tsx` | Shared layout |
| `src/ui/layout/LayoutShell.tsx` | `src/components/layout/LayoutShell.tsx` | Shared layout |
| `src/ui/charts/ChartContainer.tsx` | `src/components/charts/ChartContainer.tsx` | Shared UI |
| `src/ui/chat/ChatPanel.tsx` | `src/modules/Chat/ChatPanel.tsx` | Feature-specific |
| `src/ui/dashboards/` | `src/modules/Dashboard/` | Feature-specific |
| `src/ui/notes/NoteDocument.tsx` | `src/modules/InternalNote/NoteDocument.tsx` | Feature-specific |
| `src/ui/notice/NoticeBoardView.tsx` | `src/modules/NoticeBoard/NoticeBoardView.tsx` | Feature-specific |

After moving, delete the `src/ui/` directory entirely. Update all imports.

---

### 8. Bloated Module Files — Split Monoliths

Several module files are extremely large and contain multiple logical sections that should be separate components:

| File | Size | Problem |
|------|------|---------|
| `src/modules/OfficeNoteManager.tsx` | ~196KB | Massive monolith |
| `src/modules/SettingsManager.tsx` | ~93KB | Too large |
| `src/modules/BusinessSnapshot.tsx` | ~84KB | Too large |
| `src/modules/GuestLanding.tsx` | ~71KB | Too large |
| `src/modules/CampaignSystem.tsx` | ~69KB | Too large |
| `src/modules/CorrespondenceCenter.tsx` | ~70KB | Too large |

**Action for each large module**:
1. Identify the distinct "sections" or "tabs" within each module
2. Extract each section into its own component file within a subfolder
3. Keep a thin orchestrator `index.tsx` in the module folder that composes the pieces

**Example refactor pattern** for `OfficeNoteManager.tsx`:
```
src/modules/OfficeNote/
  index.tsx              ← thin orchestrator (imports and composes below)
  OfficeNoteList.tsx     ← list/table view
  OfficeNoteForm.tsx     ← create/edit form
  OfficeNoteDetail.tsx   ← detail/view page
  OfficeNoteFilters.tsx  ← filter bar
  hooks/
    useOfficeNotes.ts    ← data fetching logic
  types.ts               ← local types
```

Apply the same pattern to each large module. Do not move functionality — only split files.

---

### 9. API Service Layer — Consolidate Fragmented Files

The frontend API layer is split across:
- `src/services/api.ts` — base Axios config
- `src/services/api/notices.ts` — notices-specific
- `src/hooks/api/useNotices.ts` — notices hook
- `src/hooks/usePresentationData.ts` — presentation-specific hook

**Action**:
- Create a consistent pattern: `src/services/api/{feature}.ts` for all API calls
- Create `src/hooks/api/use{Feature}.ts` for all React Query / SWR hooks
- Move `src/services/api/notices.ts` to stay where it is (it's already correct)
- Move `src/hooks/api/useNotices.ts` to stay where it is (correct)
- Move `src/hooks/usePresentationData.ts` → `src/hooks/api/usePresentationData.ts`
- Add `src/services/api/index.ts` that re-exports all API services

---

### 10. Dependency Audit — Frontend `package.json`

Review and flag these dependencies:

```json
"react-is": "^19.2.4"    // Check if anything actually imports from 'react-is'
"@types/recharts": "^1.8.29"  // recharts ships its own types; this may conflict
```

**Action**:
- Search the codebase for `import.*react-is` — if nothing imports it, remove it
- Check if `@types/recharts` conflicts with built-in recharts types; remove if so
- Verify `uuid` is used (both frontend and backend have it — confirm both need it)
- `jspdf-autotable` at `^5.0.7` — verify this version is compatible with `jspdf@^4.2.1`

---

### 11. i18n Locale Files — Verify Completeness

The app supports English, Tamil, and Hindi via `src/i18n/locales/`. Verify that:
- All keys in `en.json` exist in `hi.json` and `ta.json`
- No keys exist in the non-English files that don't exist in `en.json`
- Run: `node -e "const en=require('./src/i18n/locales/en.json'); const hi=require('./src/i18n/locales/hi.json'); const ta=require('./src/i18n/locales/ta.json'); console.log('Missing in hi:', Object.keys(en).filter(k=>!hi[k])); console.log('Missing in ta:', Object.keys(en).filter(k=>!ta[k]));"`

---

### 12. `.gitignore` Audit

Verify the root `.gitignore` excludes:
```
# Generated
server/src/generated/

# Build outputs
dist/
server/dist/

# Env files
.env
server/.env

# OS
.DS_Store
Thumbs.db

# Logs
*.log

# Node
node_modules/
server/node_modules/
```

---

## Final Target Structure

After consolidation, the project should look like:

```
dindigul/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig*.json
├── eslint.config.js
├── .gitignore
├── .npmrc
├── README.md
│
├── docs/                          ← reference docs only (.docx files)
│   ├── Addendum_Photo_Trilingual_Specification.docx
│   ├── Bank_Regional_Office_Portal_Build_Prompt.docx
│   ├── MIS_Business_Snapshot_Specification.docx
│   ├── Operational_Risk_Advisory_Reference.docx
│   └── CONSOLIDATED_MONTHLY_REPORT_LIST.docx
│
├── infrastructure/                ← deployment config
│   ├── ecosystem.config.cjs
│   └── setup-windows.ps1
│
├── scripts/                       ← root-level utility scripts
│   ├── create-oprisk-reference-docx.ps1
│   └── extract_text.py
│
├── public/
│   ├── fonts/                     ← ALL fonts here
│   │   ├── inter-*.ttf
│   │   ├── noto-hindi-*.ttf
│   │   ├── noto-tamil-*.ttf
│   │   └── shree-devanagari-714.ttf
│   └── assets/                    ← SVGs and images only
│       ├── 2025_new_logo.svg
│       ├── Planning Seal.svg
│       ├── dept_seal.png
│       ├── favicon.svg
│       ├── logo_center.svg
│       └── logo_full.svg
│
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── App.css
│   ├── index.css
│   │
│   ├── components/                ← shared, reusable UI only
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── LayoutShell.tsx
│   │   ├── charts/
│   │   │   └── ChartContainer.tsx
│   │   ├── CustomDatePicker.tsx
│   │   ├── DatePicker.tsx         ← moved from public/assets/
│   │   ├── DocumentPreview.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── ExceptionSummary.tsx
│   │   ├── Layout.tsx
│   │   ├── LoginScreen.tsx
│   │   └── ThemeProvider.tsx
│   │
│   ├── modules/                   ← feature modules (split into subfolders)
│   │   ├── OfficeNote/
│   │   │   ├── index.tsx
│   │   │   ├── OfficeNoteList.tsx
│   │   │   ├── OfficeNoteForm.tsx
│   │   │   └── ...
│   │   ├── Dashboard/
│   │   │   ├── index.tsx
│   │   │   ├── BranchDashboard.tsx
│   │   │   ├── RODashboard.tsx
│   │   │   ├── GuestDashboard.tsx
│   │   │   └── DashboardRouter.tsx
│   │   ├── Chat/
│   │   │   └── ChatPanel.tsx
│   │   ├── NoticeBoard/
│   │   │   ├── NoticeBoard.tsx
│   │   │   └── NoticeBoardView.tsx
│   │   ├── InternalNote/
│   │   │   ├── InternalNoteSystem.tsx
│   │   │   └── NoteDocument.tsx
│   │   ├── BusinessSnapshot.tsx   ← split further if time allows
│   │   ├── CampaignSystem.tsx
│   │   ├── CorrespondenceCenter.tsx
│   │   ├── DepartmentManuals.tsx
│   │   ├── ExpenditureManager.tsx
│   │   ├── GuestLanding.tsx
│   │   ├── LetterComposer.tsx
│   │   ├── MagazineGenerator.tsx
│   │   ├── MeetingHub.tsx
│   │   ├── PlanningAnalytics.tsx
│   │   ├── PortalLanding.tsx
│   │   ├── RequestManager.tsx
│   │   ├── ReturnsManager.tsx
│   │   ├── SettingsManager.tsx
│   │   ├── admin/
│   │   │   ├── BudgetUpload.tsx
│   │   │   ├── CalendarManager.tsx
│   │   │   ├── CommandCenter.tsx
│   │   │   ├── MISUpload.tsx
│   │   │   ├── NoticeManager.tsx
│   │   │   ├── OrganizationSettings.tsx
│   │   │   └── ParameterManager.tsx
│   │   └── presentation/
│   │       ├── FullScreenShow.tsx
│   │       ├── PresentationStudio.tsx
│   │       └── SlideComponents.tsx
│   │
│   ├── services/
│   │   ├── api.ts                 ← base Axios instance
│   │   ├── api/
│   │   │   ├── index.ts           ← re-exports all services
│   │   │   ├── notices.ts
│   │   │   └── {other features}.ts
│   │   └── socket.ts
│   │
│   ├── hooks/
│   │   └── api/
│   │       ├── useNotices.ts
│   │       └── usePresentationData.ts
│   │
│   ├── context/
│   │   ├── AuthContext.tsx
│   │   └── SocketContext.tsx
│   │
│   ├── constants/
│   │   └── organization.ts
│   │
│   ├── types/
│   │   ├── calendar.ts
│   │   ├── chat.ts
│   │   ├── dicgc.ts
│   │   ├── global.d.ts
│   │   └── presentation.ts
│   │
│   ├── utils/
│   │   ├── calendar.ts
│   │   ├── cn.ts
│   │   ├── dateUtils.ts
│   │   ├── dicgcPdfGenerator.ts
│   │   └── handleError.ts
│   │
│   └── i18n/
│       ├── config.ts
│       └── locales/
│           ├── en.json
│           ├── hi.json
│           └── ta.json
│
└── server/
    ├── package.json
    ├── tsconfig.json
    ├── prisma.config.ts
    ├── vitest.config.ts
    ├── .env.example
    ├── .gitignore              ← must include src/generated/
    │
    ├── prisma/
    │   ├── schema.prisma
    │   └── migrations/         ← keep all migrations
    │
    ├── scripts/
    │   ├── seed/               ← all seed scripts
    │   │   ├── seed-atms.ts
    │   │   ├── seed-branches.ts
    │   │   ├── seed-dashboard.ts
    │   │   ├── seed_achievements.js
    │   │   ├── seed_notices.js
    │   │   └── seedTemplates.ts
    │   ├── debug/              ← keep only if actively needed
    │   │   └── (evaluate each for deletion)
    │   ├── apply_fixes.ts
    │   └── update_retail_params.ts
    │
    └── src/
        ├── index.ts
        ├── seed.ts
        ├── generated/          ← gitignored, do not commit
        │   └── client/
        ├── lib/
        │   ├── prisma.ts
        │   └── validate.ts
        ├── middleware/
        │   ├── auth.ts
        │   └── upload.ts
        ├── routes/             ← keep as-is
        ├── services/           ← keep as-is
        ├── socket/
        │   └── chatHandler.ts
        ├── templates/          ← keep as-is
        ├── types/              ← keep as-is
        ├── utils/              ← keep as-is
        └── __tests__/          ← keep as-is
```

---

## Step-by-Step Execution Order

Execute in this order to avoid breaking imports mid-refactor:

1. **Delete junk files first** (no imports to worry about): root `.doc`/`.docx`, duplicate font, `public/vite.svg`, `src/assets/react.svg`, all `.txt` docs duplicates
2. **Move misplaced files** (font to `public/fonts/`, DatePicker to `src/components/`)
3. **Update all import paths** after moves (use find+replace)
4. **Consolidate server scripts** (reorganize into `seed/` and `debug/` subfolders)
5. **Move `src/ui/` contents** to `src/components/` and `src/modules/`
6. **Delete `src/ui/`** after all moves complete and imports updated
7. **Split large module files** one at a time; verify app still runs after each
8. **Audit and fix `package.json` dependencies**
9. **Update `.gitignore`** to exclude `server/src/generated/`
10. **Run the i18n completeness check**
11. **Run full TypeScript typecheck**: `npm run typecheck` from root
12. **Run server tests**: `cd server && npm test`

---

## Constraints

- **Do not rename any HTTP API routes** — backend route paths are consumed by the frontend and may be bookmarked
- **Do not rename any Prisma model names or field names** — doing so requires a new migration
- **Do not change the database schema** as part of this consolidation
- **Preserve all working functionality** — this is purely structural cleanup
- **Do not merge the frontend and backend into a monorepo tool** (keep the two `package.json` approach)
- **Preserve all Handlebars templates** in `server/src/templates/` exactly as-is
