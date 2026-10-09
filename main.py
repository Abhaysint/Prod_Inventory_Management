from fastapi import FastAPI, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.routes import router
from app.database import get_db
from app.auth import create_access_token, get_current_user, require_admin, require_manager
from app.models import User
from app.services import CategoryService, ProductService, StockService, TransactionService
from app.user_service import UserService
from app.schemas import (
    CategoryCreate,
    CategoryRead,
    PaginatedCategories,
    ProductCreate,
    ProductRead,
    ProductUpdate,
    PaginatedProducts,
    LowStockRead,
    StockRead,
    StockAdjustment,
    TransactionCreate,
    TransactionRead,
    UserCreate,
    UserRead,
    Token,
)

app = FastAPI(title="Inventory Management", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(router)

# ============ HEALTH ============

@app.get("/")
async def root():
    return {"message": "Inventory Management API"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/db-check")
async def db_check(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(text("SELECT 1"))
        return {"database": "connected"}
    except Exception as e:
        return {"database": "error", "details": str(e)}

# ============ AUTH ============

@app.post("/auth/register", response_model=UserRead, status_code=201)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    """Register a new user. Open for initial setup—protect this in production."""
    return await UserService.create_user(db, user_data)

@app.post("/auth/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    """Authenticate and receive a JWT token."""
    user = await UserService.authenticate(db, form_data.username, form_data.password)
    token = create_access_token(subject=user.username, role=user.role.value)
    return {"access_token": token, "token_type": "bearer"}

@app.get("/auth/me", response_model=UserRead)
async def read_me(current_user: User = Depends(get_current_user)):
    """Get current authenticated user."""
    return current_user

@app.get("/users", response_model=list[UserRead])
async def list_users(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    """List all users (admin only)."""
    return await UserService.list_users(db)

# ============ CATEGORIES ============

@app.post("/categories", response_model=CategoryRead, status_code=201)
async def create_category(
    category_data: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_manager),
):
    """Create a new category."""
    return await CategoryService.create_category(db, category_data)

@app.get("/categories", response_model=PaginatedCategories)
async def list_categories(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Get paginated categories."""
    return await CategoryService.get_categories_paginated(
        db, page=page, page_size=page_size
    )

@app.get("/categories/{category_id}", response_model=CategoryRead)
async def get_category(
    category_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Get a specific category."""
    return await CategoryService.get_category_by_id(db, category_id)

# ============ PRODUCTS ============

@app.post("/products", response_model=ProductRead, status_code=201)
async def create_product(
    product_data: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    """Create a new product (auto-creates stock)."""
    return await ProductService.create_product(db, product_data)

@app.get("/products", response_model=PaginatedProducts)
async def list_products(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Get paginated active products."""
    return await ProductService.get_products_paginated(
        db, page=page, page_size=page_size
    )

@app.get("/products/search", response_model=list[ProductRead])
async def search_products(
    name: str | None = Query(default=None),
    sku: str | None = Query(default=None),
    category_id: int | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Search products by name, SKU, or category."""
    return await ProductService.search_products(db, name, sku, category_id)

@app.get("/products/low-stock", response_model=list[LowStockRead])
async def get_low_stock(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Get all products at or below reorder level."""
    return await ProductService.get_low_stock_products(db)

@app.get("/products/{product_id}", response_model=ProductRead)
async def get_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Get a specific product."""
    return await ProductService.get_product_by_id(db, product_id)

@app.put("/products/{product_id}", response_model=ProductRead)
async def update_product(
    product_id: int,
    update_data: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_manager),
):
    """Update a product."""
    return await ProductService.update_product(db, product_id, update_data)

# ============ STOCK ============

@app.get("/stock/{product_id}", response_model=StockRead)
async def get_stock(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Get stock for a product."""
    return await StockService.get_stock_by_product_id(db, product_id)

@app.post("/stock/{product_id}/adjust", response_model=TransactionRead)
async def adjust_stock(
    product_id: int,
    adjustment: StockAdjustment,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    """
    Adjust stock to exact quantity.
    Creates an adjustment transaction automatically.
    """
    adjustment.adjusted_by = current_user.username
    return await StockService.adjust_stock(db, product_id, adjustment)

# ============ TRANSACTIONS ============

@app.post("/transactions", response_model=TransactionRead, status_code=201)
async def create_transaction(
    transaction_data: TransactionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    """
    Create a transaction (inbound/outbound/adjustment/return).
    Automatically updates stock based on transaction type.
    """
    transaction_data.created_by = current_user.username
    return await TransactionService.create_transaction(db, transaction_data)

@app.get("/transactions/{product_id}", response_model=list[TransactionRead])
async def get_transactions(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Get all transactions for a product."""
    return await TransactionService.get_transactions_by_product(db, product_id)
