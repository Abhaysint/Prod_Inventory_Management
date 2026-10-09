from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas import CategoryCreate, CategoryRead
from app.services import CategoryService
from app.auth import get_current_user, require_roles

router = APIRouter(prefix="/categories")

@router.post("", response_model=CategoryRead)
async def create_category(
    data: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_roles("admin", "manager"))
):
    try:
        return await CategoryService.create_category(db, data)
    except Exception as e:
        if "unique" in str(e).lower():
            raise HTTPException(status_code=409, detail="Category already exists")
        raise

@router.get("", response_model=dict)
async def list_categories(
    page: int = 1,
    page_size: int = 10,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return await CategoryService.get_categories_paginated(db, page, page_size)

@router.get("/{category_id}", response_model=CategoryRead)
async def get_category(
    category_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return await CategoryService.get_category_by_id(db, category_id)
