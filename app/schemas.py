from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, List
from datetime import datetime
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
