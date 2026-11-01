# StockSense Phase 2 Plan (`plan.md`)
## Multi-Warehouse Smart Order Routing (Speed + Stock + Expiry/FEFO) & Free Low-Stock Email Alerts

> **Designed for Small / Fast Models (e.g., Gemini Flash / Flash-Lite)**
> - Every micro-step modifies **1 file (maximum 2)** and is under **100 lines of code**.
> - Exact column names, Pydantic schemas, TypeScript interfaces, and route paths are pre-specified below — **never invent field names**.
> - Existing v1 endpoints (`/products`, `/categories`, `/stock`, `/transactions`) remain **100% backward-compatible**. `Stock.quantity_on_hand` stays synchronized with warehouse batches.
> - **100% Free Stack**: Uses pure-math Haversine distance + preset city coordinates (zero paid map APIs) and Python's built-in `smtplib` with Gmail SMTP App Password / Resend free tier (plus safe log fallback when SMTP env vars are unset).

---

## Architecture & Decision Flow

```
Admin selects Product + Qty + Destination City (e.g. "Atlanta, GA")
                                │
                                ▼
               POST /warehouses/smart-route
                                │
   ┌────────────────────────────┼────────────────────────────┐
   ▼                            ▼                            ▼
1. Stock Filter          2. Delivery Speed            3. Expiry / FEFO
Does Warehouse have      Haversine distance (km)      Earliest batch expiry_date
available_stock >= qty?  & est. transit days          (prioritizes batches expiring
                                                       <= 30 days to prevent waste)
   └────────────────────────────┼────────────────────────────┘
                                ▼
        Returns Ranked Warehouses + Plain-English Reason Badge
                                │
                                ▼
               POST /warehouses/fulfill-dispatch
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
Deducts StockBatch.qty   Syncs Stock.quantity_on_hand   If stock <= reorder_level:
in selected Warehouse    & logs OUTBOUND Transaction    Sends Free Low-Stock Email
                                                        to Admin + returns alert status
```

---

## Micro-Step Progress Tracker

