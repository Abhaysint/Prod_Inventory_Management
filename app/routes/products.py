from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.database import get_db
from app.schemas import ProductCreate, ProductRead, ProductUpdate
from app.services import ProductService
from app.auth import get_current_user, require_roles

router = APIRouter(prefix="/products")

@router.post("", response_model=ProductRead)
async def create_product(
    data: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_roles("admin", "manager"))
):
    try:
        return await ProductService.create_product(db, data)
    except Exception as e:
        if "unique" in str(e).lower():
            raise HTTPException(status_code=409, detail="Product SKU already exists")
        raise

@router.get("", response_model=dict)
async def list_products(
    page: int = 1,
    page_size: int = 10,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return await ProductService.get_products_paginated(db, page, page_size)

@router.get("/low-stock", response_model=List[dict])
async def get_low_stock(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return await ProductService.get_low_stock_products(db)

@router.get("/search", response_model=List[ProductRead])
async def search_products(
    name: str = None,
    sku: str = None,
    category_id: int = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return await ProductService.search_products(db, name=name, sku=sku, category_id=category_id)

@router.get("/{product_id}", response_model=ProductRead)
async def get_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return await ProductService.get_product_by_id(db, product_id)

@router.put("/{product_id}", response_model=ProductRead)
async def update_product(
    product_id: int,
    data: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_roles("admin", "manager"))
):
    return await ProductService.update_product(db, product_id, data)
