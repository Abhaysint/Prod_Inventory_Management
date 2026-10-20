# AGENTS.md — StockSense Inventory Management

> Workspace rules for AI coding agents (Antigravity, Claude Code, Cursor).
> Read this file completely before the first edit of a session.
> **The backend is BUILT and FROZEN. Your job is the frontend only.**

---

## 1. Golden Rules (non-negotiable)

1. **Never modify backend code.** `app/`, `alembic/`, `requirements.txt`, and
   `docker-compose.yml` are read-only. If the frontend needs something the API does not
   expose, STOP and ask — do not add or edit routes, models, or schemas.
2. **Never invent an endpoint, field name, or enum value.** Before writing any API call,
   read `app/routes/`, `app/schemas.py`, `app/models.py`, or fetch
   `http://localhost:8000/openapi.json`. Observed truth beats assumption.
3. **Types mirror the backend.** Every TypeScript interface must match a Pydantic schema
   in `app/schemas.py` exactly — same field names, same optionality, same enum members.
4. **No secrets in code.** The API base URL lives in `.env` as `VITE_API_BASE_URL`.
   Never commit tokens, passwords, or `.env`.
5. **Small, verifiable steps.** Build one page, run it against the live backend, confirm it
   works, then continue. Never deliver twenty files that have never been executed.
6. **No scope creep.** Build what Section 7 lists, in that order. Anything else: ask first.
7. **Report honestly.** If something is untested or you worked around a blocker, say so
   explicitly. Do not describe unverified code as working.

---

## 2. Project Overview

**StockSense** is an inventory management system for small and mid-size businesses:
products, categories, live stock levels, stock adjustments, and a complete transaction
audit trail, with role-based access control.

| Layer | Technology |
|---|---|
| Backend (frozen) | FastAPI, Python 3.13, async SQLAlchemy, Alembic, PostgreSQL 16 |
| Auth | OAuth2 Bearer + JWT, bcrypt password hashing, RBAC by role |
| Infra | Docker Compose; API at `http://localhost:8000` |
| Frontend (to build) | React 19 + TypeScript + Vite |
| UI | Tailwind CSS v4 + shadcn/ui (Radix primitives) |
| Data fetching | Axios instance + TanStack Query |
| Forms | react-hook-form + zod |
| Routing | React Router v6 |

**Banned UI libraries: Ant Design, Material UI, Bootstrap, Chakra.** shadcn/ui only —
its source is copied into `components/ui` and we own and edit it.

### 2.1 Domain model (verify against `app/models.py`)

```
User        — id, email, username, hashed_password, role, is_active, created_at
Category    — id, name, description, created_at
Product     — id, name, sku, description, category_id → Category,
              unit_price, reorder_level, is_active, created_at, updated_at
Stock       — id, product_id → Product (1:1), quantity_on_hand,
              quantity_reserved, last_counted_at, updated_at
Transaction — id, product_id → Product, transaction_type, quantity,
              reference_doc, notes, created_by, created_at
```

Business invariants the UI must respect:
- Stock is **never** written directly; it changes only via adjustments or transactions.
- A stock adjustment **auto-creates** an `adjustment` transaction server-side. The UI must
  never create that transaction itself — doing so double-counts the audit trail.
- A product is **low stock** when `quantity_on_hand <= reorder_level`.
- Product deletion is a soft delete / deactivation, not a hard delete.

---

## 3. Backend Contract

> ✅ **VERIFIED** on 2026-10-19 against running backend at `localhost:8000`.
> Authority: `main.py` (canonical routes), `app/schemas.py`, `app/models.py`, `app/auth.py`, `app/services.py`.

> ℹ️ **Resolved issue:** Duplicate route registration in `main.py:43` (`app.include_router(router)`)
> shadowed the correct paginated routes and returned 500 on `GET /products` and `GET /categories`.
> Resolved on 2026-10-19 by removing `app.include_router(router)` from `main.py`; `GET /products`
> and `/categories` now return 200 with the full paginated response.

### 3.1 Auth

| Method | Path | Auth | Role | Notes |
|---|---|---|---|---|
| POST | `/auth/register` | None | Any | JSON body `UserCreate`. Returns `UserRead` (201). 409 on duplicate username/email |
| POST | `/auth/login` | None | Any | **`application/x-www-form-urlencoded`** — fields `username` + `password` (uses `OAuth2PasswordRequestForm`). Returns `{ access_token, token_type }` |
| GET | `/auth/me` | Bearer | Any | Returns `UserRead`. ✅ Confirmed exists |

