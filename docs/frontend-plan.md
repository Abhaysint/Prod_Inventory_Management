# Frontend Implementation Plan (Steps 1–10)

> Based on verified backend contract at `localhost:8000` and decisions recorded in [AGENTS.md](file:///c:/dev/inventory_management_prod/AGENTS.md).
> Covering **Steps 1–9 (Core Application & Polish — Completed)** and **Step 10 (Pre-Deployment Environment, API Variable Hardening & Secret Hygiene)**.

### Plan Amendments & User Corrections
1. **Login Zod Schema**: Required/non-empty strings only (`.trim().min(1)` for username, `.min(1)` for password). Min-3 and min-8 rules are removed as they are registration validation rules that block valid credentials.
2. **Role Enum Verification**: Confirmed against `app/models.py:67-70`. Actual values are strictly quoted: `"admin"`, `"manager"`, `"viewer"` (`UserRole.ADMIN = "admin"`, `UserRole.MANAGER = "manager"`, `UserRole.VIEWER = "viewer"`).
3. **Tailwind v4 Path**: `@tailwindcss/vite` plugin, CSS-first `@theme` in `index.css`, zero `tailwind.config.js`, shadcn init in Tailwind-v4 mode, pinned React 19 (`^19.0.0`).
4. **QueryClientProvider & Config in Step 1**: Configured in Step 1 with explicit defaults (`staleTime: 60 * 1000`, `retry: 1`, `refetchOnWindowFocus: false`, and long staleTime `staleTime: 60 * 60 * 1000` for categories). `.env.example` committed, `.env.local` gitignored.

---

## Architecture Overview

```
Frontend Stack:
- Vite + React 19 + TypeScript (strict: true)
- Styling: Tailwind CSS v4 + custom CSS variable tokens + shadcn/ui primitives
- Routing: React Router v6
- Server State: TanStack Query v5 (cache keys centralized in queryKeys.ts)
- Forms: react-hook-form + zod
- HTTP Client: Axios with URLSearchParams for auth and Bearer token interceptor
- Icons: lucide-react
```

---

## Step 1: Project Scaffold

### Objective
Create a clean, strictly-typed Vite + React 19 + TypeScript foundation in `frontend/` with Tailwind CSS v4 (@tailwindcss/vite with CSS-first @theme in index.css, no tailwind.config.js), theme tokens from theme-factory (Arctic Frost palette with high-contrast table borders and semantic warning/destructive tokens), path aliases, Axios HTTP client, centralized query keys, QueryClientProvider with explicit defaults, error normalizer, format utilities, and shadcn/ui primitives.

### Files to Create / Configure

```
frontend/
  .env
  .env.example
  .gitignore
  package.json
  vite.config.ts
  tsconfig.json
  tsconfig.app.json
  tsconfig.node.json
  eslint.config.js
  index.html
  src/
    index.css
    main.tsx
    App.tsx
    types/
      enums.ts
      api.ts
    lib/
      utils.ts
      format.ts
      errors.ts
      queryKeys.ts
      queryClient.ts
    api/
      client.ts
    components/
      ui/
        button.tsx
        input.tsx
        label.tsx
        card.tsx
        skeleton.tsx
        toast.tsx
        toaster.tsx
        use-toast.ts
        dropdown-menu.tsx
        separator.tsx
        alert-dialog.tsx
```

### Detailed File Specifications

1. **`package.json`**:
   - Pinned React 19: `"react": "^19.0.0"`, `"react-dom": "^19.0.0"`.
   - Core dependencies: `react-router-dom`, `@tanstack/react-query`, `axios`, `zod`, `react-hook-form`, `@hookform/resolvers`, `lucide-react`, `clsx`, `tailwind-merge`, `class-variance-authority`, `@radix-ui/react-slot`, `@radix-ui/react-label`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-separator`, `@radix-ui/react-toast`, `@radix-ui/react-alert-dialog`.
   - Tailwind v4 DevDependencies: `@tailwindcss/vite`, `tailwindcss` (v4), `typescript`, `vite`, `@vitejs/plugin-react`, `@types/react`, `@types/react-dom`, `@types/node`, `eslint`.
   - Scripts: `dev`, `build`, `lint`, `preview`.
2. **`vite.config.ts`**:
   - Plugins: `@vitejs/plugin-react()`, `@tailwindcss/vite()`.
   - Resolve alias: `@` pointing to `src/`.
   - Server: port 5173, strictPort: true.
3. **`tsconfig.json` & `tsconfig.app.json`**:
   - `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`, `noFallthroughCasesInSwitch: true`.
   - Paths: `"@/*": ["./src/*"]`.
4. **`.env` & `.env.example`**:
   - `VITE_API_BASE_URL=http://localhost:8000`
   - Gitignore `.env.local` and `.env`, commit `.env.example`.
5. **`src/index.css` (Tailwind v4 CSS-First `@theme`)**:
   - `@import "tailwindcss";`
   - `@theme` block defining theme tokens aligned with theme-factory (Arctic Frost: Ice Blue `#d4e4f7`, Steel Blue `#4a6fa5`, Silver `#c0c0c0`, Crisp White `#fafafa`; semantic additions: high-contrast table border `#cbd5e1`, muted-foreground `#475569`, warning `#d97706`, destructive `#dc2626`).
   - Root CSS variables for shadcn primitives (`--background`, `--foreground`, `--primary`, `--muted`, `--border`, `--radius`).
   - No `tailwind.config.js` file (pure CSS-first Tailwind v4).
6. **QueryClientProvider with Explicit Defaults**:
   - Configured in `src/App.tsx` or `src/lib/queryClient.ts`:
     - Global default: `staleTime: 60 * 1000` (1 minute), `retry: 1`, `refetchOnWindowFocus: false`.
     - Explicit default for categories: `staleTime: 60 * 60 * 1000` (1 hour / long cache per Section 3.8 since categories are fetched once for id→name resolution and rarely change).
7. **`src/types/enums.ts`**:
   - `UserRole`: `"admin" | "manager" | "viewer"` (quoted from `app/models.py`).
   - `TransactionType`: `"inbound" | "outbound" | "adjustment" | "return"`.
8. **`src/types/api.ts`**:
   - Exact mirrors of Pydantic schemas: `UserRead`, `CategoryRead`, `ProductRead`, `StockRead`, `TransactionRead`, `LowStockRead`, `PaginatedResponse<T>`, `Token`.
9. **`src/lib/utils.ts`**:
   - `cn(...inputs)` using `clsx` and `tailwind-merge`.
10. **`src/lib/format.ts`**:
    - `formatCurrency(amount: number): string`
    - `formatDateTime(dateStr: string): string`
    - `formatDate(dateStr: string): string`
    - `formatNumber(val: number): string`
11. **`src/lib/errors.ts`**:
    - `normalizeApiError(error: unknown): { message: string; fieldErrors: Record<string, string> }`
12. **`src/lib/queryKeys.ts`**:
    - Centralized query keys: `auth`, `products`, `categories`, `stock`, `transactions`.
13. **`src/api/client.ts`**:
    - Axios instance with base URL `VITE_API_BASE_URL`.
    - Request interceptor: reads token from `localStorage.getItem('stocksense_token')`, attaches `Authorization: Bearer <token>`.
    - Response interceptor: on 401, clears token, redirects to `/login` (safely guards against redirect loops if request is `/auth/login`).
14. **`src/components/ui/*`**:
    - shadcn/ui primitives formatted for Tailwind v4.

### Verification Checklist
- [ ] `npm install` completes with zero dependency conflicts.
- [ ] `npx tsc --noEmit` passes with zero errors.
- [ ] `npm run build` generates production bundle cleanly.
- [ ] `npm run lint` passes cleanly.

---

## Step 2: `/login`

### Objective
Implement authentication with client-side validation, form-encoded payload submission, error normalizer integration, JWT storage, role caching, and automatic redirect handling.

### Files to Create / Configure

```
src/
  api/
    auth.ts
  features/
    auth/
      AuthContext.tsx
      useAuth.ts
      loginSchema.ts
      LoginPage.tsx
  routes/
    router.tsx
  App.tsx
```

### Detailed File Specifications

1. **`src/api/auth.ts`**:
   - `loginApi(credentials: LoginCredentials): Promise<Token>`
     - Form-encoded payload via `new URLSearchParams({ username, password })`.
     - Header: `Content-Type: application/x-www-form-urlencoded`.
   - `getMeApi(): Promise<UserRead>`
     - `GET /auth/me` with Bearer token.
2. **`src/features/auth/loginSchema.ts`**:
   - Zod schema: **non-empty / required only**.
     ```typescript
     export const loginSchema = z.object({
       username: z.string().trim().min(1, "Username is required"),
       password: z.string().min(1, "Password is required"),
     });
     ```
     *(Note: Min-3 and min-8 rules are registration rules only and must NOT be used here to avoid locking out existing credentials).*
3. **`src/features/auth/AuthContext.tsx` & `src/features/auth/useAuth.ts`**:
   - State: `token: string | null`, `user: UserRead | null`, `isLoading: boolean`.
   - Functions: `login()`, `logout()`.
4. **`src/features/auth/LoginPage.tsx`**:
   - Form fields: Username and Password.
   - Inline field errors below inputs via `react-hook-form` + `zodResolver`.
   - Submission state spinner.
   - 401 alert banner ("Incorrect username or password").
   - Redirect to `location.state.from` or `/`.

### Verification Checklist
- [ ] Form validates username and password as non-empty client-side.
- [ ] Network request is sent as `application/x-www-form-urlencoded`.
- [ ] Login with test credentials (`explorer` / `testpass123`) returns 200 and stores token.
- [ ] Bad credentials displays inline/alert message without crashing.
- [ ] User is redirected upon successful authentication.

---

## Step 3: App Shell

### Objective
Build the responsive application frame: collapsible sidebar with active route indicator, top navigation header with breadcrumbs and live user menu (verified role badge, profile, logout), `ProtectedRoute` with path memory, and global empty/error state primitives.

### User Role Enum Verification (from `app/models.py:67-70`)
```python
class UserRole(str, enum.Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    VIEWER = "viewer"
```
The UserMenu badge must handle exact quoted values:
- `"admin"`: Purple/Indigo badge
- `"manager"`: Blue/Sky badge
- `"viewer"`: Slate/Zinc badge

### Files to Create / Configure

```
src/
  features/
    auth/
      ProtectedRoute.tsx
  layouts/
    AppShell.tsx
    Sidebar.tsx
    Header.tsx
    UserMenu.tsx
  components/
    PageHeader.tsx
    EmptyState.tsx
    ErrorState.tsx
    TableSkeleton.tsx
    ConfirmDialog.tsx
  routes/
    router.tsx
  features/
    dashboard/
      DashboardPage.tsx       (placeholder)
    products/
      ProductsPage.tsx        (placeholder)
    categories/
      CategoriesPage.tsx      (placeholder)
    stock/
      StockAdjustmentPage.tsx (placeholder)
    transactions/
      ProductTransactionsPage.tsx (placeholder)
```

### Detailed File Specifications

1. **`src/features/auth/ProtectedRoute.tsx`**:
   - Wraps protected layout.
   - While `isLoading` is true, displays full-page loading skeleton.
   - If `!isAuthenticated`, returns `<Navigate to="/login" state={{ from: location }} replace />`.
   - If authenticated, renders `<Outlet />`.
2. **`src/layouts/Sidebar.tsx`**:
   - StockSense logo and branding.
   - Navigation items:
     - Dashboard (`/`) — Icon: `LayoutDashboard`
     - Products (`/products`) — Icon: `Package`
     - Categories (`/categories`) — Icon: `FolderTree`
     - Stock Adjustment (`/stock-adjustment`) — Icon: `SlidersHorizontal`
   - Active route styling: subtle background highlight, accent indicator.
   - Responsive behavior: desktop fixed sidebar; mobile drawer/sheet toggled via state.
3. **`src/layouts/Header.tsx`**:
   - Mobile menu trigger toggle button (`Menu` icon).
   - Breadcrumb / current section title.
   - Right section: environment badge ("Live API"), UserMenu dropdown.
4. **`src/layouts/UserMenu.tsx`**:
   - Displays avatar with initials.
   - Username and email.
   - Role badge with semantic styling:
     - `admin`: purple/indigo badge
     - `manager`: blue/sky badge
     - `viewer`: slate/zinc badge
   - Logout button: triggers `logout()` and redirects to `/login`.
5. **`src/layouts/AppShell.tsx`**:
   - Master layout structuring `Sidebar`, `Header`, and main content area `<Outlet />`.
   - Content container with consistent max-width, responsive padding (`p-4 md:p-6 lg:p-8`).
6. **Shared feedback components**:
   - `src/components/PageHeader.tsx`: Title (`h1`), description, optional action buttons slot.
   - `src/components/EmptyState.tsx`: Lucide icon, heading, description, optional action button.
   - `src/components/ErrorState.tsx`: Error icon, message, retry button callback.
   - `src/components/TableSkeleton.tsx`: Configurable rows and columns for table loading states.
   - `src/components/ConfirmDialog.tsx`: Modal dialog built on Radix `AlertDialog` for dangerous actions (e.g. irreversible product deactivation).
7. **`src/routes/router.tsx`**:
   - Configures route tree:
     ```
     /login -> LoginPage
     / (wrapped with ProtectedRoute + AppShell)
       ├── / (index) -> DashboardPage (placeholder)
       ├── /products -> ProductsPage (placeholder)
       ├── /categories -> CategoriesPage (placeholder)
       ├── /stock-adjustment -> StockAdjustmentPage (placeholder)
       └── /transactions/:productId -> ProductTransactionsPage (placeholder)
     ```

### Verification Checklist
- [ ] Attempting to navigate directly to `/` when logged out redirects to `/login?from=/`.
- [ ] Logging in redirects back to `/`.
- [ ] Header displays current username and role badge.
- [ ] Clicking "Sign out" removes token, clears cache, and routes to `/login`.
- [ ] Navigation links update active state and navigate between placeholder pages.
- [ ] 401 response from any API automatically redirects to `/login`.
- [ ] Responsive pass: sidebar collapses on viewports < 768px with functional mobile drawer toggle.
- [ ] `npx tsc --noEmit` and `npm run build` pass cleanly.

---

## Steps 4–9: Core Feature Pages & Polish (Completed Summary)

- **Step 4 (`/products`)**: Client-side category join (`id -> name` Map) + per-row stock queries (`useQueries`), search & category filter (hiding pagination when active), create/edit modal with separate Zod schemas (`sku` and `category_id` immutable on edit), and soft deactivation (`PUT /products/{id}` with `{ is_active: false }`).
- **Step 5 (`/categories`)**: Paginated categories table + create dialog with client-side case-insensitive duplicate check and `409`/`500` unique constraint mapping (`"A category with this name already exists"`).
- **Step 6 (`/` Dashboard)**: KPI stat cards (Total Active Products, Categories, Low Stock Items) + sorted low-stock alert table with `Out` / `Low` semantic badges and direct action links.
- **Step 7 (`/stock-adjustment`)**: Product selector synced with `?productId=`, live stock summary card, real-time delta badge ($\Delta = \text{new} - \text{current}$), reason presets, and multi-key cache invalidation.
- **Step 8 (`/transactions/:productId`)**: Per-product chronological audit trail, transaction type filter, and Record Transaction modal with client-side outbound overdraft guard (`quantity > currentStock`).
- **Step 9 (Polish, Mobile 375px Fix & Accessibility Pass)**: Fixed `.sr-only` absolute positioning overflow on tables (`relative overflow-x-auto`), mobile navigation drawer header alignment, semantic `<main>` and `<h1>` landmarks on `/login`, accessible filter labels, and verified `scrollWidth === 375px` across all routes.

---

## Step 10: Pre-Deployment Environment, API Variable Hardening & Secret Hygiene

### Objective
Prepare the StockSense repository for production deployment by eliminating hardcoded API URLs from compiled production bundles, centralizing and sanitizing all environment variables, ensuring no `.env` or secret files can ever be committed to GitHub, and adding SPA routing rewrite rules so deep links (`/products`, `/transactions/:productId`) never 404 on static hosts (Vercel, Netlify, Render, Cloudflare Pages).

---

### Pre-Deployment Audit Findings (Current Risks to Fix)

1. **Gitignore Gap in `frontend/.gitignore` and Root `.gitignore`**:
   - `frontend/.gitignore` currently ignores **only** `.env.local`. If `.env.production`, `.env.staging`, or `.env.development.local` is created during deployment setup, Git will track and push it to GitHub.
   - Root `.gitignore` ignores `.env` only, missing `.env.*` variants.
2. **Hardcoded `http://localhost:8000` Fallback in `frontend/src/api/client.ts`**:
   - Line 15 currently sets `baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"`.
   - **Risk 1 (Silent Production Misconfiguration)**: If `VITE_API_BASE_URL` is forgotten in the hosting platform's environment settings, the production bundle silently calls `http://localhost:8000` inside visitors' browsers instead of failing fast with a clear configuration message.
   - **Risk 2 (Trailing Slash Double-Slash Bug)**: If a deployment environment sets `VITE_API_BASE_URL=https://api.example.com/` (with a trailing slash), Axios requests to `/products` resolve to `https://api.example.com//products`, triggering `307 Temporary Redirect` or CORS preflight failures behind reverse proxies.
3. **SPA Deep-Link Refresh 404s on Production Static Hosts**:
   - React Router (`createBrowserRouter`) handles `/login`, `/products`, `/categories`, `/stock-adjustment`, and `/transactions/:productId` client-side. Without host rewrite config (`public/_redirects` and `vercel.json`), refreshing the browser on `/products` in production returns an HTTP 404 from the CDN.

---

### Broken-Down Implementation Plan (Sub-Steps 10.1 – 10.6)

#### Sub-Step 10.1: Harden `.gitignore` Files & Verify Git Index Hygiene
- **Files to Modify**:
  - `.gitignore` (root)
  - `frontend/.gitignore`
- **Changes**:
  - Ignore every `.env` variant across both root and `frontend/`:
    ```gitignore
    # Environment variables & secrets (never commit)
    .env
    .env.*
    !.env.example
    ```
  - Explicitly keep `!.env.example` tracked so collaborators and deployment guides know which variables are required without exposing real URLs or credentials.
- **Check**:
  - Run `git ls-files "*env*"` and verify only `alembic/env.py`, `frontend/.env.example`, and `frontend/src/vite-env.d.ts` are tracked.
  - Run `git status --ignored` to confirm `frontend/.env` and any `.env.production` files are strictly ignored.

#### Sub-Step 10.2: Create Centralized Environment Module (`frontend/src/lib/env.ts`)
- **Files to Create / Modify**:
  - `frontend/src/lib/env.ts` (new)
  - `frontend/src/vite-env.d.ts` (update typing)
- **Specifications**:
  - Create a single, strictly typed `env.ts` module that reads, validates, and normalizes `import.meta.env`:
    1. **Sanitize Trailing Slashes**: Strip trailing slashes (`.trim().replace(/\/+$/, "")`) from `VITE_API_BASE_URL` so `https://api.stocksense.com/` and `https://api.stocksense.com` work identically without double-slash route bugs.
    2. **Environment-Aware Fallback**:
       - In development (`import.meta.env.DEV === true`), default to `http://localhost:8000` if `VITE_API_BASE_URL` is unset so local development works out of the box.
       - In production (`import.meta.env.PROD === true`), require `VITE_API_BASE_URL` to be provided at build time (or support relative `/api` reverse-proxy path if configured) and log an explicit diagnostic error if missing, ensuring `http://localhost:8000` is never used in production.
    3. **Export Immutable `ENV` Object**:
       - `ENV.API_BASE_URL`: normalized base URL string
       - `ENV.IS_PROD`: boolean
       - `ENV.IS_DEV`: boolean
       - `ENV.MODE`: string

#### Sub-Step 10.3: Decouple `apiClient` & Centralize API Endpoints
- **Files to Modify**:
  - `frontend/src/api/client.ts`
  - `frontend/src/api/endpoints.ts` (new — centralized endpoint path constants)
  - `frontend/src/api/auth.ts`
  - `frontend/src/api/products.ts`
  - `frontend/src/api/categories.ts`
  - `frontend/src/api/stock.ts`
  - `frontend/src/api/transactions.ts`
- **Specifications**:
  - Replace `import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"` in `frontend/src/api/client.ts` with `ENV.API_BASE_URL` from `@/lib/env`.
  - Create `frontend/src/api/endpoints.ts` exporting `API_ENDPOINTS`:
    ```ts
    export const API_ENDPOINTS = {
      auth: {
        login: "/auth/login",
        me: "/auth/me",
      },
      products: {
        root: "/products",
        search: "/products/search",
        lowStock: "/products/low-stock",
        byId: (id: number) => `/products/${id}`,
      },
      categories: {
        root: "/categories",
        byId: (id: number) => `/categories/${id}`,
      },
      stock: {
        byProduct: (productId: number) => `/stock/${productId}`,
        adjust: (productId: number) => `/stock/${productId}/adjust`,
      },
      transactions: {
        root: "/transactions",
        byProduct: (productId: number) => `/transactions/${productId}`,
      },
    } as const;
    ```
  - Update `auth.ts`, `products.ts`, `categories.ts`, `stock.ts`, and `transactions.ts` to reference `API_ENDPOINTS` so not a single URL path or host string is hardcoded across API modules or components.

#### Sub-Step 10.4: Update `.env.example` Template for Deployment Clarity
- **Files to Modify**:
  - `frontend/.env.example`
- **Specifications**:
  - Document required build-time variables clearly with examples for local development and cloud production, reminding developers that `VITE_*` variables are embedded at build time and must never contain private secrets:
    ```dotenv
    # Base URL for the StockSense FastAPI backend (no trailing slash)
    # Local development: http://localhost:8000
    # Production example: https://stocksense-api.yourdomain.com
    VITE_API_BASE_URL=http://localhost:8000
    ```

#### Sub-Step 10.5: Add Production SPA Routing Rewrite Configs
- **Files to Create**:
  - `frontend/public/_redirects` (for Netlify, Render Static Sites, Cloudflare Pages)
  - `frontend/vercel.json` (for Vercel deployments)
- **Specifications**:
  - `frontend/public/_redirects`:
    ```text
    /*    /index.html   200
    ```
  - `frontend/vercel.json`:
    ```json
    {
      "rewrites": [
        { "source": "/(.*)", "destination": "/index.html" }
      ]
    }
    ```

#### Sub-Step 10.6: Verification & Bundle Audit Checklist
- [ ] **Git Leak Check**: `git status --ignored` and `git ls-files` confirm `.env`, `.env.local`, and `.env.production` are untracked and ignored.
- [ ] **Source Code Hardcode Scan**: Search all files in `frontend/src/` for `http://`, `https://`, and `localhost` — only `frontend/src/lib/env.ts` (dev-only fallback) may reference `localhost:8000`.
- [ ] **Production Bundle Inspection**: Run `VITE_API_BASE_URL=https://api.stocksense.example.com npm run build` and search `frontend/dist/assets/*.js` to verify `https://api.stocksense.example.com` is injected and `localhost:8000` is completely absent from the production bundle.
- [ ] **Type-Check, Lint & Build**:
  - `cd frontend && npx tsc -b` passes with 0 errors.
  - `cd frontend && npm run lint` passes with 0 errors and 0 warnings.
  - `cd frontend && npm run build` succeeds cleanly.

