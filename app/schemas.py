from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, List
from datetime import datetime, date
from enum import Enum


class UserRoleEnum(str, Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    VIEWER = "viewer"


class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=8, max_length=128)
    role: UserRoleEnum = UserRoleEnum.VIEWER


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    email: EmailStr
    username: str
    role: UserRoleEnum
    is_active: bool
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TransactionTypeEnum(str, Enum):
    INBOUND = "inbound"
    OUTBOUND = "outbound"
    ADJUSTMENT = "adjustment"
    RETURN = "return"


# ============ CATEGORY ============

class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)


class CategoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    name: str
    description: Optional[str]
    created_at: datetime


# ============ PRODUCT ============

class ProductCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    category_id: int
    sku: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = Field(None, max_length=500)
    unit_price: float = Field(..., gt=0)
    reorder_level: int = Field(default=10, ge=0)


class ProductRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    name: str
    category_id: int
    sku: str
    description: Optional[str]
    unit_price: float
    reorder_level: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    unit_price: Optional[float] = None
    reorder_level: Optional[int] = None
    is_active: Optional[bool] = None


# ============ STOCK ============

class StockAdjustment(BaseModel):
    new_quantity: int = Field(..., ge=0)
    reason: Optional[str] = Field(None, max_length=500)
    adjusted_by: Optional[str] = Field(None, max_length=100)


class StockRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    product_id: int
    quantity_on_hand: int
    quantity_reserved: int
    last_counted_at: datetime
    updated_at: datetime


# ============ TRANSACTION ============

class TransactionCreate(BaseModel):
    product_id: int
    transaction_type: TransactionTypeEnum
    quantity: int = Field(..., gt=0)
    reference_doc: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = Field(None, max_length=500)
    created_by: Optional[str] = Field(None, max_length=100)


class TransactionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    product_id: int
    transaction_type: TransactionTypeEnum
    quantity: int
    reference_doc: Optional[str]
    notes: Optional[str]
    created_at: datetime
    created_by: Optional[str]


# ============ PAGINATION ============

class PaginatedCategories(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[CategoryRead]


class PaginatedProducts(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[ProductRead]


# ============ LOW STOCK ============

class LowStockRead(BaseModel):
    product_id: int
    product_name: str
    sku: str
    quantity_on_hand: int
    reorder_level: int
    shortage: int


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