- Send `Authorization: Bearer <token>` on every protected request.
- **Login is form-encoded, not JSON.** Use `URLSearchParams` in the axios call.
- JWT payload: `{ sub: username, role: "admin"|"manager"|"viewer", exp: unix_ts }`.
  Token expires in 60 minutes (configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`).

### 3.2 Products

| Method | Path | Auth | Role | Notes |
|---|---|---|---|---|
| POST | `/products` | Bearer | admin, manager | JSON body `ProductCreate`. Returns `ProductRead` (201). Auto-creates stock row. 409 on duplicate SKU |
| GET | `/products` | Bearer | Any | Paginated: `?page=1&page_size=10` (page min 1, page_size min 1 max 100). Returns `{ total, page, page_size, items: ProductRead[] }` |
| GET | `/products/search` | Bearer | Any | `?name=&sku=&category_id=`. Returns bare `ProductRead[]` (not paginated) |
| GET | `/products/low-stock` | Bearer | Any | Returns bare `LowStockRead[]`: `{ product_id, product_name, sku, quantity_on_hand, reorder_level, shortage }` |
| GET | `/products/{id}` | Bearer | Any | Returns `ProductRead` or 404 |
| PUT | `/products/{id}` | Bearer | admin, manager | JSON body `ProductUpdate` (partial update). Returns `ProductRead` |

- **No `DELETE` endpoint exists (`DELETE /products/{id}` returns 405 Method Not Allowed).** Soft-delete / deactivation must be performed via `PUT /products/{id}` with `{ "is_active": false }`.
- **Paginated vs. Bare Array distinction:**
  - `GET /products` returns a paginated object: `{ total, page, page_size, items: ProductRead[] }`.
  - `GET /products/search` returns a **bare array**: `ProductRead[]` (not paginated).
  - `GET /products/low-stock` returns a **bare array**: `LowStockRead[]` (not paginated).
- **`GET /products` hardcodes active filtering:** It queries `Product.is_active == True` exclusively. There is **no** `is_active` or `include_inactive` query parameter on `GET /products` or `GET /products/search`. Inactive products are completely omitted from list/search results.
- **Client-side join required (No stock or category name embedded):** `ProductRead` contains only `id, name, category_id, sku, description, unit_price, reorder_level, is_active, created_at, updated_at`. It has **no** category name and **no** stock quantity. Frontend must fetch categories via `GET /categories` (to resolve category names) and query `GET /stock/{product_id}` (for stock levels).
- `ProductUpdate` accepts only `name, description, unit_price, reorder_level, is_active`.
  **`category_id` and `sku` cannot be changed after creation.**

### 3.3 Categories

| Method | Path | Auth | Role | Notes |
|---|---|---|---|---|
| POST | `/categories` | Bearer | admin, manager | JSON body `CategoryCreate`. Returns `CategoryRead` (201). 409 on duplicate name |
| GET | `/categories` | Bearer | Any | Paginated: `?page=1&page_size=10`. Returns `{ total, page, page_size, items: CategoryRead[] }` |
| GET | `/categories/{id}` | Bearer | Any | Returns `CategoryRead` or 404 |

- **No PUT or DELETE for categories.** Do not build update/delete buttons.

### 3.4 Stock

| Method | Path | Auth | Role | Notes |
|---|---|---|---|---|
| GET | `/stock/{product_id}` | Bearer | Any | Returns `StockRead`: `{ id, product_id, quantity_on_hand, quantity_reserved, last_counted_at, updated_at }` |
| POST | `/stock/{product_id}/adjust` | Bearer | admin, manager | JSON body `StockAdjustment`: `{ new_quantity, reason?, adjusted_by? }`. Server auto-sets `adjusted_by` from current user. Returns `TransactionRead`. Auto-creates an adjustment transaction |

- `StockRead` has `quantity_reserved` and `last_counted_at` fields not in the original domain model.

### 3.5 Transactions

| Method | Path | Auth | Role | Notes |
|---|---|---|---|---|
| POST | `/transactions` | Bearer | admin, manager | JSON body `TransactionCreate`: `{ product_id, transaction_type, quantity, reference_doc?, notes?, created_by? }`. Server auto-sets `created_by` from current user. Returns `TransactionRead` (201). Automatically updates stock |
| GET | `/transactions/{product_id}` | Bearer | Any | Returns bare `TransactionRead[]` (not paginated) |

- `transaction_type` enum values (lowercase): `"inbound"`, `"outbound"`, `"adjustment"`, `"return"`
- Transaction effects: INBOUND → +qty, OUTBOUND → −qty (400 if insufficient), ADJUSTMENT → set qty, RETURN → +qty
- Stock adjustment via `/stock/{id}/adjust` auto-creates an `adjustment` transaction. Do NOT also create a transaction manually.

### 3.6 Users (undocumented in original)

| Method | Path | Auth | Role | Notes |
|---|---|---|---|---|
| GET | `/users` | Bearer | admin only | Returns bare `UserRead[]` (not paginated) |
| GET | `/users/{user_id}` | Bearer | admin only | Returns `UserRead` or 404 |

### 3.7 Error handling

FastAPI returns `{ "detail": ... }` where `detail` is a **string** for `HTTPException`
and an **array of error objects** for 422 validation failures. Each 422 error object has
`{ loc: (string|int)[], msg: string, type: string, input?: any, ctx?: object }`.
Write one normalizer in `src/lib/errors.ts` that handles both and returns `{ message, fieldErrors }`.

| Status | UI behaviour |
|---|---|
| 400 | toast with detail message (e.g. "Insufficient stock") |
| 401 | clear token, redirect to `/login`, toast "Session expired" |
| 403 | toast "You don't have permission" — **do not** log the user out |
| 404 | page-level empty state |
| 409 | inline conflict message (e.g. duplicate SKU, duplicate category name) |
| 422 | map each `loc` to a field-level form error |
| 5xx | toast + retry affordance |
| network error | offline banner + retry |

### 3.8 Verified Architecture & UI Decisions

1. **Products table joins client-side:** Categories fetched once (`page_size=100`) into an `id → name` Map. Stock fetched via TanStack `useQueries` fanned out over the current page's product IDs only, cached per `['stock', productId]`, with per-cell skeletons. Never sequential, never all products.
2. **Deactivation (not delete):** Performed via `PUT /products/{id}` setting `{ "is_active": false }`. Irreversible in the UI — warn clearly in the `AlertDialog`. No `is_active` column in the table (all returned products are active). Reactivation is out of scope.
3. **ProductFormDialog schemas:** Separate create and update Zod schemas. `sku` and `category_id` are required at creation, but strictly read-only in edit mode.
4. **Products API normalization:** `src/api/products.ts` normalizes paginated list and bare-array search into one shape. Pagination controls are hidden in the UI while a search filter is active.
5. **Transactions scope:** No global transaction listing exists in the API. Dropped standalone `/transactions` page and dashboard recent-transactions widget. Audit trail is strictly per-product at `/transactions/:productId`. Dashboard shows total products, total categories, and the low-stock list.

---

## 4. Frontend Standards

### 4.1 Folder structure (feature-based, not type-based)

```
frontend/
  src/
    api/
      client.ts            axios instance + request/response interceptors
      auth.ts              products.ts  categories.ts  stock.ts  transactions.ts
    types/
      api.ts               interfaces mirroring app/schemas.py
      enums.ts             TransactionType, UserRole — copied from app/models.py
    components/
      ui/                  shadcn primitives (owned source, editable)
      DataTable.tsx  PageHeader.tsx  ConfirmDialog.tsx
      StatCard.tsx  EmptyState.tsx  ErrorState.tsx  TableSkeleton.tsx
    features/
      auth/                LoginPage, AuthContext, ProtectedRoute, useAuth
      dashboard/           DashboardPage, LowStockAlert, StatCards
      products/            ProductsPage, ProductFormDialog, useProducts
      categories/          CategoriesPage, CategoryFormDialog, useCategories
      stock/               StockAdjustmentPage, useAdjustStock
      transactions/        ProductTransactionsPage, TransactionFormDialog, useTransactions
    hooks/                 useDebounce, usePagination
    layouts/               AppShell (sidebar + header + outlet)
    lib/                   utils.ts (cn), format.ts, errors.ts, queryKeys.ts
    routes/                router.tsx
```

A feature owns its pages, components, hooks, and queries. Shared code is promoted to
`frontend/src/components/` or `frontend/src/lib/` only when a second feature actually needs it.

### 4.2 Hard rules

- `strict: true` in `tsconfig.json`. **No `any`.** Unparsed API data is `unknown`.
- **No raw `fetch` or `axios` calls inside components.** Only `src/api/*` touches the network.
- Every list/detail view ships **three states**: loading skeleton, empty state, error state.
  All three, every time, no exceptions.
- Every destructive action goes through shadcn `AlertDialog` confirmation.
- Every mutation invalidates the right query keys and fires a success/error toast.
- Forms use `react-hook-form` + `zod`, and the zod schema encodes the backend's own rules
  (`unit_price > 0`, `sku` required, `quantity` integer ≥ 0) so users see errors before
  the request leaves the browser.
- All currency and date rendering goes through `src/lib/format.ts`. No inline `toFixed`
  or `toLocaleDateString` scattered across components.
- Query keys are centralized in `src/lib/queryKeys.ts`. No inline string arrays.
- Accessibility: labelled inputs, keyboard-navigable tables and dialogs, visible focus
  rings, `aria-live` on toasts. Radix gives you most of this — don't break it.
- Responsive: usable at 375px. Tables get horizontal scroll or a card layout on mobile;
  the sidebar collapses to a sheet.

### 4.3 State management

| Kind of state | Tool |
|---|---|
| Server data | TanStack Query — keys like `['products', { page, search }]` |
| Auth / session | `AuthContext` + token in `localStorage` |
| Ephemeral UI (dialog open, draft input) | local `useState` |
| Genuinely shared UI state | Zustand, only if a real need appears |

**No Redux. No global store for server data.** TanStack Query is the server cache.

### 4.4 Auth implementation

- Token in `localStorage` under a single constant key.
- Axios **request** interceptor attaches `Authorization: Bearer <token>`.
- Axios **response** interceptor: on 401 → clear token, clear query cache, redirect to
  `/login`. Guard against redirect loops when the failing request *is* the login call.
- `ProtectedRoute` checks the token before rendering and preserves the attempted path so
  the user lands where they intended after logging in.
- Role gating hides create/edit/delete controls the backend would reject — **and** the app
  still handles 403 gracefully. UI gating is UX, never security.

### 4.5 Design System & Theme: Arctic Frost (Locked)

The frontend theme is locked to **Arctic Frost** from `.agents/skills/theme-factory/themes/arctic-frost.md` with explicit high-contrast semantic tokens:
- **Palette tokens**: Ice Blue (`#d4e4f7`), Steel Blue (`#4a6fa5`), Silver (`#c0c0c0`), Crisp White (`#fafafa`)
- **Background**: `#f8fafc` (Light) / `#0b1118` (Dark)
- **Foreground**: `#0f172a` (Light) / `#f1f5f9` (Dark)
- **Card**: `#ffffff` (Light) / `#111b27` (Dark)
- **Border**: `#cbd5e1` (Slate-300 — high contrast for dense inventory table rows)
- **Muted / Muted-Foreground**: `#eef2f6` / `#475569` (Slate-600 — 5.8:1 contrast ratio against background for table secondary metadata, SKU labels, and headers)
- **Primary**: `#4a6fa5` (Steel Blue — signature Arctic Frost accent)
- **Warning**: `#d97706` (Amber-600 — warm amber, visually distinct from steel blue; badge bg: `#fef3c7`, text: `#92400e`)
- **Destructive**: `#dc2626` (Red-600 — crisp red, visually distinct from steel blue and amber; badge bg: `#fee2e2`, text: `#991b1b`)

---

## 5. Agent Workflow

1. **Explore.** Read `app/routes/`, `app/schemas.py`, `app/models.py`. Summarize the real
   contract back to me, including pagination shape, login content-type, and enum values.
   Correct Section 3 of this file with what you found.
2. **Plan.** Write `docs/frontend-plan.md`: files to create per step, in order. Wait for approval.
3. **Implement.** One page per step. Run `cd frontend && npm run dev` with the backend up and exercise it.
4. **Verify.** `cd frontend && npx tsc --noEmit` clean, `cd frontend && npm run build` clean, page exercised in a browser
   against real data, 401/403/422 paths checked.
5. **Report.** What works, what is unverified, what the backend blocks.

### Commands

```bash
docker compose up -d            # backend + postgres (services: app, db)
docker compose logs -f app      # backend logs
cd frontend && npm run dev      # frontend dev server
cd frontend && npx tsc --noEmit # must pass before "done"
cd frontend && npm run build    # must pass before "done"
cd frontend && npm run lint     # must pass before "done"
```

### Definition of done (per page)

Compiles · type-checks · lints · renders loading/empty/error states · performs its real
API call successfully against the running backend · handles 401, 403, and 422 · usable at
375px width · keyboard navigable.

---

## 6. Skills

Skills live in `.agents/skills/<skill-name>/SKILL.md` with YAML frontmatter (`name`,
`description`). Prefer a relevant skill's protocol over improvising.

### Installed (P0 — install before starting)

| Skill | Use when |
|---|---|
| `frontend-design` | building or restyling any UI surface — raises default output quality and prevents generic layouts |
| `webapp-testing` | before declaring any page done — drives the running app in a browser and reports real failures |
| `theme-factory` | once at the start, to lock the Tailwind + shadcn theme tokens so pages don't drift |
| `stocksense-api` | verified endpoint contract, enums, payload shapes, and error formats — prevents route hallucination |

### Planned (P1 — add at the feature)

| Skill | Use when |
|---|---|
| `xlsx` | implementing inventory / transaction export to spreadsheet |
| `pdf` | implementing printable low-stock reports and adjustment slips |

### Deferred (P2)

`brand-guidelines` (if StockSense gets real branding) · `mcp-builder` (if StockSense is
later exposed to external agents over MCP).

### Explicitly not used

`docx`, `doc-coauthoring`, `canvas-design`, `web-artifacts-builder`, `algorithmic-art`,
`slack-gif-creator`, `internal-comms`, `academy-guide`, `discernment-nudge`, `claude-api`
— unrelated to an internal inventory dashboard built as a real Vite app.

### Install

```bash
git clone https://github.com/anthropics/skills.git /tmp/skills
mkdir -p .agents/skills
cp -r /tmp/skills/skills/frontend-design .agents/skills/
cp -r /tmp/skills/skills/webapp-testing  .agents/skills/
cp -r /tmp/skills/skills/theme-factory   .agents/skills/
```

The agent sees each skill's `name` + `description` at conversation start and loads the full
`SKILL.md` when it judges the skill relevant. If a skill isn't firing, sharpen its
`description` rather than repeating its instructions in chat.

---

## 7. Build Order

1. **Project scaffold** — Vite + React + TS, Tailwind v4, shadcn init, router, axios
   client, `.env`, folder structure, theme tokens.
2. **`/login`** — form-encoded POST with username + password (already verified; no need to
   re-check content-type), token storage, redirect, error display.
3. **App shell** — sidebar nav, header, user menu, logout, `ProtectedRoute`, 401 interceptor.
4. **`/products`** — table: name, SKU, category name (from the id→name Map), unit price, stock
   (useQueries per visible row, per-cell skeleton). Search + category filter (pagination
   hidden while searching), pagination, create/edit dialog with separate zod schemas
   (sku + category_id read-only on edit), and a Deactivate action via
   PUT { is_active: false } with an AlertDialog warning it cannot be undone in the UI.
   No status column.
5. **`/categories`** — table + create dialog only (no PUT/DELETE exists).
6. **`/` dashboard** — stat cards (total products, categories, low-stock count) and the
   low-stock list from GET /products/low-stock. No recent-transactions widget.
7. **`/stock-adjustment`** — product picker, current quantity, new quantity, computed delta,
   required reason, submit; invalidate ['stock', id] and ['transactions', id] on success.
8. **`/transactions/:productId`** — per-product audit trail, type filter, add-transaction
   dialog. No standalone /transactions route.
9. **Polish** — empty states everywhere, mobile pass, a11y pass, toast consistency.

Each step must be verified and reported before the next begins.

---

## 8. Out of Scope — do not build unprompted

Multi-warehouse, barcode scanning, purchase orders, supplier management, i18n, real-time
websockets, mobile app, payments, email notifications, analytics charts beyond the
dashboard cards, user management UI, product reactivation.

Ask first. Every time.