### Part A — Backend Database & Models (Steps 11.1 – 11.4)
- [ ] **Step 11.1**: Add `Warehouse` and `StockBatch` SQLAlchemy models in [`app/models.py`](file:///c:/dev/inventory_management_prod/app/models.py)
- [ ] **Step 11.2**: Create Alembic migration [`alembic/versions/8c4e91a2b3d4_add_warehouses_and_batches.py`](file:///c:/dev/inventory_management_prod/alembic/versions/)
- [ ] **Step 11.3**: Add Pydantic schemas for Warehouses, Batches, Smart Route & Dispatch in [`app/schemas.py`](file:///c:/dev/inventory_management_prod/app/schemas.py)
- [ ] **Step 11.4**: Create Warehouse & Batch CRUD + Seeder in `app/warehouse_service.py`

### Part B — Smart Routing Engine & Free Email Service (Steps 11.5 – 11.8)
- [ ] **Step 11.5**: Build pure-Python Haversine + FEFO Smart Routing Engine in `app/routing_engine.py`
- [ ] **Step 11.6**: Build 100% Free Low-Stock Email Alert Service in `app/email_service.py`
- [ ] **Step 11.7**: Hook Low-Stock Email Trigger into `app/warehouse_service.py` (`fulfill_dispatch`) and [`app/services.py`](file:///c:/dev/inventory_management_prod/app/services.py)
- [ ] **Step 11.8**: Register new endpoints (`/warehouses`, `/batches`, `/warehouses/smart-route`, `/warehouses/fulfill-dispatch`, `/alerts/test-email`) in [`main.py`](file:///c:/dev/inventory_management_prod/main.py)

### Part C — Frontend Types, API Client & Hooks (Steps 11.9 – 11.11)
- [ ] **Step 11.9**: Add TypeScript interfaces in [`frontend/src/types/api.ts`](file:///c:/dev/inventory_management_prod/frontend/src/types/api.ts) and endpoint constants in [`frontend/src/api/endpoints.ts`](file:///c:/dev/inventory_management_prod/frontend/src/api/endpoints.ts)
- [ ] **Step 11.10**: Create API module `frontend/src/api/warehouses.ts` and query keys in [`frontend/src/lib/queryKeys.ts`](file:///c:/dev/inventory_management_prod/frontend/src/lib/queryKeys.ts)
- [ ] **Step 11.11**: Create TanStack Query hooks in `frontend/src/features/dispatch/useDispatch.ts`

### Part D — Frontend UI Components & Pages (Steps 11.12 – 11.16)
- [ ] **Step 11.12**: Create Warehouse & Batch Breakdown Dialog (`frontend/src/features/products/WarehouseBatchesDialog.tsx`) and wire into [`ProductsPage.tsx`](file:///c:/dev/inventory_management_prod/frontend/src/features/products/ProductsPage.tsx)
- [ ] **Step 11.13**: Create Add Batch / Seed Demo Data Dialog (`frontend/src/features/dispatch/BatchFormDialog.tsx`)
- [ ] **Step 11.14**: Create Smart Recommendation Comparison Card (`frontend/src/features/dispatch/RouteRecommendationCard.tsx`)
- [ ] **Step 11.15**: Create Smart Order Dispatch Page (`frontend/src/features/dispatch/DispatchPage.tsx`)
- [ ] **Step 11.16**: Register `/dispatch` route in [`frontend/src/routes/router.tsx`](file:///c:/dev/inventory_management_prod/frontend/src/routes/router.tsx) and add Sidebar nav link in [`frontend/src/layouts/Sidebar.tsx`](file:///c:/dev/inventory_management_prod/frontend/src/layouts/Sidebar.tsx) & [`Header.tsx`](file:///c:/dev/inventory_management_prod/frontend/src/layouts/Header.tsx)

### Part E — Verification & Deployment (Steps 11.17 – 11.18)
- [x] **Step 11.17**: Run TypeScript (`npx tsc -b`), ESLint (`npm run lint`), Production Build (`npm run build`), and Mobile 375px overflow check
- [x] **Step 11.18**: Update `.env.example` with optional free SMTP variables and push to GitHub (auto-deploys Render + Vercel)

---

## Detailed Micro-Step Instructions

---

### Step 11.1 — Add `Warehouse` and `StockBatch` Models
- **File to Edit**: [`app/models.py`](file:///c:/dev/inventory_management_prod/app/models.py)
- **What to Do**:
  1. Import `Date` from `sqlalchemy`:
     ```python
     from sqlalchemy import Column, Integer, String, Float, DateTime, Date, ForeignKey, Enum, Boolean
     ```
  2. Append `Warehouse` and `StockBatch` classes at the bottom of `app/models.py`:
     ```python
     class Warehouse(Base):
         __tablename__ = "warehouses"

         id = Column(Integer, primary_key=True)
         name = Column(String(100), unique=True, nullable=False)
         code = Column(String(20), unique=True, nullable=False)
         city = Column(String(100), nullable=False)
         latitude = Column(Float, nullable=False)
         longitude = Column(Float, nullable=False)
         is_active = Column(Boolean, default=True)
         created_at = Column(DateTime, default=datetime.utcnow)

         batches = relationship("StockBatch", back_populates="warehouse", cascade="all, delete-orphan")


     class StockBatch(Base):
         __tablename__ = "stock_batches"

         id = Column(Integer, primary_key=True)
         product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
         warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False, index=True)
         batch_number = Column(String(50), nullable=False)
         quantity = Column(Integer, nullable=False, default=0)
         expiry_date = Column(Date, nullable=False)
         created_at = Column(DateTime, default=datetime.utcnow)

         product = relationship("Product")
         warehouse = relationship("Warehouse", back_populates="batches")
     ```
- **Verify**:
  ```powershell
  python -c "import ast; ast.parse(open('app/models.py').read()); print('Step 11.1 OK')"
  ```

---

### Step 11.2 — Create Alembic Migration for `warehouses` & `stock_batches`
- **File to Create**: `alembic/versions/8c4e91a2b3d4_add_warehouses_and_batches.py`
- **Important**: `down_revision` MUST be `'2bd086e87e6d'` (the current head in `alembic/versions/2bd086e87e6d_add_users_table.py`).
- **Exact Code**:
  ```python
  """add warehouses and stock_batches tables

  Revision ID: 8c4e91a2b3d4
  Revises: 2bd086e87e6d
  Create Date: 2026-11-01 15:00:00.000000
  """
  from typing import Sequence, Union
  from alembic import op
  import sqlalchemy as sa

  revision: str = '8c4e91a2b3d4'
  down_revision: Union[str, Sequence[str], None] = '2bd086e87e6d'
  branch_labels: Union[str, Sequence[str], None] = None
  depends_on: Union[str, Sequence[str], None] = None


  def upgrade() -> None:
      op.create_table(
          'warehouses',
          sa.Column('id', sa.Integer(), nullable=False),
          sa.Column('name', sa.String(length=100), nullable=False),
          sa.Column('code', sa.String(length=20), nullable=False),
          sa.Column('city', sa.String(length=100), nullable=False),
          sa.Column('latitude', sa.Float(), nullable=False),
          sa.Column('longitude', sa.Float(), nullable=False),
          sa.Column('is_active', sa.Boolean(), nullable=True),
          sa.Column('created_at', sa.DateTime(), nullable=True),
          sa.PrimaryKeyConstraint('id'),
          sa.UniqueConstraint('name'),
          sa.UniqueConstraint('code'),
      )
      op.create_table(
          'stock_batches',
          sa.Column('id', sa.Integer(), nullable=False),
          sa.Column('product_id', sa.Integer(), nullable=False),
          sa.Column('warehouse_id', sa.Integer(), nullable=False),
          sa.Column('batch_number', sa.String(length=50), nullable=False),
          sa.Column('quantity', sa.Integer(), nullable=False),
          sa.Column('expiry_date', sa.Date(), nullable=False),
          sa.Column('created_at', sa.DateTime(), nullable=True),
          sa.ForeignKeyConstraint(['product_id'], ['products.id']),
          sa.ForeignKeyConstraint(['warehouse_id'], ['warehouses.id']),
          sa.PrimaryKeyConstraint('id'),
      )
      op.create_index('ix_stock_batches_product_id', 'stock_batches', ['product_id'], unique=False)
      op.create_index('ix_stock_batches_warehouse_id', 'stock_batches', ['warehouse_id'], unique=False)


  def downgrade() -> None:
      op.drop_index('ix_stock_batches_warehouse_id', table_name='stock_batches')
      op.drop_index('ix_stock_batches_product_id', table_name='stock_batches')
      op.drop_table('stock_batches')
      op.drop_table('warehouses')
  ```
- **Verify**:
  ```powershell
  python -c "import ast; ast.parse(open('alembic/versions/8c4e91a2b3d4_add_warehouses_and_batches.py').read()); print('Step 11.2 OK')"
  ```

---

### Step 11.3 — Add Pydantic Schemas in `app/schemas.py`
- **File to Edit**: [`app/schemas.py`](file:///c:/dev/inventory_management_prod/app/schemas.py)
- **What to Do**:
  1. Ensure `date` is imported from `datetime`: `from datetime import datetime, date`
  2. Append the following schemas to the bottom of `app/schemas.py`:
     ```python
     # ============ WAREHOUSE & BATCHES ============

     class WarehouseCreate(BaseModel):
         name: str = Field(..., min_length=1, max_length=100)
         code: str = Field(..., min_length=2, max_length=20)
         city: str = Field(..., min_length=1, max_length=100)
         latitude: float = Field(..., ge=-90, le=90)
         longitude: float = Field(..., ge=-180, le=180)


     class WarehouseRead(BaseModel):
         model_config = ConfigDict(from_attributes=True)

         id: int
         name: str
         code: str
         city: str
         latitude: float
         longitude: float
         is_active: bool
         created_at: datetime


     class StockBatchCreate(BaseModel):
         product_id: int
         warehouse_id: int
         batch_number: str = Field(..., min_length=1, max_length=50)
         quantity: int = Field(..., gt=0)
         expiry_date: date


     class StockBatchRead(BaseModel):
         model_config = ConfigDict(from_attributes=True)

         id: int
         product_id: int
         warehouse_id: int
         batch_number: str
         quantity: int
         expiry_date: date
         created_at: datetime


     class WarehouseStockSummary(BaseModel):
         warehouse_id: int
         warehouse_name: str
         warehouse_code: str
         city: str
         total_quantity: int
         nearest_expiry: Optional[date] = None
         batches: List[StockBatchRead]


     # ============ SMART ORDER ROUTING ============

     class SmartRouteRequest(BaseModel):
         product_id: int
         quantity: int = Field(..., gt=0)
         destination_name: str = Field(..., min_length=1, max_length=100)
         destination_lat: float = Field(..., ge=-90, le=90)
         destination_lon: float = Field(..., ge=-180, le=180)
         prioritize_expiry: bool = True


     class RouteCandidate(BaseModel):
         warehouse_id: int
         warehouse_name: str
         warehouse_code: str
         city: str
         distance_km: float
         estimated_transit_days: int
         available_quantity: int
         can_fulfill: bool
         selected_batch_id: Optional[int] = None
         selected_batch_number: Optional[str] = None
         nearest_expiry_date: Optional[date] = None
         days_until_expiry: Optional[int] = None
         has_expiring_soon_batch: bool = False
         score: float
         is_recommended: bool = False
         recommendation_reason: str


     class SmartRouteResponse(BaseModel):
         product_id: int
         product_name: str
         sku: str
         requested_quantity: int
         destination_name: str
         recommended_warehouse_id: Optional[int] = None
         candidates: List[RouteCandidate]


     class FulfillDispatchRequest(BaseModel):
         product_id: int
         warehouse_id: int
         quantity: int = Field(..., gt=0)
         destination_name: str = Field(..., min_length=1, max_length=100)
         notes: Optional[str] = Field(None, max_length=500)


     class FulfillDispatchResponse(BaseModel):
         transaction_id: int
         product_id: int
         warehouse_id: int
         warehouse_name: str
         dispatched_quantity: int
         remaining_product_stock: int
         reorder_level: int
         is_low_stock_now: bool
         low_stock_email_sent: bool
         alert_message: Optional[str] = None
     ```
- **Verify**:
  ```powershell
  python -c "import ast; ast.parse(open('app/schemas.py').read()); print('Step 11.3 OK')"
  ```

---

### Step 11.4 — Create Pure-Python Smart Routing Engine (`app/routing_engine.py`)
- **File to Create**: `app/routing_engine.py`
- **Goal**: Self-contained math & scoring module (0 database dependencies) that computes Haversine distance, transit days, FEFO expiry urgency, and plain-English recommendation reasons.
- **Exact Logic**:
  - `haversine_km(lat1, lon1, lat2, lon2) -> float`: Earth radius `6371.0 km`.
  - `estimate_transit_days(distance_km) -> int`: `max(1, math.ceil(distance_km / 600.0))` (ground freight ~600 km/day).
  - `score_warehouse(...)`:
    - Warehouses with `available_quantity < requested_quantity` or only expired batches (`days_until_expiry < 0`) get `can_fulfill = False` and `score = -1.0`.
    - For capable warehouses (`can_fulfill = True`):
      - `distance_score = max(0.0, 100.0 - (distance_km / 50.0))` (closer = higher score).
      - `expiry_bonus`: If `prioritize_expiry` is True and `0 <= days_until_expiry <= 30`, add a strong FEFO urgency bonus (`+45.0` points) so stock expiring soon is dispatched before it goes to waste; if `31 <= days_until_expiry <= 60`, add `+20.0` points.
      - Total `score = round(distance_score + expiry_bonus, 2)`.
    - Highest score among `can_fulfill == True` gets `is_recommended = True`.
    - Generates clear `recommendation_reason` strings:
      - e.g., `"Fastest delivery (312 km, ~1 day) with sufficient stock"` or `"FEFO Priority: Dispatches batch LOT-A1 expiring in 14 days while still reaching destination in ~2 days"`.
- **Verify**:
  ```powershell
  python -c "from app.routing_engine import haversine_km; assert 300 < haversine_km(40.7128, -74.006, 38.9072, -77.0369) < 350; print('Step 11.4 OK')"
  ```

---

### Step 11.5 — Build Free Low-Stock Email Alert Service (`app/email_service.py`)
- **File to Create**: `app/email_service.py`
- **Goal**: Send an HTML low-stock warning email using **100% free** options:
  1. **Option A (Built-in Python `smtplib`)**: Uses free Gmail SMTP (`SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_USER`, `SMTP_PASSWORD` App Password, `ALERT_RECIPIENT_EMAIL`).
  2. **Safe Demo Fallback**: If `SMTP_USER` / `SMTP_PASSWORD` are not set in environment variables, logs the formatted alert cleanly to stdout and returns `(False, "Low stock detected (Email logged in demo mode — configure SMTP_USER to send real emails)")` so the app **never crashes** even without email credentials configured!
- **Functions to Export**:
  - `send_low_stock_email(product_name: str, sku: str, current_stock: int, reorder_level: int, warehouse_breakdown: list[dict]) -> tuple[bool, str]`
- **Verify**:
  ```powershell
  python -c "from app.email_service import send_low_stock_email; ok, msg = send_low_stock_email('Test Item', 'SKU-1', 3, 10, []); print('Step 11.5 OK:', msg)"
  ```

---

### Step 11.6 — Create Warehouse & Dispatch Service (`app/warehouse_service.py`)
- **File to Create**: `app/warehouse_service.py`
- **Goal**: Database operations for Warehouses, StockBatches, Smart Routing, Demo Seeding, and FEFO Dispatch Fulfillment.
- **Methods in `WarehouseService`**:
  1. `list_warehouses(db)` -> returns active `Warehouse` list ordered by `id`.
  2. `create_warehouse(db, data: WarehouseCreate)` -> creates warehouse (409 on duplicate name/code).
  3. `add_stock_batch(db, data: StockBatchCreate, created_by: str)`:
     - Creates `StockBatch` row.
     - Increments `Product.stock.quantity_on_hand += data.quantity`.
     - Logs an `INBOUND` `Transaction` (`notes=f"Added batch {data.batch_number} ({data.quantity} units, exp {data.expiry_date}) to {warehouse.name}"`).
  4. `get_product_warehouse_summary(db, product_id: int)` -> returns `List[WarehouseStockSummary]` across all active warehouses (batches sorted by `expiry_date ASC` for FEFO).
  5. `compute_smart_route(db, req: SmartRouteRequest)` -> queries all active warehouses & non-expired batches (`quantity > 0`) for `req.product_id`, runs `routing_engine`, and returns `SmartRouteResponse`.
  6. `fulfill_dispatch(db, req: FulfillDispatchRequest, username: str)`:
     - Locks/fetches non-expired batches in `req.warehouse_id` for `req.product_id` ordered by `expiry_date ASC` (FEFO).
     - Verifies total available in that warehouse $\ge$ `req.quantity` (raises `400` if insufficient).
     - Deducts `req.quantity` across batches starting from the earliest `expiry_date`.
     - Decrements `Product.stock.quantity_on_hand = max(0, stock.quantity_on_hand - req.quantity)`.
     - Creates `Transaction` (`OUTBOUND`, `reference_doc=f"DISPATCH-{warehouse.code}"`, `notes=...`, `created_by=username`).
     - If `stock.quantity_on_hand <= product.reorder_level`, calls `send_low_stock_email(...)` and returns `FulfillDispatchResponse`.
  7. `seed_demo_warehouses_and_batches(db, username: str)`:
     - Idempotently creates 3 default warehouses if they don't exist:
       - **Warehouse A — East Coast Hub** (`code="WH-EAST"`, `city="Newark, NJ"`, `lat=40.7357`, `lon=-74.1724`)
       - **Warehouse B — Central Hub** (`code="WH-CENT"`, `city="Dallas, TX"`, `lat=32.7767`, `lon=-96.7970`)
       - **Warehouse C — West Coast Hub** (`code="WH-WEST"`, `city="Fresno, CA"`, `lat=36.7378`, `lon=-119.7871`)
     - For existing active products without batches, seeds realistic batches with varying expiry dates (e.g. one batch expiring in 18 days at Central Hub, one expiring in 120 days at East Coast Hub) so the user can test Smart Order Routing immediately with 1 click!
- **Verify**:
  ```powershell
  python -c "import ast; ast.parse(open('app/warehouse_service.py').read()); print('Step 11.6 OK')"
  ```

---

### Step 11.7 — Also Trigger Low-Stock Email on Standard Stock Adjustments
- **File to Edit**: [`app/services.py`](file:///c:/dev/inventory_management_prod/app/services.py)
- **What to Do**:
  - In `StockService.adjust_stock` and `TransactionService.create_transaction` (`OUTBOUND`), after `await db.commit()`, check if `stock.quantity_on_hand <= product.reorder_level`. If so, invoke `send_low_stock_email(...)` inside a `try/except Exception` block so email errors never break stock transactions.
- **Verify**:
  ```powershell
  python -c "import ast; ast.parse(open('app/services.py').read()); print('Step 11.7 OK')"
  ```

---

### Step 11.8 — Register Warehouse, Smart Route & Alert Endpoints in `main.py`
- **File to Edit**: [`main.py`](file:///c:/dev/inventory_management_prod/main.py)
- **Endpoints to Add**:
  - `GET /warehouses` -> `list[WarehouseRead]` (any authenticated user)
  - `POST /warehouses` -> `WarehouseRead` (manager/admin)
  - `POST /warehouses/seed-demo` -> `{ message: str, warehouses_count: int, batches_created: int }` (manager/admin — seeds the 3 demo warehouses & sample batches in 1 click)
  - `GET /stock/{product_id}/warehouses` -> `list[WarehouseStockSummary]` (any authenticated user)
  - `POST /batches` -> `StockBatchRead` (manager/admin)
  - `POST /warehouses/smart-route` -> `SmartRouteResponse` (any authenticated user)
  - `POST /warehouses/fulfill-dispatch` -> `FulfillDispatchResponse` (manager/admin)
  - `POST /alerts/test-email` -> `{ sent: bool, detail: str }` (admin/manager — tests low-stock email configuration)
- **Verify**:
  ```powershell
  python -c "import ast; ast.parse(open('main.py').read()); print('Step 11.8 OK')"
  ```

---

### Step 11.9 — Add Frontend TypeScript Interfaces & Endpoint Constants
- **Files to Edit**:
  1. [`frontend/src/types/api.ts`](file:///c:/dev/inventory_management_prod/frontend/src/types/api.ts) — Add exact mirrors of `WarehouseRead`, `WarehouseCreate`, `StockBatchRead`, `StockBatchCreate`, `WarehouseStockSummary`, `SmartRouteRequest`, `RouteCandidate`, `SmartRouteResponse`, `FulfillDispatchRequest`, `FulfillDispatchResponse`.
  2. [`frontend/src/api/endpoints.ts`](file:///c:/dev/inventory_management_prod/frontend/src/api/endpoints.ts) — Add:
     ```ts
     warehouses: {
       root: "/warehouses",
       seedDemo: "/warehouses/seed-demo",
       smartRoute: "/warehouses/smart-route",
       fulfillDispatch: "/warehouses/fulfill-dispatch",
       byProductStock: (productId: number | string) => `/stock/${productId}/warehouses`,
     },
     batches: {
       root: "/batches",
     },
     alerts: {
       testEmail: "/alerts/test-email",
     },
     ```
- **Verify**:
  ```powershell
  Set-Location frontend; npx tsc -b
  ```

---

### Step 11.10 — Create `frontend/src/api/warehouses.ts` & Update `queryKeys.ts`
- **Files to Create / Edit**:
  1. [`frontend/src/lib/queryKeys.ts`](file:///c:/dev/inventory_management_prod/frontend/src/lib/queryKeys.ts) — Add `warehouses` query keys (`all`, `list`, `productBatches(productId)`).
  2. `frontend/src/api/warehouses.ts` *(new)* — Functions:
     - `listWarehouses()`
     - `seedDemoWarehouses()`
     - `getProductWarehouseStock(productId)`
     - `createStockBatch(body)`
     - `computeSmartRoute(body)`
     - `fulfillOrderDispatch(body)`
     - `sendTestAlertEmail()`
- **Verify**:
  ```powershell
  Set-Location frontend; npx tsc -b
  ```

---

### Step 11.11 — Create TanStack Query Hooks (`frontend/src/features/dispatch/useDispatch.ts`)
- **File to Create**: `frontend/src/features/dispatch/useDispatch.ts`
- **Hooks**:
  - `useWarehouses()`
  - `useProductWarehouseStock(productId)`
  - `useSeedDemoWarehouses()` (invalidates `warehouses`, `stock`, `products`, `lowStock`)
  - `useCreateStockBatch()` (invalidates `warehouses`, `stock`, `products`, `transactions`)
  - `useSmartRouteMutation()`
  - `useFulfillDispatchMutation()` (invalidates `warehouses`, `stock`, `products`, `transactions`)
- **Verify**:
  ```powershell
  Set-Location frontend; npx tsc -b
  ```

---

### Step 11.12 — Create Warehouse & Expiry Breakdown Modal (`WarehouseBatchesDialog.tsx`)
- **Files to Create / Edit**:
  1. `frontend/src/features/products/WarehouseBatchesDialog.tsx` *(new)* — Displays per-warehouse stock cards, batch numbers, and color-coded expiration badges (`Expired` in red, `Expiring < 30d` in amber, `Healthy` in emerald).
  2. [`frontend/src/features/products/ProductsPage.tsx`](file:///c:/dev/inventory_management_prod/frontend/src/features/products/ProductsPage.tsx) — Add a `"Warehouses"` action button on each product row to inspect its multi-warehouse stock & batch expiry dates.
- **Verify**:
  ```powershell
  Set-Location frontend; npx tsc -b
  ```

---

### Step 11.13 — Create Add Batch Modal (`BatchFormDialog.tsx`)
- **File to Create**: `frontend/src/features/dispatch/BatchFormDialog.tsx`
- **Goal**: Modal allowing admin/manager to receive a new inventory batch into a specific warehouse with `batch_number`, `quantity`, and `expiry_date`.
- **Verify**:
  ```powershell
  Set-Location frontend; npx tsc -b
  ```

---

### Step 11.14 — Create Smart Recommendation Comparison Card (`RouteRecommendationCard.tsx`)
- **File to Create**: `frontend/src/features/dispatch/RouteRecommendationCard.tsx`
- **Goal**:
  - Highlights the **#1 Recommended Warehouse** at the top with a primary Arctic Frost banner, showing:
    - Distance (`km`) & Estimated Transit Time (`~X days`)
    - Selected Batch Number & Expiry Date (`days_until_expiry` badge)
    - Plain-English **Why this warehouse was chosen** explanation
    - One-click **"Dispatch Order from Here"** button (role-gated for `admin` / `manager`)
  - Lists all other warehouses below in a responsive comparison grid (`relative overflow-x-auto`) so the admin can compare alternatives or override the choice.
- **Verify**:
  ```powershell
  Set-Location frontend; npx tsc -b
  ```

---

### Step 11.15 — Create Smart Order Dispatch Page (`DispatchPage.tsx`)
- **File to Create**: `frontend/src/features/dispatch/DispatchPage.tsx`
- **Features**:
  - Top action bar with:
    - **"Load Demo Warehouses & Batches"** button (populates Warehouse A, B, C + sample expiring batches in 1 click for instant showcase testing).
    - **"+ Receive Batch"** button (opens `BatchFormDialog`).
    - **"Test Low-Stock Email"** button (verifies email alert setup).
  - **Order Dispatch Calculator Card**:
    - Product selector (`NativeSelect`)
    - Order Quantity input
    - Customer Destination preset selector (10 major cities with real coordinates: *Chicago, IL*, *Atlanta, GA*, *Boston, MA*, *Miami, FL*, *Denver, CO*, *Seattle, WA*, *Phoenix, AZ*, *Austin, TX*, *Philadelphia, PA*, *Las Vegas, NV* + custom lat/lon option)
    - FEFO Expiry Priority toggle (`Prioritize batches expiring within 30 days`)
    - **"Calculate Fastest & Smartest Warehouse"** button
  - Renders `RouteRecommendationCard` results below.
  - When an order is fulfilled and triggers a low-stock condition, displays a prominent toast + alert banner showing whether the Low-Stock Warning Email was dispatched.
- **Verify**:
  ```powershell
  Set-Location frontend; npx tsc -b
  ```

---

### Step 11.16 — Wire `/dispatch` Route & Sidebar Navigation
- **Files to Edit**:
  1. [`frontend/src/routes/router.tsx`](file:///c:/dev/inventory_management_prod/frontend/src/routes/router.tsx) — Add lazy-loaded `/dispatch` route inside `AppShell`.
  2. [`frontend/src/layouts/Sidebar.tsx`](file:///c:/dev/inventory_management_prod/frontend/src/layouts/Sidebar.tsx) — Add `"Smart Dispatch"` nav link (`/dispatch` with `Truck` icon from `lucide-react`).
  3. [`frontend/src/layouts/Header.tsx`](file:///c:/dev/inventory_management_prod/frontend/src/layouts/Header.tsx) — Add `{ match: (p) => p.startsWith("/dispatch"), title: "Smart Order Dispatch" }` to `SECTION_TITLES`.
- **Verify**:
  ```powershell
  Set-Location frontend; npx tsc -b; npm run lint
  ```

---

### Step 11.17 — Full Compile, Lint & Mobile 375px Audit
- **Commands to Run**:
  ```powershell
  Set-Location frontend
  npx tsc -b
  npm run lint
  npm run build
  ```
- **Checklist**:
  - Zero TypeScript errors.
  - Zero ESLint errors or warnings.
  - All tables wrapped in `relative overflow-x-auto` so `scrollWidth === 375px` on mobile screens.

---

### Step 11.18 — Environment Template Update & Cloud Deployment
- **Files to Edit**:
  - Update root `.env.example` (or Render Environment Variables guide) with optional free email settings:
    ```dotenv
    # Optional: Free Low-Stock Email Alerts (Gmail SMTP App Password)
    # Leave blank to use safe console/UI demo mode
    SMTP_HOST=smtp.gmail.com
    SMTP_PORT=587
    SMTP_USER=your-email@gmail.com
    SMTP_PASSWORD=your-16-char-google-app-password
    ALERT_RECIPIENT_EMAIL=admin-notify@gmail.com
    ```
- **Deploy**:
  - `git add . && git commit -m "feat: add multi-warehouse smart order routing and low-stock email alerts" && git push origin main`
  - Render auto-runs `alembic upgrade head` (already configured in your Render Docker Command!) and starts the updated backend.
  - Vercel auto-builds and deploys the updated frontend.
