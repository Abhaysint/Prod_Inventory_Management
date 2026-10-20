# Frontend Implementation Plan (Steps 1–3)

> Based on verified backend contract at `localhost:8000` and decisions recorded in [AGENTS.md](file:///c:/dev/inventory_management_prod/AGENTS.md).
> Covering **Step 1 (Scaffold)**, **Step 2 (/login)**, and **Step 3 (App Shell)**.

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
