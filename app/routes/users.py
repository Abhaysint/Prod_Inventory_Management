from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.database import get_db
from app.schemas import UserRead
from app.services import UserService
from app.auth import require_roles

router = APIRouter(prefix="/users")

@router.get("", response_model=List[UserRead])
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_roles("admin"))
):
    return await UserService.list_all(db)

@router.get("/{user_id}", response_model=UserRead)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_roles("admin"))
):
    user = await UserService.get_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
